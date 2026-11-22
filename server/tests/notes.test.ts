/** @format */

import { describe, test, expect, beforeAll, afterAll } from "@jest/globals";
import request from "supertest";

import app from "../src/app.js";
import { pool } from "../src/db.js";

describe("Notes API", () => {
	const usernameA = `notes_a_${Date.now()}`;
	const usernameB = `notes_b_${Date.now()}`;
	const password = "password123";

	const agentA = request.agent(app);
	const agentB = request.agent(app);

	let userAId: number;
	let userBId: number;
	let noteAId: number;
	let noteBId: number;

	beforeAll(async () => {
		// Register both users
		const registerA = await request(app)
			.post("/api/auth/register")
			.send({ username: usernameA, password });

		const registerB = await request(app)
			.post("/api/auth/register")
			.send({ username: usernameB, password });

		expect(registerA.status).toBe(201);
		expect(registerB.status).toBe(201);

		userAId = registerA.body.user.id;
		userBId = registerB.body.user.id;

		// Log in both users using separate cookie jars
		const loginA = await agentA
			.post("/api/auth/login")
			.send({ username: usernameA, password });

		const loginB = await agentB
			.post("/api/auth/login")
			.send({ username: usernameB, password });

		expect(loginA.status).toBe(200);
		expect(loginB.status).toBe(200);

		// Create one note for each user
		const noteA = await agentA.post("/api/notes").send({
			title: "User A note",
			content: "Private content A",
		});

		const noteB = await agentB.post("/api/notes").send({
			title: "User B note",
			content: "Private content B",
		});

		expect(noteA.status).toBe(201);
		expect(noteB.status).toBe(201);

		noteAId = noteA.body.id;
		noteBId = noteB.body.id;
	});

	afterAll(async () => {
		// Delete notes before users due to foreign keys
		await pool.query("DELETE FROM notes WHERE user_id = ANY($1::int[])", [
			[userAId, userBId].filter((id) => id !== undefined),
		]);

		await pool.query("DELETE FROM users WHERE username = ANY($1::text[])", [
			[usernameA, usernameB],
		]);
	});

	// 1. Create a note
	test("creates a note for the logged-in user", async () => {
		const response = await agentA.post("/api/notes").send({
			title: "New test note",
			content: "Hello from Jest",
		});

		expect(response.status).toBe(201);
		expect(response.body.title).toBe("New test note");
		expect(response.body.user_id).toBe(userAId);
	});

	// 2. Get all notes
	test("returns only the logged-in user's notes", async () => {
		const response = await agentA.get("/api/notes");

		expect(response.status).toBe(200);
		expect(Array.isArray(response.body)).toBe(true);

		expect(
			response.body.every(
				(note: { user_id: number }) => note.user_id === userAId,
			),
		).toBe(true);

		expect(
			response.body.some((note: { id: number }) => note.id === noteBId),
		).toBe(false);
	});

	// 3. Get own note
	test("retrieves a note belonging to the user", async () => {
		const response = await agentA.get(`/api/notes/${noteAId}`);

		expect(response.status).toBe(200);
		expect(response.body.id).toBe(noteAId);
	});

	// 4. Update own note
	test("updates a note belonging to the user", async () => {
		const response = await agentA
			.patch(`/api/notes/${noteAId}`)
			.send({ title: "Updated title" });

		expect(response.status).toBe(200);
		expect(response.body.title).toBe("Updated title");
	});

	// 5. Delete own note
	test("deletes a note belonging to the user", async () => {
		const response = await agentA.delete(`/api/notes/${noteAId}`);

		expect(response.status).toBe(204);

		const getResponse = await agentA.get(`/api/notes/${noteAId}`);

		expect(getResponse.status).toBe(404);
	});

	// 6. Cannot read another user's note
	test("prevents reading another user's note", async () => {
		const response = await agentA.get(`/api/notes/${noteBId}`);

		expect(response.status).toBe(404);
	});

	// 7. Cannot update another user's note
	test("prevents updating another user's note", async () => {
		const response = await agentA
			.patch(`/api/notes/${noteBId}`)
			.send({ title: "Hacked title" });

		expect(response.status).toBe(404);

		// Verify the original note is unchanged
		const result = await pool.query("SELECT title FROM notes WHERE id = $1", [
			noteBId,
		]);

		expect(result.rows[0].title).toBe("User B note");
	});

	// 8. Cannot delete another user's note
	test("prevents deleting another user's note", async () => {
		const response = await agentA.delete(`/api/notes/${noteBId}`);

		expect(response.status).toBe(404);

		const result = await pool.query("SELECT id FROM notes WHERE id = $1", [
			noteBId,
		]);

		expect(result.rows).toHaveLength(1);
	});

	// 9. Reject unauthenticated requests
	test("rejects requests without authentication", async () => {
		const response = await request(app).get("/api/notes");

		expect(response.status).toBe(401);
	});

	// 10. Reject invalid note IDs
	test("rejects invalid note IDs", async () => {
		const response = await agentA.get("/api/notes/abc");

		expect(response.status).toBe(400);
		expect(response.body.message).toBe("Invalid note ID");
	});

	// 11. Reject empty titles
	test("rejects notes with empty titles", async () => {
		const response = await agentA.post("/api/notes").send({
			title: "   ",
			content: "Some content",
		});

		expect(response.status).toBe(400);
	});

	// 12. Reject updates without fields
	test("rejects updates without title or content", async () => {
		const response = await agentA.patch(`/api/notes/${noteBId}`).send({});

		expect(response.status).toBe(400);
	});
});

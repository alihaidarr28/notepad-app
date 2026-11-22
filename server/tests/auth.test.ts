/** @format */

import { describe, test, expect, beforeAll, afterAll } from "@jest/globals";
import request from "supertest";
import argon2 from "argon2";

import app from "../src/app.js";
import { pool } from "../src/db.js";

describe("POST /api/auth/register", () => {
	// Unique username for this test run
	const username = `testuser_${Date.now()}`;
	const password = "password123";

	// 1. Successful registration
	test("registers a new user successfully", async () => {
		try {
			const response = await request(app)
				.post("/api/auth/register")
				.send({ username, password });

			expect(response.status).toBe(201);
			expect(response.body.message).toBe("User registered successfully");
			expect(response.body.user.id).toBeDefined();
			expect(response.body.user.username).toBe(username);
			expect(response.body.user.password_hash).toBeUndefined();
			expect(response.body.user.password).toBeUndefined();

			// Verify user was saved in PostgreSQL
			const result = await pool.query(
				"SELECT password_hash FROM users WHERE username = $1",
				[username],
			);

			expect(result.rows).toHaveLength(1);

			const storedHash = result.rows[0].password_hash;

			// Password must not be stored as plaintext
			expect(storedHash).not.toBe(password);

			// Argon2 must verify the original password
			expect(await argon2.verify(storedHash, password)).toBe(true);
		} finally {
			await pool.query("DELETE FROM users WHERE username = $1", [username]);
		}
	});

	// 2. Username too short
	test("rejects usernames shorter than 3 characters", async () => {
		const response = await request(app).post("/api/auth/register").send({
			username: "ab",
			password: "password123",
		});

		expect(response.status).toBe(400);
		expect(response.body.message).toBe("Invalid username or password");
	});

	// 3. Username too long
	test("rejects usernames longer than 50 characters", async () => {
		const response = await request(app)
			.post("/api/auth/register")
			.send({
				username: "a".repeat(51),
				password: "password123",
			});

		expect(response.status).toBe(400);
	});

	// 4. Password too short
	test("rejects passwords shorter than 8 characters", async () => {
		const response = await request(app).post("/api/auth/register").send({
			username: "validuser",
			password: "1234567",
		});

		expect(response.status).toBe(400);
	});

	// 5. Missing username
	test("rejects missing username", async () => {
		const response = await request(app).post("/api/auth/register").send({
			password: "password123",
		});

		expect(response.status).toBe(400);
	});

	// 6. Missing password
	test("rejects missing password", async () => {
		const response = await request(app).post("/api/auth/register").send({
			username: "validuser",
		});

		expect(response.status).toBe(400);
	});

	// 7. Empty username
	test("rejects empty usernames", async () => {
		const response = await request(app).post("/api/auth/register").send({
			username: "",
			password: "password123",
		});

		expect(response.status).toBe(400);
	});

	// 8. Whitespace-only username
	test("rejects usernames containing only spaces", async () => {
		const response = await request(app).post("/api/auth/register").send({
			username: "   ",
			password: "password123",
		});

		expect(response.status).toBe(400);
	});

	// 9. Invalid data types
	test("rejects non-string username or password", async () => {
		const response = await request(app).post("/api/auth/register").send({
			username: 12345,
			password: true,
		});

		expect(response.status).toBe(400);
	});

	// 10. Duplicate username
	test("rejects duplicate usernames", async () => {
		const duplicateUsername = `duplicate_${Date.now()}`;

		try {
			const firstResponse = await request(app).post("/api/auth/register").send({
				username: duplicateUsername,
				password: "password123",
			});

			expect(firstResponse.status).toBe(201);

			const secondResponse = await request(app)
				.post("/api/auth/register")
				.send({
					username: duplicateUsername,
					password: "anotherpassword123",
				});

			expect(secondResponse.status).toBe(409);
			expect(secondResponse.body.message).toBe("Username already exists");

			// Verify only one user exists
			const result = await pool.query(
				"SELECT id FROM users WHERE username = $1",
				[duplicateUsername],
			);

			expect(result.rows).toHaveLength(1);
		} finally {
			await pool.query("DELETE FROM users WHERE username = $1", [
				duplicateUsername,
			]);
		}
	});

	// 11. Trim username
	test("removes surrounding spaces from usernames", async () => {
		const trimmedUsername = `trimmed_${Date.now()}`;

		try {
			const response = await request(app)
				.post("/api/auth/register")
				.send({
					username: `  ${trimmedUsername}  `,
					password: "password123",
				});

			expect(response.status).toBe(201);
			expect(response.body.user.username).toBe(trimmedUsername);
		} finally {
			await pool.query("DELETE FROM users WHERE username = $1", [
				trimmedUsername,
			]);
		}
	});

	// 12. Registration should not automatically log in
	test("does not automatically authenticate after registration", async () => {
		const newUsername = `nologin_${Date.now()}`;
		const agent = request.agent(app);

		try {
			const registerResponse = await agent.post("/api/auth/register").send({
				username: newUsername,
				password: "password123",
			});

			expect(registerResponse.status).toBe(201);

			const meResponse = await agent.get("/api/auth/me");

			expect(meResponse.status).toBe(401);
		} finally {
			await pool.query("DELETE FROM users WHERE username = $1", [newUsername]);
		}
	});
});

describe("POST /api/auth/login", () => {
	const username = `loginuser_${Date.now()}`;
	const password = "password123";

	beforeAll(async () => {
		const response = await request(app)
			.post("/api/auth/register")
			.send({ username, password });

		expect(response.status).toBe(201);
	});

	afterAll(async () => {
		await pool.query("DELETE FROM users WHERE username = $1", [username]);
	});

	// 1. Successful login
	test("logs in with correct credentials", async () => {
		const response = await request(app)
			.post("/api/auth/login")
			.send({ username, password });

		expect(response.status).toBe(200);
		expect(response.body.message).toBe("Logged in successfully");
		expect(response.body.user.username).toBe(username);
		expect(response.body.user.password_hash).toBeUndefined();
	});

	// 2. Incorrect password
	test("rejects an incorrect password", async () => {
		const response = await request(app).post("/api/auth/login").send({
			username,
			password: "wrongpassword",
		});

		expect(response.status).toBe(401);
		expect(response.body.message).toBe("Invalid username or password");
	});

	// 3. Unknown username
	test("rejects an unknown username", async () => {
		const response = await request(app)
			.post("/api/auth/login")
			.send({
				username: `unknown_${Date.now()}`,
				password,
			});

		expect(response.status).toBe(401);
	});

	// 4. Missing credentials
	test("rejects missing credentials", async () => {
		const response = await request(app).post("/api/auth/login").send({});

		expect(response.status).toBe(400);
		expect(response.body.message).toBe("Username and password are required");
	});

	// 5. Login creates an authenticated session
	test("allows access to /me after login", async () => {
		const agent = request.agent(app);

		const loginResponse = await agent
			.post("/api/auth/login")
			.send({ username, password });

		expect(loginResponse.status).toBe(200);

		const meResponse = await agent.get("/api/auth/me");

		expect(meResponse.status).toBe(200);
		expect(meResponse.body.user.username).toBe(username);
	});

	// 6. Logout destroys the session
	test("rejects access to /me after logout", async () => {
		const agent = request.agent(app);

		const loginResponse = await agent
			.post("/api/auth/login")
			.send({ username, password });

		expect(loginResponse.status).toBe(200);

		const logoutResponse = await agent.post("/api/auth/logout");

		expect(logoutResponse.status).toBe(200);
		expect(logoutResponse.body.message).toBe("Logged out successfully");

		const meResponse = await agent.get("/api/auth/me");

		expect(meResponse.status).toBe(401);
	});
});

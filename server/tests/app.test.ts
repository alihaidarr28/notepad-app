/** @format */

import { describe, test, expect } from "@jest/globals";
import request from "supertest";
import app from "../src/app.js";

describe("GET /api/status", () => {
	test("returns status 200", async () => {
		const response = await request(app).get("/api/status");

		expect(response.status).toBe(200);
	});
});

describe("GET /api/notes", () => {
	test("rejects users who are not logged in", async () => {
		const response = await request(app).get("/api/notes");

		expect(response.status).toBe(401);
	});
});

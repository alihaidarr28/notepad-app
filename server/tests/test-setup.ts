/** @format */

import { pool } from "../src/db.js";
import { beforeAll, afterAll } from "@jest/globals";

beforeAll(async () => {
	const result = await pool.query("SELECT current_database() AS database_name");

	const databaseName = result.rows[0].database_name;

	if (databaseName !== "notepad_test") {
		throw new Error(`Unsafe test database: ${databaseName}`);
	}
});

afterAll(async () => {
	await pool.end();
});

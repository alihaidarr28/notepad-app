/** @format */

import { config } from "dotenv";
import pg from "pg";
config({
	path: process.env.NODE_ENV === "test" ? ".env.test" : ".env",
	quiet: true,
});

if (process.env.NODE_ENV === "test" && process.env.DB_NAME !== "notepad_test") {
	throw new Error("Tests must connect to notepad_test!");
}

const { Pool } = pg;

export const pool = new Pool({
	host: process.env.DB_HOST,
	port: Number(process.env.DB_PORT),
	user: process.env.DB_USER,
	password: process.env.DB_PASSWORD,
	database: process.env.DB_NAME,
});

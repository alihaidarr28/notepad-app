/** @format */

import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "../db.js";

const PgSession = connectPgSimple(session);

const sessionSecret = process.env.SESSION_SECRET;

if (!sessionSecret) {
	throw new Error("SESSION_SECRET is missing");
}

export const sessionMiddleware = session({
	store: new PgSession({
		pool,
		createTableIfMissing: true,
	}),
	secret: sessionSecret,
	resave: false,
	saveUninitialized: false,
	cookie: {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		maxAge: 1000 * 60 * 60 * 24,
	},
});

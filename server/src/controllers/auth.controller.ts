/** @format */

import type { Request, Response } from "express";
import argon2 from "argon2";
import { pool } from "../db.js";

export async function register(req: Request, res: Response) {
	const { username, password } = req.body ?? {};

	// 1. Validate user input
	if (
		typeof username !== "string" ||
		username.trim().length < 3 ||
		username.trim().length > 50 ||
		typeof password !== "string" ||
		password.length < 8
	) {
		return res.status(400).json({
			message: "Invalid username or password",
		});
	}

	try {
		// 2. Hash the password
		const passwordHash = await argon2.hash(password, {
			type: argon2.argon2id,
		});

		// 3. Save the user in PostgreSQL
		const result = await pool.query(
			`INSERT INTO users (username, password_hash)
       VALUES ($1, $2)
       RETURNING id, username, created_at`,
			[username.trim(), passwordHash],
		);

		// 4. Return the created user
		return res.status(201).json({
			message: "User registered successfully",
			user: result.rows[0],
		});
	} catch (error: unknown) {
		// PostgreSQL error code for duplicate unique values
		if (
			typeof error === "object" &&
			error !== null &&
			"code" in error &&
			error.code === "23505"
		) {
			return res.status(409).json({
				message: "Username already exists",
			});
		}

		console.error("Registration error:", error);

		return res.status(500).json({
			message: "Internal server error",
		});
	}
}

export async function login(req: Request, res: Response) {
	const { username, password } = req.body ?? {};

	if (typeof username !== "string" || typeof password !== "string") {
		return res.status(400).json({
			message: "Username and password are required",
		});
	}

	try {
		// 1. Find the user
		const result = await pool.query(
			`SELECT id, username, password_hash
       FROM users
       WHERE username = $1`,
			[username],
		);

		if (result.rows.length === 0) {
			return res.status(401).json({
				message: "Invalid username or password",
			});
		}

		const user = result.rows[0];

		// 2. Verify the password
		const isValidPassword = await argon2.verify(user.password_hash, password);

		if (!isValidPassword) {
			return res.status(401).json({
				message: "Invalid username or password",
			});
		}

		// password verified, generate cookie and login
		// Regenerate session ID after successful login
		req.session.regenerate((error) => {
			if (error) {
				console.error("Session error:", error);

				return res.status(500).json({
					message: "Could not create session",
				});
			}

			// Store authenticated user's ID
			req.session.userId = user.id;

			req.session.save((error) => {
				if (error) {
					console.error("Session save error:", error);

					return res.status(500).json({
						message: "Could not save session",
					});
				}

				return res.status(200).json({
					message: "Logged in successfully",
					user: {
						id: user.id,
						username: user.username,
					},
				});
			});
		});
	} catch (error) {
		console.error("Login error:", error);

		return res.status(500).json({
			message: "Internal server error",
		});
	}
}

export function logout(req: Request, res: Response) {
	req.session.destroy((error) => {
		if (error) {
			console.error("Logout error:", error);

			return res.status(500).json({
				message: "Could not log out",
			});
		}

		res.clearCookie("connect.sid");

		return res.status(200).json({
			message: "Logged out successfully",
		});
	});
}

export async function getCurrentUser(req: Request, res: Response) {
	const userId = req.session.userId;

	if (userId === undefined) {
		return res.status(401).json({
			message: "Not authenticated",
		});
	}

	try {
		const result = await pool.query(
			"SELECT id, username FROM users WHERE id = $1",
			[userId],
		);

		if (result.rows.length === 0) {
			return res.status(401).json({
				message: "User not found",
			});
		}

		return res.status(200).json({
			user: result.rows[0],
		});
	} catch (error) {
		console.error("Error fetching current user:", error);

		return res.status(500).json({
			message: "Internal server error",
		});
	}
}

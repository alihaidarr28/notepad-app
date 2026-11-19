/** @format */

import type { Request, Response } from "express";
import { pool } from "../db.js";

export async function getAllNotes(req: Request, res: Response) {
	try {
		const result = await pool.query(
			"SELECT * FROM notes WHERE user_id = $1 ORDER BY id ASC",
			[req.session.userId],
		);

		return res.json(result.rows);
	} catch (error) {
		console.error("Error fetching notes:", error);

		return res.status(500).json({
			message: "Internal server error",
		});
	}
}

export async function getNoteById(req: Request, res: Response) {
	const id = Number(req.params.id);

	if (!Number.isSafeInteger(id) || id <= 0) {
		return res.status(400).json({
			message: "Invalid note ID",
		});
	}

	try {
		const result = await pool.query(
			"SELECT * FROM notes WHERE id = $1 AND user_id = $2",
			[id, req.session.userId],
		);

		if (result.rows.length === 0) {
			return res.status(404).json({
				message: "Note not found",
			});
		}

		return res.json(result.rows[0]);
	} catch (error) {
		console.error("Error fetching note:", error);

		return res.status(500).json({
			message: "Internal server error",
		});
	}
}

export async function createNote(req: Request, res: Response) {
	const { title, content } = req.body ?? {};

	if (
		typeof title !== "string" ||
		typeof content !== "string" ||
		title.trim() === "" ||
		title.length > 255
	) {
		return res.status(400).json({
			message: "Valid title and content are required",
		});
	}

	try {
		const result = await pool.query(
			`INSERT INTO notes (title, content , user_id)
       VALUES ($1, $2, $3)
       RETURNING *`,
			[title, content, req.session.userId],
		);

		return res.status(201).json(result.rows[0]);
	} catch (error) {
		console.error("Error creating note:", error);

		return res.status(500).json({
			message: "Internal server error",
		});
	}
}

export async function updateNote(req: Request, res: Response) {
	const id = Number(req.params.id);

	if (!Number.isSafeInteger(id) || id <= 0) {
		return res.status(400).json({
			message: "Invalid note ID",
		});
	}

	const { title, content } = req.body ?? {};

	if (title === undefined && content === undefined) {
		return res.status(400).json({
			message: "Provide a title or content to update",
		});
	}

	if (
		(title !== undefined &&
			(typeof title !== "string" ||
				title.trim() === "" ||
				title.length > 255)) ||
		(content !== undefined && typeof content !== "string")
	) {
		return res.status(400).json({
			message: "Invalid title or content",
		});
	}

	try {
		const result = await pool.query(
			`UPDATE notes
   SET title = COALESCE($1, title),
       content = COALESCE($2, content)
   WHERE id = $3 AND user_id = $4
   RETURNING *`,
			[title ?? null, content ?? null, id, req.session.userId],
		);

		if (result.rows.length === 0) {
			return res.status(404).json({
				message: "Note not found",
			});
		}

		return res.json(result.rows[0]);
	} catch (error) {
		console.error("Error updating note:", error);

		return res.status(500).json({
			message: "Internal server error",
		});
	}
}

export async function deleteNote(req: Request, res: Response) {
	const id = Number(req.params.id);

	if (!Number.isSafeInteger(id) || id <= 0) {
		return res.status(400).json({
			message: "Invalid note ID",
		});
	}

	try {
		const result = await pool.query(
			"DELETE FROM notes WHERE id = $1 AND user_id = $2 RETURNING *",
			[id, req.session.userId],
		);

		if (result.rows.length === 0) {
			return res.status(404).json({
				message: "Note not found",
			});
		}

		return res.status(204).send();
	} catch (error) {
		console.error("Error deleting note:", error);

		return res.status(500).json({
			message: "Internal server error",
		});
	}
}

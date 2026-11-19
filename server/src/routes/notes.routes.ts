/** @format */

import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";

import {
	getAllNotes,
	getNoteById,
	createNote,
	updateNote,
	deleteNote,
} from "../controllers/notes.controller.js";

const router = Router();

router.use(requireAuth);

router.get("/", getAllNotes);
router.get("/:id", getNoteById);
router.post("/", createNote);
router.patch("/:id", updateNote);
router.delete("/:id", deleteNote);

export default router;

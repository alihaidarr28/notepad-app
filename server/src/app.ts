/** @format */

import express from "express";
import notesRoutes from "./routes/notes.routes.js";
import authRoutes from "./routes/auth.routes.js";
import { sessionMiddleware } from "./middleware/session.middleware.js";

const app = express();

app.use(express.json());

// Session middleware must run before the routes
app.use(sessionMiddleware);

app.get("/", (req, res) => {
	res.send("Welcome to my Notepad API!");
});

app.get("/api/status", (req, res) => {
	res.json({
		status: "ok",
		message: "Notepad API is running",
	});
});

app.use("/api/auth", authRoutes);
app.use("/api/notes", notesRoutes);

export default app;

/** @format */

import type { Note } from "../types";

export async function getNotes(): Promise<Note[]> {
	const response = await fetch("/api/notes", {
		credentials: "include",
	});

	if (!response.ok) {
		throw new Error("Failed to load notes");
	}

	return response.json();
}

export async function createNote(
	title: string,
	content: string,
): Promise<Note> {
	const response = await fetch("/api/notes", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		credentials: "include",
		body: JSON.stringify({ title, content }),
	});

	if (!response.ok) {
		throw new Error("Failed to create note");
	}

	return response.json();
}

export async function updateNote(
	id: number,
	title: string,
	content: string,
): Promise<Note> {
	const response = await fetch(`/api/notes/${id}`, {
		method: "PATCH",
		headers: {
			"Content-Type": "application/json",
		},
		credentials: "include",
		body: JSON.stringify({ title, content }),
	});

	if (!response.ok) {
		throw new Error("Failed to update note");
	}

	return response.json();
}

export async function deleteNote(id: number): Promise<void> {
	const response = await fetch(`/api/notes/${id}`, {
		method: "DELETE",
		credentials: "include",
	});

	if (!response.ok) {
		throw new Error("Failed to delete note");
	}
}

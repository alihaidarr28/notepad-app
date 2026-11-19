/** @format */

import { getNotes, createNote, updateNote, deleteNote } from "../api/notes";
import { logout } from "../api/auth";
import type { Note } from "../types";

export async function renderNotesPage(onLogout: () => void) {
	const app = document.querySelector<HTMLDivElement>("#app");

	if (!app) {
		throw new Error("App element not found");
	}

	app.innerHTML = /*html*/ `
    <div class="workspace">

      <aside class="sidebar">
        <div class="sidebar-brand">
          <div class="brand-icon">✎</div>
          <h2>Notepad</h2>
        </div>

        <button id="new-note-btn" class="new-note-btn">
          + New Note
        </button>

        <div class="sidebar-section">
          <h3>MY NOTES</h3>
          <div id="notes-list" class="notes-list">
            <p>Loading notes...</p>
          </div>
        </div>

        <button id="logout-btn" class="logout-btn">
          Log out
        </button>
      </aside>

      <main class="editor-area">
        <div class="editor-header">
          <div>
            <h1>My Workspace</h1>
            <p>Your personal space for ideas.</p>
          </div>

          <div class="editor-actions">
            <button id="delete-note-btn" class="delete-btn" disabled>
              Delete
            </button>

            <button id="save-note-btn" class="save-btn" disabled>
              Save Note
            </button>
          </div>
        </div>

        <div class="editor-card">
          <input
            id="note-title"
            class="note-title-input"
            type="text"
            placeholder="Note title"
            maxlength="255"
            disabled
          />

          <textarea
            id="note-content"
            class="note-content-input"
            placeholder="Start writing your thoughts..."
            disabled
          ></textarea>
        </div>

        <p id="notes-message" class="notes-message"></p>
      </main>

    </div>
  `;

	const notesList = document.querySelector<HTMLDivElement>("#notes-list")!;
	const logoutButton =
		document.querySelector<HTMLButtonElement>("#logout-btn")!;

	let notes: Note[] = [];

	let selectedNoteId: number | null = null;

	const titleInput = document.querySelector<HTMLInputElement>("#note-title")!;

	const contentInput =
		document.querySelector<HTMLTextAreaElement>("#note-content")!;

	const saveButton =
		document.querySelector<HTMLButtonElement>("#save-note-btn")!;

	const deleteButton =
		document.querySelector<HTMLButtonElement>("#delete-note-btn")!;

	const newNoteButton =
		document.querySelector<HTMLButtonElement>("#new-note-btn")!;

	function selectNote(note: Note) {
		selectedNoteId = note.id;

		titleInput.value = note.title;
		contentInput.value = note.content;

		titleInput.disabled = false;
		contentInput.disabled = false;
		saveButton.disabled = false;
		deleteButton.disabled = false;

		// Highlight the selected note in the sidebar
		document.querySelectorAll(".note-item").forEach((button) => {
			button.classList.toggle(
				"active",
				button.getAttribute("data-id") === String(note.id),
			);
		});
	}

	function renderNotesList() {
		notesList.replaceChildren();

		if (notes.length === 0) {
			notesList.textContent = "No notes yet. Create your first note!";
			return;
		}

		notes.forEach((note) => {
			const button = document.createElement("button");

			button.className = "note-item";
			button.textContent = note.title;
			button.dataset.id = String(note.id);

			button.classList.toggle("active", note.id === selectedNoteId);

			button.addEventListener("click", () => {
				selectNote(note);
			});

			notesList.appendChild(button);
		});
	}

	newNoteButton.addEventListener("click", () => {
		// No existing note is selected
		selectedNoteId = null;

		// Clear the editor
		titleInput.value = "";
		contentInput.value = "";

		// Enable editing
		titleInput.disabled = false;
		contentInput.disabled = false;
		saveButton.disabled = false;

		// Nothing exists in the database to delete yet
		deleteButton.disabled = true;

		// Remove the active highlight from the sidebar
		document.querySelectorAll(".note-item").forEach((button) => {
			button.classList.remove("active");
		});

		titleInput.focus();
	});

	try {
		notes = await getNotes();

		if (notes.length === 0) {
			notesList.textContent = "No notes yet. Create your first note!";
		} else {
			notesList.replaceChildren();

			notes.forEach((note) => {
				const button = document.createElement("button");

				button.className = "note-item";
				button.textContent = note.title;
				button.dataset.id = String(note.id);

				button.addEventListener("click", () => {
					selectNote(note);
				});

				notesList.appendChild(button);
			});
		}
	} catch (error) {
		notesList.textContent = "Failed to load notes.";
		console.error(error);
	}

	logoutButton.addEventListener("click", async () => {
		try {
			await logout();
			onLogout();
		} catch (error) {
			console.error("Logout failed:", error);
			document.querySelector<HTMLElement>("#notes-message")!.textContent =
				"Could not log out. Please try again.";
		}
	});

	saveButton.addEventListener("click", async () => {
		const title = titleInput.value.trim();
		const content = contentInput.value;

		const message = document.querySelector<HTMLElement>("#notes-message")!;

		if (!title) {
			message.textContent = "Please enter a note title.";
			return;
		}

		saveButton.disabled = true;
		message.textContent = "Saving...";

		try {
			if (selectedNoteId === null) {
				// CREATE a new note
				const newNote = await createNote(title, content);

				notes.push(newNote);

				selectedNoteId = newNote.id;
			} else {
				// UPDATE an existing note
				const updatedNote = await updateNote(selectedNoteId, title, content);

				const index = notes.findIndex((note) => note.id === selectedNoteId);

				if (index !== -1) {
					notes[index] = updatedNote;
				}
			}

			// Update the sidebar to show the latest titles
			renderNotesList();

			// Display the saved note
			const savedNote = notes.find((note) => note.id === selectedNoteId);

			if (savedNote) {
				selectNote(savedNote);
			}

			message.textContent = "Note saved successfully!";
		} catch (error) {
			message.textContent =
				error instanceof Error ? error.message : "Failed to save note";
		} finally {
			saveButton.disabled = false;
		}
	});

	deleteButton.addEventListener("click", async () => {
		if (selectedNoteId === null) return;

		const confirmed = confirm("Are you sure you want to delete this note?");

		if (!confirmed) return;

		const message = document.querySelector<HTMLElement>("#notes-message")!;

		deleteButton.disabled = true;
		message.textContent = "Deleting...";

		try {
			await deleteNote(selectedNoteId);

			// Remove the deleted note from our frontend array
			notes = notes.filter((note) => note.id !== selectedNoteId);

			// Clear the current selection
			selectedNoteId = null;

			// Refresh the sidebar
			renderNotesList();

			if (notes.length > 0) {
				// Select another note
				selectNote(notes[0]!);
			} else {
				// No notes remaining
				titleInput.value = "";
				contentInput.value = "";

				titleInput.disabled = true;
				contentInput.disabled = true;
				saveButton.disabled = true;
				deleteButton.disabled = true;
			}

			message.textContent = "Note deleted successfully!";
		} catch (error) {
			message.textContent =
				error instanceof Error ? error.message : "Failed to delete note";

			deleteButton.disabled = false;
		}
	});
}

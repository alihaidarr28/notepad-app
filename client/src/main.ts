/** @format */

import "./style.css";

import { getCurrentUser } from "./api/auth";
import { renderAuthPage } from "./pages/auth";
import { renderNotesPage } from "./pages/notes";

async function showNotes() {
	await renderNotesPage(showAuth);
}

function showAuth() {
	renderAuthPage(showNotes);
}

async function main() {
	try {
		const user = await getCurrentUser();

		if (user) {
			await showNotes();
		} else {
			showAuth();
		}
	} catch (error) {
		console.error("Failed to initialize application:", error);

		const app = document.querySelector<HTMLDivElement>("#app");

		if (app) {
			app.textContent =
				"Could not connect to the server. Please refresh and try again.";
		}
	}
}

main();

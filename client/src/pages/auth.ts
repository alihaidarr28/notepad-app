/** @format */

import { login, register } from "../api/auth";

export function renderAuthPage(onLoginSuccess: () => void) {
	const app = document.querySelector<HTMLDivElement>("#app");

	if (!app) {
		throw new Error("App element not found");
	}

	app.innerHTML = /*html*/ ` 
  <main class="auth-page">
    <div class="auth-container">
      <div class="brand">
        <div class="brand-icon">✎</div>
        <h1>Notepad</h1>
      </div>

      <p class="tagline">Your thoughts, beautifully organized.</p>

      <section class="auth-card">
        <div class="auth-heading">
          <h2 id="form-title">Welcome back</h2>
          <p id="form-description">
            Sign in to access your personal notes.
          </p>
        </div>

        <form id="auth-form">
          <div class="form-group">
            <label for="username">Username</label>
            <input
              id="username"
              name="username"
              type="text"
              placeholder="Enter your username"
              autocomplete="username"
              minlength="3"
              maxlength="50"
              required
            />
          </div>

          <div class="form-group">
            <label for="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="Enter your password"
              autocomplete="current-password"
              minlength="8"
              required
            />
          </div>

          <div class="form-group hidden" id="confirm-group">
            <label for="confirm-password">Confirm password</label>
            <input
              id="confirm-password"
              name="confirm-password"
              type="password"
              placeholder="Confirm your password"
              autocomplete="new-password"
            />
          </div>

          <p id="form-message" class="form-message" role="status"></p>

          <button type="submit" class="primary-button" id="submit-button">
            Sign in
          </button>
        </form>

        <p class="auth-switch">
          <span id="switch-description">Don't have an account?</span>
          <button type="button" id="switch-button">Create one</button>
        </p>
      </section>

      <p class="footer-text">A quiet place for your ideas.</p>
    </div>
  </main>
`;

	const form = document.querySelector<HTMLFormElement>("#auth-form")!;
	const switchButton =
		document.querySelector<HTMLButtonElement>("#switch-button")!;
	const submitButton =
		document.querySelector<HTMLButtonElement>("#submit-button")!;
	const confirmGroup =
		document.querySelector<HTMLDivElement>("#confirm-group")!;
	const confirmInput =
		document.querySelector<HTMLInputElement>("#confirm-password")!;
	const passwordInput = document.querySelector<HTMLInputElement>("#password")!;
	const formTitle = document.querySelector<HTMLElement>("#form-title")!;
	const formDescription =
		document.querySelector<HTMLElement>("#form-description")!;
	const switchDescription = document.querySelector<HTMLElement>(
		"#switch-description",
	)!;
	const formMessage = document.querySelector<HTMLElement>("#form-message")!;

	let isRegisterMode = false;

	switchButton.addEventListener("click", () => {
		isRegisterMode = !isRegisterMode;

		form.reset();
		formMessage.textContent = "";

		formTitle.textContent = isRegisterMode
			? "Create your account"
			: "Welcome back";

		formDescription.textContent = isRegisterMode
			? "Start organizing your thoughts in one place."
			: "Sign in to access your personal notes.";

		submitButton.textContent = isRegisterMode ? "Create account" : "Sign in";

		switchDescription.textContent = isRegisterMode
			? "Already have an account?"
			: "Don't have an account?";

		switchButton.textContent = isRegisterMode ? "Sign in" : "Create one";

		confirmGroup.classList.toggle("hidden", !isRegisterMode);
		confirmInput.required = isRegisterMode;

		passwordInput.autocomplete = isRegisterMode
			? "new-password"
			: "current-password";
	});

	form.addEventListener("submit", async (event) => {
		event.preventDefault();

		const usernameInput =
			document.querySelector<HTMLInputElement>("#username")!;

		const username = usernameInput.value.trim();
		const password = passwordInput.value;

		// Validate password confirmation
		if (isRegisterMode && password !== confirmInput.value) {
			formMessage.textContent = "Passwords do not match.";
			return;
		}

		// Show loading state
		submitButton.disabled = true;
		submitButton.textContent = "Please wait...";
		formMessage.textContent = "";

		try {
			if (isRegisterMode) {
				// Register using our API function
				await register(username, password);

				formMessage.textContent =
					"Account created successfully! You can now sign in.";
			} else {
				// Login using our API function
				await login(username, password);

				// Tell main.ts to display the notes page
				onLoginSuccess();
			}
		} catch (error) {
			formMessage.textContent =
				error instanceof Error ? error.message : "Something went wrong";
		} finally {
			submitButton.disabled = false;
			submitButton.textContent = isRegisterMode ? "Create account" : "Sign in";
		}
	});
}

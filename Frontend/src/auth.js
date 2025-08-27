// src/auth.js

import { ui, currentUser, setCurrentUser } from './ui.js';
import { showConfirmationModal } from './utils/helpers.js';
import { initializeApp } from './main.js';

// The API base URL to use for the login request.
const API_BASE_URL = 'https://edusysv1.vercel.app';

/**
 * Hides the main app UI and shows the login page.
 */
export function showLoginPage() {
    ui.loginPage.style.display = 'block';
    ui.app.classList.add('hidden');
}

/**
 * Handles the login form submission. It uses the Fetch API to send
 * the username and password to the server.
 * @param {Event} e - The form submission event.
 */
export async function handleLogin(e) {
    e.preventDefault();
    const username = e.target.username.value.trim();
    const password = e.target.password.value;
    ui.loginMessage.textContent = ''; // Clear any previous error messages

    // Add a loading state to the submit button
    const submitButton = e.target.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Signing In...';


    try {
        const response = await fetch(`${API_BASE_URL}/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        if (!response.ok) {
            ui.loginMessage.textContent = `Server error: ${response.status}`;
            console.error("Server responded with an error:", response);
            // Restore button on failure
            submitButton.disabled = false;
            submitButton.textContent = 'Sign In';
            return;
        }

        const responseText = await response.text();
        const result = responseText ? JSON.parse(responseText) : {};

        if (result.success) {
            // --- NEW: SUCCESS SCREEN LOGIC ---
            const loginRightPanel = document.getElementById('login-right-panel');
            if (loginRightPanel) {
                // Use the user's name if available, otherwise fall back to their email/username
                const displayName = result.user.name || result.user.email || username;

                loginRightPanel.innerHTML = `
                    <div class="view-content text-center p-8 flex flex-col justify-center items-center h-full">
                        <h2 class="text-2xl font-bold text-white mb-4">Welcome, ${displayName}!</h2>
                        <p class="text-slate-400">You have been logged in successfully.</p>
                        <p class="text-slate-500 mt-2 animate-pulse">Redirecting to your dashboard...</p>
                    </div>
                `;
            }

            // Set a timeout before initializing the app
            setTimeout(() => {
                setCurrentUser(result.user);
                sessionStorage.setItem('sms_user_pro', JSON.stringify(result.user));
                initializeApp();
            }, 2500); // 2.5-second delay to show the message

        } else {
            ui.loginMessage.textContent = result.message || 'Invalid username or password.';
            // Restore button on failure
            submitButton.disabled = false;
            submitButton.textContent = 'Sign In';
        }
    } catch (error) {
        console.error("Login request failed:", error);
        ui.loginMessage.textContent = 'A critical error occurred. Check the console.';
        // Restore button on failure
        submitButton.disabled = false;
        submitButton.textContent = 'Sign In';
    }
}

/**
 * Handles the logout process. It shows a confirmation modal before
 * clearing user data from the session and reloading the page.
 */
export function handleLogout() {
    showConfirmationModal("Are you sure you want to log out?", () => {
        setCurrentUser(null);
        sessionStorage.removeItem('sms_user_pro');
        window.location.reload();
    });
}
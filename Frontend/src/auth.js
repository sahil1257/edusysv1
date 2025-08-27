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


export async function handleLogin(e) {
    e.preventDefault();
    const username = e.target.username.value.trim();
    const password = e.target.password.value;
    ui.loginMessage.textContent = ''; // Clear any previous error messages

    // --- References to the new success screen elements ---
    const loginFormContainer = document.getElementById('login-form-container');
    const loginSuccessMessage = document.getElementById('login-success-message');
    const successUsername = document.getElementById('success-username');
    // --- End of new references ---

    try {
        const response = await fetch(`${API_BASE_URL}/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        if (!response.ok) {
            ui.loginMessage.textContent = `Server error: ${response.status}`;
            console.error("Server responded with an error:", response);
            return;
        }

        const responseText = await response.text();
        const result = responseText ? JSON.parse(responseText) : {};

        if (result.success) {
            setCurrentUser(result.user);
            sessionStorage.setItem('sms_user_pro', JSON.stringify(result.user));

            // --- THIS IS THE NEW LOGIC FOR THE SUCCESS SCREEN ---
            // 1. Hide the login form
            if (loginFormContainer) loginFormContainer.classList.add('hidden');
            
            // 2. Show the success message and personalize it
            if (loginSuccessMessage && successUsername) {
                successUsername.textContent = result.user.name || result.user.username;
                loginSuccessMessage.classList.remove('hidden');
            }

            // 3. Wait for 2 seconds before initializing the app
            setTimeout(() => {
                initializeApp();
            }, 2000); 
            // --- END OF NEW LOGIC ---

        } else {
            ui.loginMessage.textContent = result.message || 'Invalid username or password.';
        }
    } catch (error) {
        console.error("Login request failed:", error);
        ui.loginMessage.textContent = 'A critical error occurred. Check the console.';
    }
}


export function handleLogout() {
    showConfirmationModal("Are you sure you want to log out?", () => {
        // --- CRITICAL FIX ---
        // Clear the current user data from memory and session storage.
        setCurrentUser(null);
        sessionStorage.removeItem('sms_user_pro');
        // Reload the page to reset the application state and redirect to login.
        window.location.reload();
    });
}
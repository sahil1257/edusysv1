// src/main.js

import { handleLogin, handleLogout, showLoginPage } from './auth.js';
import { setupUIForRole, toggleSidebar, ui, updateSidebarNotifications, setCurrentUser } from './ui.js';
import { navigateTo } from './router.js';

// --- MAIN APP INITIALIZATION LOGIC ---
export function initializeApp() {
    // Hide login page and show main app
    ui.loginPage.style.display = 'none';
    ui.app.classList.remove('hidden');

    // Setup UI based on user role
    setupUIForRole();

    // Set default page to navigate to
    navigateTo('dashboard');

    // Add event listeners for main app UI
    ui.logoutButton.addEventListener('click', handleLogout);
    ui.mobileMenuBtn.addEventListener('click', toggleSidebar);
    ui.sidebarOverlay.addEventListener('click', toggleSidebar);
    ui.closeModalButton.addEventListener('click', () => ui.modal.style.display = 'none');
    ui.confirmNoBtn.addEventListener('click', () => ui.confirmModal.style.display = 'none');
    
    // Greeting logic
    setupGreeting();
}

// --- HELPER FUNCTIONS ---
function setupGreeting() {
    const greetingTextEl = document.getElementById('greeting-text');
    const greetingUsernameEl = document.getElementById('greeting-username');
    const userNameDisplay = document.getElementById('user-name-display');

    if (greetingTextEl) {
        const hour = new Date().getHours();
        if (hour < 12) { greetingTextEl.textContent = 'Good Morning'; } 
        else if (hour < 18) { greetingTextEl.textContent = 'Good Afternoon'; } 
        else { greetingTextEl.textContent = 'Good Evening'; }
    }
    
    if (userNameDisplay && greetingUsernameEl) {
        const observer = new MutationObserver(() => {
            const fullName = userNameDisplay.textContent;
            if (fullName) {
                const firstName = fullName.split(' ')[0];
                greetingUsernameEl.textContent = firstName;
            }
        });
        observer.observe(userNameDisplay, { childList: true, characterData: true, subtree: true });
    }
}

function setupLoginUI() {
    const portalSelection = document.getElementById('portal-selection');
    const loginFormView = document.getElementById('login-form-view');
    const loginTitle = document.getElementById('login-title');
    const backButton = document.getElementById('back-to-portal');
    const portalCards = document.querySelectorAll('.portal-card');
    const loginForm = document.getElementById('login-form');
    const togglePasswordIcon = document.getElementById('togglePasswordIcon');
    const passwordInput = document.getElementById('password');
    const usernameInput = document.getElementById('username');
    const rememberMeCheckbox = document.getElementById('remember-me');

    // Handle portal card clicks
    portalCards.forEach(card => {
        card.addEventListener('click', () => {
            const role = card.dataset.role;
            portalSelection.classList.add('hidden');
            loginFormView.classList.remove('hidden');
            loginTitle.textContent = `${role} Login`;
        });
    });

    // Handle back button click
    backButton.addEventListener('click', () => {
        loginFormView.classList.add('hidden');
        portalSelection.classList.remove('hidden');
    });

    // Attach the main login handler
    loginForm.addEventListener('submit', handleLogin);

    // Password visibility toggle
    if (togglePasswordIcon && passwordInput) {
        togglePasswordIcon.addEventListener('click', function () {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            this.classList.toggle('fa-eye-slash');
            this.classList.toggle('fa-eye');
        });
    }

    // "Remember Me" functionality
    if (localStorage.getItem('remembered_username')) {
        usernameInput.value = localStorage.getItem('remembered_username');
        rememberMeCheckbox.checked = true;
    }

    loginForm.addEventListener('submit', () => {
        if (rememberMeCheckbox.checked) {
            localStorage.setItem('remembered_username', usernameInput.value);
        } else {
            localStorage.removeItem('remembered_username');
        }
    });
}


// --- APPLICATION ENTRY POINT ---
document.addEventListener('DOMContentLoaded', () => {
    // Set default Chart.js styles
    if(typeof Chart !== 'undefined') {
        Chart.defaults.color = '#f1f5f9';
        Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.1)';
    }

    // Check for a logged-in user in session storage
    const storedUser = sessionStorage.getItem('sms_user_pro');
    if (storedUser) {
        try {
            const user = JSON.parse(storedUser);
            setCurrentUser(user);
            initializeApp();
        } catch (error) {
            console.error("Failed to parse user from session storage:", error);
            sessionStorage.removeItem('sms_user_pro');
            showLoginPage();
            setupLoginUI();
        }
    } else {
        // If no user, show the login page and set up its specific UI listeners
        showLoginPage();
        setupLoginUI();
    }
});
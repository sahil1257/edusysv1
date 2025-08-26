// in frontend/src/main.js
import { store } from './store.js';
import { ui, currentUser, setCurrentUser, setupUIForRole } from './ui.js';
import { showLoginPage, handleLogin, handleLogout } from './auth.js';
import { navigateTo } from './router.js';
import { navConfig } from './config.js'; // <-- THIS LINE IS THE FIX
import { handleResetData } from './utils/dataSeeder.js';
import { closeAnimatedModal } from './utils/helpers.js';
import { toggleSidebar } from './ui.js';

// Main application logic
export function initializeApp() {
    ui.loginPage.style.display = 'none';
    ui.app.classList.remove('hidden');
    setupUIForRole();
    const defaultPage = navConfig[currentUser.role]?.[0]?.page;
    if (defaultPage) {
        navigateTo(defaultPage);
    }
}

// Attach listeners that are always present on the page
export function setupGlobalEventListeners() {
    ui.loginForm.addEventListener('submit', handleLogin);
    ui.logoutButton.addEventListener('click', handleLogout);
    ui.closeModalButton.addEventListener('click', () => closeAnimatedModal(ui.modal));
    ui.confirmNoBtn.addEventListener('click', () => closeAnimatedModal(ui.confirmModal));
    ui.resetDataBtn.addEventListener('click', handleResetData);
    ui.mobileMenuBtn.addEventListener('click', toggleSidebar);
    ui.sidebarOverlay.addEventListener('click', toggleSidebar);
}

// Start the application
document.addEventListener('DOMContentLoaded', async () => {
    console.log("Application starting...");
    const savedUser = sessionStorage.getItem('sms_user_pro');
    
    // **THIS IS THE CRITICAL CHANGE**
    if (savedUser) {
        // If user data exists, initialize the main application
        try {
            setCurrentUser(JSON.parse(savedUser));
            await store.initialize(); // Initialize store only when needed
            initializeApp();
            setupGlobalEventListeners(); // Setup listeners for the main app
        } catch (e) {
            console.error("Failed to parse saved user data.", e);
            sessionStorage.removeItem('sms_user_pro');
            // If data is corrupt, redirect to login page
            window.location.href = 'login.html';
        }
    } else {
        // If no user data, redirect to the new login page
        window.location.href = 'login.html';
    }
});

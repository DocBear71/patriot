// login-handler.js - Simple login handler

// Global function to handle login
function handleLogin() {
    console.log("Handle login function called");

    // Get form values
    const email = document.getElementById('DropdownFormEmail1').value;
    const password = document.getElementById('DropdownFormPassword1').value;
    const rememberMe = document.getElementById('dropdownCheck')?.checked || false;

    console.log("Login attempt with:", email, "Remember me:", rememberMe);

    // For now, just simulate a successful login
    if (email && password) {
        console.log("Login successful");

        // Store authentication status
        if (rememberMe) {
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('userEmail', email);
        } else {
            sessionStorage.setItem('isLoggedIn', 'true');
            sessionStorage.setItem('userEmail', email);
        }

        // Update UI - Change sign in button text
        const signInButton = document.querySelector('.btn-secondary.dropdown-toggle');
        if (signInButton) {
            signInButton.textContent = email;
        }

        // Enable restricted menu items
        document.querySelectorAll('.dropdown-item.disabled').forEach(item => {
            item.classList.remove('disabled');
        });

        // Close the dropdown
        const dropdown = document.querySelector('.dropdown-menu');
        if (dropdown) {
            $(dropdown).parent().removeClass('show');
            $(dropdown).removeClass('show');
        }

        alert("Login successful!");
    } else {
        console.error("Login failed: Missing email or password");
        alert("Please enter both email and password.");
    }
}

// Check if user is already logged in
function checkLoginStatus() {
    console.log("Checking login status");

    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true' ||
        sessionStorage.getItem('isLoggedIn') === 'true';

    if (isLoggedIn) {
        console.log("User is already logged in");

        const userEmail = localStorage.getItem('userEmail') ||
            sessionStorage.getItem('userEmail');

        if (userEmail) {
            // Update UI
            const signInButton = document.querySelector('.btn-secondary.dropdown-toggle');
            if (signInButton) {
                signInButton.textContent = userEmail;
            }

            // Enable restricted menu items
            document.querySelectorAll('.dropdown-item.disabled').forEach(item => {
                item.classList.remove('disabled');
            });
        }
    } else {
        console.log("User is not logged in");
    }
}

// Make functions globally available
window.handleLogin = handleLogin;
window.checkLoginStatus = checkLoginStatus;

// Check login status when script loads
console.log("Login handler script loaded, running initial check");
// We'll call checkLoginStatus() after the DOM is fully loaded
document.addEventListener('DOMContentLoaded', checkLoginStatus);
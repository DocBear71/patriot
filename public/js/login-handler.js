// login-handler.js - Handles user authentication
function loginUser(email, password, rememberMe) {
    console.log("Login attempt with:", email, "Remember me:", rememberMe);

    // Here you would typically make an AJAX call to your authentication server
    // For now, let's simulate a successful login

    // Example authentication logic (replace with your actual authentication)
    if (email && password) {
        // Simulate successful login
        console.log("Login successful");

        // Store authentication status in localStorage or sessionStorage
        if (rememberMe) {
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('userEmail', email);
        } else {
            sessionStorage.setItem('isLoggedIn', 'true');
            sessionStorage.setItem('userEmail', email);
        }

        // Update UI to reflect logged-in state
        updateUIAfterLogin(email);

        // Close the dropdown
        const dropdown = document.querySelector('.dropdown-menu');
        if (dropdown) {
            $(dropdown).parent().removeClass('show');
            $(dropdown).removeClass('show');
        }
    } else {
        console.error("Login failed: Invalid credentials");
        alert("Invalid email or password. Please try again.");
    }
}

// Function to update UI after successful login
function updateUIAfterLogin(email) {
    // Replace the Sign In button with user info
    const signInButton = document.querySelector('.btn-secondary.dropdown-toggle');
    if (signInButton) {
        signInButton.textContent = email;
    }

    // Enable restricted menu items
    document.querySelectorAll('.dropdown-item.disabled').forEach(item => {
        item.classList.remove('disabled');
    });
}

// Check if user is already logged in on page load
document.addEventListener('DOMContentLoaded', function() {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true' ||
        sessionStorage.getItem('isLoggedIn') === 'true';

    if (isLoggedIn) {
        const userEmail = localStorage.getItem('userEmail') ||
            sessionStorage.getItem('userEmail');

        if (userEmail) {
            updateUIAfterLogin(userEmail);
        }
    }
});
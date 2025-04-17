// login-handler.js - Handles user authentication

// Function to authenticate a user
async function loginUser(email, password, rememberMe) {
    console.log("Login attempt with:", email, "Remember me:", rememberMe);

    try {
        // Call your authentication API
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });

        // Parse the JSON response
        const data = await response.json();

        if (response.ok) {
            // Login successful
            console.log("Login successful");

            // Store authentication status in localStorage or sessionStorage
            if (rememberMe) {
                localStorage.setItem('isLoggedIn', 'true');
                localStorage.setItem('userEmail', email);
                localStorage.setItem('userId', data.userId);
                localStorage.setItem('userStatus', data.status || 'US');
            } else {
                sessionStorage.setItem('isLoggedIn', 'true');
                sessionStorage.setItem('userEmail', email);
                sessionStorage.setItem('userId', data.userId);
                sessionStorage.setItem('userStatus', data.status || 'US');
            }

            // Update UI to reflect logged-in state
            updateUIAfterLogin(email, data.status);

            // Close the dropdown
            const dropdown = document.querySelector('.dropdown-menu');
            if (dropdown) {
                $(dropdown).parent().removeClass('show');
                $(dropdown).removeClass('show');
            }

            return true;
        } else {
            // Login failed
            console.error("Login failed:", data.message);
            alert(data.message || "Invalid email or password. Please try again.");
            return false;
        }
    } catch (error) {
        console.error("Login error:", error);
        alert("An error occurred during login. Please try again.");
        return false;
    }
}

// Function to update UI after successful login
function updateUIAfterLogin(email, status) {
    // Replace the Sign In button with user info
    const signInButton = document.querySelector('.btn-secondary.dropdown-toggle');
    if (signInButton) {
        signInButton.textContent = email;
    }

    // Enable restricted menu items based on user status
    document.querySelectorAll('.dropdown-item.disabled').forEach(item => {
        // Enable all items for regular users
        item.classList.remove('disabled');

        // If this is an admin user, enable additional features
        if (status === 'AD') {
            // Enable admin-specific features here if needed
        }
    });
}

// Function to check if user is already logged in
function checkLoginStatus() {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true' ||
        sessionStorage.getItem('isLoggedIn') === 'true';

    if (isLoggedIn) {
        const userEmail = localStorage.getItem('userEmail') ||
            sessionStorage.getItem('userEmail');
        const userStatus = localStorage.getItem('userStatus') ||
            sessionStorage.getItem('userStatus') || 'US';

        if (userEmail) {
            updateUIAfterLogin(userEmail, userStatus);
        }
    }
}

// Check login status when the page loads
document.addEventListener('DOMContentLoaded', function() {
    checkLoginStatus();
});

// Logout function
function logoutUser() {
    // Clear authentication data
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userId');
    localStorage.removeItem('userStatus');
    sessionStorage.removeItem('isLoggedIn');
    sessionStorage.removeItem('userEmail');
    sessionStorage.removeItem('userId');
    sessionStorage.removeItem('userStatus');

    // Reload the page to reset the UI
    window.location.reload();
}

// Export the functions for use in other scripts
window.loginUser = loginUser;
window.logoutUser = logoutUser;
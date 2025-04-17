// login-handler.js - Simple login handler that works with dynamically loaded content
console.log("Login handler script loaded");

// Function to handle login
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

// Function to attach event listeners
function attachLoginListeners() {
    console.log("Attaching login event listeners");

    // Use event delegation to catch clicks on the login button
    $(document).on('click', '#login-button', function(e) {
        console.log("Login button clicked");
        e.preventDefault();
        handleLogin();
    });

    // Also handle form submission (even though we changed the button type)
    $(document).on('submit', '#login-form', function(e) {
        console.log("Login form submitted");
        e.preventDefault();
        handleLogin();
        return false;
    });
}

// Function to check login status
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

// Attach event listeners when jQuery is ready
$(function() {
    console.log("jQuery ready in login-handler.js");
    attachLoginListeners();
    // Set a timeout to check login status after everything has loaded
    setTimeout(checkLoginStatus, 500);
});
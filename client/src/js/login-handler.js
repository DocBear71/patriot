// login-handler.js - Enhanced login handler with session storage compatible with profile-manager.js
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
        // prepare login data
        const loginData = {
            email: email,
            password: password,
        };

        // determine the base URL
        const baseURL = window.location.hostname === "localhose" || window.location.hostname === '127.0.0.1'
            ? `https://${window.location.host}`
            : `https://patriotthanks.vercel.app`;

        // Make API call to login endpoint
        fetch(`${baseIRL}/api/auth?operation=login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json; charset=UTF-8",
            },
            body: JSON.stringify(loginData),
        })
        .then(res => {
            if (!res.ok) {
                throw new Error('Login failed: ' + res.statusText);
            }
            return res.json();
        })
        .then(data => {
            console.log("Login successful");

            // create session object
            const session = {
                user: {
                    _id: data.userId,
                    email: data.email,
                    fname: data.fname,
                    lname: data.lname,
                    address1: data.address1,
                    address2: data.address2,
                    city: data.city,
                    state: data.state,
                    zip: data.zip,
                    status: data.status,
                    level: data.level,
                    isAdmin: data.isAdmin,
                    created_at: data.created_at,
                    updated_at: data.updated_at,
                },
                token: data.token || 'no-token-provided',
                timestamp: new Date().getTime(),
                expiresIn: 24 * 60 * 60 * 1000 // 24 hours in milliseconds
            };


        // Store the session in localStorage
        localStorage.setItem('patriotThanksSession', JSON.stringify(session));

        // Also store the old format for backward compatibility
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userEmail', email);

        // Update UI with dropdown changes
        updateUIAfterLogin(email);

        // Close the dropdown
        const dropdown = document.querySelector('.dropdown-menu');
        if (dropdown) {
            $(dropdown).parent().removeClass('show');
            $(dropdown).removeClass('show');
        }
    })
    .catch (error => {
        console.error("Login error: ", error);
        alert("Login failed: " + error.message);
    });
    } else {
        console.error("Login failed: Missing email or password");
        alert("Please enter both email and password.");
    }
}

// Helper function to generate a temporary ID
function generateTempId() {
    return 'temp_' + Math.random().toString(36).substr(2, 9);
}

// Function to update UI after login
function updateUIAfterLogin(email) {
    console.log("Updating UI after login");

    // Change the button text to the email
    const signInButton = document.querySelector('.btn-secondary.dropdown-toggle');
    if (signInButton) {
        signInButton.textContent = email;
    }

    // Enable restricted menu items
    document.querySelectorAll('.dropdown-item.disabled').forEach(item => {
        item.classList.remove('disabled');
    });

    // Replace the dropdown content with logged-in options
    const dropdownMenu = document.querySelector('.dropdown-menu.dropdown-menu-right');
    if (dropdownMenu) {
        // Save the original content for logout
        if (!window.originalDropdownContent) {
            window.originalDropdownContent = dropdownMenu.innerHTML;
        }

        // Create new dropdown content
        dropdownMenu.innerHTML = `
            <a class="dropdown-item" href="/profile.html">My Profile</a>
            <a class="dropdown-item" href="/settings.html">Account Settings</a>
            <div class="dropdown-divider"></div>
            <a class="dropdown-item" href="#" id="logout-link">Logout</a>
        `;

        // Add event listener for the logout link
        const logoutLink = document.getElementById('logout-link');
        if (logoutLink) {
            logoutLink.addEventListener('click', function(e) {
                e.preventDefault();
                logoutUser();
            });
        }
    }
}

// Function to handle logout
function logoutUser() {
    console.log("Logging out user");

    // Clear authentication data in both formats
    localStorage.removeItem('patriotThanksSession');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userEmail');
    sessionStorage.removeItem('isLoggedIn');
    sessionStorage.removeItem('userEmail');

    // Restore original dropdown content
    const dropdownMenu = document.querySelector('.dropdown-menu.dropdown-menu-right');
    if (dropdownMenu && window.originalDropdownContent) {
        dropdownMenu.innerHTML = window.originalDropdownContent;
    }

    // Reset the button text
    const signInButton = document.querySelector('.btn-secondary.dropdown-toggle');
    if (signInButton) {
        signInButton.textContent = 'Sign In';
    }

    // Disable restricted menu items
    document.querySelectorAll('.dropdown-item').forEach(item => {
        // Check if the item should be disabled
        if (item.href.includes('business-add.html') ||
            item.href.includes('business-search.html') ||
            item.href.includes('incentive-add.html') ||
            item.href.includes('incentive-view.html')) {
            item.classList.add('disabled');
        }
    });

    // Reattach login event listeners
    attachLoginListeners();

    // If on a restricted page, redirect to home
    const currentPath = window.location.pathname;
    if (currentPath.includes('profile.html') ||
        currentPath.includes('settings.html') ||
        currentPath.includes('business-add.html') ||
        currentPath.includes('business-search.html') ||
        currentPath.includes('incentive-add.html') ||
        currentPath.includes('incentive-view.html')) {
        window.location.href = '/index.html';
    }
}

// Function to attach event listeners
function attachLoginListeners() {
    console.log("Attaching login event listeners");

    // Use event delegation to catch clicks on the login button
    $(document).on('click', '#login-button, button.btn-primary', function(e) {
        if ($(this).closest('form').attr('id') === 'login-form' ||
            $(this).closest('.dropdown-menu').length > 0) {
            console.log("Login button clicked");
            e.preventDefault();
            handleLogin();
        }
    });

    // Also handle form submission
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

    // Check for session in the format expected by profile-manager.js
    const sessionData = localStorage.getItem('patriotThanksSession');

    if (sessionData) {
        try {
            const session = JSON.parse(sessionData);
            const currentTime = new Date().getTime();

            // Check if session is still valid
            if (currentTime < session.timestamp + session.expiresIn) {
                console.log("User is already logged in (session found)");

                // Update UI with dropdown changes
                updateUIAfterLogin(session.user.email);
                return true;
            }
        } catch (error) {
            console.error("Error parsing session data:", error);
        }
    }

    // Fallback to the old format
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true' ||
        sessionStorage.getItem('isLoggedIn') === 'true';

    if (isLoggedIn) {
        console.log("User is already logged in (old format)");

        const userEmail = localStorage.getItem('userEmail') ||
            sessionStorage.getItem('userEmail');

        if (userEmail) {
            // Create a new session object in the format expected by profile-manager.js
            const session = {
                user: {
                    _id: generateTempId(),
                    email: userEmail,
                    fname: '',
                    lname: '',
                    status: 'US'
                },
                token: 'simulated-token',
                timestamp: new Date().getTime(),
                expiresIn: 24 * 60 * 60 * 1000 // 24 hours
            };

            // Store the new session format
            localStorage.setItem('patriotThanksSession', JSON.stringify(session));

            // Update UI with dropdown changes
            updateUIAfterLogin(userEmail);
            return true;
        }
    }

    console.log("User is not logged in");
    return false;
}

// Make functions globally available
window.loginUser = handleLogin;
window.logoutUser = logoutUser;
window.checkLoginStatus = checkLoginStatus;

// Attach event listeners when jQuery is ready
$(function() {
    console.log("jQuery ready in login-handler.js");
    attachLoginListeners();
    // Check login status after a short delay to ensure the navbar is loaded
    setTimeout(checkLoginStatus, 500);
});
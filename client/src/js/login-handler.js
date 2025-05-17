// login-handler.js - Enhanced login handler with admin support and case-insensitive email
console.log("Login handler script loaded");

// Function to handle login
function handleLogin() {
    console.log("Handle login function called");

    // Get form values
    const email = document.getElementById('DropdownFormEmail1').value.toLowerCase(); // Convert to lowercase here
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
        const baseURL = window.location.hostname === "localhost" || window.location.hostname === '127.0.0.1'
            ? `http://${window.location.host}`
            : window.location.origin;

        // Make API call to login endpoint
        fetch(`${baseURL}/api/auth.js?operation=login`, {
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
                updateUIAfterLogin(session);

                // update the login UI
                updateLoginUI();

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
function updateUIAfterLogin(session) {
    console.log("Updating UI after login");

    // Get user info from session
    const user = session.user;
    const email = user.email;
    const isAdmin = user.isAdmin || user.level === 'Admin';
    const displayName = user.fname ? `${user.fname} ${user.lname}` : email;

    // Toggle visibility of login and user dropdowns
    const loginDropdownButton = document.getElementById('login-dropdown-button');
    const userDropdownButton = document.getElementById('user-dropdown-button');
    const loginDropdownMenu = document.getElementById('login-dropdown-menu');
    const userDropdownMenu = document.getElementById('user-dropdown-menu');

    if (loginDropdownButton) loginDropdownButton.style.display = 'none';
    if (userDropdownButton) {
        userDropdownButton.style.display = 'inline-block';

        // Update user name display
        const userNameElement = document.getElementById('user-name');
        if (userNameElement) {
            if (isAdmin) {
                userNameElement.innerHTML = `${displayName} <span class="admin-badge">Admin</span>`;
            } else {
                userNameElement.textContent = displayName;
            }
        } else {
            // Fallback for old navbar
            userDropdownButton.textContent = displayName;
        }
    }

    if (loginDropdownMenu) loginDropdownMenu.style.display = 'none';
    if (userDropdownMenu) userDropdownMenu.style.display = 'block';

    // Show/hide admin elements based on role
    toggleAdminElements(isAdmin);

    // Enable restricted links
    enableRestrictedLinks(user);

    console.log("UI updated for logged in user:", displayName, "Admin:", isAdmin);

    checkTermsVersion(session);
}

// Function to check if user needs to accept new terms
function checkTermsVersion(session) {
    if (!session || !session.user) return;

    // Current version of terms
    const currentTermsVersion = "May 14, 2025";

    // Check if user has accepted current terms
    if (!session.user.termsAccepted || session.user.termsVersion !== currentTermsVersion) {
        console.log("User needs to accept new terms");

        // Remove any existing backdrop (helps prevent modal issues)
        $('.modal-backdrop').remove();
        $('body').removeClass('modal-open');

        // Show the modal for terms acceptance
        $('#termsUpdateModal').modal({
            backdrop: 'static', // Prevent closing by clicking outside
            keyboard: false     // Prevent closing with keyboard
        });
    }
}

// Function to update terms acceptance
function updateTermsAcceptance(session) {
    const userId = session.user._id;

    // determine the base URL
    const baseURL = window.location.hostname === "localhost" || window.location.hostname === '127.0.0.1'
        ? `http://${window.location.host}`
        : window.location.origin;

    // Update user's terms acceptance
    fetch(`${baseURL}/api/auth.js?operation=update-terms-acceptance`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + session.token
        },
        body: JSON.stringify({
            userId: userId,
            termsAccepted: true,
            termsAcceptedDate: new Date().toISOString(),
            termsVersion: "May 14, 2025"
        })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log("Terms acceptance updated successfully");

                // Update session data
                session.user.termsAccepted = true;
                session.user.termsAcceptedDate = new Date().toISOString();
                session.user.termsVersion = "May 14, 2025";

                // Save updated session
                localStorage.setItem('patriotThanksSession', JSON.stringify(session));
            } else {
                console.error("Failed to update terms acceptance");
                alert('Failed to update terms acceptance. Please try again.');
            }
        })
        .catch(error => {
            console.error('Error updating terms acceptance:', error);
            alert('An error occurred while updating terms acceptance.');
        });
}

// Function to toggle admin elements visibility
function toggleAdminElements(isAdmin) {
    const adminElements = document.querySelectorAll('.admin-only');

    adminElements.forEach(element => {
        if (isAdmin) {
            element.style.display = ''; // Use default display type
        } else {
            element.style.display = 'none';
        }
    });

    console.log(`Admin elements ${isAdmin ? 'shown' : 'hidden'}`);
}

// Function to enable or disable restricted links based on role
function enableRestrictedLinks(user) {
    const businessAddLink = document.querySelector('a[href="./business-add.html"]');
    const businessUpdateLink = document.querySelector('a[href="./business-update.html"]');
    const incentiveAddLink = document.querySelector('a[href="./incentive-add.html"]');
    const incentiveUpdateLink = document.querySelector('a[href="./incentive-update.html"]');

    // Enable links for logged in users
    if (businessAddLink) businessAddLink.classList.remove('disabled');
    if (incentiveAddLink) incentiveAddLink.classList.remove('disabled');

    // For admin users, enable update links as well
    if (user.isAdmin || user.level === 'Admin') {
        if (businessUpdateLink) businessUpdateLink.classList.remove('disabled');
        if (incentiveUpdateLink) incentiveUpdateLink.classList.remove('disabled');
    }

    document.querySelectorAll('.dropdown-item.disabled').forEach(item => {
        // Check if the item should be enabled based on path
        if ((item.href.includes('business-add.html') ||
                item.href.includes('incentive-add.html')) ||
            // ((user.isAdmin || user.level === 'Admin') &&
                (item.href.includes('business-update.html') ||
                    item.href.includes('incentive-update.html'))) {
            console.log("Enabling restricted link:", item.href);
            item.classList.remove('disabled');
        }
    });
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

    // Toggle visibility of login and user dropdowns
    const loginDropdownButton = document.getElementById('login-dropdown-button');
    const userDropdownButton = document.getElementById('user-dropdown-button');
    const loginDropdownMenu = document.getElementById('login-dropdown-menu');
    const userDropdownMenu = document.getElementById('user-dropdown-menu');

    if (loginDropdownButton) loginDropdownButton.style.display = 'inline-block';
    if (userDropdownButton) userDropdownButton.style.display = 'none';
    if (loginDropdownMenu) loginDropdownMenu.style.display = 'block';
    if (userDropdownMenu) userDropdownMenu.style.display = 'none';

    // Hide all admin elements
    toggleAdminElements(false);

    // Reset login form fields
    const emailInput = document.getElementById('DropdownFormEmail1');
    const passwordInput = document.getElementById('DropdownFormPassword1');
    if (emailInput) emailInput.value = '';
    if (passwordInput) passwordInput.value = '';

    // Disable restricted menu items
    document.querySelectorAll('.dropdown-item').forEach(item => {
        // Check if the item should be disabled
        if (item.href.includes('business-add.html') ||
            item.href.includes('business-update.html') ||
            item.href.includes('incentive-add.html') ||
            item.href.includes('incentive-update.html')) {
            item.classList.add('disabled');
            console.log("Disabling link on logout:", item.href);
        }
    });

    // Reattach login event listeners
    attachLoginListeners();

    // If on a restricted page, redirect to home
    const currentPath = window.location.pathname;
    if (currentPath.includes('profile.html') ||
        currentPath.includes('settings.html') ||
        currentPath.includes('admin-') ||  // Redirect from all admin pages
        currentPath.includes('business-add.html') ||
        currentPath.includes('business-update.html') ||
        currentPath.includes('incentive-add.html') ||
        currentPath.includes('incentive-update.html')) {
        window.location.href = '/index.html';
    }
    // update the login UI
    updateLoginUI();
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
    $(document).on('submit', '#login-form', '.dropdown-menu form', function(e) {
        console.log("Login form submitted");
        e.preventDefault();
        handleLogin();
        return false;
    });

    $(document).on('keypress', '#DropdownFormPassword1', function(e) {
        if (e.which === 13) {
            e.preventDefault();
            handleLogin();
        }
    });

    // Handle logout button
    $(document).on('click', '#logout-button, #logout-link', function(e) {
        e.preventDefault();
        logoutUser();
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

                // Update UI with session data
                updateUIAfterLogin(session);
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

        const email = localStorage.getItem('userEmail') ||
            sessionStorage.getItem('userEmail');

        const userId = localStorage.getItem('userId') ||
            sessionStorage.getItem('userId') || generateTempId();

        const fname = localStorage.getItem('fname') ||
            sessionStorage.getItem('fname') || '';

        const lname = localStorage.getItem('lname') ||
            sessionStorage.getItem('lname') || '';

        const address1 = localStorage.getItem('address1') ||
            sessionStorage.getItem('address1') || '';

        const address2 = localStorage.getItem('address2') ||
            sessionStorage.getItem('address2') || '';

        const city = localStorage.getItem('city') ||
            sessionStorage.getItem('city') || '';

        const state = localStorage.getItem('state') ||
            sessionStorage.getItem('state') || '';

        const zip = localStorage.getItem('zip') ||
            sessionStorage.getItem('zip') || '';

        const status = localStorage.getItem('status') ||
            sessionStorage.getItem('status') || '';

        const level = localStorage.getItem('level') ||
            sessionStorage.getItem('level') || '';

        const isAdmin = localStorage.getItem('isAdmin') === 'true' ||
            sessionStorage.getItem('isAdmin') === 'true';

        const created_at = localStorage.getItem('created_at') ||
            sessionStorage.getItem('created_at') || new Date().toISOString();

        const updated_at = localStorage.getItem('updated_at') ||
            sessionStorage.getItem('updated_at') || new Date().toISOString();

        if (email) {
            // Create a new session object in the format expected by profile-manager.js
            const session = {
                user: {
                    _id: userId,
                    email: email,
                    fname: fname,
                    lname: lname,
                    address1: address1,
                    address2: address2,
                    city: city,
                    state: state,
                    zip: zip,
                    status: status,
                    level: level,
                    isAdmin: isAdmin,
                    created_at: created_at,
                    updated_at: updated_at,
                },
                token: 'simulated-token',
                timestamp: new Date().getTime(),
                expiresIn: 24 * 60 * 60 * 1000 // 24 hours in milliseconds
            };

            // Store the new session format
            localStorage.setItem('patriotThanksSession', JSON.stringify(session));

            // Update UI with session data
            updateUIAfterLogin(session);
            return true;
        }
    }

    console.log("User is not logged in");
    return false;
}

// Add this function to your login-handler.js file
function fixLoginMenuIssue() {
    const sessionData = localStorage.getItem('patriotThanksSession');
    if (sessionData) {
        try {
            // User is logged in
            const session = JSON.parse(sessionData);

            // Hide login button
            const loginBtn = document.getElementById('loginBtn');
            if (loginBtn) loginBtn.style.display = 'none';

            // Show user dropdown
            const userDropdown = document.getElementById('userDropdown');
            if (userDropdown) {
                userDropdown.style.display = 'block';

                // Update user name display
                const userDisplayName = document.getElementById('userDisplayName');
                if (userDisplayName && session.user) {
                    userDisplayName.textContent = `${session.user.fname || ''} ${session.user.lname || ''}`;
                }
            }

            console.log("User session active, displaying user dropdown");
        } catch (error) {
            console.error("Error parsing session data:", error);
        }
    } else {
        // User is not logged in
        console.log("No active session found");
    }
}

// Call the fix function after page is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(fixLoginMenuIssue, 500); // Short delay to ensure other scripts have run
    setTimeout(updateLoginUI, 500); // to also update the login UI
});

function updateLoginUI() {
    const sessionData = localStorage.getItem('patriotThanksSession');
    const signInDropdown = document.querySelector('.navbar-nav.ml-auto li.dropdown:not(#user-dropdown)');
    const userDropdown = document.getElementById('user-dropdown');

    if (sessionData) {
        // User is logged in
        const session = JSON.parse(sessionData);

        // Hide sign in dropdown
        if (signInDropdown) signInDropdown.style.display = 'none';

        // Show user dropdown
        if (userDropdown) {
            userDropdown.style.display = 'block';

            // Update user name display
            const userDisplayName = document.getElementById('userDisplayName');
            if (userDisplayName && session.user) {
                userDisplayName.textContent = `${session.user.fname || ''} ${session.user.lname || ''}`;
            }
        }

        // Toggle admin elements
        toggleAdminElements(session.user && (session.user.isAdmin || session.user.level === 'Admin'));
    } else {
        // User is not logged in
        if (signInDropdown) signInDropdown.style.display = 'block';
        if (userDropdown) userDropdown.style.display = 'none';

        // Hide admin elements
        toggleAdminElements(false);
    }
}

// Helper function to get auth token (used by other scripts)
function getAuthToken() {
    try {
        const sessionData = localStorage.getItem('patriotThanksSession');
        if (!sessionData) {
            return null;
        }

        const session = JSON.parse(sessionData);
        return session.token || null;
    } catch (error) {
        console.error('Error retrieving auth token:', error);
        return null;
    }
}

// Terms modal handlers
function setupTermsModalHandlers() {
    console.log("Setting up terms modal handlers");

    // Enable the Accept button only when checkbox is checked
    $(document).on('change', '#acceptUpdatedTerms', function() {
        document.getElementById('confirmUpdatedTerms').disabled = !this.checked;
    });

    // Handle terms acceptance
    $(document).on('click', '#confirmUpdatedTerms', function() {
        console.log("Terms acceptance confirmed");

        // Get session data
        const sessionData = localStorage.getItem('patriotThanksSession');
        if (!sessionData) {
            console.error("No session found");
            $('#termsUpdateModal').modal('hide');
            return;
        }

        const session = JSON.parse(sessionData);
        const userId = session.user._id;

        // determine the base URL
        const baseURL = window.location.hostname === "localhost" || window.location.hostname === '127.0.0.1'
            ? `http://${window.location.host}`
            : window.location.origin;

        // Update user's terms acceptance
        fetch(`${baseURL}/api/auth.js?operation=update-terms-acceptance`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + session.token
            },
            body: JSON.stringify({
                userId: userId,
                termsAccepted: true,
                termsAcceptedDate: new Date().toISOString(),
                termsVersion: "May 14, 2025"
            })
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    console.log("Terms acceptance updated successfully");

                    // Update session data
                    session.user.termsAccepted = true;
                    session.user.termsAcceptedDate = new Date().toISOString();
                    session.user.termsVersion = "May 14, 2025";

                    // Save updated session
                    localStorage.setItem('patriotThanksSession', JSON.stringify(session));

                    // Hide modal
                    $('#termsUpdateModal').modal('hide');
                } else {
                    console.error("Failed to update terms acceptance");
                    alert('Failed to update terms acceptance. Please try again.');
                }
            })
            .catch(error => {
                console.error('Error updating terms acceptance:', error);
                alert('An error occurred. Please try again.');
            });
    });

    // Handle terms rejection
    $(document).on('click', '#rejectUpdatedTerms', function() {
        console.log("Terms acceptance rejected");

        // Warn user about consequences
        if (confirm("If you do not accept the updated terms, you will be logged out and unable to use the service. Continue?")) {
            // Log out the user
            logoutUser();
            $('#termsUpdateModal').modal('hide');
        }
    });
}

// Function to set up terms scroll tracking
function setupTermsScrollTracking() {
    console.log("Setting up terms scroll tracking");

    // Elements
    const termsSummary = document.getElementById('termsSummary');
    const termsCheckbox = document.getElementById('acceptUpdatedTerms');
    const confirmButton = document.getElementById('confirmUpdatedTerms');
    const scrollMessage = document.getElementById('scrollMessage');

    // Initial state variables
    let hasScrolledToBottom = false;
    let startTime = Date.now();
    const MINIMUM_READ_TIME = 5000; // 5 seconds minimum reading time

    // Add scroll event listener
    if (termsSummary) {
        termsSummary.addEventListener('scroll', function() {
            // Calculate scroll position
            const scrollPosition = termsSummary.scrollTop + termsSummary.clientHeight;
            const scrollHeight = termsSummary.scrollHeight;
            const timeSpent = Date.now() - startTime;

            // Calculate how far through the content the user has scrolled (as a percentage)
            const scrollPercentage = (scrollPosition / scrollHeight) * 100;

            // User must scroll at least 80% through the content
            if (scrollPercentage >= 80 && timeSpent >= MINIMUM_READ_TIME) {
                console.log("User has scrolled to near bottom of terms");
                hasScrolledToBottom = true;

                // Enable the checkbox
                if (termsCheckbox) {
                    termsCheckbox.disabled = false;
                    console.log("Terms checkbox enabled");
                }

                // Show confirmation message
                if (scrollMessage) {
                    scrollMessage.style.display = 'block';
                    scrollMessage.innerHTML = '<i class="fa fa-check-circle"></i> Thank you for reviewing the terms. Please check the box below to confirm your acceptance.';
                    scrollMessage.style.color = 'green';
                }
            } else if (scrollPercentage >= 80 && timeSpent < MINIMUM_READ_TIME) {
                // User scrolled quickly to bottom, but hasn't spent enough time
                const remainingTime = Math.ceil((MINIMUM_READ_TIME - timeSpent) / 1000);
                if (scrollMessage) {
                    scrollMessage.style.display = 'block';
                    scrollMessage.innerHTML = `Please continue reviewing for ${remainingTime} more seconds.`;
                    scrollMessage.style.color = '#f57c00'; // Orange for warning
                }
            } else if (scrollPercentage >= 50) {
                // User is making progress
                if (scrollMessage) {
                    scrollMessage.style.display = 'block';
                    scrollMessage.innerHTML = 'Continue scrolling to review all terms.';
                    scrollMessage.style.color = '#2196F3'; // Blue for info
                }
            }
        });
    } else {
        console.error("Terms summary element not found");
    }

    // Add checkbox change event handler
    $(document).on('change', '#acceptUpdatedTerms', function() {
        // Only allow checking if scrolled to bottom
        if (!hasScrolledToBottom && this.checked) {
            alert('Please read the terms summary by scrolling to the bottom before accepting.');
            this.checked = false;
            return;
        }

        // Enable/disable the confirm button based on checkbox
        if (confirmButton) {
            confirmButton.disabled = !this.checked;
            console.log("Terms confirm button " + (this.checked ? "enabled" : "disabled"));
        }
    });
}

function fixModalBackdropIssue() {
    // If there's a stuck backdrop, remove it
    $('.modal-backdrop').remove();

    // Fix modal opening issues
    $('#termsUpdateModal').on('show.bs.modal', function () {
        // Make sure only one backdrop appears
        if ($('.modal-backdrop').length > 1) {
            $('.modal-backdrop').not(':first').remove();
        }
    });

    // Ensure modal can be closed
    $('#termsUpdateModal').on('hidden.bs.modal', function () {
        $('body').removeClass('modal-open');
        $('.modal-backdrop').remove();
    });
}

// Emergency function to remove stuck modal/backdrop (can be called from console if needed)
function emergencyModalReset() {
    $('#termsUpdateModal').modal('hide');
    $('.modal-backdrop').remove();
    $('body').removeClass('modal-open');
    $('body').css('padding-right', '');
    console.log('Emergency modal reset performed');
}

// Make functions globally available
window.loginUser = handleLogin;
window.logoutUser = logoutUser;
window.checkLoginStatus = checkLoginStatus;
window.getAuthToken = getAuthToken;
window.toggleAdminElements = toggleAdminElements;
window.emergencyModalReset = emergencyModalReset;

// Attach event listeners when jQuery is ready
$(function() {
    console.log("jQuery ready in login-handler.js");
    attachLoginListeners();
    setupTermsModalHandlers();
    setupTermsScrollTracking();
    fixModalBackdropIssue();
    // Check login status after a short delay to ensure the navbar is loaded
    setTimeout(checkLoginStatus, 500);
    // also update the login UI
    setTimeout(updateLoginUI, 500);
});
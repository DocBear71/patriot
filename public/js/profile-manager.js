// profile-manager.js - Handles user profile functionality
document.addEventListener('DOMContentLoaded', function() {
    console.log("Profile manager loaded!");

    // Initialize form and UI elements
    const profileForm = document.getElementById('profile-form');
    const profileContainer = document.getElementById('profile-container');
    const notLoggedInContainer = document.getElementById('not-logged-in');
    const changePasswordBtn = document.getElementById('change-password-btn');
    const savePasswordBtn = document.getElementById('save-password-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const loginLink = document.getElementById('login-link');

    // Initialize modal elements
    const newPasswordInput = document.getElementById('new-password');
    const confirmNewPasswordInput = document.getElementById('confirm-new-password');
    const passwordLetter = document.getElementById('pwd-letter');
    const passwordCapital = document.getElementById('pwd-capital');
    const passwordNumber = document.getElementById('pwd-number');
    const passwordLength = document.getElementById('pwd-length');
    const passwordSpecial = document.getElementById('pwd-special');
    const passwordMatch = document.getElementById('pwd-match');

    // Check login status
    const isLoggedIn = checkLoginStatus();
    if (isLoggedIn) {
        // user is logged in, lets fetch the complete profile data
        console.log("User is logged in, fetching profile data");
        fetchUserProfileData();
    }

    // Event listeners
    if (profileForm) {
        profileForm.addEventListener('submit', function(event) {
            event.preventDefault();
            updateUserProfile();
        });
    }

    if (changePasswordBtn) {
        changePasswordBtn.addEventListener('click', function() {
            // Reset password validation
            resetPasswordValidation();
            // Show password modal
            $('#passwordModal').modal('show');
        });
    }

    if (savePasswordBtn) {
        savePasswordBtn.addEventListener('click', function() {
            changePassword();
        });
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', function() {
            window.location.href = './index.html';
        });
    }

    if (loginLink) {
        loginLink.addEventListener('click', function(e) {
            e.preventDefault();
            // Scroll to top where navbar is visible
            window.scrollTo(0, 0);
            // Find and click the sign-in button in the navbar
            const signInBtn = document.querySelector('.btn-group.dropdown-menu-right .btn.dropdown-toggle');
            if (signInBtn) {
                signInBtn.click();
            }
        });
    }

    // Password validation
    if (newPasswordInput && confirmNewPasswordInput) {
        newPasswordInput.addEventListener('keyup', function() {
            validateNewPassword();
            checkPasswordsMatch();
        });

        confirmNewPasswordInput.addEventListener('keyup', function() {
            checkPasswordsMatch();
        });
    }

    // Functions
    function checkLoginStatus() {
        const sessionData = localStorage.getItem('patriotThanksSession');

        if (sessionData) {
            try {
                const session = JSON.parse(sessionData);
                const currentTime = new Date().getTime();

                // Check if session is still valid
                if (currentTime < session.timestamp + session.expiresIn) {
                    // Session is valid, load user profile
                    loadUserProfile(session.user);
                    return true;
                } else {
                    // Session expired, show not logged in
                    showNotLoggedIn();
                    // Clear expired session
                    localStorage.removeItem('patriotThanksSession');
                }
            } catch (error) {
                console.error("Error parsing session data:", error);
                showNotLoggedIn();
                localStorage.removeItem('patriotThanksSession');
            }
        } else {
            // No session data, show not logged in
            showNotLoggedIn();
        }

        return false;
    }

    async function fetchUserProfileData() {
        try {
            // Get current user ID from session
            const sessionData = localStorage.getItem('patriotThanksSession');
            if (!sessionData) {
                console.error("No session data found");
                return;
            }

            const session = JSON.parse(sessionData);
            const userId = session.user._id;

            console.log("Fetching profile data for user:", userId);

            const apiURL = `https://patriotthanks.vercel.app/api/users/index?operation=profile&userId=${userId}`;

            // Make API call to get complete profile
            const res = await fetch(apiURL, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!res.ok) {
                throw new Error(`Failed to fetch profile: ${res.status}`);
            }

            const data = await res.json();
            console.log("Received profile data:", data);

            if (data.user) {
                // Populate the form directly with the retrieved data
                populateProfileForm(data.user);
            }
        } catch (error) {
            console.error("Error fetching user profile:", error);
        }
    }

    // Function to populate form with user data
    function populateProfileForm(userData) {
        console.log("Populating form with data:", userData);

        // Set text input values
        const fields = ['fname', 'lname', 'address1', 'address2', 'city', 'zip', 'email'];
        fields.forEach(field => {
            const element = document.getElementById(field);
            if (element) {
                element.value = userData[field] || '';
                console.log(`Set ${field} to:`, element.value);
            } else {
                console.error(`Element with ID '${field}' not found`);
            }
        });

        // Set dropdown values
        const dropdowns = ['state', 'status', 'membership-level'];
        dropdowns.forEach(dropdown => {
            const element = document.getElementById(dropdown);
            if (element) {
                // Map field names from database to form field IDs
                const fieldMap = {
                    'state': 'state',
                    'status': 'status',
                    'membership-level': 'level'
                };

                const dataField = fieldMap[dropdown];
                const value = userData[dataField];

                if (value) {
                    // Try to set the dropdown value
                    element.value = value;
                    console.log(`Tried to set ${dropdown} to:`, value);
                    console.log(`Actual value after setting:`, element.value);

                    // If value wasn't set properly, select default
                    if (element.value !== value) {
                        console.log(`Value ${value} not found in options for ${dropdown}`);
                        element.selectedIndex = 0;
                    }
                }
            } else {
                console.error(`Dropdown with ID '${dropdown}' not found`);
            }
        });
    }


    function showNotLoggedIn() {
        if (profileContainer) profileContainer.style.display = 'none';
        if (notLoggedInContainer) notLoggedInContainer.style.display = 'block';
    }

    function loadUserProfile(userData) {
        console.log("Loading user profile with data: ", userData);
         const fnameElement = document.getElementById('fname');
         if (fnameElement) {
             console.log("Found fname element, setting to: ", userData.fname || '');
             fnameElement.value = userData.fname || '';
         } else {
             console.error("Element with ID fname not found");
         }
        const lnameElement = document.getElementById('lname');
        if (lnameElement) {
            console.log("Found lname element, setting to: ", userData.lname || '');
            lnameElement.value = userData.lname || '';
        } else {
            console.error("Element with ID lname not found");
        }
        const address1Element = document.getElementById('address1');
        if (address1Element) {
            console.log("Found address1 element, setting to: ", userData.address1 || '');
            address1Element.value = userData.address1 || '';
        } else {
            console.error("Element with ID address1 not found");
        }
        const address2Element = document.getElementById('address2');
        if (address2Element) {
            console.log("Found address2 element, setting to: ", userData.address2 || '');
            address2Element.value = userData.address2 || '';
        } else {
            console.error("Element with ID address2 not found");
        }
        const cityElement = document.getElementById('city');
        if (cityElement) {
            console.log("Found city element, setting to: ", userData.city || '');
            cityElement.value = userData.city || '';
        } else {
            console.error("Element with ID city not found");
        }
        const stateElement = document.getElementById('state');
        if (stateElement) {
            console.log("Found state element, setting to: ", userData.state || '');
            stateElement.value = userData.state || '';
        } else {
            console.error("Element with ID state not found");
        }
        const zipElement = document.getElementById('zip');
        if (zipElement) {
            console.log("Found zip element, setting to: ", userData.zip || '');
            zipElement.value = userData.zip || '';
        } else {
            console.error("Element with ID zip not found");
        }
        const statusElement = document.getElementById('status');
        if (statusElement) {
            console.log("Found status element, setting to: ", userData.status || '');
            statusElement.value = userData.status || '';
        } else {
            console.error("Element with ID status not found");
        }
        const levelElement = document.getElementById('membership-level');
        if (levelElement) {
            console.log("Found level element, setting to: ", userData.level || '');
            levelElement.value = userData.level || '';
        } else {
            console.error("Element with ID level not found");
        }
        const emailElement = document.getElementById('email');
        if (emailElement) {
            console.log("Found email element, setting to: ", userData.email || '');
            emailElement.value = userData.email || '';
        } else {
            console.error("Element with ID email not found");
        }


        if (profileContainer) profileContainer.style.display = 'block';
        if (notLoggedInContainer) notLoggedInContainer.style.display = 'none';

        // Populate form with user data
        if (userData) {
            document.getElementById('fname').value = userData.fname || '';
            document.getElementById('lname').value = userData.lname || '';
            document.getElementById('address1').value = userData.address1 || '';
            document.getElementById('address2').value = userData.address2 || '';
            document.getElementById('city').value = userData.city || '';
            document.getElementById('email').value = userData.email || '';
            document.getElementById('zip').value = userData.zip || '';

            // Set select options
            if (userData.state) {
                document.getElementById('state').value = userData.state;
            }

            if (userData.status) {
                const statusSelect = document.getElementById('status');
                statusSelect.value = userData.status;
                if (statusSelect.value !== userData.status) {
                    console.log("Status not found in the options, default to first option");
                    statusSelect.selectedIndex = 0;
                }
            }
            if (userData.level) {
                const membershipSelect = document.getElementById('membership-level');
                membershipSelect.value = userData.level;

                if (membershipSelect.value !== userData.level) {
                    console.log("Membership level not found in the options, default to first option");
                    membershipSelect.selectedIndex = 0;
                }
            }
        }
    }

    async function updateUserProfile() {
        // Get current session
        const sessionData = localStorage.getItem('patriotThanksSession');
        if (!sessionData) {
            alert('You must be logged in to update your profile.');
            return;
        }

        const session = JSON.parse(sessionData);
        const userData = session.user;

        // Get form data
        const updatedUserData = {
            _id: userData._id,
            fname: document.getElementById('fname').value,
            lname: document.getElementById('lname').value,
            address1: document.getElementById('address1').value,
            address2: document.getElementById('address2').value,
            city: document.getElementById('city').value,
            state: document.getElementById('state').value,
            zip: document.getElementById('zip').value,
            status: document.getElementById('status').value,
            email: userData.email // Email cannot be changed
        };

        try {
            // Use the absolute URL to your Vercel deployment
            const apiUrl = 'https://patriotthanks.vercel.app/api/users/index?operation=update';

            const res = await fetch(apiUrl, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json; charset=UTF-8",
                },
                body: JSON.stringify(updatedUserData),
            });

            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(`Profile update failed: ${res.status} ${errorText}`);
            }

            const data = await res.json();
            console.log("Profile update successful:", data);

            // Update session with new user data
            session.user = { ...userData, ...updatedUserData };
            localStorage.setItem('patriotThanksSession', JSON.stringify(session));

            // Update UI with success message
            alert('Your profile has been updated successfully!');

        } catch (error) {
            console.error("Error:", error);
            alert("Profile update failed: " + error.message);
        }
    }

    async function changePassword() {
        // Validate password first
        if (!validatePasswordForSubmission()) {
            return;
        }

        // Get current session
        const sessionData = localStorage.getItem('patriotThanksSession');
        if (!sessionData) {
            alert('You must be logged in to change your password.');
            return;
        }

        const session = JSON.parse(sessionData);
        const userData = session.user;

        // Get password data
        const passwordData = {
            userId: userData._id,
            email: userData.email,
            currentPassword: document.getElementById('current-password').value,
            newPassword: document.getElementById('new-password').value
        };

        try {
            // Use the absolute URL to your Vercel deployment
            const apiUrl = 'https://patriotthanks.vercel.app/api/users/index?operation=password';

            const res = await fetch(apiUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json; charset=utf-8",
                },
                body: JSON.stringify(passwordData),
            });

            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(`Password change failed: ${res.status} ${errorText}`);
            }

            const data = await res.json();
            console.log("Password change successful:", data);

            // Hide modal
            $('#passwordModal').modal('hide');

            // Update UI with success message
            alert('Your password has been changed successfully!');

        } catch (error) {
            console.error("Error:", error);
            alert("Password change failed: " + error.message);
        }
    }

    function validateNewPassword() {
        const password = newPasswordInput.value;

        // Validate lowercase letters
        const lowerCaseLetters = /[a-z]/g;
        if(password.match(lowerCaseLetters)) {
            passwordLetter.classList.remove("invalid");
            passwordLetter.classList.add("valid");
        } else {
            passwordLetter.classList.remove("valid");
            passwordLetter.classList.add("invalid");
        }

        // Validate capital letters
        const upperCaseLetters = /[A-Z]/g;
        if(password.match(upperCaseLetters)) {
            passwordCapital.classList.remove("invalid");
            passwordCapital.classList.add("valid");
        } else {
            passwordCapital.classList.remove("valid");
            passwordCapital.classList.add("invalid");
        }

        // Validate numbers
        const numbers = /[0-9]/g;
        if(password.match(numbers)) {
            passwordNumber.classList.remove("invalid");
            passwordNumber.classList.add("valid");
        } else {
            passwordNumber.classList.remove("valid");
            passwordNumber.classList.add("invalid");
        }

        // Validate length
        if(password.length >= 8) {
            passwordLength.classList.remove("invalid");
            passwordLength.classList.add("valid");
        } else {
            passwordLength.classList.remove("valid");
            passwordLength.classList.add("invalid");
        }

        // Validate special characters
        const specialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/;
        if(specialChars.test(password)) {
            passwordSpecial.classList.remove("invalid");
            passwordSpecial.classList.add("valid");
        } else {
            passwordSpecial.classList.remove("valid");
            passwordSpecial.classList.add("invalid");
        }
    }

    function checkPasswordsMatch() {
        const password = newPasswordInput.value;
        const confirmPassword = confirmNewPasswordInput.value;

        if(password === confirmPassword && password !== "") {
            passwordMatch.classList.remove("invalid");
            passwordMatch.classList.add("valid");
        } else {
            passwordMatch.classList.remove("valid");
            passwordMatch.classList.add("invalid");
        }
    }

    function validatePasswordForSubmission() {
        // Check if all password criteria are met
        const isLowerValid = passwordLetter.classList.contains("valid");
        const isUpperValid = passwordCapital.classList.contains("valid");
        const isNumberValid = passwordNumber.classList.contains("valid");
        const isLengthValid = passwordLength.classList.contains("valid");
        const isSpecialValid = passwordSpecial.classList.contains("valid");
        const isMatchValid = passwordMatch.classList.contains("valid");

        if (!isLowerValid || !isUpperValid || !isNumberValid || !isLengthValid || !isSpecialValid || !isMatchValid) {
            alert("Please ensure your password meets all the requirements.");
            return false;
        }

        return true;
    }

    function resetPasswordValidation() {
        // Clear password inputs
        document.getElementById('current-password').value = '';
        newPasswordInput.value = '';
        confirmNewPasswordInput.value = '';

        // Reset validation classes
        passwordLetter.classList.remove("valid");
        passwordLetter.classList.add("invalid");
        passwordCapital.classList.remove("valid");
        passwordCapital.classList.add("invalid");
        passwordNumber.classList.remove("valid");
        passwordNumber.classList.add("invalid");
        passwordLength.classList.remove("valid");
        passwordLength.classList.add("invalid");
        passwordSpecial.classList.remove("valid");
        passwordSpecial.classList.add("invalid");
        passwordMatch.classList.remove("valid");
        passwordMatch.classList.add("invalid");
    }
});
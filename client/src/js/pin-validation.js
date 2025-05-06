// pin-validation.js - Admin verification with MongoDB integration

// Store the last selected option to revert back if pin verification fails
let lastValidSelection = "";
let isAdminVerified = false;

// Export the verification status for form-validator.js to use
window.isAdminVerified = function() {
    console.log("IsAdminVerified function called, returning: ", isAdminVerified);
    return isAdminVerified;
};

// Initialize the global adminVerified flag that form-validator.js is checking
window.adminVerified = false;

document.addEventListener('DOMContentLoaded', function() {
    console.log("Pin validation loaded!");

    // Get membership level select element
    const membershipSelect = document.getElementById('membership-level');

    // Add change event listener to check for restricted options
    membershipSelect.addEventListener('change', function() {
        checkRestrictedOption(this);
    });

    // Add event listener for the verify button
    document.getElementById('verifyPinBtn').addEventListener('click', function() {
        const pinInput = document.getElementById('adminPinCode').value;
        const pinError = document.getElementById('pinError');
        const membershipSelect = document.getElementById('membership-level');

        // validate input
        if (!pinInput || pinInput.trim() === '') {
            pinError.style.display = 'block';
            pinError.textContent = 'Please enter an admin access code';
            return; // Exit the function early
        }

        console.log("Verifying pin:", pinInput);

        // get user ID from session if available
        const userId = getUserIdFromSession();

        // Determine the base URL
        const baseURL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
            ? `http://${window.location.host}`
            :  window.location.origin;

        // Prepare verification data
        const verificationData = {
            code: pinInput,
            userId: userId // include, if available
        };

        // show loading state
        const verifyBtn = document.getElementById('verifyPinBtn');
        const originalBtnText = verifyBtn.textContent;
        verifyBtn.textContent = 'Verifying...';
        verifyBtn.disabled = true;

        // Call the admin verification API
        fetch(`${baseURL}/api/auth.js?operation=verify-admin`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=UTF-8'
            },
            body: JSON.stringify(verificationData)
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Verification failed');
                }
                return response.json();
            })
            .then(data => {
                if (data.access) {
                    // PIN correct - update select to Admin
                    membershipSelect.value = "Admin";
                    lastValidSelection = "Admin"; // Update last valid selection
                    isAdminVerified = true;

                    // Set global flag for other scripts - this is what form-validator.js checks
                    window.adminVerified = true;

                    // Hide modal
                    $('#adminAccessModal').modal('hide');

                    console.log("Admin access verified successfully!");
                    alert(data.message || "Admin access verified successfully!");

                    // update user status if verification included user update
                    updateUserStatusIfNeeded(userId);
                } else {
                    // Show error message
                    pinError.style.display = 'block';
                    pinError.textContent = data.message || 'Invalid admin access code';
                    console.log("Invalid admin code entered");
                }
            })
            .catch(error => {
                console.error("Admin verification error:", error);
                pinError.style.display = 'block';
                pinError.textContent = 'Error verifying admin code: ' + error.message;
            })
            .finally(() => {
                // reset the state of the button
                verifyBtn.textContent = originalBtnText;
                verifyBtn.disabled = false;
            });
    });

    // check if selected option is restricted
    function checkRestrictedOption(selectElement) {
        const selectedOption = selectElement.options[selectElement.selectedIndex];

        // if any restricted option, such as Admin
        if (selectedOption.dataset.restricted === 'true') { // Changed from === true to === 'true'
            console.log('Restricted option selected: ', selectedOption.value);

            // show the PIN modal
            $('#adminAccessModal').modal('show');

            // reset pin input and error message
            document.getElementById('adminPinCode').value = '';
            document.getElementById('pinError').style.display = 'none';

            // remember the last valid selection to revert back if needed
            if (lastValidSelection === "") {
                // default to the first option if no previous selection
                lastValidSelection = selectElement.options[0].value;
            }

            // temporarily revert back to previous selection until pin is verified
            selectElement.value = lastValidSelection;
        } else {
            // update the last valid selection
            lastValidSelection = selectElement.value;

            // reset admin verification status if not admin option
            if (selectedOption.value !== "Admin") {
                isAdminVerified = false;
                window.adminVerified = false; // Make sure to update both variables
            }
        }
    }

    // Helper function to get user ID from session
    function getUserIdFromSession() {
        try {
            const sessionData = localStorage.getItem('patriotThanksSession');
            if (sessionData) {
                const session = JSON.parse(sessionData);
                return session.user._id;
            }
        } catch (error) {
            console.error("Error getting user ID from session:", error);
        }
        return null;
    }

    // Function to update UI if user status changed
    function updateUserStatusIfNeeded(userId) {
        if (!userId) return;

        try {
            // Get current session data
            const sessionData = localStorage.getItem('patriotThanksSession');
            if (sessionData) {
                const session = JSON.parse(sessionData);

                // Update session with admin status
                session.user.status = 'AD';
                session.user.isAdmin = true;

                // Save updated session
                localStorage.setItem('patriotThanksSession', JSON.stringify(session));

                console.log("User session updated with admin status");
            }
        } catch (error) {
            console.error("Error updating user session:", error);
        }
    }
});
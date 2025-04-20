// Store the last selected option to revert back if pin verification fails
let lastValidSelection = "";
let isAdminVerified = false;

document.addEventListener('DOMContentLoaded', function() {
    console.log("Pin validation loaded!");

    // Get membership level select element
    const membershipSelect = document.getElementById('membership-level');

    // Add change event listener to check for restricted options
    membershipSelect.addEventListener('change', function() {
        checkRestrictedOption(this);
    });

    // Add event listener for the verify button - SIMPLE VERSION WITH HARDCODED PIN
    document.getElementById('verifyPinBtn').addEventListener('click', function() {
        const pinInput = document.getElementById('adminPinCode').value;
        const pinError = document.getElementById('pinError');
        const membershipSelect = document.getElementById('membership-level');

        console.log("Verifying pin:", pinInput);

        // Simple hardcoded PIN check
        const ADMIN_PIN = "4204";

        if (pinInput === ADMIN_PIN) {
            // PIN correct - update select to Admin
            membershipSelect.value = "Admin";
            lastValidSelection = "Admin"; // Update last valid selection
            isAdminVerified = true;

            // Hide modal
            $('#adminAccessModal').modal('hide');

            console.log("Admin access verified successfully!");
            alert("Admin access verified successfully!");
        } else {
            // Show error message
            pinError.style.display = 'block';
            pinError.textContent = 'Invalid admin access code';
            console.log("Invalid admin code entered");
        }
    });

    // Check if selected option is restricted
    function checkRestrictedOption(selectElement) {
        const selectedOption = selectElement.options[selectElement.selectedIndex];

        // If this is the admin option (or any restricted option)
        if (selectedOption.dataset.restricted === "true") {
            console.log("Restricted option selected:", selectedOption.value);

            // Show the PIN modal
            $('#adminAccessModal').modal('show');

            // Reset pin input and error message
            document.getElementById('adminPinCode').value = '';
            document.getElementById('pinError').style.display = 'none';

            // Remember the last valid selection to revert back if needed
            if (lastValidSelection === "") {
                // Default to first option if no previous selection
                lastValidSelection = selectElement.options[0].value;
            }

            // Temporarily revert back to previous selection until pin is verified
            selectElement.value = lastValidSelection;
        } else {
            // Update the last valid selection
            lastValidSelection = selectElement.value;

            // Reset admin verification status if not admin option
            if (selectedOption.value !== "Admin") {
                isAdminVerified = false;
            }
        }
    }

    // Export the verification status for form-validator.js to use
    window.isAdminVerified = function() {
        return isAdminVerified;
    };
});
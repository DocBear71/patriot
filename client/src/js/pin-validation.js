// Store the last selected option to revert back if pin verification fails
let lastValidSelection = "";
let isAdminVerified = false;

document.addEventListener("DOMContentLoaded", function() {
    console.log("Pin Validation Loaded!");

    // get the membership level selected element
    const membershipSelect = document.getElementById("membership-level");

    // and change event listener to check for restricted options
    membershipSelect.addEventListener("change", function () {
        checkRestrictedOption(this);
    });

    // check if selected option is restricted
    function checkRestrictedOption(selectElement) {
        const selectedOption = selectElement.options[selectElement.selectedIndex];

        // If this is the admin option (or any restricted option)
        if (selectedOption.dataset.restricted === "true") {
            console.log("Restricted option selected: ", selectedOption.value);

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

            // reset admin verification status if not admin option
            if (selectedOption.value !== "Admin") {
                isAdminVerified = false;
            }
        }
    }

    // Add event listener for the verify button
    document.getElementById('verifyPinBtn').addEventListener('click', async function () {
        const pinInput = document.getElementById('adminPinCode').value;
        const pinError = document.getElementById('pinError');
        const membershipSelect = document.getElementById('membership-level');

        try {
            // call the api to verify the admin code
            const res = await fetch('/api/verify-admin-code', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json; charset=UTF-8',
                },
                body: JSON.stringify({code: pinInput}),
            });

            const data = res.json();

            if (res.ok && data.access) {
                // PIN correct - upgrade to Admin
                membershipSelect.value = "Admin";
                lastValidSelection = "Admin";
                isAdminVerified = true;

                // hide the modal
                $('#adminAccessModal').modal('hide');

                // show a success message
                alert("Admin access verified successfully.");
            } else {
                // show an error message
                pinError.style.display = 'block';
                pinError.textContent = data.message || 'Invalid admin access code';
            }
        } catch (error) {
            console.error("Error verifying admin access code", error);
            ;
            pinError.style.display = 'block';
            pinError.textContent = 'Error verifying code: ' + error.message;
        }
    });

    // export the verification status for the form-validator.js to use
    window.isAdminVerified = function () {
        return isAdminVerified;
    };
});

// Store the last selected option to revert back if pin verification fails
let lastValidSelection = "";

// Check if selected option is restricted
function checkRestrictedOption(selectElement) {
    const selectedOption = selectElement.options[selectElement.selectedIndex];

    // If this is the admin option (or any restricted option)
    if (selectedOption.dataset.restricted === "true") {
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
    }
}

// Add event listener for the verify button
document.getElementById('verifyPinBtn').addEventListener('click', function() {
    const pinInput = document.getElementById('adminPinCode').value;
    const pinError = document.getElementById('pinError');
    const statusSelect = document.getElementById('status');

    // Actual admin PIN code
    const ADMIN_PIN = "4204";

    if (pinInput === ADMIN_PIN) {
        // PIN correct - update select to Admin
        statusSelect.value = "AD"; // The admin option value
        lastValidSelection = "AD"; // Update last valid selection

        // Hide modal
        $('#adminAccessModal').modal('hide');
    } else {
        // Show error message
        pinError.style.display = 'block';
    }
});
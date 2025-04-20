// Add this to your form-validator.js or create a new admin-access.js file
document.addEventListener('DOMContentLoaded', function() {
    // Get the status dropdown
    const statusDropdown = document.getElementById('status');

    if (statusDropdown) {
        // Add event listener for status change
        statusDropdown.addEventListener('change', function() {
            // Check if selected option is "Admin"
            if (this.value === 'AD') {
                // Show admin access modal
                $('#adminAccessModal').modal('show');

                // Reset the selection to previous value until verified
                this.value = this.dataset.lastValue || '';
            } else {
                // Store the last selected non-admin value
                this.dataset.lastValue = this.value;
            }
        });
    }

    // Get the verify button
    const verifyButton = document.getElementById('verifyPinBtn');

    if (verifyButton) {
        verifyButton.addEventListener('click', async function() {
            // Get the access code
            const accessCode = document.getElementById('adminPinCode').value;
            const errorElement = document.getElementById('pinError');

            // Reset error message
            errorElement.style.display = 'none';

            try {
                // Get user ID from session if available
                let userId = null;
                const sessionData = localStorage.getItem('patriotThanksSession');
                if (sessionData) {
                    const session = JSON.parse(sessionData);
                    userId = session.user._id;
                }

                // Verify the code with the server
                const response = await fetch('https://patriotthanks.vercel.app/api/auth?operation=verify-admin', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        code: accessCode,
                        userId: userId
                    })
                });

                const data = await response.json();

                if (response.ok && data.access) {
                    // Access granted - update dropdown
                    statusDropdown.value = 'AD';
                    statusDropdown.dataset.lastValue = 'AD';

                    // Close modal
                    $('#adminAccessModal').modal('hide');

                    // Show success message
                    alert('Admin access granted: ' + data.description);

                    // Update user session if user is logged in
                    if (sessionData) {
                        const session = JSON.parse(sessionData);
                        session.user.status = 'AD';
                        session.user.isAdmin = true;
                        localStorage.setItem('patriotThanksSession', JSON.stringify(session));
                    }
                } else {
                    // Show error message
                    errorElement.textContent = data.message || 'Invalid access code. Please try again.';
                    errorElement.style.display = 'block';
                }

            } catch (error) {
                console.error('Admin verification error:', error);
                errorElement.textContent = 'Verification failed. Please try again.';
                errorElement.style.display = 'block';
            }
        });
    }
});
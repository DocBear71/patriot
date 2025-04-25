// password-reset.js - Handles forgot password and reset password functionality
document.addEventListener('DOMContentLoaded', function() {
    console.log("Password reset script loaded");

    // Determine the base URL (works for both local development and production)
    const baseURL = window.location.hostname === "localhost" || window.location.hostname === '127.0.0.1'
        ? `http://${window.location.host}`
        : `https://patriotthanks.vercel.app`;

    // Handle forgot password form submission
    const forgotPasswordForm = document.getElementById('forgot-password-form');
    if (forgotPasswordForm) {
        console.log("Forgot password form detected");

        forgotPasswordForm.addEventListener('submit', function(event) {
            event.preventDefault();

            const email = document.getElementById('email').value;
            const successAlert = document.getElementById('success-alert');
            const errorAlert = document.getElementById('error-alert');

            // Hide any existing alerts
            successAlert.style.display = 'none';
            errorAlert.style.display = 'none';

            // Disable form while processing
            const submitButton = forgotPasswordForm.querySelector('input[type="submit"]');
            submitButton.disabled = true;
            submitButton.value = 'Sending...';

            // Call the API to send reset link
            fetch(`${baseURL}/api/auth.js?operation=forgot-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email })
            })
                .then(response => {
                    if (!response.ok && response.status !== 200) {
                        throw new Error('Server error');
                    }
                    return response.json();
                })
                .then(data => {
                    // Always show success message for security (even if email wasn't found)
                    successAlert.style.display = 'block';
                    forgotPasswordForm.reset();

                    // Log reset link in development (for testing)
                    if (data.resetLink) {
                        console.log("Reset link:", data.resetLink);
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    errorAlert.textContent = 'There was a problem sending the reset link. Please try again.';
                    errorAlert.style.display = 'block';
                })
                .finally(() => {
                    // Re-enable form
                    submitButton.disabled = false;
                    submitButton.value = 'Send Reset Link';
                });
        });
    }

    // Handle reset password page
    const resetPasswordForm = document.getElementById('reset-password-form');
    if (resetPasswordForm) {
        console.log("Reset password form detected");

        // Extract token from URL
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');

        if (!token) {
            // Show error if token is missing
            document.getElementById('token-missing-alert').style.display = 'block';
            resetPasswordForm.style.display = 'none';
        } else {
            // Store token in hidden field
            document.getElementById('reset-token').value = token;
        }

        // Add login redirect event
        const loginLink = document.getElementById('login-link');
        if (loginLink) {
            loginLink.addEventListener('click', function(event) {
                event.preventDefault();
                // Open login dropdown on redirect
                window.location.href = 'index.html?login=true';
            });
        }

        // Handle form submission
        resetPasswordForm.addEventListener('submit', function(event) {
            event.preventDefault();

            const token = document.getElementById('reset-token').value;
            const password = document.getElementById('psw').value;
            const confirmPassword = document.getElementById('psw_repeat').value;

            const successAlert = document.getElementById('success-alert');
            const errorAlert = document.getElementById('error-alert');

            // Hide any existing alerts
            successAlert.style.display = 'none';
            errorAlert.style.display = 'none';

            // Validate password
            if (password !== confirmPassword) {
                errorAlert.textContent = 'Passwords do not match.';
                errorAlert.style.display = 'block';
                return;
            }

            // Verify all validation criteria are met
            if (window.validatePassword) {
                const validationResult = window.validatePassword(password);
                if (!validationResult.isValid) {
                    errorAlert.textContent = 'Password does not meet all requirements.';
                    errorAlert.style.display = 'block';
                    return;
                }
            }

            // Disable form while processing
            const submitButton = document.getElementById('submit');
            submitButton.disabled = true;
            submitButton.value = 'Resetting...';

            // Call the API to reset password
            fetch(`${baseURL}/api/auth.js?operation=reset-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ token, password })
            })
                .then(response => {
                    if (!response.ok) {
                        return response.json().then(data => {
                            throw new Error(data.message || 'Failed to reset password');
                        });
                    }
                    return response.json();
                })
                .then(data => {
                    successAlert.style.display = 'block';
                    resetPasswordForm.style.display = 'none';
                })
                .catch(error => {
                    console.error('Error:', error);
                    errorAlert.textContent = error.message || 'There was a problem resetting your password. The link may be invalid or expired.';
                    errorAlert.style.display = 'block';
                })
                .finally(() => {
                    // Re-enable form
                    submitButton.disabled = false;
                    submitButton.value = 'Reset Password';
                });
        });
    }
});
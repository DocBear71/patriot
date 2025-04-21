// Add this to your index.js or main.js
document.addEventListener('DOMContentLoaded', function() {
    // Check URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const loginRequired = urlParams.get('login');

    if (loginRequired === 'required') {
        // Find the login dropdown toggle button
        const loginDropdown = document.querySelector('.dropdown-toggle');
        if (loginDropdown) {
            // Trigger a click to open the dropdown
            setTimeout(() => {
                loginDropdown.click();

                // Optionally show a message
                const loginForm = document.querySelector('.dropdown-menu');
                if (loginForm) {
                    const message = document.createElement('div');
                    message.className = 'alert alert-warning';
                    message.style.margin = '10px';
                    message.innerHTML = 'Please log in to access the requested page.';
                    loginForm.insertBefore(message, loginForm.firstChild);
                }
            }, 500); // Small delay to ensure the page is fully loaded
        }
    }
});
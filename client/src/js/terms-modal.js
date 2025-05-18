// terms-modal.js (Using ModalManager)

document.addEventListener('DOMContentLoaded', function() {
    console.log("Terms modal control loaded");

    // Override the checkTermsVersion function
    window.checkTermsVersion = function(session) {
        if (!session || !session.user) return;

        // Current version of terms
        const currentTermsVersion = "May 14, 2025";

        // Check if user has accepted current terms
        if (!session.user.termsAccepted || session.user.termsVersion !== currentTermsVersion) {
            console.log("User needs to accept terms");

            // Show the modal using our manager
            ModalManager.show('termsUpdateModal', {
                backdrop: 'static',
                keyboard: false,
                emergencyReset: true,
                resetDelay: 8000
            });
        }
    };

    // Use for direct terms acceptance update
    window.updateTermsAcceptance = function(session) {
        // Update locally first
        session.user.termsAccepted = true;
        session.user.termsAcceptedDate = new Date().toISOString();
        session.user.termsVersion = "May 14, 2025";
        localStorage.setItem('patriotThanksSession', JSON.stringify(session));

        // Then update server
        const baseURL = window.location.hostname === "localhost" || window.location.hostname === '127.0.0.1'
            ? `http://${window.location.host}`
            : window.location.origin;

        fetch(`${baseURL}/api/auth.js?operation=update-terms-acceptance`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + session.token
            },
            body: JSON.stringify({
                userId: session.user._id,
                termsAccepted: true,
                termsAcceptedDate: new Date().toISOString(),
                termsVersion: "May 14, 2025"
            })
        })
            .then(response => response.json())
            .then(data => {
                console.log("Terms acceptance updated on server");
            })
            .catch(error => {
                console.error("Error updating terms on server:", error);
            });

        // Hide modal
        ModalManager.hide('termsUpdateModal');
    };

    // Set up button handlers
    const setupButtonHandlers = function() {
        // Confirm button
        const confirmBtn = document.getElementById('confirmUpdatedTerms');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', function() {
                const sessionData = localStorage.getItem('patriotThanksSession');
                if (sessionData) {
                    const session = JSON.parse(sessionData);
                    updateTermsAcceptance(session);
                }
            });
        }

        // Checkbox handler
        const termsElement = document.getElementById('termsSummary');
        if (termsElement) {
            termsElement.addEventListener('scroll', function() {
                if (this.scrollHeight - this.scrollTop <= this.clientHeight + 50) {
                    const checkbox = document.getElementById('acceptUpdatedTerms');
                    if (checkbox) checkbox.disabled = false;

                    const scrollMsg = document.getElementById('scrollMessage');
                    if (scrollMsg) {
                        scrollMsg.style.display = 'block';
                        scrollMsg.innerHTML = '<i class="bi bi-check-circle"></i> You\'ve reviewed the terms. Please check the box below to confirm your acceptance.';
                        scrollMsg.style.color = 'green';
                    }
                }
            });
        }

        // Checkbox enables/disables confirm button
        const termsCheckbox = document.getElementById('acceptUpdatedTerms');
        if (termsCheckbox) {
            termsCheckbox.addEventListener('change', function() {
                const confirmBtn = document.getElementById('confirmUpdatedTerms');
                if (confirmBtn) confirmBtn.disabled = !this.checked;
            });
        }

        // Reject button
        const rejectBtn = document.getElementById('rejectUpdatedTerms');
        if (rejectBtn) {
            rejectBtn.addEventListener('click', function() {
                if (confirm("If you do not accept the updated terms, you will be logged out and unable to use the service. Continue?")) {
                    localStorage.removeItem('patriotThanksSession');
                    localStorage.removeItem('isLoggedIn');
                    location.reload();
                }
            });
        }
    };

    // Run button handler setup after a slight delay
    // This ensures the DOM is fully loaded
    setTimeout(setupButtonHandlers, 500);
});
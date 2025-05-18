// Simple Terms Modal Control - terms-modal.js
$(function() {
    console.log("Terms modal control loaded");

    // Override the checkTermsVersion function with a cleaner implementation
    window.checkTermsVersion = function(session) {
        if (!session || !session.user) return;

        // Current version of terms
        const currentTermsVersion = "May 14, 2025";

        // Check if user has accepted current terms
        if (!session.user.termsAccepted || session.user.termsVersion !== currentTermsVersion) {
            console.log("User needs to accept terms");

            // Show the modal using Bootstrap 5
            try {
                if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
                    const modalEl = document.getElementById('termsUpdateModal');
                    const modal = new bootstrap.Modal(modalEl);
                    modal.show();
                }
            } catch (error) {
                console.error("Error showing modal:", error);
            }
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

        // Hide modal if it's visible
        try {
            const modalEl = document.getElementById('termsUpdateModal');
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();
        } catch (error) {
            // Manual cleanup
            $('.modal-backdrop').remove();
            $('body').removeClass('modal-open');
            $('body').css('padding-right', '');
        }
    };

    // Set up button handlers
    $(document).ready(function() {
        // Confirm button
        $('#confirmUpdatedTerms').on('click', function() {
            const sessionData = localStorage.getItem('patriotThanksSession');
            if (sessionData) {
                const session = JSON.parse(sessionData);
                updateTermsAcceptance(session);
            }
        });

        // Checkbox handler
        $('#termsSummary').on('scroll', function() {
            const elem = $(this)[0];
            if (elem.scrollHeight - elem.scrollTop <= elem.clientHeight + 50) {
                $('#acceptUpdatedTerms').prop('disabled', false);
                $('#scrollMessage').css('display', 'block').html('<i class="bi bi-check-circle"></i> You\'ve reviewed the terms. Please check the box below to confirm your acceptance.').css('color', 'green');
            }
        });

        // Checkbox enables/disables confirm button
        $('#acceptUpdatedTerms').on('change', function() {
            $('#confirmUpdatedTerms').prop('disabled', !this.checked);
        });

        // Reject button
        $('#rejectUpdatedTerms').on('click', function() {
            if (confirm("If you do not accept the updated terms, you will be logged out and unable to use the service. Continue?")) {
                localStorage.removeItem('patriotThanksSession');
                localStorage.removeItem('isLoggedIn');
                location.reload();
            }
        });
    });
});
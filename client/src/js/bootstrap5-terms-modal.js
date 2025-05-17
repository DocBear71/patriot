// Wait for document ready
$(function() {
    console.log("Simplified Bootstrap 5 Terms Modal initialized");

    // Override the checkTermsVersion function with a simpler implementation
    window.originalCheckTermsVersion = window.checkTermsVersion;
    window.checkTermsVersion = function(session) {
        console.log("Simple terms version check called");
        if (!session || !session.user) return;

        // Current version of terms
        const currentTermsVersion = "May 14, 2025";

        // Check if user has accepted current terms
        if (!session.user.termsAccepted || session.user.termsVersion !== currentTermsVersion) {
            console.log("User needs to accept new terms - using simplified implementation");

            // Clean up any existing modal state
            $('.modal-backdrop').remove();
            $('body').removeClass('modal-open');
            $('body').css('padding-right', '');

            // Setup scroll tracking and button handlers
            setupSimpleScrollTracking();
            setupSimpleModalButtons();

            // Show the modal using Bootstrap 5 if available
            try {
                if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
                    const modalEl = document.getElementById('termsUpdateModal');
                    const modal = new bootstrap.Modal(modalEl, {
                        backdrop: 'static',
                        keyboard: false
                    });
                    modal.show();
                    console.log("Modal shown using Bootstrap 5 Modal constructor");
                } else {
                    // Fallback to jQuery or direct DOM manipulation
                    $('#termsUpdateModal').addClass('show');
                    $('#termsUpdateModal').css('display', 'block');
                    $('body').addClass('modal-open');
                    $('body').append('<div class="modal-backdrop show"></div>');
                    console.log("Modal shown using fallback method");
                }
            } catch (error) {
                console.error("Error showing modal:", error);
                // Show emergency button right away
                showEmergencyButton();
            }

            // Show emergency button after a delay in case modal gets stuck
            setTimeout(function() {
                const modalVisible = $('#termsUpdateModal').is(':visible');
                const modalInteractive = $('#termsUpdateModal').find('.modal-content').is(':visible');

                if (modalVisible && !modalInteractive) {
                    console.log("Modal may be stuck - showing emergency reset button");
                    showEmergencyButton();
                }
            }, 5000); // Check after 5 seconds
        }
    };

    // Set up simplified scroll tracking
    function setupSimpleScrollTracking() {
        console.log("Setting up simplified scroll tracking");

        const termsSummary = document.getElementById('termsSummary');
        const termsCheckbox = document.getElementById('acceptUpdatedTerms');
        const scrollMessage = document.getElementById('scrollMessage');

        if (!termsSummary || !termsCheckbox) {
            console.error("Required elements not found for scroll tracking");
            return;
        }

        // Initial state variables
        let hasScrolledToBottom = false;
        let startTime = Date.now();
        const MINIMUM_READ_TIME = 5000; // 5 seconds minimum reading time

        // Remove any existing event listeners
        $(termsSummary).off('scroll');

        // Add scroll event listener
        $(termsSummary).on('scroll', function() {
            // Calculate scroll position
            const scrollPosition = termsSummary.scrollTop + termsSummary.clientHeight;
            const scrollHeight = termsSummary.scrollHeight;
            const timeSpent = Date.now() - startTime;

            // Calculate scroll percentage
            const scrollPercentage = (scrollPosition / scrollHeight) * 100;
            console.log(`Scroll position: ${scrollPosition}/${scrollHeight} (${scrollPercentage.toFixed(2)}%)`);

            // User must scroll at least 80% through the content
            if (scrollPercentage >= 80 && timeSpent >= MINIMUM_READ_TIME) {
                console.log("User has scrolled to near bottom of terms");
                hasScrolledToBottom = true;

                // Enable the checkbox
                termsCheckbox.disabled = false;

                // Show confirmation message
                if (scrollMessage) {
                    scrollMessage.style.display = 'block';
                    scrollMessage.innerHTML = '<i class="bi bi-check-circle"></i> Thank you for reviewing the terms. Please check the box below to confirm your acceptance.';
                    scrollMessage.style.color = 'green';
                }
            }
        });

        // Add checkbox change event handler
        $(termsCheckbox).off('change');
        $(termsCheckbox).on('change', function() {
            // Only allow checking if scrolled to bottom
            if (!hasScrolledToBottom && this.checked) {
                alert('Please read the terms summary by scrolling to the bottom before accepting.');
                this.checked = false;
                return;
            }

            // Enable/disable the confirm button based on checkbox
            const confirmButton = document.getElementById('confirmUpdatedTerms');
            if (confirmButton) {
                confirmButton.disabled = !this.checked;
            }
        });

        // Force a scroll event after a delay
        setTimeout(function() {
            // Force scrolling to enable the checkbox if necessary
            if (termsSummary.scrollHeight <= termsSummary.clientHeight) {
                console.log("Content fits without scrolling - enabling checkbox directly");
                termsCheckbox.disabled = false;
                hasScrolledToBottom = true;

                if (scrollMessage) {
                    scrollMessage.style.display = 'block';
                    scrollMessage.innerHTML = '<i class="bi bi-check-circle"></i> Thank you for reviewing the terms. Please check the box below to confirm your acceptance.';
                    scrollMessage.style.color = 'green';
                }
            } else {
                // Trigger a scroll event
                termsSummary.scrollTop = 1;
                $(termsSummary).trigger('scroll');
            }
        }, 500);
    }

    // Set up simple modal button handlers
    function setupSimpleModalButtons() {
        console.log("Setting up simplified modal buttons");

        const confirmButton = document.getElementById('confirmUpdatedTerms');
        const rejectButton = document.getElementById('rejectUpdatedTerms');

        if (!confirmButton || !rejectButton) {
            console.error("Button elements not found");
            return;
        }

        // Remove any existing event listeners
        $(confirmButton).off('click');
        $(rejectButton).off('click');

        // Add confirm button handler
        $(confirmButton).on('click', function(e) {
            e.preventDefault();
            console.log("Confirm button clicked");

            // Get session data
            const sessionData = localStorage.getItem('patriotThanksSession');
            if (!sessionData) {
                console.error("No session found");
                hideSimpleModal();
                return;
            }

            try {
                const session = JSON.parse(sessionData);

                // Update session data locally first
                session.user.termsAccepted = true;
                session.user.termsAcceptedDate = new Date().toISOString();
                session.user.termsVersion = "May 14, 2025";
                localStorage.setItem('patriotThanksSession', JSON.stringify(session));

                // Hide the modal first
                hideSimpleModal();

                // Then update on the server if updateTermsAcceptance exists
                if (typeof updateTermsAcceptance === 'function') {
                    updateTermsAcceptance(session);
                } else {
                    console.log("updateTermsAcceptance function not available - only updated locally");
                }
            } catch (error) {
                console.error("Error parsing session data:", error);
                hideSimpleModal();
            }
        });

        // Add reject button handler
        $(rejectButton).on('click', function(e) {
            e.preventDefault();
            console.log("Reject button clicked");

            // Warn user about consequences
            if (confirm("If you do not accept the updated terms, you will be logged out and unable to use the service. Continue?")) {
                // Log out the user
                if (typeof logoutUser === 'function') {
                    logoutUser();
                } else {
                    console.error("Logout function not available");
                    // Fallback - just remove session data
                    localStorage.removeItem('patriotThanksSession');
                    localStorage.removeItem('isLoggedIn');
                }

                // Hide the modal
                hideSimpleModal();
            }
        });

        // Add close button handler
        $('.modal .btn-close').off('click').on('click', function(e) {
            e.preventDefault();
            console.log("Close button clicked");
            hideSimpleModal();
        });

        // Add keyboard event listener
        $(document).off('keydown.terms').on('keydown.terms', function(e) {
            if (e.key === 'Escape') {
                console.log("Escape key pressed");
                hideSimpleModal();
            }
        });
    }

    // Simple function to hide the modal
    function hideSimpleModal() {
        console.log("Hiding modal with simplified method");

        try {
            // Try Bootstrap 5 way first
            if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
                const modalEl = document.getElementById('termsUpdateModal');
                const modal = bootstrap.Modal.getInstance(modalEl);
                if (modal) {
                    modal.hide();
                    return; // Exit if successful
                }
            }
        } catch (error) {
            console.error("Error using Bootstrap 5 to hide modal:", error);
        }

        // Fallback to direct DOM manipulation
        const modalEl = document.getElementById('termsUpdateModal');
        $(modalEl).removeClass('show');
        $(modalEl).css('display', 'none');
        $('body').removeClass('modal-open');
        $('.modal-backdrop').remove();
        $('body').css('padding-right', '');
        $('body').css('overflow', '');
    }

    // Simple function to show emergency button
    window.showEmergencyButton = function() {
        console.log("Showing emergency button");

        // Check if button exists
        let emergencyBtn = document.getElementById('emergencyResetBtn');

        // Create button if it doesn't exist
        if (!emergencyBtn) {
            emergencyBtn = document.createElement('button');
            emergencyBtn.id = 'emergencyResetBtn';
            emergencyBtn.innerHTML = 'Emergency Reset';

            // Style the button
            emergencyBtn.style.position = 'fixed';
            emergencyBtn.style.bottom = '10px';
            emergencyBtn.style.right = '10px';
            emergencyBtn.style.zIndex = '9999';
            emergencyBtn.style.backgroundColor = '#dc3545';
            emergencyBtn.style.color = 'white';
            emergencyBtn.style.border = 'none';
            emergencyBtn.style.padding = '8px 15px';
            emergencyBtn.style.borderRadius = '4px';
            emergencyBtn.style.fontWeight = 'bold';
            emergencyBtn.style.cursor = 'pointer';
            emergencyBtn.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';

            // Add event listener
            emergencyBtn.addEventListener('click', function() {
                console.log("Emergency reset button clicked");

                // Try calling the standard emergencyModalReset function
                if (typeof emergencyModalReset === 'function') {
                    emergencyModalReset();
                } else {
                    // Use our simple hide modal
                    hideSimpleModal();
                }

                // Hide the button
                this.style.display = 'none';
            });

            // Add to body
            document.body.appendChild(emergencyBtn);
        }

        // Show the button
        emergencyBtn.style.display = 'block';
    };

    // Make our simple emergency modal reset function available globally
    window.emergencyModalReset = function() {
        console.log("Emergency modal reset called");

        // Hide the modal using our simple function
        hideSimpleModal();

        // Hide emergency button
        const emergencyBtn = document.getElementById('emergencyResetBtn');
        if (emergencyBtn) {
            emergencyBtn.style.display = 'none';
        }

        return true;
    };

    // Expose the simplified functions globally
    window.hideSimpleModal = hideSimpleModal;
    window.setupSimpleScrollTracking = setupSimpleScrollTracking;
    window.setupSimpleModalButtons = setupSimpleModalButtons;
});
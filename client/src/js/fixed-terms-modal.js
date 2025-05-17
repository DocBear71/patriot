// /client/src/js/fixed-terms-modal.js

// Wait for document ready
$(function() {
    console.log("Fixed terms modal implementation starting initialization");

    // Create a function to initialize when the modal is available
    function initializeWhenModalAvailable() {
        // Check if modal elements exist
        const modalElement = document.getElementById('termsUpdateModal');
        const termsSummary = document.getElementById('termsSummary');

        if (!modalElement || !termsSummary) {
            console.log("Terms modal not found yet, will retry in 300ms");
            // Try again after a short delay
            setTimeout(initializeWhenModalAvailable, 300);
            return;
        }

        console.log("Terms modal found in DOM, proceeding with initialization");
        initializeModal();
    }

    // Function to actually initialize the modal functionality
    function initializeModal() {
        // Store references to important modal elements
        let termsSummary = document.getElementById('termsSummary');
        let termsCheckbox = document.getElementById('acceptUpdatedTerms');
        let confirmButton = document.getElementById('confirmUpdatedTerms');
        let rejectButton = document.getElementById('rejectUpdatedTerms');

        console.log("Modal elements initialized:",
            "termsSummary:", !!termsSummary,
            "termsCheckbox:", !!termsCheckbox,
            "confirmButton:", !!confirmButton,
            "rejectButton:", !!rejectButton
        );

        // Override the checkTermsVersion function
        window.originalCheckTermsVersion = window.checkTermsVersion;
        window.checkTermsVersion = function (session) {
            console.log("Fixed terms version check called");
            if (!session || !session.user) return;

            // Current version of terms
            const currentTermsVersion = "May 14, 2025";

            // Check if user has accepted current terms
            if (!session.user.termsAccepted || session.user.termsVersion !== currentTermsVersion) {
                console.log("User needs to accept new terms - using fixed implementation");

                // Clean up any existing modal state
                $('.modal-backdrop').remove();
                $('body').removeClass('modal-open');
                $('body').css('padding-right', '');

                // Show the fixed modal implementation
                showFixedTermsModal();
            }
        };
    }

        // Create a function to initialize the modal elements
        function initializeModalElements() {
            console.log("Initializing modal elements");

            // Get references to modal elements
            termsSummary = document.getElementById('termsSummary');
            termsCheckbox = document.getElementById('acceptUpdatedTerms');
            confirmButton = document.getElementById('confirmUpdatedTerms');
            rejectButton = document.getElementById('rejectUpdatedTerms');

            if (!termsSummary || !termsCheckbox || !confirmButton || !rejectButton) {
                console.error("Failed to initialize modal elements");
                return false;
            }

            console.log("Modal elements initialized successfully");
            return true;
        }

        // Function to show the fixed terms modal
        function showFixedTermsModal() {
            console.log("Showing fixed terms modal");

            // Make sure the modal element exists
            const modalElement = document.getElementById('termsUpdateModal');
            if (!modalElement) {
                console.error("Terms modal element not found");
                return;
            }

            // Reset element references
            const elementsInitialized = initializeModalElements();
            if (!elementsInitialized) {
                console.error("Modal element initialization failed");
                // Try with a small delay and try again
                setTimeout(function () {
                    if (initializeModalElements()) {
                        continueShowingModal();
                    } else {
                        console.error("Modal initialization failed after retry");
                        showEmergencyButton();
                    }
                }, 500);
                return;
            }

            continueShowingModal();
        }

        // Function to continue showing the modal after initialization
        function continueShowingModal() {
            // Set up terms scroll tracking first
            setupFixedScrollTracking();

            // Set up button event handlers
            setupModalButtons();

            // Show the modal using direct DOM manipulation
            const $modal = $('#termsUpdateModal');

            try {
                // First try using Bootstrap modal
                $modal.modal({
                    backdrop: 'static',
                    keyboard: false,
                    show: true
                });

                // Check if modal is visible after a short delay
                setTimeout(function () {
                    const isVisible = $modal.is(':visible') && $modal.hasClass('show');
                    if (!isVisible) {
                        console.log("Bootstrap modal failed to show - using direct DOM manipulation");
                        showModalDirectly();
                    } else {
                        console.log("Modal is visible, checking container dimensions");
                        // Check container dimensions
                        checkModalDimensions();
                    }
                }, 300);
            } catch (error) {
                console.error("Error showing Bootstrap modal:", error);
                showModalDirectly();
            }
        }

        // Function to show the modal using direct DOM manipulation
        function showModalDirectly() {
            console.log("Showing modal using direct DOM manipulation");

            // Get modal elements
            const $modal = $('#termsUpdateModal');
            const $body = $('body');

            // Add backdrop
            if ($('.modal-backdrop').length === 0) {
                $body.append('<div class="modal-backdrop show" style="opacity: 0.5;"></div>');
            }

            // Show modal
            $modal.addClass('show');
            $modal.css('display', 'block');
            $modal.attr('aria-hidden', 'false');
            $modal.attr('aria-modal', 'true');

            // Set modal styles
            $modal.css('z-index', '1050');
            $modal.css('padding-right', '17px');

            // Set body styles
            $body.addClass('modal-open');
            $body.css('padding-right', '17px');
            $body.css('overflow', 'hidden');

            // Check container dimensions
            setTimeout(checkModalDimensions, 300);
        }

        // Function to check modal dimensions and fix if needed
        function checkModalDimensions() {
            console.log("Checking modal dimensions");

            if (!termsSummary) {
                console.error("Terms summary element not available for dimension check");
                return;
            }

            // Check dimensions
            const height = termsSummary.clientHeight;
            const scrollHeight = termsSummary.scrollHeight;

            console.log("Terms summary height:", height);
            console.log("Terms summary scroll height:", scrollHeight);

            // If dimensions are invalid, force them
            if (height === 0 || scrollHeight === 0) {
                console.log("Invalid dimensions detected - applying fixes");

                // Force dimensions on terms summary
                $(termsSummary).css({
                    'max-height': '300px',
                    'height': '300px',
                    'overflow-y': 'scroll',
                    'display': 'block',
                    'visibility': 'visible'
                });

                // Force display on modal content
                $('.modal-content').css({
                    'display': 'block',
                    'visibility': 'visible'
                });

                // Force display on modal dialog
                $('.modal-dialog').css({
                    'display': 'block',
                    'visibility': 'visible'
                });

                // Check dimensions again after a short delay
                setTimeout(function () {
                    const newHeight = termsSummary.clientHeight;
                    const newScrollHeight = termsSummary.scrollHeight;

                    console.log("Updated terms summary height:", newHeight);
                    console.log("Updated terms summary scroll height:", newScrollHeight);

                    if (newHeight === 0 || newScrollHeight === 0) {
                        console.error("Dimension fix failed - showing emergency button");
                        showEmergencyButton();
                    }
                }, 300);
            }
        }

        // Set up fixed scroll tracking
        function setupFixedScrollTracking() {
            console.log("Setting up fixed scroll tracking");

            if (!termsSummary || !termsCheckbox) {
                console.error("Required elements not found for scroll tracking");
                return;
            }

            // Initial state variables
            let hasScrolledToBottom = false;
            let startTime = Date.now();
            const MINIMUM_READ_TIME = 5000; // 5 seconds minimum reading time
            const scrollMessage = document.getElementById('scrollMessage');

            // Remove any existing event listeners
            $(termsSummary).off('scroll');

            // Add scroll event listener
            $(termsSummary).on('scroll', function () {
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
                    console.log("Terms checkbox enabled");

                    // Show confirmation message
                    if (scrollMessage) {
                        scrollMessage.style.display = 'block';
                        scrollMessage.innerHTML = '<i class="fa fa-check-circle"></i> Thank you for reviewing the terms. Please check the box below to confirm your acceptance.';
                        scrollMessage.style.color = 'green';
                    }
                } else if (scrollPercentage >= 80 && timeSpent < MINIMUM_READ_TIME) {
                    // User scrolled quickly to bottom, but hasn't spent enough time
                    const remainingTime = Math.ceil((MINIMUM_READ_TIME - timeSpent) / 1000);
                    if (scrollMessage) {
                        scrollMessage.style.display = 'block';
                        scrollMessage.innerHTML = `Please continue reviewing for ${remainingTime} more seconds.`;
                        scrollMessage.style.color = '#f57c00'; // Orange for warning
                    }
                } else if (scrollPercentage >= 50) {
                    // User is making progress
                    if (scrollMessage) {
                        scrollMessage.style.display = 'block';
                        scrollMessage.innerHTML = 'Continue scrolling to review all terms.';
                        scrollMessage.style.color = '#2196F3'; // Blue for info
                    }
                }
            });

            // Add checkbox change event handler
            $(termsCheckbox).off('change');
            $(termsCheckbox).on('change', function () {
                // Only allow checking if scrolled to bottom
                if (!hasScrolledToBottom && this.checked) {
                    alert('Please read the terms summary by scrolling to the bottom before accepting.');
                    this.checked = false;
                    return;
                }

                // Enable/disable the confirm button based on checkbox
                if (confirmButton) {
                    confirmButton.disabled = !this.checked;
                    console.log("Terms confirm button " + (this.checked ? "enabled" : "disabled"));
                }
            });

            // Simulate initial scroll check to update UI state
            setTimeout(function () {
                $(termsSummary).trigger('scroll');
            }, 500);
        }

        // Set up modal button handlers
        function setupModalButtons() {
            console.log("Setting up modal buttons");

            if (!confirmButton || !rejectButton) {
                console.error("Button elements not found");
                return;
            }

            // Remove any existing event listeners
            $(confirmButton).off('click');
            $(rejectButton).off('click');

            // Add confirm button handler
            $(confirmButton).on('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                console.log("Confirm button clicked");

                // Get session data
                const sessionData = localStorage.getItem('patriotThanksSession');
                if (!sessionData) {
                    console.error("No session found");
                    hideFixedModal();
                    return;
                }

                try {
                    const session = JSON.parse(sessionData);
                    handleTermsAcceptance(session);
                } catch (error) {
                    console.error("Error parsing session data:", error);
                    hideFixedModal();
                }
            });

            // Add reject button handler
            $(rejectButton).on('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
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
                    hideFixedModal();
                }
            });

            // Add close button handler
            $('.modal .close').off('click');
            $('.modal .close').on('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                console.log("Close button clicked");

                // Force modal to close
                hideFixedModal();
            });
        }

        // Handle terms acceptance
        function handleTermsAcceptance(session) {
            console.log("Handling terms acceptance");

            const userId = session.user._id;

            // Update session data locally first
            session.user.termsAccepted = true;
            session.user.termsAcceptedDate = new Date().toISOString();
            session.user.termsVersion = "May 14, 2025";
            localStorage.setItem('patriotThanksSession', JSON.stringify(session));

            // Hide the modal immediately to prevent UI blocking
            hideFixedModal();

            // Now update on the server
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
                    userId: userId,
                    termsAccepted: true,
                    termsAcceptedDate: new Date().toISOString(),
                    termsVersion: "May 14, 2025"
                })
            })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! Status: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    console.log("Terms acceptance updated on server successfully");
                })
                .catch(error => {
                    console.error("Error updating terms on server:", error);
                    // Don't show error to user since we've already updated locally
                });
        }

        // Function to hide the fixed modal
        function hideFixedModal() {
            console.log("Hiding fixed modal");

            try {
                // Try Bootstrap modal hide first
                $('#termsUpdateModal').modal('hide');
            } catch (error) {
                console.error("Error hiding Bootstrap modal:", error);
            }

            // Direct DOM manipulation as backup
            try {
                // Remove backdrop
                $('.modal-backdrop').remove();

                // Hide modal
                const $modal = $('#termsUpdateModal');
                $modal.removeClass('show');
                $modal.css('display', 'none');
                $modal.attr('aria-hidden', 'true');
                $modal.removeAttr('aria-modal');

                // Clean up body
                $('body').removeClass('modal-open');
                $('body').css('padding-right', '');
                $('body').css('overflow', '');

                console.log("Modal hidden successfully");
            } catch (error) {
                console.error("Error in direct modal manipulation:", error);
            }
        }

// Helper function to show emergency button
        window.showEmergencyButton = function () {
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
                emergencyBtn.addEventListener('click', function () {
                    console.log("Emergency reset button clicked");

                    // Try calling the emergencyModalReset function
                    if (typeof emergencyModalReset === 'function') {
                        emergencyModalReset();
                    } else {
                        // Manual reset if function not available
                        hideFixedModal();
                    }

                    // Hide the button
                    this.style.display = 'none';
                });

                // Add to body
                document.body.appendChild(emergencyBtn);
            } else {
                // Show the existing button
                emergencyBtn.style.display = 'block';
            }
        };

// Make emergency modal reset function available globally
        window.emergencyModalReset = function () {
            console.log("Emergency modal reset called");

            // Hide the fixed modal
            hideFixedModal();

            // Hide emergency button
            const emergencyBtn = document.getElementById('emergencyResetBtn');
            if (emergencyBtn) {
                emergencyBtn.style.display = 'none';
            }

            return true;
        };

// Initialize the fix on page load
        $(document).ready(function () {
            console.log("Fixed terms modal ready");
        });

        initializeWhenModalAvailable();

});

// Wait for document ready
$(function() {
    console.log("Bootstrap 5 Terms Modal script initialized");

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
        // IMPORTANT BOOTSTRAP 5 CHANGES:
        // 1. Modal is now controlled via Modal.getInstance() or new bootstrap.Modal()
        // 2. show/hide methods are direct methods instead of options
        // 3. 'data-dismiss' is now 'data-bs-dismiss'
        // 4. Events are now prefixed with 'bs' (e.g., 'show.bs.modal')

        // Store references to important modal elements
        let termsSummary = document.getElementById('termsSummary');
        let termsCheckbox = document.getElementById('acceptUpdatedTerms');
        let confirmButton = document.getElementById('confirmUpdatedTerms');
        let rejectButton = document.getElementById('rejectUpdatedTerms');
        let scrollMessage = document.getElementById('scrollMessage');

        console.log("Modal elements initialized:",
            "termsSummary:", !!termsSummary,
            "termsCheckbox:", !!termsCheckbox,
            "confirmButton:", !!confirmButton,
            "rejectButton:", !!rejectButton
        );

        // CRITICAL FIX: Force content into the terms summary
        console.log("Replacing terms summary with custom implementation");

        // Create a new div with forced inline styles
        const newTermsDiv = document.createElement('div');
        newTermsDiv.id = "forced-terms-summary";
        newTermsDiv.setAttribute("style",
            "max-height: 300px !important; " +
            "height: 300px !important; " +
            "min-height: 300px !important; " +
            "overflow-y: scroll !important; " +
            "display: block !important; " +
            "visibility: visible !important; " +
            "background-color: #f9f9f9 !important; " +
            "border: 1px solid #ddd !important; " +
            "padding: 15px !important; " +
            "margin: 10px 0 !important;");

        // Add content to the new div
        newTermsDiv.innerHTML = `
      <h4 style="color: #333; margin-bottom: 15px;">Summary of Key Terms</h4>
      <p><strong>Effective Date:</strong> May 14, 2025</p>
      
      <h5 style="color: #555; margin-top: 15px; font-weight: bold;">1. ACCEPTANCE OF TERMS</h5>
      <p style="margin-bottom: 12px;">By accessing or using Patriot Thanks, you agree to be bound by these Terms of Use. If you do not agree to these terms, you must discontinue use immediately.</p>
      
      <h5 style="color: #555; margin-top: 15px; font-weight: bold;">2. INTELLECTUAL PROPERTY RIGHTS</h5>
      <p style="margin-bottom: 12px;">All content, features, and functionality on Patriot Thanks are owned by Doc Bear Enterprises, LLC and are protected by copyright, trademark, and other intellectual property laws.</p>
      
      <h5 style="color: #555; margin-top: 15px; font-weight: bold;">3. USER RESPONSIBILITIES</h5>
      <p style="margin-bottom: 12px;">Users are responsible for maintaining the confidentiality of their account information and for all activities that occur under their account. Users must not engage in any prohibited activities as outlined in the full Terms of Use.</p>
      
      <h5 style="color: #555; margin-top: 15px; font-weight: bold;">4. DATA COLLECTION AND PRIVACY</h5>
      <p style="margin-bottom: 12px;">We collect certain personal information to provide our services. Your use of Patriot Thanks is also governed by our Privacy Policy, which describes how we collect, use, and protect your personal information.</p>
      
      <h5 style="color: #555; margin-top: 15px; font-weight: bold;">5. LIMITATION OF LIABILITY</h5>
      <p style="margin-bottom: 12px;">Patriot Thanks and its owners will not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the service.</p>
      
      <div id="termsScrollTarget" style="padding-top: 15px; margin-top: 15px; border-top: 1px dashed #ddd; text-align: center; font-weight: bold;">
        <p>Thank you for reviewing our Terms of Use summary. Please check the box below to indicate your acceptance.</p>
      </div>
    `;

        // Replace the original terms summary with our new one
        termsSummary.parentNode.replaceChild(newTermsDiv, termsSummary);

        // Re-assign termsSummary to our new div
        termsSummary = newTermsDiv;

        // Override the checkTermsVersion function
        window.originalCheckTermsVersion = window.checkTermsVersion;
        window.checkTermsVersion = function(session) {
            console.log("Bootstrap 5 terms version check called");
            if (!session || !session.user) return;

            // Current version of terms
            const currentTermsVersion = "May 14, 2025";

            // Check if user has accepted current terms
            if (!session.user.termsAccepted || session.user.termsVersion !== currentTermsVersion) {
                console.log("User needs to accept new terms - using Bootstrap 5 implementation");

                // Clean up any existing modal state
                $('.modal-backdrop').remove();
                $('body').removeClass('modal-open');
                $('body').css('padding-right', '');

                // Show the modal using Bootstrap 5
                showBootstrap5Modal();
            }
        };

        // Function to show the modal using Bootstrap 5
        function showBootstrap5Modal() {
            console.log("Showing Bootstrap 5 modal");

            // Set up terms scroll tracking first
            setupScrollTracking();

            // Set up button event handlers
            setupModalButtons();

            // In Bootstrap 5, we create a new Modal instance or get an existing one
            let bsModal;

            try {
                // Get the modal element
                const modalEl = document.getElementById('termsUpdateModal');

                // Create a new Modal instance with options
                bsModal = new bootstrap.Modal(modalEl, {
                    backdrop: 'static',
                    keyboard: false
                });

                // Show the modal
                bsModal.show();

                // Check if modal is visible after a short delay
                setTimeout(function() {
                    // In Bootstrap 5, we can check if modal has the 'show' class
                    const isVisible = modalEl.classList.contains('show');
                    if (!isVisible) {
                        console.log("Bootstrap 5 modal failed to show - using direct DOM manipulation");
                        showModalDirectly();
                    } else {
                        console.log("Modal is visible, checking container dimensions");
                        checkModalDimensions();
                    }
                }, 300);
            } catch (error) {
                console.error("Error showing Bootstrap 5 modal:", error);
                showModalDirectly();
            }
        }

        // Function to set up scroll tracking
        function setupScrollTracking() {
            console.log("Setting up scroll tracking for Bootstrap 5");

            // Initial state variables
            let hasScrolledToBottom = false;
            let startTime = Date.now();
            const MINIMUM_READ_TIME = 5000; // 5 seconds minimum reading time

            // Remove any existing event listeners using jQuery
            $(termsSummary).off('scroll');

            // Add scroll event listener directly
            termsSummary.addEventListener('scroll', function() {
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
            termsCheckbox.addEventListener('change', function() {
                // Only allow checking if scrolled to bottom
                if (!hasScrolledToBottom && this.checked) {
                    alert('Please read the terms summary by scrolling to the bottom before accepting.');
                    this.checked = false;
                    return;
                }

                // Enable/disable the confirm button based on checkbox
                confirmButton.disabled = !this.checked;
                console.log("Terms confirm button " + (this.checked ? "enabled" : "disabled"));
            });

            // Force a small scroll to trigger scroll handler
            setTimeout(function() {
                // Force a scroll event
                termsSummary.scrollTop = 1;

                // Manually trigger a scroll event
                const event = document.createEvent('Event');
                event.initEvent('scroll', true, true);
                termsSummary.dispatchEvent(event);

                // If the terms summary doesn't have sufficient height, enable the checkbox directly
                if (termsSummary.scrollHeight <= termsSummary.clientHeight) {
                    console.log("Terms content fits without scrolling - enabling checkbox");
                    termsCheckbox.disabled = false;

                    if (scrollMessage) {
                        scrollMessage.style.display = 'block';
                        scrollMessage.innerHTML = '<i class="fa fa-check-circle"></i> Thank you for reviewing the terms. Please check the box below to confirm your acceptance.';
                        scrollMessage.style.color = 'green';
                    }

                    hasScrolledToBottom = true;
                }
            }, 800);
        }

        // Function to show the modal using direct DOM manipulation
        function showModalDirectly() {
            console.log("Showing modal using direct DOM manipulation (Bootstrap 5 compatible)");

            // Get modal elements
            const modalEl = document.getElementById('termsUpdateModal');

            // Add required Bootstrap 5 classes
            modalEl.classList.add('show');
            modalEl.style.display = 'block';
            modalEl.setAttribute('aria-modal', 'true');
            modalEl.removeAttribute('aria-hidden');

            // Add backdrop if it doesn't exist
            if (document.getElementsByClassName('modal-backdrop').length === 0) {
                const backdrop = document.createElement('div');
                backdrop.classList.add('modal-backdrop', 'fade', 'show');
                document.body.appendChild(backdrop);
            }

            // Add modal-open class to body
            document.body.classList.add('modal-open');

            // Check container dimensions
            setTimeout(checkModalDimensions, 300);
        }

        // Function to check modal dimensions and fix if needed
        function checkModalDimensions() {
            console.log("Checking modal dimensions (Bootstrap 5)");

            const height = termsSummary.clientHeight;
            const scrollHeight = termsSummary.scrollHeight;

            console.log("Terms summary height:", height);
            console.log("Terms summary scroll height:", scrollHeight);

            // If dimensions are still problematic, force them again
            if (height < 50 || scrollHeight < 50) {
                console.log("Invalid dimensions detected - applying additional fixes");

                // Force dimensions more aggressively
                termsSummary.style.cssText = `
          max-height: 300px !important;
          height: 300px !important;
          min-height: 300px !important;
          overflow-y: scroll !important;
          display: block !important;
          visibility: visible !important;
          background-color: #f9f9f9 !important;
          border: 1px solid #ddd !important;
          padding: 15px !important;
          margin: 10px 0 !important;
        `;

                // Force display on modal content
                const modalContent = document.querySelector('.modal-content');
                if (modalContent) {
                    modalContent.style.cssText = `
            display: block !important;
            visibility: visible !important;
          `;
                }

                // Force display on modal dialog
                const modalDialog = document.querySelector('.modal-dialog');
                if (modalDialog) {
                    modalDialog.style.cssText = `
            display: block !important;
            visibility: visible !important;
          `;
                }
            }
        }

        // Set up modal button handlers
        function setupModalButtons() {
            console.log("Setting up modal buttons (Bootstrap 5)");

            if (!confirmButton || !rejectButton) {
                console.error("Button elements not found");
                return;
            }

            // In Bootstrap 5, we need to use addEventListener instead of jQuery click
            // and we need to handle data-bs-dismiss

            // Add confirm button handler
            confirmButton.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log("Confirm button clicked");

                // Get session data
                const sessionData = localStorage.getItem('patriotThanksSession');
                if (!sessionData) {
                    console.error("No session found");
                    hideModal();
                    return;
                }

                try {
                    const session = JSON.parse(sessionData);
                    handleTermsAcceptance(session);
                } catch (error) {
                    console.error("Error parsing session data:", error);
                    hideModal();
                }
            });

            // Add reject button handler
            rejectButton.addEventListener('click', function(e) {
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
                    hideModal();
                }
            });

            // Add close button handler
            const closeButton = document.querySelector('#termsUpdateModal .btn-close') ||
                document.querySelector('#termsUpdateModal .close');
            if (closeButton) {
                closeButton.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log("Close button clicked");

                    // Force modal to close
                    hideModal();
                });
            }

            // Add keyboard event listener for Escape key
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape') {
                    console.log("Escape key pressed, attempting to close modal");
                    hideModal();
                }
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
            hideModal();

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

        // Function to hide the modal with Bootstrap 5
        function hideModal() {
            console.log("Hiding Bootstrap 5 modal");

            try {
                // Bootstrap 5 way to hide a modal using the Modal instance
                const modalEl = document.getElementById('termsUpdateModal');
                const bsModal = bootstrap.Modal.getInstance(modalEl);

                if (bsModal) {
                    bsModal.hide();
                } else {
                    // If no instance found, try direct hide
                    $(modalEl).modal('hide');
                }
            } catch (error) {
                console.error("Error hiding Bootstrap 5 modal:", error);

                // Fallback to direct DOM manipulation
                try {
                    const modalEl = document.getElementById('termsUpdateModal');

                    // Remove show class and set display to none
                    modalEl.classList.remove('show');
                    modalEl.style.display = 'none';
                    modalEl.setAttribute('aria-hidden', 'true');
                    modalEl.removeAttribute('aria-modal');

                    // Remove backdrop
                    const backdrop = document.querySelector('.modal-backdrop');
                    if (backdrop) {
                        backdrop.parentNode.removeChild(backdrop);
                    }

                    // Remove body classes
                    document.body.classList.remove('modal-open');
                    document.body.style.overflow = '';
                    document.body.style.paddingRight = '';

                    console.log("Modal hidden using direct DOM manipulation");
                } catch (domError) {
                    console.error("Failed to hide modal via DOM manipulation:", domError);
                }
            }
        }

        // Make functions available globally
        window.showBootstrap5Modal = showBootstrap5Modal;
        window.hideModal = hideModal;
        window.handleTermsAcceptance = handleTermsAcceptance;

        // Helper function to show emergency button
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

                    // Try calling the specific hide function
                    if (typeof hideModal === 'function') {
                        hideModal();
                    } else {
                        // Generic cleanup
                        // In Bootstrap 5, modal-backdrop is a separate element
                        const backdrop = document.querySelector('.modal-backdrop');
                        if (backdrop) {
                            backdrop.parentNode.removeChild(backdrop);
                        }
                        document.body.classList.remove('modal-open');
                        document.body.style.overflow = '';
                        document.body.style.paddingRight = '';

                        const modal = document.getElementById('termsUpdateModal');
                        if (modal) {
                            modal.classList.remove('show');
                            modal.style.display = 'none';
                            modal.setAttribute('aria-hidden', 'true');
                            modal.removeAttribute('aria-modal');
                        }
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
        window.emergencyModalReset = function() {
            console.log("Emergency modal reset called");

            // Hide the modal
            hideModal();

            // Hide emergency button
            const emergencyBtn = document.getElementById('emergencyResetBtn');
            if (emergencyBtn) {
                emergencyBtn.style.display = 'none';
            }

            return true;
        };

        // Check if the modal should be shown right away
        if (typeof checkLoginStatus === 'function') {
            setTimeout(checkLoginStatus, 500);
        }
    }

    // Start the initialization process
    initializeWhenModalAvailable();
});
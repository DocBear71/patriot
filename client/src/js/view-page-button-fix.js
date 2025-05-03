// view-page-button-fix.js - Specific fix for the floating button on incentive-view.html
// Include this after reset-functionality.js for a targeted fix

(function() {
    console.log("View Page Button Fix Loaded!");

    // Only apply this fix to incentive-view.html
    if (window.location.pathname.includes('incentive-view.html') ||
        document.getElementById('incentives-container') !== null) {

        console.log("Detected incentive view page, applying floating button fix");

        // Remove any existing floating buttons from previous script
        function removeExistingButtons() {
            const existingButton = document.getElementById('floating-reset-button-container');
            if (existingButton) {
                existingButton.remove();
                console.log("Removed existing floating button");
            }
        }

        // Create the reset button with appropriate styling
        function createFixedResetButton() {
            const resetButton = document.createElement('button');
            resetButton.id = 'fixed-reset-button';
            resetButton.type = 'button';
            resetButton.innerText = 'Start Over';

            resetButton.style.backgroundColor = '#0000ff'; // Match your blue buttons
            resetButton.style.color = 'white';
            resetButton.style.border = 'none';
            resetButton.style.padding = '10px 20px';
            resetButton.style.borderRadius = '4px';
            resetButton.style.cursor = 'pointer';
            resetButton.style.margin = '0';
            resetButton.style.fontWeight = 'bold';
            resetButton.style.boxShadow = '0 2px 5px rgba(0,0,0,0.3)';
            resetButton.style.fontSize = '14px';

            // Add hover effect
            resetButton.onmouseover = function() {
                this.style.backgroundColor = '#0000cc';
            };
            resetButton.onmouseout = function() {
                this.style.backgroundColor = '#0000ff';
            };

            return resetButton;
        }

        // Create and position the floating button container
        function createFloatingContainer() {
            const container = document.createElement('div');
            container.id = 'fixed-reset-button-container';

            // Position it fixed on the screen
            container.style.position = 'fixed';
            container.style.bottom = '20px';
            container.style.right = '20px';
            container.style.zIndex = '2000'; // Higher z-index to ensure it's above other elements

            // Add padding and background
            container.style.padding = '0';
            container.style.borderRadius = '4px';

            return container;
        }

        // Function to add our fixed button
        function addFixedButton() {
            // Remove any existing buttons first
            removeExistingButtons();

            // If incentives are loaded, add our button
            const incentivesContainer = document.getElementById('incentives-container');
            if (incentivesContainer &&
                incentivesContainer.innerHTML !== '' &&
                incentivesContainer.innerHTML !== '<p>Loading incentives...</p>') {

                // Create our container and button
                const container = createFloatingContainer();
                const button = createFixedResetButton();

                // Add reset function to button
                button.addEventListener('click', function() {
                    // Clear search fields
                    const businessNameField = document.getElementById('business-name');
                    if (businessNameField) {
                        businessNameField.value = '';
                    }

                    const addressField = document.getElementById('address');
                    if (addressField) {
                        addressField.value = '';
                    }

                    // Clear search results
                    const searchResults = document.getElementById('business-search-results');
                    if (searchResults) {
                        searchResults.innerHTML = '';
                    }

                    // Hide business info section
                    const businessInfoSection = document.getElementById('business-info-section');
                    if (businessInfoSection) {
                        businessInfoSection.style.display = 'none';
                    }

                    // Clear incentives container
                    incentivesContainer.innerHTML = '';

                    // Reset hidden business ID field
                    const selectedBusinessId = document.getElementById('selected-business-id');
                    if (selectedBusinessId) {
                        selectedBusinessId.value = '';
                    }

                    // Remove our button until new incentives are loaded
                    container.remove();

                    // Scroll back to top
                    window.scrollTo(0, 0);

                    // Focus on business name field
                    if (businessNameField) {
                        businessNameField.focus();
                    }

                    console.log("Page has been reset");
                });

                // Add button to container
                container.appendChild(button);

                // Add container directly to the main content area, before footer
                const mainContent = document.querySelector('main');
                if (mainContent) {
                    mainContent.appendChild(container);
                    console.log("Added fixed button to main content area");
                } else {
                    // Fallback - add directly to body
                    document.body.appendChild(container);
                    console.log("Added fixed button to body (fallback)");
                }
            }
        }

        // Add a responsive style for the fixed button on mobile
        const mobileStyle = document.createElement('style');
        mobileStyle.textContent = `
            @media (max-width: 768px) {
                #fixed-reset-button {
                    width: 120px;
                    padding: 12px 15px;
                    font-size: 16px;
                }
                
                #fixed-reset-button-container {
                    bottom: 10px;
                    right: 10px;
                }
            }
        `;
        document.head.appendChild(mobileStyle);

        // Watch for changes to the incentives container
        function setupIncentivesObserver() {
            const incentivesContainer = document.getElementById('incentives-container');
            if (incentivesContainer) {
                const observer = new MutationObserver(function(mutations) {
                    addFixedButton();
                });

                observer.observe(incentivesContainer, { childList: true, subtree: true });
                console.log("Incentives container observer setup");
            }
        }

        // Initial setup - wait for DOM to be fully loaded
        if (document.readyState === "complete") {
            addFixedButton();
            setupIncentivesObserver();
        } else {
            window.addEventListener('load', function() {
                addFixedButton();
                setupIncentivesObserver();
            });
        }

        // Additional check for already loaded incentives
        setTimeout(addFixedButton, 1000);
        setTimeout(setupIncentivesObserver, 1000);
    }
})();
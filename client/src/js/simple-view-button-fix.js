// simple-view-button-fix.js - Direct fix for the incentive view page button placement
document.addEventListener('DOMContentLoaded', function() {
    console.log("Simple View Button Fix Loaded!");

    // Only run on the incentive view page
    if (window.location.pathname.includes('incentive-view.html') ||
        document.querySelector('h4')?.textContent.includes('Search for an Incentive')) {

        console.log("Detected incentive view page, applying simple button fix");

        // Function to add a reset button directly to the search fieldset
        function addSearchResetButton() {
            // Find the search fieldset and form
            const searchFieldset = document.querySelector('fieldset');
            const searchForm = document.getElementById('business-search-form');

            if (searchFieldset && searchForm) {
                // Create container
                const buttonContainer = document.createElement('div');
                buttonContainer.style.textAlign = 'center';
                buttonContainer.style.marginTop = '10px';

                // Create button
                const resetButton = document.createElement('button');
                resetButton.type = 'button';
                resetButton.innerText = 'Reset Page';
                resetButton.style.backgroundColor = '#0000ff';
                resetButton.style.color = 'white';
                resetButton.style.border = 'none';
                resetButton.style.padding = '10px 20px';
                resetButton.style.borderRadius = '4px';
                resetButton.style.cursor = 'pointer';
                resetButton.style.fontWeight = 'bold';
                resetButton.style.marginLeft = '10px';

                // Add reset functionality
                resetButton.addEventListener('click', function() {
                    // Clear search fields
                    const businessNameField = document.getElementById('business-name');
                    if (businessNameField) businessNameField.value = '';

                    const addressField = document.getElementById('address');
                    if (addressField) addressField.value = '';

                    // Clear search results
                    const searchResults = document.getElementById('business-search-results');
                    if (searchResults) searchResults.innerHTML = '';

                    // Hide business info section
                    const businessInfoSection = document.getElementById('business-info-section');
                    if (businessInfoSection) businessInfoSection.style.display = 'none';

                    // Clear incentives container
                    const incentivesContainer = document.getElementById('incentives-container');
                    if (incentivesContainer) incentivesContainer.innerHTML = '';

                    // Reset hidden business ID field
                    const selectedBusinessId = document.getElementById('selected-business-id');
                    if (selectedBusinessId) selectedBusinessId.value = '';

                    // Scroll back to top
                    window.scrollTo(0, 0);

                    // Focus on business name field
                    if (businessNameField) businessNameField.focus();

                    console.log("Page has been reset");
                });

                // Add button to container
                buttonContainer.appendChild(resetButton);

                // Add container after the form
                searchForm.appendChild(buttonContainer);
                console.log("Added reset button to search form");
            }
        }

        // Function to add a proper fixed reset button when incentives are shown
        function addFixedButton() {
            // Remove any existing buttons that might have been created by other scripts
            const existingFloatingButtons = document.querySelectorAll('[id$="-reset-button-container"]');
            existingFloatingButtons.forEach(button => button.remove());

            // Create the fixed button styling that will appear in the main content
            const buttonDiv = document.createElement('div');
            buttonDiv.id = 'main-reset-button';
            buttonDiv.style.textAlign = 'center';
            buttonDiv.style.margin = '20px 0';
            buttonDiv.style.padding = '10px';

            const button = document.createElement('button');
            button.type = 'button';
            button.textContent = 'Start Over';
            button.style.backgroundColor = '#0000ff';
            button.style.color = 'white';
            button.style.border = 'none';
            button.style.padding = '12px 25px';
            button.style.borderRadius = '4px';
            button.style.cursor = 'pointer';
            button.style.fontWeight = 'bold';
            button.style.fontSize = '16px';

            // Add hover effect
            button.onmouseover = function() {
                this.style.backgroundColor = '#0000cc';
            };
            button.onmouseout = function() {
                this.style.backgroundColor = '#0000ff';
            };

            // Add functionality
            button.addEventListener('click', function() {
                // Clear search fields
                const businessNameField = document.getElementById('business-name');
                if (businessNameField) businessNameField.value = '';

                const addressField = document.getElementById('address');
                if (addressField) addressField.value = '';

                // Clear search results
                const searchResults = document.getElementById('business-search-results');
                if (searchResults) searchResults.innerHTML = '';

                // Hide business info section
                const businessInfoSection = document.getElementById('business-info-section');
                if (businessInfoSection) businessInfoSection.style.display = 'none';

                // Clear incentives container
                const incentivesContainer = document.getElementById('incentives-container');
                if (incentivesContainer) incentivesContainer.innerHTML = '';

                // Reset hidden business ID field
                const selectedBusinessId = document.getElementById('selected-business-id');
                if (selectedBusinessId) selectedBusinessId.value = '';

                // Remove our button
                buttonDiv.remove();

                // Scroll back to top
                window.scrollTo(0, 0);

                // Focus on business name field
                if (businessNameField) businessNameField.focus();

                console.log("Page has been reset");
            });

            buttonDiv.appendChild(button);

            // Add to the incentives section
            const incentivesContainer = document.getElementById('incentives-container');
            const incentivesSection = document.getElementById('incentives-section');

            if (incentivesSection) {
                // Add to existing incentives section
                incentivesSection.appendChild(buttonDiv);
                console.log("Added reset button to incentives section");
            } else if (incentivesContainer && incentivesContainer.children.length > 0) {
                // Add directly to the incentives container
                incentivesContainer.appendChild(buttonDiv);
                console.log("Added reset button to incentives container");
            }
        }

        // Watch for changes to the incentives container to add our button
        function setupIncentivesObserver() {
            const incentivesContainer = document.getElementById('incentives-container');
            if (incentivesContainer) {
                const observer = new MutationObserver(function(mutations) {
                    // Check if incentives have been loaded
                    if (incentivesContainer.children.length > 0 &&
                        incentivesContainer.innerHTML !== '<p>Loading incentives...</p>' &&
                        !document.getElementById('main-reset-button')) {

                        // Add our button
                        addFixedButton();
                    }
                });

                observer.observe(incentivesContainer, { childList: true, subtree: true });
                console.log("Incentives container observer setup");
            }
        }

        // Add the search reset button immediately
        addSearchResetButton();

        // Setup observer for incentives
        setupIncentivesObserver();

        // Check if incentives are already loaded
        const incentivesContainer = document.getElementById('incentives-container');
        if (incentivesContainer &&
            incentivesContainer.children.length > 0 &&
            incentivesContainer.innerHTML !== '<p>Loading incentives...</p>') {

            // Add our button
            addFixedButton();
        }

        // Additional check for already loaded incentives
        setTimeout(function() {
            if (!document.getElementById('main-reset-button')) {
                addFixedButton();
            }
        }, 1000);
    }
});
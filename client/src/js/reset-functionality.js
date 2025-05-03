// reset-functionality.js - Final version with fixes for specific page issues
document.addEventListener('DOMContentLoaded', function() {
    console.log("Fixed Reset Functionality Loaded!");

    // Determine which page we're on based on the HTML structure and URL
    const pagePath = window.location.pathname;
    const isBusinessUpdatePage = pagePath.includes('business-update.html') || document.getElementById('business-update-form') !== null;
    const isAddPage = !isBusinessUpdatePage && document.getElementById('incentive-section') !== null;
    const isUpdatePage = !isBusinessUpdatePage && document.getElementById('incentive-edit-section') !== null;
    const isViewPage = !isBusinessUpdatePage && (pagePath.includes('incentive-view.html') || document.getElementById('incentives-container') !== null);

    console.log("Page detection - Business Update:", isBusinessUpdatePage, "Add:", isAddPage, "Update:", isUpdatePage, "View:", isViewPage);

    // Create the reset button with appropriate styling
    function createResetButton() {
        const resetButton = document.createElement('button');
        resetButton.id = 'reset-button';
        resetButton.type = 'button';
        resetButton.innerText = 'Start Over';

        resetButton.style.backgroundColor = '#0000ff'; // Match your blue buttons
        resetButton.style.color = 'white';
        resetButton.style.border = 'none';
        resetButton.style.padding = '10px 20px';
        resetButton.style.borderRadius = '4px';
        resetButton.style.cursor = 'pointer';
        resetButton.style.marginTop = '20px';
        resetButton.style.fontWeight = 'bold';

        // Add hover effect
        resetButton.onmouseover = function() {
            this.style.backgroundColor = '#0000cc';
        };
        resetButton.onmouseout = function() {
            this.style.backgroundColor = '#0000ff';
        };

        return resetButton;
    }

    // Create container for button
    function createButtonContainer() {
        const container = document.createElement('div');
        container.id = 'reset-button-container';
        container.style.textAlign = 'center';
        container.style.marginBottom = '20px';
        return container;
    }

    // Add reset buttons to appropriate sections based on the page
    function addResetButtons() {
        // Add a button to the business search section (all pages)
        const searchFieldset = document.querySelector('fieldset:first-of-type');
        if (searchFieldset) {
            const searchButtonContainer = createButtonContainer();
            const searchResetButton = createResetButton();
            searchResetButton.innerText = 'Clear Search';
            searchResetButton.addEventListener('click', function() {
                resetSearchForm();
            });

            searchButtonContainer.appendChild(searchResetButton);
            searchFieldset.appendChild(searchButtonContainer);
        }

        // Only add the Start Over button to appropriate sections that are VISIBLE
        // This way we don't show buttons prematurely

        if (isBusinessUpdatePage) {
            // Business Update page
            const businessInfoSection = document.getElementById('business-info-section');
            if (businessInfoSection) {
                const observer = new MutationObserver(function(mutations) {
                    mutations.forEach(function(mutation) {
                        if (mutation.attributeName === 'style' &&
                            businessInfoSection.style.display !== 'none' &&
                            !businessInfoSection.querySelector('#reset-button-container')) {

                            const resetButtonContainer = createButtonContainer();
                            const resetButton = createResetButton();
                            resetButton.addEventListener('click', function() {
                                resetPage();
                            });

                            resetButtonContainer.appendChild(resetButton);
                            businessInfoSection.appendChild(resetButtonContainer);
                        }
                    });
                });

                observer.observe(businessInfoSection, { attributes: true });

                // Check if it's already visible
                if (businessInfoSection.style.display !== 'none' &&
                    !businessInfoSection.querySelector('#reset-button-container')) {

                    const resetButtonContainer = createButtonContainer();
                    const resetButton = createResetButton();
                    resetButton.addEventListener('click', function() {
                        resetPage();
                    });

                    resetButtonContainer.appendChild(resetButton);
                    businessInfoSection.appendChild(resetButtonContainer);
                }
            }
        }
        else if (isAddPage) {
            // Add page for adding incentives
            const incentiveSection = document.getElementById('incentive-section');
            if (incentiveSection) {
                const observer = new MutationObserver(function(mutations) {
                    mutations.forEach(function(mutation) {
                        if (mutation.attributeName === 'style' &&
                            incentiveSection.style.display !== 'none' &&
                            !incentiveSection.querySelector('#reset-button-container')) {

                            const resetButtonContainer = createButtonContainer();
                            const resetButton = createResetButton();
                            resetButton.addEventListener('click', function() {
                                resetPage();
                            });

                            resetButtonContainer.appendChild(resetButton);
                            incentiveSection.appendChild(resetButtonContainer);
                        }
                    });
                });

                observer.observe(incentiveSection, { attributes: true });

                // Check if it's already visible
                if (incentiveSection.style.display !== 'none' &&
                    !incentiveSection.querySelector('#reset-button-container')) {

                    const resetButtonContainer = createButtonContainer();
                    const resetButton = createResetButton();
                    resetButton.addEventListener('click', function() {
                        resetPage();
                    });

                    resetButtonContainer.appendChild(resetButton);
                    incentiveSection.appendChild(resetButtonContainer);
                }
            }
        }
        else if (isUpdatePage) {
            // Update page for updating incentives
            const incentiveEditSection = document.getElementById('incentive-edit-section');
            if (incentiveEditSection) {
                const observer = new MutationObserver(function(mutations) {
                    mutations.forEach(function(mutation) {
                        if (mutation.attributeName === 'style' &&
                            incentiveEditSection.style.display !== 'none' &&
                            !incentiveEditSection.querySelector('#reset-button-container')) {

                            const resetButtonContainer = createButtonContainer();
                            const resetButton = createResetButton();
                            resetButton.addEventListener('click', function() {
                                resetPage();
                            });

                            resetButtonContainer.appendChild(resetButton);
                            incentiveEditSection.appendChild(resetButtonContainer);
                        }
                    });
                });

                observer.observe(incentiveEditSection, { attributes: true });

                // Check if it's already visible
                if (incentiveEditSection.style.display !== 'none' &&
                    !incentiveEditSection.querySelector('#reset-button-container')) {

                    const resetButtonContainer = createButtonContainer();
                    const resetButton = createResetButton();
                    resetButton.addEventListener('click', function() {
                        resetPage();
                    });

                    resetButtonContainer.appendChild(resetButton);
                    incentiveEditSection.appendChild(resetButtonContainer);
                }
            }
        }
        else if (isViewPage) {
            // Create a floating reset button for the view page, but only after incentives are loaded
            const main = document.querySelector('main');

            // For the view page, we need to wait for incentives to load
            const incentivesContainer = document.getElementById('incentives-container');

            if (incentivesContainer) {
                const incentivesObserver = new MutationObserver(function(mutations) {
                    if (incentivesContainer.innerHTML !== '' &&
                        !document.getElementById('floating-reset-button-container')) {

                        // Create floating button
                        const floatingContainer = document.createElement('div');
                        floatingContainer.id = 'floating-reset-button-container';
                        floatingContainer.style.position = 'fixed';
                        floatingContainer.style.bottom = '20px';
                        floatingContainer.style.right = '20px';
                        floatingContainer.style.zIndex = '1000';

                        const floatingButton = createResetButton();
                        floatingButton.style.boxShadow = '0 2px 5px rgba(0,0,0,0.3)';
                        floatingButton.addEventListener('click', function() {
                            resetPage();
                        });

                        floatingContainer.appendChild(floatingButton);

                        // Insert before the footer instead of at the end of the body
                        const footer = document.querySelector('footer');
                        if (footer && footer.parentNode) {
                            document.body.insertBefore(floatingContainer, footer);
                        } else {
                            // Fallback to body append if no footer
                            document.body.appendChild(floatingContainer);
                        }

                        // Don't need to observe anymore
                        incentivesObserver.disconnect();
                    }
                });

                incentivesObserver.observe(incentivesContainer, { childList: true, subtree: true });

                // Check if already populated
                if (incentivesContainer.innerHTML !== '' &&
                    incentivesContainer.innerHTML !== '<p>Loading incentives...</p>' &&
                    !document.getElementById('floating-reset-button-container')) {

                    // Create floating button
                    const floatingContainer = document.createElement('div');
                    floatingContainer.id = 'floating-reset-button-container';
                    floatingContainer.style.position = 'fixed';
                    floatingContainer.style.bottom = '20px';
                    floatingContainer.style.right = '20px';
                    floatingContainer.style.zIndex = '1000';

                    const floatingButton = createResetButton();
                    floatingButton.style.boxShadow = '0 2px 5px rgba(0,0,0,0.3)';
                    floatingButton.addEventListener('click', function() {
                        resetPage();
                    });

                    floatingContainer.appendChild(floatingButton);

                    // Insert before the footer instead of at the end of the body
                    const footer = document.querySelector('footer');
                    if (footer && footer.parentNode) {
                        document.body.insertBefore(floatingContainer, footer);
                    } else {
                        // Fallback to body append if no footer
                        document.body.appendChild(floatingContainer);
                    }
                }
            }
        }
    }

    // Function to reset the search form only
    function resetSearchForm() {
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

        // Focus on business name field
        if (businessNameField) {
            businessNameField.focus();
        }
    }

    // Function to reset the entire page
    function resetPage() {
        // First clear the search
        resetSearchForm();

        // Hide sections that should be hidden initially
        if (isBusinessUpdatePage) {
            // Reset Business Update page
            const businessInfoSection = document.getElementById('business-info-section');
            if (businessInfoSection) {
                businessInfoSection.style.display = 'none';
            }

            // Reset form fields
            resetBusinessUpdateForm();
        }
        else if (isAddPage) {
            // Reset Add page
            const businessInfoSection = document.getElementById('business-info-section');
            if (businessInfoSection) {
                businessInfoSection.style.display = 'none';
            }

            const incentiveSection = document.getElementById('incentive-section');
            if (incentiveSection) {
                incentiveSection.style.display = 'none';
            }

            // Reset form fields
            resetAddForm();
        }
        else if (isUpdatePage) {
            // Reset Update page
            const businessInfoSection = document.getElementById('business-info-section');
            if (businessInfoSection) {
                businessInfoSection.style.display = 'none';
            }

            const incentivesListSection = document.getElementById('incentives-list-section');
            if (incentivesListSection) {
                incentivesListSection.style.display = 'none';
            }

            const incentiveEditSection = document.getElementById('incentive-edit-section');
            if (incentiveEditSection) {
                // Remove any force-display classes that might be preventing proper hiding
                incentiveEditSection.classList.remove('force-display');

                // Set display to none with !important to override any other styles
                incentiveEditSection.setAttribute('style', 'display: none !important');
            }

            // Reset the table container
            const incentivesTableContainer = document.getElementById('incentives-table-container');
            if (incentivesTableContainer) {
                incentivesTableContainer.innerHTML = '';
            }

            // Reset form fields
            resetUpdateForm();
        }
        else if (isViewPage) {
            // Reset View page
            const businessInfoSection = document.getElementById('business-info-section');
            if (businessInfoSection) {
                businessInfoSection.style.display = 'none';
            }

            // Clear any displayed incentives
            const incentivesContainer = document.getElementById('incentives-container');
            if (incentivesContainer) {
                incentivesContainer.innerHTML = '';
            }

            // Remove floating button if it exists
            const floatingButton = document.getElementById('floating-reset-button-container');
            if (floatingButton) {
                floatingButton.remove();
            }
        }

        // Reset hidden fields
        const selectedBusinessId = document.getElementById('selected-business-id');
        if (selectedBusinessId) {
            selectedBusinessId.value = '';
        }

        const selectedIncentiveId = document.getElementById('selected-incentive-id');
        if (selectedIncentiveId) {
            selectedIncentiveId.value = '';
        }

        // Remove any status messages
        const statusMessage = document.getElementById('status-message');
        if (statusMessage) {
            statusMessage.style.display = 'none';
            statusMessage.innerHTML = '';
        }

        // Scroll back to the top of the page
        window.scrollTo(0, 0);

        console.log("Page has been reset");
    }

    // Function to reset the Business Update form
    function resetBusinessUpdateForm() {
        // Reset all business form fields
        resetFormField('bname');
        resetFormField('address1');
        resetFormField('address2');
        resetFormField('city');
        resetFormField('state');
        resetFormField('zip');
        resetFormField('phone');
        resetFormField('type');
        resetFormField('status');
    }

    // Function to reset the Add Incentive form
    function resetAddForm() {
        // Reset business info fields
        resetFormField('bname');
        resetFormField('address1');
        resetFormField('address2');
        resetFormField('city');
        resetFormField('state');
        resetFormField('zip');
        resetFormField('phone');
        resetFormField('type');

        // Reset incentive fields
        const incentiveAvailable = document.getElementById('incentiveAvailable');
        const incentiveNotAvailable = document.getElementById('incentiveNotAvailable');

        if (incentiveAvailable) incentiveAvailable.checked = false;
        if (incentiveNotAvailable) incentiveNotAvailable.checked = false;

        resetFormField('incentiveType');
        resetFormField('incentiveAmount');
        resetFormField('incentiveInfo');

        // Hide other type container
        const otherTypeContainer = document.getElementById('otherTypeContainer');
        if (otherTypeContainer) {
            otherTypeContainer.style.display = 'none';
        }

        resetFormField('otherTypeDescription');

        // Reset discount type radios if they exist
        const discountTypePercentage = document.getElementById('discountTypePercentage');
        if (discountTypePercentage) {
            discountTypePercentage.checked = true;
        }

        const discountTypeDollar = document.getElementById('discountTypeDollar');
        if (discountTypeDollar) {
            discountTypeDollar.checked = false;
        }
    }

    // Function to reset the Update Incentive form
    function resetUpdateForm() {
        // Reset radio buttons
        const incentiveAvailable = document.getElementById('incentiveAvailable');
        const incentiveNotAvailable = document.getElementById('incentiveNotAvailable');

        if (incentiveAvailable) incentiveAvailable.checked = false;
        if (incentiveNotAvailable) incentiveNotAvailable.checked = false;

        // Reset select fields
        resetFormField('incentiveType');

        // Reset other fields
        resetFormField('incentiveAmount');
        resetFormField('incentiveInfo');
        resetFormField('otherTypeDescription');

        // Hide other type container
        const otherTypeContainer = document.getElementById('otherTypeContainer');
        if (otherTypeContainer) {
            otherTypeContainer.style.display = 'none';
        }

        // Reset discount type radios
        const discountTypePercentage = document.getElementById('discountTypePercentage');
        if (discountTypePercentage) {
            discountTypePercentage.checked = true;
        }

        const discountTypeDollar = document.getElementById('discountTypeDollar');
        if (discountTypeDollar) {
            discountTypeDollar.checked = false;
        }

        // Reset business info displays
        const elements = [
            'business-name-display',
            'business-address-display',
            'business-city-state-display',
            'business-phone-display',
            'business-type-display'
        ];

        elements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = '';
            }
        });
    }

    // Helper function to reset a form field
    function resetFormField(fieldId) {
        const field = document.getElementById(fieldId);
        if (field) {
            if (field.tagName === 'SELECT') {
                field.selectedIndex = 0;
            } else if (field.tagName === 'TEXTAREA' || field.tagName === 'INPUT') {
                field.value = '';
            }

            // Remove validation classes if they exist
            field.classList.remove('valid-field');
            field.classList.remove('invalid-field');
            field.classList.remove('disabled-field');
        }
    }

    // Add CSS to handle the force-display issue
    const overrideStyle = document.createElement('style');
    overrideStyle.textContent = `
        /* Higher specificity to override force-display */
        body #incentive-edit-section.hidden-by-reset,
        body #incentives-list-section.hidden-by-reset,
        body #business-info-section.hidden-by-reset {
            display: none !important;
        }
    `;
    document.head.appendChild(overrideStyle);

    // Helper function to apply hidden-by-reset class
    function applyHiddenClass(element) {
        if (element) {
            element.classList.add('hidden-by-reset');
            setTimeout(() => {
                element.style.display = 'none';
                element.setAttribute('style', 'display: none !important');
            }, 10);
        }
    }

    // Modify resetPage to use this approach
    const originalResetPage = resetPage;
    resetPage = function() {
        // Call original function
        originalResetPage();

        // Apply hidden-by-reset class to all sections
        if (isUpdatePage) {
            applyHiddenClass(document.getElementById('incentive-edit-section'));
            applyHiddenClass(document.getElementById('incentives-list-section'));
            applyHiddenClass(document.getElementById('business-info-section'));
        }
    };

    // Add reset buttons to the page - wait for everything to load first
    setTimeout(addResetButtons, 500);

    // Implement automatic reset after form submission
    if (isBusinessUpdatePage) {
        // Handle Business Update form
        const updateForm = document.getElementById('business-update-form');
        if (updateForm) {
            const originalSubmitHandler = updateForm.onsubmit;

            updateForm.addEventListener('submit', function(e) {
                // Only if it doesn't have our custom handler already
                if (!e.target.hasAttribute('data-reset-handler')) {
                    e.target.setAttribute('data-reset-handler', 'true');

                    // Get the submit button
                    const submitButton = document.getElementById('update-submit');
                    const originalText = submitButton ? submitButton.value : 'Update Business';

                    // Show processing state
                    if (submitButton) {
                        submitButton.value = 'Updating...';
                        submitButton.disabled = true;
                    }

                    // Wait for the update to complete, then reset
                    setTimeout(() => {
                        // Show success message
                        const statusMessage = document.getElementById('status-message');
                        if (statusMessage) {
                            statusMessage.className = 'alert alert-success';
                            statusMessage.innerHTML = 'Business updated successfully!';
                            statusMessage.style.display = 'block';
                        }

                        // Reset button
                        if (submitButton) {
                            submitButton.value = originalText;
                            submitButton.disabled = false;
                        }

                        // Auto-reset after delay
                        setTimeout(() => {
                            resetPage();
                        }, 2000);
                    }, 1000);
                }
            });
        }
    }

    // Add a responsive style for the reset button on mobile
    const mobileStyle = document.createElement('style');
    mobileStyle.textContent = `
        @media (max-width: 768px) {
            #reset-button {
                width: 100%;
                padding: 15px;
                font-size: 16px;
                margin-top: 10px;
            }
            
            #reset-button-container {
                margin: 10px 0;
            }
            
            #reset-button-container button {
                box-shadow: 0 2px 5px rgba(0,0,0,0.3);
            }
            
            #floating-reset-button-container {
                width: 80%;
                left: 10%;
                right: 10%;
                bottom: 20px;
                text-align: center;
            }
            
            #floating-reset-button-container button {
                width: 100%;
                padding: 15px;
                font-size: 16px;
                box-shadow: 0 4px 8px rgba(0,0,0,0.3);
            }
        }
    `;
    document.head.appendChild(mobileStyle);

    // Add keyboard shortcut (Alt+R) for resetting
    document.addEventListener('keydown', function(e) {
        if (e.altKey && e.key === 'r') {
            e.preventDefault();
            resetPage();
        }
    });

    // Add automatic handling for success alerts
    // Listen for any alerts that contain success messages
    const originalAlert = window.alert;
    window.alert = function(message) {
        originalAlert(message);

        // If this is a success message, auto-reset after a delay
        if (message && typeof message === 'string' &&
            (message.toLowerCase().includes('success') ||
                message.toLowerCase().includes('added') ||
                message.toLowerCase().includes('updated'))) {
            console.log("Success message detected, scheduling auto-reset");
            setTimeout(() => {
                resetPage();
            }, 1500);
        }
    };

    console.log("Fixed reset functionality setup complete");
});
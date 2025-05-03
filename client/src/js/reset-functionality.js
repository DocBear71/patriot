// reset-functionality.js - Adds auto-reset after submission and start-over buttons
document.addEventListener('DOMContentLoaded', function() {
    console.log("Enhanced Reset Functionality Loaded!");

    // Determine which page we're on based on the HTML structure
    const isAddPage = document.getElementById('incentive-section') !== null;
    const isUpdatePage = document.getElementById('incentive-edit-section') !== null;
    const isViewPage = document.getElementById('incentives-container') !== null;

    console.log("Page detection - Add:", isAddPage, "Update:", isUpdatePage, "View:", isViewPage);

    // Implement automatic reset after form submission
    if (isAddPage) {
        // Override the existing addIncentive function to add auto-reset
        const originalAddIncentive = window.addIncentive;

        if (typeof originalAddIncentive === 'function') {
            window.addIncentive = function(incentiveData) {
                console.log("Enhanced addIncentive called with auto-reset");

                // Call the original function
                originalAddIncentive(incentiveData).then(function(result) {
                    // After successful submission, reset the form
                    console.log("Incentive added successfully, auto-resetting form...");
                    resetPage();
                }).catch(function(error) {
                    // Don't reset on error
                    console.error("Error in incentive submission:", error);
                });
            };
        } else {
            // If original function not found, modify the fetch call in the form submission
            const incentiveForm = document.getElementById('incentive-form');
            if (incentiveForm) {
                // Remove existing event listeners
                const newForm = incentiveForm.cloneNode(true);
                incentiveForm.parentNode.replaceChild(newForm, incentiveForm);

                // Add new event listener with auto-reset
                newForm.addEventListener('submit', function(e) {
                    e.preventDefault();

                    // Get form data (abbreviated - your existing code will handle this)
                    const businessId = document.getElementById('selected-business-id').value;

                    // After form submission succeeds
                    fetch('https://patriotthanks.vercel.app/api/incentives.js', {
                        method: 'POST',
                        // Your existing fetch options
                    })
                        .then(response => response.json())
                        .then(data => {
                            console.log("Incentive added successfully, auto-resetting form...");
                            // Show success message first
                            alert('Incentive added successfully!');
                            // Then reset
                            resetPage();
                        })
                        .catch(error => {
                            console.error("Error adding incentive:", error);
                            alert(`Error adding incentive: ${error.message}`);
                            // Don't reset on error
                        });
                });
            }
        }
    }

    if (isUpdatePage) {
        // Override the existing updateIncentive function
        const originalUpdateIncentive = window.updateIncentive;

        if (typeof originalUpdateIncentive === 'function') {
            window.updateIncentive = function(incentiveData) {
                console.log("Enhanced updateIncentive called with auto-reset");

                const apiURL = `${window.location.hostname === 'localhost' ? 'http://' : 'https://'}${window.location.host}/api/admin-incentives.js?operation=update`;

                // Show loading state
                const submitButton = document.getElementById('update-submit');
                const originalText = submitButton.value;
                submitButton.value = 'Updating...';
                submitButton.disabled = true;

                fetch(apiURL, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json; charset=utf-8",
                        "Authorization": `Bearer ${getAuthToken() || ''}`
                    },
                    body: JSON.stringify(incentiveData)
                })
                    .then(response => {
                        if (!response.ok) {
                            return response.text().then(text => {
                                throw new Error(`Failed to update incentive: ${response.status} ${text}`);
                            });
                        }
                        return response.json();
                    })
                    .then(data => {
                        console.log("Success:", data);
                        // Show success message
                        showMessage('success', "Incentive updated successfully!");
                        // Reset button state
                        submitButton.value = originalText;
                        submitButton.disabled = false;
                        // Auto-reset after success
                        setTimeout(() => {
                            resetPage();
                        }, 2000); // Delay to show message
                    })
                    .catch(error => {
                        console.error("Error:", error);
                        showMessage('error', "Update failed: " + error.message);
                        // Reset button state on error too
                        submitButton.value = originalText;
                        submitButton.disabled = false;
                        // Don't reset form on error
                    });
            };
        }

        // Helper function to get auth token
        function getAuthToken() {
            try {
                const sessionData = localStorage.getItem('patriotThanksSession');
                if (!sessionData) {
                    return null;
                }
                const session = JSON.parse(sessionData);
                return session.token || null;
            } catch (error) {
                console.error('Error retrieving auth token:', error);
                return null;
            }
        }

        // Function to show status messages
        function showMessage(type, message) {
            const messageContainer = document.getElementById('status-message');
            if (messageContainer) {
                messageContainer.innerHTML = message;
                messageContainer.className = 'alert';

                if (type === 'error') {
                    messageContainer.classList.add('alert-danger');
                } else if (type === 'success') {
                    messageContainer.classList.add('alert-success');
                }

                messageContainer.style.display = 'block';
                messageContainer.scrollIntoView({ behavior: 'smooth' });

                // Auto-hide after 5 seconds
                setTimeout(() => {
                    messageContainer.style.display = 'none';
                }, 5000);
            } else {
                alert(message);
            }
        }
    }

    // Create the reset button with appropriate styling
    function createResetButton() {
        const resetButton = document.createElement('button');
        resetButton.id = 'reset-button';
        resetButton.type = 'button';
        resetButton.innerText = 'Start Over';

        resetButton.style.backgroundColor = '#0000ff'; // Changed to blue to match your existing buttons
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

        // Add page-specific reset buttons
        if (isAddPage) {
            // Add page for adding incentives
            const incentiveSection = document.getElementById('incentive-section');
            if (incentiveSection) {
                const resetButtonContainer = createButtonContainer();
                const resetButton = createResetButton();
                resetButton.addEventListener('click', function() {
                    resetPage();
                });

                resetButtonContainer.appendChild(resetButton);
                incentiveSection.appendChild(resetButtonContainer);
            }
        }
        else if (isUpdatePage) {
            // Update page for updating incentives
            const incentiveEditSection = document.getElementById('incentive-edit-section');
            if (incentiveEditSection) {
                const resetButtonContainer = createButtonContainer();
                const resetButton = createResetButton();
                resetButton.addEventListener('click', function() {
                    resetPage();
                });

                resetButtonContainer.appendChild(resetButton);
                incentiveEditSection.appendChild(resetButtonContainer);
            }
        }
        else if (isViewPage) {
            // Create a floating reset button for the view page
            const main = document.querySelector('main');
            if (main) {
                const resetButtonContainer = createButtonContainer();
                const resetButton = createResetButton();
                resetButton.addEventListener('click', function() {
                    resetPage();
                });

                // Style for floating button
                resetButtonContainer.style.position = 'sticky';
                resetButtonContainer.style.bottom = '20px';
                resetButtonContainer.style.zIndex = '1000';

                resetButtonContainer.appendChild(resetButton);
                main.appendChild(resetButtonContainer);

                // Also add to incentives container if it exists
                const incentivesContainer = document.getElementById('incentives-container');
                if (incentivesContainer) {
                    const containerResetButton = createResetButton();
                    containerResetButton.addEventListener('click', function() {
                        resetPage();
                    });

                    // Create a new container to avoid interfering with the floating button
                    const containerButtonHolder = createButtonContainer();
                    containerButtonHolder.appendChild(containerResetButton);
                    incentivesContainer.appendChild(containerButtonHolder);
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
        if (isAddPage) {
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
                incentiveEditSection.style.display = 'none';
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

        // Scroll back to the top of the page
        window.scrollTo(0, 0);

        console.log("Page has been reset");
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
        }
    }

    // Add reset buttons to the page
    addResetButtons();

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
                position: sticky;
                bottom: 10px;
                z-index: 1000;
                margin: 10px 0;
            }
            
            #reset-button-container button {
                box-shadow: 0 2px 5px rgba(0,0,0,0.3);
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

    console.log("Enhanced reset functionality setup complete");
});
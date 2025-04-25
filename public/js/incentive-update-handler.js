// incentive-update-handler.js - Handles business search, incentive selection, and update
document.addEventListener('DOMContentLoaded', function() {
    console.log("Incentive Update Handler Loaded!");

    // Initialize sections display
    const businessInfoSection = document.getElementById('business-info-section');
    const incentivesListSection = document.getElementById('incentives-list-section');
    const incentiveEditSection = document.getElementById('incentive-edit-section');

    if (businessInfoSection) businessInfoSection.style.display = 'none';
    if (incentivesListSection) incentivesListSection.style.display = 'none';
    if (incentiveEditSection) incentiveEditSection.style.display = 'none';

    // Selected business and incentive IDs
    let selectedBusinessId = '';
    let selectedIncentiveId = '';

    // Set up the IncentiveType dropdown to show/hide the "other" field
    const incentiveTypeSelect = document.getElementById('incentiveType');
    const otherTypeContainer = document.getElementById('otherTypeContainer');

    if (incentiveTypeSelect && otherTypeContainer) {
        incentiveTypeSelect.addEventListener('change', function() {
            if (this.value === 'OT') {
                otherTypeContainer.style.display = 'block';
            } else {
                otherTypeContainer.style.display = 'none';
            }
        });
    }

    // Handle radio buttons for incentive availability
    const incentiveAvailable = document.getElementById('incentiveAvailable');
    const incentiveNotAvailable = document.getElementById('incentiveNotAvailable');
    const incentiveFields = [
        document.getElementById('incentiveType'),
        document.getElementById('incentiveAmount'),
        document.getElementById('incentiveInfo')
    ];

    function toggleIncentiveFields() {
        if (!incentiveAvailable || !incentiveNotAvailable) return;

        const isIncentiveAvailable = incentiveAvailable.checked;

        incentiveFields.forEach(field => {
            if (field) {
                field.disabled = !isIncentiveAvailable;

                if (!isIncentiveAvailable) {
                    field.classList.add('disabled-field');
                } else {
                    field.classList.remove('disabled-field');
                }
            }
        });

        if (otherTypeContainer && document.getElementById('otherTypeDescription')) {
            const otherTypeDescription = document.getElementById('otherTypeDescription');
            otherTypeDescription.disabled = !isIncentiveAvailable;

            if (!isIncentiveAvailable) {
                otherTypeContainer.style.display = 'none';
                otherTypeDescription.classList.add('disabled-field');
            } else if (document.getElementById('incentiveType').value === 'OT') {
                otherTypeContainer.style.display = 'block';
                otherTypeDescription.classList.remove('disabled-field');
            }
        }

        if (!isIncentiveAvailable) {
            incentiveFields.forEach(field => {
                if (field) {
                    if (field.tagName === 'SELECT') {
                        field.selectedIndex = 0;
                    } else if (field.tagName === 'TEXTAREA') {
                        field.value = 'No incentives available at this business.';
                    } else if (field.type === 'number') {
                        field.value = '0';
                    }
                }
            });

            if (document.getElementById('otherTypeDescription')) {
                document.getElementById('otherTypeDescription').value = '';
            }
        }
    }

    // Add event listeners for incentive availability radio buttons
    if (incentiveAvailable) {
        incentiveAvailable.addEventListener('change', toggleIncentiveFields);
    }

    if (incentiveNotAvailable) {
        incentiveNotAvailable.addEventListener('change', toggleIncentiveFields);
    }

    // Add event listener for incentive update form submission
    const incentiveUpdateForm = document.getElementById('incentive-update-form');
    if (incentiveUpdateForm) {
        incentiveUpdateForm.addEventListener('submit', function(e) {
            e.preventDefault();

            // Get the incentive ID
            const incentiveId = document.getElementById('selected-incentive-id').value;
            if (!incentiveId) {
                showMessage('error', "Incentive ID is missing. Please select an incentive first.");
                return;
            }

            // Get radio button value for incentive availability
            const checkedRadio = document.querySelector('input[name="incentiveAvailable"]:checked');
            const isAvailable = checkedRadio ? checkedRadio.value === 'true' : null;

            if (isAvailable === null) {
                showMessage('error', "Please specify if the incentive is available.");
                return;
            }

            // Get incentive form data
            const incentiveData = {
                incentiveId: incentiveId,
                business_id: selectedBusinessId,
                is_available: isAvailable
            };

            // Only include type, amount, and info if incentive is available
            if (isAvailable) {
                const incentiveType = document.getElementById('incentiveType').value;

                if (!incentiveType) {
                    showMessage('error', "Please select an incentive type.");
                    return;
                }

                incentiveData.type = incentiveType;
                incentiveData.amount = parseFloat(document.getElementById('incentiveAmount').value) || 0;
                incentiveData.information = document.getElementById('incentiveInfo').value || '';

                // Handle "Other" type description
                if (incentiveType === 'OT') {
                    const otherDescription = document.getElementById('otherTypeDescription').value;
                    if (!otherDescription) {
                        showMessage('error', 'Please provide a description for the "Other" incentive type.');
                        return;
                    }
                    incentiveData.other_description = otherDescription;
                }
            }

            // Submit update
            updateIncentive(incentiveData);
        });
    }

    // FIXED: Added both function names to ensure compatibility
    // Define the selectBusinessForIncentives function (with 's') for business-search.js
    window.selectBusinessForIncentives = function(businessData) {
        console.log("selectBusinessForIncentives called with: ", businessData);
        handleBusinessForIncentives(businessData);
    };

    // Define the selectBusinessForIncentive function (without 's') for business-search.js
    window.selectBusinessForIncentive = function(businessData) {
        console.log("selectBusinessForIncentive called with: ", businessData);
        handleBusinessForIncentives(businessData);
    };

    // Common handler function to process business selection
    function handleBusinessForIncentives(businessData) {
        // Store the business ID
        selectedBusinessId = businessData._id || '';
        console.log("Setting selected business ID to:", selectedBusinessId);

        const businessIdField = document.getElementById('selected-business-id');
        if (businessIdField) {
            businessIdField.value = selectedBusinessId;
            console.log("Business ID field value set to:", businessIdField.value);
        }

        // Display business information
        displayBusinessInfo(businessData);

        // Fetch and display incentives for this business
        fetchIncentives(selectedBusinessId);
    }

    // Display business information
    function displayBusinessInfo(business) {
        if (!business) {
            console.error("No business data provided to displayBusinessInfo");
            return;
        }

        console.log("Displaying business info for:", business.bname);

        // Show the business info section
        if (businessInfoSection) {
            businessInfoSection.style.display = 'block';
            console.log("Business info section display set to:", businessInfoSection.style.display);
        }

        // Populate business details
        const nameDisplay = document.getElementById('business-name-display');
        if (nameDisplay) nameDisplay.textContent = business.bname || '';

        const addressDisplay = document.getElementById('business-address-display');
        if (addressDisplay) {
            let addressText = business.address1 || '';
            if (business.address2) addressText += ', ' + business.address2;
            addressDisplay.textContent = addressText;
        }

        const cityStateDisplay = document.getElementById('business-city-state-display');
        if (cityStateDisplay) {
            let cityStateText = '';
            if (business.city) cityStateText += business.city;
            if (business.state) cityStateText += ', ' + business.state;
            if (business.zip) cityStateText += ' ' + business.zip;
            cityStateDisplay.textContent = cityStateText;
        }

        const phoneDisplay = document.getElementById('business-phone-display');
        if (phoneDisplay) phoneDisplay.textContent = business.phone || '';

        const typeDisplay = document.getElementById('business-type-display');
        if (typeDisplay) typeDisplay.textContent = getBusinessTypeDisplay(business.type) || '';

        // Scroll to the business info section
        businessInfoSection.scrollIntoView({ behavior: 'smooth' });
    }

    // Fetch incentives for the selected business
    async function fetchIncentives(businessId) {
        if (!businessId) {
            console.error("No business ID provided for fetching incentives");
            return;
        }

        try {
            // Show loading state
            const incentivesTableContainer = document.getElementById('incentives-table-container');
            if (incentivesTableContainer) {
                incentivesTableContainer.innerHTML = '<p>Loading incentives...</p>';
            }

            // Show the incentives list section
            if (incentivesListSection) {
                incentivesListSection.style.display = 'block';
                console.log("Incentives list section display set to:", incentivesListSection.style.display);
            }

            // Determine the base URL
            const baseURL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                ? `http://${window.location.host}`
                : 'https://patriotthanks.vercel.app';

            // Use the API endpoint for incentives
            const apiURL = `${baseURL}/api/incentives.js?business_id=${businessId}`;
            console.log("Fetching incentives from:", apiURL);

            const response = await fetch(apiURL);

            if (!response.ok) {
                throw new Error(`Failed to fetch incentives: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            console.log("Incentives data:", data);

            // Display incentives
            displayIncentives(data.results || []);

        } catch (error) {
            console.error("Error fetching incentives:", error);

            const incentivesTableContainer = document.getElementById('incentives-table-container');
            if (incentivesTableContainer) {
                incentivesTableContainer.innerHTML = `<p class="error">Error loading incentives: ${error.message}</p>`;
            }
        }
    }

    // Display incentives in a table
    function displayIncentives(incentives) {
        const incentivesTableContainer = document.getElementById('incentives-table-container');
        if (!incentivesTableContainer) return;

        if (!incentives || incentives.length === 0) {
            incentivesTableContainer.innerHTML = '<p>No incentives found for this business.</p>';
            return;
        }

        let html = `
            <table class="results-table">
                <thead>
                    <tr>
                        <th>Available</th>
                        <th>Type</th>
                        <th>Amount (%)</th>
                        <th>Information</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
        `;

        incentives.forEach(incentive => {
            const available = incentive.is_available ? 'Yes' : 'No';
            const typeLabel = getIncentiveTypeLabel(incentive.type);
            const otherDescription = incentive.type === 'OT' && incentive.other_description
                ? `<br><em>(${incentive.other_description})</em>`
                : '';
            const amount = incentive.is_available ? `${incentive.amount}%` : 'N/A';

            html += `
                <tr>
                    <td>${available}</td>
                    <td>${typeLabel}${otherDescription}</td>
                    <td>${amount}</td>
                    <td>${incentive.information || ''}</td>
                    <td>
                        <button class="select-incentive" data-incentive-id="${incentive._id}">
                            Edit
                        </button>
                    </td>
                </tr>
            `;
        });

        html += `
                </tbody>
            </table>
        `;

        incentivesTableContainer.innerHTML = html;

        // Add event listeners to the edit buttons
        const editButtons = document.querySelectorAll('.select-incentive');
        editButtons.forEach(button => {
            button.addEventListener('click', function() {
                const incentiveId = this.getAttribute('data-incentive-id');
                selectedIncentiveId = incentiveId;
                document.getElementById('selected-incentive-id').value = incentiveId;
                console.log("Selected incentive ID:", incentiveId);

                // Find the selected incentive
                const selectedIncentive = incentives.find(inc => inc._id === incentiveId);
                if (selectedIncentive) {
                    loadIncentiveForEditing(selectedIncentive);
                }
            });
        });

        // Scroll to the incentives list
        incentivesListSection.scrollIntoView({ behavior: 'smooth' });
    }

    // Load an incentive into the edit form
    function loadIncentiveForEditing(incentive) {
        console.log("Loading incentive for editing:", incentive);

        // Show the incentive edit section
        if (incentiveEditSection) {
            incentiveEditSection.style.display = 'block';
            console.log("Incentive edit section display set to:", incentiveEditSection.style.display);
        }

        // Set the availability radio button
        if (incentiveAvailable && incentiveNotAvailable) {
            if (incentive.is_available) {
                incentiveAvailable.checked = true;
                incentiveNotAvailable.checked = false;
            } else {
                incentiveAvailable.checked = false;
                incentiveNotAvailable.checked = true;
            }

            // Update form fields based on availability
            toggleIncentiveFields();
        }

        // Set incentive type
        const incentiveTypeSelect = document.getElementById('incentiveType');
        if (incentiveTypeSelect) {
            for (let i = 0; i < incentiveTypeSelect.options.length; i++) {
                if (incentiveTypeSelect.options[i].value === incentive.type) {
                    incentiveTypeSelect.selectedIndex = i;
                    break;
                }
            }

            // Show/hide the other type description field
            if (incentive.type === 'OT' && otherTypeContainer) {
                otherTypeContainer.style.display = 'block';
                const otherDescriptionField = document.getElementById('otherTypeDescription');
                if (otherDescriptionField) {
                    otherDescriptionField.value = incentive.other_description || '';
                }
            } else if (otherTypeContainer) {
                otherTypeContainer.style.display = 'none';
            }
        }

        // Set incentive amount
        const incentiveAmountField = document.getElementById('incentiveAmount');
        if (incentiveAmountField) {
            incentiveAmountField.value = incentive.amount || 0;
        }

        // Set incentive information
        const incentiveInfoField = document.getElementById('incentiveInfo');
        if (incentiveInfoField) {
            incentiveInfoField.value = incentive.information || '';
        }

        // Scroll to the incentive edit section
        incentiveEditSection.scrollIntoView({ behavior: 'smooth' });
    }

    // Update an incentive in the database
    async function updateIncentive(incentiveData) {
        try {
            // Get user information from session
            const sessionData = localStorage.getItem('patriotThanksSession');
            if (sessionData) {
                const session = JSON.parse(sessionData);
                if (session && session.user && session.user._id) {
                    incentiveData.updated_by = session.user._id; // This is the correct way
                }
            }

            // Add user ID to the form data
            incentiveData.updated_by = userId;

            // Show loading state
            const submitButton = document.getElementById('update-submit');
            const originalText = submitButton.value;
            submitButton.value = 'Updating...';
            submitButton.disabled = true;

            // Determine the base URL
            const baseURL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                ? `http://${window.location.host}`
                : 'https://patriotthanks.vercel.app';

            // Use the API endpoint
            const apiURL = `${baseURL}/api/admin-incentives.js?operation=update`;
            console.log("Submitting to API at:", apiURL);

            const token = getAuthToken();
            const headers = {
                "Content-Type": "application/json; charset=utf-8",
            };

            // Add authorization header if token exists (for admin features)
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(apiURL, {
                method: "PUT",
                headers: headers,
                body: JSON.stringify(incentiveData),
            });

            console.log("Response status:", response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Error response:", errorText);
                throw new Error(`Failed to update incentive: ${response.status} ${errorText}`);
            }

            const data = await response.json();
            console.log("Success:", data);

            // Show success message
            showMessage('success', "Incentive updated successfully!");

            // MODIFIED: Instead of refreshing the incentives list, reset the entire form
            resetFormAfterUpdate();

            // Reset button state
            submitButton.value = originalText;
            submitButton.disabled = false;

        } catch (error) {
            console.error("Error:", error);
            showMessage('error', "Update failed: " + error.message);

            // Reset button state on error too
            const submitButton = document.getElementById('update-submit');
            if (submitButton) {
                submitButton.value = 'Update Incentive';
                submitButton.disabled = false;
            }
        }
    }

    // Function to reset the form after successful update
    function resetFormAfterUpdate() {
        console.log("Resetting form to initial state");

        // Reset business info section
        const businessInfoSection = document.getElementById('business-info-section');
        if (businessInfoSection) {
            businessInfoSection.style.display = 'none';
        }

        // Reset incentives list section
        const incentivesListSection = document.getElementById('incentives-list-section');
        if (incentivesListSection) {
            incentivesListSection.style.display = 'none';

            // Clear incentives table container
            const incentivesTableContainer = document.getElementById('incentives-table-container');
            if (incentivesTableContainer) {
                incentivesTableContainer.innerHTML = '';
            }
        }

        // Reset incentive edit section
        const incentiveEditSection = document.getElementById('incentive-edit-section');
        if (incentiveEditSection) {
            incentiveEditSection.style.display = 'none';
        }

        // Reset business information displays
        const nameDisplay = document.getElementById('business-name-display');
        if (nameDisplay) nameDisplay.textContent = '';

        const addressDisplay = document.getElementById('business-address-display');
        if (addressDisplay) addressDisplay.textContent = '';

        const cityStateDisplay = document.getElementById('business-city-state-display');
        if (cityStateDisplay) cityStateDisplay.textContent = '';

        const phoneDisplay = document.getElementById('business-phone-display');
        if (phoneDisplay) phoneDisplay.textContent = '';

        const typeDisplay = document.getElementById('business-type-display');
        if (typeDisplay) typeDisplay.textContent = '';

        // Reset hidden fields
        const selectedBusinessIdField = document.getElementById('selected-business-id');
        if (selectedBusinessIdField) selectedBusinessIdField.value = '';

        const selectedIncentiveIdField = document.getElementById('selected-incentive-id');
        if (selectedIncentiveIdField) selectedIncentiveIdField.value = '';

        // Reset form fields
        const incentiveTypeSelect = document.getElementById('incentiveType');
        if (incentiveTypeSelect) incentiveTypeSelect.selectedIndex = 0;

        const otherTypeDescription = document.getElementById('otherTypeDescription');
        if (otherTypeDescription) otherTypeDescription.value = '';

        const incentiveAmount = document.getElementById('incentiveAmount');
        if (incentiveAmount) incentiveAmount.value = '';

        const incentiveInfo = document.getElementById('incentiveInfo');
        if (incentiveInfo) incentiveInfo.value = '';

        // Reset otherTypeContainer display
        const otherTypeContainer = document.getElementById('otherTypeContainer');
        if (otherTypeContainer) otherTypeContainer.style.display = 'none';

        // Reset radio buttons
        const incentiveAvailable = document.getElementById('incentiveAvailable');
        if (incentiveAvailable) incentiveAvailable.checked = false;

        const incentiveNotAvailable = document.getElementById('incentiveNotAvailable');
        if (incentiveNotAvailable) incentiveNotAvailable.checked = false;

        // Reset the business search form
        const businessNameField = document.getElementById('business-name');
        if (businessNameField) businessNameField.value = '';

        const addressField = document.getElementById('address');
        if (addressField) addressField.value = '';

        // Clear the business search results
        const resultsContainer = document.getElementById('business-search-results');
        if (resultsContainer) {
            resultsContainer.innerHTML = '';
        }

        // Reset the global variables
        selectedBusinessId = '';
        selectedIncentiveId = '';

        // Scroll to the top of the page
        window.scrollTo(0, 0);

        console.log("Form reset completed");
    }


    // Helper function to get auth token if available
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

            // Scroll to message
            messageContainer.scrollIntoView({ behavior: 'smooth' });

            // Auto-hide after 5 seconds
            setTimeout(() => {
                messageContainer.style.display = 'none';
            }, 5000);
        } else {
            // Fallback to alert if container not found
            if (type === 'error') {
                alert(message);
            } else {
                alert(message);
            }
        }
    }

    // Helper function to convert business type codes to display names
    function getBusinessTypeDisplay(typeCode) {
        const types = {
            'AUTO': 'Automotive',
            'ENT': 'Entertainment',
            'HARDW': 'Hardware',
            'RX': 'Pharmacy',
            'REST': 'Restaurant',
            'RETAIL': 'Retail',
            'Tech': 'Technology',
            'OTHER': 'Other'
        };

        return types[typeCode] || typeCode;
    }

    // Helper function to convert incentive type codes to display names
    function getIncentiveTypeLabel(typeCode) {
        const types = {
            'VT': 'Veteran',
            'AD': 'Active Duty',
            'FR': 'First Responder',
            'SP': 'Spouse',
            'OT': 'Other'
        };

        return types[typeCode] || typeCode;
    }

    // FIXED: Update the global handler for all related pages
    // This helps business-search.js detect we're on the incentive update page
    window.handleBusinessSelection = function(selectedBusiness) {
        console.log("handleBusinessSelection called with:", selectedBusiness);

        // When on incentive-update.html, call our handler
        if (typeof window.selectBusinessForIncentive === 'function') {
            window.selectBusinessForIncentive(selectedBusiness);
        } else if (typeof window.selectBusinessForIncentives === 'function') {
            window.selectBusinessForIncentives(selectedBusiness);
        } else {
            console.error("No incentive handler function found");
        }
    };
});
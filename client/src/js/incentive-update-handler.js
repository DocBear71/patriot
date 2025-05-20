// Enhanced incentive-update-handler.js

document.addEventListener('DOMContentLoaded', function() {
    console.log("Enhanced Incentive Update Handler Loaded!");

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
        document.getElementById('incentiveInfo'),
        // Also disable discount type fields when incentive is not available
        document.getElementById('discountTypePercentage'),
        document.getElementById('discountTypeDollar')
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

        // Also disable the discount type container
        const discountTypeContainer = document.getElementById('discountTypeContainer');
        if (discountTypeContainer) {
            if (!isIncentiveAvailable) {
                discountTypeContainer.classList.add('disabled-container');
            } else {
                discountTypeContainer.classList.remove('disabled-container');
            }
        }

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

            // IMPROVED: Check if this is a chain incentive and the user is admin
            const selectedBusiness = window.selectedBusinessData || {};
            if (selectedBusiness.is_chain) {
                const isAdmin = checkIfUserIsAdmin();
                if (!isAdmin) {
                    showMessage('error', "You don't have permission to update chain incentives.");
                    return;
                }
            }
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

                // Get the discount type (percentage or dollar)
                const discountTypeRadio = document.querySelector('input[name="discountType"]:checked');
                const discountType = discountTypeRadio ? discountTypeRadio.value : 'percentage';

                incentiveData.type = incentiveType;
                incentiveData.discount_type = discountType;
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
        // IMPROVED: Check if this is a chain business
        if (businessData.is_chain) {
            // Check if user is admin
            const isAdmin = checkIfUserIsAdmin();

            if (!isAdmin) {
                // For non-admins, show an error message and don't proceed
                showMessage('error', "Chain businesses can only be modified by administrators. Please select a regular business location instead.");
                return; // Exit early - don't display sections or fetch incentives
            }
        }

        // Store the selected business data for later reference
        window.selectedBusinessData = businessData;

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
            // IMPROVED: Check if this is a chain business and user is not admin
            const selectedBusiness = window.selectedBusinessData;
            if (selectedBusiness && selectedBusiness.is_chain) {
                // Double-check admin status before proceeding
                const isAdmin = checkIfUserIsAdmin();
                if (!isAdmin) {
                    console.error("Non-admin attempting to fetch chain incentives");
                    if (incentivesListSection) {
                        incentivesListSection.style.display = 'none';
                    }
                    showMessage('error', "You don't have permission to view or modify chain incentives.");
                    return;
                }
            }

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
                : window.location.origin;

            // Use the API endpoint for incentives
            const apiURL = `${baseURL}/api/combined-api.js?operation=incentives&business_id=${businessId}`;
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

    // Display incentives in a table - IMPROVED to handle chain incentives
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
                        <th>Amount</th>
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

            // Format the amount based on discount_type
            let amountDisplay = 'N/A';
            if (incentive.is_available) {
                if (incentive.discount_type === 'dollar') {
                    amountDisplay = `$${incentive.amount.toFixed(2)}`;
                } else {
                    // Default to percentage
                    amountDisplay = `${incentive.amount}%`;
                }
            }

            // IMPROVED: Check if this is a chain-wide incentive and the user is not admin
            const isChainWide = incentive.is_chain_wide === true;
            const isAdmin = checkIfUserIsAdmin();

            // For chain-wide incentives, show appropriate badge/button based on user permissions
            let actionButton;
            if (isChainWide) {
                if (isAdmin) {
                    actionButton = `
                        <button class="select-incentive admin-chain" data-incentive-id="${incentive._id}">
                            Edit Chain Incentive
                        </button>
                    `;
                } else {
                    actionButton = `<span class="chain-badge">Chain-wide (admin only)</span>`;
                }
            } else {
                actionButton = `
                    <button class="select-incentive" data-incentive-id="${incentive._id}">
                        Edit
                    </button>
                `;
            }

            // Add chain badge if this is a chain-wide incentive
            const chainBadge = isChainWide ?
                '<span class="chain-badge small">Chain-wide</span>' : '';

            html += `
                <tr>
                    <td>${available}</td>
                    <td>${typeLabel}${otherDescription}</td>
                    <td>${amountDisplay} ${chainBadge}</td>
                    <td>${incentive.information || ''}</td>
                    <td>${actionButton}</td>
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

                // Check if this is a chain incentive and user is not admin
                const isChainButton = this.classList.contains('admin-chain');
                if (isChainButton && !checkIfUserIsAdmin()) {
                    showMessage('error', "You don't have permission to edit chain-wide incentives.");
                    return;
                }

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

    // Load an incentive into the edit form - IMPROVED to handle chain incentives
    function loadIncentiveForEditing(incentive) {
        console.log("Loading incentive for editing:", incentive);

        // IMPROVED: Check if this is a chain-wide incentive and user is not admin
        if (incentive.is_chain_wide && !checkIfUserIsAdmin()) {
            showMessage('error', "Only administrators can edit chain-wide incentives.");
            return;
        }

        // Show the incentive edit section
        if (incentiveEditSection) {
            incentiveEditSection.style.display = 'block';
            console.log("Incentive edit section display set to:", incentiveEditSection.style.display);
        }
        // IMPROVED: Add a warning for chain incentives
        if (incentive.is_chain_wide) {
            // Add a warning banner for chain incentives
            const warningBanner = document.createElement('div');
            warningBanner.className = 'alert alert-warning chain-incentive-warning';
            warningBanner.innerHTML = `
                <strong>Warning:</strong> You are editing a chain-wide incentive. 
                Changes will affect all locations of this chain nationwide.
            `;

            // Insert at the top of the edit section
            const existingWarning = incentiveEditSection.querySelector('.chain-incentive-warning');
            if (!existingWarning) {
                incentiveEditSection.insertBefore(warningBanner, incentiveEditSection.firstChild);
            }
        } else {
            // Remove any existing warnings
            const existingWarning = incentiveEditSection.querySelector('.chain-incentive-warning');
            if (existingWarning) {
                existingWarning.remove();
            }
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

        // Set discount type radio buttons
        const discountTypePercentage = document.getElementById('discountTypePercentage');
        const discountTypeDollar = document.getElementById('discountTypeDollar');

        if (discountTypePercentage && discountTypeDollar) {
            // Check if the incentive has a discount_type
            if (incentive.discount_type === 'dollar') {
                discountTypeDollar.checked = true;
                discountTypePercentage.checked = false;

                // Update the label to show $ instead of %
                const amountLabel = document.getElementById('amountLabel');
                if (amountLabel) {
                    amountLabel.textContent = 'Incentive Amount in $';
                }
            } else {
                // Default to percentage
                discountTypePercentage.checked = true;
                discountTypeDollar.checked = false;

                // Update the label to show %
                const amountLabel = document.getElementById('amountLabel');
                if (amountLabel) {
                    amountLabel.textContent = 'Incentive Amount as a %';
                }
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
    // Update an incentive in the database - IMPROVED to handle chain permissions
    async function updateIncentive(incentiveData) {
        try {
            // IMPROVED: Double check chain permissions
            const selectedBusiness = window.selectedBusinessData;
            const isChainBusiness = selectedBusiness && selectedBusiness.is_chain;

            if (isChainBusiness) {
                const isAdmin = checkIfUserIsAdmin();
                if (!isAdmin) {
                    showMessage('error', "You don't have permission to update chain incentives.");
                    return;
                }
            }

            // Get user information from session
            const sessionData = localStorage.getItem('patriotThanksSession');
            if (sessionData) {
                const session = JSON.parse(sessionData);
                if (session && session.user && session.user._id) {
                    incentiveData.updated_by = session.user._id;
                }
            }

            // Show loading state
            const submitButton = document.getElementById('update-submit');
            const originalText = submitButton.value;
            submitButton.value = 'Updating...';
            submitButton.disabled = true;

            // Determine the base URL
            const baseURL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                ? `http://${window.location.host}`
                : window.location.origin;

            // Use the API endpoint
            const apiURL = `${baseURL}/api/combined-api.js?operation=admin-incentives&action=update`;
            console.log("Submitting to API at:", apiURL);
            console.log("Incentive data:", incentiveData);

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

            // IMPROVED: Reset the entire form instead of just refreshing incentives
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

    // IMPROVED: Complete reset function for the entire form
    function resetFormAfterUpdate() {
        console.log("Resetting form to initial state");

        // Reset business info section
        if (businessInfoSection) {
            businessInfoSection.style.display = 'none';
        }

        // Reset incentives list section
        if (incentivesListSection) {
            incentivesListSection.style.display = 'none';

            // Clear incentives table container
            const incentivesTableContainer = document.getElementById('incentives-table-container');
            if (incentivesTableContainer) {
                incentivesTableContainer.innerHTML = '';
            }
        }
        // Reset incentive edit section
        if (incentiveEditSection) {
            incentiveEditSection.style.display = 'none';

            // Remove any chain warning banners
            const chainWarning = incentiveEditSection.querySelector('.chain-incentive-warning');
            if (chainWarning) {
                chainWarning.remove();
            }
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
        if (incentiveTypeSelect) {
            incentiveTypeSelect.selectedIndex = 0;
            incentiveTypeSelect.disabled = false;
        }

        const otherTypeDescription = document.getElementById('otherTypeDescription');
        if (otherTypeDescription) {
            otherTypeDescription.value = '';
            otherTypeDescription.disabled = false;
        }

        const incentiveAmount = document.getElementById('incentiveAmount');
        if (incentiveAmount) {
            incentiveAmount.value = '';
            incentiveAmount.disabled = false;
        }

        const incentiveInfo = document.getElementById('incentiveInfo');
        if (incentiveInfo) {
            incentiveInfo.value = '';
            incentiveInfo.disabled = false;
        }

        // Reset discount type radio buttons
        const discountTypePercentage = document.getElementById('discountTypePercentage');
        if (discountTypePercentage) {
            discountTypePercentage.checked = true;
            discountTypePercentage.disabled = false;
        }
        const discountTypeDollar = document.getElementById('discountTypeDollar');
        if (discountTypeDollar) {
            discountTypeDollar.checked = false;
            discountTypeDollar.disabled = false;
        }

        // Reset amount label
        const amountLabel = document.getElementById('amountLabel');
        if (amountLabel) amountLabel.textContent = 'Incentive Amount as a %';

        // Reset otherTypeContainer display
        if (otherTypeContainer) otherTypeContainer.style.display = 'none';

        // Reset radio buttons
        if (incentiveAvailable) {
            incentiveAvailable.checked = false;
            incentiveAvailable.disabled = false;
        }

        if (incentiveNotAvailable) {
            incentiveNotAvailable.checked = false;
            incentiveNotAvailable.disabled = false;
        }

        // Reset the business search form
        const businessNameField = document.getElementById('business-name');
        if (businessNameField) {
            businessNameField.value = '';
            businessNameField.disabled = false;
        }

        const addressField = document.getElementById('address');
        if (addressField) {
            addressField.value = '';
            addressField.disabled = false;
        }

        // Re-enable search button
        const searchButton = document.querySelector('#business-search-form input[type="submit"]');
        if (searchButton) {
            searchButton.disabled = false;
            searchButton.style.cursor = 'pointer';
        }

        // Clear the business search results
        const resultsContainer = document.getElementById('business-search-results');
        if (resultsContainer) {
            resultsContainer.innerHTML = '';
        }

        // Reset the global variables
        selectedBusinessId = '';
        selectedIncentiveId = '';
        window.selectedBusinessData = null;

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
            'BEAU': 'Beauty',
            'BOOK': 'Bookstore',
            'CLTH': 'Clothing',
            'CONV': 'Convenience Store/Gas Station',
            'DEPT': 'Department Store',
            'ELEC': 'Electronics',
            'ENTR': 'Entertainment',
            'FURN': 'Furniture',
            'FUEL': 'Fuel Station/Truck Stop',
            'GIFT': 'Gift Shop',
            'GROC': 'Grocery',
            'HARDW': 'Hardware',
            'HEAL': 'Health',
            'JEWL': 'Jewelry',
            'OTHER': 'Other',
            'RX': 'Pharmacy',
            'REST': 'Restaurant',
            'RETAIL': 'Retail',
            'SERV': 'Service',
            'SPEC': 'Specialty',
            'SPRT': 'Sporting Goods',
            'TECH': 'Technology',
            'TOYS': 'Toys'
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

    // Add validation functions for the incentive update form
    function isNotEmpty(value) {
        return value && value.trim() !== '';
    }

    function isValidNumber(value) {
        return !isNaN(value) && value >= 0;
    }

    // Function to validate fields and provide visual feedback
    function validateField(field, validationFn) {
        console.log(`Validating ${field.id} with value: ${field.value}`);

        if (validationFn(field.value)) {
            field.classList.remove('invalid-field');
            field.classList.add('valid-field');
            field.setAttribute('data-valid', 'true');
            console.log(`${field.id} is VALID`);
            return true;
        } else {
            field.classList.remove('valid-field');
            field.classList.add('invalid-field');
            field.setAttribute('data-valid', 'false');
            console.log(`${field.id} is INVALID`);
            return false;
        }
    }

    // Function to validate the entire update form
    function validateUpdateForm() {
        // Check if a business and incentive are selected
        const businessIdField = document.getElementById('selected-business-id');
        const incentiveIdField = document.getElementById('selected-incentive-id');

        if (!businessIdField || !businessIdField.value) {
            showMessage('error', 'Please select a business first');
            return false;
        }

        if (!incentiveIdField || !incentiveIdField.value) {
            showMessage('error', 'Please select an incentive to update');
            return false;
        }

        // Check if availability option is selected
        const incentiveAvailableOption = document.querySelector('input[name="incentiveAvailable"]:checked');
        if (!incentiveAvailableOption) {
            showMessage('error', 'Please specify if the incentive is available');
            return false;
        }

        // Get availability value
        const isAvailable = document.getElementById('incentiveAvailable').checked;
        let formIsValid = true;

        // If incentives are available, validate the incentive fields
        if (isAvailable) {
            const typeField = document.getElementById('incentiveType');
            const amountField = document.getElementById('incentiveAmount');
            const infoField = document.getElementById('incentiveInfo');

            if (typeField && !validateField(typeField, isNotEmpty)) {
                formIsValid = false;
                showMessage('error', 'Please select an incentive type');
            }

            if (amountField && !validateField(amountField, isValidNumber)) {
                formIsValid = false;
                showMessage('error', 'Please enter a valid amount (0 or greater)');
            }

            if (infoField && !validateField(infoField, isNotEmpty)) {
                formIsValid = false;
                showMessage('error', 'Please provide information about the incentive');
            }
            // Check for "Other" type description if needed
            if (typeField && typeField.value === 'OT') {
                const otherDescField = document.getElementById('otherTypeDescription');
                if (otherDescField && !validateField(otherDescField, isNotEmpty)) {
                    formIsValid = false;
                    showMessage('error', 'Please provide a description for the "Other" incentive type');
                }
            }
        }

        return formIsValid;
    }

    // Add event listeners for field validation
    const incentiveTypeField = document.getElementById('incentiveType');
    const incentiveAmountField = document.getElementById('incentiveAmount');
    const incentiveInfoField = document.getElementById('incentiveInfo');
    const otherTypeDescField = document.getElementById('otherTypeDescription');

    if (incentiveTypeField) {
        incentiveTypeField.addEventListener('change', function() {
            validateField(this, isNotEmpty);
        });
    }

    if (incentiveAmountField) {
        incentiveAmountField.addEventListener('input', function() {
            validateField(this, isValidNumber);
        });
    }

    if (incentiveInfoField) {
        incentiveInfoField.addEventListener('input', function() {
            validateField(this, isNotEmpty);
        });
    }

    if (otherTypeDescField) {
        otherTypeDescField.addEventListener('input', function() {
            if (incentiveTypeField && incentiveTypeField.value === 'OT') {
                validateField(this, isNotEmpty);
            }
        });
    }

    // Update the incentive form submit handler to use the validation function
    if (incentiveUpdateForm) {
        // Remove previous listeners to avoid duplicates
        const newUpdateForm = incentiveUpdateForm.cloneNode(true);
        incentiveUpdateForm.parentNode.replaceChild(newUpdateForm, incentiveUpdateForm);

        // Add a new submit handler with validation
        newUpdateForm.addEventListener('submit', function(e) {
            e.preventDefault();

            // IMPROVED: Additional check for chain incentive permissions
            const selectedBusiness = window.selectedBusinessData || {};
            if (selectedBusiness.is_chain) {
                const isAdmin = checkIfUserIsAdmin();
                if (!isAdmin) {
                    showMessage('error', "You don't have permission to update chain incentives.");
                    return;
                }
            }

            // Validate the form before submission
            if (!validateUpdateForm()) {
                return;
            }

            // Get the incentive ID
            const incentiveId = document.getElementById('selected-incentive-id').value;

            // Get radio button value for incentive availability
            const isAvailable = document.getElementById('incentiveAvailable').checked;

            // Get incentive form data
            const incentiveData = {
                incentiveId: incentiveId,
                business_id: selectedBusinessId,
                is_available: isAvailable
            };
            // Only include type, amount, and info if incentive is available
            if (isAvailable) {
                const incentiveType = document.getElementById('incentiveType').value;

                // Get the discount type (percentage or dollar)
                const discountTypeRadio = document.querySelector('input[name="discountType"]:checked');
                const discountType = discountTypeRadio ? discountTypeRadio.value : 'percentage';

                incentiveData.type = incentiveType;
                incentiveData.discount_type = discountType;
                incentiveData.amount = parseFloat(document.getElementById('incentiveAmount').value) || 0;
                incentiveData.information = document.getElementById('incentiveInfo').value || '';

                // Handle "Other" type description
                if (incentiveType === 'OT') {
                    const otherDescription = document.getElementById('otherTypeDescription').value;
                    incentiveData.other_description = otherDescription;
                }
            }

            // Submit update
            updateIncentive(incentiveData);
        });
    }

    // Add asterisks to required fields
    function addAsterisksToRequiredFields() {
        // Define the IDs of required fields based on your validation logic
        const requiredFieldIds = [
            "incentiveType", "incentiveAmount", "incentiveInfo"
        ];

        // Add asterisks to each required field's label
        requiredFieldIds.forEach(id => {
            const field = document.getElementById(id);
            if (field) {
                const label = document.querySelector(`label[for="${id}"]`);

                if (label && !label.innerHTML.includes('*')) {
                    const asterisk = document.createElement('span');
                    asterisk.className = 'required-indicator';
                    asterisk.textContent = ' *';
                    asterisk.style.color = 'red'; // Match your existing color scheme
                    label.appendChild(asterisk);
                }
            }
        });

        // Also add an asterisk to the incentive availability option labels
        const radioLabels = document.querySelectorAll('label[for="incentiveAvailable"], label[for="incentiveNotAvailable"]');
        radioLabels.forEach(label => {
            if (!label.innerHTML.includes('*')) {
                const asterisk = document.createElement('span');
                asterisk.className = 'required-indicator';
                asterisk.textContent = ' *';
                asterisk.style.color = 'red';
                label.appendChild(asterisk);
            }
        });

        // Add explanation at the top of the form
        const form = document.getElementById("incentive-update-form");
        if (form) {
            const explanation = document.createElement('div');
            explanation.className = 'form-explanation';
            explanation.innerHTML = '<p>Fields marked with an asterisk (*) are required.</p>';
            form.insertBefore(explanation, form.firstChild);
        }
    }
    // Add CSS styles for form validation
    const style = document.createElement('style');
    style.textContent += `
        .valid-field {
            border: 1px solid green !important;
            background-color: #f0fff0 !important;
        }
        
        .invalid-field {
            border: 1px solid red !important;
            background-color: #fff0f0 !important;
        }
        
        .required-indicator {
            color: red;
            font-weight: bold;
        }
        
        .form-explanation {
            margin-bottom: 15px;
            font-style: italic;
        }
        
        .disabled-container {
            opacity: 0.5;
            pointer-events: none;
        }
        
        /* IMPROVED: Add styles for the chain badges */
        .chain-badge {
            background-color: #4285F4;
            color: white;
            border-radius: 4px;
            padding: 3px 6px;
            font-size: 12px;
            display: inline-block;
        }
        
        .chain-badge.small {
            font-size: 10px;
            padding: 2px 4px;
        }
        
        /* IMPROVED: Add styles for admin chain buttons */
        .select-incentive.admin-chain {
            background-color: #9C27B0;
            color: white;
        }
        
        /* IMPROVED: Warning banner for chain incentives */
        .chain-incentive-warning {
            background-color: #FFF3CD;
            color: #856404;
            border: 1px solid #FFEEBA;
            padding: 10px;
            margin-bottom: 15px;
            border-radius: 4px;
        }
    `;
    document.head.appendChild(style);

    // Call the function to add asterisks
    addAsterisksToRequiredFields();
});

/**
 * Check if the current user is an admin
 * @returns {boolean} True if user is admin
 */
function checkIfUserIsAdmin() {
    try {
        // Get session data from localStorage
        const sessionData = localStorage.getItem('patriotThanksSession');
        if (!sessionData) return false;

        const session = JSON.parse(sessionData);

        // Check if user has admin privileges
        return (session.user && (session.user.isAdmin === true || session.user.level === 'Admin'));
    } catch (error) {
        console.error("Error checking admin status:", error);
        return false;
    }
}
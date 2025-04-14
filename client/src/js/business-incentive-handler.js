// business-incentive-handler.js - Handles business search and incentive addition

document.addEventListener('DOMContentLoaded', function() {
    // Get form elements
    const searchForm = document.getElementById('business-search-form');
    const incentiveForm = document.getElementById('incentive-form');
    const resultsContainer = document.getElementById('search-results');

    // Initialize business info section display
    const businessInfoSection = document.getElementById('business-info-section');
    if (businessInfoSection) {
        businessInfoSection.style.display = 'none';
    }

    // Initialize incentive section display
    const incentiveSection = document.getElementById('incentive-section');
    if (incentiveSection) {
        incentiveSection.style.display = 'none';
    }

    // Event listener for the business search form
    if (searchForm) {
        searchForm.addEventListener('submit', function(e) {
            e.preventDefault();

            // Get search form values
            const businessName = document.getElementById('business-name').value.trim();
            const address = document.getElementById('address').value.trim();

            // Validate search input
            if (!businessName && !address) {
                alert('Please enter a business name or address to search');
                return;
            }

            // Perform the search
            searchBusiness(businessName, address);
        });
    }

    // Event listener for the incentive form
    if (incentiveForm) {
        incentiveForm.addEventListener('submit', function(e) {
            e.preventDefault();

            // Get incentive form values
            const businessId = document.getElementById('selected-business-id').value;
            const incentiveType = document.getElementById('IncentiveType').value;
            const incentiveAmount = document.getElementById('incentiveAmount').value;
            const incentiveInfo = document.getElementById('incentiveInfo').value;
            const incentiveAvailable = document.querySelector('input[name="incentiveAvailable"]:checked')?.value;

            // Validate incentive input
            if (!businessId) {
                alert('Please select a business first');
                return;
            }

            if (!incentiveAvailable) {
                alert('Please specify if an incentive is available');
                return;
            }

            if (incentiveAvailable === 'true' && (!incentiveType || !incentiveAmount)) {
                alert('Please provide incentive type and amount');
                return;
            }

            // Create the incentive data
            const incentiveData = {
                business_id: businessId,
                is_available: incentiveAvailable === 'true',
                type: incentiveType,
                amount: incentiveAmount,
                information: incentiveInfo
            };

            // Submit the incentive
            addIncentive(incentiveData);
        });
    }

    // Function to search for businesses
    function searchBusiness(businessName, address) {
        // Show loading indicator
        if (resultsContainer) {
            resultsContainer.innerHTML = '<p>Searching...</p>';
        }

        // Build query parameters
        const queryParams = new URLSearchParams();
        if (businessName) queryParams.append('businessName', businessName);
        if (address) queryParams.append('address', address);

        // Make API call to your server endpoint
        fetch(`/api/business-search?${queryParams.toString()}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                if (data.results && Array.isArray(data.results)) {
                    displaySearchResults(data.results);
                } else {
                    throw new Error('Invalid response format');
                }
            })
            .catch(error => {
                if (resultsContainer) {
                    resultsContainer.innerHTML = `<p class="error">Error searching for businesses: ${error.message}</p>`;
                }
            });
    }

    // Function to display search results
    function displaySearchResults(results) {
        if (!resultsContainer) return;

        if (results.length === 0) {
            resultsContainer.innerHTML = '<p>No businesses found matching your search criteria.</p>';
            return;
        }

        // Create a table to display results
        let html = `
            <h3>Search Results</h3>
            <table class="results-table">
                <thead>
                    <tr>
                        <th>Business Name</th>
                        <th>Address</th>
                        <th>City</th>
                        <th>State</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
        `;

        // Add each business to the table
        results.forEach(business => {
            html += `
                <tr>
                    <td>${business.bname || 'N/A'}</td>
                    <td>${business.address1 || 'N/A'} ${business.address2 ? business.address2 : ''}</td>
                    <td>${business.city || 'N/A'}</td>
                    <td>${business.state || 'N/A'}</td>
                    <td><button class="select-business" data-id="${business._id}" data-business='${JSON.stringify(business)}'>Select</button></td>
                </tr>
            `;
        });

        html += `
                </tbody>
            </table>
        `;

        // Update the results container
        resultsContainer.innerHTML = html;

        // Add event listeners to the select buttons
        document.querySelectorAll('.select-business').forEach(button => {
            button.addEventListener('click', function() {
                const businessId = this.getAttribute('data-id');
                const businessData = JSON.parse(this.getAttribute('data-business'));
                selectBusiness(businessId, businessData);
            });
        });
    }

    // Function to select a business and populate the incentive form
    function selectBusiness(businessId, businessData) {
        // Show the business info section
        if (businessInfoSection) {
            businessInfoSection.style.display = 'block';
        }

        // Populate the hidden field with the business ID
        const businessIdField = document.getElementById('selected-business-id');
        if (businessIdField) {
            businessIdField.value = businessId;
        }

        // Populate the business info fields for confirmation
        populateField('bname', businessData.bname);
        populateField('address1', businessData.address1);
        populateField('address2', businessData.address2);
        populateField('city', businessData.city);
        populateField('state', businessData.state);
        populateField('zip', businessData.zip);
        populateField('phone', businessData.phone);
        populateField('type', businessData.type);

        // Make business info fields readonly since we're just displaying selected business
        document.querySelectorAll('#business-info-section input, #business-info-section select').forEach(el => {
            if (el.tagName.toLowerCase() === 'select') {
                el.disabled = true;
            } else {
                el.setAttribute('readonly', true);
            }
        });

        // Show the incentive section
        if (incentiveSection) {
            incentiveSection.style.display = 'block';
        }

        // Scroll to the incentive section
        if (incentiveSection) {
            incentiveSection.scrollIntoView({ behavior: 'smooth' });
        }
    }

    // Helper function to safely populate form fields
    function populateField(fieldId, value) {
        const field = document.getElementById(fieldId);
        if (field) {
            field.value = value || '';
        }
    }

    // Function to add an incentive
    function addIncentive(incentiveData) {
        // Show loading indicator
        const submitButton = document.querySelector('#incentive-form input[type="submit"]');
        let originalText = 'Submit Incentive';
        if (submitButton) {
            originalText = submitButton.value;
            submitButton.value = 'Submitting...';
            submitButton.disabled = true;
        }

        // Make API call to your server endpoint
        fetch('/api/incentives/add', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(incentiveData)
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                alert('Incentive added successfully!');
                // Reset the incentive form but keep the business selected
                resetField('IncentiveType');
                resetField('incentiveAmount');
                resetField('incentiveInfo', 'Please enter information about the discount/incentive.');
                document.querySelectorAll('input[name="incentiveAvailable"]').forEach(radio => {
                    radio.checked = false;
                });
            })
            .catch(error => {
                alert(`Error adding incentive: ${error.message}`);
            })
            .finally(() => {
                // Restore submit button
                if (submitButton) {
                    submitButton.value = originalText;
                    submitButton.disabled = false;
                }
            });
    }

    // Helper function to safely reset form fields
    function resetField(fieldId, defaultValue = '') {
        const field = document.getElementById(fieldId);
        if (field) {
            field.value = defaultValue;
        }
    }
});
// business-incentive-viewer.js - Handles business search and incentive viewing

document.addEventListener('DOMContentLoaded', function() {
    // Get form elements
    const searchForm = document.getElementById('business-search-form');
    const resultsContainer = document.getElementById('search-results');
    const businessInfoSection = document.getElementById('business-info-section');

    // Initially hide the business info section until a business is selected
    if (businessInfoSection) {
        businessInfoSection.style.display = 'none';
    }

    // Create a div for displaying incentives
    const incentivesContainer = document.createElement('div');
    incentivesContainer.id = 'incentives-container';

    // Add the incentives container after the business info section
    if (businessInfoSection) {
        businessInfoSection.insertAdjacentElement('afterend', incentivesContainer);
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

    // Function to search for businesses
    function searchBusiness(businessName, address) {
        // Show loading indicator
        if (resultsContainer) {
            resultsContainer.innerHTML = '<p>Searching...</p>';
        }

        // Hide any previously displayed business info or incentives
        if (businessInfoSection) {
            businessInfoSection.style.display = 'none';
        }
        if (incentivesContainer) {
            incentivesContainer.innerHTML = '';
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
                    <td><button class="select-business" data-id="${business._id}" data-business='${JSON.stringify(business)}'>View Incentives</button></td>
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

    // Function to select a business and display its info
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

        // Populate the business info fields for display
        populateField('bname', businessData.bname);
        populateField('address1', businessData.address1);
        populateField('address2', businessData.address2);
        populateField('city', businessData.city);
        populateField('state', businessData.state);
        populateField('zip', businessData.zip);
        populateField('phone', businessData.phone);
        populateField('type', businessData.type);

        // Fetch and display incentives for this business
        fetchIncentives(businessId, businessData.bname);
    }

    // Helper function to safely populate form fields
    function populateField(fieldId, value) {
        const field = document.getElementById(fieldId);
        if (field) {
            field.value = value || '';
        }
    }

    // Function to fetch and display incentives for a business
    function fetchIncentives(businessId, businessName) {
        // Show loading indicator
        incentivesContainer.innerHTML = '<p>Loading incentives...</p>';

        // Fetch incentives from API
        fetch(`/api/incentives/${businessId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to fetch incentives');
                }
                return response.json();
            })
            .then(data => {
                // Create a fieldset for the incentives
                let html = `
                    <fieldset id="incentives-section">
                        <legend>
                            <h3 class="caveat">Step 3: View Incentives for ${businessName}</h3>
                        </legend>
                `;

                if (!data.results || data.results.length === 0) {
                    html += '<p>No incentives found for this business.</p>';
                } else {
                    html += `
                        <table class="results-table">
                            <thead>
                                <tr>
                                    <th>Available</th>
                                    <th>Type</th>
                                    <th>Amount (%)</th>
                                    <th>Information</th>
                                    <th>Date Added</th>
                                </tr>
                            </thead>
                            <tbody>
                    `;

                    data.results.forEach(incentive => {
                        const date = new Date(incentive.created_at).toLocaleDateString();
                        const available = incentive.is_available ? 'Yes' : 'No';
                        const type = getIncentiveTypeLabel(incentive.type);
                        const otherDescription = incentive.other_description ?
                            `<br><em>(${incentive.other_description})</em>` : '';

                        html += `
                            <tr>
                                <td>${available}</td>
                                <td>${type}${otherDescription}</td>
                                <td>${incentive.is_available ? incentive.amount + '%' : 'N/A'}</td>
                                <td>${incentive.information}</td>
                                <td>${date}</td>
                            </tr>
                        `;
                    });

                    html += `
                            </tbody>
                        </table>
                    `;
                }

                html += `</fieldset>`;

                // Update the incentives container
                incentivesContainer.innerHTML = html;

                // Scroll to the incentives section
                document.getElementById('incentives-section').scrollIntoView({ behavior: 'smooth' });
            })
            .catch(error => {
                incentivesContainer.innerHTML = `<p class="error">Error fetching incentives: ${error.message}</p>`;
            });
    }

    // Helper function to convert incentive type codes to readable labels
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
});
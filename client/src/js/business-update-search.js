/**
 * Business Update Search Handler
 * Simplified version of business-search-improved.js for update functionality
 * Focuses on table display without map integration
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log("Business Update Search Handler Loaded!");

    // Initialize search functionality for update page
    initUpdateBusinessSearch();
});

/**
 * Initialize business search functionality for update page (no map required)
 */
function initUpdateBusinessSearch() {
    console.log("Initializing update business search...");

    // Get form elements
    const form = {
        businessName: document.getElementById("business-name"),
        address: document.getElementById("address")
    };

    // Get the form element
    const searchForm = document.getElementById("business-search-form");

    if (searchForm) {
        searchForm.addEventListener('submit', async function (event) {
            // Prevent the form from submitting immediately
            event.preventDefault();

            // Check if at least one field is filled
            if (!form.businessName?.value && !form.address?.value) {
                alert("Please enter either a business name or an address to search");
                return;
            }

            const formData = {
                businessName: form.businessName?.value || '',
                address: form.address?.value || ''
            };

            console.log("Update search form data:", formData);

            // Perform search without map integration
            await performUpdateBusinessSearch(formData);
        });
    } else {
        console.warn("Business search form not found in the DOM");
    }

    // Add input validation listeners
    if (form.businessName) {
        form.businessName.addEventListener('input', function () {
            validateUpdateField(this, isNotEmpty);
        });
    }

    if (form.address) {
        form.address.addEventListener('input', function () {
            validateUpdateField(this, isNotEmpty);
        });
    }
}

/**
 * Perform business search for update page (table only, no map)
 */
async function performUpdateBusinessSearch(formData) {
    try {
        console.log("Performing update business search:", formData);

        // Show loading indicator
        showUpdateLoadingIndicator();

        // Search the database
        const searchResults = await searchDatabaseForUpdate(formData);

        console.log(`Found ${searchResults.length} businesses for update`);

        // Display results in table format
        displayUpdateSearchResults(searchResults);

    } catch (error) {
        console.error("Error in update business search:", error);
        hideUpdateLoadingIndicator();
        showUpdateErrorMessage("Error searching for businesses: " + error.message);
    }
}

/**
 * Search database for update functionality
 */
async function searchDatabaseForUpdate(formData) {
    try {
        const baseURL = getUpdateBaseURL();
        const params = new URLSearchParams();

        params.append('operation', 'search');

        if (formData.businessName && formData.businessName.trim() !== '') {
            params.append('business_name', formData.businessName);
        }

        if (formData.address && formData.address.trim() !== '') {
            params.append('address', formData.address);
        }

        const apiURL = `${baseURL}/api/business.js?${params.toString()}`;
        console.log("Update search API URL:", apiURL);

        const response = await fetch(apiURL, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json; charset=UTF-8'
            }
        });

        if (!response.ok) {
            throw new Error(`Database search failed: ${response.status}`);
        }

        const data = await response.json();
        const rawResults = data.results || [];

        // Filter out parent chain businesses from update results
        const filteredResults = rawResults.filter(business => {
            if (business.is_chain === true) {
                console.log(`Filtering out parent chain business: ${business.bname}`);
                return false;
            }
            return true;
        });

        console.log(`Filtered ${rawResults.length} raw results to ${filteredResults.length} updatable businesses`);

        return filteredResults;

    } catch (error) {
        console.error("Error searching database for update:", error);
        throw error;
    }
}

/**
 * Display search results in table format for update page
 */
function displayUpdateSearchResults(businesses) {
    try {
        console.log(`Displaying ${businesses.length} businesses for update`);

        // Hide loading indicator
        hideUpdateLoadingIndicator();

        // Get the results container
        const resultsContainer = document.getElementById('business-search-results');

        if (!resultsContainer) {
            console.error("Results container not found");
            showUpdateErrorMessage("Results container not found. Please refresh the page.");
            return;
        }

        // Clear existing content
        resultsContainer.innerHTML = '';

        if (businesses.length === 0) {
            resultsContainer.innerHTML = `
                <div class="no-results-message">
                    <h3>No businesses found</h3>
                    <p>No businesses match your search criteria. Please try different search terms.</p>
                </div>
            `;
            resultsContainer.style.display = 'block';
            return;
        }

        // Create results table
        const tableHTML = createUpdateResultsTable(businesses);
        resultsContainer.innerHTML = tableHTML;
        resultsContainer.style.display = 'block';

        // Scroll to results
        resultsContainer.scrollIntoView({ behavior: 'smooth' });

        console.log("Update search results displayed successfully");

    } catch (error) {
        console.error("Error displaying update search results:", error);
        showUpdateErrorMessage("Error displaying search results: " + error.message);
    }
}

/**
 * Create results table HTML for update page
 */
function createUpdateResultsTable(businesses) {
    let tableHTML = `
        <div class="update-results-container">
            <h3>Search Results (${businesses.length} businesses found)</h3>
            <div class="results-table-container">
                <table class="results-table">
                    <thead>
                        <tr>
                            <th>Business Name</th>
                            <th>Address</th>
                            <th>Type</th>
                            <th>Status</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
    `;

    businesses.forEach(business => {
        // Format address
        let addressText = '';
        if (business.address1) {
            addressText = business.address1;
            if (business.address2) addressText += ', ' + business.address2;
            if (business.city) addressText += ', ' + business.city;
            if (business.state) addressText += ', ' + business.state;
            if (business.zip) addressText += ' ' + business.zip;
        }

        // Get business type label
        const businessType = getUpdateBusinessTypeLabel(business.type);

        // Status
        const status = business.status || 'active';
        const statusClass = status === 'active' ? 'status-active' : 'status-inactive';

        // Chain badge
        const chainBadge = business.chain_id ?
            '<span class="chain-badge-small">Chain Location</span>' : '';

        tableHTML += `
            <tr class="business-result-row">
                <td class="business-name-cell">
                    ${business.bname} ${chainBadge}
                </td>
                <td class="address-cell">${addressText}</td>
                <td class="type-cell">${businessType}</td>
                <td class="status-cell">
                    <span class="status-badge ${statusClass}">${status}</span>
                </td>
                <td class="action-cell">
                    <button class="select-business-btn" onclick="window.selectBusinessForUpdate('${business._id}', '${escapeHtml(business.bname)}')">
                        Select for Update
                    </button>
                </td>
            </tr>
        `;
    });

    tableHTML += `
                    </tbody>
                </table>
            </div>
        </div>
    `;

    return tableHTML;
}

/**
 * Select business for update (called when user clicks select button)
 */
window.selectBusinessForUpdate = async function(businessId, businessName) {
    console.log("Selecting business for update:", businessId, businessName);

    try {
        // Show loading state
        showUpdateLoadingIndicator("Loading business details...");

        // Fetch full business details
        const businessDetails = await fetchBusinessDetailsForUpdate(businessId);

        if (businessDetails) {
            console.log("Business details fetched:", businessDetails);

            // Hide loading indicator
            hideUpdateLoadingIndicator();

            // Call the handler function directly (it should be available from business-update-handler.js)
            if (typeof window.selectBusinessForUpdate !== 'function') {
                console.error("selectBusinessForUpdate handler not found");
                alert("Error: Update handler not found. Please refresh the page.");
                return;
            }

            // Since we already have the business details, pass them directly to the handler
            // The handler expects the business data object
            console.log("Calling business update handler with:", businessDetails);

            // Check if the global handler exists (from business-update-handler.js)
            if (window.selectedBusinessData !== undefined || document.getElementById('business-info-section')) {
                // Call the original selectBusinessForUpdate function that populates the form
                populateUpdateForm(businessDetails);
            } else {
                alert("Error: Update form not ready. Please refresh the page.");
            }
        } else {
            hideUpdateLoadingIndicator();
            alert("Error: Could not load business details. Please try again.");
        }

    } catch (error) {
        console.error("Error selecting business for update:", error);
        hideUpdateLoadingIndicator();
        alert("Error selecting business: " + error.message);
    }
};

/**
 * Populate the update form with business details
 */
function populateUpdateForm(businessData) {
    console.log("Populating update form with:", businessData);

    try {
        // Store the selected business data for later use
        window.selectedBusinessData = businessData;

        // Show the business info section
        const businessInfoSection = document.getElementById('business-info-section');
        if (businessInfoSection) {
            businessInfoSection.style.display = 'block';
        }

        // Populate the hidden field with the business ID
        const businessIdField = document.getElementById('selected-business-id');
        if (businessIdField) {
            businessIdField.value = businessData._id || '';
            console.log("Setting business ID to:", businessData._id);
        }

        // Populate the business information fields
        populateUpdateField('bname', businessData.bname);
        populateUpdateField('address1', businessData.address1);
        populateUpdateField('address2', businessData.address2);
        populateUpdateField('city', businessData.city);
        populateUpdateField('zip', businessData.zip);
        populateUpdateField('phone', businessData.phone);

        // Special handling for select fields
        populateUpdateSelectField('state', businessData.state);
        populateUpdateSelectField('type', businessData.type);
        populateUpdateSelectField('status', businessData.status || 'active');

        // Scroll to the form
        if (businessInfoSection) {
            businessInfoSection.scrollIntoView({ behavior: 'smooth' });
        }

        console.log("Update form populated successfully");

    } catch (error) {
        console.error("Error populating update form:", error);
        alert("Error preparing update form: " + error.message);
    }
}

/**
 * Helper function to safely populate form fields
 */
function populateUpdateField(fieldId, value) {
    const field = document.getElementById(fieldId);
    if (field) {
        field.value = value || '';
        console.log(`Populated ${fieldId} with:`, value);
    } else {
        console.warn(`Field ${fieldId} not found.`);
    }
}

/**
 * Helper function to safely populate select fields
 */
function populateUpdateSelectField(fieldId, value) {
    const field = document.getElementById(fieldId);
    if (!field) {
        console.warn(`Field ${fieldId} not found.`);
        return;
    }

    // Try for a direct match first
    for (let i = 0; i < field.options.length; i++) {
        if (field.options[i].value.toLowerCase() === (value || '').toLowerCase()) {
            field.selectedIndex = i;
            console.log(`Selected ${value} in ${fieldId}`);
            return;
        }
    }

    // If no match is found, set to default (first option)
    console.warn(`Could not find a matching option for ${value} in ${fieldId}`);
}

/**
 * Fetch full business details for update
 */
async function fetchBusinessDetailsForUpdate(businessId) {
    try {
        const baseURL = getUpdateBaseURL();
        const apiURL = `${baseURL}/api/business.js?operation=get&id=${businessId}`;

        console.log("Fetching business details:", apiURL);

        const response = await fetch(apiURL);

        if (!response.ok) {
            throw new Error(`Failed to fetch business details: ${response.status}`);
        }

        const data = await response.json();

        if (data.result) {
            return data.result;
        } else {
            throw new Error("Business details not found");
        }

    } catch (error) {
        console.error("Error fetching business details:", error);
        throw error;
    }
}

/**
 * Utility Functions for Update Page
 */

function getUpdateBaseURL() {
    return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? `http://${window.location.host}`
        : window.location.origin;
}

function getUpdateBusinessTypeLabel(typeCode) {
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

function validateUpdateField(field, validationFn) {
    if (!field) return;

    console.log(`Validating ${field.id} with value: ${field.value}`);

    if (validationFn(field.value)) {
        field.classList.remove('invalid-field');
        field.classList.add('valid-field');
        field.setAttribute('data-valid', 'true');
        console.log(`${field.id} is VALID`);
    } else {
        field.classList.remove('valid-field');
        field.classList.add('invalid-field');
        field.setAttribute('data-valid', 'false');
        console.log(`${field.id} is INVALID`);
    }
}

function isNotEmpty(value) {
    return value && value.trim() !== '';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showUpdateLoadingIndicator(message = "Searching for businesses...") {
    const resultsContainer = document.getElementById('business-search-results');
    if (resultsContainer) {
        resultsContainer.innerHTML = `
            <div class="update-loading-indicator">
                <div class="loading-spinner"></div>
                <div class="loading-text">${message}</div>
            </div>
        `;
        resultsContainer.style.display = 'block';
    }
}

function hideUpdateLoadingIndicator() {
    const loadingIndicator = document.querySelector('.update-loading-indicator');
    if (loadingIndicator) {
        loadingIndicator.remove();
    }
}

function showUpdateErrorMessage(message) {
    const resultsContainer = document.getElementById('business-search-results');
    if (resultsContainer) {
        resultsContainer.innerHTML = `
            <div class="update-error-message">
                <h3>Search Error</h3>
                <p>${message}</p>
                <button onclick="clearUpdateResults()" class="retry-btn">Try Again</button>
            </div>
        `;
        resultsContainer.style.display = 'block';
    }
}

function clearUpdateResults() {
    const resultsContainer = document.getElementById('business-search-results');
    if (resultsContainer) {
        resultsContainer.style.display = 'none';
        resultsContainer.innerHTML = '';
    }

    // Clear form fields
    const businessNameField = document.getElementById('business-name');
    const addressField = document.getElementById('address');

    if (businessNameField) businessNameField.value = '';
    if (addressField) addressField.value = '';
}

// Export for global access
window.performUpdateBusinessSearch = performUpdateBusinessSearch;
window.displayUpdateSearchResults = displayUpdateSearchResults;
window.clearUpdateResults = clearUpdateResults;
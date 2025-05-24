/**
 * Simple Update Search - Complete replacement for complex search functionality
 * This script completely handles search without any dependencies on business-search-improved.js
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log("Simple Update Search Handler Loaded!");

    // Wait for all other scripts to load
    setTimeout(function() {
        initializeSimpleUpdateSearch();
    }, 200);
});

function initializeSimpleUpdateSearch() {
    console.log("Initializing simple update search...");

    // Get the search form
    const searchForm = document.getElementById('business-search-form');
    if (!searchForm) {
        console.error("Search form not found");
        return;
    }

    // Remove any existing event listeners and override the form submission
    searchForm.onsubmit = null;

    // Clear any existing event listeners
    const newForm = searchForm.cloneNode(true);
    searchForm.parentNode.replaceChild(newForm, searchForm);

    // Add our event listener to the new form
    const finalForm = document.getElementById('business-search-form');
    finalForm.addEventListener('submit', handleUpdateSearch);

    console.log("Simple update search initialized successfully");
}

async function handleUpdateSearch(event) {
    event.preventDefault();
    console.log("Simple update search: Form submitted");

    // Get form values
    const businessName = document.getElementById('business-name')?.value || '';
    const address = document.getElementById('address')?.value || '';

    // Validate input
    if (!businessName.trim() && !address.trim()) {
        alert("Please enter either a business name or an address to search");
        return;
    }

    const formData = {
        businessName: businessName.trim(),
        address: address.trim()
    };

    console.log("Simple update search: Searching with", formData);

    try {
        // Show loading
        showSimpleLoadingIndicator();

        // Perform the search
        const results = await performSimpleUpdateSearch(formData);

        // Display results
        displaySimpleUpdateResults(results);

    } catch (error) {
        console.error("Simple update search error:", error);
        showSimpleErrorMessage("Error searching for businesses: " + error.message);
    }
}

async function performSimpleUpdateSearch(formData) {
    console.log("Performing simple update search...");

    try {
        const baseURL = getSimpleBaseURL();
        const params = new URLSearchParams();

        params.append('operation', 'search');

        if (formData.businessName) {
            params.append('business_name', formData.businessName);
        }

        if (formData.address) {
            params.append('address', formData.address);
        }

        const apiURL = `${baseURL}/api/business.js?${params.toString()}`;
        console.log("Simple search API URL:", apiURL);

        const response = await fetch(apiURL, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json; charset=UTF-8'
            }
        });

        if (!response.ok) {
            throw new Error(`Search failed: ${response.status}`);
        }

        const data = await response.json();
        const rawResults = data.results || [];

        // Filter out parent chain businesses
        const filteredResults = rawResults.filter(business => {
            if (business.is_chain === true) {
                console.log(`Filtering out parent chain: ${business.bname}`);
                return false;
            }
            return true;
        });

        console.log(`Simple search: Found ${filteredResults.length} businesses`);
        return filteredResults;

    } catch (error) {
        console.error("Simple search error:", error);
        throw error;
    }
}

// Store the last successful results to restore them
let lastSuccessfulResults = null;

function displaySimpleUpdateResults(businesses) {
    console.log(`Displaying ${businesses.length} businesses in simple table`);

    // Store the results for potential restoration
    lastSuccessfulResults = businesses;

    const resultsContainer = document.getElementById('business-search-results');
    if (!resultsContainer) {
        console.error("Results container not found");
        return;
    }

    // Clear existing content
    resultsContainer.innerHTML = '';

    if (businesses.length === 0) {
        resultsContainer.innerHTML = `
            <div class="simple-no-results">
                <h3>No businesses found</h3>
                <p>No businesses match your search criteria. Please try different search terms.</p>
            </div>
        `;
        resultsContainer.style.display = 'block';
        return;
    }

    // Create simple results table
    const tableHTML = createSimpleResultsTable(businesses);
    resultsContainer.innerHTML = tableHTML;
    resultsContainer.style.display = 'block';

    // Scroll to results
    resultsContainer.scrollIntoView({ behavior: 'smooth' });

    console.log("Simple results displayed successfully");
}

function createSimpleResultsTable(businesses) {
    let tableHTML = `
        <div class="simple-results-container">
            <h3>Search Results (${businesses.length} found)</h3>
            <table class="simple-results-table">
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

        // Get business type
        const businessType = getSimpleBusinessTypeLabel(business.type);

        // Status
        const status = business.status || 'active';
        const statusClass = status === 'active' ? 'simple-status-active' : 'simple-status-inactive';

        // Chain badge
        const chainBadge = business.chain_id ?
            '<span class="simple-chain-badge">Chain</span>' : '';

        tableHTML += `
            <tr class="simple-business-row">
                <td>${business.bname} ${chainBadge}</td>
                <td>${addressText}</td>
                <td>${businessType}</td>
                <td><span class="simple-status-badge ${statusClass}">${status}</span></td>
                <td>
                    <button class="simple-select-btn" onclick="selectSimpleBusinessForUpdate('${business._id}')">
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
    `;

    return tableHTML;
}

function restoreSimpleResultsTable() {
    console.log("Restoring simple results table");

    if (lastSuccessfulResults && lastSuccessfulResults.length > 0) {
        const resultsContainer = document.getElementById('business-search-results');
        if (resultsContainer) {
            const tableHTML = createSimpleResultsTable(lastSuccessfulResults);
            resultsContainer.innerHTML = tableHTML;
            resultsContainer.style.display = 'block';
            console.log("Results table restored successfully");
        }
    } else {
        console.log("No previous results to restore");
        hideSimpleLoadingIndicator();
    }
}

window.selectSimpleBusinessForUpdate = async function(businessId) {
    console.log("Selecting business for simple update:", businessId);

    try {
        showSimpleLoadingIndicator("Loading business details...");

        // Fetch business details
        const businessDetails = await fetchSimpleBusinessDetails(businessId);

        if (businessDetails) {
            console.log("Business details loaded successfully");

            // Hide the loading indicator and restore the table
            restoreSimpleResultsTable();

            // Populate the form directly
            populateSimpleUpdateForm(businessDetails);
        } else {
            hideSimpleLoadingIndicator();
            alert("Error: Could not load business details.");
        }

    } catch (error) {
        console.error("Error selecting business:", error);
        hideSimpleLoadingIndicator();
        alert("Error: " + error.message);
    }
};

async function fetchSimpleBusinessDetails(businessId) {
    const baseURL = getSimpleBaseURL();
    const apiURL = `${baseURL}/api/business.js?operation=get&id=${businessId}`;

    console.log("Fetching simple business details:", apiURL);

    const response = await fetch(apiURL);
    if (!response.ok) {
        throw new Error(`Failed to fetch business: ${response.status}`);
    }

    const data = await response.json();
    return data.result;
}

function populateSimpleUpdateForm(businessData) {
    console.log("Populating simple update form:", businessData);

    // Store business data
    window.selectedBusinessData = businessData;

    // Show the form section
    const businessInfoSection = document.getElementById('business-info-section');
    if (businessInfoSection) {
        businessInfoSection.style.display = 'block';
    }

    // Set business ID
    const businessIdField = document.getElementById('selected-business-id');
    if (businessIdField) {
        businessIdField.value = businessData._id;
    }

    // Populate fields
    setSimpleFieldValue('bname', businessData.bname);
    setSimpleFieldValue('address1', businessData.address1);
    setSimpleFieldValue('address2', businessData.address2);
    setSimpleFieldValue('city', businessData.city);
    setSimpleFieldValue('zip', businessData.zip);
    setSimpleFieldValue('phone', businessData.phone);

    // Set select fields
    setSimpleSelectValue('state', businessData.state);
    setSimpleSelectValue('type', businessData.type);
    setSimpleSelectValue('status', businessData.status || 'active');

    // Scroll to form
    if (businessInfoSection) {
        businessInfoSection.scrollIntoView({ behavior: 'smooth' });
    }

    console.log("Simple form populated successfully");
}

// Utility functions
function getSimpleBaseURL() {
    return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? `http://${window.location.host}`
        : window.location.origin;
}

function getSimpleBusinessTypeLabel(typeCode) {
    const types = {
        'AUTO': 'Automotive', 'BEAU': 'Beauty', 'BOOK': 'Bookstore',
        'CLTH': 'Clothing', 'CONV': 'Convenience Store', 'DEPT': 'Department Store',
        'ELEC': 'Electronics', 'ENTR': 'Entertainment', 'FURN': 'Furniture',
        'FUEL': 'Fuel Station', 'GIFT': 'Gift Shop', 'GROC': 'Grocery',
        'HARDW': 'Hardware', 'HEAL': 'Health', 'JEWL': 'Jewelry',
        'OTHER': 'Other', 'RX': 'Pharmacy', 'REST': 'Restaurant',
        'RETAIL': 'Retail', 'SERV': 'Service', 'SPEC': 'Specialty',
        'SPRT': 'Sporting Goods', 'TECH': 'Technology', 'TOYS': 'Toys'
    };
    return types[typeCode] || typeCode;
}

function setSimpleFieldValue(fieldId, value) {
    const field = document.getElementById(fieldId);
    if (field) {
        field.value = value || '';
    }
}

function setSimpleSelectValue(fieldId, value) {
    const field = document.getElementById(fieldId);
    if (field && value) {
        for (let i = 0; i < field.options.length; i++) {
            if (field.options[i].value.toLowerCase() === value.toLowerCase()) {
                field.selectedIndex = i;
                break;
            }
        }
    }
}

function showSimpleLoadingIndicator(message = "Searching...") {
    const resultsContainer = document.getElementById('business-search-results');
    if (resultsContainer) {
        resultsContainer.innerHTML = `
            <div class="simple-loading">
                <div class="simple-spinner"></div>
                <div>${message}</div>
            </div>
        `;
        resultsContainer.style.display = 'block';
    }
}

function hideSimpleLoadingIndicator() {
    console.log("Hiding simple loading indicator");

    // Restore the table if we have previous results
    if (lastSuccessfulResults && lastSuccessfulResults.length > 0) {
        restoreSimpleResultsTable();
    } else {
        // Just clear the results container
        const resultsContainer = document.getElementById('business-search-results');
        if (resultsContainer) {
            resultsContainer.innerHTML = '';
            resultsContainer.style.display = 'none';
        }
    }
}

function showSimpleErrorMessage(message) {
    const resultsContainer = document.getElementById('business-search-results');
    if (resultsContainer) {
        resultsContainer.innerHTML = `
            <div class="simple-error">
                <h3>Error</h3>
                <p>${message}</p>
                <button onclick="clearSimpleResults()">Try Again</button>
            </div>
        `;
        resultsContainer.style.display = 'block';
    }
}

function clearSimpleResults() {
    const resultsContainer = document.getElementById('business-search-results');
    if (resultsContainer) {
        resultsContainer.innerHTML = '';
        resultsContainer.style.display = 'none';
    }

    // Clear form
    const businessName = document.getElementById('business-name');
    const address = document.getElementById('address');
    if (businessName) businessName.value = '';
    if (address) address.value = '';
}
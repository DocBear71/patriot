/**
 * Simple Incentive Search - Lightweight search functionality for incentive pages
 * This script handles business search for incentive-view.html, incentive-add.html, and incentive-update.html
 * without any Google Maps dependencies
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log("Simple Incentive Search Handler Loaded!");

    // Wait for other scripts to load
    setTimeout(function() {
        initializeSimpleIncentiveSearch();
    }, 200);
});

function initializeSimpleIncentiveSearch() {
    console.log("Initializing simple incentive search...");

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
    finalForm.addEventListener('submit', handleIncentiveSearch);

    console.log("Simple incentive search initialized successfully");
}

async function handleIncentiveSearch(event) {
    event.preventDefault();
    console.log("Simple incentive search: Form submitted");

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

    console.log("Simple incentive search: Searching with", formData);

    try {
        // Show loading
        showIncentiveLoadingIndicator();

        // Perform the search
        const results = await performSimpleIncentiveSearch(formData);

        // Display results
        displayIncentiveSearchResults(results);

    } catch (error) {
        console.error("Simple incentive search error:", error);
        showIncentiveErrorMessage("Error searching for businesses: " + error.message);
    }
}

async function performSimpleIncentiveSearch(formData) {
    console.log("Performing simple incentive search...");

    try {
        const baseURL = getIncentiveBaseURL();
        const params = new URLSearchParams();

        params.append('operation', 'search');

        if (formData.businessName) {
            params.append('business_name', formData.businessName);
        }

        if (formData.address) {
            params.append('address', formData.address);
        }

        const apiURL = `${baseURL}/api/business.js?${params.toString()}`;
        console.log("Simple incentive search API URL:", apiURL);

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

        // Filter out parent chain businesses (they don't have physical locations)
        const filteredResults = rawResults.filter(business => {
            if (business.is_chain === true) {
                console.log(`Filtering out parent chain: ${business.bname}`);
                return false;
            }
            return true;
        });

        console.log(`Simple incentive search: Found ${filteredResults.length} businesses`);
        return filteredResults;

    } catch (error) {
        console.error("Simple incentive search error:", error);
        throw error;
    }
}

function displayIncentiveSearchResults(businesses) {
    console.log(`Displaying ${businesses.length} businesses in incentive search results`);

    const resultsContainer = document.getElementById('business-search-results');
    if (!resultsContainer) {
        console.error("Results container not found");
        return;
    }

    // Clear existing content
    resultsContainer.innerHTML = '';

    if (businesses.length === 0) {
        resultsContainer.innerHTML = `
            <div class="incentive-no-results">
                <h3>No businesses found</h3>
                <p>No businesses match your search criteria. Please try different search terms.</p>
            </div>
        `;
        resultsContainer.style.display = 'block';
        return;
    }

    // Create results table
    const tableHTML = createIncentiveResultsTable(businesses);
    resultsContainer.innerHTML = tableHTML;
    resultsContainer.style.display = 'block';

    // Scroll to results
    resultsContainer.scrollIntoView({ behavior: 'smooth' });

    console.log("Incentive search results displayed successfully");
}

function createIncentiveResultsTable(businesses) {
    let tableHTML = `
        <div class="incentive-results-container">
            <h3>Search Results (${businesses.length} found)</h3>
            <table class="incentive-results-table">
                <thead>
                    <tr>
                        <th>Business Name</th>
                        <th>Address</th>
                        <th>Type</th>
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
        const businessType = getIncentiveBusinessTypeLabel(business.type);

        // Chain badge
        const chainBadge = business.chain_id ?
            '<span class="incentive-chain-badge">Chain</span>' : '';

        // Determine which action button to show based on the page
        let actionButton = '';
        const currentPage = window.location.pathname;

        if (currentPage.includes('incentive-view.html')) {
            actionButton = `
                <button class="incentive-select-btn" onclick="selectBusinessForIncentiveView('${business._id}')">
                    View Incentives
                </button>
            `;
        } else if (currentPage.includes('incentive-add.html')) {
            actionButton = `
                <button class="incentive-select-btn" onclick="selectBusinessForIncentiveAdd('${business._id}')">
                    Add Incentive
                </button>
            `;
        } else if (currentPage.includes('incentive-update.html')) {
            actionButton = `
                <button class="incentive-select-btn" onclick="selectBusinessForIncentiveUpdate('${business._id}')">
                    Update Incentives
                </button>
            `;
        }

        tableHTML += `
            <tr class="incentive-business-row">
                <td>${business.bname} ${chainBadge}</td>
                <td>${addressText}</td>
                <td>${businessType}</td>
                <td>${actionButton}</td>
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

// Global functions for different pages to handle business selection
window.selectBusinessForIncentiveView = async function(businessId) {
    console.log("Selecting business for incentive view:", businessId);

    try {
        showIncentiveLoadingIndicator("Loading business details...");

        // Fetch business details
        const businessDetails = await fetchIncentiveBusinessDetails(businessId);

        if (businessDetails) {
            console.log("Business details loaded for incentive view");
            hideIncentiveLoadingIndicator();

            // Call the existing function from business-incentive-viewer.js
            if (typeof window.viewBusinessIncentives === 'function') {
                window.viewBusinessIncentives(businessDetails);
            }
        } else {
            hideIncentiveLoadingIndicator();
            alert("Error: Could not load business details.");
        }

    } catch (error) {
        console.error("Error selecting business for incentive view:", error);
        hideIncentiveLoadingIndicator();
        alert("Error: " + error.message);
    }
};

window.selectBusinessForIncentiveAdd = async function(businessId) {
    console.log("Selecting business for incentive add:", businessId);

    try {
        showIncentiveLoadingIndicator("Loading business details...");

        // Fetch business details
        const businessDetails = await fetchIncentiveBusinessDetails(businessId);

        if (businessDetails) {
            console.log("Business details loaded for incentive add");
            hideIncentiveLoadingIndicator();

            // Call the existing function from business-incentive-handler.js
            if (typeof window.selectBusinessForIncentive === 'function') {
                window.selectBusinessForIncentive(businessDetails);
            }
        } else {
            hideIncentiveLoadingIndicator();
            alert("Error: Could not load business details.");
        }

    } catch (error) {
        console.error("Error selecting business for incentive add:", error);
        hideIncentiveLoadingIndicator();
        alert("Error: " + error.message);
    }
};

window.selectBusinessForIncentiveUpdate = async function(businessId) {
    console.log("Selecting business for incentive update:", businessId);

    try {
        showIncentiveLoadingIndicator("Loading business details...");

        // Fetch business details
        const businessDetails = await fetchIncentiveBusinessDetails(businessId);

        if (businessDetails) {
            console.log("Business details loaded for incentive update");
            hideIncentiveLoadingIndicator();

            // Call the existing function from incentive-update-handler.js
            if (typeof window.selectBusinessForIncentives === 'function') {
                window.selectBusinessForIncentives(businessDetails);
            } else if (typeof window.selectBusinessForIncentive === 'function') {
                window.selectBusinessForIncentive(businessDetails);
            }
        } else {
            hideIncentiveLoadingIndicator();
            alert("Error: Could not load business details.");
        }

    } catch (error) {
        console.error("Error selecting business for incentive update:", error);
        hideIncentiveLoadingIndicator();
        alert("Error: " + error.message);
    }
};

async function fetchIncentiveBusinessDetails(businessId) {
    const baseURL = getIncentiveBaseURL();
    const apiURL = `${baseURL}/api/business.js?operation=get&id=${businessId}`;

    console.log("Fetching incentive business details:", apiURL);

    const response = await fetch(apiURL);
    if (!response.ok) {
        throw new Error(`Failed to fetch business: ${response.status}`);
    }

    const data = await response.json();
    return data.result;
}

// Utility functions
function getIncentiveBaseURL() {
    return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? `http://${window.location.host}`
        : window.location.origin;
}

function getIncentiveBusinessTypeLabel(typeCode) {
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

function showIncentiveLoadingIndicator(message = "Searching...") {
    const resultsContainer = document.getElementById('business-search-results');
    if (resultsContainer) {
        resultsContainer.innerHTML = `
            <div class="incentive-loading">
                <div class="incentive-spinner"></div>
                <div class="incentive-loading-text">${message}</div>
            </div>
        `;
        resultsContainer.style.display = 'block';
    }
}

function hideIncentiveLoadingIndicator() {
    console.log("Hiding incentive loading indicator");
    // This will be handled by the display functions
}

function showIncentiveErrorMessage(message) {
    const resultsContainer = document.getElementById('business-search-results');
    if (resultsContainer) {
        resultsContainer.innerHTML = `
            <div class="incentive-error">
                <h3>Error</h3>
                <p>${message}</p>
                <button onclick="clearIncentiveResults()">Try Again</button>
            </div>
        `;
        resultsContainer.style.display = 'block';
    }
}

function clearIncentiveResults() {
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
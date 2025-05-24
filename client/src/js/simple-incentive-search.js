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

// Helper function to populate business info (missing from some pages)
function populateBusinessInfo(business) {
    if (!business) {
        console.error("No business data provided to populateBusinessInfo");
        return;
    }

    console.log("Populating business info with: ", business);

    try {
        // Set business name display
        const businessNameDisplay = document.getElementById('business-name-display');
        if (businessNameDisplay) {
            businessNameDisplay.textContent = business.bname || '';
        }

        // Set address display
        const businessAddressDisplay = document.getElementById('business-address-display');
        if (businessAddressDisplay) {
            let addressText = business.address1 || '';
            if (business.address2) addressText += ', ' + business.address2;
            businessAddressDisplay.textContent = addressText;
        }

        // Set city, state, zip display
        const businessCityStateDisplay = document.getElementById('business-city-state-display');
        if (businessCityStateDisplay) {
            let cityStateText = '';
            if (business.city) cityStateText += business.city;
            if (business.state) cityStateText += ', ' + business.state;
            if (business.zip) cityStateText += ' ' + business.zip;
            businessCityStateDisplay.textContent = cityStateText;
        }

        // Set phone display
        const businessPhoneDisplay = document.getElementById('business-phone-display');
        if (businessPhoneDisplay) {
            businessPhoneDisplay.textContent = business.phone || '';
        }

        // Set type display
        const businessTypeDisplay = document.getElementById('business-type-display');
        if (businessTypeDisplay) {
            businessTypeDisplay.textContent = getIncentiveBusinessTypeLabel(business.type) || '';
        }

        console.log("Business info populated successfully");
    } catch (error) {
        console.error("Error in populateBusinessInfo", error);
    }
}

// Enhanced function to clear search results and hide loading
function clearSearchResultsAndLoading() {
    // Hide the search results container
    const resultsContainer = document.getElementById('business-search-results');
    if (resultsContainer) {
        resultsContainer.style.display = 'none';
        resultsContainer.innerHTML = '';
    }
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

            // Clear the search results and loading indicator
            clearSearchResultsAndLoading();

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

            // Clear the search results and loading indicator
            clearSearchResultsAndLoading();

            // Ensure populateBusinessInfo is available globally
            window.populateBusinessInfo = populateBusinessInfo;

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

            // Clear the search results and loading indicator
            clearSearchResultsAndLoading();

            // Ensure populateBusinessInfo is available globally
            window.populateBusinessInfo = populateBusinessInfo;

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

/**
 * Enhanced integration for incentive viewer to properly handle chain incentives
 * Add this code to the end of your simple-incentive-search.js file
 */

// Enhanced function to fetch and display incentives with chain support
window.enhancedFetchIncentives = function(business_id, businessName, businessData) {
    console.log("Enhanced fetchIncentives called for:", businessName, "ID:", business_id);

    // Get the incentives container
    let incentivesContainer = document.getElementById('incentives-container');
    if (!incentivesContainer) {
        console.log("Creating incentives container");
        incentivesContainer = document.createElement('div');
        incentivesContainer.id = 'incentives-container';

        // Find a good place to put it
        const businessInfoSection = document.getElementById('business-info-section');
        if (businessInfoSection && businessInfoSection.parentNode) {
            businessInfoSection.parentNode.insertBefore(incentivesContainer, businessInfoSection.nextSibling);
        } else {
            const main = document.querySelector('main');
            if (main) {
                main.appendChild(incentivesContainer);
            } else {
                document.body.appendChild(incentivesContainer);
            }
        }
    }

    // Display loading indicator
    incentivesContainer.innerHTML = '<p>Loading incentives...</p>';
    console.log(`Fetching incentives for business ID: ${business_id}`);

    // Determine if this is a chain location
    const isChainLocation = businessData && businessData.chain_id ? true : false;
    const chainId = isChainLocation ? businessData.chain_id : null;

    // Build API URL
    const baseURL = getIncentiveBaseURL();

    // For chain locations, we need to fetch both local and chain incentives
    if (isChainLocation && chainId) {
        console.log(`This is a chain location. Chain ID: ${chainId}`);
        fetchBothLocalAndChainIncentives(business_id, chainId, businessName, incentivesContainer);
    } else {
        // Regular business - fetch only local incentives
        fetchLocalIncentivesOnly(business_id, businessName, incentivesContainer);
    }
};

// Function to fetch both local and chain incentives
function fetchBothLocalAndChainIncentives(businessId, chainId, businessName, container) {
    console.log(`Fetching both local and chain incentives for ${businessName}`);

    const baseURL = getIncentiveBaseURL();

    // Fetch local incentives
    const localIncentivesPromise = fetch(`${baseURL}/api/combined-api.js?operation=incentives&business_id=${businessId}`)
        .then(response => response.json())
        .catch(error => {
            console.error("Error fetching local incentives:", error);
            return { results: [] };
        });

    // Fetch chain incentives using the new chains API
    const chainIncentivesPromise = fetch(`${baseURL}/api/chains.js?operation=get_incentives&chain_id=${chainId}`)
        .then(response => response.json())
        .catch(error => {
            console.error("Error fetching chain incentives:", error);
            return { incentives: [] };
        });

    // Wait for both to complete
    Promise.all([localIncentivesPromise, chainIncentivesPromise])
        .then(([localData, chainData]) => {
            console.log("Local incentives data:", localData);
            console.log("Chain incentives data:", chainData);

            displayCombinedIncentives(localData.results || [], chainData.incentives || [], businessName, container);
        })
        .catch(error => {
            console.error("Error fetching combined incentives:", error);
            container.innerHTML = `<p class="error">Error loading incentives: ${error.message}</p>`;
        });
}

// Function to fetch only local incentives
function fetchLocalIncentivesOnly(businessId, businessName, container) {
    console.log(`Fetching local incentives only for ${businessName}`);

    const baseURL = getIncentiveBaseURL();
    const apiURL = `${baseURL}/api/combined-api.js?operation=incentives&business_id=${businessId}`;

    fetch(apiURL)
        .then(response => response.json())
        .then(data => {
            console.log("Local incentives data:", data);
            displayLocalIncentivesOnly(data.results || [], businessName, container);
        })
        .catch(error => {
            console.error("Error fetching local incentives:", error);
            container.innerHTML = `<p class="error">Error loading incentives: ${error.message}</p>`;
        });
}

// Function to display combined local and chain incentives
function displayCombinedIncentives(localIncentives, chainIncentives, businessName, container) {
    console.log(`Displaying combined incentives for ${businessName}`);

    let html = `
        <fieldset id="incentives-section">
            <legend>
                <h3 class="caveat">Step 3: View Incentives for ${businessName}</h3>
            </legend>
    `;

    const hasLocalIncentives = localIncentives && localIncentives.length > 0;
    const hasChainIncentives = chainIncentives && chainIncentives.length > 0;

    if (!hasLocalIncentives && !hasChainIncentives) {
        html += '<p>No incentives found for this business.</p>';
    } else {
        html += `
            <table class="results-table">
                <thead>
                    <tr>
                        <th>Available</th>
                        <th>Type</th>
                        <th>Amount</th>
                        <th>Information</th>
                        <th>Scope</th>
                        <th>Date Added</th>
                    </tr>
                </thead>
                <tbody>
        `;

        // Add local incentives first
        if (hasLocalIncentives) {
            localIncentives.forEach(incentive => {
                html += formatIncentiveRow(incentive, false); // false = not chain-wide
            });
        }

        // Add chain incentives
        if (hasChainIncentives) {
            chainIncentives.forEach(incentive => {
                // Convert chain incentive format to standard format
                if (incentive.is_active) {
                    const standardIncentive = {
                        is_available: incentive.is_active,
                        type: incentive.type,
                        amount: incentive.amount,
                        information: incentive.information,
                        other_description: incentive.other_description,
                        created_at: incentive.created_at || new Date().toISOString(),
                        is_chain_wide: true
                    };
                    html += formatIncentiveRow(standardIncentive, true); // true = chain-wide
                }
            });
        }

        html += `
                </tbody>
            </table>
        `;
    }

    html += `</fieldset>`;

    container.innerHTML = html;

    // Scroll to incentives section
    const incentivesSection = document.getElementById('incentives-section');
    if (incentivesSection) {
        incentivesSection.scrollIntoView({ behavior: 'smooth' });
    }
}

// Function to display only local incentives
function displayLocalIncentivesOnly(localIncentives, businessName, container) {
    console.log(`Displaying local incentives only for ${businessName}`);

    let html = `
        <fieldset id="incentives-section">
            <legend>
                <h3 class="caveat">Step 3: View Incentives for ${businessName}</h3>
            </legend>
    `;

    if (!localIncentives || localIncentives.length === 0) {
        html += '<p>No incentives found for this business.</p>';
    } else {
        html += `
            <table class="results-table">
                <thead>
                    <tr>
                        <th>Available</th>
                        <th>Type</th>
                        <th>Amount</th>
                        <th>Information</th>
                        <th>Date Added</th>
                    </tr>
                </thead>
                <tbody>
        `;

        localIncentives.forEach(incentive => {
            html += formatIncentiveRowSimple(incentive);
        });

        html += `
                </tbody>
            </table>
        `;
    }

    html += `</fieldset>`;

    container.innerHTML = html;

    // Scroll to incentives section
    const incentivesSection = document.getElementById('incentives-section');
    if (incentivesSection) {
        incentivesSection.scrollIntoView({ behavior: 'smooth' });
    }
}

// Helper function to format incentive rows with scope
function formatIncentiveRow(incentive, isChainWide) {
    const date = new Date(incentive.created_at).toLocaleDateString();
    const available = incentive.is_available ? 'Yes' : 'No';
    const type = getIncentiveTypeLabel(incentive.type);
    const otherDescription = incentive.other_description ?
        `<br><em>(${incentive.other_description})</em>` : '';

    // Format the amount based on discount_type
    let amountDisplay = 'N/A';
    if (incentive.is_available) {
        if (incentive.discount_type === 'dollar') {
            amountDisplay = `$${incentive.amount.toFixed(2)}`;
        } else {
            amountDisplay = `${incentive.amount}%`;
        }
    }

    // Scope badge
    const scopeBadge = isChainWide ?
        '<span class="chain-badge">Chain-wide</span>' :
        '<span class="location-badge">Location only</span>';

    return `
        <tr>
            <td>${available}</td>
            <td>${type}${otherDescription}</td>
            <td>${amountDisplay}</td>
            <td>${incentive.information || ''}</td>
            <td>${scopeBadge}</td>
            <td>${date}</td>
        </tr>
    `;
}

// Helper function to format incentive rows simple (no scope column)
function formatIncentiveRowSimple(incentive) {
    const date = new Date(incentive.created_at).toLocaleDateString();
    const available = incentive.is_available ? 'Yes' : 'No';
    const type = getIncentiveTypeLabel(incentive.type);
    const otherDescription = incentive.other_description ?
        `<br><em>(${incentive.other_description})</em>` : '';

    // Format the amount
    let amountDisplay = 'N/A';
    if (incentive.is_available) {
        if (incentive.discount_type === 'dollar') {
            amountDisplay = `$${incentive.amount.toFixed(2)}`;
        } else {
            amountDisplay = `${incentive.amount}%`;
        }
    }

    return `
        <tr>
            <td>${available}</td>
            <td>${type}${otherDescription}</td>
            <td>${amountDisplay}</td>
            <td>${incentive.information || ''}</td>
            <td>${date}</td>
        </tr>
    `;
}

// Helper function to get incentive type labels
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

// Override the existing fetchIncentives function if it exists
if (typeof window.fetchIncentives === 'function') {
    window.originalFetchIncentives = window.fetchIncentives;
}
window.fetchIncentives = window.enhancedFetchIncentives;
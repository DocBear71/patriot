// business-incentive-viewer.js - Handles business search and incentive viewing

window.viewBusinessIncentives = function(selectedBusiness) {
    console.log("viewBusinessIncentives called with business: ", selectedBusiness);

    // Lets make sure the business info selected is visible
    const businessInfoSection = document.getElementById('business-info-section');
    if (businessInfoSection) {
        businessInfoSection.style.display = 'block';
    } else {
        console.error("business-info-section not found in the DOM");
    }

    // Set the business ID in the hidden h5 field
    const selectedBusinessIdField = document.getElementById('selected-business-id');
    if (selectedBusinessIdField) {
        selectedBusinessIdField.value = selectedBusiness._id || '';
    }

    // Then popoulate the business information fields
    populateBusinessInfo(selectedBusiness);

    // make fetch happen and display the incentives for the selected business
    if (selectedBusiness && selectedBusiness._id) {
        fetchIncentives(selectedBusiness._id, selectedBusiness.bname);
    }
};

document.addEventListener('DOMContentLoaded', function() {
    console.log("Business incentives viewer loaded!");

    // lets make sure we are on the corrent incentive.view.html page
    const path = window.location.pathname;
    if (path.includes('incentive-view.html') || path.endsWith('business-search.html')) {
        console.log("on incentive-view or business-search page, initializing viewer");

        // maek sure the business information section is hidden until a business is selected
        const businessInfoSection = document.getElementById('business-info-section');
        if (businessInfoSection) {
            businessInfoSection.style.display = 'none';
        } else {
            console.warn("business-info-section not found in the DOM");
        }

        // create an incentives container if none exists
        let incentivesContainer = document.getElementById('incentives-container');
        if (!incentivesContainer) {
            incentivesContainer = document.createElement('div');
            incentivesContainer.id = 'incentives-container';

            // now we add the container after the business ifo section
            if (businessInfoSection && businessInfoSection.parentNode) {
                businessInfoSection.parentNode.insertBefore(incentivesContainer, businessInfoSection.nextSibling);
            } else {
                // add to the main if no info section
                const main = document.querySelector('main');
                if (main) {
                    main.appendChild(incentivesContainer);
                } else {
                    console.warn("Could not find the proper parent for incentives container");
                    document.body.appendChild(incentivesContainer);
                }
            }
        }
    }
});

// function to populate the business information fields
function populateBusinessInfo(business) {
    if (!business) {
        console.error("No business data provided to populateBusinessInfo");
        return;
    }

    console.log("Populating business info with: ", business);

    try {
        // if they exist, set all the values for all business fields
        const bnameField = document.getElementById('bname');
        if (bnameField) {
            console.log(`Setting bname to ${business.bname || ''}`);
            bnameField.value = business.bname || '';
        } else {
            console.warn("Field bname not found in the DOM");
        }

        const address1Field = document.getElementById('address1');
        if (address1Field) {
            console.log(`Setting address1 to ${business.address1 || ''}`);
            address1Field.value = business.address1 || '';
        } else {
            console.warn("Field address1 not found in the DOM");
        }

        const address2Field = document.getElementById('address2');
        if (address2Field) {
            console.log(`Setting address2 to ${business.address2 || ''}`);
            address2Field.value = business.address2 || '';
        } else {
            console.warn("Field address2 not found in the DOM");
        }

        const cityField = document.getElementById('city');
        if (cityField) {
            console.log(`Setting city to ${business.city || ''}`);
            cityField.value = business.city || '';
        } else {
            console.warn("Field city not found in the DOM");
        }

        const zipField = document.getElementById('zip');
        if (zipField) {
            console.log(`Setting zip to ${business.zip || ''}`);
            zipField.value = business.zip || '';
        } else {
            console.warn("Field zip not found in the DOM");
        }

        const phoneField = document.getElementById('phone');
        if (phoneField) {
            console.log(`Setting phone to ${business.phone || ''}`);
            phoneField.value = business.phone || '';
        } else {
            console.warn("Field phone not found in the DOM");
        }

        // speical care for the select options for business state or business type
        const stateSelect = document.getElementById('state');
        if (stateSelect) {
            const stateValue = business.state || '';
            console.log(`Setting state to ${stateValue}`);
            for (let i = 0; i < stateSelect.options.length; i++) {
                if (stateSelect.options[i].value === stateValue) {
                    stateSelect.selectedIndex = i;
                    break;
                }
            }
        } else {
            console.warn("Field state not found in the DOM");
        }

        const typeSelect = document.getElementById('type');
        if (typeSelect) {
            const typeValue = business.type || '';
            console.log(`Setting type to ${typeValue}`);
            for (let i = 0; i < typeSelect.options.length; i++) {
                if (typeSelect.options[i].value === typeValue) {
                    typeSelect.selectedIndex = i;
                    break;
                }
            }
        } else {
            console.warn("Field type not found in the DOM");
        }

        console.log("Business info populated successfully");
    } catch (error) {
        console.error("Error in populateBusinessInfo", error);
    }
}

// function to make fetch happen and display the incentives for the selected business
function fetchIncentives(business_id, businessName) {
    // get the incentives container we made earlier
    let incentivesContainer = document.getElementById('incentives-container');
    if (!incentivesContainer) {
        console.log("creating the incentives container");
        incentivesContainer = document.createElement('div');
        incentivesContainer.id = 'incentives-container';

        // now find a good place to put it
        const businessInfoSection = document.getElementById('business-info-section')
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

        // display a loading indicator
        incentivesContainer.innerHTML = '<p>Loading incentives...</p>';
        console.log("Fetching incentives for business ID: ", business_id);

        // Now to construct the API URL
        // local versus production
        const baseURL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
            ? `https://${window.location.host}`
            : window.location.origin;

        const apiURL = `${baseURL}/api/combined-api.js?operation=incentives&business_id=${business_id}`;
        console.log("Fetching from URL: ", apiURL);

        // make fetch happen for incentives from the API
        fetch(apiURL)
            .then(res => {
                if (!res.ok) {
                    throw new Error(`Failed to fetch incentives: ${res.status} ${res.statusText}`);
                }
                return res.json();
            })
            .then(data => {
                console.log("Incentives data received: ", data);

                // create the fieldset for the incentives to be shown
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

                // now to update the incentives container
                incentivesContainer.innerHTML = html;

                // scroll for initiative section
                const incentivesSection = document.getElementById('incentives-section');
                if (incentivesSection) {
                    incentivesSection.scrollIntoView({ behavior: 'smooth' });
                }
            })
        .catch(error => {
            console.error("Error in fetching incentives: ", error);
            incentivesContainer.innerHTML = `<p class="error">Error in fetching incentives: ${error.message}</p>`;
        });
    }

// Helper function to convert incentive type codes to readable labels
function getIncentiveTypeLabel(typeCode) {
    const types = {
        'VT': 'Veteran',
        'AD': 'Active-Duty',
        'FR': 'First Responder',
        'SP': 'Spouse',
        'OT': 'Other'
    };

    return types[typeCode] || typeCode;
}

/**
 * Enhanced function to fetch and display incentives for a business
 * @param {string} business_id - Business ID
 * @param {string} businessName - Business name
 * @param {Object} businessData - Complete business data object
 */
function enhancedFetchIncentives(business_id, businessName, businessData) {
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
    const baseURL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? `https://${window.location.host}`
        : window.location.origin;

    // Add chain_id parameter if we have one
    let apiURL = `${baseURL}/api/combined-api.js?operation=incentives&business_id=${business_id}`;
    if (chainId) {
        apiURL += `&chain_id=${chainId}`;
    }

    console.log("Fetching incentives from URL:", apiURL);

    // Fetch incentives from API
    fetch(apiURL)
        .then(res => {
            if (!res.ok) {
                throw new Error(`Failed to fetch incentives: ${res.status} ${res.statusText}`);
            }
            return res.json();
        })
        .then(data => {
            console.log("Incentives data received:", data);

            // Create fieldset for incentives display
            let html = `
                <fieldset id="incentives-section">
                    <legend>
                        <h3 class="caveat">Step 3: View Incentives for ${businessName}</h3>
                    </legend>
            `;

            // Add chain information if relevant
            if (isChainLocation) {
                html += `
                    <div class="chain-incentive-warning">
                        <p><strong>${businessName}</strong> is part of the <strong>${businessData.chain_name || 'chain'}</strong> chain.</p>
                        <p>This location may display both location-specific and chain-wide incentives.</p>
                    </div>
                `;
            }

            // Check if we have any incentives
            if (!data.results || data.results.length === 0) {
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

                data.results.forEach(incentive => {
                    const date = new Date(incentive.created_at).toLocaleDateString();
                    const available = incentive.is_available ? 'Yes' : 'No';
                    const type = getIncentiveTypeLabel(incentive.type);
                    const otherDescription = incentive.other_description ?
                        `<br><em>(${incentive.other_description})</em>` : '';

                    // Format the amount based on discount_type (new field)
                    let amountDisplay = 'N/A';
                    if (incentive.is_available) {
                        if (incentive.discount_type === 'dollar') {
                            amountDisplay = `$${incentive.amount.toFixed(2)}`;
                        } else {
                            // Default to percentage
                            amountDisplay = `${incentive.amount}%`;
                        }
                    }

                    // Determine if this is a chain-wide incentive
                    const isChainWide = incentive.is_chain_wide === true;
                    const scopeBadge = isChainWide ?
                        '<span class="chain-badge">Chain-wide</span>' :
                        '<span class="location-badge">Location only</span>';

                    html += `
                        <tr>
                            <td>${available}</td>
                            <td>${type}${otherDescription}</td>
                            <td>${amountDisplay}</td>
                            <td>${incentive.information}</td>
                            <td>${scopeBadge}</td>
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

            // Add styles for badges if not already present
            addBadgeStyles();

            // Scroll to incentives section
            const incentivesSection = document.getElementById('incentives-section');
            if (incentivesSection) {
                incentivesSection.scrollIntoView({ behavior: 'smooth' });
            }
        })
        .catch(error => {
            console.error("Error in fetching incentives:", error);
            incentivesContainer.innerHTML = `<p class="error">Error in fetching incentives: ${error.message}</p>`;
        });
}

/**
 * Helper function to add badge styles if needed
 */
function addBadgeStyles() {
    if (!document.getElementById('incentive-badge-styles')) {
        const style = document.createElement('style');
        style.id = 'incentive-badge-styles';
        style.textContent = `
            .chain-badge {
                background-color: #4285F4;
                color: white;
                border-radius: 4px;
                padding: 3px 6px;
                font-size: 12px;
                display: inline-block;
                font-weight: normal;
            }
            
            .location-badge {
                background-color: #34A853;
                color: white;
                border-radius: 4px;
                padding: 3px 6px;
                font-size: 12px;
                display: inline-block;
                font-weight: normal;
            }
            
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
    }
}

/**
 * Override the original fetchIncentives function
 * @param {string} business_id - Business ID
 * @param {string} businessName - Business name
 */
function overrideFetchIncentives() {
    // Check if the original function exists
    if (typeof window.fetchIncentives === 'function') {
        // Save the original function
        window.originalFetchIncentives = window.fetchIncentives;

        // Replace with our enhanced version
        window.fetchIncentives = function(business_id, businessName) {
            console.log("Enhanced fetchIncentives called");

            // Get the complete business data from the hidden field or another source
            const selectedBusinessIdField = document.getElementById('selected-business-id');
            let businessData = null;

            // Try to find the business data in various places
            if (window.selectedBusinessData) {
                businessData = window.selectedBusinessData;
            } else if (window.lastSelectedBusiness) {
                businessData = window.lastSelectedBusiness;
            }

            // Call our enhanced function
            enhancedFetchIncentives(business_id, businessName, businessData);
        };
    }
}

/**
 * Override the viewBusinessIncentives function
 */
function overrideViewBusinessIncentives() {
    // Check if the original function exists
    if (typeof window.viewBusinessIncentives === 'function') {
        // Save the original function
        window.originalViewBusinessIncentives = window.viewBusinessIncentives;

        // Replace with our enhanced version
        window.viewBusinessIncentives = function(selectedBusiness) {
            console.log("Enhanced viewBusinessIncentives called");

            // Store the business data for later use
            window.selectedBusinessData = selectedBusiness;
            window.lastSelectedBusiness = selectedBusiness;

            // Check if business is a chain parent and user is not admin
            const isChainParent = selectedBusiness.is_chain === true;
            const isAdmin = checkIfUserIsAdmin();

            if (isChainParent && !isAdmin) {
                // Show warning and prevent selection for non-admins
                showChainParentWarning(selectedBusiness);
                return;
            }

            // Call the original function
            window.originalViewBusinessIncentives(selectedBusiness);

            // After the original function runs, enhance the display
            setTimeout(() => {
                enhanceBusinessInfoDisplay(selectedBusiness);

                // Re-fetch incentives with our enhanced version
                if (selectedBusiness && selectedBusiness._id) {
                    enhancedFetchIncentives(selectedBusiness._id, selectedBusiness.bname, selectedBusiness);
                }
            }, 100);
        };
    }
}

/**
 * Check if the current user is an admin
 * @returns {boolean} True if the user is an admin
 */
function checkIfUserIsAdmin() {
    try {
        // First check if we have a global function
        if (typeof window.chainHandler !== 'undefined' && typeof window.chainHandler.checkIfUserIsAdmin === 'function') {
            return window.chainHandler.checkIfUserIsAdmin();
        }

        // Otherwise, implement it directly
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

/**
 * Show warning for chain parent selection by non-admin users
 * @param {Object} chainBusiness - The chain business data
 */
function showChainParentWarning(chainBusiness) {
    // First check if we have a global function
    if (typeof window.chainHandler !== 'undefined' && typeof window.chainHandler.showChainParentWarning === 'function') {
        return window.chainHandler.showChainParentWarning(chainBusiness);
    }

    // Create a modal or alert to show warning
    alert(`${chainBusiness.bname} is a national chain business. Chain businesses can only be modified by administrators. Please select a specific location instead.`);
}

/**
 * Enhance business information display
 * @param {Object} businessData - The business data
 */
function enhanceBusinessInfoDisplay(businessData) {
    // First check if we have a global function
    if (typeof window.chainHandler !== 'undefined' && typeof window.chainHandler.enhanceBusinessInfoDisplay === 'function') {
        return window.chainHandler.enhanceBusinessInfoDisplay(businessData);
    }

    // Convert the form display to something more elegant
    const businessInfoSection = document.getElementById('business-info-section');
    if (!businessInfoSection) return;

    // Check if we've already enhanced this section
    if (businessInfoSection.getAttribute('data-enhanced') === 'true') return;

    // Mark as enhanced to prevent duplicate processing
    businessInfoSection.setAttribute('data-enhanced', 'true');

    // Add chain information if appropriate
    if (businessData.is_chain || businessData.chain_id) {
        const chainInfo = document.createElement('div');
        chainInfo.className = 'chain-business-warning';

        if (businessData.is_chain) {
            chainInfo.innerHTML = `
                <p><strong>${businessData.bname}</strong> is a national chain parent business.</p>
                <p>Chain businesses can only be modified by administrators.</p>
            `;
        } else if (businessData.chain_id) {
            chainInfo.innerHTML = `
                <p><strong>${businessData.bname}</strong> is part of the <strong>${businessData.chain_name || 'chain'}</strong> chain.</p>
                <p>This location may have chain-wide incentives that apply automatically.</p>
            `;
        }

        // Insert at the beginning of the section
        businessInfoSection.insertBefore(chainInfo, businessInfoSection.firstChild);
    }

    // Apply view-only styling to fields
    const inputs = businessInfoSection.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        input.classList.add('view-only-field');
    });
}

// Initialize the overrides when the page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log("Enhanced incentive viewer initialized");

    // Override the fetchIncentives function
    overrideFetchIncentives();

    // Override the viewBusinessIncentives function
    overrideViewBusinessIncentives();

    // Add styles for the enhanced displays
    addBadgeStyles();
});

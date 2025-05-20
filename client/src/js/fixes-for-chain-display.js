// fixes-for-chain-display.js - Addresses issues with chain business display

/**
 * Fix for business info display in incentive view and add pages
 * Compatible with existing form field structure
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log("Loading fixes for chain business display");

    // Add the necessary styles for proper chain info display
    addCompactChainStyles();

    // Fix business field lookup
    patchBusinessFieldLookup();

    // Fix duplicate chain banners
    preventDuplicateChainBanners();
});

/**
 * Add more compact styles for chain info banners
 */
function addCompactChainStyles() {
    if (!document.getElementById('compact-chain-styles')) {
        const style = document.createElement('style');
        style.id = 'compact-chain-styles';
        style.textContent = `
            /* More compact styling for chain warnings */
            .chain-business-warning,
            .chain-incentive-warning {
                background-color: #FFF3CD;
                color: #856404;
                border: 1px solid #FFEEBA;
                padding: 8px 12px;
                margin-bottom: 12px;
                border-radius: 4px;
                font-size: 0.9em;
                max-width: 100%;
                box-sizing: border-box;
            }
            
            .chain-business-warning p,
            .chain-incentive-warning p {
                margin: 5px 0;
                line-height: 1.3;
            }
            
            /* Ensure single banner only */
            .chain-business-warning + .chain-business-warning,
            .chain-incentive-warning + .chain-incentive-warning {
                display: none !important;
            }
            
            /* Fix for extra spacing */
            #business-info-section br + br {
                display: none;
            }
            
            /* Consistent badge styling */
            .chain-badge {
                background-color: #4285F4;
                color: white;
                border-radius: 4px;
                padding: 2px 5px;
                font-size: 11px;
                display: inline-block;
                margin-left: 5px;
                font-weight: normal;
            }
            
            .location-badge {
                background-color: #34A853;
                color: white;
                border-radius: 4px;
                padding: 2px 5px;
                font-size: 11px;
                display: inline-block;
                margin-left: 5px;
                font-weight: normal;
            }
        `;
        document.head.appendChild(style);
        console.log("Added compact chain styles");
    }
}

/**
 * Patch business field lookup to work with different field IDs
 */
function patchBusinessFieldLookup() {
    // Fix for populateBusinessInfo function in business-incentive-viewer.js
    if (typeof window.populateBusinessInfo === 'function') {
        console.log("Patching populateBusinessInfo function");

        // Create our enhanced version
        const enhancedPopulateBusinessInfo = function(business) {
            if (!business) {
                console.error("No business data provided to populateBusinessInfo");
                return;
            }

            console.log("Enhanced populateBusinessInfo with:", business);

            try {
                // Check for form fields first (original method)
                const bnameField = document.getElementById('bname');
                if (bnameField) {
                    bnameField.value = business.bname || '';
                    console.log("Set bname field value:", business.bname);
                }

                const address1Field = document.getElementById('address1');
                if (address1Field) {
                    address1Field.value = business.address1 || '';
                    console.log("Set address1 field value:", business.address1);
                }

                const address2Field = document.getElementById('address2');
                if (address2Field) {
                    address2Field.value = business.address2 || '';
                    console.log("Set address2 field value:", business.address2);
                }

                const cityField = document.getElementById('city');
                if (cityField) {
                    cityField.value = business.city || '';
                    console.log("Set city field value:", business.city);
                }

                const zipField = document.getElementById('zip');
                if (zipField) {
                    zipField.value = business.zip || '';
                    console.log("Set zip field value:", business.zip);
                }

                const phoneField = document.getElementById('phone');
                if (phoneField) {
                    phoneField.value = business.phone || '';
                    console.log("Set phone field value:", business.phone);
                }

                // Special handling for select fields
                const stateSelect = document.getElementById('state');
                if (stateSelect) {
                    const stateValue = business.state || '';
                    console.log("Setting state select to:", stateValue);

                    for (let i = 0; i < stateSelect.options.length; i++) {
                        if (stateSelect.options[i].value === stateValue) {
                            stateSelect.selectedIndex = i;
                            break;
                        }
                    }
                }

                const typeSelect = document.getElementById('type');
                if (typeSelect) {
                    const typeValue = business.type || '';
                    console.log("Setting business type select to:", typeValue);

                    for (let i = 0; i < typeSelect.options.length; i++) {
                        if (typeSelect.options[i].value === typeValue) {
                            typeSelect.selectedIndex = i;
                            break;
                        }
                    }
                }

                // NOW CHECK DISPLAY SPANS (alternative method)
                // This works with the business-info-template.html structure

                // Business name display
                const businessNameDisplay = document.getElementById('business-name-display');
                if (businessNameDisplay) {
                    let nameText = business.bname || 'Unknown Business';

                    // Add chain badge if applicable
                    if (business.is_chain) {
                        nameText += ' <span class="chain-badge">National Chain</span>';
                    } else if (business.chain_id) {
                        nameText += ' <span class="chain-badge">Chain Location</span>';
                    }

                    businessNameDisplay.innerHTML = nameText;
                    console.log("Set business-name-display:", nameText);
                }

                // Address display
                const addressDisplay = document.getElementById('business-address-display');
                if (addressDisplay) {
                    let addressText = business.address1 || '';
                    if (business.address2) {
                        addressText += '<br>' + business.address2;
                    } else if (business.is_chain) {
                        addressText = '<em>National Chain Headquarters</em>';
                    }
                    addressDisplay.innerHTML = addressText;
                    console.log("Set business-address-display:", addressText);
                }

                // City/State/Zip display
                const cityStateDisplay = document.getElementById('business-city-state-display');
                if (cityStateDisplay) {
                    let cityStateText = '';
                    if (business.city) cityStateText += business.city;
                    if (business.state) cityStateText += ', ' + business.state;
                    if (business.zip) cityStateText += ' ' + business.zip;
                    cityStateDisplay.textContent = cityStateText;
                    console.log("Set business-city-state-display:", cityStateText);
                }

                // Phone display
                const phoneDisplay = document.getElementById('business-phone-display');
                if (phoneDisplay) {
                    phoneDisplay.textContent = business.phone || 'Not provided';
                    console.log("Set business-phone-display:", business.phone);
                }

                // Business type display
                const typeDisplay = document.getElementById('business-type-display');
                if (typeDisplay) {
                    const businessTypes = {
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

                    typeDisplay.textContent = businessTypes[business.type] || business.type || 'Unknown';
                    console.log("Set business-type-display:", businessTypes[business.type]);
                }

                console.log("Enhanced business info populated successfully");
            } catch (error) {
                console.error("Error in enhancedPopulateBusinessInfo:", error);
            }

            // Also add chain warning if needed
            addChainInfoIfNeeded(business);
        };

        // Replace the original function
        window.populateBusinessInfo = enhancedPopulateBusinessInfo;
    }
}

/**
 * Add chain info if the business is a chain parent or location
 * @param {Object} business - The business data
 */
function addChainInfoIfNeeded(business) {
    // Skip if no business data
    if (!business) return;

    // Check if business is part of a chain
    if (business.chain_id || business.is_chain) {
        // Find the business-info-section
        const infoSection = document.getElementById('business-info-section');
        if (!infoSection) return;

        // Check if there's already a chain warning
        const existingWarning = infoSection.querySelector('.chain-business-warning');
        if (existingWarning) {
            console.log("Chain warning already exists, updating content");

            // Update existing warning instead of creating new one
            if (business.is_chain) {
                existingWarning.innerHTML = `
                    <p><strong>${business.bname}</strong> is a national chain parent business.</p>
                    <p>Chain businesses can only be modified by administrators.</p>
                `;
            } else if (business.chain_id) {
                existingWarning.innerHTML = `
                    <p><strong>${business.bname}</strong> is part of the <strong>${business.chain_name || 'chain'}</strong> chain.</p>
                    <p>This location may have chain-wide incentives that apply automatically.</p>
                `;
            }

            return;
        }

        // Create a new chain warning banner
        const chainWarning = document.createElement('div');
        chainWarning.className = 'chain-business-warning';

        if (business.is_chain) {
            chainWarning.innerHTML = `
                <p><strong>${business.bname}</strong> is a national chain parent business.</p>
                <p>Chain businesses can only be modified by administrators.</p>
            `;
        } else if (business.chain_id) {
            chainWarning.innerHTML = `
                <p><strong>${business.bname}</strong> is part of the <strong>${business.chain_name || 'chain'}</strong> chain.</p>
                <p>This location may have chain-wide incentives that apply automatically.</p>
            `;
        }

        // Insert at the beginning of the section
        infoSection.insertBefore(chainWarning, infoSection.firstChild);
    }
}

/**
 * Prevent duplicate chain banners in the incentives section
 */
function preventDuplicateChainBanners() {
    // Wait for the enhancedFetchIncentives function to complete
    const checkInterval = setInterval(() => {
        const incentivesSection = document.getElementById('incentives-section');
        if (incentivesSection) {
            // Check for multiple chain warnings
            const warnings = document.querySelectorAll('.chain-incentive-warning, .chain-business-warning');
            if (warnings.length > 1) {
                console.log("Found multiple chain warnings, removing duplicates");

                // Keep the first one, remove others
                for (let i = 1; i < warnings.length; i++) {
                    warnings[i].remove();
                }
            }

            // Stop checking once we've processed the incentives section
            clearInterval(checkInterval);
        }
    }, 500);

    // Maximum check time (5 seconds)
    setTimeout(() => clearInterval(checkInterval), 5000);
}

/**
 * Create or update business info display as detailed view
 * @param {Object} business - The business data
 */
function createDetailedBusinessDisplay(business) {
    // Only proceed if we have business data and can find the section
    if (!business) return;

    const infoSection = document.getElementById('business-info-section');
    if (!infoSection) return;

    // Check if we already have a detailed display
    if (infoSection.querySelector('.business-details')) return;

    // Check if there's an existing form-style display
    const formFields = infoSection.querySelectorAll('input, select, textarea, br, label');
    if (formFields.length > 0) {
        // Hide the form fields temporarily
        formFields.forEach(field => {
            field.style.display = 'none';
        });
    }

    // Create detailed business display
    const detailsContainer = document.createElement('div');
    detailsContainer.className = 'business-details';
    detailsContainer.innerHTML = `
        <div class="detail-row">
            <span class="detail-label">Business Name:</span>
            <span id="business-name-display" class="detail-value">${business.bname || ''}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Address:</span>
            <span id="business-address-display" class="detail-value">${business.address1 || ''}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">City, State Zip:</span>
            <span id="business-city-state-display" class="detail-value">${business.city || ''}, ${business.state || ''} ${business.zip || ''}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Phone:</span>
            <span id="business-phone-display" class="detail-value">${business.phone || ''}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Type:</span>
            <span id="business-type-display" class="detail-value">${getBusinessTypeLabel(business.type) || ''}</span>
        </div>
    `;

    // Add chain badge to business name if needed
    const nameDisplay = detailsContainer.querySelector('#business-name-display');
    if (nameDisplay) {
        if (business.is_chain) {
            nameDisplay.innerHTML += ' <span class="chain-badge">National Chain</span>';
        } else if (business.chain_id) {
            nameDisplay.innerHTML += ' <span class="chain-badge">Chain Location</span>';
        }
    }

    // Add this to the info section
    infoSection.appendChild(detailsContainer);

    // Add chain warning if needed
    addChainInfoIfNeeded(business);
}

/**
 * Get readable label for business type
 * @param {string} typeCode - Business type code
 * @returns {string} Readable label
 */
function getBusinessTypeLabel(typeCode) {
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

// Additional fix for business view initialization
const path = window.location.pathname;
if (path.includes('incentive-view.html')) {
    // Wait for any existing logic to complete
    window.addEventListener('load', function() {
        console.log("Adding detailed business view fix");

        // Try to find if there's business data available
        if (window.selectedBusinessData || window.lastSelectedBusiness) {
            const business = window.selectedBusinessData || window.lastSelectedBusiness;

            // Create detailed view with the business data
            setTimeout(() => {
                console.log("Creating detailed business display");
                createDetailedBusinessDisplay(business);
            }, 300);
        }
    });
}
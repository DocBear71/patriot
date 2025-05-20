// business-chain-handler.js - Adds chain business handling to existing files

/**
 * Check if the current user has admin privileges
 * @returns {boolean} True if the user is an admin
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

// Function to modify business search results for chain handling
function modifyBusinessSearchResults(businesses, resultsContainer) {
    // Check if the user is an admin
    const isAdmin = checkIfUserIsAdmin();
    console.log("User is admin:", isAdmin);

    // Create table with chain badges and admin-only protections
    let tableHTML = `
        <table class="results-table">
            <thead>
                <tr>
                    <th>Business Name</th>
                    <th>Address</th>
                    <th>City</th>
                    <th>State</th>
                    <th>Zip</th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody>
    `;

    // Process each business in the results
    businesses.forEach(business => {
        // Check if this is a chain parent business
        const isChainParent = business.is_chain === true;

        // Format address display (chains won't have address)
        const address = business.address1 || (isChainParent ? '<em>National Chain Headquarters</em>' : '');
        const address2Display = business.address2 ? `<br>${business.address2}` : '';

        // Create chain badge if needed
        let chainBadge = '';
        if (isChainParent) {
            chainBadge = '<span class="chain-badge">National Chain</span>';
        } else if (business.chain_id) {
            chainBadge = '<span class="chain-badge">Chain Location</span>';
        }

        // Create select button with admin restrictions if needed
        let selectButton;
        if (isChainParent) {
            if (isAdmin) {
                // Only admins see functional button for chain parents
                selectButton = `<button class="select-business admin-action-btn" data-business-id="${business._id}">Admin: Edit Chain</button>`;
            } else {
                // Regular users see view-only button
                selectButton = `<button class="view-chain-btn" onclick="viewChainDetails('${business._id}')">View Chain Info</button>`;
            }
        } else {
            // Regular business or chain location - all users can select
            selectButton = `<button class="select-business" data-business-id="${business._id}">Select</button>`;
        }

        // Add row to the table
        tableHTML += `
            <tr ${isChainParent && !isAdmin ? 'class="chain-parent-row"' : ''}>
                <td data-title="Business Name">${business.bname} ${chainBadge}</td>
                <td data-title="Address">${address}${address2Display}</td>
                <td data-title="City">${business.city || ''}</td>
                <td data-title="State">${business.state || ''}</td>
                <td data-title="Zip">${business.zip || ''}</td>
                <td data-title="Action">${selectButton}</td>
            </tr>
        `;
    });

    tableHTML += `
            </tbody>
        </table>
    `;

    // Add the table to the results container
    resultsContainer.innerHTML = tableHTML;

    // Set up event listeners for the select buttons
    setupBusinessSelectButtons(resultsContainer, businesses);
}

// Set up business selection buttons with proper chain handling
function setupBusinessSelectButtons(container, businesses) {
    // The isAdmin check is now done per-button in the rendering function
    const selectButtons = container.querySelectorAll('.select-business');

    selectButtons.forEach(button => {
        button.addEventListener('click', function() {
            const businessId = this.getAttribute('data-business-id');
            if (!businessId) {
                console.error("No business ID found on button");
                return;
            }

            // Find the business object
            const selectedBusiness = businesses.find(bus => bus._id === businessId);
            if (!selectedBusiness) {
                console.error("Could not find business with ID:", businessId);
                return;
            }

            console.log("Selected business:", selectedBusiness);

            // Handle based on current page
            const currentPagePath = window.location.pathname;
            handleBusinessSelectionByPage(currentPagePath, selectedBusiness);
        });
    });
}

// Update the handleBusinessSelectionByPage function to handle chains
function handleBusinessSelectionByPage(currentPagePath, selectedBusiness) {
    // Check if business is a chain parent and user is not admin
    const isChainParent = selectedBusiness.is_chain === true;
    const isAdmin = checkIfUserIsAdmin();

    if (isChainParent && !isAdmin) {
        // Show a warning message for non-admin users
        showChainParentWarning(selectedBusiness);
        return;
    }

    // Special handling for incentive-update.html
    if (currentPagePath.includes('incentive-update.html')) {
        console.log("On incentive-update page");
        if (typeof window.selectBusinessForIncentive === 'function') {
            window.selectBusinessForIncentive(selectedBusiness);
        } else if (typeof window.selectBusinessForIncentives === 'function') {
            window.selectBusinessForIncentives(selectedBusiness);
        } else {
            console.error("selectBusinessForIncentive(s) not found, falling back");
            handleBusinessSelection(selectedBusiness);
        }
    }
    // Check if we're on business-update.html
    else if (currentPagePath.includes('business-update.html')) {
        console.log("On business-update page");
        if (typeof window.selectBusinessForUpdate === 'function') {
            window.selectBusinessForUpdate(selectedBusiness);
        } else {
            console.error("selectBusinessForUpdate not found, falling back");
            handleBusinessSelection(selectedBusiness);
        }
    }
    // Check to see if we are on incentive-add page
    else if (currentPagePath.includes('incentive-add.html')) {
        console.log("On incentive-add page");
        // for incentive-add, call business-incentive-handler.js
        if (typeof window.selectBusinessForIncentive === 'function') {
            window.selectBusinessForIncentive(selectedBusiness);
        } else {
            handleBusinessSelection(selectedBusiness);
        }
    } else if (currentPagePath.includes('incentive-view.html') || currentPagePath.endsWith('business-search.html')) {
        console.log("On incentive-view page");
        // for incentive-view, call business-incentive-viewer.js
        if (typeof window.viewBusinessIncentives === 'function') {
            window.viewBusinessIncentives(selectedBusiness);
        } else {
            handleBusinessSelection(selectedBusiness);
        }
    } else {
        console.error("Using fallback business selection handler");
        handleBusinessSelection(selectedBusiness);
    }
}

// Show warning for chain parent selection by non-admin users
function showChainParentWarning(chainBusiness) {
    // Create a modal or alert to show warning
    const modalHTML = `
        <div class="modal fade" id="chainWarningModal" tabindex="-1" role="dialog" aria-labelledby="chainWarningModalLabel">
            <div class="modal-dialog" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="chainWarningModalLabel">Chain Business Information</h5>
                        <button type="button" class="close" data-bs-dismiss="modal" aria-label="Close">
                            <span aria-hidden="true">&times;</span>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="chain-business-warning">
                            <p><strong>${chainBusiness.bname}</strong> is a national chain business.</p>
                            <p>Chain businesses can only be modified by administrators. Please select a specific location instead.</p>
                        </div>
                        <p>To add an incentive, please search for a specific location of this chain.</p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Add modal to body if not already present
    if (!document.getElementById('chainWarningModal')) {
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHTML;
        document.body.appendChild(modalContainer);
    }

    // Show the modal - handle both Bootstrap 5 and 4
    if (typeof bootstrap !== 'undefined') {
        // Bootstrap 5
        const modal = new bootstrap.Modal(document.getElementById('chainWarningModal'));
        modal.show();
    } else {
        // Bootstrap 4 or jQuery fallback
        $('#chainWarningModal').modal('show');
    }
}

/**
 * Function to display chain information in incentives view
 */
function displayChainIncentivesInfo(businessData, container) {
    if (!businessData || !container) return;

    // Check if business is part of a chain
    if (businessData.chain_id) {
        // Create warning banner for chain location
        const chainInfoDiv = document.createElement('div');
        chainInfoDiv.className = 'chain-business-warning';
        chainInfoDiv.innerHTML = `
            <p><strong>${businessData.bname}</strong> is part of the <strong>${businessData.chain_name || 'chain'}</strong> chain.</p>
            <p>This location may have chain-wide incentives applied automatically.</p>
        `;

        // Insert at the beginning of container
        container.insertBefore(chainInfoDiv, container.firstChild);
    }
}

/**
 * Modify the business info section to show chain status
 */
function enhanceBusinessInfoDisplay(businessData) {
    const businessInfoSection = document.getElementById('business-info-section');
    if (!businessInfoSection) return;

    // Check if this is a chain parent or chain location
    const isChainParent = businessData.is_chain === true;
    const isChainLocation = businessData.chain_id ? true : false;

    if (isChainParent || isChainLocation) {
        // Create a chain info banner
        const chainInfoBanner = document.createElement('div');
        chainInfoBanner.className = 'chain-business-warning';

        if (isChainParent) {
            chainInfoBanner.innerHTML = `
                <p><strong>${businessData.bname}</strong> is a national chain parent business.</p>
                <p>Changes to chain-wide incentives can only be made by administrators.</p>
            `;
        } else if (isChainLocation) {
            chainInfoBanner.innerHTML = `
                <p><strong>${businessData.bname}</strong> is part of the <strong>${businessData.chain_name || 'chain'}</strong> chain.</p>
                <p>This location may have chain-wide incentives that apply automatically.</p>
            `;
        }

        // Insert at the beginning of section
        businessInfoSection.insertBefore(chainInfoBanner, businessInfoSection.firstChild);
    }

    // Style the display to match incentive-update.html style
    const inputFields = businessInfoSection.querySelectorAll('input, select');
    inputFields.forEach(field => {
        field.classList.add('view-only-field');

        // Create view-only indicator
        const fieldLabel = businessInfoSection.querySelector(`label[for="${field.id}"]`);
        if (fieldLabel && !fieldLabel.querySelector('.view-only-indicator')) {
            const viewOnlyIndicator = document.createElement('span');
            viewOnlyIndicator.className = 'view-only-indicator';
            viewOnlyIndicator.textContent = '(view only)';
            fieldLabel.appendChild(viewOnlyIndicator);
        }
    });
}

// Override the displayBusinessSearchResults function
function enhancedDisplayBusinessSearchResults(businesses, resultsContainer) {
    console.log("Enhanced business search display activated");
    modifyBusinessSearchResults(businesses, resultsContainer);
}

// If the original function exists, replace it with our enhanced version
if (typeof window.displayBusinessSearchResults === 'function') {
    console.log("Overriding displayBusinessSearchResults with enhanced version");
    window.originalDisplayBusinessSearchResults = window.displayBusinessSearchResults;
    window.displayBusinessSearchResults = enhancedDisplayBusinessSearchResults;
}

// Add CSS styles for chain handling
function addChainStylesIfNeeded() {
    if (!document.getElementById('chain-handling-styles')) {
        const style = document.createElement('style');
        style.id = 'chain-handling-styles';
        style.textContent = `
            /* Chain Badge and permission styles */
            .chain-badge {
                background-color: #4285F4;
                color: white;
                border-radius: 4px;
                padding: 3px 6px;
                font-size: 12px;
                display: inline-block;
                margin-left: 5px;
                font-weight: normal;
            }
            
            .chain-badge.small {
                font-size: 10px;
                padding: 2px 4px;
            }
            
            /* Styling for chain warning banners */
            .chain-incentive-warning,
            .chain-business-warning {
                background-color: #FFF3CD;
                color: #856404;
                border: 1px solid #FFEEBA;
                padding: 10px;
                margin-bottom: 15px;
                border-radius: 4px;
            }
            
            /* Admin button styling */
            .select-incentive.admin-chain,
            .admin-action-btn {
                background-color: #9C27B0;
                color: white;
                border: none;
                padding: 5px 10px;
                border-radius: 4px;
                cursor: pointer;
                font-weight: bold;
            }
            
            .select-incentive.admin-chain:hover,
            .admin-action-btn:hover {
                background-color: #7B1FA2;
            }
            
            /* View-only button for regular users */
            .view-chain-btn {
                background-color: #2196F3;
                color: white;
                border: none;
                padding: 5px 10px;
                border-radius: 4px;
                cursor: pointer;
            }
            
            .view-chain-btn:hover {
                background-color: #0D8AED;
            }
            
            /* Fix for form fields */
            input:not([disabled]),
            select:not([disabled]),
            textarea:not([disabled]) {
                opacity: 1 !important;
                pointer-events: auto !important;
            }
            
            /* Make sure buttons are always clickable */
            #business-search-form input[type="submit"],
            #reset-button,
            .clear-button,
            .select-business,
            .select-incentive {
                cursor: pointer !important;
                opacity: 1 !important;
                pointer-events: auto !important;
            }
            
            /* Style for view-only indicators */
            .view-only-indicator {
                color: #6c757d;
                font-style: italic;
                font-size: 0.9em;
                display: block;
                margin-top: 2px;
            }
            
            /* Apply consistent view-only styling */
            .view-only-field {
                background-color: #f8f9fa;
                border-color: #ced4da;
                color: #495057;
                pointer-events: none;
            }
            
            /* Highlight chain parent rows for clarity */
            .chain-parent-row {
                background-color: #f8f9fa !important;
            }
            
            /* Chain incentive flag in results */
            .chain-incentive-flag {
                background-color: #4285F4;
                color: white;
                border-radius: 4px;
                padding: 2px 5px;
                font-size: 11px;
                margin-left: 5px;
            }
        `;
        document.head.appendChild(style);
        console.log("Added chain handling styles");
    }
}

// Initialize when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log("Chain business handler initialized");
    addChainStylesIfNeeded();

    // If on incentive-view.html, enhance the business info display
    const path = window.location.pathname;
    if (path.includes('incentive-view.html')) {
        // Save original function reference
        if (typeof window.viewBusinessIncentives === 'function') {
            const originalViewBusinessIncentives = window.viewBusinessIncentives;

            // Override with enhanced version
            window.viewBusinessIncentives = function(selectedBusiness) {
                // Call original function
                originalViewBusinessIncentives(selectedBusiness);

                // Add our enhancements
                setTimeout(() => {
                    enhanceBusinessInfoDisplay(selectedBusiness);
                    displayChainIncentivesInfo(selectedBusiness, document.getElementById('incentives-container'));
                }, 100);
            };
        }
    }

    // Handle incentive-add.html page
    if (path.includes('incentive-add.html')) {
        // Save original function reference
        if (typeof window.selectBusinessForIncentive === 'function') {
            const originalSelectBusinessForIncentive = window.selectBusinessForIncentive;

            // Override with enhanced version
            window.selectBusinessForIncentive = function(selectedBusiness) {
                // Check if business is a chain parent and user is not admin
                const isChainParent = selectedBusiness.is_chain === true;
                const isAdmin = checkIfUserIsAdmin();

                if (isChainParent && !isAdmin) {
                    // Show warning and prevent selection
                    showChainParentWarning(selectedBusiness);
                    return;
                }

                // Call original function
                originalSelectBusinessForIncentive(selectedBusiness);

                // Add our enhancements
                setTimeout(() => {
                    enhanceBusinessInfoDisplay(selectedBusiness);
                }, 100);
            };
        }
    }

    // Handle incentive-update.html page
    if (path.includes('incentive-update.html')) {
        // Try to find and override selectBusinessForIncentives
        if (typeof window.selectBusinessForIncentives === 'function') {
            const originalSelectBusinessForIncentives = window.selectBusinessForIncentives;

            // Override with enhanced version
            window.selectBusinessForIncentives = function(selectedBusiness) {
                // Check if business is a chain parent and user is not admin
                const isChainParent = selectedBusiness.is_chain === true;
                const isAdmin = checkIfUserIsAdmin();

                if (isChainParent && !isAdmin) {
                    // Show warning and prevent selection
                    showChainParentWarning(selectedBusiness);
                    return;
                }

                // Store selected business in window to use it later
                window.selectedBusinessData = selectedBusiness;

                // Call original function
                originalSelectBusinessForIncentives(selectedBusiness);
            };
        }
    }
});

// Export functions for external use
window.chainHandler = {
    checkIfUserIsAdmin,
    modifyBusinessSearchResults,
    setupBusinessSelectButtons,
    enhanceBusinessInfoDisplay,
    displayChainIncentivesInfo,
    showChainParentWarning
};
/**
 * Chain Management JavaScript
 * Handles all functionality for managing business chains
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the page
    initChainManagement();
});

// Global variables
let currentChainId = null;
let allChains = []; // Store all chains
let currentPage = 1;
let chainsPerPage = 10; // Adjust this number as needed
let filteredChains = []; // Store filtered chains for search

/**
 * Initialize the chain management page
 */
function initChainManagement() {
    console.log('Initializing chain management page');

    // Check admin status first
    checkAdminStatus().then(isAdmin => {
        if (isAdmin) {
            // Add event listeners
            setupEventListeners();

            // Set up back to top button
            setupBackToTopButton();

            // Load existing chains
            loadExistingChains();

            // Set up search functionality
            setupSearchFunctionality();

            // Add pagination keyboard support
            setupPaginationKeyboardSupport();

            setupModals();
        } else {
            console.error("Admin access denied");
        }
    });
}

function setupBackToTopButton() {
    const backToTopBtn = document.getElementById('backToTopBtn');

    if (backToTopBtn) {
        // Show/hide button based on scroll position
        window.addEventListener('scroll', function() {
            if (window.pageYOffset > 300) {
                backToTopBtn.classList.add('show');
            } else {
                backToTopBtn.classList.remove('show');
            }
        });

        // Smooth scroll to top when clicked
        backToTopBtn.addEventListener('click', function() {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
}

/**
 * Load and display chain summary statistics
 */
function loadChainSummary() {
    const summaryContent = document.getElementById('summary-content');
    if (!summaryContent) return;

    const baseURL = getBaseURL();

    // Call the chains API to get summary statistics
    fetch(`${baseURL}/api/chains.js?operation=summary`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to load chain summary: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            displayChainSummary(data);
        })
        .catch(error => {
            console.error('Error loading chain summary:', error);

            // Fallback: Calculate summary from existing chain data if available
            if (allChains && allChains.length > 0) {
                calculateSummaryFromChains();
            } else {
                displaySummaryError();
            }
        });
}

/**
 * Display the chain summary statistics
 * @param {Object} data - Summary data from API
 */
function displayChainSummary(data) {
    const summaryContent = document.getElementById('summary-content');
    if (!summaryContent) return;

    // Extract data with fallbacks
    const totalChains = data.total_chains || 0;
    const totalLocations = data.total_locations || 0;
    const totalIncentives = data.total_incentives || 0;
    const activeChainsWithIncentives = data.active_chains_with_incentives || 0;

    summaryContent.innerHTML = `
        <div class="summary-stats">
            <div class="stat-card chains">
                <span class="stat-number">${totalChains.toLocaleString()}</span>
                <div class="stat-label">Total Chains</div>
            </div>
            <div class="stat-card locations">
                <span class="stat-number">${totalLocations.toLocaleString()}</span>
                <div class="stat-label">Chain Locations</div>
            </div>
            <div class="stat-card incentives">
                <span class="stat-number">${totalIncentives.toLocaleString()}</span>
                <div class="stat-label">Total Incentives</div>
            </div>
            <div class="stat-card active-chains">
                <span class="stat-number">${activeChainsWithIncentives.toLocaleString()}</span>
                <div class="stat-label">Chains with Incentives</div>
            </div>
        </div>
    `;
}

/**
 * Calculate summary from existing chain data (fallback method)
 */
function calculateSummaryFromChains() {
    const summaryContent = document.getElementById('summary-content');
    if (!summaryContent || !allChains) return;

    let totalChains = allChains.length;
    let totalLocations = 0;
    let totalIncentives = 0;
    let activeChainsWithIncentives = 0;

    // Calculate totals from chain data
    allChains.forEach(chain => {
        totalLocations += chain.location_count || 0;
        totalIncentives += chain.incentive_count || 0;
        if (chain.incentive_count > 0) {
            activeChainsWithIncentives++;
        }
    });

    summaryContent.innerHTML = `
        <div class="summary-stats">
            <div class="stat-card chains">
                <span class="stat-number">${totalChains.toLocaleString()}</span>
                <div class="stat-label">Total Chains</div>
            </div>
            <div class="stat-card locations">
                <span class="stat-number">${totalLocations.toLocaleString()}</span>
                <div class="stat-label">Chain Locations</div>
            </div>
            <div class="stat-card incentives">
                <span class="stat-number">${totalIncentives.toLocaleString()}</span>
                <div class="stat-label">Total Incentives</div>
            </div>
            <div class="stat-card active-chains">
                <span class="stat-number">${activeChainsWithIncentives.toLocaleString()}</span>
                <div class="stat-label">Chains with Incentives</div>
            </div>
        </div>
        <p style="text-align: center; margin-top: 15px; font-size: 0.85rem; color: #6c757d;">
            <em>Statistics calculated from current page data</em>
        </p>
    `;
}

/**
 * Display error message for summary
 */
function displaySummaryError() {
    const summaryContent = document.getElementById('summary-content');
    if (!summaryContent) return;

    summaryContent.innerHTML = `
        <div class="summary-error">
            <strong>Unable to load chain statistics</strong><br>
            <small>The summary will be available once chain data loads successfully.</small>
        </div>
    `;
}

/**
 * Refresh the chain summary (call this after creating/updating/deleting chains)
 */
function refreshChainSummary() {
    loadChainSummary();
}

// UPDATE your existing loadExistingChains function to also load the summary
// REPLACE your existing loadExistingChains function with this updated version:
function loadExistingChains() {
    const chainsListContainer = document.getElementById('chains-list');
    if (!chainsListContainer) return;

    const baseURL = getBaseURL();

    // Show loading indicator
    chainsListContainer.innerHTML = `
        <div class="text-center py-3">
            <div class="spinner-border text-primary" role="status">
                <span class="sr-only">Loading...</span>
            </div>
            <p>Loading chains...</p>
        </div>
    `;

    fetch(`${baseURL}/api/chains.js?operation=list`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to load chains: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (!data.chains || data.chains.length === 0) {
                chainsListContainer.innerHTML = '<p class="text-center py-3">No chains found. Create a new chain above.</p>';
                hidePagination();

                // Still try to load summary even if no chains
                loadChainSummary();
                return;
            }

            // Store all chains and set up pagination
            allChains = data.chains.sort((a, b) => a.chain_name.localeCompare(b.chain_name));
            filteredChains = [...allChains];
            currentPage = 1;

            displayChainsPage();
            updatePagination();

            // Load the chain summary
            loadChainSummary();
        })
        .catch(error => {
            console.error('Error loading chains:', error);
            chainsListContainer.innerHTML = `
                <div class="alert alert-danger" role="alert">
                    Error loading chains: ${error.message}
                </div>
            `;
            hidePagination();
            displaySummaryError();
        });
}


/**
 * Setup Bootstrap 5 modals
 */
function setupModals() {
    // Add click handler for any data-bs-dismiss="modal" elements
    document.querySelectorAll('[data-bs-dismiss="modal"]').forEach(button => {
        button.addEventListener('click', function() {
            const modalElement = this.closest('.modal');
            if (modalElement) {
                ModalHelper.hide(modalElement.id);
            }
        });
    });
}

/**
 * Bootstrap 5 Modal helper
 */
const ModalHelper = {
    /**
     * Get a Bootstrap 5 Modal instance
     * @param {string} modalId - The ID of the modal
     * @returns {Object|null} The Bootstrap Modal instance or null
     */
    getInstance: function(modalId) {
        const modalElement = document.getElementById(modalId);
        if (!modalElement) return null;

        try {
            return bootstrap.Modal.getInstance(modalElement);
        } catch (error) {
            console.warn(`Could not get modal instance for ${modalId}:`, error);
            return null;
        }
    },

    /**
     * Create a new Bootstrap Modal instance
     * @param {string} modalId - The ID of the modal
     * @returns {Object|null} The Bootstrap Modal instance or null
     */
    createInstance: function(modalId) {
        const modalElement = document.getElementById(modalId);
        if (!modalElement) return null;

        try {
            return new bootstrap.Modal(modalElement);
        } catch (error) {
            console.warn(`Could not create modal instance for ${modalId}:`, error);
            return null;
        }
    },

    /**
     * Show a modal
     * @param {string} modalId - The ID of the modal to show
     */
    show: function(modalId) {
        let modal = this.getInstance(modalId);
        if (!modal) {
            modal = this.createInstance(modalId);
        }

        if (modal) {
            modal.show();
        } else {
            console.error(`Could not show modal: ${modalId}`);
        }
    },

    /**
     * Hide a modal
     * @param {string} modalId - The ID of the modal to hide
     */
    hide: function(modalId) {
        const modal = this.getInstance(modalId);
        if (modal) {
            modal.hide();
        } else {
            // Fallback for when the instance isn't available
            const modalElement = document.getElementById(modalId);
            if (modalElement) {
                $(modalElement).removeClass('show');
                $(modalElement).css('display', 'none');
                $(modalElement).attr('aria-hidden', 'true');
                $(modalElement).removeAttr('aria-modal');

                // Remove backdrop
                $('.modal-backdrop').remove();

                // Remove modal-open class from body
                $('body').removeClass('modal-open');
                $('body').css('overflow', '');
                $('body').css('padding-right', '');
            }
        }
    }
};

/**
 * Check if the current user has admin access
 * @returns {Promise<boolean>} Promise resolving to true if user has admin access
 */
async function checkAdminStatus() {
    try {
        // Get auth token
        const token = getAuthToken();
        if (!token) {
            console.error("No auth token found");
            window.location.href = '/index.html?login=required&redirect=' + encodeURIComponent(window.location.pathname);
            return false;
        }

        // Determine the base URL
        const baseURL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
            ? `http://${window.location.host}`
            : window.location.origin;

        try {
            // Try the verify-token endpoint
            const response = await fetch(`${baseURL}/api/auth.js?operation=verify-token`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Cache-Control': 'no-cache'
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    window.location.href = '/index.html?login=required&redirect=' + encodeURIComponent(window.location.pathname);
                    return false;
                }

                // For development - can be removed in production
                const useDevMode = confirm('API error encountered. Would you like to bypass admin verification for development purposes?');
                if (useDevMode) {
                    console.warn('DEVELOPMENT MODE: Bypassing admin verification');
                    return true;
                }

                showAccessDenied();
                return false;
            }

            const data = await response.json();
            const isAdminUser = data.isAdmin === true || data.level === 'Admin';

            if (!isAdminUser) {
                showAccessDenied();
            }

            return isAdminUser;
        } catch (error) {
            console.error('Error checking admin status:', error);

            // For development - can be removed in production
            const useDevMode = confirm('API error encountered. Would you like to bypass admin verification for development purposes?');
            if (useDevMode) {
                console.warn('DEVELOPMENT MODE: Bypassing admin verification');
                return true;
            }

            showAccessDenied();
            return false;
        }
    } catch (error) {
        console.error('Error in admin status check:', error);
        showAccessDenied();
        return false;
    }
}

/**
 * Display access denied message
 */
function showAccessDenied() {
    document.querySelector('main').innerHTML = `
        <div class="container">
            <div class="alert alert-danger" role="alert">
                <h4 class="alert-heading">Access Denied</h4>
                <p>You do not have permission to access this page. Only administrators can manage business chains.</p>
                <hr>
                <p class="mb-0">Please <a href="/index.html">return to the homepage</a> or contact an administrator if you believe this is an error.</p>
            </div>
        </div>
    `;
}

/**
 * Set up all event listeners for the page
 */
function setupEventListeners() {
    // Create chain form submission
    const createChainForm = document.getElementById('create-chain-form');
    if (createChainForm) {
        createChainForm.addEventListener('submit', function(event) {
            event.preventDefault();
            createNewChain();
        });
    }

    // Update chain form submission
    const updateChainForm = document.getElementById('update-chain-form');
    if (updateChainForm) {
        updateChainForm.addEventListener('submit', function(event) {
            event.preventDefault();
            updateChain();
        });
    }

    // Delete chain button
    const deleteChainBtn = document.getElementById('delete-chain-btn');
    if (deleteChainBtn) {
        deleteChainBtn.addEventListener('click', function() {
            confirmDeleteChain();
        });
    }

    // Add location button
    const addLocationBtn = document.getElementById('add-location-btn');
    if (addLocationBtn) {
        addLocationBtn.addEventListener('click', function() {
            openAddLocationModal();
        });
    }

    // Manage incentives button
    const manageIncentivesBtn = document.getElementById('manage-incentives-btn');
    if (manageIncentivesBtn) {
        manageIncentivesBtn.addEventListener('click', function() {
            openManageIncentivesModal();
        });
    }

    // Add chain incentive form with proper duplicate prevention
    const addChainIncentiveForm = document.getElementById('add-chain-incentive-form');
    if (addChainIncentiveForm && !addChainIncentiveForm.hasAttribute('data-event-bound')) {
        addChainIncentiveForm.setAttribute('data-event-bound', 'true');
        addChainIncentiveForm.addEventListener('submit', function(event) {
            event.preventDefault();
            addChainIncentive(event);
        });
    }

    const modalCloseButtons = document.querySelectorAll('[data-bs-dismiss="modal"]');
    if (modalCloseButtons.length > 0) {
        modalCloseButtons.forEach(button => {
            button.addEventListener('click', function() {
                const modalId = this.closest('.modal').id;
                $(`#${modalId}`).modal('hide');

                // Also clean up modal backdrop and body classes
                $('body').removeClass('modal-open');
                $('.modal-backdrop').remove();
            });
        });
    }

    // NEW: Handle discount type change
    const discountTypeSelect = document.getElementById('discount-type');
    if (discountTypeSelect) {
        discountTypeSelect.addEventListener('change', function() {
            updateDiscountTypeUI(this.value);
        });

        // Initialize on page load
        updateDiscountTypeUI(discountTypeSelect.value);
    }

    const editChainIncentiveForm = document.getElementById('edit-chain-incentive-form');
    if (editChainIncentiveForm && !editChainIncentiveForm.hasAttribute('data-event-bound')) {
        editChainIncentiveForm.setAttribute('data-event-bound', 'true');
        editChainIncentiveForm.addEventListener('submit', function(event) {
            event.preventDefault();
            updateChainIncentive(event);
        });
    }

    // Handle discount type change for EDIT form - NEW
    const editDiscountTypeSelect = document.getElementById('edit-discount-type');
    if (editDiscountTypeSelect) {
        editDiscountTypeSelect.addEventListener('change', function() {
            updateEditDiscountTypeUI(this.value);
        });
    }

    // Add event listener for business search in modal
    const searchBusinessInput = document.getElementById('search-business');
    if (searchBusinessInput) {
        searchBusinessInput.addEventListener('input', debounce(function() {
            if (this.value.length >= 2) {
                searchBusinesses(this.value);
            }
        }, 500));
    }

    // Show/hide other description field based on incentive type - UPDATED
    const incentiveTypeSelect = document.getElementById('incentive-type');
    if (incentiveTypeSelect) {
        incentiveTypeSelect.addEventListener('change', function() {
            handleIncentiveTypeChange(this.value, false); // false = not edit form
        });
    }

    // Show/hide other description field for EDIT form - UPDATED
    const editIncentiveTypeSelect = document.getElementById('edit-incentive-type');
    if (editIncentiveTypeSelect) {
        editIncentiveTypeSelect.addEventListener('change', function() {
            handleIncentiveTypeChange(this.value, true); // true = edit form
        });
    }


    // Add event listener for chain search
    const searchChainInput = document.getElementById('search-chain');
    if (searchChainInput) {
        searchChainInput.addEventListener('input', debounce(function() {
            filterChains(this.value);
        }, 300));
    }
}

/**
 * NEW: Handle incentive type changes for both add and edit forms
 * @param {string} selectedType - The selected incentive type
 * @param {boolean} isEditForm - Whether this is the edit form or add form
 */
function handleIncentiveTypeChange(selectedType, isEditForm) {
    // Determine which form elements to work with
    const prefix = isEditForm ? 'edit-' : '';
    const otherDescriptionGroup = document.getElementById(prefix + 'other-description-group');
    const discountTypeSelect = document.getElementById(prefix + 'discount-type');
    const amountInput = document.getElementById(prefix + 'incentive-amount');
    const infoTextarea = document.getElementById(prefix + 'incentive-info');

    // Handle "Other" type description field
    if (otherDescriptionGroup) {
        if (selectedType === 'OT') {
            otherDescriptionGroup.style.display = 'block';
        } else {
            otherDescriptionGroup.style.display = 'none';
        }
    }

    // Handle "No Chainwide Incentives" type
    if (selectedType === 'NC') {
        // Disable and set discount type to percentage
        if (discountTypeSelect) {
            discountTypeSelect.value = 'percentage';
            discountTypeSelect.disabled = true;
        }

        // Set amount to 0 and disable
        if (amountInput) {
            amountInput.value = '0';
            amountInput.disabled = true;
        }

        // Set the standard message and disable
        if (infoTextarea) {
            infoTextarea.value = 'No chainwide incentives available, check your local location for available discounts and/or incentives';
            infoTextarea.disabled = true;
        }

        // Update the discount type UI
        if (isEditForm) {
            updateEditDiscountTypeUI('percentage');
        } else {
            updateDiscountTypeUI('percentage');
        }
    } else {
        // Re-enable fields for other types
        if (discountTypeSelect) {
            discountTypeSelect.disabled = false;
        }

        if (amountInput) {
            amountInput.disabled = false;
            if (selectedType !== 'NC') {
                amountInput.value = ''; // Clear value unless it's NC type
            }
        }

        if (infoTextarea) {
            infoTextarea.disabled = false;
            if (selectedType !== 'NC') {
                infoTextarea.value = ''; // Clear value unless it's NC type
            }
        }
    }
}


/**
 * UPDATED: Update discount type UI based on selection - FIXED for cents
 * @param {string} discountType - The selected discount type ('percentage' or 'dollar')
 */
function updateDiscountTypeUI(discountType) {
    const amountLabel = document.getElementById('amount-label');
    const amountPrefix = document.getElementById('amount-prefix');
    const amountInput = document.getElementById('incentive-amount');
    const amountHelp = document.getElementById('amount-help');

    if (!amountLabel || !amountPrefix || !amountInput || !amountHelp) return;

    if (discountType === 'dollar') {
        // Configure for dollar amount - FIXED: step should be 0.01 for cents
        amountLabel.textContent = 'Amount ($):';
        amountPrefix.textContent = '$';
        amountInput.setAttribute('max', '1000');
        amountInput.setAttribute('step', '0.01'); // FIXED: was incorrectly set to 0.01 then changed to 1
        amountInput.setAttribute('min', '0.01'); // Minimum 1 cent
        amountHelp.textContent = 'Enter the dollar discount amount (e.g., 0.05 for $0.05 off per gallon)';
    } else {
        // Configure for percentage (default)
        amountLabel.textContent = 'Amount (%):';
        amountPrefix.textContent = '%';
        amountInput.setAttribute('max', '100');
        amountInput.setAttribute('step', '.01'); // Percentages can be whole numbers
        amountInput.setAttribute('min', '.01'); // Minimum .01%
        amountHelp.textContent = 'Enter the discount percentage (0.01-100)';
    }

    // Clear the current value when switching types
    amountInput.value = '';
}


function displayChainsPage() {
    const chainsListContainer = document.getElementById('chains-list');
    if (!chainsListContainer) return;

    const startIndex = (currentPage - 1) * chainsPerPage;
    const endIndex = startIndex + chainsPerPage;
    const chainsToShow = filteredChains.slice(startIndex, endIndex);

    if (chainsToShow.length === 0) {
        chainsListContainer.innerHTML = '<p class="text-center py-3">No chains found.</p>';
        return;
    }

    // Build the chains list HTML
    let chainsHTML = '';
    chainsToShow.forEach(chain => {
        const businessTypeLabel = getBusinessTypeLabel(chain.business_type);

        chainsHTML += `
            <div class="card mb-2 chain-item" data-chain-id="${chain._id}" data-chain-name="${chain.chain_name}">
                <div class="card-body d-flex justify-content-between align-items-center py-2">
                    <div class="text-left">
                        <h4 class="mb-0 text-left">${chain.chain_name}</h4>
                        <small class="text-left">${businessTypeLabel}</small>
                    </div>
                    <div>
                        <small>${chain.location_count || 0} locations | ${chain.incentive_count || 0} incentives</small>
                        <button class="btn btn-sm btn-primary btn-action view-chain-btn"
                                data-chain-id="${chain._id}">
                            View Details
                        </button>
                    </div>
                </div>
            </div>
        `;
    });

    chainsListContainer.innerHTML = chainsHTML;

    // Add click event listeners
    const viewChainBtns = document.querySelectorAll('.view-chain-btn');
    viewChainBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const chainId = this.getAttribute('data-chain-id');
            viewChainDetails(chainId);
        });
    });
}

/**
 * UPDATED: Update edit form discount type UI - FIXED for cents
 * @param {string} discountType - The selected discount type ('percentage' or 'dollar')
 */
function updateEditDiscountTypeUI(discountType) {
    const amountLabel = document.getElementById('edit-amount-label');
    const amountPrefix = document.getElementById('edit-amount-prefix');
    const amountInput = document.getElementById('edit-incentive-amount');
    const amountHelp = document.getElementById('edit-amount-help');

    if (!amountLabel || !amountPrefix || !amountInput || !amountHelp) return;

    if (discountType === 'dollar') {
        // Configure for dollar amount - FIXED: step should be 0.01 for cents
        amountLabel.textContent = 'Amount ($):';
        amountPrefix.textContent = '$';
        amountInput.setAttribute('max', '1000');
        amountInput.setAttribute('step', '0.01'); // FIXED: Now allows cents
        amountInput.setAttribute('min', '0.01'); // Minimum 1 cent
        amountHelp.textContent = 'Enter the dollar discount amount (e.g., 0.05 for $0.05 off per gallon)';
    } else {
        // Configure for percentage (default)
        amountLabel.textContent = 'Amount (%):';
        amountPrefix.textContent = '%';
        amountInput.setAttribute('max', '100');
        amountInput.setAttribute('step', '0.01'); // CHANGED: Allow partial percentages
        amountInput.setAttribute('min', '0.01'); // CHANGED: Minimum 0.01%
        amountHelp.textContent = 'Enter the discount percentage (0.01-100)'; // CHANGED: Updated help text
    }
}

/**
 * NEW: Open edit chain incentive modal
 * @param {string} incentiveId - The ID of the incentive to edit
 * @param {Object} incentiveData - The current incentive data
 */
function openEditChainIncentiveModal(incentiveId, incentiveData) {
    if (!incentiveId || !incentiveData) {
        console.error('Invalid incentive data for editing');
        return;
    }

    // Populate the form with current data
    document.getElementById('edit-incentive-id').value = incentiveId;
    document.getElementById('edit-incentive-type').value = incentiveData.type || '';
    document.getElementById('edit-other-description').value = incentiveData.other_description || '';
    document.getElementById('edit-discount-type').value = incentiveData.discount_type || 'percentage';
    document.getElementById('edit-incentive-amount').value = incentiveData.amount || '';
    document.getElementById('edit-incentive-info').value = incentiveData.information || '';
    document.getElementById('edit-incentive-active').checked = incentiveData.is_active !== false;

    // Handle the incentive type change (this will set up NC type properly)
    handleIncentiveTypeChange(incentiveData.type || '', true);

    // Update discount type UI
    updateEditDiscountTypeUI(incentiveData.discount_type || 'percentage');

    // Show the modal
    ModalHelper.show('edit-chain-incentive-modal');
}

/**
 * UPDATED: Update chain incentive - handles "No Chainwide Incentives"
 */
function updateChainIncentive(event) {
    event.preventDefault();

    const chainId = currentChainId;
    const incentiveId = document.getElementById('edit-incentive-id').value;

    if (!chainId || !incentiveId) {
        alert('Missing chain or incentive information.');
        return;
    }

    const incentiveType = document.getElementById('edit-incentive-type').value;
    const otherDescription = document.getElementById('edit-other-description').value.trim();
    const incentiveAmount = document.getElementById('edit-incentive-amount').value;
    const incentiveInfo = document.getElementById('edit-incentive-info').value.trim();
    const discountType = document.getElementById('edit-discount-type').value;
    const isActive = document.getElementById('edit-incentive-active').checked;

    if (!incentiveType || !discountType) {
        alert('Please fill in all required fields.');
        return;
    }

    if (incentiveType === 'OT' && !otherDescription) {
        alert('Please provide a description for the "Other" incentive type.');
        return;
    }

    // UPDATED: Special handling for "No Chainwide Incentives"
    let amount;
    if (incentiveType === 'NC') {
        amount = 0; // Always 0 for no chainwide incentives
    } else {
        if (!incentiveAmount) {
            alert('Please enter a discount amount.');
            return;
        }

        amount = parseFloat(incentiveAmount);
        if (isNaN(amount) || amount <= 0) {
            alert('Please enter a valid amount greater than 0.');
            return;
        }

        // Validate amount based on discount type (only for non-NC types)
        if (discountType === 'percentage') {
            if (amount > 100) {
                alert('Percentage discount cannot exceed 100%.');
                return;
            }
            if (amount < 0.01) {
                alert('Percentage discount must be at least 0.01%.');
                return;
            }
        } else if (discountType === 'dollar') {
            if (amount > 1000) {
                alert('Dollar discount cannot exceed $1000.');
                return;
            }
            if (amount < 0.01) {
                alert('Dollar discount must be at least $0.01.');
                return;
            }
        }
    }

    const baseURL = getBaseURL();

    const incentiveData = {
        chain_id: chainId,
        incentive_id: incentiveId,
        type: incentiveType,
        amount: amount,
        information: incentiveInfo,
        discount_type: discountType,
        is_active: isActive
    };

    if (incentiveType === 'OT') {
        incentiveData.other_description = otherDescription;
    }

    fetch(`${baseURL}/api/chains.js?operation=update_incentive`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify(incentiveData)
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to update incentive: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            alert('Incentive updated successfully!');

            // Close the edit modal
            ModalHelper.hide('edit-chain-incentive-modal');

            // Reload chain incentives in the manage modal if it's open
            if (document.getElementById('manage-incentives-modal').classList.contains('show')) {
                loadModalChainIncentives(chainId);
            }

            // Reload chain details to update the main view
            viewChainDetails(chainId);
            refreshChainSummary();
        })
        .catch(error => {
            console.error('Error updating incentive:', error);
            alert(`Error updating incentive: ${error.message}`);
        });
}



function updatePagination() {
    const paginationContainer = document.getElementById('pagination-container');
    const paginationInfo = document.getElementById('paginationInfo');
    const pageJumpInput = document.getElementById('pageJumpInput');

    if (!paginationContainer) return;

    const totalPages = Math.ceil(filteredChains.length / chainsPerPage);

    if (totalPages <= 1) {
        paginationContainer.style.display = 'none';
        return;
    }

    paginationContainer.style.display = 'block';

    // Update info display
    const startItem = (currentPage - 1) * chainsPerPage + 1;
    const endItem = Math.min(currentPage * chainsPerPage, filteredChains.length);
    paginationInfo.textContent = `Page ${currentPage} of ${totalPages} (${startItem}-${endItem} of ${filteredChains.length} chains)`;

    // Update jump input max value
    if (pageJumpInput) {
        pageJumpInput.max = totalPages;
        pageJumpInput.placeholder = `1-${totalPages}`;
    }

    // Update button states
    updatePaginationButtons(totalPages);

    // Update page numbers display
    updatePageNumbers(totalPages);
}

// New function to update pagination button states
function updatePaginationButtons(totalPages) {
    const firstBtn = document.getElementById('firstPageBtn');
    const prevBtn = document.getElementById('prevPageBtn');
    const prevTenBtn = document.getElementById('prevTenBtn');
    const nextBtn = document.getElementById('nextPageBtn');
    const nextTenBtn = document.getElementById('nextTenBtn');
    const lastBtn = document.getElementById('lastPageBtn');

    // First page and previous buttons
    if (firstBtn) firstBtn.disabled = currentPage === 1;
    if (prevBtn) prevBtn.disabled = currentPage === 1;
    if (prevTenBtn) prevTenBtn.disabled = currentPage <= 10;

    // Last page and next buttons
    if (lastBtn) lastBtn.disabled = currentPage === totalPages;
    if (nextBtn) nextBtn.disabled = currentPage === totalPages;
    if (nextTenBtn) nextTenBtn.disabled = currentPage > totalPages - 10;
}

// New function to display page numbers (shows current page ± 2 pages)
function updatePageNumbers(totalPages) {
    const pageNumbersContainer = document.getElementById('pageNumbers');
    if (!pageNumbersContainer) return;

    // Only show page numbers if there are multiple pages but not too many
    if (totalPages <= 1 || totalPages > 20) {
        pageNumbersContainer.style.display = 'none';
        return;
    }

    pageNumbersContainer.style.display = 'flex';

    let pageNumbersHTML = '';
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);

    // Adjust range to always show 5 pages when possible
    if (endPage - startPage < 4) {
        if (startPage === 1) {
            endPage = Math.min(totalPages, startPage + 4);
        } else if (endPage === totalPages) {
            startPage = Math.max(1, endPage - 4);
        }
    }

    // Add ellipsis and first page if needed
    if (startPage > 1) {
        pageNumbersHTML += `<button class="pagination-btn" onclick="jumpToPage(1)">1</button>`;
        if (startPage > 2) {
            pageNumbersHTML += `<span class="pagination-separator">...</span>`;
        }
    }

    // Add page numbers
    for (let i = startPage; i <= endPage; i++) {
        const activeClass = i === currentPage ? 'active' : '';
        pageNumbersHTML += `<button class="pagination-btn ${activeClass}" onclick="jumpToPage(${i})">${i}</button>`;
    }

    // Add ellipsis and last page if needed
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            pageNumbersHTML += `<span class="pagination-separator">...</span>`;
        }
        pageNumbersHTML += `<button class="pagination-btn" onclick="jumpToPage(${totalPages})">${totalPages}</button>`;
    }

    pageNumbersContainer.innerHTML = pageNumbersHTML;
}


// Enhanced changePage function
function changePage(direction) {
    const totalPages = Math.ceil(filteredChains.length / chainsPerPage);

    let newPage = currentPage + direction;

    // Ensure we stay within bounds
    if (newPage < 1) newPage = 1;
    if (newPage > totalPages) newPage = totalPages;

    // Only update if the page actually changed
    if (newPage !== currentPage) {
        currentPage = newPage;
        displayChainsPage();
        updatePagination();

        // Smooth scroll to chains list
        document.getElementById('chains-list').scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }
}

// New function to jump to a specific page
function jumpToPage(pageNumber) {
    const totalPages = Math.ceil(filteredChains.length / chainsPerPage);

    if (pageNumber < 1) pageNumber = 1;
    if (pageNumber > totalPages) pageNumber = totalPages;

    if (pageNumber !== currentPage) {
        currentPage = pageNumber;
        displayChainsPage();
        updatePagination();

        // Smooth scroll to chains list
        document.getElementById('chains-list').scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }
}

// New function to jump to last page
function jumpToLastPage() {
    const totalPages = Math.ceil(filteredChains.length / chainsPerPage);
    jumpToPage(totalPages);
}

// New function to jump to page from input field
function jumpToInputPage() {
    const pageInput = document.getElementById('pageJumpInput');
    if (!pageInput) return;

    const pageNumber = parseInt(pageInput.value);
    if (isNaN(pageNumber)) {
        alert('Please enter a valid page number.');
        return;
    }

    const totalPages = Math.ceil(filteredChains.length / chainsPerPage);

    if (pageNumber < 1 || pageNumber > totalPages) {
        alert(`Please enter a page number between 1 and ${totalPages}.`);
        return;
    }

    jumpToPage(pageNumber);
    pageInput.value = ''; // Clear the input
}

// New function to change items per page
function changeItemsPerPage() {
    const select = document.getElementById('chainsPerPageSelect');
    if (!select) return;

    const newItemsPerPage = parseInt(select.value);
    if (isNaN(newItemsPerPage)) return;

    // Calculate what the new current page should be to keep roughly the same items visible
    const firstItemIndex = (currentPage - 1) * chainsPerPage;
    const newCurrentPage = Math.floor(firstItemIndex / newItemsPerPage) + 1;

    chainsPerPage = newItemsPerPage;
    currentPage = newCurrentPage;

    displayChainsPage();
    updatePagination();
}

// Add keyboard support for the jump input
function setupPaginationKeyboardSupport() {
    const pageJumpInput = document.getElementById('pageJumpInput');
    if (pageJumpInput) {
        pageJumpInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                jumpToInputPage();
            }
        });
    }
}

// Add this function to hide pagination
function hidePagination() {
    const paginationContainer = document.getElementById('pagination-container');
    if (paginationContainer) {
        paginationContainer.style.display = 'none';
    }
}

/**
 * Create a new chain - COMPLETE FUNCTION
 */
function createNewChain() {
    const chainName = document.getElementById('chain-name').value.trim();
    const chainType = document.getElementById('chain-type').value;
    const universalIncentives = document.getElementById('universal-incentives').checked;

    if (!chainName || !chainType) {
        alert('Please fill in all required fields.');
        return;
    }

    const baseURL = getBaseURL();

    const chainData = {
        chain_name: chainName,
        business_type: chainType,
        universal_incentives: universalIncentives
    };

    fetch(`${baseURL}/api/chains.js?operation=create`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify(chainData)
    })
        .then(response => {
            if (!response.ok) {
                return response.text().then(text => {
                    console.error("API Error Response:", text);
                    throw new Error(`Failed to create chain: ${response.status}`);
                });
            }
            return response.json();
        })
        .then(data => {
            alert('Chain created successfully!');

            // Reset the form
            document.getElementById('create-chain-form').reset();

            // Reload the chains list without scrolling
            loadExistingChains();
        }).then(data => {
        alert('Chain created successfully!');
        document.getElementById('create-chain-form').reset();
        loadExistingChains(); // This will also refresh the summary
    })
        .catch(error => {
            console.error('Error creating chain:', error);
            alert(`Error creating chain: ${error.message}`);
        });
}


/**
 * View chain details - UPDATED to use new chains API
 * @param {string} chainId - The ID of the chain to view
 */
function viewChainDetails(chainId) {
    if (!chainId) return;

    // Set current chain ID
    currentChainId = chainId;

    // Get the base URL
    const baseURL = getBaseURL();

    // NEW: Use chains API instead of business API
    fetch(`${baseURL}/api/chains.js?operation=get&id=${chainId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to load chain details: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // Check if we have a result
            if (!data.chain) {
                alert('Chain not found.');
                return;
            }

            const chain = data.chain;

            // Update chain details section with new chain structure
            document.getElementById('selected-chain-id').value = chain._id;
            document.getElementById('selected-chain-name').textContent = chain.chain_name;
            document.getElementById('update-chain-name').value = chain.chain_name;
            document.getElementById('update-chain-type').value = chain.business_type;
            document.getElementById('update-universal-incentives').checked = chain.universal_incentives === true;

            // Show the chain details section
            document.getElementById('chain-details').style.display = 'block';

            // Load chain incentives from embedded array
            loadChainIncentivesFromEmbedded(chain.incentives || []);

            // Load chain locations
            loadChainLocations(chainId);

            // Scroll to the chain details section
            document.getElementById('chain-details').scrollIntoView({ behavior: 'smooth' });
        })
        .catch(error => {
            console.error('Error loading chain details:', error);
            alert(`Error loading chain details: ${error.message}`);
        });
}

/**
 * UPDATED: Load incentives from embedded chain data - now includes edit button
 * @param {Array} incentives - Array of incentives from chain document
 */
function loadChainIncentivesFromEmbedded(incentives) {
    const incentivesContainer = document.getElementById('chain-incentives');
    if (!incentivesContainer) return;

    if (!incentives || incentives.length === 0) {
        incentivesContainer.innerHTML = '<p>No incentives found for this chain.</p>';
        return;
    }

    let incentivesHTML = '<div class="list-group">';

    incentives.forEach(incentive => {
        if (incentive.is_active !== false) {
            const typeLabel = getIncentiveTypeLabel(incentive.type);
            const otherDescription = incentive.other_description ?
                ` (${incentive.other_description})` : '';

            // UPDATED: Pass incentive type to formatDiscountAmount
            const discountDisplay = formatDiscountAmount(incentive.amount, incentive.discount_type, incentive.type);
            const statusBadge = incentive.is_active === false ?
                '<span class="badge badge-secondary">Inactive</span>' : '';

            incentivesHTML += `
                <div class="list-group-item d-flex justify-content-between align-items-center">
                    <div>
                        <strong>${typeLabel}${otherDescription}:</strong> ${discountDisplay} ${statusBadge}
                        <div><small>${incentive.information || ''}</small></div>
                    </div>
                    <div>
                        <button class="btn btn-sm btn-primary btn-action" 
                                onclick="editChainIncentiveFromMain('${incentive._id}')">
                            <i class="bi bi-pencil"></i> Edit
                        </button>
                        <button class="btn btn-sm btn-danger" 
                                onclick="deleteChainIncentive('${incentive._id}')">
                            <i class="bi bi-trash"></i> Remove
                        </button>
                    </div>
                </div>
            `;
        }
    });

    incentivesHTML += '</div>';
    incentivesContainer.innerHTML = incentivesHTML;
}

/**
 * Load incentives for a chain
 * @param {string} chainId - The ID of the chain
 */
function loadChainIncentives(chainId) {
    if (!chainId) return;

    const incentivesContainer = document.getElementById('chain-incentives');
    if (!incentivesContainer) return;

    // Show loading indicator
    incentivesContainer.innerHTML = '<p class="text-center">Loading incentives...</p>';

    // Get the base URL
    const baseURL = getBaseURL();

    // Make API request to get chain incentives
    fetch(`${baseURL}/api/combined-api.js?operation=incentives&business_id=${chainId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to load incentives: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // Check if we have results
            if (!data.results || data.results.length === 0) {
                incentivesContainer.innerHTML = '<p>No incentives found for this chain.</p>';
                return;
            }

            // Build the incentives list HTML
            let incentivesHTML = '<div class="list-group">';

            data.results.forEach(incentive => {
                if (incentive.is_available) {
                    const typeLabel = getIncentiveTypeLabel(incentive.type);
                    const otherDescription = incentive.other_description ?
                        ` (${incentive.other_description})` : '';

                    incentivesHTML += `
                        <div class="list-group-item d-flex justify-content-between align-items-center">
                            <div>
                                <strong>${typeLabel}${otherDescription}:</strong> ${incentive.amount}%
                                <div><small>${incentive.information || ''}</small></div>
                            </div>
                            <div>
                                <button class="btn btn-sm btn-danger" onclick="deleteIncentive('${incentive._id}')">
                                    <i class="fas fa-trash"></i> Remove
                                </button>
                            </div>
                        </div>
                    `;
                }
            });

            incentivesHTML += '</div>';

            incentivesContainer.innerHTML = incentivesHTML;
        })
        .catch(error => {
            console.error('Error loading incentives:', error);
            incentivesContainer.innerHTML = `
                <div class="alert alert-danger" role="alert">
                    Error loading incentives: ${error.message}
                </div>
            `;
        });
}

/**
 * Update a chain - UPDATED to use new chains API
 */
function updateChain() {
    const chainId = document.getElementById('selected-chain-id').value;
    if (!chainId) {
        alert('No chain selected.');
        return;
    }

    // Get form values
    const chainName = document.getElementById('update-chain-name').value.trim();
    const chainType = document.getElementById('update-chain-type').value;
    const universalIncentives = document.getElementById('update-universal-incentives').checked;

    if (!chainName || !chainType) {
        alert('Please fill in all required fields.');
        return;
    }

    // Get the base URL
    const baseURL = getBaseURL();

    // NEW: Prepare the chain data for new API structure
    const chainData = {
        _id: chainId,
        chain_name: chainName,
        business_type: chainType,
        universal_incentives: universalIncentives
    };

    // NEW: Use chains API instead of business API
    fetch(`${baseURL}/api/chains.js?operation=update`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify(chainData)
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to update chain: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            alert('Chain updated successfully!');

            // Update the chain name in the header
            document.getElementById('selected-chain-name').textContent = chainName;

            // Reload the chains list
            loadExistingChains();
        }).then(data => {
        alert('Chain updated successfully!');
        document.getElementById('selected-chain-name').textContent = chainName;
        loadExistingChains(); // This will also refresh the summary
    })
        .catch(error => {
            console.error('Error updating chain:', error);
            alert(`Error updating chain: ${error.message}`);
        });
}

/**
 * Delete a chain - UPDATED to use new chains API
 * @param {string} chainId - The ID of the chain to delete
 */
function deleteChain(chainId) {
    if (!chainId) return;

    // Get the base URL
    const baseURL = getBaseURL();

    // NEW: Use chains API instead of business API
    fetch(`${baseURL}/api/chains.js?operation=delete`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({ _id: chainId })
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to delete chain: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            alert('Chain deleted successfully!');

            // Hide the chain details section
            document.getElementById('chain-details').style.display = 'none';

            // Reset current chain ID
            currentChainId = null;

            // Reload the chains list
            loadExistingChains();
        }).then(data => {
        alert('Chain deleted successfully!');
        document.getElementById('chain-details').style.display = 'none';
        currentChainId = null;
        loadExistingChains(); // This will also refresh the summary
    })
        .catch(error => {
            console.error('Error deleting chain:', error);
            alert(`Error deleting chain: ${error.message}`);
        });
}

/**
 * Load chain locations - UPDATED to use new chains API
 * @param {string} chainId - The ID of the chain
 */
function loadChainLocations(chainId) {
    if (!chainId) return;

    const locationsContainer = document.getElementById('chain-locations');
    if (!locationsContainer) return;

    // Show loading indicator
    locationsContainer.innerHTML = '<p class="text-center">Loading locations...</p>';

    // Get the base URL
    const baseURL = getBaseURL();

    // NEW: Use chains API to get locations
    fetch(`${baseURL}/api/chains.js?operation=get_locations&chain_id=${chainId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to load locations: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // Check if we have results
            if (!data.locations || data.locations.length === 0) {
                locationsContainer.innerHTML = '<p>No locations found for this chain.</p>';
                return;
            }

            // Build the locations list HTML
            let locationsHTML = '';

            data.locations.forEach(location => {
                const addressLine = location.address2
                    ? `${location.address1}, ${location.address2}, ${location.city}, ${location.state} ${location.zip}`
                    : `${location.address1}, ${location.city}, ${location.state} ${location.zip}`;

                locationsHTML += `
                    <div class="location-item d-flex justify-content-between align-items-center">
                        <div>
                            <strong>${location.bname}</strong>
                            <div><small>${addressLine}</small></div>
                        </div>
                        <div>
                            <button class="btn btn-sm btn-danger" onclick="removeLocationFromChain('${location._id}')">
                                <i class="fas fa-unlink"></i> Remove
                            </button>
                        </div>
                    </div>
                `;
            });

            locationsContainer.innerHTML = locationsHTML;
        })
        .catch(error => {
            console.error('Error loading locations:', error);
            locationsContainer.innerHTML = `
                <div class="alert alert-danger" role="alert">
                    Error loading locations: ${error.message}
                </div>
            `;
        });
}

/**
 * Add a location to a chain - UPDATED to use new chains API
 * @param {string} businessId - The ID of the business to add as a location
 */
function addLocationToChain(businessId) {
    if (!businessId) return;

    const chainId = currentChainId;
    if (!chainId) {
        alert('No chain selected.');
        return;
    }

    // Get the base URL
    const baseURL = getBaseURL();

    // NEW: Use chains API to add location
    fetch(`${baseURL}/api/chains.js?operation=add_location`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({
            business_id: businessId,
            chain_id: chainId
        })
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to add location to chain: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            alert('Location added to chain successfully!');

            // Close the modal
            ModalHelper.hide('add-location-modal');

            // Reload chain locations
            loadChainLocations(chainId);
        })
        .catch(error => {
            console.error('Error adding location to chain:', error);
            alert(`Error adding location to chain: ${error.message}`);
        });
}

/**
 * Remove a location from a chain - UPDATED to use new chains API
 * @param {string} businessId - The ID of the business to remove
 */
function removeLocationFromChain(businessId) {
    if (!businessId) return;

    // Confirm remove
    if (!confirm('Are you sure you want to remove this location from the chain?')) {
        return;
    }

    // Get the base URL
    const baseURL = getBaseURL();

    // NEW: Use chains API to remove location
    fetch(`${baseURL}/api/chains.js?operation=remove_location`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({
            business_id: businessId
        })
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to remove location from chain: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            alert('Location removed from chain successfully!');

            // Reload chain locations
            loadChainLocations(currentChainId);
        })
        .catch(error => {
            console.error('Error removing location from chain:', error);
            alert(`Error removing location from chain: ${error.message}`);
        });
}

/**
 * Confirm delete chain
 */
function confirmDeleteChain() {
    const chainId = document.getElementById('selected-chain-id').value;
    if (!chainId) {
        alert('No chain selected.');
        return;
    }

    const chainName = document.getElementById('selected-chain-name').textContent;

    // Confirm delete
    if (confirm(`Are you sure you want to delete the chain "${chainName}"? This will remove all chain associations but will not delete individual locations.`)) {
        deleteChain(chainId);
    }
}

/**
 * Open add location modal
 */
function openAddLocationModal() {
    const chainId = currentChainId;
    if (!chainId) {
        alert('No chain selected.');
        return;
    }

    // Clear previous search results
    document.getElementById('business-search-results').innerHTML = '<p class="text-center">Search for a business to add as a location</p>';

    // Clear search input
    document.getElementById('search-business').value = '';

    // Show the modal
    $('#add-location-modal').modal('show');
}

/**
 * Search for businesses to add as locations
 * @param {string} query - The search query
 */
function searchBusinesses(query) {
    if (!query) return;

    const resultsContainer = document.getElementById('business-search-results');
    if (!resultsContainer) return;

    // Show loading indicator
    resultsContainer.innerHTML = '<p class="text-center">Searching...</p>';

    // Get the base URL
    const baseURL = getBaseURL();

    // Make API request to search for businesses
    fetch(`${baseURL}/api/business.js?operation=search&business_name=${encodeURIComponent(query)}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to search businesses: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // Check if we have results
            if (!data.results || data.results.length === 0) {
                resultsContainer.innerHTML = '<p class="text-center">No businesses found matching your search.</p>';
                return;
            }

            // Filter out businesses that are already chains
            const businesses = data.results.filter(business => !business.is_chain);

            if (businesses.length === 0) {
                resultsContainer.innerHTML = '<p class="text-center">No eligible businesses found. Businesses that are already chains cannot be added as locations.</p>';
                return;
            }

            // Build the businesses list HTML
            let businessesHTML = '<div class="list-group">';

            businesses.forEach(business => {
                const addressLine = business.address2
                    ? `${business.address1}, ${business.address2}, ${business.city}, ${business.state} ${business.zip}`
                    : `${business.address1}, ${business.city}, ${business.state} ${business.zip}`;

                // Check if this business is already part of a chain
                const isInChain = business.chain_id ? true : false;

                businessesHTML += `
                    <div class="list-group-item d-flex justify-content-between align-items-center">
                        <div>
                            <strong>${business.bname}</strong>
                            <div><small>${addressLine}</small></div>
                            ${isInChain ? '<span class="badge badge-warning">Already in another chain</span>' : ''}
                        </div>
                        <div>
                            <button class="btn btn-sm btn-success" 
                                    onclick="addLocationToChain('${business._id}')"
                                    ${isInChain ? 'disabled' : ''}>
                                Add to Chain
                            </button>
                        </div>
                    </div>
                `;
            });

            businessesHTML += '</div>';

            resultsContainer.innerHTML = businessesHTML;
        })
        .catch(error => {
            console.error('Error searching businesses:', error);
            resultsContainer.innerHTML = `
                <div class="alert alert-danger" role="alert">
                    Error searching businesses: ${error.message}
                </div>
            `;
        });
}

/**
 * UPDATED: Open manage incentives modal - reset discount type to default
 */
function openManageIncentivesModal() {
    const chainId = currentChainId;
    if (!chainId) {
        alert('No chain selected.');
        return;
    }

    // Load chain incentives in the modal
    loadModalChainIncentives(chainId);

    // Reset the form
    document.getElementById('add-chain-incentive-form').reset();

    // Hide the other description field
    document.getElementById('other-description-group').style.display = 'none';

    // NEW: Reset discount type to percentage and update UI
    const discountTypeSelect = document.getElementById('discount-type');
    if (discountTypeSelect) {
        discountTypeSelect.value = 'percentage';
        updateDiscountTypeUI('percentage');
    }

    // Show the modal
    ModalHelper.show('manage-incentives-modal');
}


/**
 * UPDATED: Load chain incentives in the modal - now includes edit buttons
 * @param {string} chainId - The ID of the chain
 */
function loadModalChainIncentives(chainId) {
    if (!chainId) return;

    const incentivesContainer = document.getElementById('modal-chain-incentives');
    if (!incentivesContainer) return;

    incentivesContainer.innerHTML = '<p class="text-center">Loading incentives...</p>';

    const baseURL = getBaseURL();

    fetch(`${baseURL}/api/chains.js?operation=get_incentives&chain_id=${chainId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to load incentives: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (!data.incentives || data.incentives.length === 0) {
                incentivesContainer.innerHTML = '<p>No incentives found for this chain.</p>';
                return;
            }

            let incentivesHTML = '<div class="list-group">';

            data.incentives.forEach(incentive => {
                const typeLabel = getIncentiveTypeLabel(incentive.type);
                const otherDescription = incentive.other_description ?
                    ` (${incentive.other_description})` : '';

                // UPDATED: Pass incentive type to formatDiscountAmount
                const discountDisplay = formatDiscountAmount(incentive.amount, incentive.discount_type, incentive.type);
                const statusBadge = incentive.is_active === false ?
                    '<span class="badge badge-secondary">Inactive</span>' : '';

                const incentiveDataJson = JSON.stringify(incentive).replace(/"/g, '&quot;');

                incentivesHTML += `
                    <div class="list-group-item d-flex justify-content-between align-items-center">
                        <div>
                            <strong>${typeLabel}${otherDescription}:</strong> ${discountDisplay} ${statusBadge}
                            <div><small>${incentive.information || ''}</small></div>
                        </div>
                        <div>
                            <button class="btn btn-sm btn-primary btn-action" 
                                    onclick="editChainIncentiveFromModal('${incentive._id}', '${incentiveDataJson}')">
                                <i class="bi bi-pencil"></i> Edit
                            </button>
                            <button class="btn btn-sm btn-danger" 
                                    onclick="deleteChainIncentive('${incentive._id}', true)">
                                <i class="bi bi-trash"></i> Remove
                            </button>
                        </div>
                    </div>
                `;
            });

            incentivesHTML += '</div>';
            incentivesContainer.innerHTML = incentivesHTML;
        })
        .catch(error => {
            console.error('Error loading incentives:', error);
            incentivesContainer.innerHTML = `
                <div class="alert alert-danger" role="alert">
                    Error loading incentives: ${error.message}
                </div>
            `;
        });
}

/**
 * UPDATED: Format discount amount for display - handles "No Chainwide Incentives"
 * @param {number} amount - The discount amount
 * @param {string} discountType - The discount type ('percentage' or 'dollar')
 * @param {string} incentiveType - The incentive type (to check for 'NC')
 * @returns {string} Formatted discount string
 */
function formatDiscountAmount(amount, discountType, incentiveType) {
    // Special handling for "No Chainwide Incentives"
    if (incentiveType === 'NC') {
        return 'See local location';
    }

    if (discountType === 'dollar') {
        return `$${parseFloat(amount).toFixed(2)} off`;
    } else {
        // Default to percentage
        return `${parseFloat(amount)}%`;
    }
}


/**
 * NEW: Edit chain incentive from main view
 * @param {string} incentiveId - The ID of the incentive to edit
 */
function editChainIncentiveFromMain(incentiveId) {
    // Get the current chain data to find the incentive
    const baseURL = getBaseURL();

    fetch(`${baseURL}/api/chains.js?operation=get&id=${currentChainId}`)
        .then(response => response.json())
        .then(data => {
            if (data.chain && data.chain.incentives) {
                const incentive = data.chain.incentives.find(inc => inc._id == incentiveId);
                if (incentive) {
                    openEditChainIncentiveModal(incentiveId, incentive);
                } else {
                    alert('Incentive not found.');
                }
            }
        })
        .catch(error => {
            console.error('Error loading incentive for edit:', error);
            alert('Error loading incentive data.');
        });
}

/**
 * NEW: Edit chain incentive from modal view
 * @param {string} incentiveId - The ID of the incentive to edit
 * @param {string} incentiveDataJson - JSON string of incentive data
 */
function editChainIncentiveFromModal(incentiveId, incentiveDataJson) {
    try {
        const incentiveData = JSON.parse(incentiveDataJson.replace(/&quot;/g, '"'));
        openEditChainIncentiveModal(incentiveId, incentiveData);
    } catch (error) {
        console.error('Error parsing incentive data:', error);
        alert('Error loading incentive data for editing.');
    }
}

/**
 * UPDATED: Add an incentive to a chain - handles "No Chainwide Incentives"
 */
function addChainIncentive(event) {
    event.preventDefault();

    const chainId = currentChainId;
    if (!chainId) {
        alert('No chain selected.');
        return;
    }

    const incentiveType = document.getElementById('incentive-type').value;
    const otherDescription = document.getElementById('other-description').value.trim();
    const incentiveAmount = document.getElementById('incentive-amount').value;
    const incentiveInfo = document.getElementById('incentive-info').value.trim();
    const discountType = document.getElementById('discount-type').value;

    if (!incentiveType || !discountType) {
        alert('Please fill in all required fields.');
        return;
    }

    if (incentiveType === 'OT' && !otherDescription) {
        alert('Please provide a description for the "Other" incentive type.');
        return;
    }

    // UPDATED: Special handling for "No Chainwide Incentives"
    let amount;
    if (incentiveType === 'NC') {
        amount = 0; // Always 0 for no chainwide incentives
    } else {
        if (!incentiveAmount) {
            alert('Please enter a discount amount.');
            return;
        }

        amount = parseFloat(incentiveAmount);
        if (isNaN(amount) || amount <= 0) {
            alert('Please enter a valid amount greater than 0.');
            return;
        }

        // Validate amount based on discount type (only for non-NC types)
        if (discountType === 'percentage') {
            if (amount > 100) {
                alert('Percentage discount cannot exceed 100%.');
                return;
            }
            if (amount < 0.01) {
                alert('Percentage discount must be at least 0.01%.');
                return;
            }
        } else if (discountType === 'dollar') {
            if (amount > 1000) {
                alert('Dollar discount cannot exceed $1000.');
                return;
            }
            if (amount < 0.01) {
                alert('Dollar discount must be at least $0.01.');
                return;
            }
        }
    }

    const baseURL = getBaseURL();

    const incentiveData = {
        chain_id: chainId,
        type: incentiveType,
        amount: amount,
        information: incentiveInfo,
        discount_type: discountType
    };

    if (incentiveType === 'OT') {
        incentiveData.other_description = otherDescription;
    }

    fetch(`${baseURL}/api/chains.js?operation=add_incentive`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify(incentiveData)
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to add incentive: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            alert('Incentive added successfully!');

            // Reset the form
            document.getElementById('add-chain-incentive-form').reset();

            // Reset discount type UI to default
            updateDiscountTypeUI('percentage');

            // Close the modal
            ModalHelper.hide('manage-incentives-modal');

            // Reload chain details
            viewChainDetails(chainId);
            refreshChainSummary();
        })
        .catch(error => {
            console.error('Error adding incentive:', error);
            alert(`Error adding incentive: ${error.message}`);
        });
}


/**
 * Delete a chain incentive - NEW function for embedded incentives
 * @param {string} incentiveId - The ID of the incentive to delete
 * @param {boolean} isModal - Whether the function is called from the modal
 */
function deleteChainIncentive(incentiveId, isModal = false) {
    if (!incentiveId) return;

    // Confirm delete
    if (!confirm('Are you sure you want to delete this incentive?')) {
        return;
    }

    // Get the base URL
    const baseURL = getBaseURL();

    // NEW: Use chains API to remove incentive
    fetch(`${baseURL}/api/chains.js?operation=remove_incentive`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({
            chain_id: currentChainId,
            incentive_id: incentiveId
        })
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to delete incentive: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            alert('Incentive deleted successfully!');

            // Reload incentives
            if (isModal) {
                loadModalChainIncentives(currentChainId);
            }

            // Always reload chain details to update the main view
            viewChainDetails(currentChainId);
        })
        .catch(error => {
            console.error('Error deleting incentive:', error);
            alert(`Error deleting incentive: ${error.message}`);
        });
}

/**
 * Delete an incentive
 * @param {string} incentiveId - The ID of the incentive to delete
 * @param {boolean} isModal - Whether the function is called from the modal
 */
function deleteIncentive(incentiveId, isModal = false) {
    if (!incentiveId) return;

    // Confirm delete
    if (!confirm('Are you sure you want to delete this incentive?')) {
        return;
    }

    // Get the base URL
    const baseURL = getBaseURL();

    // Make API request to delete the incentive - CHANGE THIS LINE:
    fetch(`${baseURL}/api/combined-api.js?operation=incentives&id=${incentiveId}&operation=delete`, {
        method: 'POST'
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to delete incentive: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            alert('Incentive deleted successfully!');

            // Reload incentives
            if (isModal) {
                loadModalChainIncentives(currentChainId);
            }

            // Always reload incentives in the main view
            loadChainIncentives(currentChainId);
        })
        .catch(error => {
            console.error('Error deleting incentive:', error);
            alert(`Error deleting incentive: ${error.message}`);
        });
}

/**
 * Filter chains based on search input
 * @param {string} query - The search query
 */
function filterChains(query) {
    if (!query.trim()) {
        // If no query, show all chains
        filteredChains = [...allChains];
    } else {
        // Filter chains based on query
        filteredChains = allChains.filter(chain =>
            chain.chain_name.toLowerCase().includes(query.toLowerCase()) ||
            getBusinessTypeLabel(chain.business_type).toLowerCase().includes(query.toLowerCase())
        );
    }

    // Reset to first page when filtering
    currentPage = 1;
    displayChainsPage();
    updatePagination();
}


/**
 * Set up search functionality
 */
function setupSearchFunctionality() {
    // Already implemented in setupEventListeners
}
/**
 * Get the base URL based on environment - FIXED
 * @returns {string} The base URL
 */
function getBaseURL() {
    return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? `http://${window.location.host}`  // Changed from https to http for localhost
        : window.location.origin;
}
/**
 * Get the label for a business type
 * @param {string} typeCode - The business type code
 * @returns {string} The business type label
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
        'HOTEL': 'Hotel/Motel',
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

/**
 * Get the label for an incentive type
 * @param {string} typeCode - The incentive type code
 * @returns {string} The incentive type label
 */
function getIncentiveTypeLabel(typeCode) {
    const types = {
        'VT': 'Veteran',
        'AD': 'Active-Duty',
        'FR': 'First Responder',
        'SP': 'Spouse',
        'NC': 'No Chainwide Incentives',
        'OT': 'Other'
    };

    return types[typeCode] || typeCode;
}

/**
 * Debounce function to limit function calls
 * @param {Function} func - The function to debounce
 * @param {number} wait - The wait time in milliseconds
 * @returns {Function} The debounced function
 */
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}
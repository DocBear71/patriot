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

            // Load existing chains
            loadExistingChains();

            // Set up search functionality
            setupSearchFunctionality();

            setupModals();
        } else {
            console.error("Admin access denied");
        }
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

    // Setup form submission for the incentive form
    const addChainIncentiveForm = document.getElementById('add-chain-incentive-form');
    if (addChainIncentiveForm) {
        addChainIncentiveForm.addEventListener('submit', function(event) {
            event.preventDefault();
            addChainIncentive(event);
        });
    }
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

    // Add chain incentive form
    // Add chain incentive form - just make sure it doesn't double-bind
    if (!document.getElementById('add-chain-incentive-form').hasAttribute('data-event-bound')) {
        document.getElementById('add-chain-incentive-form').setAttribute('data-event-bound', 'true');
        document.getElementById('add-chain-incentive-form').addEventListener('submit', function(event) {
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

    // Show/hide other description field based on incentive type
    const incentiveTypeSelect = document.getElementById('incentive-type');
    if (incentiveTypeSelect) {
        incentiveTypeSelect.addEventListener('change', function() {
            const otherDescriptionGroup = document.getElementById('other-description-group');
            if (this.value === 'OT') {
                otherDescriptionGroup.style.display = 'block';
            } else {
                otherDescriptionGroup.style.display = 'none';
            }
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

    // Add event listener for chain search
    const searchChainInput = document.getElementById('search-chain');
    if (searchChainInput) {
        searchChainInput.addEventListener('input', debounce(function() {
            filterChains(this.value);
        }, 300));
    }
}

/**
 * Load existing chains from the database
 */
function loadExistingChains() {
    const chainsListContainer = document.getElementById('chains-list');
    if (!chainsListContainer) return;

    const baseURL = getBaseURL();

    // NEW: Use chains API instead of business API
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
                return;
            }

            // Sort chains alphabetically
            data.chains.sort((a, b) => a.chain_name.localeCompare(b.chain_name));

            // Build the chains list HTML
            let chainsHTML = '';
            data.chains.forEach(chain => {
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
        })
        .catch(error => {
            console.error('Error loading chains:', error);
            chainsListContainer.innerHTML = `
                <div class="alert alert-danger" role="alert">
                    Error loading chains: ${error.message}
                </div>
            `;
        });
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

    // NEW: Use chains API with updated data structure
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

            // Reload the chains list
            loadExistingChains();

            // View the newly created chain
            if (data.chain && data.chain._id) {
                viewChainDetails(data.chain._id);
            }
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
 * Load incentives from embedded chain data
 * @param {Array} incentives - Array of incentives from chain document
 */
function loadChainIncentivesFromEmbedded(incentives) {
    const incentivesContainer = document.getElementById('chain-incentives');
    if (!incentivesContainer) return;

    // Check if we have incentives
    if (!incentives || incentives.length === 0) {
        incentivesContainer.innerHTML = '<p>No incentives found for this chain.</p>';
        return;
    }

    // Build the incentives list HTML
    let incentivesHTML = '<div class="list-group">';

    incentives.forEach(incentive => {
        if (incentive.is_active) {
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
                        <button class="btn btn-sm btn-danger" onclick="deleteChainIncentive('${incentive._id}')">
                            <i class="fas fa-trash"></i> Remove
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
 * Open manage incentives modal
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

    // Show the modal using the helper
    ModalHelper.show('manage-incentives-modal');
}


/**
 * Load chain incentives in the modal - UPDATED for new API
 * @param {string} chainId - The ID of the chain
 */
function loadModalChainIncentives(chainId) {
    if (!chainId) return;

    const incentivesContainer = document.getElementById('modal-chain-incentives');
    if (!incentivesContainer) return;

    // Show loading indicator
    incentivesContainer.innerHTML = '<p class="text-center">Loading incentives...</p>';

    // Get the base URL
    const baseURL = getBaseURL();

    // NEW: Use chains API to get incentives
    fetch(`${baseURL}/api/chains.js?operation=get_incentives&chain_id=${chainId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to load incentives: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // Check if we have results
            if (!data.incentives || data.incentives.length === 0) {
                incentivesContainer.innerHTML = '<p>No incentives found for this chain.</p>';
                return;
            }

            // Build the incentives list HTML
            let incentivesHTML = '<div class="list-group">';

            data.incentives.forEach(incentive => {
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
                            <button class="btn btn-sm btn-danger" onclick="deleteChainIncentive('${incentive._id}', true)">
                                <i class="fas fa-trash"></i> Remove
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
 * Add an incentive to a chain - UPDATED for new API
 */
function addChainIncentive(event) {
    // Ensure we have the event
    event = event || window.event;
    // Prevent the default form submission
    if (event) event.preventDefault();

    const chainId = currentChainId;
    if (!chainId) {
        alert('No chain selected.');
        return;
    }

    // Get form values
    const incentiveType = document.getElementById('incentive-type').value;
    const otherDescription = document.getElementById('other-description').value.trim();
    const incentiveAmount = document.getElementById('incentive-amount').value;
    const incentiveInfo = document.getElementById('incentive-info').value.trim();

    if (!incentiveType || !incentiveAmount) {
        alert('Please fill in all required fields.');
        return;
    }

    // Validate type-specific fields
    if (incentiveType === 'OT' && !otherDescription) {
        alert('Please provide a description for the "Other" incentive type.');
        return;
    }

    // Get the base URL
    const baseURL = getBaseURL();

    // NEW: Prepare the incentive data for new API
    const incentiveData = {
        chain_id: chainId,
        type: incentiveType,
        amount: incentiveAmount,
        information: incentiveInfo
    };

    // Add other description if needed
    if (incentiveType === 'OT') {
        incentiveData.other_description = otherDescription;
    }

    // NEW: Use chains API to add incentive
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

            // Close the modal using the helper
            ModalHelper.hide('manage-incentives-modal');

            // Reload incentives in the main view
            viewChainDetails(chainId); // Reload entire chain details
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
    const chainItems = document.querySelectorAll('.chain-item');

    chainItems.forEach(item => {
        const chainName = item.getAttribute('data-chain-name').toLowerCase();

        if (chainName.includes(query.toLowerCase())) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
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
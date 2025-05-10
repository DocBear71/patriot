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
        } else {
            console.error("Admin access denied");
        }
    });
}

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
    const addChainIncentiveForm = document.getElementById('add-chain-incentive-form');
    if (addChainIncentiveForm) {
        addChainIncentiveForm.addEventListener('submit', function(event) {
            event.preventDefault();
            addChainIncentive();
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

    // Get the base URL
    const baseURL = getBaseURL();

    // Make API request to get all chains
    fetch(`${baseURL}/api/business.js?operation=get_chains`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to load chains: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // Check if we have results
            if (!data.results || data.results.length === 0) {
                chainsListContainer.innerHTML = '<p class="text-center py-3">No chains found. Create a new chain above.</p>';
                return;
            }

            // Sort chains alphabetically
            data.results.sort((a, b) => a.bname.localeCompare(b.bname));

            // Build the chains list HTML
            let chainsHTML = '';

            data.results.forEach(chain => {
                // Get the business type label for display
                const businessTypeLabel = getBusinessTypeLabel(chain.type);

                chainsHTML += `
                    <div class="card mb-2 chain-item" data-chain-id="${chain._id}" data-chain-name="${chain.bname}">
                        <div class="card-body d-flex justify-content-between align-items-left py-2">
                            <div>
                                <h4 class="mb-0">${chain.bname}</h4>
                                <small>${businessTypeLabel}</small>
                            </div>
                            <div>
                                <small>${chain.locations ? chain.locations.length : 0} locations</small>
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

            // Add click event listeners to the view details buttons
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
 * Create a new chain
 */
function createNewChain() {
    // Get form values
    const chainName = document.getElementById('chain-name').value.trim();
    const chainType = document.getElementById('chain-type').value;
    const universalIncentives = document.getElementById('universal-incentives').checked;

    if (!chainName || !chainType) {
        alert('Please fill in all required fields.');
        return;
    }

    // Get the base URL
    const baseURL = getBaseURL();

    // Prepare the chain data WITHOUT the problematic location field
    const chainData = {
        bname: chainName,
        type: chainType,
        is_chain: true,
        universal_incentives: universalIncentives,
        locations: [],
        // Explicitly set location with coordinates (this is just a placeholder - you can set to null later if needed)
        location: {
            type: 'Point',
            coordinates: [0, 0]  // Default to [0,0] (null island)
        }
    };

    // Make API request to create the chain
    fetch(`${baseURL}/api/business.js?operation=create`, {
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
            if (data.result && data.result._id) {
                viewChainDetails(data.result._id);
            }
        })
        .catch(error => {
            console.error('Error creating chain:', error);
            alert(`Error creating chain: ${error.message}`);
        });
}

/**
 * View chain details
 * @param {string} chainId - The ID of the chain to view
 */
function viewChainDetails(chainId) {
    if (!chainId) return;

    // Set current chain ID
    currentChainId = chainId;

    // Get the base URL
    const baseURL = getBaseURL();

    // Make API request to get chain details
    fetch(`${baseURL}/api/business.js?operation=get&id=${chainId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to load chain details: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // Check if we have a result
            if (!data.result) {
                alert('Chain not found.');
                return;
            }

            const chain = data.result;

            // Update chain details section
            document.getElementById('selected-chain-id').value = chain._id;
            document.getElementById('selected-chain-name').textContent = chain.bname;
            document.getElementById('update-chain-name').value = chain.bname;
            document.getElementById('update-chain-type').value = chain.type;
            document.getElementById('update-universal-incentives').checked = chain.universal_incentives === true;

            // Show the chain details section
            document.getElementById('chain-details').style.display = 'block';

            // Load chain incentives
            loadChainIncentives(chainId);

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
    fetch(`${baseURL}/api/incentives.js?business_id=${chainId}`)
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
 * Load locations for a chain
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

    // Make API request to get chain locations
    fetch(`${baseURL}/api/business.js?operation=get_chain_locations&chain_id=${chainId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to load locations: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // Check if we have results
            if (!data.results || data.results.length === 0) {
                locationsContainer.innerHTML = '<p>No locations found for this chain.</p>';
                return;
            }

            // Build the locations list HTML
            let locationsHTML = '';

            data.results.forEach(location => {
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
 * Update a chain
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

    // Prepare the chain data
    const chainData = {
        _id: chainId,
        bname: chainName,
        type: chainType,
        is_chain: true,
        universal_incentives: universalIncentives
    };

    // Make API request to update the chain
    fetch(`${baseURL}/api/business.js?operation=update`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
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
 * Delete a chain
 * @param {string} chainId - The ID of the chain to delete
 */
function deleteChain(chainId) {
    if (!chainId) return;

    // Get the base URL
    const baseURL = getBaseURL();

    // Make API request to delete the chain
    fetch(`${baseURL}/api/business.js?operation=delete_chain&id=${chainId}`, {
        method: 'POST'
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
 * Add a location to a chain
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

    // Make API request to add the location to the chain
    fetch(`${baseURL}/api/business.js?operation=add_to_chain`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
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
            $('#add-location-modal').modal('hide');

            // Reload chain locations
            loadChainLocations(chainId);
        })
        .catch(error => {
            console.error('Error adding location to chain:', error);
            alert(`Error adding location to chain: ${error.message}`);
        });
}

/**
 * Remove a location from a chain
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

    // Make API request to remove the location from the chain
    fetch(`${baseURL}/api/business.js?operation=remove_from_chain`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
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

    // Show the modal
    $('#manage-incentives-modal').modal('show');
}

/**
 * Load chain incentives in the modal
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

    // Make API request to get chain incentives
    fetch(`${baseURL}/api/incentives.js?business_id=${chainId}`)
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
                                <button class="btn btn-sm btn-danger" onclick="deleteIncentive('${incentive._id}', true)">
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
 * Add an incentive to a chain
 */
function addChainIncentive() {
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

    // Prepare the incentive data
    const incentiveData = {
        business_id: chainId,
        type: incentiveType,
        amount: incentiveAmount,
        information: incentiveInfo,
        is_available: true
    };

    // Add other description if needed
    if (incentiveType === 'OT') {
        incentiveData.other_description = otherDescription;
    }

    // Make API request to add the incentive
    fetch(`${baseURL}/api/incentives.js?operation=create`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
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

            // Reload incentives in the modal
            loadModalChainIncentives(chainId);

            // Reload incentives in the main view
            loadChainIncentives(chainId);
        })
        .catch(error => {
            console.error('Error adding incentive:', error);
            alert(`Error adding incentive: ${error.message}`);
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

    // Make API request to delete the incentive
    fetch(`${baseURL}/api/incentives.js?operation=delete&id=${incentiveId}`, {
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
 * Get the base URL based on environment
 * @returns {string} The base URL
 */
function getBaseURL() {
    return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? `https://${window.location.host}`
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
        'AD': 'Active Duty',
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
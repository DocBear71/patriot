// admin-incentives.js - Incentive management for admin dashboard
document.addEventListener('DOMContentLoaded', function() {
    console.log("Admin Incentive Manager loaded!");

    // State variables
    let incentives = [];
    let businesses = []; // For populating the business dropdown
    let currentPage = 1;
    let totalPages = 1;
    let itemsPerPage = 10;
    let currentFilters = {
        search: '',
        business: '',
        type: '',
        availability: ''
    };
    let selectedIncentiveId = null;
    let actionType = 'create'; // 'create' or 'edit'

    // DOM Elements
    const incentiveTableBody = document.getElementById('incentive-table-body');
    const incentiveSearchInput = document.getElementById('incentive-search');
    const businessFilter = document.getElementById('business-filter');
    const typeFilter = document.getElementById('type-filter');
    const availabilityFilter = document.getElementById('availability-filter');
    const resetFiltersBtn = document.getElementById('reset-filters');
    const paginationContainer = document.getElementById('pagination-container');
    const incentiveForm = document.getElementById('incentive-form');
    const addIncentiveBtn = document.getElementById('add-incentive-btn');
    const saveIncentiveBtn = document.getElementById('save-incentive-btn');
    const confirmActionBtn = document.getElementById('confirm-action-btn');
    const businessIdSelect = document.getElementById('business-id');
    const otherTypeContainer = document.getElementById('other-type-container');
    const typeSelect = document.getElementById('type');

    // Initialize page after checking admin status
    checkAdminAccess();

    // Check admin access then initialize
    async function checkAdminAccess() {
        const isAdmin = await checkAdminStatus();
        if (isAdmin) {
            console.log("Admin access confirmed");
            init();
        } else {
            console.error("Admin access denied");
        }
    }

    // Initialize function
    function init() {
        // Load incentives on page load
        loadIncentives();

        // Load businesses for dropdowns
        loadBusinesses();

        // Set up event listeners
        setupEventListeners();
    }

    // Set up event listeners
    function setupEventListeners() {
        // Type select change handler
        if (typeSelect && otherTypeContainer) {
            typeSelect.addEventListener('change', function() {
                if (this.value === 'OT') {
                    otherTypeContainer.style.display = 'block';
                } else {
                    otherTypeContainer.style.display = 'none';
                }
            });
        }

        // Radio button handlers for available/not available
        const incentiveAvailable = document.getElementById('incentive-available');
        const incentiveNotAvailable = document.getElementById('incentive-not-available');

        if (incentiveAvailable && incentiveNotAvailable) {
            const incentiveFields = [
                document.getElementById('type'),
                document.getElementById('amount'),
                document.getElementById('information')
            ];

            function toggleIncentiveFields() {
                const isIncentiveAvailable = incentiveAvailable.checked;

                incentiveFields.forEach(field => {
                    if (field) {
                        field.disabled = !isIncentiveAvailable;

                        if (!isIncentiveAvailable) {
                            field.classList.add('disabled-field');
                        } else {
                            field.classList.remove('disabled-field');
                        }
                    }
                });

                if (otherTypeContainer && document.getElementById('other-description')) {
                    const otherTypeDescription = document.getElementById('other-description');
                    otherTypeDescription.disabled = !isIncentiveAvailable;

                    if (!isIncentiveAvailable) {
                        otherTypeContainer.style.display = 'none';
                        otherTypeDescription.classList.add('disabled-field');
                    } else if (document.getElementById('type').value === 'OT') {
                        otherTypeContainer.style.display = 'block';
                        otherTypeDescription.classList.remove('disabled-field');
                    }
                }

                if (!isIncentiveAvailable) {
                    incentiveFields.forEach(field => {
                        if (field) {
                            if (field.tagName === 'SELECT') {
                                field.selectedIndex = 0;
                            } else if (field.tagName === 'TEXTAREA') {
                                field.value = 'No incentives available at this business.';
                            } else if (field.type === 'number') {
                                field.value = '0';
                            }
                        }
                    });

                    if (document.getElementById('other-description')) {
                        document.getElementById('other-description').value = '';
                    }
                } else if (incentiveFields[2]) {
                    incentiveFields[2].value = '';
                }
            }

            incentiveAvailable.addEventListener('change', toggleIncentiveFields);
            incentiveNotAvailable.addEventListener('change', toggleIncentiveFields);
        }

        // Search input
        if (incentiveSearchInput) {
            incentiveSearchInput.addEventListener('input', debounce(function() {
                currentFilters.search = this.value;
                currentPage = 1;
                loadIncentives();
            }, 300));
        }

        // Business filter
        if (businessFilter) {
            businessFilter.addEventListener('change', function() {
                currentFilters.business = this.value;
                currentPage = 1;
                loadIncentives();
            });
        }

        // Type filter
        if (typeFilter) {
            typeFilter.addEventListener('change', function() {
                currentFilters.type = this.value;
                currentPage = 1;
                loadIncentives();
            });
        }

        // Availability filter
        if (availabilityFilter) {
            availabilityFilter.addEventListener('change', function() {
                currentFilters.availability = this.value;
                currentPage = 1;
                loadIncentives();
            });
        }

        // Reset filters
        if (resetFiltersBtn) {
            resetFiltersBtn.addEventListener('click', function() {
                if (incentiveSearchInput) incentiveSearchInput.value = '';
                if (businessFilter) businessFilter.value = '';
                if (typeFilter) typeFilter.value = '';
                if (availabilityFilter) availabilityFilter.value = '';

                currentFilters = {
                    search: '',
                    business: '',
                    type: '',
                    availability: ''
                };

                currentPage = 1;
                loadIncentives();
            });
        }

        // Add incentive button
        if (addIncentiveBtn) {
            addIncentiveBtn.addEventListener('click', function() {
                resetIncentiveForm();
                actionType = 'create';
                document.getElementById('incentiveModalLabel').textContent = 'Add New Incentive';
                window.ModalHelper.show('incentiveModal');
            });
        }

        // Save incentive button
        if (saveIncentiveBtn) {
            saveIncentiveBtn.addEventListener('click', function() {
                event.preventDefault();
                if (validateIncentiveForm()) {
                    if (actionType === 'create') {
                        createIncentive();
                    } else {
                        updateIncentive();
                    }
                }
            });
        }

        // Handle incentive form submission (to prevent default)
        if (incentiveForm) {
            incentiveForm.addEventListener('submit', function(e) {
                e.preventDefault();
            });
        }

        // Confirm action button (used for delete confirmation)
        if (confirmActionBtn) {
            confirmActionBtn.addEventListener('click', function() {
                if (selectedIncentiveId) {
                    deleteIncentive(selectedIncentiveId);
                }
            });
        }
    }

    // Function to get auth token
    function getAuthToken() {
        try {
            const sessionData = localStorage.getItem('patriotThanksSession');
            if (!sessionData) {
                console.error('No session data found');
                return null;
            }

            const session = JSON.parse(sessionData);
            if (!session.token) {
                console.error('No token found in session data');
                return null;
            }

            return session.token;
        } catch (error) {
            console.error('Error retrieving auth token:', error);
            return null;
        }
    }

    // Function to handle API errors
    function handleApiError(error, fallbackAction) {
        console.error('API Error:', error);

        // Check if error is related to authorization
        if (error.status === 401) {
            window.location.href = '/index.html?login=required&redirect=' + encodeURIComponent(window.location.pathname);
            return;
        }

        // Execute fallback action if provided
        if (typeof fallbackAction === 'function') {
            fallbackAction();
        }
    }

    // Verify admin status - standardized across admin pages
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

                    // Development mode - remove in production
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
                    return false;
                }

                return true;
            } catch (error) {
                console.error('Error checking admin status:', error);

                // Development mode - remove in production
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

    function showAccessDenied() {
        const container = document.querySelector('.admin-container');
        if (container) {
            container.innerHTML = `
                <div class="alert alert-danger" role="alert">
                    <h4 class="alert-heading">Access Denied</h4>
                    <p>You do not have permission to access this page. Only administrators can access the incentive management.</p>
                    <hr>
                    <p class="mb-0">Please <a href="/index.html">return to the homepage</a> or contact an administrator if you believe this is an error.</p>
                </div>
            `;
        }
    }

    /**
     * Update the total count in the UI
     * @param {number} count - The total count of items
     */
    function updateTotalCount(count) {
        // Find the heading element that contains the management title
        const headingEl = document.querySelector('.admin-header h2');

        if (headingEl) {
            // Get the base text without any existing badge
            const baseText = headingEl.textContent.split(' ').slice(0, 2).join(' ');

            // Update the heading to include the count
            headingEl.innerHTML = `${baseText} <span class="badge badge-info">${count} total</span>`;
        }
    }

    // Load incentives from API
    async function loadIncentives() {
        try {
            // Show loading indicator
            if (incentiveTableBody) {
                incentiveTableBody.innerHTML = '<tr><td colspan="8" class="text-center">Loading incentives...</td></tr>';
            }

            // Determine the base URL
            const baseURL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                ? `http://${window.location.host}`
                : window.location.origin;

            // Get auth token
            const token = getAuthToken();
            if (!token) {
                handleApiError({ status: 401 });
                return;
            }

            // Build query parameters
            let queryParams = `operation=admin-list-incentives&page=${currentPage}&limit=${itemsPerPage}`;

            if (currentFilters.search) {
                queryParams += `&search=${encodeURIComponent(currentFilters.search)}`;
            }

            if (currentFilters.business) {
                queryParams += `&business_id=${encodeURIComponent(currentFilters.business)}`;
            }

            if (currentFilters.type) {
                queryParams += `&type=${encodeURIComponent(currentFilters.type)}`;
            }

            if (currentFilters.availability) {
                queryParams += `&is_available=${encodeURIComponent(currentFilters.availability)}`;
            }

            console.log(`Fetching incentives with query: ${queryParams}`);

            // Make API request
            const response = await fetch(`${baseURL}/api/combined-api.js?operation=admin-incentives.js&action=${queryParams}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Cache-Control': 'no-cache'
                }
            });

            if (!response.ok) {
                throw response;
            }

            const data = await response.json();
            console.log("Incentives data from API:", data);

            // Store the total count from the API response
            incentives = data.incentives || data.results || [];
            totalPages = data.totalPages || Math.ceil((data.total || 0) / itemsPerPage) || 1;
            totalItems = data.total || 0; // <-- Make sure to capture this value

            // Update the UI to show the total count
            updateTotalCount(totalItems);

           // Render incentives in the table
            renderIncentives();

            // Update pagination
            renderPagination();
        } catch (error) {
            handleApiError(error, () => {
                if (incentiveTableBody) {
                    incentiveTableBody.innerHTML = '<tr><td colspan="8" class="text-center text-danger">Error loading incentives. Please try again later.</td></tr>';
                }

                // For development purposes, load mock data if API fails
                console.warn("Using mock data for development");
                loadMockIncentives();
            });
        }
    }

    // Load businesses for the dropdown
    async function loadBusinesses() {
        try {
            // Determine the base URL
            const baseURL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                ? `http://${window.location.host}`
                : window.location.origin;
            // Get auth token
            const token = getAuthToken();
            if (!token) {
                handleApiError({ status: 401 });
                return;
            }

            // Make API request
            const response = await fetch(`${baseURL}/api/business.js?operation=admin-list-businesses&limit=100`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Cache-Control': 'no-cache'
                }
            });

            if (!response.ok) {
                throw response;
            }

            const data = await response.json();
            businesses = data.businesses || [];

            // Populate business dropdowns
            populateBusinessDropdowns();
        } catch (error) {
            handleApiError(error, () => {
                // For development purposes, load mock data if API fails
                console.warn("Using mock business data for development");
                loadMockBusinesses();
            });
        }
    }

    // Populate business dropdowns
    function populateBusinessDropdowns() {
        // Clear existing options except the first one
        if (businessFilter) {
            while (businessFilter.options.length > 1) {
                businessFilter.remove(1);
            }
        }

        if (businessIdSelect) {
            while (businessIdSelect.options.length > 1) {
                businessIdSelect.remove(1);
            }
        }

        // Add business options
        businesses.forEach(business => {
            // Add to filter dropdown
            if (businessFilter) {
                const filterOption = document.createElement('option');
                filterOption.value = business._id;
                filterOption.textContent = business.bname;
                businessFilter.appendChild(filterOption);
            }

            // Add to form dropdown
            if (businessIdSelect) {
                const formOption = document.createElement('option');
                formOption.value = business._id;
                formOption.textContent = business.bname;
                businessIdSelect.appendChild(formOption);
            }
        });
    }

    // Load mock incentive data for development/testing
    function loadMockIncentives() {
        incentives = [
            {
                _id: '1',
                business_id: '1',
                businessName: 'Tech Solutions Inc.',
                type: 'VT',
                is_available: true,
                amount: 10,
                information: 'Veterans get 10% off all services.',
                created_at: '2025-04-01T00:00:00.000Z'
            },
            {
                _id: '2',
                business_id: '2',
                businessName: 'Hometown Diner',
                type: 'AD',
                is_available: true,
                amount: 15,
                information: 'Active duty military receive 15% discount.',
                created_at: '2025-04-05T00:00:00.000Z'
            },
            {
                _id: '3',
                business_id: '3',
                businessName: 'Cedar Medical Center',
                type: 'FR',
                is_available: true,
                amount: 20,
                information: 'First responders receive 20% off select services.',
                created_at: '2025-04-10T00:00:00.000Z'
            },
            {
                _id: '4',
                business_id: '4',
                businessName: 'Local Gym',
                type: 'OT',
                is_available: false,
                amount: 0,
                information: 'No incentives available at this business.',
                other_description: 'Previously offered military discounts',
                created_at: '2025-04-15T00:00:00.000Z'
            }
        ];

        totalPages = 1;
        renderIncentives();
        renderPagination();
    }

    // Load mock business data for development/testing
    function loadMockBusinesses() {
        businesses = [
            {
                _id: '1',
                bname: 'Tech Solutions Inc.'
            },
            {
                _id: '2',
                bname: 'Hometown Diner'
            },
            {
                _id: '3',
                bname: 'Cedar Medical Center'
            },
            {
                _id: '4',
                bname: 'Local Gym'
            }
        ];

        // Populate business dropdowns
        populateBusinessDropdowns();
    }

    // Render incentives in the table
    function renderIncentives() {
        if (!incentiveTableBody) return;

        if (incentives.length === 0) {
            incentiveTableBody.innerHTML = '<tr><td colspan="8" class="text-center">No incentives found</td></tr>';
            return;
        }

        incentiveTableBody.innerHTML = '';

        incentives.forEach(incentive => {
            // Format date
            const createdDate = new Date(incentive.created_at);
            const formattedDate = createdDate.toLocaleDateString();

            // Get business name - if not provided in the incentive, try to find it in the businesses array
            let businessName = incentive.businessName || 'Unknown Business';
            let locationText = 'Location not specified';

            // Find the matching business to get location info
            if (incentive.business_id) {
                const business = businesses.find(b => b._id === incentive.business_id);
                if (business) {
                    if (!businessName || businessName === 'Unknown Business') {
                        businessName = business.bname;
                    }

                    // Set location text if business has address, city, and state
                    if (business.address1 && business.city && business.state) {
                        locationText = `${business.address1}, ${business.city}, ${business.state}`;
                    }
                }
            }

            // Get type label
            const typeLabel = getIncentiveTypeLabel(incentive.type);

            // Format other type description
            const otherDesc = incentive.type === 'OT' && incentive.other_description
                ? `<br><em>(${incentive.other_description})</em>`
                : '';

            // Format availability
            const availabilityText = incentive.is_available ? 'Yes' : 'No';
            const availabilityClass = incentive.is_available ? 'text-success' : 'text-danger';

            // Format amount
            const amountText = incentive.is_available ? `${incentive.amount}%` : 'N/A';

            const row = document.createElement('tr');
            row.innerHTML = `
            <td>${businessName}</td>
            <td>${locationText}</td>
            <td>${typeLabel}${otherDesc}</td>
            <td class="${availabilityClass}">${availabilityText}</td>
            <td>${amountText}</td>
            <td>${incentive.information || 'No information available'}</td>
            <td>${formattedDate}</td>
            <td>
                <div class="action-btns">
                    <button class="btn btn-sm btn-info edit-incentive-btn" data-id="${incentive._id}">Edit</button>
                    <button class="btn btn-sm btn-danger delete-incentive-btn" data-id="${incentive._id}" data-business="${businessName}">Delete</button>
                </div>
            </td>
        `;

            incentiveTableBody.appendChild(row);
        });

        // Add event listeners to edit and delete buttons
        addIncentiveActionListeners();
    }

    // Add event listeners to incentive action buttons
    function addIncentiveActionListeners() {
        // Edit incentive buttons
        const editButtons = document.querySelectorAll('.edit-incentive-btn');
        editButtons.forEach(button => {
            button.addEventListener('click', function() {
                const incentiveId = this.getAttribute('data-id');
                editIncentive(incentiveId);
            });
        });

        // Delete incentive buttons
        const deleteButtons = document.querySelectorAll('.delete-incentive-btn');
        deleteButtons.forEach(button => {
            button.addEventListener('click', function() {
                const incentiveId = this.getAttribute('data-id');
                const businessName = this.getAttribute('data-business');

                // Update confirmation message and store selected ID
                const confirmationMessage = document.getElementById('confirmation-message');
                if (confirmationMessage) {
                    confirmationMessage.textContent = `Are you sure you want to delete this incentive for ${businessName}?`;
                }
                selectedIncentiveId = incentiveId;

                // Show confirmation modal
                $('#confirmationModal').modal('show');
            });
        });
    }

    // Render pagination
    function renderPagination() {
        if (!paginationContainer) return;

        if (totalPages <= 1) {
            paginationContainer.innerHTML = '';
            return;
        }

        let html = '';

        // Previous button
        html += `
            <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${currentPage - 1}" aria-label="Previous">
                    <span aria-hidden="true">&laquo;</span>
                </a>
            </li>
        `;

        // Page numbers
        const maxPagesToShow = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
        let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

        // Adjust start page if we're at the end
        if (endPage - startPage + 1 < maxPagesToShow) {
            startPage = Math.max(1, endPage - maxPagesToShow + 1);
        }

        // First page
        if (startPage > 1) {
            html += `<li class="page-item"><a class="page-link" href="#" data-page="1">1</a></li>`;
            if (startPage > 2) {
                html += `<li class="page-item disabled"><a class="page-link" href="#">...</a></li>`;
            }
        }

        // Page numbers
        for (let i = startPage; i <= endPage; i++) {
            html += `<li class="page-item ${i === currentPage ? 'active' : ''}"><a class="page-link" href="#" data-page="${i}">${i}</a></li>`;
        }

        // Last page
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                html += `<li class="page-item disabled"><a class="page-link" href="#">...</a></li>`;
            }
            html += `<li class="page-item"><a class="page-link" href="#" data-page="${totalPages}">${totalPages}</a></li>`;
        }

        // Next button
        html += `
            <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${currentPage + 1}" aria-label="Next">
                    <span aria-hidden="true">&raquo;</span>
                </a>
            </li>
        `;

        paginationContainer.innerHTML = html;

        // Add event listeners to pagination links
        const paginationLinks = document.querySelectorAll('.page-link');
        paginationLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const page = parseInt(this.getAttribute('data-page'));
                if (!isNaN(page) && page > 0 && page <= totalPages) {
                    currentPage = page;
                    loadIncentives();
                }
            });
        });
    }

    // Create new incentive
    async function createIncentive() {
        try {
            // Determine the base URL
            const baseURL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                ? `http://${window.location.host}`
                : window.location.origin;

            // Get auth token
            const token = getAuthToken();
            if (!token) {
                return;
            }

            // Get form data
            const formData = getIncentiveFormData();

            // Make API request - we'll use the existing incentives API endpoint
            const response = await fetch(`${baseURL}/api/combined-api.js?operation=incentives`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache'
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw response;
            }

            const data = await response.json();

            // Hide modal
            window.ModalHelper.hide('incentiveModal');

            // Show success message
            showAlert('success', 'Incentive created successfully!');

            // Reload incentives
            loadIncentives();
        } catch (error) {
            handleApiError(error, () => {
                showAlert('danger', 'Error creating incentive. Please try again.');
            });
        }
    }

    // Update existing incentive
    async function updateIncentive() {
        try {
            // Determine the base URL
            const baseURL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                ? `http://${window.location.host}`
                :  window.location.origin;

            // Get auth token
            const token = getAuthToken();
            if (!token) {
                return;
            }

            // Get form data
            const formData = getIncentiveFormData();

            // Add incentive ID
            formData.incentiveId = document.getElementById('incentive-id').value;

            // Make API request - we'll use the admin endpoint for updates
            const response = await fetch(`${baseURL}/api/combined-api.js?operation=admin-incentives&action=update`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache'
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw response;
            }

            const data = await response.json();

            // Hide modal
            window.ModalHelper.hide('incentiveModal');

            // Show success message
            showAlert('success', 'Incentive updated successfully!');

            // Reload incentives
            loadIncentives();
        } catch (error) {
            handleApiError(error, () => {
                showAlert('danger', 'Error updating incentive. Please try again.');
            });
        }
    }

    // Delete incentive
    async function deleteIncentive(incentiveId) {
        try {
            // Determine the base URL
            const baseURL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                ? `http://${window.location.host}`
                : window.location.origin;

            // Get auth token
            const token = getAuthToken();
            if (!token) {
                return;
            }

            // Make API request
            const response = await fetch(`${baseURL}/api/combined-api.js?operation=admin-incentives&action=delete`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache'
                },
                body: JSON.stringify({incentiveId})
            });

            if (!response.ok) {
                throw response;
            }

            const data = await response.json();

            // Hide confirmation modal
            $('#confirmationModal').modal('hide');

            // Show success message
            showAlert('success', 'Incentive deleted successfully!');

            // Reload incentives
            loadIncentives();
        } catch (error) {
            handleApiError(error, () => {
                // Hide confirmation modal
                $('#confirmationModal').modal('hide');

                showAlert('danger', 'Error deleting incentive. Please try again.');
            });
        }
    }

    // Edit incentive
    function editIncentive(incentiveId) {
        try {
            // Find incentive in current data
            const incentive = incentives.find(inc => inc._id === incentiveId);

            if (!incentive) {
                // If incentive not found in current data, fetch it from API
                fetchIncentiveDetails(incentiveId);
                return;
            }

            // Reset form
            resetIncentiveForm();

            // Set action type
            actionType = 'edit';

            // Update modal title
            const modalTitle = document.getElementById('incentiveModalLabel');
            if (modalTitle) {
                modalTitle.textContent = 'Edit Incentive';
            }

            // Populate form with incentive data
            populateIncentiveForm(incentive);

            // Show modal
            window.ModalHelper.show('incentiveModal');
        } catch (error) {
            console.error('Error editing incentive:', error);
            showAlert('danger', 'Error loading incentive details. Please try again.');
        }
    }

    // Fetch incentive details from API
    async function fetchIncentiveDetails(incentiveId) {
        try {
            // Determine the base URL
            const baseURL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                ? `http://${window.location.host}`
                : window.location.origin;

            // Get auth token
            const token = getAuthToken();
            if (!token) {
                return;
            }

            // Make API request
            const response = await fetch(`${baseURL}/api/combined-api.js?operation=admin-incentives&action=get&incentiveId=${incentiveId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Cache-Control': 'no-cache'
                }
            });

            if (!response.ok) {
                throw response;
            }

            const data = await response.json();
            const incentive = data.incentive || data.result;

            if (!incentive) {
                throw new Error('Incentive not found');
            }

            // Reset form
            resetIncentiveForm();

            // Set action type
            actionType = 'edit';

            // Update modal title
            const modalTitle = document.getElementById('incentiveModalLabel');
            if (modalTitle) {
                modalTitle.textContent = 'Edit Incentive';
            }

            // Populate form with incentive data
            populateIncentiveForm(incentive);

            // Show modal
            window.ModalHelper.show('incentiveModal');
        } catch (error) {
            handleApiError(error, () => {
                showAlert('danger', 'Error loading incentive details. Please try again.');
            });
        }
    }

    // Populate incentive form with data
    function populateIncentiveForm(incentive) {
        if (!incentive) return;

        const incentiveIdField = document.getElementById('incentive-id');
        if (incentiveIdField) {
            incentiveIdField.value = incentive._id || '';
        }

        // Set business ID dropdown
        const businessIdSelect = document.getElementById('business-id');
        if (businessIdSelect) {
            setSelectValue(businessIdSelect, incentive.business_id || '');
        }

        // Set availability radio buttons
        const availableRadio = document.getElementById('incentive-available');
        const notAvailableRadio = document.getElementById('incentive-not-available');

        if (availableRadio && notAvailableRadio) {
            if (incentive.is_available) {
                availableRadio.checked = true;
                notAvailableRadio.checked = false;
            } else {
                availableRadio.checked = false;
                notAvailableRadio.checked = true;
            }

            // Trigger the change event to update field states
            const event = new Event('change');
            (incentive.is_available ? availableRadio : notAvailableRadio).dispatchEvent(event);
        }

        // Set type dropdown
        const typeSelect = document.getElementById('type');
        if (typeSelect) {
            setSelectValue(typeSelect, incentive.type || '');

            // Handle "Other" type description
            if (incentive.type === 'OT') {
                const otherTypeContainer = document.getElementById('other-type-container');
                const otherDescription = document.getElementById('other-description');

                if (otherTypeContainer) {
                    otherTypeContainer.style.display = 'block';
                }

                if (otherDescription) {
                    otherDescription.value = incentive.other_description || '';
                }
            }
        }

        // Set amount field
        const amountField = document.getElementById('amount');
        if (amountField) {
            amountField.value = incentive.amount || 0;
        }

        // Set information textarea
        const informationField = document.getElementById('information');
        if (informationField) {
            informationField.value = incentive.information || '';
        }
    }

    // Helper function to set select value
    function setSelectValue(selectElement, value) {
        if (!selectElement) return;

        for (let i = 0; i < selectElement.options.length; i++) {
            if (selectElement.options[i].value === value) {
                selectElement.selectedIndex = i;
                return;
            }
        }
    }

    // Reset incentive form
    function resetIncentiveForm() {
        if (!incentiveForm) return;

        incentiveForm.reset();

        const incentiveIdField = document.getElementById('incentive-id');
        if (incentiveIdField) {
            incentiveIdField.value = '';
        }

        // Hide the "other" type container
        const otherTypeContainer = document.getElementById('other-type-container');
        if (otherTypeContainer) {
            otherTypeContainer.style.display = 'none';
        }

        // Set default information text
        const informationField = document.getElementById('information');
        if (informationField) {
            informationField.value = '';
        }

        // Enable all fields initially
        document.querySelectorAll('#incentive-form input, #incentive-form select, #incentive-form textarea').forEach(el => {
            el.disabled = false;
            el.classList.remove('disabled-field');
        });
    }

    // Get incentive form data
    function getIncentiveFormData() {
        // Get form field values
        const businessIdField = document.getElementById('business-id');
        const businessId = businessIdField ? businessIdField.value : '';

        const availableRadio = document.querySelector('input[name="is_available"]:checked');
        const isAvailable = availableRadio ? availableRadio.value === 'true' : false;

        const typeField = document.getElementById('type');
        const type = typeField ? typeField.value : '';

        const amountField = document.getElementById('amount');
        const amount = amountField ? (parseFloat(amountField.value) || 0) : 0;

        const informationField = document.getElementById('information');
        const information = informationField ? informationField.value : '';

        // Get other description if type is "Other"
        let otherDescription = '';
        if (type === 'OT') {
            const otherDescriptionField = document.getElementById('other-description');
            otherDescription = otherDescriptionField ? otherDescriptionField.value : '';
        }

        // Build the request data object matching your existing API structure
        const formData = {
            business_id: businessId,
            is_available: isAvailable,
            type: type,
            amount: amount,
            information: information
        };

        // Only add other_description if type is "Other"
        if (type === 'OT' && otherDescription) {
            formData.other_description = otherDescription;
        }

        return formData;
    }

    // Validate incentive form
    function validateIncentiveForm() {
        // Get form field values
        const businessIdField = document.getElementById('business-id');
        const businessId = businessIdField ? businessIdField.value : '';

        const isAvailableChecked = document.querySelector('input[name="is_available"]:checked') !== null;
        const isAvailable = document.querySelector('input[name="is_available"]:checked')?.value === 'true';

        const typeField = document.getElementById('type');
        const type = typeField ? typeField.value : '';

        const amountField = document.getElementById('amount');
        const amount = amountField ? amountField.value : '';

        const informationField = document.getElementById('information');
        const information = informationField ? informationField.value : '';

        // Array to track validation errors
        const errors = [];

        // Validate business selection
        if (!businessId) {
            errors.push('Please select a business');
        }

        // Validate availability selection
        if (!isAvailableChecked) {
            errors.push('Please specify if incentive is available');
        }

        // If incentive is available, validate additional fields
        if (isAvailable) {
            // Validate type
            if (!type) {
                errors.push('Please select an incentive type');
            }

            // Validate amount
            if (amount === '' || isNaN(parseFloat(amount))) {
                errors.push('Please enter a valid incentive amount');
            }

            // Validate information
            if (!information) {
                errors.push('Please provide incentive information');
            }

            // Validate other description if type is "Other"
            if (type === 'OT') {
                const otherDescriptionField = document.getElementById('other-description');
                const otherDescription = otherDescriptionField ? otherDescriptionField.value : '';
                if (!otherDescription) {
                    errors.push('Please provide a description for the "Other" incentive type');
                }
            }
        }

        // Display errors if any
        if (errors.length > 0) {
            showAlert('danger', 'Form validation failed:<br>' + errors.join('<br>'));
            return false;
        }

        return true;
    }

    // Helper function to get incentive type label
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

    // Show alert message
    function showAlert(type, message) {
        // Create alert element
        const alertElement = document.createElement('div');
        alertElement.className = `alert alert-${type} alert-dismissible fade show`;
        alertElement.role = 'alert';
        alertElement.innerHTML = `
            ${message}
            <button type="button" class="close" data-dismiss="alert" aria-label="Close">
                <span aria-hidden="true">&times;</span>
            </button>
        `;

        // Find container to append alert
        const container = document.querySelector('.admin-container');
        if (container) {
            // Insert alert at the top of the container, after the header
            const header = container.querySelector('.admin-header');
            if (header && header.nextSibling) {
                container.insertBefore(alertElement, header.nextSibling);
            } else {
                container.prepend(alertElement);
            }

            // Auto-hide after 5 seconds
            setTimeout(() => {
                alertElement.classList.remove('show');
                setTimeout(() => {
                    alertElement.remove();
                }, 300);
            }, 5000);
        }
    }

    // Debounce function to limit API calls
    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    }
});
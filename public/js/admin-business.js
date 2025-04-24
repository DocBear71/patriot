// admin-business.js - Business management for admin dashboard
document.addEventListener('DOMContentLoaded', function() {
    console.log("Admin Business Manager loaded!");

    // State variables
    let businesses = [];
    let currentPage = 1;
    let totalPages = 1;
    let itemsPerPage = 10;
    let currentFilters = {
        search: '',
        category: '',
        status: ''
    };
    let selectedBusinessId = null;
    let actionType = 'create'; // 'create' or 'edit'

    // DOM Elements
    const businessTableBody = document.getElementById('business-table-body');
    const businessSearchInput = document.getElementById('business-search');
    const categoryFilter = document.getElementById('category-filter');
    const statusFilter = document.getElementById('status-filter');
    const resetFiltersBtn = document.getElementById('reset-filters');
    const paginationContainer = document.getElementById('pagination-container');
    const businessForm = document.getElementById('business-form');
    const addBusinessBtn = document.getElementById('add-business-btn');
    const saveBusinessBtn = document.getElementById('save-business-btn');
    const confirmActionBtn = document.getElementById('confirm-action-btn');

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
        // Load businesses on page load
        loadBusinesses();

        // Set up event listeners
        setupEventListeners();
    }

    // Setup event listeners
    function setupEventListeners() {
        // Search input
        businessSearchInput?.addEventListener('input', debounce(function () {
            currentFilters.search = this.value;
            currentPage = 1;
            loadBusinesses();
        }, 300));

        // Category filter
        categoryFilter?.addEventListener('change', function () {
            currentFilters.category = this.value;
            currentPage = 1;
            loadBusinesses();
        });

        // Status filter
        statusFilter?.addEventListener('change', function () {
            currentFilters.status = this.value;
            currentPage = 1;
            loadBusinesses();
        });

        // Reset filters
        resetFiltersBtn?.addEventListener('click', function () {
            businessSearchInput.value = '';
            categoryFilter.value = '';
            statusFilter.value = '';

            currentFilters = {
                search: '',
                category: '',
                status: ''
            };

            currentPage = 1;
            loadBusinesses();
        });

        // Add business button
        addBusinessBtn?.addEventListener('click', function () {
            resetBusinessForm();
            actionType = 'create';
            document.getElementById('businessModalLabel').textContent = 'Add New Business';
            $('#businessModal').modal('show');
        });

        // Save business button
        saveBusinessBtn?.addEventListener('click', function () {
            if (validateBusinessForm()) {
                if (actionType === 'create') {
                    createBusiness();
                } else {
                    updateBusiness();
                }
            }
        });

        // Handle business form submission (to prevent default)
        businessForm?.addEventListener('submit', function (e) {
            e.preventDefault();
        });

        // Confirm action button (used for delete confirmation)
        confirmActionBtn?.addEventListener('click', function () {
            if (selectedBusinessId) {
                deleteBusiness(selectedBusinessId);
            }
        });
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
                : 'https://patriotthanks.vercel.app';

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
        document.querySelector('.admin-container').innerHTML = `
            <div class="alert alert-danger" role="alert">
                <h4 class="alert-heading">Access Denied</h4>
                <p>You do not have permission to access this page. Only administrators can access the business management.</p>
                <hr>
                <p class="mb-0">Please <a href="/index.html">return to the homepage</a> or contact an administrator if you believe this is an error.</p>
            </div>
        `;
    }

    // Load businesses from API
    async function loadBusinesses() {
        try {
            // Show loading indicator
            if (businessTableBody) {
                businessTableBody.innerHTML = '<tr><td colspan="7" class="text-center">Loading businesses...</td></tr>';
            }

            // Determine the base URL
            const baseURL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                ? `http://${window.location.host}`
                : 'https://patriotthanks.vercel.app';

            // Get auth token
            const token = getAuthToken();
            if (!token) {
                handleApiError({ status: 401 });
                return;
            }

            // Build query parameters
            let queryParams = `operation=admin-list-businesses&page=${currentPage}&limit=${itemsPerPage}`;

            if (currentFilters.search) {
                queryParams += `&search=${encodeURIComponent(currentFilters.search)}`;
            }

            if (currentFilters.category) {
                queryParams += `&category=${encodeURIComponent(currentFilters.category)}`;
            }

            if (currentFilters.status) {
                queryParams += `&status=${encodeURIComponent(currentFilters.status)}`;
            }

            console.log(`Fetching businesses with query: ${queryParams}`);

            // Make API request
            const response = await fetch(`${baseURL}/api/business.js?${queryParams}`, {
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
            totalPages = data.totalPages || 1;

            // Render businesses in the table
            renderBusinesses();

            // Update pagination
            renderPagination();
        } catch (error) {
            handleApiError(error, () => {
                if (businessTableBody) {
                    businessTableBody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Error loading businesses. Please try again later.</td></tr>';
                }

                // For development purposes, load mock data if API fails
                console.warn("Using mock data for development");
                loadMockBusinesses();
            });
        }
    }

    // Load mock business data for development/testing
    function loadMockBusinesses() {
        businesses = [
            {
                _id: '1',
                bname: 'Tech Solutions Inc.',
                address1: '123 Main St',
                city: 'Cedar Rapids',
                state: 'IA',
                zip: '52404',
                phone: '319-555-1234',
                type: 'technology',
                status: 'active',
                created_at: '2024-04-01T00:00:00.000Z'
            },
            {
                _id: '2',
                bname: 'Hometown Diner',
                address1: '456 Oak Ave',
                city: 'Marion',
                state: 'IA',
                zip: '52302',
                phone: '319-555-5678',
                type: 'food',
                status: 'active',
                created_at: '2024-04-05T00:00:00.000Z'
            },
            {
                _id: '3',
                bname: 'Cedar Medical Center',
                address1: '789 Health Blvd',
                city: 'Cedar Rapids',
                state: 'IA',
                zip: '52402',
                phone: '319-555-9012',
                type: 'healthcare',
                status: 'active',
                created_at: '2024-04-10T00:00:00.000Z'
            }
        ];

        totalPages = 1;
        renderBusinesses();
        renderPagination();
    }

    // Render businesses in the table
    function renderBusinesses() {
        if (!businessTableBody) return;

        if (businesses.length === 0) {
            businessTableBody.innerHTML = '<tr><td colspan="7" class="text-center">No businesses found</td></tr>';
            return;
        }

        businessTableBody.innerHTML = '';

        businesses.forEach(business => {
            const locationText = business.city && business.state
                ? `${business.city}, ${business.state}`
                : 'Location not specified';

            // Use the helper function to get the display name for the business type
            const businessTypeDisplay = getBusinessTypeDisplay(business.type);

            const createdByInfo = business.created_by ?
                `<span data-user-id="${business.created_by}">User: ${business.created_by}</span>`
                : 'Unknown';

            const row = document.createElement('tr');
            row.innerHTML = `
            <td>${business._id ? business._id.substring(0, 8) + '...' : 'N/A'}</td>
            <td>${business.bname || 'N/A'}</td>
            <td>${locationText}</td>
            <td>${businessTypeDisplay}</td>
            <td>${business.phone || 'N/A'}</td>
            <td><span class="badge ${business.status === 'active' 
                    ? 'badge-success' 
                    : 'badge-secondary'}">
                                    ${business.status === 'active' 
                    ? 'Active' 
                    : 'Inactive'}
            </span>
            </td>
            <td>${createdByInfo}</td>
            <td>
                <div class="action-btns">
                    <button class="btn btn-sm btn-info edit-business-btn" data-id="${business._id}">Edit</button>
                    <button class="btn btn-sm btn-danger delete-business-btn" data-id="${business._id}" 
                            data-name="${business.bname || 'this business'}">Delete</button>
                </div>
            </td>
        `;

            businessTableBody.appendChild(row);
        });

        // Add event listeners to edit and delete buttons
        addBusinessActionListeners();
    }

    // Add event listeners to business action buttons
    function addBusinessActionListeners() {
        // Edit business buttons
        const editButtons = document.querySelectorAll('.edit-business-btn');
        editButtons.forEach(button => {
            button.addEventListener('click', function () {
                const businessId = this.getAttribute('data-id');
                editBusiness(businessId);
            });
        });

        // Delete business buttons
        const deleteButtons = document.querySelectorAll('.delete-business-btn');
        deleteButtons.forEach(button => {
            button.addEventListener('click', function () {
                const businessId = this.getAttribute('data-id');
                const businessName = this.getAttribute('data-name');

                // Update confirmation message and store selected ID
                document.getElementById('confirmation-message').textContent = `Are you sure you want to delete ${businessName}?`;
                selectedBusinessId = businessId;

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
            link.addEventListener('click', function (e) {
                e.preventDefault();
                const page = parseInt(this.getAttribute('data-page'));
                if (!isNaN(page) && page > 0 && page <= totalPages) {
                    currentPage = page;
                    loadBusinesses();
                }
            });
        });
    }

    // Create new business
    async function createBusiness() {
        try {
            // Determine the base URL
            const baseURL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                ? `http://${window.location.host}`
                : 'https://patriotthanks.vercel.app';

            // Get auth token
            const token = getAuthToken();
            if (!token) {
                return;
            }

            // Get form data
            const formData = getBusinessFormData();

            // Make API request
            const response = await fetch(`${baseURL}/api/business.js?operation=admin-create-business`, {
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
            $('#businessModal').modal('hide');

            // Show success message
            showAlert('success', 'Business created successfully!');

            // Reload businesses
            loadBusinesses();
        } catch (error) {
            handleApiError(error, () => {
                showAlert('danger', 'Error creating business. Please try again.');
            });
        }
    }

    // Update existing business
    async function updateBusiness() {
        try {
            // Determine the base URL
            const baseURL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                ? `http://${window.location.host}`
                : 'https://patriotthanks.vercel.app';

            // Get auth token
            const token = getAuthToken();
            if (!token) {
                return;
            }

            // Get form data
            const formData = getBusinessFormData();

            // Add business ID
            formData.businessId = document.getElementById('business-id').value;

            // Make API request
            const response = await fetch(`${baseURL}/api/business.js?operation=admin-update-business`, {
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
            $('#businessModal').modal('hide');

            // Show success message
            showAlert('success', 'Business updated successfully!');

            // Reload businesses
            loadBusinesses();
        } catch (error) {
            handleApiError(error, () => {
                showAlert('danger', 'Error updating business. Please try again.');
            });
        }
    }

    // Delete business
    async function deleteBusiness(businessId) {
        try {
            // Determine the base URL
            const baseURL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                ? `http://${window.location.host}`
                : 'https://patriotthanks.vercel.app';

            // Get auth token
            const token = getAuthToken();
            if (!token) {
                return;
            }

            // Make API request
            const response = await fetch(`${baseURL}/api/business.js?operation=admin-delete-business`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache'
                },
                body: JSON.stringify({businessId})
            });

            if (!response.ok) {
                throw response;
            }

            const data = await response.json();

            // Hide confirmation modal
            $('#confirmationModal').modal('hide');

            // Show success message
            showAlert('success', 'Business deleted successfully!');

            // Reload businesses
            loadBusinesses();
        } catch (error) {
            handleApiError(error, () => {
                // Hide confirmation modal
                $('#confirmationModal').modal('hide');

                showAlert('danger', 'Error deleting business. Please try again.');
            });
        }
    }

    // Edit business
    async function editBusiness(businessId) {
        try {
            // Find business in current data
            const business = businesses.find(b => b._id === businessId);

            if (!business) {
                // If business not found in current data, fetch it from API
                await fetchBusinessDetails(businessId);
                return;
            }

            // Reset form
            resetBusinessForm();

            // Set action type
            actionType = 'edit';

            // Update modal title
            document.getElementById('businessModalLabel').textContent = 'Edit Business';

            // Populate form with business data
            populateBusinessForm(business);

            // Show modal
            $('#businessModal').modal('show');
        } catch (error) {
            console.error('Error editing business:', error);
            showAlert('danger', 'Error loading business details. Please try again.');
        }
    }

    // Fetch business details from API
    async function fetchBusinessDetails(businessId) {
        try {
            // Determine the base URL
            const baseURL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                ? `http://${window.location.host}`
                : 'https://patriotthanks.vercel.app';

            // Get auth token
            const token = getAuthToken();
            if (!token) {
                return;
            }

            // Make API request
            const response = await fetch(`${baseURL}/api/business.js?operation=admin-get-business&businessId=${businessId}`, {
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
            const business = data.business;

            if (!business) {
                throw new Error('Business not found');
            }

            // Reset form
            resetBusinessForm();

            // Set action type
            actionType = 'edit';

            // Update modal title
            document.getElementById('businessModalLabel').textContent = 'Edit Business';

            // Populate form with business data
            populateBusinessForm(business);

            // Show modal
            $('#businessModal').modal('show');
        } catch (error) {
            handleApiError(error, () => {
                showAlert('danger', 'Error loading business details. Please try again.');
            });
        }
    }

    // Populate business form with data
    function populateBusinessForm(business) {
        document.getElementById('business-id').value = business._id || '';
        document.getElementById('bname').value = business.bname || '';
        document.getElementById('address1').value = business.address1 || '';
        document.getElementById('address2').value = business.address2 || '';
        document.getElementById('city').value = business.city || '';
        document.getElementById('zip').value = business.zip || '';
        document.getElementById('phone').value = business.phone || '';

        // Set select options
        setSelectValue('state', business.state || '');
        setSelectValue('type', business.type || '');
        setSelectValue('status', business.status || 'active');
    }

    // Helper function to set select value
    function setSelectValue(id, value) {
        const select = document.getElementById(id);
        if (select) {
            for (let i = 0; i < select.options.length; i++) {
                if (select.options[i].value === value) {
                    select.selectedIndex = i;
                    break;
                }
            }
        }
    }

    // Reset business form
    function resetBusinessForm() {
        businessForm.reset();
        document.getElementById('business-id').value = '';
    }

    // Get business form data
    function getBusinessFormData() {
        return {
            bname: document.getElementById('bname').value,
            address1: document.getElementById('address1').value,
            address2: document.getElementById('address2').value,
            city: document.getElementById('city').value,
            state: document.getElementById('state').value,
            zip: document.getElementById('zip').value,
            phone: document.getElementById('phone').value,
            type: document.getElementById('type').value,
            status: document.getElementById('status').value
        };
    }

    // Validate business form
    function validateBusinessForm() {
        const requiredFields = [
            {id: 'bname', label: 'Business Name'},
            {id: 'address1', label: 'Address 1'},
            {id: 'city', label: 'City'},
            {id: 'state', label: 'State'},
            {id: 'zip', label: 'Zip Code'},
            {id: 'phone', label: 'Phone'},
            {id: 'type', label: 'Business Type'},
            {id: 'status', label: 'Status'}
        ];

        const invalidFields = [];

        requiredFields.forEach(field => {
            const element = document.getElementById(field.id);
            if (!element || !element.value.trim()) {
                invalidFields.push(field.label);
                if (element) {
                    element.classList.add('is-invalid');
                }
            } else if (element) {
                element.classList.remove('is-invalid');
            }
        });

        if (invalidFields.length > 0) {
            showAlert('danger', `Please complete the following required fields: ${invalidFields.join(', ')}`);
            return false;
        }

        // Validate zip code format
        const zipField = document.getElementById('zip');
        const zipValue = zipField.value.trim();
        const zipPattern = /^\d{5}(-\d{4})?$/;

        if (!zipPattern.test(zipValue)) {
            zipField.classList.add('is-invalid');
            showAlert('danger', 'Please enter a valid Zip Code (12345 or 12345-6789)');
            return false;
        }

        // Validate phone format
        const phoneField = document.getElementById('phone');
        const phoneValue = phoneField.value.trim();
        const phonePattern = /^\d{3}-\d{3}-\d{4}$/;

        if (!phonePattern.test(phoneValue)) {
            phoneField.classList.add('is-invalid');
            showAlert('danger', 'Please enter a valid Phone Number in format: 123-456-7890');
            return false;
        }

        return true;
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
        return function (...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    }

    // helper function to map business type codes to display names
    function getBusinessTypeDisplay(typeCode) {
        const typeMap = {
            'AUTO': 'Automotive',
            'ENT': 'Entertainment',
            'HARDW': 'Hardware',
            'RX': 'Pharmacy',
            'REST': 'Restaurant',
            'RETAIL': 'Retail',
            'Tech': 'Technology',
            'OTHER': 'Other'
        };
        return typeMap[typeCode] || typeCode;
    }
});
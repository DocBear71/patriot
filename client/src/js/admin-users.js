// admin-users.js - Admin user management functionality - Updated for API integration

document.addEventListener('DOMContentLoaded', function () {
    console.log('Admin Users Management loaded');

    // State variables
    let users = [];
    let currentPage = 1;
    let itemsPerPage = 10;
    let totalPages = 0;
    let currentFilters = {
        search: '',
        status: '',
        level: ''
    };
    let editingUserId = null;
    let isAdminUser = false;

    // DOM elements
    const userTableBody = document.getElementById('user-table-body');
    const paginationContainer = document.getElementById('pagination-container');
    const userSearch = document.getElementById('user-search');
    const statusFilter = document.getElementById('status-filter');
    const levelFilter = document.getElementById('level-filter');
    const resetFiltersBtn = document.getElementById('reset-filters');
    const userForm = document.getElementById('user-form');
    const saveUserBtn = document.getElementById('save-user-btn');
    const confirmActionBtn = document.getElementById('confirm-action-btn');
    const addUserBtn = document.getElementById('add-user-btn');

    // Helper function for token retrieval
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

// Redirect function
    function redirectToLogin() {
        window.location.href = '/login.html?expired=true&redirect=' + encodeURIComponent(window.location.pathname);
    }

    // Check if the user is admin and load user data
    checkAdminStatus().then((isAdmin) => {
        if (isAdmin) {
            loadUsers();
            setupEventListeners();
        } else {
            showAccessDenied();
        }
    }).catch(error => {
        console.error('Error during initialization:', error);
        showAccessDenied();
    });

    // Functionsasync
    async function checkAdminStatus() {
        try {
            // Get auth token
            const token = getAuthToken();
            if (!token) {
                console.error("No auth token found");
                redirectToLogin();
                return false;
            }

            // Determine the base URL
            const baseURL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                ? `http://${window.location.host}`
                : 'https://patriotthanks.vercel.app';

            console.log("Verifying token with URL:", `${baseURL}/api/auth?operation=verify-token\``);

            try {
                // Try the verify-token endpoint
                const response = await fetch(`${baseURL}/api/auth?operation=verify-token`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Cache-Control': 'no-cache'
                    }
                });

                console.log("Verify token response status:", response.status);

                if (response.status === 404) {
                    console.error("Verify token endpoint not found - using fallback validation");

                    // Use a simple fallback validation for testing
                    // WARNING: This is less secure but allows testing while you fix the API
                    try {
                        const sessionData = localStorage.getItem('patriotThanksSession');
                        if (sessionData) {
                            const session = JSON.parse(sessionData);
                            console.log('Session data:', session);

                            if (session.userLevel === 'Admin') {
                                console.log('Using fallback admin validation based on local session data');
                                alert('Warning: Using local validation as API endpoint is unavailable. Limited functionality may be available.');
                                return true;
                            }
                        }
                    } catch (e) {
                        console.error("Fallback validation failed:", e);
                    }

                    alert('Cannot verify admin status. API endpoint not found.');
                    return false;
                }

                if (!response.ok) {
                    console.error("Verify token error:", response.status);

                    if (response.status === 401) {
                        redirectToLogin();
                        return false;
                    }

                    return false;
                }

                const data = await response.json();
                console.log("Verification response data:", data);
                isAdminUser = data.isAdmin === true || data.level === 'Admin';

                console.log('Admin access verified:', isAdminUser);
                return isAdminUser;
            } catch (fetchError) {
                console.error('API test error:', fetchError);

                // For development purposes only - remove in production
                console.log('Bypassing verification for development');
                alert('Warning: API error encountered. Using development mode access.');
                return true;
            }
        } catch (error) {
            console.error('Error in admin status check:', error);
            return false;
        }
    }

    function redirectToLogin() {
        window.location.href = '/index.html?login=required&redirect=' + encodeURIComponent(window.location.pathname);
    }
    function showAccessDenied() {
        const adminContainer = document.querySelector('.admin-container');
        adminContainer.innerHTML = `
            <div class="alert alert-danger" role="alert">
                <h4 class="alert-heading">Access Denied</h4>
                <p>You do not have permission to access this page. Only administrators can access the user management dashboard.</p>
                <hr>
                <p class="mb-0">Please <a href="/index.html">return to the homepage</a> or contact an administrator if you believe this is an error.</p>
            </div>
        `;
    }

    async function loadUsers() {
        try {
            // Show loading indicator
            userTableBody.innerHTML = '<tr><td colspan="7" class="text-center">Loading users...</td></tr>';

            // Determine the base URL
            const baseURL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                ? `http://${window.location.host}`
                : 'https://patriotthanks.vercel.app';

            // Get auth token
            const token = getAuthToken();
            if (!token) {
                throw new Error('Authentication required');
            }

            // Build the filter query
            let queryParams = new URLSearchParams({
                page: currentPage,
                limit: itemsPerPage
            });

            if (currentFilters.search) {
                queryParams.append('search', currentFilters.search);
            }

            if (currentFilters.status) {
                queryParams.append('status', currentFilters.status);
            }

            if (currentFilters.level) {
                queryParams.append('level', currentFilters.level);
            }

            console.log("Fetching users with query:", queryParams.toString());

            // Make API request - updated to use admin/users endpoint
            const response = await fetch(`${baseURL}/api/admin/users?${queryParams.toString()}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            // Handle token expiration
            if (response.status === 401) {
                // Token expired, redirect to login
                window.location.href = '/login.html?expired=true&redirect=' + encodeURIComponent(window.location.pathname);
                return;
            }

            if (!response.ok) {
                const errorText = await response.text();
                console.error("API response:", response.status, errorText);
                throw new Error(`Failed to load users: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            console.log("Users data:", data);

            users = data.users;
            totalPages = Math.ceil(data.total / itemsPerPage);

            renderUsers();
            renderPagination();

        } catch (error) {
            console.error('Error loading users:', error);
            userTableBody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Error loading users: ${error.message}</td></tr>`;
        }
    }

    function renderUsers() {
        if (users.length === 0) {
            userTableBody.innerHTML = '<tr><td colspan="7" class="text-center">No users found</td></tr>';
            return;
        }

        userTableBody.innerHTML = '';

        users.forEach(user => {
            const row = document.createElement('tr');

            // Format created date
            let formattedDate = 'N/A';
            if (user.created_at) {
                const createdDate = new Date(user.created_at);
                formattedDate = `${createdDate.toLocaleDateString()}`;
            }

            // Status badge and text
            let statusBadge;
            let statusText = 'Unknown';

            switch (user.status) {
                case 'VT':
                    statusBadge = '<span class="badge badge-active">Veteran</span>';
                    statusText = 'Veteran';
                    break;
                case 'AD':
                    statusBadge = '<span class="badge badge-active">Active Duty</span>';
                    statusText = 'Active Duty';
                    break;
                case 'FR':
                    statusBadge = '<span class="badge badge-active">First Responder</span>';
                    statusText = 'First Responder';
                    break;
                case 'SP':
                    statusBadge = '<span class="badge badge-active">Spouse</span>';
                    statusText = 'Spouse';
                    break;
                case 'BO':
                    statusBadge = '<span class="badge badge-active">Business Owner</span>';
                    statusText = 'Business Owner';
                    break;
                case 'SU':
                    statusBadge = '<span class="badge badge-active">Supporter</span>';
                    statusText = 'Supporter';
                    break;
                default:
                    statusBadge = '<span class="badge badge-secondary">Unknown</span>';
            }

            // Level badge
            let levelBadge;
            switch (user.level) {
                case 'Free':
                    levelBadge = '<span class="badge badge-free">Free</span>';
                    break;
                case 'Basic':
                    levelBadge = '<span class="badge badge-basic">Basic</span>';
                    break;
                case 'Premium':
                    levelBadge = '<span class="badge badge-premium">Premium</span>';
                    break;
                case 'VIP':
                    levelBadge = '<span class="badge badge-vip">V.I.P.</span>';
                    break;
                case 'Admin':
                    levelBadge = '<span class="badge badge-admin">Admin</span>';
                    break;
                default:
                    levelBadge = '<span class="badge badge-secondary">Unknown</span>';
            }

            row.innerHTML = `
                <td>${user.fname || ''} ${user.lname || ''}</td>
                <td>${user.email || 'N/A'}</td>
                <td>${user.city ? user.city + ', ' + user.state : 'N/A'}</td>
                <td>${statusBadge}</td>
                <td>${levelBadge}</td>
                <td>${formattedDate}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-info edit-user" data-id="${user._id}">Edit</button>
                        <button class="btn btn-sm btn-danger delete-user" data-id="${user._id}" data-name="${user.fname} ${user.lname}">Delete</button>
                    </div>
                </td>
            `;

            userTableBody.appendChild(row);
        });

        // Add event listeners to action buttons
        document.querySelectorAll('.edit-user').forEach(btn => {
            btn.addEventListener('click', function () {
                const userId = this.getAttribute('data-id');
                editUser(userId);
            });
        });

        document.querySelectorAll('.delete-user').forEach(btn => {
            btn.addEventListener('click', function () {
                const userId = this.getAttribute('data-id');
                const userName = this.getAttribute('data-name');
                showDeleteConfirmation(userId, userName);
            });
        });
    }

    function renderPagination() {
        paginationContainer.innerHTML = '';

        if (totalPages <= 1) {
            return;
        }

        // Previous button
        const prevLi = document.createElement('li');
        const prevLink = document.createElement('a');
        prevLink.href = '#';
        prevLink.textContent = 'Previous';
        prevLink.classList.add(currentPage === 1 ? 'disabled' : '');
        prevLink.addEventListener('click', function (e) {
            e.preventDefault();
            if (currentPage > 1) {
                currentPage--;
                loadUsers();
            }
        });
        prevLi.appendChild(prevLink);
        paginationContainer.appendChild(prevLi);

        // Page numbers
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, startPage + 4);

        if (endPage - startPage < 4) {
            startPage = Math.max(1, endPage - 4);
        }

        for (let i = startPage; i <= endPage; i++) {
            const pageLi = document.createElement('li');
            const pageLink = document.createElement('a');
            pageLink.href = '#';
            pageLink.textContent = i;

            if (i === currentPage) {
                pageLink.classList.add('active');
            }

            pageLink.addEventListener('click', function (e) {
                e.preventDefault();
                currentPage = i;
                loadUsers();
            });

            pageLi.appendChild(pageLink);
            paginationContainer.appendChild(pageLi);
        }

        // Next button
        const nextLi = document.createElement('li');
        const nextLink = document.createElement('a');
        nextLink.href = '#';
        nextLink.textContent = 'Next';
        nextLink.classList.add(currentPage === totalPages ? 'disabled' : '');
        nextLink.addEventListener('click', function (e) {
            e.preventDefault();
            if (currentPage < totalPages) {
                currentPage++;
                loadUsers();
            }
        });
        nextLi.appendChild(nextLink);
        paginationContainer.appendChild(nextLi);
    }

    function setupEventListeners() {
        // Search input
        userSearch.addEventListener('input', debounce(function () {
            currentFilters.search = this.value;
            currentPage = 1;
            if (isApiIntegrationEnabled()) {
                loadUsers();
            } else {
                // For mock data, filter the client-side
                filterMockUsers();
            }
        }, 300));

        // Status filter
        statusFilter.addEventListener('change', function () {
            currentFilters.status = this.value;
            currentPage = 1;
            if (isApiIntegrationEnabled()) {
                loadUsers();
            } else {
                filterMockUsers();
            }
        });

        // Level filter
        levelFilter.addEventListener('change', function () {
            currentFilters.level = this.value;
            currentPage = 1;
            if (isApiIntegrationEnabled()) {
                loadUsers();
            } else {
                filterMockUsers();
            }
        });

        // Reset filters
        resetFiltersBtn.addEventListener('click', function () {
            userSearch.value = '';
            statusFilter.value = '';
            levelFilter.value = '';

            currentFilters.search = '';
            currentFilters.status = '';
            currentFilters.level = '';

            currentPage = 1;
            if (isApiIntegrationEnabled()) {
                loadUsers();
            } else {
                loadMockUsers();
            }
        });

        // Add user button
        addUserBtn.addEventListener('click', function () {
            resetUserForm();
            $('#userModal').modal('show');
        });

        // Save user button
        saveUserBtn.addEventListener('click', function () {
            if (validateUserForm()) {
                if (isApiIntegrationEnabled()) {
                    saveUser();
                } else {
                    mockSaveUser();
                }
            }
        });

        // Confirm delete button
        confirmActionBtn.addEventListener('click', function () {
            if (isApiIntegrationEnabled()) {
                deleteUser();
            } else {
                mockDeleteUser();
            }
        });
    }

    function editUser(userId) {
        // Find the user in the array
        const user = users.find(u => u._id === userId);

        if (!user) {
            console.error('User not found:', userId);
            return;
        }

        // Set form fields
        document.getElementById('user-id').value = user._id;
        document.getElementById('fname').value = user.fname || '';
        document.getElementById('lname').value = user.lname || '';
        document.getElementById('email').value = user.email || '';
        document.getElementById('address1').value = user.address1 || '';
        document.getElementById('address2').value = user.address2 || '';
        document.getElementById('city').value = user.city || '';
        document.getElementById('state').value = user.state || '';
        document.getElementById('zip').value = user.zip || '';
        document.getElementById('status').value = user.status || '';
        document.getElementById('level').value = user.level || '';

        // Clear password fields - passwords should not be pre-filled
        document.getElementById('password').value = '';
        document.getElementById('confirm-password').value = '';

        // Show a small note about password
        document.getElementById('password').nextElementSibling.style.display = 'block';

        // Set an editing state
        editingUserId = user._id;

        // Update modal title
        document.getElementById('userModalLabel').textContent = 'Edit User';

        // Show modal
        $('#userModal').modal('show');
    }

    function resetUserForm() {
        // Clear all form fields
        userForm.reset();

        // Reset editing state
        editingUserId = null;

        // Update modal title
        document.getElementById('userModalLabel').textContent = 'Add New User';

        // Hide the password note
        document.getElementById('password').nextElementSibling.style.display = 'none';
    }

    function validateUserForm() {
        // Get form fields
        const fname = document.getElementById('fname').value.trim();
        const lname = document.getElementById('lname').value.trim();
        const email = document.getElementById('email').value.trim();
        const status = document.getElementById('status').value;
        const level = document.getElementById('level').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        // Basic validation
        if (!fname) {
            alert('First name is required');
            return false;
        }

        if (!lname) {
            alert('Last name is required');
            return false;
        }

        if (!email) {
            alert('Email is required');
            return false;
        }

        if (!validateEmail(email)) {
            alert('Please enter a valid email address');
            return false;
        }

        if (!status) {
            alert('Status is required');
            return false;
        }

        if (!level) {
            alert('Membership level is required');
            return false;
        }

        // Password validation (only if adding new user or changing password)
        if (!editingUserId || (editingUserId && password)) {
            // For new users, a password is required
            if (!editingUserId && !password) {
                alert('Password is required for new users');
                return false;
            }

            // If a password is provided, validate it
            if (password) {
                if (password !== confirmPassword) {
                    alert('Passwords do not match');
                    return false;
                }

                // Use the existing password validation if available
                if (typeof window.validatePassword === 'function') {
                    const validation = window.validatePassword(password);

                    if (!validation.isValid) {
                        let message = 'Password must contain:\n';
                        const criteria = validation.criteria;

                        if (!criteria.hasLower) message += '- At least one lowercase letter\n';
                        if (!criteria.hasUpper) message += '- At least one uppercase letter\n';
                        if (!criteria.hasNumber) message += '- At least one number\n';
                        if (!criteria.hasSpecial) message += '- At least one special character (!@#$%^&*)\n';
                        if (!criteria.hasLength) message += '- At least 8 characters\n';

                        alert(message);
                        return false;
                    }
                } else {
                    // Basic password validation if the function is not available
                    if (password.length < 8) {
                        alert('Password must be at least 8 characters long');
                        return false;
                    }
                }
            }
        }

        return true;
    }

    async function saveUser() {
        try {
            // Prepare user data
            const userData = {
                fname: document.getElementById('fname').value.trim(),
                lname: document.getElementById('lname').value.trim(),
                email: document.getElementById('email').value.trim(),
                address1: document.getElementById('address1').value.trim(),
                address2: document.getElementById('address2').value.trim(),
                city: document.getElementById('city').value.trim(),
                state: document.getElementById('state').value,
                zip: document.getElementById('zip').value.trim(),
                status: document.getElementById('status').value,
                level: document.getElementById('level').value,
                password: document.getElementById('password').value
            };

            // Determine the base URL
            const baseURL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                ? `http://${window.location.host}`
                : 'https://patriotthanks.vercel.app';

            // Get auth token
            const token = getAuthToken();
            if (!token) {
                redirectToLogin();
                return;
            }

            // Determine if creating or updating
            const method = editingUserId ? 'PUT' : 'POST';
            const url = editingUserId
                ? `${baseURL}/api/admin/users/${editingUserId}`
                : `${baseURL}/api/admin/users`;

            // Don't send an empty password when editing
            if (editingUserId && !userData.password) {
                delete userData.password;
            }

            console.log(`${method} request to ${url}`, userData);

            // Make API request
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(userData)
            });

            // Handle token expiration
            if (response.status === 401) {
                redirectToLogin();
                return;
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Error: ${response.status} ${response.statusText}`);
            }

            // Success
            const result = await response.json();
            console.log("Save user response:", result);

            // Hide modal
            $('#userModal').modal('hide');

            // Show a success message
            alert(editingUserId ? 'User updated successfully!' : 'User created successfully!');

            // Reload users
            loadUsers();

        } catch (error) {
            console.error('Error saving user:', error);
            alert(`Error saving user: ${error.message}`);
        }
    }

    function showDeleteConfirmation(userId, userName) {
        // Set user ID for deletion
        editingUserId = userId;

        // Update confirmation message
        document.getElementById('confirmation-message').textContent =
            `Are you sure you want to delete the user ${userName || 'selected user'}?`;

        // Update button text
        document.getElementById('confirm-action-btn').textContent = 'Delete';

        // Show confirmation modal
        $('#confirmationModal').modal('show');
    }

    async function deleteUser() {
        if (!editingUserId) {
            console.error('No user selected for deletion');
            return;
        }

        try {
            // Determine the base URL
            const baseURL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                ? `http://${window.location.host}`
                : 'https://patriotthanks.vercel.app';

            // Get auth token
            const token = getAuthToken();
            if (!token) {
                redirectToLogin();
                return;
            }

            console.log(`DELETE request to /api/admin/users/${editingUserId}`);

            // Make API request
            const response = await fetch(`${baseURL}/api/admin/users/${editingUserId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            // Handle token expiration
            if (response.status === 401) {
                redirectToLogin();
                return;
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Error: ${response.status} ${response.statusText}`);
            }

            // Success
            const result = await response.json();
            console.log("Delete user response:", result);

            // Hide modal
            $('#confirmationModal').modal('hide');

            // Show a success message
            alert('User deleted successfully!');

            // Reset editing ID
            editingUserId = null;

            // Reload users
            loadUsers();

        } catch (error) {
            console.error('Error deleting user:', error);
            alert(`Error deleting user: ${error.message}`);
        }
    }

    // Helper function to check if API integration is enabled
    function isApiIntegrationEnabled() {
        // Change this to true when the API is ready
        return true;
    }

    // Mock functions for development without API
    function loadMockUsers() {
        // Mock user data
        const mockUsers = [
            {
                _id: '1',
                fname: 'John',
                lname: 'Doe',
                email: 'john.doe@example.com',
                address1: '123 Main St',
                city: 'Anytown',
                state: 'IA',
                zip: '52404',
                status: 'VT',
                level: 'Admin',
                created_at: '2024-02-15T00:00:00.000Z'
            },
            {
                _id: '2',
                fname: 'Jane',
                lname: 'Smith',
                email: 'jane.smith@example.com',
                address1: '456 Oak Ave',
                city: 'Cedar Rapids',
                state: 'IA',
                zip: '52402',
                status: 'AD',
                level: 'Premium',
                created_at: '2024-03-01T00:00:00.000Z'
            },
            {
                _id: '3',
                fname: 'Robert',
                lname: 'Johnson',
                email: 'robert.johnson@example.com',
                address1: '789 Pine Rd',
                city: 'Marion',
                state: 'IA',
                zip: '52302',
                status: 'FR',
                level: 'Basic',
                created_at: '2024-03-15T00:00:00.000Z'
            },
            {
                _id: '4',
                fname: 'Sarah',
                lname: 'Williams',
                email: 'sarah.williams@example.com',
                address1: '101 Elm St',
                city: 'Iowa City',
                state: 'IA',
                zip: '52240',
                status: 'SP',
                level: 'Free',
                created_at: '2024-04-01T00:00:00.000Z'
            },
            {
                _id: '5',
                fname: 'Michael',
                lname: 'Brown',
                email: 'michael.brown@example.com',
                address1: '202 Maple Dr',
                city: 'Cedar Falls',
                state: 'IA',
                zip: '50613',
                status: 'BO',
                level: 'VIP',
                created_at: '2024-04-10T00:00:00.000Z'
            }
        ];

        // Set mock data and render
        users = mockUsers;
        totalPages = 1;
        renderUsers();
        renderPagination();
    }

    function filterMockUsers() {
        // Load all mock users first
        const allMockUsers = [
            {
                _id: '1',
                fname: 'John',
                lname: 'Doe',
                email: 'john.doe@example.com',
                address1: '123 Main St',
                city: 'Anytown',
                state: 'IA',
                zip: '52404',
                status: 'VT',
                level: 'Admin',
                created_at: '2024-02-15T00:00:00.000Z'
            },
            {
                _id: '2',
                fname: 'Jane',
                lname: 'Smith',
                email: 'jane.smith@example.com',
                address1: '456 Oak Ave',
                city: 'Cedar Rapids',
                state: 'IA',
                zip: '52402',
                status: 'AD',
                level: 'Premium',
                created_at: '2024-03-01T00:00:00.000Z'
            },
            {
                _id: '3',
                fname: 'Robert',
                lname: 'Johnson',
                email: 'robert.johnson@example.com',
                address1: '789 Pine Rd',
                city: 'Marion',
                state: 'IA',
                zip: '52302',
                status: 'FR',
                level: 'Basic',
                created_at: '2024-03-15T00:00:00.000Z'
            },
            {
                _id: '4',
                fname: 'Sarah',
                lname: 'Williams',
                email: 'sarah.williams@example.com',
                address1: '101 Elm St',
                city: 'Iowa City',
                state: 'IA',
                zip: '52240',
                status: 'SP',
                level: 'Free',
                created_at: '2024-04-01T00:00:00.000Z'
            },
            {
                _id: '5',
                fname: 'Michael',
                lname: 'Brown',
                email: 'michael.brown@example.com',
                address1: '202 Maple Dr',
                city: 'Cedar Falls',
                state: 'IA',
                zip: '50613',
                status: 'BO',
                level: 'VIP',
                created_at: '2024-04-10T00:00:00.000Z'
            }
        ];

        // Filter based on current filters
        let filteredUsers = [...allMockUsers];

        if (currentFilters.search) {
            const searchTerm = currentFilters.search.toLowerCase();
            filteredUsers = filteredUsers.filter(user =>
                (user.fname && user.fname.toLowerCase().includes(searchTerm)) ||
                (user.lname && user.lname.toLowerCase().includes(searchTerm)) ||
                (user.email && user.email.toLowerCase().includes(searchTerm))
            );
        }

        if (currentFilters.status) {
            filteredUsers = filteredUsers.filter(user => user.status === currentFilters.status);
        }

        if (currentFilters.level) {
            filteredUsers = filteredUsers.filter(user => user.level === currentFilters.level);
        }

        // Update and render
        users = filteredUsers;
        totalPages = 1;
        renderUsers();
        renderPagination();
    }

    function mockSaveUser() {
        try {
            // Get form data
            const userData = {
                _id: editingUserId || (Math.floor(Math.random() * 1000) + 6).toString(),
                fname: document.getElementById('fname').value.trim(),
                lname: document.getElementById('lname').value.trim(),
                email: document.getElementById('email').value.trim(),
                address1: document.getElementById('address1').value.trim(),
                address2: document.getElementById('address2').value.trim(),
                city: document.getElementById('city').value.trim(),
                state: document.getElementById('state').value,
                zip: document.getElementById('zip').value.trim(),
                status: document.getElementById('status').value,
                level: document.getElementById('level').value,
                created_at: new Date().toISOString()
            };

            if (editingUserId) {
                // Update existing user
                const userIndex = users.findIndex(u => u._id === editingUserId);

                if (userIndex !== -1) {
                    users[userIndex] = {...users[userIndex], ...userData};
                }

                alert('User updated successfully!');
            } else {
                // Add new user
                users.push(userData);
                alert('User created successfully!');
            }

            // Hide modal
            $('#userModal').modal('hide');

            // Reset editing state
            editingUserId = null;

            // Render updated users
            renderUsers();

        } catch (error) {
            console.error('Error in mock save:', error);
            alert('Error saving user. Please try again.');
        }
    }

    function mockDeleteUser() {
        if (!editingUserId) {
            return;
        }

        try {
            // Find user index
            const userIndex = users.findIndex(u => u._id === editingUserId);

            if (userIndex !== -1) {
                // Remove the user from an array
                users.splice(userIndex, 1);

                // Hide modal
                $('#confirmationModal').modal('hide');

                // Show a success message
                alert('User deleted successfully!');

                // Reset editing ID
                editingUserId = null;

                // Render updated users
                renderUsers();
            } else {
                throw new Error('User not found');
            }
        } catch (error) {
            console.error('Error in mock delete:', error);
            alert('Error deleting user. Please try again.');
        }
    }

    // Utility Functions

    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    function debounce(func, wait) {
        let timeout;
        return function () {
            const context = this;
            const args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                func.apply(context, args);
            }, wait);
        };
    }
});
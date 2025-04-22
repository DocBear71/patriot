// dashboard.js - Updated to use real data from the API and show users in the dashboard
document.addEventListener('DOMContentLoaded', function () {
    // State variables for API data
    let users = [];
    let businesses = [];
    let incentives = [];
    let dashboardStats = {};

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

    // Load dashboard stats
    async function loadDashboardStats() {
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
            const response = await fetch(`${baseURL}/api/auth.js?operation=dashboard-stats`, {
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
            dashboardStats = data;

            // Update dashboard UI with real stats
            updateDashboardStats();
        } catch (error) {
            handleApiError(error, () => {
                // Use placeholder stats
                dashboardStats = {
                    userCount: 127,
                    userChange: 12,
                    businessCount: 42,
                    businessChange: 8,
                    incentiveCount: 86,
                    incentiveChange: 23
                };
                updateDashboardStats();
            });
        }
    }

    // Update the dashboard UI with stats
    function updateDashboardStats() {
        const stats = dashboardStats;
        const statsContainer = document.querySelector('#dashboard-panel div[style*="grid-template-columns"]');

        if (statsContainer) {
            statsContainer.innerHTML = `
                <div style="background-color: #3498db; color: white; padding: 20px; border-radius: 5px;">
                    <h3>Total Users</h3>
                    <p style="font-size: 2rem; margin: 10px 0;">${stats.userCount || 0}</p>
                    <p>${stats.userChange >= 0 ? '↑' : '↓'} ${Math.abs(stats.userChange || 0)}% from last month</p>
                </div>
                <div style="background-color: #2ecc71; color: white; padding: 20px; border-radius: 5px;">
                    <h3>Businesses</h3>
                    <p style="font-size: 2rem; margin: 10px 0;">${stats.businessCount || 0}</p>
                    <p>${stats.businessChange >= 0 ? '↑' : '↓'} ${Math.abs(stats.businessChange || 0)}% from last month</p>
                </div>
                <div style="background-color: #e74c3c; color: white; padding: 20px; border-radius: 5px;">
                    <h3>Active Incentives</h3>
                    <p style="font-size: 2rem; margin: 10px 0;">${stats.incentiveCount || 0}</p>
                    <p>${stats.incentiveChange >= 0 ? '↑' : '↓'} ${Math.abs(stats.incentiveChange || 0)}% from last month</p>
                </div>
            `;
        }

        // Also update the user stats in the user panel
        const totalUsersCount = document.getElementById('total-users-count');
        if (totalUsersCount) {
            totalUsersCount.textContent = stats.userCount || 0;
        }

        // If we have active/new user counts, update those too
        const activeUsersCount = document.getElementById('active-users-count');
        if (activeUsersCount) {
            activeUsersCount.textContent = stats.activeUserCount || Math.floor((stats.userCount || 0) * 0.85); // Fallback estimate
        }

        const newUsersCount = document.getElementById('new-users-count');
        if (newUsersCount) {
            newUsersCount.textContent = stats.newUsersThisMonth || Math.floor((stats.userCount || 0) * 0.15); // Fallback estimate
        }
    }

    // Load users from API
    async function loadUsers() {
        try {
            // Show loading indicator in dashboard users table
            const userTableBody = document.getElementById('dashboard-users-table');
            if (userTableBody) {
                userTableBody.innerHTML = '<tr><td colspan="6" class="text-center">Loading users...</td></tr>';
            }

            // Determine the base URL
            const baseURL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                ? `http://${window.location.host}`
                : 'https://patriotthanks.vercel.app';

            // Get auth token
            const token = getAuthToken();
            if (!token) {
                return;
            }

            // Make API request - limit to most recent 5 users
            const response = await fetch(`${baseURL}/api/auth.js?operation=list-users&page=1&limit=5`, {
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
            users = data.users || [];

            // Render users in the dashboard table
            renderDashboardUsers();
        } catch (error) {
            handleApiError(error, () => {
                // If API fails, show an error message
                const userTableBody = document.getElementById('dashboard-users-table');
                if (userTableBody) {
                    userTableBody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Error loading users. Please try again later.</td></tr>';
                }
            });
        }
    }

    // Render users in the dashboard table
    function renderDashboardUsers() {
        const userTableBody = document.getElementById('dashboard-users-table');
        if (!userTableBody) return;

        if (users.length === 0) {
            userTableBody.innerHTML = '<tr><td colspan="6" class="text-center">No users found</td></tr>';
            return;
        }

        userTableBody.innerHTML = '';

        users.forEach(user => {
            // Format created date
            let formattedDate = 'N/A';
            if (user.created_at) {
                const createdDate = new Date(user.created_at);
                formattedDate = createdDate.toLocaleDateString();
            }

            // Status badge
            let statusBadge = '';
            if (user.status === 'AD') {
                statusBadge = '<span class="badge badge-active">Active Duty</span>';
            } else if (user.status === 'VT') {
                statusBadge = '<span class="badge badge-active">Veteran</span>';
            } else if (user.status === 'FR') {
                statusBadge = '<span class="badge badge-active">First Responder</span>';
            } else if (user.status === 'SP') {
                statusBadge = '<span class="badge badge-active">Spouse</span>';
            } else if (user.status === 'BO') {
                statusBadge = '<span class="badge badge-active">Business Owner</span>';
            } else if (user.status === 'SU') {
                statusBadge = '<span class="badge badge-active">Supporter</span>';
            } else {
                statusBadge = '<span class="badge badge-secondary">Unknown</span>';
            }

            // Level badge
            let levelBadge = '';
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

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${user.fname} ${user.lname}</td>
                <td>${user.email}</td>
                <td>${statusBadge}</td>
                <td>${levelBadge}</td>
                <td>${formattedDate}</td>
                <td>
                    <div class="action-btns">
                        <a href="admin-users.html?edit=${user._id}" class="btn btn-sm btn-info">Edit</a>
                    </div>
                </td>
            `;

            userTableBody.appendChild(row);
        });

        // Add quick search functionality to the dashboard users table
        setupQuickSearch();
    }

    // Setup quick search for dashboard users table
    function setupQuickSearch() {
        const quickSearch = document.getElementById('quick-user-search');
        if (!quickSearch) return;

        quickSearch.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const userRows = document.querySelectorAll('#dashboard-users-table tr');

            userRows.forEach(row => {
                let foundMatch = false;
                const cells = row.querySelectorAll('td');

                cells.forEach(cell => {
                    if (cell.textContent.toLowerCase().includes(searchTerm)) {
                        foundMatch = true;
                    }
                });

                row.style.display = foundMatch ? '' : 'none';
            });
        });
    }

    // Load businesses from API
    async function loadBusinesses() {
        try {
            // Show loading indicator
            const businessTableBody = document.querySelector('#businesses-list tbody');
            if (businessTableBody) {
                businessTableBody.innerHTML = '<tr><td colspan="6" class="text-center">Loading businesses...</td></tr>';
            }

            // Determine the base URL
            const baseURL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                ? `http://${window.location.host}`
                : 'https://patriotthanks.vercel.app';

            // Get auth token
            const token = getAuthToken();
            if (!token) {
                return;
            }

            // Make API request - assuming you'll create an endpoint for businesses
            const response = await fetch(`${baseURL}/api/business.js?operation=admin-list-businesses&page=1&limit=5`, {
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

            // Render businesses in the table
            renderBusinesses();
        } catch (error) {
            handleApiError(error, () => {
                // If API fails, show placeholder data
                const businessTableBody = document.querySelector('#businesses-list tbody');
                if (businessTableBody) {
                    businessTableBody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Error loading businesses. Please try again later.</td></tr>';
                }
            });
        }
    }

    // Render businesses in the table
    function renderBusinesses() {
        const businessTableBody = document.getElementById('dashboard-businesses-table');
        if (!businessTableBody) return;

        if (businesses.length === 0) {
            businessTableBody.innerHTML = '<tr><td colspan="6" class="text-center">No businesses found</td></tr>';
            return;
        }

        businessTableBody.innerHTML = '';

        businesses.forEach(business => {
            // Format location
            const location = business.city && business.state ?
                `${business.city}, ${business.state}` : 'Location not specified';

            // Status badge
            const statusBadge = business.status === 'active' ?
                '<span class="badge badge-success">Active</span>' :
                '<span class="badge badge-secondary">Inactive</span>';

            const row = document.createElement('tr');
            row.innerHTML = `
            <td>${business._id ? business._id.substring(0, 8) + '...' : 'N/A'}</td>
            <td>${business.bname || 'N/A'}</td>
            <td>${location}</td>
            <td>${business.type || 'Other'}</td>
            <td>${statusBadge}</td>
            <td>
                <div class="action-btns">
                    <a href="admin-business.html?edit=${business._id}" class="btn btn-sm btn-info">Edit</a>
                </div>
            </td>
        `;

            businessTableBody.appendChild(row);
        });

        // Update business stats
        updateBusinessStats();

        // Add quick search functionality
        setupBusinessQuickSearch();
    }

// Update business stats
    function updateBusinessStats() {
        // Total businesses count
        const totalBusinessesCount = document.getElementById('total-businesses-count');
        if (totalBusinessesCount) {
            totalBusinessesCount.textContent = dashboardStats.businessCount || '0';
        }

        // Active businesses count
        const activeBusinessesCount = document.getElementById('active-businesses-count');
        if (activeBusinessesCount) {
            // Calculate or use API data for active count
            const activeCount = businesses.filter(b => b.status === 'active').length;
            activeBusinessesCount.textContent = activeCount;
        }

        // New businesses count
        const newBusinessesCount = document.getElementById('new-businesses-count');
        if (newBusinessesCount) {
            // Get new businesses count from dashboardStats or estimate
            newBusinessesCount.textContent = dashboardStats.newBusinessesThisMonth ||
                Math.floor((dashboardStats.businessCount || 0) * 0.15); // Fallback estimate
        }
    }

// Quick search for businesses
    function setupBusinessQuickSearch() {
        const quickSearch = document.getElementById('quick-business-search');
        if (!quickSearch) return;

        quickSearch.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const businessRows = document.querySelectorAll('#dashboard-businesses-table tr');

            businessRows.forEach(row => {
                let foundMatch = false;
                const cells = row.querySelectorAll('td');

                cells.forEach(cell => {
                    if (cell.textContent.toLowerCase().includes(searchTerm)) {
                        foundMatch = true;
                    }
                });

                row.style.display = foundMatch ? '' : 'none';
            });
        });
    }





    const businessesListContent = document.getElementById('businesses-list');
    if (businessesListContent) {
        // Update the div with a link to the full business management page
        const headerDiv = businessesListContent.querySelector('div[style*="display: flex"]');
        if (headerDiv) {
            const addBusinessBtn = headerDiv.querySelector('#add-business-btn');

            if (addBusinessBtn) {
                // If the button exists, add the link before it
                const fullManagementLink = document.createElement('a');
                fullManagementLink.href = 'admin-business.html';
                fullManagementLink.className = 'btn btn-info mr-2';
                fullManagementLink.textContent = 'Full Business Management';

                headerDiv.insertBefore(fullManagementLink, addBusinessBtn);
            } else {
                // If the button doesn't exist, add the link to the header
                headerDiv.innerHTML += `
                <a href="../admin-business.html" class="btn btn-info">Full Business Management</a>
            `;
            }
        }
    }

    // Sidebar navigation
    const menuItems = document.querySelectorAll('.menu-item');
    const panels = document.querySelectorAll('.panel');

    menuItems.forEach(item => {
        item.addEventListener('click', function () {
            // Skip if this is a link to another page
            if (this.querySelector('a')) {
                return;
            }

            // Deactivate all menu items and panels
            menuItems.forEach(menuItem => menuItem.classList.remove('active'));
            panels.forEach(panel => panel.classList.remove('active'));

            // Activate clicked menu item and corresponding panel
            this.classList.add('active');
            const section = this.getAttribute('data-section');
            document.getElementById(`${section}-panel`)?.classList.add('active');

            // Update header title
            document.querySelector('.header h1').textContent = this.querySelector('span:last-child').textContent;

            // Load data based on section
            if (section === 'users') {
                loadUsers();
            } else if (section === 'businesses') {
                loadBusinesses();
            } else if (section === 'incentives') {
                // Load incentives when implemented
            } else if (section === 'dashboard') {
                loadDashboardStats();
            }
        });
    });

    // Tab navigation
    const tabs = document.querySelectorAll('.tab');

    tabs.forEach(tab => {
        tab.addEventListener('click', function () {
            // Get parent panel
            const parentPanel = this.closest('.panel');

            // Deactivate all tabs in this panel
            parentPanel.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));

            // Activate clicked tab
            this.classList.add('active');

            // Hide all tab content in this panel
            parentPanel.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

            // Show content corresponding to clicked tab
            const tabId = this.getAttribute('data-tab');
            parentPanel.querySelector(`#${tabId}`).classList.add('active');
        });
    });

    // Search functionality
    const searchInput = document.querySelector('.search-container input');
    searchInput?.addEventListener('input', function () {
        const searchTerm = this.value.toLowerCase();
        const activePanel = document.querySelector('.panel.active');

        if (activePanel) {
            const tableRows = activePanel.querySelectorAll('tbody tr');

            tableRows.forEach(row => {
                let foundMatch = false;
                const cells = row.querySelectorAll('td');

                cells.forEach(cell => {
                    if (cell.textContent.toLowerCase().includes(searchTerm)) {
                        foundMatch = true;
                    }
                });

                row.style.display = foundMatch ? '' : 'none';
            });
        }
    });

    // Check URL parameters for direct actions
    function handleUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const section = urlParams.get('section');

        if (section) {
            const menuItem = document.querySelector(`.menu-item[data-section="${section}"]`);
            if (menuItem) {
                menuItem.click();
            }
        } else {
            // Load dashboard stats by default
            loadDashboardStats();
        }
    }

    // Initialize the dashboard
    function init() {
        // Check URL parameters
        handleUrlParams();

        // Initialize with admin check
        checkAdminStatus();
    }

    // Check for admin status
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
                throw new Error(`Token verification failed: ${response.status}`);
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
            return false;
        }
    }

    function showAccessDenied() {
        document.querySelector('.container').innerHTML = `
            <div class="alert alert-danger" role="alert">
                <h4 class="alert-heading">Access Denied</h4>
                <p>You do not have permission to access this page. Only administrators can access the dashboard.</p>
                <hr>
                <p class="mb-0">Please <a href="/index.html">return to the homepage</a> or contact an administrator if you believe this is an error.</p>
            </div>
        `;
    }

    // Start initialization
    init();

    // Add link to full business management in businesses panel
    document.addEventListener('DOMContentLoaded', function() {
        // Wait a short time to ensure all other DOM manipulations are complete
        setTimeout(() => {
            const businessesListContent = document.getElementById('businesses-list');
            if (businessesListContent) {
                // Update the div with a link to the full business management page
                const headerDiv = businessesListContent.querySelector('div[style*="display: flex"]');
                if (headerDiv) {
                    const addBusinessBtn = headerDiv.querySelector('#add-business-btn');

                    if (addBusinessBtn) {
                        // If the button exists, add the link before it
                        const fullManagementLink = document.createElement('a');
                        fullManagementLink.href = 'admin-business.html';
                        fullManagementLink.className = 'btn btn-info mr-2';
                        fullManagementLink.textContent = 'Full Business Management';

                        headerDiv.insertBefore(fullManagementLink, addBusinessBtn);
                    } else {
                        // If the button doesn't exist, add the link to the header
                        headerDiv.innerHTML += `
                        <a href="../admin-business.html" class="btn btn-info">Full Business Management</a>
                    `;
                    }
                }
            }
        }, 500); // Short delay to ensure DOM is fully processed
    });
});
// dashboard.js - Updated to use real data from the API and show users in the dashboard

let loadSpinner;

// Function to show the loading spinner
function showSpinner() {
    loadSpinner = document.getElementById('spinner-container');
    if (loadSpinner) {
        loadSpinner.style.display = 'flex';
        loadSpinner.style.opacity = 1;
    }
}

// Function to hide the loading spinner with a fade effect
function hideLoadingSpinner() {
        setTimeout(() => {
            loadSpinner.style.opacity = 0; // this will hide the spinner
            loadSpinner.style.transition = 'opacity 0.5s'; // fadeout in half a second
            setTimeout(() => {
                loadSpinner.style.display = 'none';
            }, 500);
        }, 500);
}

document.addEventListener('DOMContentLoaded', function () {
    // State variables for API data
    let users = [];
    let businesses = [];
    let incentives = [];
    let dashboardStats = {};


    // Function to handle API errors
    function handleApiError(error, fallbackAction) {
        console.error('API Error:', error);

        // Check if error is related to authorization
        if (error.status === 401) {
            console.error("Authentication Error -- Please log in again");
            //

            // try fallback action if provided
            if (typeof fallbackAction === 'function') {
                fallbackAction();
                return;
            }

            // only redirect if fallback action is not provided
            setTimeout(() => {
                window.location.href = '/index.html?login=required&redirect=' + encodeURIComponent(window.location.pathname);
            }, 2000);  // redirect delay for time to see the message
            return;
        }

        // Execute fallback action if provided
        if (typeof fallbackAction === 'function') {
            fallbackAction();
        }
    }

    // Load dashboard stats
    async function loadDashboardStats() {
        // Show spinner while loading
        showSpinner();
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
            hideLoadingSpinner()
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
                hideLoadingSpinner();
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
                    <h3>Incentives</h3>
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
            newUsersCount.textContent = stats.newUsersThisMonth || 0; // Use the exact count from API
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
// Update to the loadBusinesses function in dashboard.js
    async function loadBusinesses() {
        try {
            // Show loading indicator in dashboard businesses table
            const businessTableBody = document.getElementById('dashboard-businesses-table');
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
                console.error("No auth token found");
                // handle missing token gracefully
                if (businessTableBody) {
                    businessTableBody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Authentication error. Please log in again.</td></tr>';
                }
                return;
            }

            console.log("Using token for API request: ", token.substring(0, 10) + "...");

            // Make API request
            const response = await fetch(`${baseURL}/api/business.js?operation=admin-list-businesses&page=1&limit=5`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Cache-Control': 'no-cache'
                }
            });

            if (!response.ok) {
                console.error("API error response: ", response.status, response.statusText);

                // if unauthorized, handle gracefully
                if (response.status === 401) {
                    console.error("Unauthorized request -- token may be invalid");
                    if (businessTableBody) {
                        businessTableBody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Authentication error. Please log in again.</td></tr>';
                    }
                    return;
                }
                throw response;
            }

            const data = await response.json();
            businesses = data.businesses || [];

            // Render businesses in the table
            renderBusinesses();
        } catch (error) {
            handleApiError(error, () => {
                // If API fails, show error message instead of redirecting
                const businessTableBody = document.getElementById('dashboard-businesses-table');
                if (businessTableBody) {
                    businessTableBody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Error loading businesses. Please try again later.</td></tr>';
                }

                // For testing, provide some mock data
                businesses = [
                    {
                        _id: '1',
                        bname: 'Tech Solutions Inc.',
                        city: 'Cedar Rapids',
                        state: 'IA',
                        type: 'technology',
                        status: 'active'
                    },
                    {
                        _id: '2',
                        bname: 'Hometown Diner',
                        city: 'Marion',
                        state: 'IA',
                        type: 'food',
                        status: 'active'
                    },
                    {
                        _id: '3',
                        bname: 'Cedar Medical Center',
                        city: 'Cedar Rapids',
                        state: 'IA',
                        type: 'healthcare',
                        status: 'active'
                    }
                ];
                renderBusinesses();
            });
        }
    }

// Render businesses in the dashboard
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
            totalBusinessesCount.textContent = dashboardStats.businessCount || businesses.length || '0';
        }

        // Active businesses count
        const activeBusinessesCount = document.getElementById('active-businesses-count');
        if (activeBusinessesCount) {
            // Calculate or use API data for active count
            const activeCount = businesses.filter(b => b.status === 'active').length;
            activeBusinessesCount.textContent = activeCount || Math.floor((dashboardStats.businessCount || 0) * 0.8);
        }

        // New businesses count
        const newBusinessesCount = document.getElementById('new-businesses-count');
        if (newBusinessesCount) {
            // Get new businesses count from dashboardStats or estimate
            newBusinessesCount.textContent = dashboardStats.newBusinessesThisMonth ||
                Math.floor((dashboardStats.businessCount || businesses.length || 0) * 0.15); // Fallback estimate
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

    // Load incentives from API for dashboard display
    async function loadIncentives() {
        try {
            // Show loading indicator in dashboard incentives table
            const incentiveTableBody = document.getElementById('dashboard-incentives-table');
            if (incentiveTableBody) {
                incentiveTableBody.innerHTML = '<tr><td colspan="6" class="text-center">Loading incentives...</td></tr>';
            }

            // Determine the base URL
            const baseURL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                ? `http://${window.location.host}`
                : 'https://patriotthanks.vercel.app';

            // Get auth token
            const token = getAuthToken();
            if (!token) {
                console.error("No auth token found");
                // handle missing token gracefully
                if (incentiveTableBody) {
                    incentiveTableBody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Authentication error. Please log in again.</td></tr>';
                }
                return;
            }

            // First, ensure we have the latest dashboard stats
            await loadDashboardStats();

            // Make API request for incentives list
            const response = await fetch(`${baseURL}/api/admin-incentives.js?operation=admin-list-incentives&page=1&limit=5`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Cache-Control': 'no-cache'
                }
            });

            if (!response.ok) {
                console.error("API error response: ", response.status, response.statusText);

                if (response.status === 401) {
                    console.error("Unauthorized request -- token may be invalid");
                    if (incentiveTableBody) {
                        incentiveTableBody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Authentication error. Please log in again.</td></tr>';
                    }
                    return;
                }
                throw response;
            }

            const data = await response.json();
            const incentives = data.incentives || [];

            // Render incentives in the table
            renderDashboardIncentives(incentives);
        } catch (error) {
            handleApiError(error, () => {
                // Fallback handling
                const incentiveTableBody = document.getElementById('dashboard-incentives-table');
                if (incentiveTableBody) {
                    incentiveTableBody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Error loading incentives. Please try again later.</td></tr>';
                }

                // For testing, provide some mock data
                const mockIncentives = [
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
                    }
                ];
                renderDashboardIncentives(mockIncentives);
            });
        }
    }

// Load incentive statistics
//     async function loadIncentiveStats() {
//         try {
//             // Determine the base URL
//             const baseURL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
//                 ? `http://${window.location.host}`
//                 : 'https://patriotthanks.vercel.app';
//
//             // Get auth token
//             const token = getAuthToken();
//             if (!token) {
//                 return;
//             }
//
//             // Make API request - we'll use the existing incentives API for now
//             const response = await fetch(`${baseURL}/api/auth.js?operation=dashboard-stats`, {
//                 method: 'GET',
//                 headers: {
//                     'Authorization': `Bearer ${token}`,
//                     'Cache-Control': 'no-cache'
//                 }
//             });
//
//             if (!response.ok) {
//                 throw response;
//             }
//
//             const data = await response.json();
//
//             // Update stats with the data
//             const totalCount = data.total || 0;
//             const availableCount = data.available || 0;
//             const newCount = data.newThisMonth || 0;
//
//             updateIncentiveStats(totalCount, availableCount, newCount);
//         } catch (error) {
//             console.error('Error loading incentive stats:', error);
//
//             // Fallback to setting reasonable defaults
//             updateIncentiveStats(0, 0, 0);
//         }
//     }

// Render incentives in the dashboard
    function renderDashboardIncentives(incentives) {
        const incentiveTableBody = document.getElementById('dashboard-incentives-table');
        if (!incentiveTableBody) return;

        if (!incentives || incentives.length === 0) {
            incentiveTableBody.innerHTML = '<tr><td colspan="6" class="text-center">No incentives found</td></tr>';
            return;
        }

        incentiveTableBody.innerHTML = '';

        incentives.forEach(incentive => {
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
            const amountText = incentive.amount ? `${incentive.amount}%` : 'N/A';

            // Format date
            const dateCreated = incentive.created_at ? new Date(incentive.created_at).toLocaleDateString() : 'Unknown';

            const row = document.createElement('tr');
            row.innerHTML = `
            <td>${incentive.businessName || 'Unknown Business'}</td>
            <td>${typeLabel}${otherDesc}</td>
            <td class="${availabilityClass}">${availabilityText}</td>
            <td>${amountText}</td>
            <td>${incentive.information || 'No information available'}</td>
            <td>
                <div class="action-btns">
                    <a href="admin-incentives.html?edit=${incentive._id}" class="btn btn-sm btn-info">Edit</a>
                </div>
            </td>
        `;

            incentiveTableBody.appendChild(row);
        });

        // Update incentive stats based on these incentives
        const totalCount = dashboardStats.incentiveCount || incentives.length;
        const availableCount = incentives.filter(i => i.is_available).length;
        const newCount = dashboardStats.incentiveChange || Math.round(totalCount * 0.2);

        updateIncentiveStats(totalCount, availableCount, newCount);

        // Add quick search functionality
        setupIncentiveQuickSearch();
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

    // Update incentive stats in the dashboard
    function updateIncentiveStats(totalCount, availableCount, newCount) {
        const totalIncentivesCount = document.getElementById('total-incentives-count');
        if (totalIncentivesCount) {
            totalIncentivesCount.textContent = totalCount;
        }

        const availableIncentivesCount = document.getElementById('available-incentives-count');
        if (availableIncentivesCount) {
            availableIncentivesCount.textContent = availableCount || Math.round(totalCount * 0.85); // Fallback estimate
        }

        const newIncentivesCount = document.getElementById('new-incentives-count');
        if (newIncentivesCount) {
            // Use the newIncentivesThisMonth value from dashboardStats if available
            newIncentivesCount.textContent = dashboardStats.newIncentivesThisMonth || newCount || 0;
        }
    }

// Set up quick search for incentives
    function setupIncentiveQuickSearch() {
        const quickSearch = document.getElementById('quick-incentive-search');
        if (!quickSearch) return;

        quickSearch.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const incentiveRows = document.querySelectorAll('#dashboard-incentives-table tr');

            incentiveRows.forEach(row => {
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

// Add the following to the existing init() function or where appropriate:
    /*
    // Add menu click handler for incentives tab if not already handled
    menuItems.forEach(item => {
        item.addEventListener('click', function() {
            // Skip if this is a link to another page
            if (this.querySelector('a')) {
                return;
            }

            // Get the section from data attribute
            const section = this.getAttribute('data-section');

            // If incentives section is clicked, load incentives
            if (section === 'incentives') {
                loadIncentives();
            }
            // ... (other sections handling)
        });
    });
    */

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
                loadIncentives();
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
        // Show spinner while loading
        showSpinner();

        // Check URL parameters
        handleUrlParams();

        // Initialize with admin check
        checkAdminStatus();
    }

    // Check for admin status
    // Standardized token validation function to use across all admin pages
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

                // For development only - remove in production
                console.warn('DEVELOPMENT MODE: Bypassing admin verification');
                const devBypass = confirm('API error encountered. Would you like to bypass admin verification for development purposes?');
                return devBypass;
            }
        } catch (error) {
            console.error('Error in admin status check:', error);
            return false;
        }
    }

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

    function showAccessDenied() {
        document.querySelector('.admin-container, .container').innerHTML = `
        <div class="alert alert-danger" role="alert">
            <h4 class="alert-heading">Access Denied</h4>
            <p>You do not have permission to access this page. Only administrators can access this section.</p>
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
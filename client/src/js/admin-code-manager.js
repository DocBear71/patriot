// admin-code-manager.js - Handles admin code CRUD operations
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is admin before proceeding
    checkAdminAccess().then(isAdmin => {
        if (!isAdmin) {
            showAccessDenied();
            return;
        }

        // Initialize the page
        loadExistingCodes();
        setupEventListeners();
    });
});

/**
 * Verify the user has admin access
 */
async function checkAdminAccess() {
    try {
        // Get token from session
        const token = getAuthToken();
        if (!token) {
            console.error("No auth token found");
            return false;
        }

        // Determine the base URL
        const baseURL = getBaseUrl();

        // Verify token with server
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
        return data.isAdmin === true || data.level === 'Admin';
    } catch (error) {
        console.error('Error checking admin status:', error);

        // For development only - can remove in production
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            const useDevMode = confirm('API error encountered. Would you like to bypass admin verification for development purposes?');
            if (useDevMode) {
                console.warn('DEVELOPMENT MODE: Bypassing admin verification');
                return true;
            }
        }

        return false;
    }
}

/**
 * Get authentication token from localStorage
 */
function getAuthToken() {
    try {
        const sessionData = localStorage.getItem('patriotThanksSession');
        if (!sessionData) {
            return null;
        }

        const session = JSON.parse(sessionData);
        if (!session.token) {
            return null;
        }

        return session.token;
    } catch (error) {
        console.error('Error retrieving auth token:', error);
        return null;
    }
}

/**
 * Get the base URL for API requests
 */
function getBaseUrl() {
    return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? `http://${window.location.host}`
        : 'https://patriotthanks.vercel.app';
}

/**
 * Show access denied message
 */
function showAccessDenied() {
    document.querySelector('.container').innerHTML = `
        <div class="alert alert-danger" role="alert">
            <h4 class="alert-heading">Access Denied</h4>
            <p>You do not have permission to access this page. Only administrators can manage access codes.</p>
            <hr>
            <p class="mb-0">Please <a href="/index.html">return to the homepage</a> or contact an administrator if you believe this is an error.</p>
        </div>
    `;
}

/**
 * Load existing admin codes from the server
 */
async function loadExistingCodes() {
    try {
        const token = getAuthToken();
        const baseURL = getBaseUrl();

        const response = await fetch(`${baseURL}/api/combined-api.js?operation=admin-codes&action=list`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Cache-Control': 'no-cache'
            }
        });

        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json();
        displayCodes(data.codes || []);
    } catch (error) {
        console.error('Error loading admin codes:', error);

        // For development only - show mock data
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.warn('DEVELOPMENT MODE: Using mock data');
            displayMockCodes();
        } else {
            document.getElementById('codes-table-body').innerHTML = `
                <tr>
                    <td colspan="4" class="text-center">Error loading access codes. Please try again later.</td>
                </tr>
            `;
        }
    }
}

/**
 * Display admin codes in the table
 */
function displayCodes(codes) {
    const tableBody = document.getElementById('codes-table-body');

    if (!codes || codes.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center">No access codes found. Create a new one to get started.</td>
            </tr>
        `;
        return;
    }

    const rows = codes.map(code => {
        // Format the expiration date
        const expiration = code.expiration
            ? new Date(code.expiration).toLocaleDateString()
            : 'Never expires';

        return `
            <tr data-code-id="${code._id}">
                <td>${code.code}</td>
                <td>${code.description}</td>
                <td>${expiration}</td>
                <td>
                    <button class="btn btn-sm btn-danger delete-code-btn" data-code-id="${code._id}">
                        <i class="bi bi-trash"></i> Delete
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    tableBody.innerHTML = rows;

    // Add event listeners to delete buttons
    document.querySelectorAll('.delete-code-btn').forEach(btn => {
        btn.addEventListener('click', handleDeleteCode);
    });
}

/**
 * Development only - display mock data
 */
function displayMockCodes() {
    const mockCodes = [
        {
            _id: 'mock1',
            code: 'ADMIN123',
            description: 'Development admin access code',
            expiration: new Date('2026-12-31')
        },
        {
            _id: 'mock2',
            code: 'TEMPACCESS',
            description: 'Temporary access for demo',
            expiration: new Date('2025-06-30')
        },
        {
            _id: 'mock3',
            code: 'VETERAN2025',
            description: 'Veteran admin registration',
            expiration: null
        }
    ];

    displayCodes(mockCodes);
}

/**
 * Set up event listeners for the page
 */
function setupEventListeners() {
    // Form submission for creating a new code
    const createCodeForm = document.getElementById('create-code-form');
    if (createCodeForm) {
        createCodeForm.addEventListener('submit', handleCreateCode);
    }
}

/**
 * Handle creation of a new admin code
 */
async function handleCreateCode(event) {
    event.preventDefault();

    // Get form values
    const code = document.getElementById('accessCode').value.trim();
    const description = document.getElementById('codeDescription').value.trim();
    const expirationDate = document.getElementById('expirationDate').value;

    // Basic validation
    if (!code || !description) {
        showAlert('Please enter both a code and description', 'danger');
        return;
    }

    // Prepare the request data
    const codeData = {
        code,
        description,
        expiration: expirationDate || null
    };

    try {
        const token = getAuthToken();
        const baseURL = getBaseUrl();

        // Send request to create code
        const response = await fetch(`${baseURL}/api/combined-api.js?operation=admin-codes&action=create`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(codeData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to create access code');
        }

        // Success - show message and reload codes
        showAlert('Access code created successfully', 'success');

        // Reset form
        document.getElementById('create-code-form').reset();

        // Reload codes list
        loadExistingCodes();
    } catch (error) {
        console.error('Error creating admin code:', error);
        showAlert(error.message || 'Error creating access code', 'danger');

        // For development mode - mock success
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.warn('DEVELOPMENT MODE: Simulating successful code creation');
            showAlert('Access code created successfully (DEVELOPMENT MODE)', 'success');
            document.getElementById('create-code-form').reset();

            // Add mock code to the table
            const mockId = 'mock' + Math.floor(Math.random() * 1000);
            const mockCode = {
                _id: mockId,
                code: code,
                description: description,
                expiration: expirationDate ? new Date(expirationDate) : null
            };

            // Get existing codes and add the new one
            const tableBody = document.getElementById('codes-table-body');
            let existingCodes = [];

            if (tableBody.innerHTML.includes('No access codes found')) {
                existingCodes = [];
            } else {
                // Parse existing codes from the table
                document.querySelectorAll('#codes-table-body tr').forEach(row => {
                    const id = row.getAttribute('data-code-id');
                    if (id && !id.includes('mock')) {
                        const cells = row.querySelectorAll('td');
                        existingCodes.push({
                            _id: id,
                            code: cells[0].textContent,
                            description: cells[1].textContent,
                            expiration: cells[2].textContent !== 'Never expires'
                                ? new Date(cells[2].textContent)
                                : null
                        });
                    }
                });
            }

            existingCodes.push(mockCode);
            displayCodes(existingCodes);
        }
    }
}

/**
 * Handle deletion of an admin code
 */
async function handleDeleteCode(event) {
    event.preventDefault();

    if (!confirm('Are you sure you want to delete this access code? This action cannot be undone.')) {
        return;
    }

    const codeId = event.currentTarget.getAttribute('data-code-id');

    try {
        const token = getAuthToken();
        const baseURL = getBaseUrl();

        // Send request to delete code
        const response = await fetch(`${baseURL}/api/combined-api.js?operation=admin-codes&action=delete`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ codeId })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to delete access code');
        }

        // Success - show message and update UI
        showAlert('Access code deleted successfully', 'success');

        // Remove the row from the table
        const row = document.querySelector(`tr[data-code-id="${codeId}"]`);
        if (row) {
            row.remove();

            // Check if table is now empty
            const tableBody = document.getElementById('codes-table-body');
            if (tableBody.children.length === 0) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="4" class="text-center">No access codes found. Create a new one to get started.</td>
                    </tr>
                `;
            }
        }
    } catch (error) {
        console.error('Error deleting admin code:', error);
        showAlert(error.message || 'Error deleting access code', 'danger');

        // For development mode - mock success
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.warn('DEVELOPMENT MODE: Simulating successful code deletion');
            showAlert('Access code deleted successfully (DEVELOPMENT MODE)', 'success');

            // Remove the row from the table
            const row = document.querySelector(`tr[data-code-id="${codeId}"]`);
            if (row) {
                row.remove();

                // Check if table is now empty
                const tableBody = document.getElementById('codes-table-body');
                if (tableBody.children.length === 0) {
                    tableBody.innerHTML = `
                        <tr>
                            <td colspan="4" class="text-center">No access codes found. Create a new one to get started.</td>
                        </tr>
                    `;
                }
            }
        }
    }
}

/**
 * Show an alert message to the user
 */
function showAlert(message, type) {
    // Check if alert container exists, if not create it
    let alertContainer = document.getElementById('alert-container');
    if (!alertContainer) {
        alertContainer = document.createElement('div');
        alertContainer.id = 'alert-container';
        alertContainer.style.position = 'fixed';
        alertContainer.style.top = '70px';
        alertContainer.style.right = '20px';
        alertContainer.style.maxWidth = '400px';
        alertContainer.style.zIndex = '1050';
        document.body.appendChild(alertContainer);
    }

    // Create alert element
    const alertId = 'alert-' + Date.now();
    const alertElement = document.createElement('div');
    alertElement.id = alertId;
    alertElement.className = `alert alert-${type} alert-dismissible fade show`;
    alertElement.role = 'alert';
    alertElement.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;

    // Add to container
    alertContainer.appendChild(alertElement);

    // Initialize Bootstrap alert
    const bsAlert = new bootstrap.Alert(alertElement);

    // Auto close after 5 seconds
    setTimeout(() => {
        if (document.getElementById(alertId)) {
            bsAlert.close();
        }
    }, 5000);

    // Remove from DOM after closed
    alertElement.addEventListener('closed.bs.alert', function () {
        alertElement.remove();
    });
}
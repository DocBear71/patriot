// donations-admin.js - Admin dashboard functionality

document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const adminDashboard = document.getElementById('admin-dashboard');
    const unauthorizedMessage = document.getElementById('unauthorized-message');

    // User authentication state
    let isAuthenticated = false;
    let isAdmin = false;
    let userToken = null;

    // Pagination state
    let currentPage = 1;
    let totalPages = 1;
    let pageSize = 10;

    // Filters state
    let searchTerm = '';
    let statusFilter = '';
    let dateFilter = '';

    // Initialize the dashboard
    function init() {
        checkAuthStatus();
        setupEventListeners();

        // Initialize Chart.js if needed
        if (typeof Chart !== 'undefined') {
            initDonationChart();
        } else {
            console.warn('Chart.js not loaded');
        }
    }

    // Check authentication status
    function checkAuthStatus() {
        // Get token from local storage
        userToken = localStorage.getItem('userToken');

        if (!userToken) {
            showUnauthorizedMessage();
            return;
        }

        // Verify token with the server
        fetch('/api/auth.js?operation=verify-token', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${userToken}`
            }
        })
            .then(response => response.json())
            .then(data => {
                if (data.isValid && data.isAdmin) {
                    isAuthenticated = true;
                    isAdmin = true;
                    showAdminDashboard();
                    loadDashboardData();
                } else {
                    showUnauthorizedMessage();
                }
            })
            .catch(error => {
                console.error('Authentication error:', error);
                showUnauthorizedMessage();
            });
    }

    // Show unauthorized message
    function showUnauthorizedMessage() {
        adminDashboard.style.display = 'none';
        unauthorizedMessage.style.display = 'block';
    }

    // Show admin dashboard
    function showAdminDashboard() {
        unauthorizedMessage.style.display = 'none';
        adminDashboard.style.display = 'block';
    }

    // Set up event listeners
    function setupEventListeners() {
        // Pagination controls
        document.getElementById('prev-page').addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                loadDonations();
            }
        });

        document.getElementById('next-page').addEventListener('click', () => {
            if (currentPage < totalPages) {
                currentPage++;
                loadDonations();
            }
        });

        // Search and filters
        document.getElementById('search-btn').addEventListener('click', () => {
            searchTerm = document.getElementById('search-donations').value;
            currentPage = 1;
            loadDonations();
        });

        document.getElementById('search-donations').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchTerm = e.target.value;
                currentPage = 1;
                loadDonations();
            }
        });

        document.getElementById('filter-status').addEventListener('change', (e) => {
            statusFilter = e.target.value;
            currentPage = 1;
            loadDonations();
        });

        document.getElementById('filter-date').addEventListener('change', (e) => {
            dateFilter = e.target.value;
            currentPage = 1;
            loadDonations();
        });

        // Export button
        document.getElementById('export-donations').addEventListener('click', exportDonations);

        // Modal actions
        document.getElementById('send-receipt').addEventListener('click', resendReceipt);
    }

    // Load dashboard data
    function loadDashboardData() {
        // Load statistics
        loadDonationStats();

        // Load donations list
        loadDonations();
    }

    // Load donation statistics
    function loadDonationStats() {
        if (!isAuthenticated || !isAdmin) return;

        fetch('/api/user-donations.js?operation=donation-stats', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${userToken}`
            }
        })
            .then(response => response.json())
            .then(data => {
                // Update statistics cards
                document.getElementById('total-donations').textContent = data.totalDonations;
                document.getElementById('total-amount').textContent = formatCurrency(data.totalAmount);
                document.getElementById('month-amount').textContent = formatCurrency(data.thisMonthAmount);
                document.getElementById('month-count').textContent = `${data.thisMonthDonations} donations`;
                document.getElementById('recurring-count').textContent = data.recurringDonations;

                // Update growth indicators
                const donationGrowth = document.getElementById('donation-growth');
                donationGrowth.innerHTML = formatGrowth(data.growthPercentage);

                // Update chart if it exists
                if (data.monthlyData && window.donationChart) {
                    updateDonationChart(data.monthlyData);
                }
            })
            .catch(error => {
                console.error('Error loading donation stats:', error);
            });
    }

    // Load donations list
    function loadDonations() {
        if (!isAuthenticated || !isAdmin) return;

        const tableBody = document.getElementById('donations-table-body');

        // Clear table and show loading state
        tableBody.innerHTML = `
            <tr class="loading-row">
                <td colspan="8" class="text-center py-4">
                    <div class="d-flex justify-content-center">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                    </div>
                </td>
            </tr>
        `;

        // Build query parameters
        let queryParams = `operation=list&page=${currentPage}&limit=${pageSize}`;

        if (searchTerm) {
            queryParams += `&search=${encodeURIComponent(searchTerm)}`;
        }

        if (statusFilter) {
            queryParams += `&status=${encodeURIComponent(statusFilter)}`;
        }

        if (dateFilter) {
            const dateRange = getDateRangeFromFilter(dateFilter);
            if (dateRange.startDate) {
                queryParams += `&startDate=${encodeURIComponent(dateRange.startDate)}`;
            }
            if (dateRange.endDate) {
                queryParams += `&endDate=${encodeURIComponent(dateRange.endDate)}`;
            }
        }

        // Fetch donations
        fetch(`/api/user-donations.js?operation=donations&${queryParams}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${userToken}`
            }
        })
            .then(response => response.json())
            .then(data => {
                // Update pagination info
                currentPage = data.page;
                totalPages = data.totalPages;

                document.getElementById('current-page').textContent = currentPage;
                document.getElementById('total-pages').textContent = totalPages;
                document.getElementById('prev-page').disabled = currentPage <= 1;
                document.getElementById('next-page').disabled = currentPage >= totalPages;

                // Update showing text
                const start = (currentPage - 1) * pageSize + 1;
                const end = Math.min(start + data.donations.length - 1, data.total);
                document.querySelector('.showing-text').textContent = `Showing ${start} to ${end} of ${data.total} entries`;

                // Render donation rows
                renderDonationRows(data.donations);
            })
            .catch(error => {
                console.error('Error loading donations:', error);
                tableBody.innerHTML = `
                <tr class="error-row">
                    <td colspan="8" class="text-center py-4 text-danger">
                        <i class="bi bi-exclamation-triangle-fill me-2"></i>
                        Error loading donations. Please try again.
                    </td>
                </tr>
            `;
            });
    }

    // Render donation rows in the table
    function renderDonationRows(donations) {
        const tableBody = document.getElementById('donations-table-body');

        if (!donations || donations.length === 0) {
            tableBody.innerHTML = `
                <tr class="no-data-row">
                    <td colspan="8" class="text-center py-4">No donation data available</td>
                </tr>
            `;
            return;
        }

        // Generate table rows
        tableBody.innerHTML = donations.map(donation => {
            // Format date
            const donationDate = new Date(donation.created_at);
            const formattedDate = donationDate.toLocaleDateString() + ' ' +
                donationDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

            // Format status badge
            let statusBadge = '';
            switch (donation.status) {
                case 'completed':
                    statusBadge = '<span class="badge bg-success">Completed</span>';
                    break;
                case 'pending':
                    statusBadge = '<span class="badge bg-warning text-dark">Pending</span>';
                    break;
                case 'failed':
                    statusBadge = '<span class="badge bg-danger">Failed</span>';
                    break;
                default:
                    statusBadge = `<span class="badge bg-secondary">${donation.status}</span>`;
            }

            // Format recurring badge
            const recurringBadge = donation.recurring ?
                '<span class="badge bg-info"><i class="bi bi-arrow-repeat"></i> Monthly</span>' :
                '<span class="badge bg-light text-dark">One-time</span>';

            // Format payment method icon
            let paymentIcon = '';
            switch (donation.paymentMethod) {
                case 'paypal':
                    paymentIcon = '<i class="bi bi-paypal"></i> PayPal';
                    break;
                case 'card':
                    paymentIcon = '<i class="bi bi-credit-card"></i> Card';
                    break;
                default:
                    paymentIcon = donation.paymentMethod;
            }

            // Generate actions based on donation status
            let actions = `
                <button class="btn btn-sm btn-outline-primary view-details" data-id="${donation._id}">
                    <i class="bi bi-eye"></i>
                </button>
            `;

            if (donation.status === 'completed') {
                actions += `
                    <button class="btn btn-sm btn-outline-secondary ms-1 send-receipt" data-id="${donation._id}">
                        <i class="bi bi-envelope"></i>
                    </button>
                `;
            }

            if (donation.recurring) {
                actions += `
                    <button class="btn btn-sm btn-outline-danger ms-1 cancel-recurring" data-id="${donation._id}">
                        <i class="bi bi-x-circle"></i>
                    </button>
                `;
            }

            // Name display (respect anonymous setting)
            const nameDisplay = donation.anonymous ?
                '<em>Anonymous</em>' :
                donation.name;

            return `
                <tr data-id="${donation._id}">
                    <td>${formattedDate}</td>
                    <td>${nameDisplay}</td>
                    <td>${donation.email}</td>
                    <td>${formatCurrency(donation.amount)}</td>
                    <td>${paymentIcon}</td>
                    <td>${statusBadge}</td>
                    <td>${recurringBadge}</td>
                    <td>${actions}</td>
                </tr>
            `;
        }).join('');

        // Add event listeners to action buttons
        document.querySelectorAll('.view-details').forEach(button => {
            button.addEventListener('click', function() {
                const donationId = this.getAttribute('data-id');
                showDonationDetails(donationId);
            });
        });

        document.querySelectorAll('.send-receipt').forEach(button => {
            button.addEventListener('click', function() {
                const donationId = this.getAttribute('data-id');
                sendReceiptEmail(donationId);
            });
        });

        document.querySelectorAll('.cancel-recurring').forEach(button => {
            button.addEventListener('click', function() {
                const donationId = this.getAttribute('data-id');
                cancelRecurringDonation(donationId);
            });
        });
    }

    // Show donation details in modal
    function showDonationDetails(donationId) {
        // Fetch donation details
        fetch(`/api/user-donations.js?operation=get&id=${donationId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${userToken}`
            }
        })
            .then(response => response.json())
            .then(data => {
                const donation = data.donation;

                // Populate modal with donation details
                document.getElementById('detail-id').textContent = donation._id;
                document.getElementById('detail-date').textContent = new Date(donation.created_at).toLocaleString();
                document.getElementById('detail-amount').textContent = formatCurrency(donation.amount);
                document.getElementById('detail-name').textContent = donation.anonymous ? 'Anonymous' : donation.name;
                document.getElementById('detail-email').textContent = donation.email;
                document.getElementById('detail-recurring').textContent = donation.recurring ? 'Yes (Monthly)' : 'No';
                document.getElementById('detail-payment').textContent = donation.paymentMethod;
                document.getElementById('detail-status').textContent = donation.status;
                document.getElementById('detail-transaction').textContent = donation.transactionId || 'N/A';
                document.getElementById('detail-payment-id').textContent = donation.paymentId || 'N/A';

                // Handle message display
                const messageSection = document.getElementById('message-section');
                if (donation.message) {
                    messageSection.style.display = 'block';
                    document.getElementById('detail-message').textContent = donation.message;
                } else {
                    messageSection.style.display = 'none';
                }

                // Show the modal
                const modal = new bootstrap.Modal(document.getElementById('donation-details-modal'));
                modal.show();
            })
            .catch(error => {
                console.error('Error loading donation details:', error);
                alert('Error loading donation details. Please try again.');
            });
    }

    // Send receipt email for a donation
    function sendReceiptEmail(donationId) {
        fetch('/api/user-donations.js?operation=send-receipt', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${userToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                donationId: donationId
            })
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert('Receipt sent successfully.');
                } else {
                    alert(`Failed to send receipt: ${data.message}`);
                }
            })
            .catch(error => {
                console.error('Error sending receipt:', error);
                alert('Error sending receipt. Please try again.');
            });
    }

    // Resend receipt from the modal
    function resendReceipt() {
        const donationId = document.getElementById('detail-id').textContent;
        if (donationId) {
            sendReceiptEmail(donationId);
        }
    }

    // Cancel a recurring donation
    function cancelRecurringDonation(donationId) {
        if (!confirm('Are you sure you want to cancel this recurring donation? This action cannot be undone.')) {
            return;
        }

        fetch('/api/user-donations.js?operation=cancel-recurring', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${userToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                donationId: donationId
            })
        })
            .then(response => response.json())
            .then(data => {
                if (data.message) {
                    alert(data.message);
                    loadDonations(); // Reload the list
                }
            })
            .catch(error => {
                console.error('Error canceling recurring donation:', error);
                alert('Error canceling recurring donation. Please try again.');
            });
    }

    // Export donations to CSV
    function exportDonations() {
        // Build query parameters based on current filters
        let queryParams = `operation=export&format=csv`;

        if (searchTerm) {
            queryParams += `&search=${encodeURIComponent(searchTerm)}`;
        }

        if (statusFilter) {
            queryParams += `&status=${encodeURIComponent(statusFilter)}`;
        }

        if (dateFilter) {
            const dateRange = getDateRangeFromFilter(dateFilter);
            if (dateRange.startDate) {
                queryParams += `&startDate=${encodeURIComponent(dateRange.startDate)}`;
            }
            if (dateRange.endDate) {
                queryParams += `&endDate=${encodeURIComponent(dateRange.endDate)}`;
            }
        }

        // Create a download link
        const downloadUrl = `/api/user-donations.js?${queryParams}`;
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.setAttribute('download', `donations-export-${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(a);

        // Add authorization header
        a.setAttribute('data-token', userToken);

        // Trigger the download
        a.click();

        // Clean up
        document.body.removeChild(a);

        // Note: This approach may not work directly due to authorization header issues
        // In a real implementation, you might need to handle the export differently
        // For example, by creating a temporary download link or using a popup window
    }

    // Initialize donation chart
    function initDonationChart() {
        const ctx = document.getElementById('donations-chart');
        if (!ctx) return;

        window.donationChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'Donation Amount ($)',
                    data: [0, 0, 0, 0, 0, 0],
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                }, {
                    label: 'Number of Donations',
                    data: [0, 0, 0, 0, 0, 0],
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1,
                    yAxisID: 'y-axis-2'
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Amount ($)'
                        }
                    },
                    'y-axis-2': {
                        beginAtZero: true,
                        position: 'right',
                        grid: {
                            drawOnChartArea: false
                        },
                        title: {
                            display: true,
                            text: 'Count'
                        }
                    }
                }
            }
        });
    }

    // Update donation chart with new data
    function updateDonationChart(monthlyData) {
        if (!window.donationChart || !monthlyData) return;

        const labels = monthlyData.map(item => `${item.month} ${item.year}`);
        const amounts = monthlyData.map(item => item.amount);
        const counts = monthlyData.map(item => item.count);

        window.donationChart.data.labels = labels;
        window.donationChart.data.datasets[0].data = amounts;
        window.donationChart.data.datasets[1].data = counts;
        window.donationChart.update();
    }

    // Helper function to format currency
    function formatCurrency(amount) {
        return '$' + parseFloat(amount).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
    }

    // Helper function to format growth percentage
    function formatGrowth(percentage) {
        if (percentage > 0) {
            return `<i class="bi bi-arrow-up-circle-fill text-success"></i> ${percentage.toFixed(1)}%`;
        } else if (percentage < 0) {
            return `<i class="bi bi-arrow-down-circle-fill text-danger"></i> ${Math.abs(percentage).toFixed(1)}%`;
        } else {
            return `<i class="bi bi-dash-circle-fill text-secondary"></i> 0%`;
        }
    }

    // Helper function to get date range from filter
    function getDateRangeFromFilter(filter) {
        const now = new Date();
        const result = {
            startDate: null,
            endDate: null
        };

        switch (filter) {
            case 'today':
                result.startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
                result.endDate = now.toISOString();
                break;

            case 'week':
                // Get start of current week (Sunday)
                const dayOfWeek = now.getDay();
                const startOfWeek = new Date(now);
                startOfWeek.setDate(now.getDate() - dayOfWeek);
                startOfWeek.setHours(0, 0, 0, 0);

                result.startDate = startOfWeek.toISOString();
                result.endDate = now.toISOString();
                break;

            case 'month':
                // Start of current month
                result.startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
                result.endDate = now.toISOString();
                break;

            case 'year':
                // Start of current year
                result.startDate = new Date(now.getFullYear(), 0, 1).toISOString();
                result.endDate = now.toISOString();
                break;
        }

        return result;
    }

    // Initialize the dashboard
    init();
});
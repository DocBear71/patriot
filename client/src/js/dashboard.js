// dashboard.js handles information for the admin dashboard.
// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function () {
    // Sidebar navigation
    const menuItems = document.querySelectorAll('.menu-item');
    const panels = document.querySelectorAll('.panel');

    menuItems.forEach(item => {
        item.addEventListener('click', function () {
            // Deactivate all menu items and panels
            menuItems.forEach(menuItem => menuItem.classList.remove('active'));
            panels.forEach(panel => panel.classList.remove('active'));

            // Activate clicked menu item and corresponding panel
            this.classList.add('active');
            const section = this.getAttribute('data-section');
            document.getElementById(`${section}-panel`)?.classList.add('active');

            // Update header title
            document.querySelector('.header h1').textContent = this.querySelector('span:last-child').textContent;
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

    // Add User button
    document.getElementById('add-user-btn')?.addEventListener('click', function () {
        document.querySelector('[data-section="users"]').click();
        document.querySelector('[data-tab="add-user"]').click();
    });

    // Cancel User button
    document.getElementById('cancel-user-btn')?.addEventListener('click', function () {
        document.querySelector('[data-tab="users-list"]').click();
    });

    // Add Business button
    document.getElementById('add-business-btn')?.addEventListener('click', function () {
        document.querySelector('[data-section="businesses"]').click();
        document.querySelector('[data-tab="add-business"]').click();
    });

    // Cancel Business button
    document.getElementById('cancel-business-btn')?.addEventListener('click', function () {
        document.querySelector('[data-tab="businesses-list"]').click();
    });

    // Add Incentive button
    document.getElementById('add-incentive-btn')?.addEventListener('click', function () {
        document.querySelector('[data-section="incentives"]').click();
        document.querySelector('[data-tab="add-incentive"]').click();
    });

    // Cancel Incentive button
    document.getElementById('cancel-incentive-btn')?.addEventListener('click', function () {
        document.querySelector('[data-tab="incentives-list"]').click();
    });

    // Form submissions (placeholder functionality)
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', function (e) {
            e.preventDefault();

            // Collect form data
            const formData = new FormData(this);
            const data = {};
            for (const [key, value] of formData.entries()) {
                data[key] = value;
            }

            // In a real application, you would send this data to your backend API
            console.log('Form submitted with data:', data);

            // Show success message (in a real app, this would happen after successful API response)
            alert('Successfully saved!');

            // Reset form
            this.reset();

            // Return to list view if applicable
            if (this.id === 'user-form') {
                document.querySelector('[data-tab="users-list"]').click();
            } else if (this.id === 'business-form') {
                document.querySelector('[data-tab="businesses-list"]').click();
            } else if (this.id === 'incentive-form') {
                document.querySelector('[data-tab="incentives-list"]').click();
            }
        });
    });

    // Edit buttons (placeholder functionality)
    const editButtons = document.querySelectorAll('.btn-edit');
    editButtons.forEach(button => {
        button.addEventListener('click', function () {
            const row = this.closest('tr');
            const id = row.cells[0].textContent;
            const name = row.cells[1].textContent;

            alert(`Edit functionality for "${name}" (ID: ${id}) would be implemented here. In a real application, this would open the edit form with pre-filled data from the API.`);
        });
    });

    // Delete buttons (placeholder functionality)
    const deleteButtons = document.querySelectorAll('.btn-danger');
    deleteButtons.forEach(button => {
        button.addEventListener('click', function () {
            const row = this.closest('tr');
            const id = row.cells[0].textContent;
            const name = row.cells[1].textContent;

            if (confirm(`Are you sure you want to delete "${name}" (ID: ${id})?`)) {
                // In a real application, you would send a delete request to your API
                console.log(`Delete requested for ID: ${id}`);

                // Remove row from table (in a real app, this would happen after successful API response)
                row.remove();

                alert('Item deleted successfully!');
            }
        });
    });

    // Search functionality (placeholder)
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
});

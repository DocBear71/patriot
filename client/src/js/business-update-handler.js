// Enhanced business-update-handler.js with chain business protection

document.addEventListener('DOMContentLoaded', function() {
    console.log("Enhanced Business Update Handler Loaded!");

    // Initialize business info section display
    const businessInfoSection = document.getElementById('business-info-section');
    if (businessInfoSection) {
        businessInfoSection.style.display = 'none';
    }

    const resetButton = document.querySelector('.reset-button, #reset-button, button[type="reset"]');
    if (resetButton) {
        resetButton.addEventListener('click', function() {
            resetBusinessSearchForm();
        });
    }

    // Get form elements for validation
    const form = {
        bname: document.getElementById("bname"),
        address1: document.getElementById("address1"),
        city: document.getElementById("city"),
        state: document.getElementById("state"),
        zip: document.getElementById("zip"),
        phone: document.getElementById("phone"),
        type: document.getElementById("type"),
        status: document.getElementById("status")
    };

    // Get the update form element
    const updateForm = document.getElementById("business-update-form");

    // Add form submission handler
    if (updateForm) {
        updateForm.addEventListener('submit', function(event) {
            // Prevent the form from submitting immediately
            event.preventDefault();

            const selectedBusiness = window.selectedBusinessData || {};
            if (selectedBusiness.is_chain) {
                // Check if user is admin
                const isAdmin = checkIfUserIsAdmin();
                if (!isAdmin) {
                    showMessage('error', "Chain businesses can only be modified by administrators.");
                    return; // Prevent form submission
                }
            }

            // Validate all fields
            const invalidFields = [];

            if (!isNotEmpty(form.bname.value)) invalidFields.push("Business Name");
            if (!isNotEmpty(form.address1.value)) invalidFields.push("Address Line 1");
            if (!isNotEmpty(form.city.value)) invalidFields.push("City");
            if (!isNotEmpty(form.state.value)) invalidFields.push("State");
            if (!isValidZip(form.zip.value)) invalidFields.push("Zip Code (format: 12345 or 12345-6789)");
            if (!isValidPhone(form.phone.value)) invalidFields.push("Phone Number (format: 123-456-7890)");
            if (!isNotEmpty(form.type.value)) invalidFields.push("Business Type");
            if (!isNotEmpty(form.status.value)) invalidFields.push("Status");

            console.log("Invalid fields:", invalidFields);

            // If there are invalid fields, show an alert
            if (invalidFields.length > 0) {
                showMessage('error', "Please complete the following required fields: " + invalidFields.join(", "));
            } else {
                // Get the business ID
                const businessId = document.getElementById("selected-business-id").value;
                if (!businessId) {
                    showMessage('error', "Business ID is missing. Please select a business first.");
                    return;
                }

                // Get the selected business data
                const selectedBusiness = window.selectedBusinessData || {};

                const formData = {
                    businessId: businessId,
                    bname: form.bname.value,
                    address1: form.address1.value,
                    address2: document.getElementById("address2").value || '',
                    city: form.city.value,
                    state: form.state.value,
                    zip: form.zip.value,
                    phone: form.phone.value,
                    type: form.type.value,
                    status: form.status.value
                };

                // Add location data if available
                if (selectedBusiness.location && selectedBusiness.location.coordinates) {
                    formData.lng = selectedBusiness.location.coordinates[0];
                    formData.lat = selectedBusiness.location.coordinates[1];
                }
                // Otherwise, let the server geocode the address

                console.log("Form data to submit:", formData);

                // Submit the data to update the business
                updateBusiness(formData);
            }
        });
    } else {
        console.warn("Business update form not found in the DOM");
    }

    // Define the selectBusinessForUpdate function in the global scope for business-search.js
    window.selectBusinessForUpdate = function(businessData) {
        console.log("selectBusinessForUpdate called with: ", businessData);

        // Store the selected business data for later use
        window.selectedBusinessData = businessData;

        // IMPROVED: Better handling for chain businesses
        if (businessData.is_chain) {
            // Check if user is admin
            const isAdmin = checkIfUserIsAdmin();

            if (!isAdmin) {
                // For non-admins, show a message and don't proceed with form display
                showMessage('error', "Chain businesses can only be modified by administrators. Please select a regular business location instead.");

                // Don't display the business info section for non-admins selecting a chain
                return;
            }
        }

        // Show the business info section
        if (businessInfoSection) {
            businessInfoSection.style.display = 'block';
        }

        // Populate the hidden field with the business ID
        const businessIdField = document.getElementById('selected-business-id');
        console.log("Business ID field exists: ", !!businessIdField);
        if (businessIdField) {
            businessIdField.value = businessData._id || '';
            console.log("Setting business ID to:", businessData._id);
        }
        console.log("Business ID field value: ", businessIdField.value);

        // Populate the business information fields
        populateField('bname', businessData.bname);
        populateField('address1', businessData.address1);
        populateField('address2', businessData.address2);
        populateField('city', businessData.city);
        populateField('zip', businessData.zip);
        populateField('phone', businessData.phone);

        // Special handling for select fields
        populateSelectField('state', businessData.state);
        populateSelectField('type', businessData.type);
        populateSelectField('status', businessData.status || 'active');

        // Scroll to the form
        businessInfoSection.scrollIntoView({ behavior: 'smooth' });
    };

    // Function to update a business in the database
    async function updateBusiness(formData) {
        try {
            const selectedBusiness = window.selectedBusinessData || {};
            if (selectedBusiness.is_chain) {
                const isAdmin = checkIfUserIsAdmin();
                if (!isAdmin) {
                    showMessage('error', "Chain businesses can only be modified by administrators.");
                    return; // Stop the update
                }
            }

            // Get user information from session
            const sessionData = localStorage.getItem('patriotThanksSession');
            if (sessionData) {
                const session = JSON.parse(sessionData);
                if (session && session.user && session.user._id) {
                    formData.updated_by = session.user._id;
                }
            }

            // Show loading state
            const submitButton = document.getElementById('update-submit');
            const originalText = submitButton.value;
            submitButton.value = 'Updating...';
            submitButton.disabled = true;

            // Determine the base URL, local or production
            const baseURL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                ? `http://${window.location.host}`
                : window.location.origin;

            // Use the API endpoint with the baseURL
            const apiURL = `${baseURL}/api/business.js?operation=update-business`;
            console.log("Submitting to API at:", apiURL);

            const token = getAuthToken();
            const headers = {
                "Content-Type": "application/json; charset=utf-8",
            };

            // Add authorization header if token exists (for admin features)
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(apiURL, {
                method: "PUT",
                headers: headers,
                body: JSON.stringify(formData),
            });

            console.log("Response status:", response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Error response:", errorText);
                throw new Error(`Failed to update business: ${response.status} ${errorText}`);
            }

            const data = await response.json();
            console.log("Success:", data);

            // Show success message
            showMessage('success', "Business updated successfully!");

            // Reset the form after successful update
            resetFormAfterUpdate();

            // Reset button state
            submitButton.value = originalText;
            submitButton.disabled = false;

        } catch (error) {
            console.error("Error:", error);
            showMessage('error', "Update failed: " + error.message);

            // Reset button state on error too
            const submitButton = document.getElementById('update-submit');
            if (submitButton) {
                submitButton.value = 'Update Business';
                submitButton.disabled = false;
            }
        }
    }

    // IMPROVED: Enhanced function with proper field re-enabling
    function resetBusinessSearchForm() {
        // Clear form values
        const businessNameField = document.getElementById('business-name');
        if (businessNameField) {
            businessNameField.value = '';
            businessNameField.disabled = false;
        }

        const addressField = document.getElementById('address');
        if (addressField) {
            addressField.value = '';
            addressField.disabled = false;
        }

        // Clear the business search results
        const resultsContainer = document.getElementById('business-search-results');
        if (resultsContainer) {
            resultsContainer.innerHTML = '';
        }

        // Re-enable the search button
        const searchButton = document.querySelector('#business-search-form input[type="submit"]');
        if (searchButton) {
            searchButton.disabled = false;
            searchButton.style.cursor = 'pointer';
        }

        // Reset business info section
        const businessInfoSection = document.getElementById('business-info-section');
        if (businessInfoSection) {
            businessInfoSection.style.display = 'none';

            // Remove any view-only message
            const viewOnlyMessage = businessInfoSection.querySelector('.alert.alert-info');
            if (viewOnlyMessage) {
                viewOnlyMessage.remove();
            }
        }

        // Re-enable all form fields
        const formFields = document.querySelectorAll('input, select, textarea');
        formFields.forEach(field => {
            field.disabled = false;
            field.classList.remove('disabled-field');
        });

        // Show the update button
        const updateButton = document.getElementById('update-submit');
        if (updateButton) {
            updateButton.style.display = 'block';
        }

        // Reset the window.selectedBusinessData
        window.selectedBusinessData = null;
    }

    // Function to reset the form after successful update
    function resetFormAfterUpdate() {
        console.log("Resetting business update form to initial state");

        // Reset business info section
        const businessInfoSection = document.getElementById('business-info-section');
        if (businessInfoSection) {
            businessInfoSection.style.display = 'none';
        }

        // Reset form fields
        const formFields = [
            'bname', 'address1', 'address2', 'city', 'zip', 'phone'
        ];

        formFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.value = '';
                field.disabled = false; // IMPROVED: Ensure fields are enabled
                field.classList.remove('disabled-field');
            }
        });

        // Reset select fields
        const stateSelect = document.getElementById('state');
        if (stateSelect) {
            stateSelect.selectedIndex = 0;
            stateSelect.disabled = false; // IMPROVED: Ensure select is enabled
        }

        const typeSelect = document.getElementById('type');
        if (typeSelect) {
            typeSelect.selectedIndex = 0;
            typeSelect.disabled = false; // IMPROVED: Ensure select is enabled
        }

        // Reset hidden field
        const selectedBusinessIdField = document.getElementById('selected-business-id');
        if (selectedBusinessIdField) selectedBusinessIdField.value = '';

        // Reset the business search form
        const businessNameField = document.getElementById('business-name');
        if (businessNameField) {
            businessNameField.value = '';
            businessNameField.disabled = false; // IMPROVED: Ensure field is enabled
        }

        const addressField = document.getElementById('address');
        if (addressField) {
            addressField.value = '';
            addressField.disabled = false; // IMPROVED: Ensure field is enabled
        }

        // Clear the business search results
        const resultsContainer = document.getElementById('business-search-results');
        if (resultsContainer) {
            resultsContainer.innerHTML = '';
        }

        // Re-enable the search button
        const searchButton = document.querySelector('#business-search-form input[type="submit"]');
        if (searchButton) {
            searchButton.disabled = false;
            searchButton.style.cursor = 'pointer';
        }

        // Reset the window.selectedBusinessData
        window.selectedBusinessData = null;

        // Scroll to the top of the page
        window.scrollTo(0, 0);

        console.log("Business form reset completed");
    }

    // Helper function to get auth token if available
    function getAuthToken() {
        try {
            const sessionData = localStorage.getItem('patriotThanksSession');
            if (!sessionData) {
                return null;
            }

            const session = JSON.parse(sessionData);
            return session.token || null;
        } catch (error) {
            console.error('Error retrieving auth token:', error);
            return null;
        }
    }

    // Helper function to safely populate form fields
    function populateField(fieldId, value) {
        const field = document.getElementById(fieldId);
        if (field) {
            field.value = value || '';
            console.log(`Populated ${fieldId} with:`, value);
        } else {
            console.warn(`Field ${fieldId} not found.`);
        }
    }

    // Helper function to safely populate select fields
    function populateSelectField(fieldId, value) {
        const field = document.getElementById(fieldId);
        if (!field) {
            console.warn(`Field ${fieldId} not found.`);
            return;
        }

        // Try for a direct match first
        for (let i = 0; i < field.options.length; i++) {
            if (field.options[i].value.toLowerCase() === (value || '').toLowerCase()) {
                field.selectedIndex = i;
                console.log(`Selected ${value} in ${fieldId}`);
                return;
            }
        }

        // If no match is found, set to default (first option)
        console.warn(`Could not find a matching option for ${value} in ${fieldId}`);
    }

    // Function to show status messages
    function showMessage(type, message) {
        const messageContainer = document.getElementById('status-message');
        if (messageContainer) {
            messageContainer.innerHTML = message;
            messageContainer.className = 'alert';

            if (type === 'error') {
                messageContainer.classList.add('alert-danger');
            } else if (type === 'success') {
                messageContainer.classList.add('alert-success');
            }

            messageContainer.style.display = 'block';

            // Scroll to message
            messageContainer.scrollIntoView({ behavior: 'smooth' });

            // Auto-hide after 5 seconds
            setTimeout(() => {
                messageContainer.style.display = 'none';
            }, 5000);
        } else {
            // Fallback to alert if container not found
            if (type === 'error') {
                alert(message);
            } else {
                alert(message);
            }
        }
    }

    // Validation functions
    function isNotEmpty(value) {
        return value.trim() !== '';
    }

    function isValidZip(value) {
        const zipPattern = /^\d{5}(-\d{4})?$/;
        return zipPattern.test(value);
    }

    function isValidPhone(value) {
        const phonePattern = /^\d{3}-\d{3}-\d{4}$/;
        return phonePattern.test(value);
    }

    // Apply validation styling to a field
    function validateField(field, validationFn) {
        if (!field) return;

        console.log(`Validating ${field.id} with value: ${field.value}`);

        if (validationFn(field.value)) {
            field.classList.remove('invalid-field');
            field.classList.add('valid-field');
            field.setAttribute('data-valid', 'true');
            console.log(`${field.id} is VALID`);
        } else {
            field.classList.remove('valid-field');
            field.classList.add('invalid-field');
            field.setAttribute('data-valid', 'false');
            console.log(`${field.id} is INVALID`);
        }
    }

    // Add input event listeners for visual feedback
    if (form.bname) form.bname.addEventListener('input', function() { validateField(this, isNotEmpty); });
    if (form.address1) form.address1.addEventListener('input', function() { validateField(this, isNotEmpty); });
    if (form.city) form.city.addEventListener('input', function() { validateField(this, isNotEmpty); });
    if (form.state) form.state.addEventListener('change', function() { validateField(this, isNotEmpty); });
    if (form.zip) form.zip.addEventListener('input', function() { validateField(this, isValidZip); });
    if (form.phone) form.phone.addEventListener('input', function() { validateField(this, isValidPhone); });
    if (form.type) form.type.addEventListener('change', function() { validateField(this, isNotEmpty); });
    if (form.status) form.status.addEventListener('change', function() { validateField(this, isNotEmpty); });

    // IMPROVED: Properly set up the business selection handler for the update page
    // Override the handler in business-search.js
    window.handleBusinessSelection = function(selectedBusiness) {
        // Call our selectBusinessForUpdate function directly
        if (typeof window.selectBusinessForUpdate === 'function') {
            window.selectBusinessForUpdate(selectedBusiness);
        } else {
            console.error("selectBusinessForUpdate function not found");
        }
    };
});

/**
 * Check if the current user is an admin
 * @returns {boolean} True if user is admin
 */
function checkIfUserIsAdmin() {
    try {
        // Get session data from localStorage
        const sessionData = localStorage.getItem('patriotThanksSession');
        if (!sessionData) return false;

        const session = JSON.parse(sessionData);

        // Check if user has admin privileges
        return (session.user && (session.user.isAdmin === true || session.user.level === 'Admin'));
    } catch (error) {
        console.error("Error checking admin status:", error);
        return false;
    }
}
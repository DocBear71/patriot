document.addEventListener('DOMContentLoaded', function() {
    console.log("Form validator loaded!");

    /**
     * Redirects to the search page after adding a business
     * This should be called in the success callback of your form submission
     */
    function redirectAfterAddingBusiness(businessName) {
        // After successful business addition, redirect to the search page
        // with parameters to indicate a new business was added
        const searchPageUrl = new URL('business-search.html', window.location.origin);

        // Add parameters
        searchPageUrl.searchParams.append('business_added', 'true');
        searchPageUrl.searchParams.append('business_name', businessName);
        searchPageUrl.searchParams.append('ts', new Date().getTime()); // Cache-busting

        // Redirect to the search page
        window.location.href = searchPageUrl.toString();
    }

    // Get form elements
    const form = {
        businessName: document.getElementById("bname"),
        address1: document.getElementById("address1"),
        city: document.getElementById("city"),
        state: document.getElementById("state"),
        zip: document.getElementById("zip"),
        phone: document.getElementById("phone"),
        type: document.getElementById("type"),
    };

    // Get the form element
    const submitBusiness = document.getElementById("business-form");

    // Add form submission handler
    submitBusiness.addEventListener('submit', function(event) {
        // Prevent the form from submitting immediately
        event.preventDefault();

        // Validate all fields
        const invalidFields = [];

        if (!isNotEmpty(form.businessName.value)) invalidFields.push("Business Name");
        if (!isNotEmpty(form.address1.value)) invalidFields.push("Address");
        if (!isNotEmpty(form.city.value)) invalidFields.push("City");
        if (!isNotEmpty(form.state.value)) invalidFields.push("State");
        if (!isValidZip(form.zip.value)) invalidFields.push("Zip Code");
        if (!isValidPhone(form.phone.value)) invalidFields.push("Phone Number");
        if (!isNotEmpty(form.type.value)) invalidFields.push("Type");

        console.log("Invalid fields:", invalidFields);

        // If there are invalid fields, show an alert
        if (invalidFields.length > 0) {
            let message = "Please complete the following required fields:\n";
            message += invalidFields.join("\n");
            alert(message);
        } else {
            // FIXED: Create form data object first
            const formData = {
                bname: form.businessName.value,
                address1: form.address1.value,
                address2: document.getElementById("address2").value || "",
                city: form.city.value,
                state: form.state.value,
                zip: form.zip.value,
                phone: form.phone.value,
                type: form.type.value,
            };

            // FIXED: Handle location data properly
            let hasValidLocation = false;

            // First priority: Check for hidden lat/lng fields (from Google Maps prefill)
            const latField = document.getElementById('hidden_lat');
            const lngField = document.getElementById('hidden_lng');

            if (latField && lngField && latField.value && lngField.value) {
                const lat = parseFloat(latField.value);
                const lng = parseFloat(lngField.value);

                if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
                    formData.lat = lat;  // Send as separate fields
                    formData.lng = lng;  // Let server create location object
                    hasValidLocation = true;
                    console.log("✅ Using coordinates from hidden fields:", lat, lng);
                }
            }

// Second priority: Check for Google Place ID
            if (!hasValidLocation) {
                const placeIdField = document.getElementById('google_place_id');
                if (placeIdField && placeIdField.value) {
                    console.log("📍 Google Place ID found, server will geocode");
                    formData.google_place_id = placeIdField.value;
                    // Don't set location here - let the server geocode it
                }
            }

// Third priority: Let server geocode from address if no coordinates
            if (!hasValidLocation && !formData.google_place_id) {
                console.log("🗺️ No coordinates available. Server will geocode from address.");
                // Don't set location field at all - let server handle geocoding
            }

            // FIXED: Handle chain information if available
            const chainIdField = document.getElementById('chain-id');
            const chainNameField = document.getElementById('chain-name');
            const isChainLocationField = document.getElementById('is-chain-location');

            if (chainIdField && chainIdField.value) {
                formData.chain_id = chainIdField.value;
                console.log("🔗 Adding chain ID:", formData.chain_id);
            }

            if (chainNameField && chainNameField.value) {
                formData.chain_name = chainNameField.value;
                console.log("🏪 Adding chain name:", formData.chain_name);
            }

            if (isChainLocationField && isChainLocationField.checked) {
                formData.is_chain_location = true;
                console.log("⛓️ Marked as chain location");
            }

            console.log("📋 Final form data to submit:", formData);

            // Submit the data to MongoDB
            submitToMongoDB(formData);
        }
    });

    async function submitToMongoDB(formData) {
        try {
            // Get the session data from localStorage
            const sessionData = localStorage.getItem('patriotThanksSession');
            console.log("🔐 Session data from localStorage:", sessionData ? "Found" : "Not found");

            if (sessionData) {
                try {
                    const session = JSON.parse(sessionData);
                    console.log("👤 Parsed session data for user:", session?.user?.email);

                    // Check if user object exists with _id property
                    if (session && session.user && session.user._id) {
                        formData.created_by = session.user._id;
                        console.log("✅ Setting created_by to:", session.user._id);
                    } else {
                        console.log("⚠️ User ID not found in expected location");
                        formData.created_by = null;
                    }
                } catch (parseError) {
                    console.error("❌ Error parsing session data:", parseError);
                    formData.created_by = null;
                }
            } else {
                console.log("ℹ️ No session data found in localStorage");
                formData.created_by = null;
            }

            // FIXED: Determine the base URL properly
            const baseURL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                ? `http://${window.location.host}`  // Use HTTP for localhost
                : window.location.origin;

            // Use the API endpoint with the baseURL
            const apiURL = `${baseURL}/api/business.js?operation=register`;
            console.log("🌐 Submitting to API at:", apiURL);
            console.log("📤 Request payload:", JSON.stringify(formData, null, 2));

            const response = await fetch(apiURL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json; charset=utf-8",
                },
                body: JSON.stringify(formData),
            });

            console.log("📥 Response status:", response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error("❌ Error response:", errorText);

                // Try to parse the error message for better user feedback
                let errorMessage = `Failed to submit data: ${response.status}`;
                try {
                    const errorObj = JSON.parse(errorText);
                    if (errorObj.message) {
                        errorMessage = errorObj.message;
                    }
                } catch (e) {
                    // Use the raw error text if JSON parsing fails
                    errorMessage = errorText;
                }

                throw new Error(errorMessage);
            }

            const data = await response.json();
            console.log("✅ Success:", data);

            // Show success message to user
            alert("✅ Submission successful! The business is now available in our database.");

            // Get the business name for the redirect
            const businessName = formData.bname;

            // ENHANCED: Check if we should return to search page
            const returnToSearch = sessionStorage.getItem('returnToSearch');
            if (returnToSearch) {
                console.log("🔄 Returning to search page as requested");

                // Clean up session storage
                sessionStorage.removeItem('returnToSearch');
                sessionStorage.removeItem('newBusinessData');
                sessionStorage.removeItem('autoChainLinking');

                // Create enhanced return URL with success parameters
                const returnUrl = new URL(returnToSearch);
                returnUrl.searchParams.set('business_added', 'true');
                returnUrl.searchParams.set('business_name', businessName);
                returnUrl.searchParams.set('business_id', data.business_id || data._id || 'unknown');
                returnUrl.searchParams.set('timestamp', new Date().getTime());

                // Redirect back to search
                window.location.href = returnUrl.toString();
            } else {
                // Normal redirect to search page
                redirectAfterAddingBusiness(businessName);
            }

        } catch (error) {
            console.error("❌ Submission error:", error);

            // Enhanced error message for user
            let userMessage = "Registration failed: " + error.message;

            // Provide specific guidance for common errors
            if (error.message.includes('geo keys') || error.message.includes('GeoJSON')) {
                userMessage += "\n\nThis appears to be a location/mapping error. Please try again or contact support.";
            } else if (error.message.includes('duplicate') || error.message.includes('already exists')) {
                userMessage += "\n\nThis business may already exist in our database.";
            }

            alert(userMessage);
        }
    }

    // Helper function for reset form
    function resetForm() {
        const form = document.getElementById('business-form');
        if (form) {
            form.reset();
        }
    }

    // Add input event listeners for visual feedback
    form.businessName.addEventListener('input', function() { validateField(this, isNotEmpty); });
    form.address1.addEventListener('input', function() { validateField(this, isNotEmpty); });
    form.city.addEventListener('input', function() { validateField(this, isNotEmpty); });
    form.state.addEventListener('change', function() { validateField(this, isNotEmpty); });
    form.zip.addEventListener('input', function() { validateField(this, isValidZip); });
    form.phone.addEventListener('input', function() { validateField(this, isValidPhone); });
    form.type.addEventListener('input', function() { validateField(this, isNotEmpty); });

    // Validation functions
    function isNotEmpty(value) {
        return value && value.trim() !== '';
    }

    function isValidZip(value) {
        const zipPattern = /^\d{5}(-\d{4})?$/;
        return zipPattern.test(value.trim());
    }

    function isValidPhone(value) {
        // Remove all non-digit characters
        const digitsOnly = value.replace(/\D/g, '');

        // Check if we have exactly 10 digits
        if (digitsOnly.length !== 10) {
            return false;
        }

        // Format as XXX-XXX-XXXX
        // Update the field with the formatted value
        const phoneField = document.getElementById('phone');
        if (phoneField) {
            phoneField.value = `${digitsOnly.substring(0, 3)}-${digitsOnly.substring(3, 6)}-${digitsOnly.substring(6, 10)}`;
        }

        return true;
    }

    // Apply validation styling to a field
    function validateField(field, validationFn) {
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

    // Validate the entire form (for use with other functions if needed)
    function validateForm() {
        const requiredFields = [
            { element: form.businessName, validator: isNotEmpty },
            { element: form.address1, validator: isNotEmpty },
            { element: form.city, validator: isNotEmpty },
            { element: form.state, validator: isNotEmpty },
            { element: form.zip, validator: isValidZip },
            { element: form.phone, validator: isValidPhone },
            { element: form.type, validator: isNotEmpty },
        ];

        let businessIsValid = true;

        // Validate each field and update its visual state
        requiredFields.forEach(field => {
            if (!field.validator(field.element.value)) {
                businessIsValid = false;
                field.element.classList.remove('valid-field');
                field.element.classList.add('invalid-field');
            } else {
                field.element.classList.remove('invalid-field');
                field.element.classList.add('valid-field');
            }
        });

        return businessIsValid;
    }

    // Run initial validation to set the visual state
    validateForm();

    // Add asterisks to required fields
    function addAsterisksToRequiredFields() {
        // Define the IDs of required fields based on your validation logic
        const requiredFieldIds = [
            "bname", "address1", "city", "state",
            "zip", "phone", "type"
        ];

        // Add asterisks to each required field's label
        requiredFieldIds.forEach(id => {
            const field = document.getElementById(id);
            if (field) {
                const label = document.querySelector(`label[for="${id}"]`);

                if (label && !label.innerHTML.includes('*')) {
                    const asterisk = document.createElement('span');
                    asterisk.className = 'required-indicator';
                    asterisk.textContent = '*';
                    asterisk.style.color = 'red';
                    label.appendChild(asterisk);
                }
            }
        });

        // Add explanation at the top of the form
        const form = document.getElementById("business-form");
        if (form) {
            // Check if explanation already exists
            if (!form.querySelector('.form-explanation')) {
                const explanation = document.createElement('div');
                explanation.className = 'form-explanation';
                explanation.innerHTML = '<p style="color: #666; font-style: italic;">Fields marked with an asterisk (*) are required.</p>';
                form.insertBefore(explanation, form.firstChild);
            }
        }
    }

    // Call the function to add asterisks
    addAsterisksToRequiredFields();

    // ENHANCED: Debug function to check form state
    window.debugFormData = function() {
        const latField = document.getElementById('hidden_lat');
        const lngField = document.getElementById('hidden_lng');
        const placeIdField = document.getElementById('google_place_id');
        const chainIdField = document.getElementById('chain-id');

        console.log("🔍 FORM DEBUG:");
        console.log("  - Hidden Lat:", latField ? latField.value : "Not found");
        console.log("  - Hidden Lng:", lngField ? lngField.value : "Not found");
        console.log("  - Place ID:", placeIdField ? placeIdField.value : "Not found");
        console.log("  - Chain ID:", chainIdField ? chainIdField.value : "Not found");
        console.log("  - Business Name:", form.businessName.value);
        console.log("  - Address:", `${form.address1.value}, ${form.city.value}, ${form.state.value} ${form.zip.value}`);
    };

    console.log("📋 Enhanced business validator loaded!");
});
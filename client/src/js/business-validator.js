document.addEventListener('DOMContentLoaded', function() {
    console.log("Form validator loaded!");

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
            const formData = {
                bname: form.businessName.value,
                address1: form.address1.value,
                address2: document.getElementById("address2").value,
                city: form.city.value,
                state: form.state.value,
                zip: form.zip.value,
                phone: form.phone.value,
                type: form.type.value,
            };
            // Add location data if hidden fields exist
            const latField = document.getElementById('hidden_lat');
            const lngField = document.getElementById('hidden_lng');

            if (latField && lngField) {
                const lat = parseFloat(latField.value);
                const lng = parseFloat(lngField.value);

                if (!isNaN(lat) && !isNaN(lng)) {
                    formData.location = {
                        type: 'Point',
                        coordinates: [lng, lat] // GeoJSON format uses [longitude, latitude]
                    };
                    console.log("Added location data:", formData.location);
                }
            }

            console.log("Form data to submit:", formData);

            console.log("Form data to submit:", formData);

            // Submit the data to MongoDB
            submitToMongoDB(formData);
        }
    });


    async function submitToMongoDB(formData) {
        try {
            // Get the session data from localStorage
            const sessionData = localStorage.getItem('patriotThanksSession');
            console.log("Session data from localStorage:", sessionData);

            if (sessionData) {
                try {
                    const session = JSON.parse(sessionData);
                    console.log("Parsed session data:", session);

                    // Check if user object exists with _id property
                    if (session && session.user && session.user._id) {
                        formData.created_by = session.user._id;
                        console.log("Setting created_by to:", session.user._id);
                    } else {
                        console.log("User ID not found in expected location");
                        formData.created_by = null;
                    }
                } catch (parseError) {
                    console.error("Error parsing session data:", parseError);
                    formData.created_by = null;
                }
            } else {
                console.log("No session data found in localStorage");
                formData.created_by = null;
            }


            // determine the base URL, local or production
            const baseURL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                ? `https://${window.location.host}`
                : window.location.origin;


            // use the api endpoint with the baseURL
            const apiURL = `${baseURL}/api/business.js?operation=register`;
            console.log("Submitting to API at:", apiURL);

            const response = await fetch(apiURL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json; charset=utf-8",
                },
                body: JSON.stringify(formData),
            });

            console.log("Response status:", response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Error response:", errorText);
                throw new Error(`Failed to submit data to MongoDB: ${response.status} ${errorText}`);
            }

            const data = await response.json();
            console.log("Success:", data);

            // Show success message to user
            alert("Submission successful! The business is now available in our database.");

            // Optional: Clear form or redirect
            resetForm();

        } catch (error) {
            console.error("Error:", error);
            alert("Registration failed: " + error.message);
        }
    }

    // helper function for reset form
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
        return value.trim() !== '';
    }

    function isValidZip(value) {
        const zipPattern = /^\d{5}(-\d{4})?$/;
        return zipPattern.test(value);
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
        document.getElementById('phone').value = `${digitsOnly.substring(0, 3)}-${digitsOnly.substring(3, 6)}-${digitsOnly.substring(6, 10)}`;

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
                    asterisk.style.color = 'red'; // Match your existing color scheme
                    label.appendChild(asterisk);
                }
            }
        });

        // Add explanation at the top of the form
        const form = document.getElementById("business-form");
        if (form) {
            const explanation = document.createElement('div');
            explanation.className = 'form-explanation';
            explanation.innerHTML = '<p>Fields marked with an asterisk (*) are required.</p>';
            form.insertBefore(explanation, form.firstChild);
        }
    }

// Call the function to add asterisks
    addAsterisksToRequiredFields();
});
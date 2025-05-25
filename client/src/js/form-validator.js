// fixed-form-validator.js -- Updated to properly handle terms acceptance during registration

document.addEventListener('DOMContentLoaded', function() {
    console.log("Fixed Form validator loaded!");

    // Get form elements
    const form = {
        firstName: document.getElementById("fname"),
        lastName: document.getElementById("lname"),
        address1: document.getElementById("address1"),
        city: document.getElementById("city"),
        state: document.getElementById("state"),
        zip: document.getElementById("zip"),
        email: document.getElementById("email"),
        status: document.getElementById("status"),
        level: document.getElementById("membership-level"),
        termsCheckbox: document.getElementById("terms-checkbox")
    };

    const registerForm = document.getElementById("register-form");

    // Add form submission handler
    registerForm.addEventListener('submit', function(event) {
        event.preventDefault();

        // Validate all fields
        const invalidFields = [];

        if (!isNotEmpty(form.firstName.value)) invalidFields.push("First Name");
        if (!isNotEmpty(form.lastName.value)) invalidFields.push("Last Name");
        if (!isNotEmpty(form.address1.value)) invalidFields.push("Address");
        if (!isNotEmpty(form.city.value)) invalidFields.push("City");
        if (!isNotEmpty(form.state.value)) invalidFields.push("State");
        if (!isValidZip(form.zip.value)) invalidFields.push("Zip Code");
        if (!isValidEmail(form.email.value)) invalidFields.push("Email");
        if (!isNotEmpty(form.status.value)) invalidFields.push("Status");
        if (!isNotEmpty(form.level.value)) invalidFields.push("Membership Level");

        if (!form.termsCheckbox.checked) {
            invalidFields.push("Terms and Conditions agreement");
            document.getElementById("terms-error").style.display = "block";
        } else {
            document.getElementById("terms-error").style.display = "none";
        }

        if (!validateTerms()) {
            invalidFields.push("Terms and Conditions acceptance");
        }

        // Check password validation
        const passwordMatch = document.getElementById("match");
        if (passwordMatch && !passwordMatch.classList.contains("valid")) {
            invalidFields.push("Password (must meet all requirements and match)");
        }

        // Check admin verification if needed
        if (form.level.value === "Admin" && window.adminVerified !== true) {
            invalidFields.push("Admin access code verification");
            alert("Admin access must be verified with a valid code before registration");
            return;
        }

        // If there are invalid fields, show an alert
        if (invalidFields.length > 0) {
            let message = "Please complete the following required fields:\n";
            message += invalidFields.join("\n");
            alert(message);
        } else {
            // FIXED: Properly set terms acceptance data during registration
            const currentTermsVersion = "May 14, 2025"; // This should match your current terms version

            const formData = {
                fname: form.firstName.value,
                lname: form.lastName.value,
                address1: form.address1.value,
                address2: document.getElementById("address2").value,
                city: form.city.value,
                state: form.state.value,
                zip: form.zip.value,
                status: form.status.value,
                level: form.level.value,
                email: form.email.value.toLowerCase(),
                password: document.getElementById("psw").value,
                psw_repeat: document.getElementById("psw_repeat").value,

                // CRITICAL FIX: Properly set terms acceptance for new registrations
                termsAccepted: form.termsCheckbox ? form.termsCheckbox.checked : false,
                termsAcceptedDate: new Date().toISOString(),
                termsVersion: currentTermsVersion  // This ensures new users start with current version
            };

            console.log("Form data to submit:", formData);
            console.log("Terms acceptance set to:", formData.termsAccepted);
            console.log("Terms version set to:", formData.termsVersion);

            // Submit the data to MongoDB
            submitToMongoDB(formData);
        }
    });

    function modifyMembershipOptions() {
        const membershipSelect = document.getElementById('membership-level');

        if (membershipSelect) {
            const options = membershipSelect.querySelectorAll('option:not([value="Free"]):not([value="Admin"]):not([value="Test"])');

            options.forEach(option => {
                option.textContent = option.textContent + ' (Coming Soon)';
                option.disabled = true;
                option.title = 'This membership level will be available soon';
            });

            const membershipField = membershipSelect.parentElement;
            const premiumNote = document.createElement('div');
            premiumNote.className = 'premium-note';
            premiumNote.innerHTML = '<p><small>Premium access levels will be available soon. You can support the site through <a href="../donate.html">donations</a>.</small></p>';
            membershipField.appendChild(premiumNote);
        }
    }

    function validateTerms() {
        if (form.termsCheckbox) {
            if (form.termsCheckbox.checked) {
                form.termsCheckbox.classList.remove('invalid-field');
                form.termsCheckbox.classList.add('valid-field');
                document.getElementById("terms-error").style.display = "none";
                return true;
            } else {
                form.termsCheckbox.classList.remove('valid-field');
                form.termsCheckbox.classList.add('invalid-field');
                document.getElementById("terms-error").style.display = "block";
                return false;
            }
        }
        return true;
    }

    async function submitToMongoDB(formData) {
        try {
            const baseURL = window.location.origin;
            const apiUrl = `${baseURL}/api/auth.js?operation=register`;
            console.log("Submitting to API at:", apiUrl);

            const res = await fetch(apiUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json; charset=utf-8",
                },
                body: JSON.stringify(formData),
            });

            console.log("Response status:", res.status);

            if (!res.ok) {
                const errorText = await res.text();
                console.error("Error response:", errorText);
                throw new Error(`Failed to submit data to MongoDB: ${res.status} ${errorText}`);
            }

            const data = await res.json();
            console.log("Success:", data);

            // Show success message to user
            alert("Registration successful! You can now log in.");

            // IMPORTANT: Clear any existing session data to prevent conflicts
            localStorage.removeItem('patriotThanksSession');
            localStorage.removeItem('isLoggedIn');

            // Redirect to login page or home page
            window.location.href = '../index.html';

        } catch (error) {
            console.error("Error:", error);
            alert("Registration failed: " + error.message);
        }
    }

    // Add input event listeners for visual feedback
    form.firstName.addEventListener('input', function() { validateField(this, isNotEmpty); });
    form.lastName.addEventListener('input', function() { validateField(this, isNotEmpty); });
    form.address1.addEventListener('input', function() { validateField(this, isNotEmpty); });
    form.city.addEventListener('input', function() { validateField(this, isNotEmpty); });
    form.state.addEventListener('change', function() { validateField(this, isNotEmpty); });
    form.zip.addEventListener('input', function() { validateField(this, isValidZip); });
    form.email.addEventListener('input', function() { validateField(this, isValidEmail); });
    form.status.addEventListener('change', function() { validateField(this, isNotEmpty); });
    form.level.addEventListener('change', function() {
        validateField(this, isNotEmpty);

        // If changing back from admin level, clear the admin verification flag
        if (this.value !== "Admin") {
            window.adminVerified = false;
        }
    });

    // Validation functions
    function isNotEmpty(value) {
        return value.trim() !== '';
    }

    function isValidZip(value) {
        const zipPattern = /^\d{5}(-\d{4})?$/;
        return zipPattern.test(value);
    }

    function isValidEmail(value) {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailPattern.test(value);
    }

    // Apply validation styling to a field
    function validateField(field, validationFn) {
        if (validationFn(field.value)) {
            field.classList.remove('invalid-field');
            field.classList.add('valid-field');
            field.setAttribute('data-valid', 'true');
        } else {
            field.classList.remove('valid-field');
            field.classList.add('invalid-field');
            field.setAttribute('data-valid', 'false');
        }
    }

    // Validate the entire form
    function validateForm() {
        const requiredFields = [
            { element: form.firstName, validator: isNotEmpty },
            { element: form.lastName, validator: isNotEmpty },
            { element: form.address1, validator: isNotEmpty },
            { element: form.city, validator: isNotEmpty },
            { element: form.state, validator: isNotEmpty },
            { element: form.zip, validator: isValidZip },
            { element: form.email, validator: isValidEmail },
            { element: form.status, validator: isNotEmpty },
            { element: form.level, validator: isNotEmpty },
        ];

        let formIsValid = true;

        requiredFields.forEach(field => {
            if (!field.validator(field.element.value)) {
                formIsValid = false;
                field.element.classList.remove('valid-field');
                field.element.classList.add('invalid-field');
            } else {
                field.element.classList.remove('invalid-field');
                field.element.classList.add('valid-field');
            }
        });

        return formIsValid;
    }

    // Run initial validation to set the visual state
    validateForm();

    function addAsterisksToRequiredFields() {
        const requiredFieldIds = [
            "fname", "lname", "address1", "city", "state",
            "zip", "email", "status", "membership-level"
        ];

        requiredFieldIds.forEach(id => {
            const field = document.getElementById(id);
            if (field) {
                const label = document.querySelector(`label[for="${id}"]`);

                if (label && !label.innerHTML.includes('*')) {
                    const asterisk = document.createElement('span');
                    asterisk.className = 'required-indicator';
                    asterisk.textContent = ' *';
                    asterisk.style.color = 'red';
                    label.appendChild(asterisk);
                }
            }
        });

        const form = document.getElementById("register-form");
        if (form) {
            const explanation = document.createElement('div');
            explanation.className = 'form-explanation';
            explanation.innerHTML = '<p>Fields marked with an asterisk (*) are required.</p>';
            form.insertBefore(explanation, form.firstChild);
        }
    }

    // Call the function to add asterisks
    addAsterisksToRequiredFields();
    modifyMembershipOptions();
});
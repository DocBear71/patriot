// form-validator.js -- handles the validation of the registration form.

document.addEventListener('DOMContentLoaded', function() {
    console.log("Form validator loaded!");

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
        level: document.getElementById("membership-level")
    };

    // Get the form element
    const registerForm = document.getElementById("register-form");

    // Add form submission handler
    registerForm.addEventListener('submit', function(event) {
        // Prevent the form from submitting immediately
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

        // Check password validation
        const passwordMatch = document.getElementById("match");
        if (passwordMatch && !passwordMatch.classList.contains("valid")) {
            invalidFields.push("Password (must meet all requirements and match)");
        }

        // check if admin verification is required but not completed
        if (form.level.value === "Admin" && !window.adminVerified) {
            console.log("Admin verification failed, window.adminVerified = ", window.adminVerified);
            invalidFields.push("Admin access code verification");
            alert("Admin access must be verified with a valid code before registration");
            return;
        } else if (form.level.value === "Admin") {
            console.log("Admin verification passed, proceeding with registration");
        }


        console.log("Invalid fields:", invalidFields);

        // If there are invalid fields, show an alert
        if (invalidFields.length > 0) {
            let message = "Please complete the following required fields:\n";
            message += invalidFields.join("\n");
            alert(message);
        } else {
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
                psw_repeat: document.getElementById("psw_repeat").value
            };

            console.log("Form data to submit:", formData);

            // Submit the data to MongoDB
            submitToMongoDB(formData);
        }
    });


    async function submitToMongoDB(formData) {
        try {
            // Use the absolute URL to your Vercel deployment with the new endpoint
            const apiUrl = 'https://patriotthanks.vercel.app/api/auth.js?operation=register';
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
    form.status.addEventListener('input', function() { validateField(this, isNotEmpty); });
    form.level.addEventListener('input', function() {
        validateField(this, isNotEmpty); });
    // if changing back from admin level, clear the admin verification flag
    if (this.value !== "Admin" && typeof window.isAdminVerified === 'function') {
        window.isAdminVerified = function() { return false; };
    }

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

        // Validate each field and update its visual state
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
});
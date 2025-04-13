import path from "node:path";
const cors = require("cors");

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
        status: document.getElementById("status")
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

        // Check password validation
        const passwordMatch = document.getElementById("match");
        if (passwordMatch && !passwordMatch.classList.contains("valid")) {
            invalidFields.push("Password (must meet all requirements and match)");
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
                email: form.email.value,
                password: document.getElementById("psw").value,
                psw_repeat: document.getElementById("psw_repeat").value
            };

            console.log("Form data to submit:", formData);

            // Submit the data to MongoDB
            submitToMongoDB(formData);
        }
    });
    const apiIndex = path.resolve(path.join(__dirname, "api", "index.js"))
    // Function to submit data to MongoDB
    function submitToMongoDB(data) {
        console.log("Submitting data to API:", data);

        fetch(apiIndex, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
            .then(response => {
                console.log("Response status:", response.status);

                return response.text().then(text => {
                    console.log("Raw API response:", text);

                    try {
                        if (text) {
                            const json = JSON.parse(text);
                            if (!response.ok) {
                                throw new Error(json.message || 'Registration failed');
                            }
                            return json;
                        } else {
                            throw new Error("Empty response received");
                        }
                    } catch (e) {
                        console.error("Response parse error:", e);
                        throw new Error("Server returned an invalid response");
                    }
                });
            })
            .then(data => {
                console.log('Success:', data);
                alert("Registration successful!");
                window.location.href = "index.html";
            })
            .catch(error => {
                console.error('Error:', error);
                alert("Registration error: " + error.message);
            });
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
            { element: form.status, validator: isNotEmpty }
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
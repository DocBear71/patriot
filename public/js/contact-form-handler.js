// contact-form-handler.js - Handles validation and submission of the contact form

document.addEventListener('DOMContentLoaded', function() {
    console.log("Contact form handler loaded!");

    // Get form element
    const contactForm = document.querySelector('form[action="./api/contact"]');

    // Get form fields
    const form = {
        firstName: document.getElementById("fname"),
        lastName: document.getElementById("lname"),
        email: document.getElementById("email"),
        subject: document.getElementById("subject")
    };

    // Add form submission handler
    if (contactForm) {
        contactForm.addEventListener('submit', function(event) {
            // Prevent the form from submitting immediately
            event.preventDefault();

            // Validate the form
            if (validateForm()) {
                // Form is valid, prepare data for submission
                const formData = {
                    firstName: form.firstName.value,
                    lastName: form.lastName.value,
                    email: form.email.value,
                    subject: form.subject.value
                };

                console.log("Form data to submit:", formData);

                // Submit the form data
                submitForm(formData, this);
            }
        });
    } else {
        console.warn("Contact form not found in the DOM");
    }

    // Add input event listeners for real-time validation feedback
    if (form.firstName) {
        form.firstName.addEventListener('input', function() { validateField(this, isNotEmpty); });
    }

    if (form.lastName) {
        form.lastName.addEventListener('input', function() { validateField(this, isNotEmpty); });
    }

    if (form.email) {
        form.email.addEventListener('input', function() { validateField(this, isValidEmail); });
    }

    if (form.subject) {
        form.subject.addEventListener('input', function() { validateField(this, isNotEmpty); });
    }

    // Function to validate the entire form
    function validateForm() {
        const requiredFields = [
            { element: form.firstName, validator: isNotEmpty, message: "First name is required" },
            { element: form.lastName, validator: isNotEmpty, message: "Last name is required" },
            { element: form.email, validator: isValidEmail, message: "Valid email is required" },
            { element: form.subject, validator: isNotEmpty, message: "Message is required" }
        ];

        let isValid = true;

        // Validate each field and update its visual state
        requiredFields.forEach(field => {
            if (!field.validator(field.element.value)) {
                isValid = false;
                field.element.classList.remove('valid-field');
                field.element.classList.add('invalid-field');

                // Check if an error message already exists
                let errorSpan = field.element.nextElementSibling;
                if (!errorSpan || !errorSpan.classList.contains('error-message')) {
                    // Create error message element if it doesn't exist
                    errorSpan = document.createElement('span');
                    errorSpan.className = 'error-message';
                    field.element.parentNode.insertBefore(errorSpan, field.element.nextSibling);
                }
                errorSpan.textContent = field.message;
            } else {
                field.element.classList.remove('invalid-field');
                field.element.classList.add('valid-field');

                // Remove any existing error message
                const errorSpan = field.element.nextElementSibling;
                if (errorSpan && errorSpan.classList.contains('error-message')) {
                    errorSpan.textContent = '';
                }
            }
        });

        return isValid;
    }

    // Helper validation functions
    function isNotEmpty(value) {
        return value.trim() !== '';
    }

    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Apply validation styling to a field
    function validateField(field, validationFn) {
        console.log(`Validating ${field.id} with value: ${field.value}`);

        if (validationFn(field.value)) {
            field.classList.remove('invalid-field');
            field.classList.add('valid-field');
            field.setAttribute('data-valid', 'true');

            // Remove any existing error message
            const errorSpan = field.nextElementSibling;
            if (errorSpan && errorSpan.classList.contains('error-message')) {
                errorSpan.textContent = '';
            }

            console.log(`${field.id} is VALID`);
        } else {
            field.classList.remove('valid-field');
            field.classList.add('invalid-field');
            field.setAttribute('data-valid', 'false');
            console.log(`${field.id} is INVALID`);
        }
    }

    // Function to submit the form data
    function submitForm(formData, formElement) {
        // Show loading indicator
        const submitButton = formElement.querySelector('input[type="submit"]');
        const originalButtonText = submitButton.value;
        submitButton.value = "Sending...";
        submitButton.disabled = true;

        // Create FormData object for submission
        const data = new FormData(formElement);

        // Use the existing action from the form
        const actionUrl = formElement.getAttribute('action');

        // Submit using fetch API
        fetch(actionUrl, {
            method: 'POST',
            body: data
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Server responded with status: ${response.status}`);
                }
                return response.text();
            })
            .then(result => {
                console.log("Submission result:", result);

                // Show success message
                showMessage("Thank you for your message! We'll respond within 2 business days.", "success");

                // Reset the form
                formElement.reset();

                // Remove validation styling
                Object.values(form).forEach(field => {
                    if (field) {
                        field.classList.remove('valid-field');
                        field.removeAttribute('data-valid');
                    }
                });
            })
            .catch(error => {
                console.error("Error submitting form:", error);

                // Show error message
                showMessage("There was a problem sending your message. Please try again later.", "error");
            })
            .finally(() => {
                // Restore submit button
                submitButton.value = originalButtonText;
                submitButton.disabled = false;
            });
    }

    // Function to display status messages
    function showMessage(message, type) {
        // Check if message container already exists
        let messageContainer = document.getElementById('form-message');

        if (!messageContainer) {
            // Create message container
            messageContainer = document.createElement('div');
            messageContainer.id = 'form-message';

            // Insert after the form
            if (contactForm) {
                contactForm.parentNode.insertBefore(messageContainer, contactForm.nextSibling);
            }
        }

        // Set message content and styling
        messageContainer.textContent = message;
        messageContainer.className = `message ${type}`;

        // Scroll to message
        messageContainer.scrollIntoView({ behavior: 'smooth' });

        // Automatically remove success messages after 5 seconds
        if (type === 'success') {
            setTimeout(() => {
                messageContainer.textContent = '';
                messageContainer.className = '';
            }, 5000);
        }
    }

    // Run initial validation to set the visual state
    validateForm();
});
// contact-form-handler.js - Handles validation and submission of the contact form

document.addEventListener('DOMContentLoaded', function() {
    console.log("Contact form handler loaded!");

    // Get form element
    const contactForm = document.getElementById('contact-form');

    // Add form submission handler
    if (contactForm) {
        contactForm.addEventListener('submit', function(event) {
            // Prevent the form from submitting immediately
            event.preventDefault();

            // Get form fields
            const formData = {
                firstname: document.getElementById("fname").value,
                lastname: document.getElementById("lname").value,
                email: document.getElementById("email").value,
                subject: document.getElementById("subject").value,
                message: document.getElementById("message").value,
            };

            // Show loading state
            const submitButton = contactForm.querySelector('button[type="submit"]') ||
                contactForm.querySelector('input[type="submit"]');
            const originalText = submitButton ? submitButton.innerText || submitButton.value : 'Submit';

            if (submitButton) {
                submitButton.disabled = true;
                if (submitButton.tagName === 'INPUT') {
                    submitButton.value = 'Sending...';
                } else {
                    submitButton.innerText = 'Sending...';
                }
            }

            // Submit the form data
            submitContactForm(formData, submitButton, originalText);
        });
    }

    // Function to submit the contact form
    function submitContactForm(formData, submitButton, originalText) {
        console.log("Submitting contact form:", formData);

        const apiUrl = 'https://patriotthanks.vercel.app/api/contact.js';

        fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=UTF-8',
            },
            body: JSON.stringify(formData)
        })
            .then(response => {
                console.log("Response status:", response.status);
                if (!response.ok) {
                    return response.text().then(text => {
                        throw new Error(`Server responded with status ${response.status}: ${text}`);
                    });
                }
                return response.json();
            })
            .then(data => {
                console.log("Message sent successfully:", data);

                // Store the form data in sessionStorage for the thank you page
                sessionStorage.setItem('contactFormData', JSON.stringify(formData));

                // Redirect to thank you page
                window.location.href = 'thank-you.html';
            })
            .catch(error => {
                console.error("Error sending message:", error);
                alert(`Error sending message: ${error.message}`);
            })
            .finally(() => {
                // Restore the submit button
                if (submitButton) {
                    submitButton.disabled = false;
                    if (submitButton.tagName === 'INPUT') {
                        submitButton.value = originalText;
                    } else {
                        submitButton.innerText = originalText;
                    }
                }
            });
    }
});
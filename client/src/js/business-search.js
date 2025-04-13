document.addEventListener('DOMContentLoaded', function() {
    console.log("Form validator loaded!");

    // Get form elements
    const form = {
        businessName: document.getElementById("business-name"),
        streetAddress: document.getElementById("streetAddress"),
    };

    // Get the form element
    const findBusiness = document.getElementById("business-search-form");

    // Add form submission handler
    findBusiness.addEventListener('submit', function(event) {
        // Prevent the form from submitting immediately
        event.preventDefault();

        // Validate all fields
        const invalidFields = [];

        if (!isNotEmpty(form.businessName.value)) invalidFields.push("Business Name");
        if (!isNotEmpty(form.streetAddress.value)) invalidFields.push("streetAddress");

        console.log("Invalid fields:", invalidFields);

        // If there are invalid fields, show an alert
        if (invalidFields.length > 0) {
            let message = "Please complete the following required fields:\n";
            message += invalidFields.join("\n");
            alert(message);
        } else {
            const formData = {
                businessName: form.businessName.value,
                streetAddress: form.streetAddress.value,
            };

            console.log("Form data to submit:", formData);

            // Submit the data to MongoDB
            retrieveFromMongoDB(formData);
        }
    });


    async function retrieveFromMongoDB(formData) {
        try {
            const queryParams = new URLSearchParams({
                businessName: formData.businessName,
                streetAddress: formData.address
            }).toString();
            // Use the absolute URL to your Vercel deployment with the new endpoint
            const apiUrl = `https://patriotthanks.vercel.app/api/business-search?${queryParams}`;
            console.log("Submitting search to API at:", apiUrl);

            const response = await fetch(apiUrl, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },

            });

            console.log("Response status:", response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Error response:", errorText);
                throw new Error(`Failed to retrieve data from MongoDB: ${response.status} ${errorText}`);
            }

            const data = await response.json();
            console.log("Success:", data);

            // Display results in the table
            displaySearchResults(data.results);

        } catch (error) {
            console.error("Error:", error);
            alert("Retrieval failed: " + error.message);
        }
    }

    function displaySearchResults(businesses) {
        // Get the table body
        const tableBody = document.querySelector('#business_search tbody');

        // Clear existing rows
        tableBody.innerHTML = '';

        if (businesses.length === 0) {
            // Show no results message
            alert("No businesses found matching your search criteria.");
            return;
        }

        // Show the search results table (it has h5 with "hidden" content)
        document.getElementById('search_table').querySelector('h5').style.display = 'none';
        document.getElementById('business_search').style.display = 'block';

        // Add each business to the table
        businesses.forEach(business => {
            const row = document.createElement('tr');

            // Get a placeholder image based on business type
            let imageSrc = './images/placeholder.jpg';
            if (business.type === 'Restaurant' || business.type === 'REST') {
                imageSrc = './images/red_lobster.jpg';
            } else if (business.type === 'RETAIL' || business.type === 'Retail') {
                imageSrc = './images/home_depot.jpg';
            } else if (business.type === 'AUTO') {
                imageSrc = './images/milex.jpg';
            } else if (business.type === 'HARDW') {
                imageSrc = './images/lowes.jpg';
            }

            // Format the address line
            const addressLine = business.address2
                ? `${business.address1}<br>${business.address2}<br>${business.city}, ${business.state} ${business.zip}`
                : `${business.address1}<br>${business.city}, ${business.state} ${business.zip}`;

            row.innerHTML = `
            <th><img src="${imageSrc}" alt="${business.bname}" class="business-image"></th>
            <th class="left_table">${business.bname}</th>
            <th class="left_table">${addressLine}</th>
            <th class="left_table">Business type: ${business.type}</th>
            <th class="right_table">Phone: ${business.phone}</th>
        `;

            tableBody.appendChild(row);
        });
    }

    // Add input event listeners for visual feedback
    form.businessName.addEventListener('input', function() { validateField(this, isNotEmpty); });
    form.streetAddress.addEventListener('input', function() { validateField(this, isNotEmpty); });


    // Validation functions
    function isNotEmpty(value) {
        return value.trim() !== '';
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
            { element: form.streetAddress, validator: isNotEmpty },

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
});
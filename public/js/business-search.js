import {error} from "next/dist/build/output/log";

document.addEventListener('DOMContentLoaded', function() {
    console.log("Form validator loaded!");

    // Get form elements
    const form = {
        businessName: document.getElementById("business-name"),
        address: document.getElementById("address"),
    };

    // Get the form element
    const findBusiness = document.getElementById("business-search-form");

    // Add form submission handler
    if (findBusiness) {
        findBusiness.addEventListener('submit', function (event) {
            // Prevent the form from submitting immediately
            event.preventDefault();

            // Only require at least one search field to be filled
            if (!isNotEmpty(form.businessName.value) && !isNotEmpty(form.address.value)) {
                alert("Please enter either a business name or address to search");
            } else {
                const formData = {
                    businessName: form.businessName.value,
                    address: form.address.value,
                };

                console.log("Form data to submit:", formData);

                // Submit the data to MongoDB
                retrieveFromMongoDB(formData);
            }
        });
    }else {
        console.warn("Business search form not found in the DOM");
    }

    async function retrieveFromMongoDB(formData) {
        try {
            // Only include non-empty parameters in the query
            const params = {};
            if (formData.businessName && formData.businessName.trim() !== '') {
                params.businessName = formData.businessName;
            }
            if (formData.address && formData.address.trim() !== '') {
                params.address = formData.address;
            }

            const queryParams = new URLSearchParams(params).toString();

            // Use the absolute URL with query parameters
            const apiUrl = `https://patriotthanks.vercel.app/api/business-search?${queryParams}`;
            console.log("Submitting search to API at:", apiUrl);

            const response = await fetch(apiUrl, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                }
            });

            console.log("Response status:", response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Error response:", errorText);
                throw new Error(`Failed to retrieve data from MongoDB: ${response.status} ${errorText}`);
            }

            const data = await response.json();
            console.log("Success:", data);

            // Check which page we're on and display the results accordingly
            if (document.getElementById('search_table')) {
                // it is the business-search.html page
                displaySearchResults(data.results);
            } else if (document.getElementById('businesss-search-results')) {
                // it is the incentive-view.html or the incentive-add.html page
                displayBusinessSearchResults(data.results);
            } else {
                console.error("Coult not determine which page we are on");
            }
        } catch (error) {
            console.error("Error:", error);
            alert("Search failed: " + error.message);
        }
    }

    function displaySearchResults(businesses) {
        try {
            const businessSearchTable = document.getElementById('business_search');
            const searchTableContainer = document.getElementById('search_table');

            if (!businessSearchTable || !searchTableContainer) {
                console.error("Required elements not found in the DOM");
                alert("There was an error displaying search results. Please try again later.");
                return;
            }
            // Get the table body
            let tableBody = businessSearchTable.querySelector('tbody');

            if (!tableBody) {
                console.error("Table body not found within business_search table");
                alert("There was an error displaying search results. Please try again later.");
                return;
            }
            // Clear existing rows
            tableBody.innerHTML = '';

            if (businesses.length === 0) {
                // Show no results message
                alert("No businesses found matching your search criteria.");
                return;
            }

            // Show the search results table by making the block visible
            searchTableContainer.style.display = 'block';

            // Hide the "hidden" test in the h5.
            const searchTableH5 = searchTableContainer.querySelector('h5');
            if (searchTableH5) {
                searchTableH5.style.display = 'none';
            }

            // Add each business to the table
            businesses.forEach(business => {
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

                // Then create a new row
                const row = document.createElement('tr');

                // Set the row content
                row.innerHTML = `
                    <th><img src="${imageSrc}" alt="${business.bname}" class="business-image"></th>
                    <th class="left_table">${business.bname}</th>
                    <th class="left_table">${addressLine}</th>
                    <th class="left_table">Business type: ${business.type}</th>
                    <th class="right_table">${business.incentive || 'No incentives listed'}</th>
                `;

                tableBody.appendChild(row);
        });

        // Scroll to the results
        searchTableContainer.scrollIntoView({ behavior: 'smooth' });

    } catch(error) {
        console.error("Error displaying search results: ", error);
        alert("There was an error displaying the search results: " + error.message);
        }
    }

    // Function to display the business search results in the incentive- pages.
    function displayBusinessSearchResults(businesses) {
        try {
            // retrieve the business saerch results container
            const resultsContainer = document.getElementById('business_search-results');

            if (!resultsContainer) {
                console.error("Business search results container not found");
                alert("There was an error displaying search results. The page might not be properly configured.");
                return;
            }

            // create the table for display
            const table = document.createElement('table');
            table.classname = 'results-table';

            // create the header for the table
            const thead = document.createElement('thead');
            thead.innerHTML = `
                <tr>
                    <th>Business Name</th>
                    <th>Address</th>
                    <th>City</th>
                    <th>State</th>
                    <th>Zip</th>
                    <th>Action</th>
                </tr>
            `;
            table.appendChild(thead);

            // create the table body then add each business to the talbe
            const tbody = document.createElement('tbody');

            businesses.forEach(business => {
                const row = document.createElement('tr');

                row.innerHTML = `
                    <td>${business.bname}</td>
                    <td>${business.address1}${business.address2 ? '<br>' + business.address2 : ''}</td>
                    <td>${business.city}</td>
                    <td>${business.state}</td>
                    <td>${business.zip}</td>
                    <td><button class="select-business" data-business-id="${business._id}">Select</button></td>
                `;
                tbody.appendChild(row);
            });

            table.appendChild(tbody);
            resultsContainer.appendChild(table);

            // add the event listeners for the "select" buttons
            const selectBussions = document.querySelectorAll('.select-business');
            selectButtons.forEach(button => {
                button.addEventListener('click', function() {
                    const businessId = this.getAttribute('data-business-id');
                    // Now find the business object based on that ID
                    const selectedBusiness = business.find(business => business._id === businessId);

                    // Check to see if we are on incentive-add or incentive-view page
                    if (typeof selectBusinessForIncentive === 'function') {
                        // for incentive-add, call business-incentive-handler.js
                        selectBusinessForIncentive(selectedBusiness)
                    } else if (typeof viewBusinessIncentives === 'function') {
                        // for incentive-add, call business-incentive-viewer.js
                        viewBusinessIncentives(selectedBusiness);
                    } else {
                        console.error("No handler function found for that select button");
                        // fallback if needed
                        const selectedBusinessIdField = document.getElementById('selected-business-id');
                        if (selectedBusinessIdField) {
                            selectedBusinessIdField.value = businessId;
                            // show the business info
                            const businessInfoSection = document.getElementById('business-info-section');
                            if (businessInfoSection) {
                                populateBusinessInfo(selectedBusiness);
                                businessInfoSection.style.display = 'block';
                            }
                        }
                    }
                });
            });

            // have the browser scroll to the results
            resultsContainer.scrollIntoView({ behavior: 'smooth'});

        } catch (error) {
            console.error("Error displaying business search results: " + error);
            const resultsContainer = document.getElementById('business-search-results');
            if (resultsContainer) {
                resultsContainer.innerHTML = `<div class="error">Error displaying search results: ${error.message}</div>`;
            } else {
                alert("Error displaying search results: " + error.message);
            }
        }
    }

    // helper function to populate business information fields
    function populateBusinessInfo(business) {
        // set the values of the fields
        document.getElementById('bname').value = business.bname || '';
        document.getElementById('address1').value = business.address1 || '';
        document.getElementById('Address2').value = business.address2 || '';
        document.getElementById('City').value = business.city || '';

        const stateSelect = documentById('state');
        if (stateSelect) {
            const stateValue = business.state || '';
            for (let i = 0; i < stateSelect.options.length; i++) {
                if (stateSelect.options[i].value === stateValue) {
                    stateSelect.selectedIndex = i;
                    break;
                }
            }
        }
        document.getElementById('zip').value = business.zip || '';
        document.getElementById('phone').value = business.phone || '';

        const typeSelect = documentById('type');
        if (typeSelect) {
            const typeValue = business.type || '';
            for (let i = 0; i < stateSelect.options.length; i++) {
                if (typeSelect.options[i].value === typeValue) {
                    typeSelect.seletedIndex = i;
                    break;
                }
            }
        }

        // set the hidden business ID field
        const selectedBusinessIdField = document.getElementById('selected-business-id');
        if (selectedBusinessIdField) {
            selectedBusinessIdField.value = business._id || '';
        }
    }

    // Add input event listeners for visual feedback
    if (form.businessName) {
        form.businessName.addEventListener('input', function() { validateField(this, isNotEmpty); });
    }

    if (form.address) {
            form.address.addEventListener('input', function() { validateField(this, isNotEmpty); });
    }

    // function validation
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
            { element: form.address, validator: isNotEmpty },

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
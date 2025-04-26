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
    } else {
        console.warn("Business search form not found in the DOM");
    }

    async function retrieveFromMongoDB(formData) {
        try {
            // Only include non-empty parameters in the query
            const params = {};
            if (formData.businessName && formData.businessName.trim() !== '') {
                params.business_name = formData.businessName;
            }
            if (formData.address && formData.address.trim() !== '') {
                params.address = formData.address;
            }

            const queryParams = new URLSearchParams(params).toString();

            // Determine the base URL of local or production
            const baseURL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                ? `https://${window.location.host}`
                : `https://patriotthanks.vercel.app`;

            // use the API endpoint with the baseURL
            const apiURL = `${baseURL}/api/business.js?operation=search&${queryParams}`;
            console.log("submitting search to API at: ", apiURL);

            const res = await fetch(apiURL, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json; charset=UTF-8',
                }
            });

            console.log("response status: ", res.status);

            if (!res.ok) {
                const errorText = await res.text();
                console.error("Error response: ", errorText);
                throw new Error(`Failed to retrieve data from MongoDB: ${res.status} ${errorText}`);
            }

            const data = await res.json();
            console.log("Search results:", data);

            // Check if data and data.results exist before proceeding
            if (!data || !data.results) {
                console.error("Invalid response format - missing results property");
                throw new Error("Invalid response format from server");
            }

            // check the page to make sure the results display properly
            if (document.getElementById('search_table')) {
                // we are on the business-search.html page
                displaySearchResults(data.results);
            } else {
                // if on the incentive-add.html or incentive-view.html pages
                let resultsContainer = document.getElementById('business-search-results');

                if (!resultsContainer) {
                    // create the container if it doesn't exist
                    resultsContainer = document.createElement('div');
                    resultsContainer.id = 'business-search-results';

                    // decide where to insert the container
                    const firstFieldset = document.querySelector('fieldset');
                    if (firstFieldset) {
                        firstFieldset.parentNode.insertBefore(resultsContainer, firstFieldset.nextSibling);
                    } else {
                        const main = document.querySelector('main');
                        if (main) {
                            main.appendChild(resultsContainer);
                        } else {
                            // if nothing else, just append the body
                            document.body.appendChild(resultsContainer);
                        }
                    }

                    console.log("Created business-search-results container");
                }
                displayBusinessSearchResults(data.results, resultsContainer);
            }
        } catch (error) {
            console.error("Error: ", error);
            // Show an error message to the user
            let errorContainer;

            if (document.getElementById('search_table')) {
                errorContainer = document.getElementById('search_table');
            } else {
                errorContainer = document.getElementById('business-search-results');
                if (!errorContainer) {
                    errorContainer = document.createElement('div');
                    errorContainer.id = 'business-search-results';
                    const firstFieldset = document.querySelector('fieldset');
                    if (firstFieldset) {
                        firstFieldset.parentNode.insertBefore(errorContainer, firstFieldset.nextSibling);
                    } else {
                        document.body.appendChild(errorContainer);
                    }
                }
            }

            errorContainer.innerHTML = `<div class="error">Search failed: ${error.message}</div>`;
            errorContainer.style.display = 'block';
        }
    }

    // Helper function to convert business type codes to readable labels
    function getBusinessTypeLabel(typeCode) {
        const types = {
            'REST': 'Restaurant',
            'GROC': 'Grocery',
            'DEPT': 'Department Store',
            'CLTH': 'Clothing',
            'ELEC': 'Electronics',
            'HARDW': 'Hardware',
            'FURN': 'Furniture',
            'AUTO': 'Automotive',
            'SERV': 'Service',
            'ENTR': 'Entertainment',
            'SPRT': 'Sporting Goods',
            'TOYS': 'Toys',
            'HEAL': 'Health',
            'BEAU': 'Beauty',
            'JEWL': 'Jewelry',
            'BOOK': 'Bookstore',
            'GIFT': 'Gift Shop',
            'SPEC': 'Specialty',
            'RX': 'Pharmacy',
            'RETAIL': 'Retail',
            'TECH': 'Technology',
            'OTHER': 'Other'

        };

        return types[typeCode] || typeCode;
    }

    // Helper function to convert incentive type codes to readable labels
    function getIncentiveTypeLabel(typeCode) {
        const types = {
            'VT': 'Veteran',
            'AD': 'Active Duty',
            'FR': 'First Responder',
            'SP': 'Spouse',
            'OT': 'Other'
        };

        return types[typeCode] || typeCode;
    }

    // Function to fetch incentives for a specific business
    function fetchBusinessIncentives(businessId) {
        if (!businessId) {
            console.error("No business ID provided for fetching incentives");
            return;
        }

        // Determine the base URL of local or production
        const baseURL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
            ? `https://${window.location.host}`
            : `https://patriotthanks.vercel.app`;

        // Use the API endpoint with the baseURL
        const apiURL = `${baseURL}/api/incentives.js?business_id=${businessId}`;
        console.log("Fetching incentives from: ", apiURL);

        fetch(apiURL)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to fetch incentives: ${response.status} ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                console.log(`Incentives data for business ${businessId}:`, data);

                // Find the cell where we'll display incentives
                const incentivesCell = document.getElementById(`incentives-for-${businessId}`);

                if (!incentivesCell) {
                    console.error(`Could not find cell for incentives-for-${businessId}`);
                    return;
                }

                // Check if there are any incentives
                if (!data.results || data.results.length === 0) {
                    incentivesCell.innerHTML = 'No incentives found';
                    return;
                }

                // Build HTML for the incentives
                let incentivesHTML = '';

                data.results.forEach(incentive => {
                    if (incentive.is_available) {
                        const typeLabel = getIncentiveTypeLabel(incentive.type);
                        const otherDescription = incentive.other_description ?
                            ` (${incentive.other_description})` : '';

                        incentivesHTML += `
                            <div class="incentive-item">
                                <strong>${typeLabel}${otherDescription}:</strong> ${incentive.amount}%
                                <div class="incentive-info">${incentive.information || ''}</div>
                            </div>
                        `;
                    }
                });

                if (incentivesHTML === '') {
                    incentivesCell.innerHTML = 'No active incentives found';
                } else {
                    incentivesCell.innerHTML = incentivesHTML;
                }
            })
            .catch(error => {
                console.error(`Error fetching incentives for business ${businessId}:`, error);
                const incentivesCell = document.getElementById(`incentives-for-${businessId}`);

                if (incentivesCell) {
                    incentivesCell.innerHTML = 'Error loading incentives';
                }
            });
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

            // Make sure businesses is an array
            if (!Array.isArray(businesses)) {
                console.error("businesses is not an array:", businesses);
                businesses = [];
            }

            if (businesses.length === 0) {
                // Show no results message
                searchTableContainer.style.display = 'block';
                tableBody.innerHTML = '<tr><td colspan="5" class="text-center">No businesses found matching your search criteria.</td></tr>';
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
                if (!business) return; // skip null or undefined entries

                // Format the address line
                const addressLine = business.address2
                    ? `${business.address1}<br>${business.address2}<br>${business.city}, ${business.state} ${business.zip}`
                    : `${business.address1}<br>${business.city}, ${business.state} ${business.zip}`;

                // Convert the business type code to a readable label
                const businessType = getBusinessTypeLabel(business.type);

                // Then create a new row
                const row = document.createElement('tr');

                // First populate with basic business info
                row.innerHTML = `
                    <th class="left_table">${business.bname}</th>
                    <th class="left_table">${addressLine}</th>
                    <th class="left_table">${businessType}</th>
                    <th class="right_table" id="incentives-for-${business._id}">Loading incentives...</th>
                `;

                tableBody.appendChild(row);

                // Now fetch incentives for this business
                fetchBusinessIncentives(business._id);
            });

            // Scroll to the results
            searchTableContainer.scrollIntoView({behavior: 'smooth'});

        } catch (error) {
            console.error("Error displaying search results: ", error);
            alert("There was an error displaying the search results: " + error.message);
        }
    }

    function displayBusinessSearchResults(businesses, resultsContainer) {
        try {
            // clear any existing content
            resultsContainer.innerHTML = '';

            // Make sure businesses is an array
            if (!Array.isArray(businesses)) {
                console.error("businesses is not an array:", businesses);
                businesses = [];
            }

            if (businesses.length === 0) {
                resultsContainer.innerHTML = '<div class="error">No Businesses found matching your search criteria.</div>';
                return;
            }

            // create table
            const table = document.createElement('table');
            table.className = 'results-table';

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
                if (!business) return; // again, skip null or undefined

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
            const selectButtons = document.querySelectorAll('.select-business');
            selectButtons.forEach(button => {
                button.addEventListener('click', function () {
                    const businessId = this.getAttribute('data-business-id');
                    if (!businessId) {
                        console.error("No business ID found on button");
                        return;
                    }

                    // Now find the business object based on that ID
                    const selectedBusiness = businesses.find(bus => bus._id === businessId);
                    if (!selectedBusiness) {
                        console.error("Could not find business with ID: " + businessId);
                        return;
                    }

                    console.log("Selected business: ", selectedBusiness);

                    const currentPagePath = window.location.pathname;
                    console.log("Current page: ", currentPagePath);

                    // FIXED: Added special handling for incentive-update.html
                    if (currentPagePath.includes('incentive-update.html')) {
                        console.log("On incentive-update page");
                        if (typeof window.selectBusinessForIncentive === 'function') {
                            window.selectBusinessForIncentive(selectedBusiness);
                        } else if (typeof window.selectBusinessForIncentives === 'function') {
                            window.selectBusinessForIncentives(selectedBusiness);
                        } else {
                            console.error("selectBusinessForIncentive(s) not found, falling back");
                            handleBusinessSelection(selectedBusiness);
                        }
                    }
                    // Check if we're on business-update.html
                    else if (currentPagePath.includes('business-update.html')) {
                        console.log("On business-update page");
                        if (typeof window.selectBusinessForUpdate === 'function') {
                            window.selectBusinessForUpdate(selectedBusiness);
                        } else {
                            console.error("selectBusinessForUpdate not found, falling back");
                            handleBusinessSelection(selectedBusiness);
                        }
                    }
                    // Check to see if we are on incentive-add page
                    else if (currentPagePath.includes('incentive-add.html')) {
                        console.log("On incentive-add page");
                        // for incentive-add, call business-incentive-handler.js
                        if (typeof window.selectBusinessForIncentive === 'function') {
                            window.selectBusinessForIncentive(selectedBusiness);
                        } else {
                            handleBusinessSelection(selectedBusiness);
                        }
                    } else if (currentPagePath.includes('incentive-view.html') || currentPagePath.endsWith('business-search.html')) {
                        console.log("On incentive-view page");
                        // for incentive-view, call business-incentive-viewer.js
                        if (typeof window.viewBusinessIncentives === 'function') {
                            window.viewBusinessIncentives(selectedBusiness);
                        } else {
                            handleBusinessSelection(selectedBusiness);
                        }
                    } else {
                        console.error("Using fallback business selection handler");
                        handleBusinessSelection(selectedBusiness);
                    }
                });
            });

            // have the browser scroll to the results
            resultsContainer.scrollIntoView({behavior: 'smooth'});

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
    function handleBusinessSelection(business) {
        console.log("Handling business selection with fallback: ", business);

        try {
            // only to proceed if the necessary elements are available
            const businessInfoSection = document.getElementById('business-info-section');
            if (!businessInfoSection) {
                console.error("business-info-section not found");
                return;
            }

            // set the bsuiness ID if the field exists
            const selectedBusinessIdField = document.getElementById('selected-business-id');
            if (selectedBusinessIdField) {
                selectedBusinessId = business._id || '';
            }

            // now lets populate the business info fields
            populateBusinessInfo(business);

            // for incentive-add page, show the incentive section if it exists.
            const incentiveSection = document.getElementById('incentive-section');
            if (incentiveSection) {
                incentiveSection.style.display = 'block';
            }

            // now scroll to the business info section
            businessInfoSection.scrollIntoView({behavior: 'smooth'});
        } catch (error) {
            console.error("Error in handleBusinessSection: " + error);
            alert("There was an error selecting the business: " + error.message);
        }
    }

    function populateBusinessInfo(business) {
        if (!business) {
            console.error("No business data provided to populateBusinessInfo");
            return;
        }

        try {
            // set the values for all business fields if they exist
            const bnameField = document.getElementById('bname');
            if (bnameField) bnameField.value = business.bname || '';

            const address1Field = document.getElementById('address1');
            if (address1Field) address1Field.value = business.address1 || '';

            const address2Field = document.getElementById('address2');
            if (address2Field) address2Field.value = business.address2 || '';

            const cityField = document.getElementById('city');
            if (cityField) cityField.value = business.city || '';

            const zipField = document.getElementById('zip');
            if (zipField) zipField.value = business.zip || '';

            const phoneField = document.getElementById('phone');
            if (phoneField) phoneField.value = business.phone || '';

            // for the select statements of state and business type
            // they are set differently
            const stateSelect = document.getElementById('state');
            if (stateSelect) {
                const stateValue = business.state || '';
                for (let i = 0; i < stateSelect.options.length; i++) {
                    if (stateSelect.options[i].value === stateValue) {
                        stateSelect.selectedIndex = i;
                        break;
                    }
                }
            }

            const typeSelect = document.getElementById('type');
            if (typeSelect) {
                const typeValue = business.type || '';
                for (let i = 0; i < typeSelect.options.length; i++) {
                    if (typeSelect.options[i].value === typeValue) {
                        typeSelect.selectedIndex = i;
                        break;
                    }
                }
            }

            console.log("Business info populated successfully");
        } catch (error) {
            console.error("Error in populateBusinessInfo: " + error);
        }
    }

    // Add input event listeners for visual feedback
    if (form.businessName) {
        form.businessName.addEventListener('input', function () {
            validateField(this, isNotEmpty);
        });
    }

    if (form.address) {
        form.address.addEventListener('input', function () {
            validateField(this, isNotEmpty);
        });
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
            {element: form.businessName, validator: isNotEmpty},
            {element: form.address, validator: isNotEmpty},

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
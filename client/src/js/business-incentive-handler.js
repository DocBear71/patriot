// business-incentive-handler.js - Handles business search and incentive addition
document.addEventListener('DOMContentLoaded', function() {
    console.log("Business Incentive Handler Loaded!");

    // Initialize business info section display
    const businessInfoSection = document.getElementById('business-info-section');
    if (businessInfoSection) {
        businessInfoSection.style.display = 'none';
    }

    // Initialize incentive section display
    const incentiveSection = document.getElementById('incentive-section');
    if (incentiveSection) {
        incentiveSection.style.display = 'none';
    }

    // Set up the IncentiveType dropdown to show/hide the "other" field.
    const incentiveTypeSelect = document.getElementById('incentiveType');
    const otherTypeContainer = document.getElementById('otherTypeContainer');
    if (incentiveTypeSelect && otherTypeContainer) {
        incentiveTypeSelect.addEventListener('change', function() {
            if (this.value === 'OT') {
                otherTypeContainer.style.display = 'block';
            } else {
                otherTypeContainer.style.display = 'none';
            }
        });
    }

    // handle the radio buttons for incentive availability
    const incentiveAvailable = document.getElementById('incentiveAvailable');
    const incentiveNotAvailable = document.getElementById('incentiveNotAvailable');
    const incentiveFields = [
        document.getElementById('incentiveType'),
        document.getElementById('incentiveAmount'),
        document.getElementById('incentiveInfo')
    ];

    function toggleIncentiveFields() {
        const isIncentiveAvailable = incentiveAvailable.checked;

        incentiveFields.forEach(field => {
            if (field) {
                field.disabled = !isIncentiveAvailable;

                if (!isIncentiveAvailable) {
                    field.classList.add('disabled-field')
                } else {
                    field.classList.remove('disabled-field');
                }
            }
        });


        if (otherTypeContainer && document.getElementById('otherTypeDescription')) {
            const otherTypeDescription = document.getElementById('otherTypeDescription');
            otherTypeDescription.disabled = !isIncentiveAvailable;

            if (!isIncentiveAvailable) {
                otherTypeContainer.style.display = 'none';
                otherTypeDescription.classList.add('disabled-field');
            } else if (document.getElementById('incentiveType').value === 'OT') {
                otherTypeContainer.style.display = 'block';
                otherTypeDescription.classList.remove('disabled-field');
            }
        }

        if (!isIncentiveAvailable) {
            incentiveFields.forEach(field => {
                if (field) {
                    if (field.tagName === 'SELECT') {
                        field.selectedIndex = 0;
                    } else if (field.tagName === 'TEXTAREA') {
                        field.value = 'No incentives available at this business.';
                    } else if (field.type === 'number') {
                        field.value = '0';
                    }
                }
            });

            if (document.getElementById('otherTypeDescription')) {
                document.getElementById('otherTypeDescription').value = '';
            }
        }
    }

    // event listener for the incentive form
    incentiveAvailable.addEventListener('change', toggleIncentiveFields);
    incentiveNotAvailable.addEventListener('change', toggleIncentiveFields);


    // event listener for the incentive form submission
    const incentiveForm = document.getElementById('incentive-form');
    if (incentiveForm) {
        incentiveForm.addEventListener('submit', function(e) {
            e.preventDefault();

            // Get incentive form values
            const businessIdElement = document.getElementById('selected-business-id');
            const businessId = businessIdElement ? businessIdElement.value : '';
            const checkedRadio = document.querySelector('input[name="incentiveAvailable"]:checked');
            const incentiveAvailable = checkedRadio ? checkedRadio.value : null;

            // Validate incentive input
            if (!businessId) {
                alert('Please select a business first');
                return;
            }

            if (incentiveAvailable === null) {
                alert('Please specify if an incentive is available');
                return;
            }

            // get the other form values here
            const incentiveTypeElement = document.getElementById('incentiveType');
            const incentiveType = incentiveTypeElement ? incentiveTypeElement.value : '';
            const incentiveAmountElement = document.getElementById('incentiveAmount');
            const incentiveAmount = incentiveAmountElement ? incentiveAmountElement.value : '';
            const incentiveInfoElement = document.getElementById('incentiveInfo');
            const incentiveInfo = incentiveInfoElement ? incentiveInfoElement.value : '';

            if (incentiveAvailable === 'true' && (!incentiveType || !incentiveAmount || !incentiveAmount)) {
                alert('Please provide incentive type, amount, and information');
                return;
            }

            // Create the incentive data
            const incentiveData = {
                business_id: businessId,
                is_available: incentiveAvailable === 'true',
                type: incentiveType,
                amount: incentiveAmount,
                information: incentiveInfo
            };

            // handle the "other" type description
            if (incentiveType === 'OT') {
                const otherDescription = document.getElementById('otherTypeDescription')?.value || '';
                if (!otherDescription) {
                    alert('Please provide a description for the "Other" incentive type');
                    return;
                }
                incentiveData.other_description = otherDescription;
            }

            // Submit the incentive
            addIncentive(incentiveData);
        });
    }

    // ** define the selectBusinessForIncentive function in the global scope so business-search.js can find it **
    window.selectBusinessForIncentive = function(businessData) {
        console.log("selectedBusinessForIncentive called with: ", businessData);

        // show the business info section
        if (businessInfoSection) {
            businessInfoSection.style.display = 'block';
        }

        // populate the hidden field with the business ID
        const businessIdField = document.getElementById('selected-business-id');
        if (businessIdField) {
            businessIdField.value = businessData._id || '';
        }

        // populate the business information fields for confirmation of correct business
        populateField('bname', businessData.bname);
        populateField('address1', businessData.address1);
        populateField('address2', businessData.address2);
        populateField('city', businessData.city);
        populateField('zip', businessData.zip);
        populateField('phone', businessData.phone);

        // special handling for the select fields
        populateSelectField('state', businessData.state);
        populateSelectField('type', businessData.type);

        // make the business information fields readonly since they are just for display purposes
        document.querySelectorAll('#business-info-section input, #business-info-section select').forEach(element => {
            if (element.tagName.toLowerCase() === 'select') {
                element.disabled = true;
            } else {
                element.setAttribute('readonly', true);
            }
        });

        // Now show the incentive section
        if (incentiveSection) {
            incentiveSection.style.display = 'block';
        }

        // scroll for initiative
        if (incentiveSection) {
            incentiveSection.scrollIntoView({behavior: 'smooth'});
        }
    }

    // now to safely populate the select fields
    function populateSelectField(fieldId, value) {
        const field = document.getElementById(fieldId);
        if (!field) {
            console.warn(`Field ${fieldId} not found.`);
            return;
        }
        // try for a direct match first
        for (let i = 0; i < field.options.length; i++) {
            if (field.options[i].value === value) {
                field.selectedIndex = i;
                console.log(`Selected ${value} in ${fieldId}`);
                return;
            }
        }

        // in the exact match fails, try a case-insensitive match for state abbreviations
        if (fieldId === 'state' && value) {
            // try to match state names to abbreviates, such as Iowa to IA
            const stateAbbreviations = {
                'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR', 'california': 'CA',
                'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE', 'florida': 'FL', 'georgia': 'GA',
                'hawaii': 'HI', 'idaho': 'ID', 'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA',
                'kansas': 'KS', 'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
                'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS', 'missouri': 'MO',
                'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ',
                'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH',
                'oklahoma': 'OK', 'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
                'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT', 'vermont': 'VT',
                'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV', 'wisconsin': 'WI', 'wyoming': 'WY'
            };

            // now we do the reverse for abbreviations to state names
            const stateNames = {};
            for (const [name, abbr] of Object.entries(stateAbbreviations)) {
                stateNames[abbr.toLowerCase()] = name;
            }

            const valueLower = value.toLowerCase();

            // check to see if the value is the full name and get the abbreviation
            if (stateAbbreviations[valueLower]) {
                const abbr = stateAbbreviations[valueLower];

                // loop through the abbreviations to find the correct state name
                for (let i = 0; i < field.options.length; i++) {
                    if (field.options[i].value.toLowerCase() === abbr.toLowerCase()) {
                        field.selectedIndex = i;
                        console.log(`Selected state by abbreviation: ${abbr} for ${value}`);
                        return;
                    }
                }
            }

            // now  reverse and try abbreviations to full name
            else if (valueLower.length === 2 && stateNames[valueLower]) {
                const fullName = stateNames[valueLower];

                // loop through the options to find the full name
                for (let i = 0; i < field.options.length; i++) {
                    if (field.options[i].text.toLowerCase().includes(fullName)) {
                        field.selectedIndex = i;
                        console.log(`Selected state by full name: ${fullName} for ${value}`);
                        return;
                    }
                }
            }

            // As a last resort try to find a fuzzy match for the state
            for (let i = 0; i < field.options.length; i++) {
                const optionText = field.options[i].text.toLowerCase();
                const optionValue = field.options[i].value.toLowerCase();

                if (optionText.includes(valueLower) || valueLower.includes(optionText) ||
                    optionValue.includes(valueLower) || valueLower.includes(optionValue)) {
                    field.selectedIndex = i;
                    console.log(`Fuzzy matched state: ${field.options[i].text} for ${value}`);
                    return;
                }
            }
        }

        // Handle the business type field
        if (fieldId === 'type' && value) {
            const businessTypes = {
                'AUTO': 'Automotive',
                'BEAU': 'Beauty',
                'BOOK': 'Bookstore',
                'CLTH': 'Clothing',
                'CONV': 'Convenience Store/Gas Station',
                'DEPT': 'Department Store',
                'ELEC': 'Electronics',
                'ENTR': 'Entertainment',
                'FURN': 'Furniture',
                'FUEL': 'Fuel Station/Truck Stop',
                'GIFT': 'Gift Shop',
                'GROC': 'Grocery',
                'HARDW': 'Hardware',
                'HEAL': 'Health',
                'HOTEL': 'Hotel/Motel',
                'JEWL': 'Jewelry',
                'OTHER': 'Other',
                'RX': 'Pharmacy',
                'REST': 'Restaurant',
                'RETAIL': 'Retail',
                'SERV': 'Service',
                'SPEC': 'Specialty',
                'SPRT': 'Sporting Goods',
                'TECH': 'Technology',
                'TOYS': 'Toys'
            };

            // now to try and find the matching type
            const typeCode = businessTypes[value.toLowerCase()];
            if (typeCode) {
                for (let i = 0; i < field.options.length; i++) {
                    if (field.options[i].value === typeCode) {
                        field.selectedIndex = i;
                        console.log(`Selected business type: ${typeCode}`);
                        return;
                    }
                }
            }
        }

        console.warn(`Could not find a matching option for ${value} in ${fieldId}`);
    }

    // Function to add an Incentive
    function addIncentive(incentiveData) {
        console.log("adding Incentive: ", incentiveData);

        // Get user information from session
        const sessionData = localStorage.getItem('patriotThanksSession');
        if (sessionData) {
            const session = JSON.parse(sessionData);
            if (session && session.user && session.user._id) {
                incentiveData.created_by = session.user._id;
            }
        }

        // show the loading indicator
        const submitButton = document.querySelector('#incentive-form input[type="submit"]');
        let originalText = 'Submit Incentive';
        if (submitButton) {
            originalText = submitButton.value;
            submitButton.value = 'Submitting...';
            submitButton.disabled = true;
        }

        const baseURL = window.location.origin;
        // make the api call to the server
        const apiURL = `${baseURL}/api/combined-api.js?operation=incentives`;
        console.log("Attempting to submit to: ", apiURL);

        fetch(apiURL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=UTF-8'
            },
            body: JSON.stringify(incentiveData)
        })
            .then(res => {
                console.log("response status:", res.status);
                console.log("response Headers:", [...res.headers.entries()]);
                if (!res.ok) {
                    return res.text().then(text => {
                        console.log("Error response body: ", text);
                        throw new Error(`Server responded with status ${res.status}`);
                    });
                }
                return res.json();
            })
            .then(data => {
                console.log("Incentive added successfully: ", data);
                alert('Incentive added successfully!');

                // call the resetForm function
                resetForm();

            })
            .catch(error => {
                console.error("Error adding incentive: ", error);
                alert(`Error adding incentive: ${error.message}`);
            })
            .finally(() => {
                // time to restore the submit button
                if (submitButton) {
                    submitButton.value = originalText;
                    submitButton.disabled = false;
                }
            });
    }

    // helper function to safey rest form fields
    function resetField(fieldId, defaultValue = '') {
        const field = document.getElementById(fieldId);
        if (field) {
            field.value = defaultValue;
        }
    }

    // Add this function to business-incentive-handler.js
    function resetForm() {
        // Get the form element
        const incentiveForm = document.getElementById('incentive-form');

        // Reset the form if it exists
        if (incentiveForm) {
            // Reset all form fields
            incentiveForm.reset();

            // Clear business selection if needed
            const businessIdField = document.getElementById('selected-business-id');
            if (businessIdField) {
                businessIdField.value = '';
            }

            // Reset radio buttons
            const availableRadios = document.querySelectorAll('input[name="incentiveAvailable"]');
            availableRadios.forEach(radio => {
                radio.checked = false;
            });

            // Reset incentive type dropdown
            const typeSelect = document.getElementById('incentiveType');
            if (typeSelect) {
                typeSelect.selectedIndex = 0;
            }

            // Hide the "other" type container
            const otherTypeContainer = document.getElementById('otherTypeContainer');
            if (otherTypeContainer) {
                otherTypeContainer.style.display = 'none';
            }

            // Reset other description field
            const otherTypeDescription = document.getElementById('otherTypeDescription');
            if (otherTypeDescription) {
                otherTypeDescription.value = '';
            }

            // Reset amount field
            const amountField = document.getElementById('incentiveAmount');
            if (amountField) {
                amountField.value = '';
            }

            // Reset information textarea with default text
            const infoField = document.getElementById('incentiveInfo');
            if (infoField) {
                infoField.value = '';
            }

            // Hide the business info and incentive sections
            const businessInfoSection = document.getElementById('business-info-section');
            if (businessInfoSection) {
                businessInfoSection.style.display = 'none';
            }

            const incentiveSection = document.getElementById('incentive-section');
            if (incentiveSection) {
                incentiveSection.style.display = 'none';
            }

            // Clear the business search results
            const searchResults = document.getElementById('business-search-results');
            if (searchResults) {
                searchResults.innerHTML = '';
            }

            // Reset search fields
            const businessNameField = document.getElementById('business-name');
            if (businessNameField) {
                businessNameField.value = '';
            }

            const addressField = document.getElementById('address');
            if (addressField) {
                addressField.value = '';
            }
        }

        console.log("Incentive form has been reset");
    }

    // Lets add some css for the disabled fields
    const style = document.createElement('style');
    style.textContent = `
        .disabled-field {
            background-color: #f0f0f0;
            color: #888;
            cursor: not-allowed;
        }
        textarea.disabled-field {
            resize: none;
        }
    `;
    document.head.appendChild(style);

    // Add validation functions for the incentive form
    function isNotEmpty(value) {
        return value && value.trim() !== '';
    }

    function isValidNumber(value) {
        return !isNaN(value) && value > 0;
    }

    // Function to validate fields and provide visual feedback
    function validateField(field, validationFn) {
        console.log(`Validating ${field.id} with value: ${field.value}`);

        if (validationFn(field.value)) {
            field.classList.remove('invalid-field');
            field.classList.add('valid-field');
            field.setAttribute('data-valid', 'true');
            console.log(`${field.id} is VALID`);
            return true;
        } else {
            field.classList.remove('valid-field');
            field.classList.add('invalid-field');
            field.setAttribute('data-valid', 'false');
            console.log(`${field.id} is INVALID`);
            return false;
        }
    }

    // Function to validate the entire incentive form
    function validateIncentiveForm() {
        // Get the incentive availability radio button value
        const isAvailable = document.getElementById('incentiveAvailable').checked;
        let formIsValid = true;

        // Always validate that a business is selected
        const businessIdField = document.getElementById('selected-business-id');
        if (!businessIdField || !businessIdField.value) {
            formIsValid = false;
            alert('Please select a business first');
            return false;
        }

        // Validate that one of the radio buttons is selected
        const incentiveAvailableOption = document.querySelector('input[name="incentiveAvailable"]:checked');
        if (!incentiveAvailableOption) {
            formIsValid = false;
            alert('Please specify if an incentive is available');
            return false;
        }

        // If incentives are available, validate the incentive fields
        if (isAvailable) {
            const typeField = document.getElementById('incentiveType');
            const amountField = document.getElementById('incentiveAmount');
            const infoField = document.getElementById('incentiveInfo');

            if (!validateField(typeField, isNotEmpty)) {
                formIsValid = false;
            }

            if (!validateField(amountField, isValidNumber)) {
                formIsValid = false;
            }

            if (!validateField(infoField, isNotEmpty)) {
                formIsValid = false;
            }

            // Check for "Other" type description if needed
            if (typeField.value === 'OT') {
                const otherDescField = document.getElementById('otherTypeDescription');
                if (!validateField(otherDescField, isNotEmpty)) {
                    formIsValid = false;
                }
            }
        }

        return formIsValid;
    }

    // Add event listeners for field validation
    const incentiveTypeField = document.getElementById('incentiveType');
    const incentiveAmountField = document.getElementById('incentiveAmount');
    const incentiveInfoField = document.getElementById('incentiveInfo');
    const otherTypeDescField = document.getElementById('otherTypeDescription');

    if (incentiveTypeField) {
        incentiveTypeField.addEventListener('change', function() {
            validateField(this, isNotEmpty);
        });
    }

    if (incentiveAmountField) {
        incentiveAmountField.addEventListener('input', function() {
            validateField(this, isValidNumber);
        });
    }

    if (incentiveInfoField) {
        incentiveInfoField.addEventListener('input', function() {
            validateField(this, isNotEmpty);
        });
    }

    if (otherTypeDescField) {
        otherTypeDescField.addEventListener('input', function() {
            if (incentiveTypeField.value === 'OT') {
                validateField(this, isNotEmpty);
            }
        });
    }

    // Update the incentive form submit handler to use the validation function
    if (incentiveForm) {
        // Remove the old submit event listener
        const newIncentiveForm = incentiveForm.cloneNode(true);
        incentiveForm.parentNode.replaceChild(newIncentiveForm, incentiveForm);

        // Add the new submit event listener with validation
        newIncentiveForm.addEventListener('submit', function(e) {
            e.preventDefault();

            // Validate the form
            if (!validateIncentiveForm()) {
                return;
            }

            // Get incentive form values
            const businessIdElement = document.getElementById('selected-business-id');
            const businessId = businessIdElement ? businessIdElement.value : '';
            const incentiveAvailable = document.getElementById('incentiveAvailable').checked;

            // get the other form values here
            const incentiveTypeElement = document.getElementById('incentiveType');
            const incentiveType = incentiveTypeElement ? incentiveTypeElement.value : '';
            const incentiveAmountElement = document.getElementById('incentiveAmount');
            const incentiveAmount = incentiveAmountElement ? incentiveAmountElement.value : '';
            const incentiveInfoElement = document.getElementById('incentiveInfo');
            const incentiveInfo = incentiveInfoElement ? incentiveInfoElement.value : '';

            // Create the incentive data
            const incentiveData = {
                business_id: businessId,
                is_available: incentiveAvailable,
                type: incentiveType,
                amount: incentiveAmount,
                information: incentiveInfo
            };

            // handle the "other" type description
            if (incentiveType === 'OT') {
                const otherDescription = document.getElementById('otherTypeDescription')?.value || '';
                incentiveData.other_description = otherDescription;
            }

            // Submit the incentive
            addIncentive(incentiveData);
        });
    }

    // Add asterisks to required fields
    function addAsterisksToRequiredFields() {
        // Define the IDs of required fields based on your validation logic
        const requiredFieldIds = [
            "incentiveType", "incentiveAmount", "incentiveInfo"
        ];

        // Add asterisks to each required field's label
        requiredFieldIds.forEach(id => {
            const field = document.getElementById(id);
            if (field) {
                const label = document.querySelector(`label[for="${id}"]`);

                if (label && !label.innerHTML.includes('*')) {
                    const asterisk = document.createElement('span');
                    asterisk.className = 'required-indicator';
                    asterisk.textContent = ' *';
                    asterisk.style.color = 'red'; // Match your existing color scheme
                    label.appendChild(asterisk);
                }
            }
        });

        // Also add an asterisk to the incentive availability option labels
        const radioLabels = document.querySelectorAll('label[for="incentiveAvailable"], label[for="incentiveNotAvailable"]');
        radioLabels.forEach(label => {
            if (!label.innerHTML.includes('*')) {
                const asterisk = document.createElement('span');
                asterisk.className = 'required-indicator';
                asterisk.textContent = ' *';
                asterisk.style.color = 'red';
                label.appendChild(asterisk);
            }
        });

        // Add explanation at the top of the form
        const form = document.getElementById("incentive-form");
        if (form) {
            const explanation = document.createElement('div');
            explanation.className = 'form-explanation';
            explanation.innerHTML = '<p>Fields marked with an asterisk (*) are required.</p>';
            form.insertBefore(explanation, form.firstChild);
        }
    }

    // Add CSS styles for form validation

    style.textContent += `
            .valid-field {
                border: 1px solid green !important;
                background-color: #f0fff0 !important;
            }
            
            .invalid-field {
                border: 1px solid red !important;
                background-color: #fff0f0 !important;
            }
            
            .required-indicator {
                color: red;
                font-weight: bold;
            }
            
            .form-explanation {
                margin-bottom: 15px;
                font-style: italic;
            }
            `;
    document.head.appendChild(style);

    // Call the function to add asterisks
    addAsterisksToRequiredFields();

    // Debug the business selection issue
    console.log("Adding extra debugging for business selection");

// Check if the global function exists
    console.log("Does selectBusinessForIncentive exist?", typeof window.selectBusinessForIncentive === 'function');

// Add a more direct approach to handle business selection
    window.debugSelectBusiness = function(businessData) {
        console.log("Debug Select Business called with:", businessData);

        // Force display the hidden sections
        const businessInfoSection = document.getElementById('business-info-section');
        const incentiveSection = document.getElementById('incentive-section');

        if (businessInfoSection) {
            console.log("Found business-info-section, setting display to block");
            businessInfoSection.style.display = 'block';
        } else {
            console.error("Could not find business-info-section element");
        }

        if (incentiveSection) {
            console.log("Found incentive-section, setting display to block");
            incentiveSection.style.display = 'block';
        } else {
            console.error("Could not find incentive-section element");
        }

        // Populate the business data fields
        const businessIdField = document.getElementById('selected-business-id');
        if (businessIdField) {
            businessIdField.value = businessData._id || '';
            console.log("Set business ID to:", businessIdField.value);
        }

        // Populate business fields
        populateField('bname', businessData.bname);
        populateField('address1', businessData.address1);
        populateField('address2', businessData.address2 || '');
        populateField('city', businessData.city);
        populateField('state', businessData.state);
        populateField('zip', businessData.zip);
        populateField('phone', businessData.phone);
        populateField('type', businessData.type);

        // Scroll to the business info section
        businessInfoSection.scrollIntoView({ behavior: 'smooth' });
    };

// Helper function to populate fields
    function populateField(fieldId, value) {
        const field = document.getElementById(fieldId);
        if (field) {
            field.value = value || '';
            console.log(`Populated ${fieldId} with:`, value);
        } else {
            console.warn(`Field ${fieldId} not found.`);
        }
    }

// Override the original function if it exists but isn't working
    const originalSelectBusinessForIncentive = window.selectBusinessForIncentive;
    window.selectBusinessForIncentive = function(businessData) {
        console.log("Overridden selectBusinessForIncentive called with:", businessData);

        // Call the original function if it exists
        if (typeof originalSelectBusinessForIncentive === 'function') {
            originalSelectBusinessForIncentive(businessData);
        }

        // Then also call our debug function to ensure the sections are displayed
        window.debugSelectBusiness(businessData);
    };
});

/**
 * Override for selectBusinessForIncentive to handle chain businesses
 * @param {Object} businessData - The selected business
 */
function enhancedSelectBusinessForIncentive(businessData) {
    console.log("Enhanced selectBusinessForIncentive called with:", businessData);

    // Check if this is a chain parent and user is not admin
    const isChainParent = businessData.is_chain === true;
    const isAdmin = checkIfUserIsAdmin();

    if (isChainParent && !isAdmin) {
        // Show warning and prevent selection
        showChainParentWarning(businessData);
        return;
    }

    // Store the selected business for later reference
    window.selectedBusinessData = businessData;

    // Show the business info section
    const businessInfoSection = document.getElementById('business-info-section');
    if (businessInfoSection) {
        businessInfoSection.style.display = 'block';
    } else {
        console.error("business-info-section not found in the DOM");
        return;
    }

    // Set the business ID in the hidden field
    const businessIdField = document.getElementById('selected-business-id');
    if (businessIdField) {
        businessIdField.value = businessData._id || '';
    }

    // Populate business information fields
    populateBusinessInfo(businessData);

    // Add chain info banner if applicable
    displayChainInfo(businessData);

    // Show the incentive section
    const incentiveSection = document.getElementById('incentive-section');
    if (incentiveSection) {
        incentiveSection.style.display = 'block';
    }

    // Scroll to the incentive section
    if (incentiveSection) {
        incentiveSection.scrollIntoView({behavior: 'smooth'});
    }
}

/**
 * Display chain information if applicable
 * @param {Object} businessData - The business data
 */
function displayChainInfo(businessData) {
    if (!businessData) return;

    // Check if business is part of a chain
    if (businessData.chain_id || businessData.is_chain) {
        // Find or create a container for chain info
        let chainInfoDiv = document.getElementById('chain-info-banner');

        if (!chainInfoDiv) {
            chainInfoDiv = document.createElement('div');
            chainInfoDiv.id = 'chain-info-banner';
            chainInfoDiv.className = 'chain-business-warning';

            // Add to the beginning of the business info section
            const businessInfoSection = document.getElementById('business-info-section');
            if (businessInfoSection) {
                businessInfoSection.insertBefore(chainInfoDiv, businessInfoSection.firstChild);
            }
        }

        // Set content based on chain type
        if (businessData.is_chain) {
            // This is a chain parent
            chainInfoDiv.innerHTML = `
                <p><strong>${businessData.bname}</strong> is a national chain parent business.</p>
                <p>Chain-wide incentives added here will apply to all locations nationwide.</p>
                <p><strong>Note:</strong> Only administrators can add chain-wide incentives.</p>
            `;
        } else if (businessData.chain_id) {
            // This is a chain location
            chainInfoDiv.innerHTML = `
                <p><strong>${businessData.bname}</strong> is part of the <strong>${businessData.chain_name || 'chain'}</strong> chain.</p>
                <p>Incentives added here will only apply to this specific location.</p>
                <p>Chain-wide incentives can only be managed by administrators.</p>
            `;
        }
    }
}

/**
 * Check if the current user is an admin
 * @returns {boolean} True if user is admin
 */
function checkIfUserIsAdmin() {
    try {
        // First check if we have a global function
        if (typeof window.chainHandler !== 'undefined' && typeof window.chainHandler.checkIfUserIsAdmin === 'function') {
            return window.chainHandler.checkIfUserIsAdmin();
        }

        // Otherwise, implement it directly
        const sessionData = localStorage.getItem('patriotThanksSession');
        if (!sessionData) return false;

        const session = JSON.parse(sessionData);

        // Check if user has admin privileges
        return (session.user && (session.user.isAdmin === true || session.user.level === 'Admin'));
    } catch (error) {
        console.error("Error checking admin status:", error);
        return false;
    }
}

/**
 * Show warning for chain parent selection by non-admin users
 * @param {Object} chainBusiness - The chain business data
 */
function showChainParentWarning(chainBusiness) {
    // First check if we have a global function
    if (typeof window.chainHandler !== 'undefined' && typeof window.chainHandler.showChainParentWarning === 'function') {
        return window.chainHandler.showChainParentWarning(chainBusiness);
    }

    // Create an alert to show warning
    alert(`${chainBusiness.bname} is a national chain business. Chain businesses can only be modified by administrators. Please select a specific location instead.`);
}

/**
 * Add the necessary styles for chain display
 */
function addChainStyles() {
    if (!document.getElementById('chain-incentive-styles')) {
        const style = document.createElement('style');
        style.id = 'chain-incentive-styles';
        style.textContent = `
            .chain-business-warning {
                background-color: #FFF3CD;
                color: #856404;
                border: 1px solid #FFEEBA;
                padding: 10px;
                margin-bottom: 15px;
                border-radius: 4px;
            }
            
            .chain-badge {
                background-color: #4285F4;
                color: white;
                border-radius: 4px;
                padding: 3px 6px;
                font-size: 12px;
                display: inline-block;
                margin-left: 5px;
                font-weight: normal;
            }
        `;
        document.head.appendChild(style);
    }
}

/**
 * Install the enhancement when the page loads
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log("Installing business-incentive-handler enhancements");

    // Add styles
    addChainStyles();

    // Override the selectBusinessForIncentive function if it exists
    if (typeof window.selectBusinessForIncentive === 'function') {
        console.log("Overriding selectBusinessForIncentive function");

        // Save original function
        window.originalSelectBusinessForIncentive = window.selectBusinessForIncentive;

        // Replace with enhanced version
        window.selectBusinessForIncentive = enhancedSelectBusinessForIncentive;
    }
});
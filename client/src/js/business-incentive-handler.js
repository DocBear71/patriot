// business-incentive-handler.js - Handles business search and incentive addition
document.addEventListener('DOMContentLoaded', function() {
    testApiConnection();
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
        } else if (incentiveFields[2]) {
            incentiveFields[2].value = 'Please enter information about the discount/incentive.';
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

            if (incentiveAvailable === 'true' && (!incentiveType || !incentiveAmount)) {
                alert('Please provide incentive type and amount');
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

    // helper function to safely populate all the fields
    function populateField(fieldId, value) {
        const field = document.getElementById(fieldId);
        if (field) {
            field.value = value || '';
            console.log(`populated ${fieldId} with:`, value);
        } else {
            console.warn(`Field ${fieldId} not found.`);
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
                const optionValue = field.options[i].text.toLowerCase();

                if (optionText.includes(valueLower) || valueLower.includes(optionText) ||
                    optionValue.includes(valueLower) || valueLower.includes(optionValue)) {
                    field.selectedIndex = i;
                    console.log(`Fuzzy matched state: ${field.options[i].text} for ${value}`);
                }
            }
        }

        // Handle the business type field
        if (fieldId === 'type' && value) {
            const businessTypes = {
                'restaurant': 'REST',
                'automotive': 'AUTO',
                'entertainment': 'ENT',
                'hardware': 'HARDW',
                'pharmacy': 'RX',
                'retail': 'RETAIL',
                'technology': 'Tech',
                'other': 'OTHER'
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


        // show the loading indicator
        const submitButton = document.querySelector('#incentive-form input[type="submit"]');
        let originalText = 'Submit Incentive';
        if (submitButton) {
            originalText = submitButton.value;
            submitButton.value = 'Submitting...';
            submitButton.disabled = true;
        }

        // make the api call to the server
        const apiURL = 'https://patriotthanks.vercel.app/api/incentives/add';
        // const apiURL = 'https://patriotthanks.vercel.app/api/test-incentive-path';
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

                // Reset the incentive form but keep the selected business
                resetField('incentiveType');
                resetField('incentiveAmount');
                resetField('incentiveInfo', 'Please enter information about the discount/incentive.');
                document.querySelectorAll('input[name="incentiveAvailable"]').forEach(radio => {
                    radio.checked = false;
                });
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

    function testApiConnection() {
        console.log("Testing API connection...");

        fetch('https://patriotthanks.vercel.app/api/test')
            .then(res => {
                console.log("Test API response status:", res.status);
                return res.json();
            })
            .then(data => {
                console.log("Test API response:", data);
            })
            .catch(error => {
                console.error("Error testing API:", error);
            });
    }
});













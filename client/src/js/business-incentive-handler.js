// business-incentive-handler.js - Handles business search and incentive addition
document.addEventListener('DOMContentLoaded', function() {
    console.log("Business Incentive Handler Loaded!");
    // Get form elements
    const searchForm = document.getElementById('business-search-form');
    const incentiveForm = document.getElementById('incentive-form');
    const resultsContainer = document.getElementById('business-search-results');

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
    const incentiveTypeSelect = document.getElementById('incentiveAvailable');
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
    if (incentiveAvailable) {
        incentiveAvailable.addEventListener('change', toggleIncentiveFields);
    }

    if (incentiveNotAvailable) {
        incentiveNotAvailable.addEventListener('change', toggleIncentiveFields);
    }

    // event listener for the incentive form
    if (incentiveForm) {
        incentiveForm.addEventListener('submit', function(e) {
            e.preventDefault();

            // Get incentive form values
            const businessId = document.getElementById('selected-business-id').value;
            const incentiveType = document.getElementById('IncentiveType').value;
            const incentiveAmount = document.getElementById('incentiveAmount').value;
            const incentiveInfo = document.getElementById('incentiveInfo').value;
            const incentiveAvailable = document.querySelector('input[name="incentiveAvailable"]:checked')?.value;

            // Validate incentive input
            if (!businessId) {
                alert('Please select a business first');
                return;
            }

            if (!incentiveAvailable) {
                alert('Please specify if an incentive is available');
                return;
            }

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
                const otherDescription = document.getElementById('otherTypeDescription')?.value;
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
    window.selectedBusinessForIncentive = function(businessData) {
        console.log("selectedBusinessForIncentive called with: ", businessData);

        // call the existing selectBusiness function with the ID and data
        if (businessData && businessData._id) {
            selectBusiness(businessData._id, businessData);
        } else {
            console.error('Invalid business data provided to selectBusinessForIncentive');
        }
    };

    // function to select a business and populate the incentive form
    function selectBusiness(businessId, businessData) {
        console.log("Selecting business: ", businessData);

        // show the hidden business info section
        if (businessInfoSection) {
            businessInfoSection.style.display = 'block';
        }

        // populate the hidden field with the business ID
        const businessIdField = document.getElementById('selected-business-id');
        if (businessIdField) {
            businessIdField.value = businessId;
        }

        // populate the business information fields for confirmation of correct business
        populateField('bname', businessData.bname);
        populateField('address1', businessData.address1);
        populateField('address2', businessData.address2);
        populateField('city', businessData.city);

        // special handling for select fields
        populateSelectField('state', businessData.state);
        populateSelectField('type', businessData.type);

        populateField('zip', businessData.zip);
        populateField('phone', businessData.phone);

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

        const valueToSet = value || '';
        let found = false;

        for (let i = 0; i < field.options.length; i++) {
            if (field.options[i].value === valueToSet) {
                field.selectedIndex = i;
                found = true;
                console.log(`Selected ${valueToSet} in ${fieldId}`);
                break;
            }
        }

        if (!found) {
            console.warn(`Value ${valueToSet} not found in options for ${fieldId}`);
        }
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
        const apiURL = 'https://patriotthanks.vercel.app/api/incentive-add';

        fetch(apiURL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(incentiveData)
        })
            .then(res => {
                if (!res.ok) {
                    throw new Error(`Server responded with status ${res.status}`);
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
                document.querySelector('input[name="incentiveAvailable"]').forEach(radio => {
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
});













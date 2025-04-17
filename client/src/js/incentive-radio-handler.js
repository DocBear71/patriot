document.addEventListener('DOMContentLoaded', function() {
    //get the radio buttons
    const incentiveAvailable = document.getElementById('incentiveAvailable');
    const incentiveNotAvailable = document.getElementById('incentiveNotAvailable');

    // get the fields that will be disabled when no incentive is available.
    const incentiveFields = [
        document.getElementById('incentiveType'),
        document.getElementById('incentiveAmount'),
        document.getElementById('incentiveInfo')
    ];

    // get the otherTypeContainer
    const otherTypeContainer = document.getElementById('otherTypeContainer');
    const otherTypeDescription = document.getElementById('otherTypeDescription');

    // the function to toggle the field based on the radio selection
    function toggleIncentiveFields() {
        const isIncentiveAvailable = incentiveAvailable.checked;

        // toggle each incentive field
        incentiveFields.forEach(field => {
            if (field) {
                field.disabled = !isIncentiveAvailable;

                // add in a visual indicator for disabled fields
                if (!isIncentiveAvailable) {
                    field.classList.add('disabled-field');
                } else {
                    field.classList.remove('disabled-field');
                }
            }
        });

        // how to handle the Other type container and field
        if (otherTypeContainer && otherTypeDescription) {
            otherTypeDescription.disabled = !isIncentiveAvailable;

            if (!isIncentiveAvailable) {
                otherTypeContainer.style.display = 'none';
                otherTypeDescription.classList.add('disabled-field');
            } else if (document.getElementById('IncentiveType').value === 'OT') {
                otherTypeContainer.style.display = 'block';
                otherTypeDescription.classList.remove('disabled-field');
            }
        }

        // Reset the form values when incentive not available.
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

            if (otherTypeDescription) {
                otherTypeDescription.value = '';
            }
        } else if (incentiveFields[2]) {
            // reset the textarea when incentive is available
            incentiveFields[2].value = 'Please enter information about the discount/incentive';
        }
    }

    // add the listeners for the radio buttons
    if (incentiveAvailable) {
        incentiveAvailable.addEventListener('change', toggleIncentiveFields);
    }

    if (incentiveAvailable) {
        incentiveNotAvailable.addEventListener('change', toggleIncentiveFields);
    }

    // now set up the IncentiveType dropdown item to show/hide the "other' field.
    const incentiveTypeSelect = document.getElementById('incentiveType');
    if (incentiveTypeSelect && otherTypeContainer) {
        incentiveTypeSelect.addEventListener('change', function() {
            if (this.value === 'OT' && incentiveAvailable.checked) {
                otherTypeContainer.style.display = 'block';
            } else {
                otherTypeContainer.style.display = 'none';
            }
        });
    }

    // initialize the form state in case the radio button is checked by default
    if (incentiveAvailable || incentiveNotAvailable) {
        toggleIncentiveFields();
    }

    // addition of css for the disabled fields
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

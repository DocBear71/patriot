// /js/discount-type-handler.js

document.addEventListener('DOMContentLoaded', function() {
    console.log("Discount Type Handler Loaded!");

    // Step 1: Add the discount type radio buttons to the form
    const incentiveAmountFieldContainer = document.querySelector('.form-group:has(#incentiveAmount)');
    if (incentiveAmountFieldContainer) {
        // Create the discount type radio button container
        const discountTypeContainer = document.createElement('div');
        discountTypeContainer.className = 'form-group';
        discountTypeContainer.id = 'discountTypeContainer';

        // Add the label and radio buttons
        discountTypeContainer.innerHTML = `
            <label>Discount Type <span class="required-indicator">*</span></label>
            <div class="radio-group">
                <label for="discountTypePercentage">Percentage (%)</label>
                <input type="radio" id="discountTypePercentage" name="discountType" value="percentage" checked>
            </div>
            <div class="radio-group">
                <label for="discountTypeAmount">Dollar Amount ($)</label>
                <input type="radio" id="discountTypeAmount" name="discountType" value="amount">
            </div>
        `;

        // Insert before the incentive amount field
        incentiveAmountFieldContainer.parentNode.insertBefore(discountTypeContainer, incentiveAmountFieldContainer);

        // Update the label for the amount field to include an ID
        const incentiveAmountLabel = document.querySelector('label[for="incentiveAmount"]');
        if (incentiveAmountLabel) {
            incentiveAmountLabel.id = 'incentiveAmountLabel';
        }
    }

    // Step 2: Add the event handlers for the radio buttons
    const discountTypePercentage = document.getElementById('discountTypePercentage');
    const discountTypeAmount = document.getElementById('discountTypeAmount');
    const incentiveAmountLabel = document.getElementById('incentiveAmountLabel');
    const incentiveAmountField = document.getElementById('incentiveAmount');

    if (discountTypePercentage && discountTypeAmount && incentiveAmountLabel && incentiveAmountField) {
        // Function to update the input field based on discount type
        function updateAmountField() {
            if (discountTypePercentage.checked) {
                incentiveAmountLabel.textContent = 'Incentive Amount as a % *';
                incentiveAmountField.setAttribute('min', '0');
                incentiveAmountField.setAttribute('max', '100');
                incentiveAmountField.setAttribute('step', '0.1');
                incentiveAmountField.setAttribute('placeholder', 'Enter percentage (e.g. 10 for 10%)');
            } else {
                incentiveAmountLabel.textContent = 'Incentive Amount in $ *';
                incentiveAmountField.setAttribute('min', '0');
                incentiveAmountField.setAttribute('max', '1000');
                incentiveAmountField.setAttribute('step', '0.01');
                incentiveAmountField.setAttribute('placeholder', 'Enter dollar amount (e.g. 0.10 for $0.10)');
            }
        }

        // Add event listeners
        discountTypePercentage.addEventListener('change', updateAmountField);
        discountTypeAmount.addEventListener('change', updateAmountField);

        // Initialize the field state
        updateAmountField();
    }

    // Step 3: Update the validation function for incentive amount
    // Replace the existing isValidNumber function with this one
    window.isValidNumber = function(value) {
        const numValue = parseFloat(value);

        if (isNaN(numValue) || numValue <= 0) {
            return false;
        }

        // If percentage type is selected, ensure it's between 0 and 100
        const discountTypePercentage = document.getElementById('discountTypePercentage');
        if (discountTypePercentage && discountTypePercentage.checked) {
            return numValue <= 100;
        }

        // For dollar amounts, just ensure it's positive
        return true;
    };

    // Step 4: Modify the addIncentive function to include discount type
    // Save reference to the original addIncentive function if it exists
    const originalAddIncentive = window.addIncentive || null;

    // Override the addIncentive function
    window.addIncentive = function(incentiveData) {
        console.log("Adding Incentive with discount type: ", incentiveData);

        // Add discount_type property to incentiveData
        const discountTypePercentage = document.getElementById('discountTypePercentage');
        if (discountTypePercentage) {
            incentiveData.discount_type = discountTypePercentage.checked ? 'percentage' : 'amount';
        } else {
            // Default to percentage if radio buttons not found
            incentiveData.discount_type = 'percentage';
        }

        // Call the original function if it exists
        if (typeof originalAddIncentive === 'function') {
            return originalAddIncentive(incentiveData);
        }

        // Otherwise, implement the function here
        // Get user information from session
        const sessionData = localStorage.getItem('patriotThanksSession');
        if (sessionData) {
            const session = JSON.parse(sessionData);
            if (session && session.user && session.user._id) {
                incentiveData.created_by = session.user._id;
            }
        }

        // Show the loading indicator
        const submitButton = document.querySelector('#incentive-form input[type="submit"]');
        let originalText = 'Submit Incentive';
        if (submitButton) {
            originalText = submitButton.value;
            submitButton.value = 'Submitting...';
            submitButton.disabled = true;
        }

        // Make the api call to the server
        const apiURL = 'https://patriotthanks.vercel.app/api/incentives.js';
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

                // Call the resetForm function
                if (typeof resetForm === 'function') {
                    resetForm();
                }
            })
            .catch(error => {
                console.error("Error adding incentive: ", error);
                alert(`Error adding incentive: ${error.message}`);
            })
            .finally(() => {
                // Time to restore the submit button
                if (submitButton) {
                    submitButton.value = originalText;
                    submitButton.disabled = false;
                }
            });
    };

    // Step 5: Update the resetForm function
    const originalResetForm = window.resetForm || null;

    window.resetForm = function() {
        // Call original reset function if it exists
        if (typeof originalResetForm === 'function') {
            originalResetForm();
        }

        // Reset discount type radio buttons
        const discountTypePercentage = document.getElementById('discountTypePercentage');
        if (discountTypePercentage) {
            discountTypePercentage.checked = true;
        }

        const discountTypeAmount = document.getElementById('discountTypeAmount');
        if (discountTypeAmount) {
            discountTypeAmount.checked = false;
        }

        // Reset the label and attributes for the amount field
        const incentiveAmountLabel = document.getElementById('incentiveAmountLabel');
        const incentiveAmountField = document.getElementById('incentiveAmount');
        if (incentiveAmountLabel && incentiveAmountField) {
            incentiveAmountLabel.textContent = 'Incentive Amount as a % *';
            incentiveAmountField.setAttribute('min', '0');
            incentiveAmountField.setAttribute('max', '100');
            incentiveAmountField.setAttribute('step', '0.1');
            incentiveAmountField.setAttribute('placeholder', 'Enter percentage (e.g. 10 for 10%)');
        }
    };

    // Step 6: Update the form submission handler to include discount type
    // This should be the last part of the code
    const incentiveForm = document.getElementById('incentive-form');
    if (incentiveForm) {
        // Remove existing event listeners by cloning the form
        const newIncentiveForm = incentiveForm.cloneNode(true);
        incentiveForm.parentNode.replaceChild(newIncentiveForm, incentiveForm);

        // Add the new submit event listener
        newIncentiveForm.addEventListener('submit', function(e) {
            e.preventDefault();

            // Validate the form
            if (typeof validateIncentiveForm === 'function' && !validateIncentiveForm()) {
                return;
            }

            // Get incentive form values
            const businessIdElement = document.getElementById('selected-business-id');
            const businessId = businessIdElement ? businessIdElement.value : '';
            const incentiveAvailable = document.getElementById('incentiveAvailable').checked;

            // Get the form values
            const incentiveTypeElement = document.getElementById('incentiveType');
            const incentiveType = incentiveTypeElement ? incentiveTypeElement.value : '';
            const incentiveAmountElement = document.getElementById('incentiveAmount');
            const incentiveAmount = incentiveAmountElement ? incentiveAmountElement.value : '';
            const incentiveInfoElement = document.getElementById('incentiveInfo');
            const incentiveInfo = incentiveInfoElement ? incentiveInfoElement.value : '';

            // Get discount type
            const discountTypePercentage = document.getElementById('discountTypePercentage');
            const discountType = discountTypePercentage && discountTypePercentage.checked ? 'percentage' : 'amount';

            // Create the incentive data
            const incentiveData = {
                business_id: businessId,
                is_available: incentiveAvailable,
                type: incentiveType,
                amount: incentiveAmount,
                information: incentiveInfo,
                discount_type: discountType
            };

            // Handle the "other" type description
            if (incentiveType === 'OT') {
                const otherDescription = document.getElementById('otherTypeDescription')?.value || '';
                incentiveData.other_description = otherDescription;
            }

            // Submit the incentive
            if (typeof addIncentive === 'function') {
                addIncentive(incentiveData);
            } else {
                console.error("addIncentive function not found");
                alert("Error: Could not submit the incentive. Please try again later.");
            }
        });
    }
});

// Add this code to update the display of incentives for both percentage and dollar amounts

// Update the function to display incentives in the info window
function updateInfoWindowIncentiveDisplay(incentives, containerId) {
    const incentivesDiv = document.getElementById(containerId);
    if (!incentivesDiv) return;

    if (!incentives || incentives.length === 0) {
        incentivesDiv.innerHTML = '<p><strong>Incentives:</strong> No incentives found</p>';
        return;
    }

    let incentivesHTML = '<p><strong>Incentives:</strong></p><ul class="incentives-list">';

    incentives.forEach(incentive => {
        if (incentive.is_available) {
            const typeLabel = getIncentiveTypeLabel(incentive.type);
            const otherDescription = incentive.other_description ?
                ` (${incentive.other_description})` : '';

            // Format amount based on discount type
            let amountDisplay;
            if (incentive.discount_type === 'amount') {
                amountDisplay = `$${parseFloat(incentive.amount).toFixed(2)}`;
            } else {
                amountDisplay = `${incentive.amount}%`;
            }

            incentivesHTML += `
                <li>
                    <strong>${typeLabel}${otherDescription}:</strong> ${amountDisplay}
                    ${incentive.information ? ` - ${incentive.information}` : ''}
                </li>
            `;
        }
    });

    incentivesHTML += '</ul>';

    if (incentivesHTML === '<p><strong>Incentives:</strong></p><ul class="incentives-list"></ul>') {
        incentivesDiv.innerHTML = '<p><strong>Incentives:</strong> No active incentives found</p>';
    } else {
        incentivesDiv.innerHTML = incentivesHTML;
    }
}

// Helper function to get incentive type label if not already defined
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
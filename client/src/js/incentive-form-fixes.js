// incentive-form-fixes.js - Fixes for incentive form issues
document.addEventListener('DOMContentLoaded', function() {
    console.log("Incentive Form Fixes Loaded!");

    /**
     * Fix 1: Enhance the loadIncentiveForEditing function to properly set radio buttons
     * and trigger necessary events
     */
    const originalLoadIncentiveForEditing = window.loadIncentiveForEditing;

    window.loadIncentiveForEditing = function(incentive) {
        console.log("Enhanced loadIncentiveForEditing called with:", incentive);

        // First call the original function if it exists
        if (typeof originalLoadIncentiveForEditing === 'function') {
            originalLoadIncentiveForEditing(incentive);
        }

        // Now add our enhanced functionality
        if (!incentive) return;

        // Fix 1: Make sure the incentive availability radio buttons are properly set
        const incentiveAvailable = document.getElementById('incentiveAvailable');
        const incentiveNotAvailable = document.getElementById('incentiveNotAvailable');

        if (incentiveAvailable && incentiveNotAvailable) {
            // Set the correct radio button
            if (incentive.is_available) {
                incentiveAvailable.checked = true;
                incentiveNotAvailable.checked = false;
            } else {
                incentiveAvailable.checked = false;
                incentiveNotAvailable.checked = true;
            }

            // Trigger the change event to update field states
            if (incentive.is_available) {
                incentiveAvailable.dispatchEvent(new Event('change'));
            } else {
                incentiveNotAvailable.dispatchEvent(new Event('change'));
            }

            console.log("Radio buttons set:", incentive.is_available ? "Available" : "Not Available");
        }

        // Fix 2: Handle the "Other" type description field
        const incentiveTypeSelect = document.getElementById('incentiveType');
        const otherTypeContainer = document.getElementById('otherTypeContainer');
        const otherTypeDescription = document.getElementById('otherTypeDescription');

        if (incentiveTypeSelect && otherTypeContainer && otherTypeDescription) {
            // Ensure the correct option is selected
            for (let i = 0; i < incentiveTypeSelect.options.length; i++) {
                if (incentiveTypeSelect.options[i].value === incentive.type) {
                    incentiveTypeSelect.selectedIndex = i;
                    break;
                }
            }

            // Manually trigger the change event to update dependent fields
            incentiveTypeSelect.dispatchEvent(new Event('change'));

            // Explicitly handle the "Other" type
            if (incentive.type === 'OT') {
                otherTypeContainer.style.display = 'block';
                otherTypeDescription.value = incentive.other_description || '';
                console.log("Set other type description:", incentive.other_description);
            }
        }

        // Fix 3: Set discount type correctly (percentage or dollar)
        const discountTypePercentage = document.getElementById('discountTypePercentage');
        const discountTypeDollar = document.getElementById('discountTypeDollar');

        if (discountTypePercentage && discountTypeDollar && incentive.discount_type) {
            if (incentive.discount_type === 'dollar') {
                discountTypeDollar.checked = true;
                discountTypePercentage.checked = false;
            } else {
                discountTypePercentage.checked = true;
                discountTypeDollar.checked = false;
            }

            // Trigger the change event for the discount type
            if (incentive.discount_type === 'dollar') {
                discountTypeDollar.dispatchEvent(new Event('change'));
            } else {
                discountTypePercentage.dispatchEvent(new Event('change'));
            }

            console.log("Discount type set to:", incentive.discount_type);
        }

        // Make sure the edit section is visible
        const incentiveEditSection = document.getElementById('incentive-edit-section');
        if (incentiveEditSection) {
            incentiveEditSection.style.display = 'block';
            // Force browser to recognize the display change
            setTimeout(() => {
                incentiveEditSection.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        }
    };

    /**
     * Fix 2: Enhance the incentive type change handler
     */
    const incentiveTypeSelect = document.getElementById('incentiveType');
    const otherTypeContainer = document.getElementById('otherTypeContainer');

    if (incentiveTypeSelect && otherTypeContainer) {
        // Clean up any existing event listeners to avoid duplicates
        const newIncentiveTypeSelect = incentiveTypeSelect.cloneNode(true);
        incentiveTypeSelect.parentNode.replaceChild(newIncentiveTypeSelect, incentiveTypeSelect);

        // Add our enhanced event listener
        newIncentiveTypeSelect.addEventListener('change', function() {
            console.log("Incentive type changed to:", this.value);

            if (this.value === 'OT') {
                otherTypeContainer.style.display = 'block';

                // If incentive is available, make sure the field is enabled
                const incentiveAvailable = document.getElementById('incentiveAvailable');
                if (incentiveAvailable && incentiveAvailable.checked) {
                    const otherTypeDescription = document.getElementById('otherTypeDescription');
                    if (otherTypeDescription) {
                        otherTypeDescription.disabled = false;
                        otherTypeDescription.classList.remove('disabled-field');
                    }
                }
            } else {
                otherTypeContainer.style.display = 'none';
            }
        });
    }

    /**
     * Fix 3: Enhance the toggleIncentiveFields function to handle the "Other" field correctly
     */
    const originalToggleIncentiveFields = window.toggleIncentiveFields;

    window.toggleIncentiveFields = function() {
        // Call the original function if it exists
        if (typeof originalToggleIncentiveFields === 'function') {
            originalToggleIncentiveFields();
        }

        const incentiveAvailable = document.getElementById('incentiveAvailable');
        const incentiveNotAvailable = document.getElementById('incentiveNotAvailable');
        const incentiveTypeSelect = document.getElementById('incentiveType');
        const otherTypeContainer = document.getElementById('otherTypeContainer');
        const otherTypeDescription = document.getElementById('otherTypeDescription');

        if (incentiveAvailable && incentiveNotAvailable && incentiveTypeSelect && otherTypeContainer && otherTypeDescription) {
            const isIncentiveAvailable = incentiveAvailable.checked;

            // Handle the Other type field specifically
            if (isIncentiveAvailable && incentiveTypeSelect.value === 'OT') {
                otherTypeContainer.style.display = 'block';
                otherTypeDescription.disabled = false;
                otherTypeDescription.classList.remove('disabled-field');
            } else if (!isIncentiveAvailable) {
                otherTypeContainer.style.display = 'none';
                otherTypeDescription.disabled = true;
                otherTypeDescription.classList.add('disabled-field');
            } else if (incentiveTypeSelect.value !== 'OT') {
                otherTypeContainer.style.display = 'none';
            }
        }
    };

    /**
     * Fix 4: Make sure the discount type radio buttons update the amount label
     */
    const discountTypePercentage = document.getElementById('discountTypePercentage');
    const discountTypeDollar = document.getElementById('discountTypeDollar');
    const amountLabel = document.getElementById('amountLabel');

    if (discountTypePercentage && discountTypeDollar && amountLabel) {
        // Clean up existing event listeners
        const newDiscountTypePercentage = discountTypePercentage.cloneNode(true);
        const newDiscountTypeDollar = discountTypeDollar.cloneNode(true);

        discountTypePercentage.parentNode.replaceChild(newDiscountTypePercentage, discountTypePercentage);
        discountTypeDollar.parentNode.replaceChild(newDiscountTypeDollar, discountTypeDollar);

        // Add enhanced event listeners
        newDiscountTypePercentage.addEventListener('change', function() {
            if (this.checked) {
                amountLabel.textContent = 'Incentive Amount as a %';

                // Update field attributes for percentage
                const incentiveAmount = document.getElementById('incentiveAmount');
                if (incentiveAmount) {
                    incentiveAmount.setAttribute('min', '0');
                    incentiveAmount.setAttribute('max', '100');
                    incentiveAmount.setAttribute('step', '0.1');
                }
            }
        });

        newDiscountTypeDollar.addEventListener('change', function() {
            if (this.checked) {
                amountLabel.textContent = 'Incentive Amount in $';

                // Update field attributes for dollar amount
                const incentiveAmount = document.getElementById('incentiveAmount');
                if (incentiveAmount) {
                    incentiveAmount.setAttribute('min', '0');
                    incentiveAmount.removeAttribute('max'); // No upper limit for dollar amounts
                    incentiveAmount.setAttribute('step', '0.01');
                }
            }
        });
    }

    // Log that all fixes have been applied
    console.log("All incentive form fixes have been applied successfully!");
});
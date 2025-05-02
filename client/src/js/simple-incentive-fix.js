// simple-incentive-fix.js - A non-invasive fix for the incentive form
document.addEventListener('DOMContentLoaded', function() {
    console.log("Simple Incentive Fix Loaded!");

    // Wait for the page to be fully loaded and then apply the fix
    setTimeout(function() {
        // Store original functions without modifying them
        const originalLoadIncentiveForEditing = window.loadIncentiveForEditing;

        // Create a new wrapper function that extends the original without replacing it
        window.loadIncentiveForEditing = function(incentive) {
            console.log("Simple fix: Preparing to load incentive:", incentive);

            // Call the original function
            if (typeof originalLoadIncentiveForEditing === 'function') {
                originalLoadIncentiveForEditing(incentive);
            }

            // After the original function finishes, apply our fixes
            setTimeout(function() {
                console.log("Simple fix: Applying fixes for incentive:", incentive);

                // Fix 1: Set the correct radio button for incentive availability
                const incentiveAvailable = document.getElementById('incentiveAvailable');
                const incentiveNotAvailable = document.getElementById('incentiveNotAvailable');

                if (incentiveAvailable && incentiveNotAvailable) {
                    if (incentive.is_available) {
                        incentiveAvailable.checked = true;
                        incentiveNotAvailable.checked = false;
                    } else {
                        incentiveAvailable.checked = false;
                        incentiveNotAvailable.checked = true;
                    }

                    console.log("Simple fix: Set incentive available to", incentive.is_available);
                }

                // Fix 2: Handle the "Other" type description field
                const incentiveType = document.getElementById('incentiveType');
                const otherTypeContainer = document.getElementById('otherTypeContainer');
                const otherTypeDescription = document.getElementById('otherTypeDescription');

                if (incentiveType && otherTypeContainer && otherTypeDescription) {
                    // Set the type select to the correct value
                    for (let i = 0; i < incentiveType.options.length; i++) {
                        if (incentiveType.options[i].value === incentive.type) {
                            incentiveType.selectedIndex = i;
                            break;
                        }
                    }

                    // If type is "Other", ensure the description field is visible and populated
                    if (incentive.type === 'OT') {
                        otherTypeContainer.style.display = 'block';
                        otherTypeDescription.value = incentive.other_description || '';
                        console.log("Simple fix: Set other type description to", otherTypeDescription.value);
                    }
                }

                // Fix 3: Make sure fields are enabled/disabled based on availability
                if (incentive.is_available) {
                    // Enable all fields if incentive is available
                    const fieldsToEnable = [
                        document.getElementById('incentiveType'),
                        document.getElementById('incentiveAmount'),
                        document.getElementById('incentiveInfo'),
                        document.getElementById('discountTypePercentage'),
                        document.getElementById('discountTypeDollar')
                    ];

                    fieldsToEnable.forEach(field => {
                        if (field) {
                            field.disabled = false;
                            field.classList.remove('disabled-field');
                        }
                    });

                    // Also enable the "other" description field if needed
                    if (incentive.type === 'OT' && otherTypeDescription) {
                        otherTypeDescription.disabled = false;
                        otherTypeDescription.classList.remove('disabled-field');
                    }
                }

                // Fix 4: Set discount type correctly
                const discountTypePercentage = document.getElementById('discountTypePercentage');
                const discountTypeDollar = document.getElementById('discountTypeDollar');

                if (discountTypePercentage && discountTypeDollar && incentive.discount_type) {
                    if (incentive.discount_type === 'dollar') {
                        discountTypeDollar.checked = true;
                        discountTypePercentage.checked = false;

                        // Update label
                        const amountLabel = document.getElementById('amountLabel');
                        if (amountLabel) {
                            amountLabel.textContent = 'Incentive Amount in $';
                        }
                    } else {
                        discountTypePercentage.checked = true;
                        discountTypeDollar.checked = false;

                        // Update label
                        const amountLabel = document.getElementById('amountLabel');
                        if (amountLabel) {
                            amountLabel.textContent = 'Incentive Amount as a %';
                        }
                    }

                    console.log("Simple fix: Set discount type to", incentive.discount_type);
                }

                // Ensure edit section is visible
                const editSection = document.getElementById('incentive-edit-section');
                if (editSection) {
                    editSection.style.display = 'block';
                }

                console.log("Simple fix: Completed applying fixes");
            }, 50); // Small delay to ensure the original function has completed
        };

        // Add event listener for change to incentive type to show/hide "other" field
        const incentiveTypeSelect = document.getElementById('incentiveType');
        if (incentiveTypeSelect) {
            incentiveTypeSelect.addEventListener('change', function() {
                const otherTypeContainer = document.getElementById('otherTypeContainer');
                if (otherTypeContainer) {
                    if (this.value === 'OT') {
                        otherTypeContainer.style.display = 'block';
                    } else {
                        otherTypeContainer.style.display = 'none';
                    }
                }
            });
        }

        console.log("Simple fix: Setup complete");
    }, 500); // Wait for 500ms to ensure all original scripts have loaded
});
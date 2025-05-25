// direct-incentive-fixes.js - Direct fixes for specific issues
document.addEventListener('DOMContentLoaded', function() {
    console.log("Direct Incentive Fixes Loaded!");

    // Override the button click handler to ensure it works correctly
    const enhanceSelectIncentiveButtons = function() {
        const editButtons = document.querySelectorAll('.select-incentive');

        editButtons.forEach(button => {
            // Replace existing click handlers by cloning and replacing
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);

            newButton.addEventListener('click', function(e) {
                e.preventDefault(); // Prevent any default behavior

                const incentiveId = this.getAttribute('data-incentive-id');
                console.log("Direct fix handling incentive:", incentiveId);

                // Find the selected incentive in the table
                const row = this.closest('tr');
                const isAvailable = row.cells[0].textContent === 'Yes';
                const typeCell = row.cells[1].textContent;
                const type = getTypeCodeFromLabel(typeCell);
                const otherDescription = type === 'OT' ? extractOtherDescription(typeCell) : '';

                console.log("From table - Available:", isAvailable, "Type:", type, "Other:", otherDescription);

                // Directly set form values
                directlySetFormValues(incentiveId, isAvailable, type, otherDescription);

                // Make sure the edit section is visible
                showEditSection();
            });
        });
    };

    // Extract type code from display label
    function getTypeCodeFromLabel(typeText) {
        typeText = typeText.trim();

        if (typeText.startsWith('Veteran')) return 'VT';
        if (typeText.startsWith('Active-Duty')) return 'AD';
        if (typeText.startsWith('First Responder')) return 'FR';
        if (typeText.startsWith('Spouse')) return 'SP';
        if (typeText.startsWith('Other')) return 'OT';

        return typeText; // Return as-is if no match
    }

    // Extract the other description from the type cell text
    function extractOtherDescription(typeText) {
        const match = typeText.match(/\((.*?)\)/);
        return match ? match[1] : '';
    }

    // Directly set form values without relying on existing code
    function directlySetFormValues(incentiveId, isAvailable, type, otherDescription) {
        console.log("Direct setting - ID:", incentiveId, "Available:", isAvailable, "Type:", type, "Other:", otherDescription);

        // Set the incentive ID
        const selectedIncentiveId = document.getElementById('selected-incentive-id');
        if (selectedIncentiveId) {
            selectedIncentiveId.value = incentiveId;
        }

        // Set availability radio buttons
        const incentiveAvailable = document.getElementById('incentiveAvailable');
        const incentiveNotAvailable = document.getElementById('incentiveNotAvailable');

        if (incentiveAvailable && incentiveNotAvailable) {
            if (isAvailable) {
                incentiveAvailable.checked = true;
                incentiveNotAvailable.checked = false;
            } else {
                incentiveAvailable.checked = false;
                incentiveNotAvailable.checked = true;
            }

            // Toggle fields based on availability
            toggleFieldStates();
        }

        // Set the incentive type
        const typeSelect = document.getElementById('incentiveType');
        if (typeSelect) {
            for (let i = 0; i < typeSelect.options.length; i++) {
                if (typeSelect.options[i].value === type) {
                    typeSelect.selectedIndex = i;
                    break;
                }
            }

            // Toggle other description based on type
            toggleOtherType(type === 'OT');
        }

        // Set other description if needed
        if (type === 'OT') {
            const otherField = document.getElementById('otherTypeDescription');
            if (otherField) {
                otherField.value = otherDescription;
            }
        }
    }

    // Toggle field states based on availability
    function toggleFieldStates() {
        const incentiveAvailable = document.getElementById('incentiveAvailable');
        const isAvailable = incentiveAvailable && incentiveAvailable.checked;

        // Fields to enable/disable
        const fields = [
            'incentiveType', 'incentiveAmount', 'incentiveInfo',
            'discountTypePercentage', 'discountTypeDollar'
        ];

        fields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.disabled = !isAvailable;
                if (!isAvailable) {
                    field.classList.add('disabled-field');
                } else {
                    field.classList.remove('disabled-field');
                }
            }
        });

        // Handle other type container
        const type = document.getElementById('incentiveType')?.value;
        toggleOtherType(isAvailable && type === 'OT');
    }

    // Toggle other type description field visibility
    function toggleOtherType(showOther) {
        const otherContainer = document.getElementById('otherTypeContainer');
        const otherField = document.getElementById('otherTypeDescription');

        if (otherContainer) {
            otherContainer.style.display = showOther ? 'block' : 'none';
        }

        if (otherField) {
            otherField.disabled = !showOther;
            if (!showOther) {
                otherField.classList.add('disabled-field');
            } else {
                otherField.classList.remove('disabled-field');
            }
        }
    }

    // Show edit section with multiple approaches
    function showEditSection() {
        const editSection = document.getElementById('incentive-edit-section');
        if (editSection) {
            // Try multiple ways to ensure it's visible
            editSection.style.display = 'block';
            editSection.setAttribute('style', 'display: block !important');
            editSection.classList.add('force-display');

            // Scroll to it after a short delay
            setTimeout(() => {
                editSection.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        }
    }

    // Add event listeners for availability radio buttons
    const incentiveAvailable = document.getElementById('incentiveAvailable');
    const incentiveNotAvailable = document.getElementById('incentiveNotAvailable');

    if (incentiveAvailable) {
        incentiveAvailable.addEventListener('change', toggleFieldStates);
    }

    if (incentiveNotAvailable) {
        incentiveNotAvailable.addEventListener('change', toggleFieldStates);
    }

    // Add event listener for type change
    const typeSelect = document.getElementById('incentiveType');
    if (typeSelect) {
        typeSelect.addEventListener('change', function() {
            const isAvailable = document.getElementById('incentiveAvailable')?.checked;
            toggleOtherType(isAvailable && this.value === 'OT');
        });
    }

    // Watch for incentive table rendering
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                // Check if any edit buttons were added
                const hasButtons = document.querySelectorAll('.select-incentive').length > 0;
                if (hasButtons) {
                    console.log("Found incentive buttons, enhancing with direct fix");
                    enhanceSelectIncentiveButtons();
                }
            }
        });
    });

    // Start observing the container where incentives will be added
    const container = document.getElementById('incentives-table-container');
    if (container) {
        observer.observe(container, { childList: true, subtree: true });
    }

    // Immediately enhance any existing buttons
    enhanceSelectIncentiveButtons();

    console.log("Direct incentive fixes initialized");
});
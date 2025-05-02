// Fix for the incentive edit section display issue

document.addEventListener('DOMContentLoaded', function() {
    console.log("Display fix script loaded");

    // Find all the select-incentive buttons from the results table
    function addEventListenersToEditButtons() {
        const editButtons = document.querySelectorAll('.select-incentive');

        editButtons.forEach(button => {
            button.addEventListener('click', function() {
                const incentiveId = this.getAttribute('data-incentive-id');
                console.log("Button clicked for incentive:", incentiveId);

                // Force display of the edit section with multiple approaches
                const incentiveEditSection = document.getElementById('incentive-edit-section');

                if (incentiveEditSection) {
                    // Try multiple approaches to ensure display works
                    console.log("Before setting display - current style:", incentiveEditSection.style.display);

                    // 1. Set inline style directly
                    incentiveEditSection.style.display = 'block';

                    // 2. Also remove the style attribute completely and set it again
                    incentiveEditSection.removeAttribute('style');
                    incentiveEditSection.setAttribute('style', 'display: block !important');

                    // 3. Add a CSS class that forces display
                    incentiveEditSection.classList.add('force-display');

                    // 4. Use setTimeout to ensure the display change happens after any other scripts
                    setTimeout(() => {
                        incentiveEditSection.style.display = 'block';
                        console.log("After delay - style is now:", incentiveEditSection.style.display);
                    }, 10);

                    console.log("After setting display - current style:", incentiveEditSection.style.display);

                    // Scroll to the section to make it visible
                    setTimeout(() => {
                        incentiveEditSection.scrollIntoView({ behavior: 'smooth' });
                    }, 50);
                } else {
                    console.error("Could not find incentive-edit-section element");
                }
            });
        });
    }

    // Add CSS class to force display
    const style = document.createElement('style');
    style.textContent = `
        .force-display {
            display: block !important;
        }
    `;
    document.head.appendChild(style);

    // Monitor for dynamic addition of the incentives table
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                // Check if any buttons were added
                const hasNewButtons = document.querySelectorAll('.select-incentive').length > 0;
                if (hasNewButtons) {
                    console.log("New incentive buttons detected, adding event listeners");
                    addEventListenersToEditButtons();
                }
            }
        });
    });

    // Start observing the container where incentives will be added
    const incentivesTableContainer = document.getElementById('incentives-table-container');
    if (incentivesTableContainer) {
        observer.observe(incentivesTableContainer, { childList: true, subtree: true });
    }

    // Fix for the loadIncentiveForEditing function
    // Override the existing function to ensure it properly shows the edit section
    const originalLoadIncentiveForEditing = window.loadIncentiveForEditing;

    window.loadIncentiveForEditing = function(incentive) {
        console.log("Enhanced loadIncentiveForEditing called for:", incentive);

        // Show the incentive edit section with multiple approaches
        const incentiveEditSection = document.getElementById('incentive-edit-section');
        if (incentiveEditSection) {
            // Remove any existing style and set display to block forcefully
            incentiveEditSection.removeAttribute('style');
            incentiveEditSection.style.display = 'block';
            incentiveEditSection.setAttribute('style', 'display: block !important');
            incentiveEditSection.classList.add('force-display');

            console.log("Enhanced display setting applied:", incentiveEditSection.style.display);
        }

        // Call the original function if it exists
        if (typeof originalLoadIncentiveForEditing === 'function') {
            originalLoadIncentiveForEditing(incentive);
        }

        // Ensure form fields are properly populated
        if (incentive) {
            // Set the availability radio button
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
            }

            // Set incentive type
            const incentiveTypeSelect = document.getElementById('incentiveType');
            if (incentiveTypeSelect) {
                for (let i = 0; i < incentiveTypeSelect.options.length; i++) {
                    if (incentiveTypeSelect.options[i].value === incentive.type) {
                        incentiveTypeSelect.selectedIndex = i;
                        break;
                    }
                }
            }

            // Handle 'Other' type description
            const otherTypeContainer = document.getElementById('otherTypeContainer');
            if (otherTypeContainer) {
                if (incentive.type === 'OT') {
                    otherTypeContainer.style.display = 'block';
                    const otherDescriptionField = document.getElementById('otherTypeDescription');
                    if (otherDescriptionField) {
                        otherDescriptionField.value = incentive.other_description || '';
                    }
                } else {
                    otherTypeContainer.style.display = 'none';
                }
            }

            // Set incentive amount
            const incentiveAmountField = document.getElementById('incentiveAmount');
            if (incentiveAmountField) {
                incentiveAmountField.value = incentive.amount || 0;
            }

            // Set incentive information
            const incentiveInfoField = document.getElementById('incentiveInfo');
            if (incentiveInfoField) {
                incentiveInfoField.value = incentive.information || '';
            }
        }

        // Scroll to the edit section after a short delay
        setTimeout(() => {
            if (incentiveEditSection) {
                incentiveEditSection.scrollIntoView({ behavior: 'smooth' });
            }
        }, 100);
    };

    // Direct patch for the displayIncentives function's button click handler
    const originalDisplayIncentives = window.displayIncentives;

    window.displayIncentives = function(incentives) {
        // Call original displayIncentives if it exists
        if (typeof originalDisplayIncentives === 'function') {
            originalDisplayIncentives(incentives);
        }

        // Add our enhanced event listeners to the edit buttons
        setTimeout(() => {
            addEventListenersToEditButtons();
        }, 200);
    };
});
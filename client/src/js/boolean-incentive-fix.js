// boolean-incentive-fix.js - A targeted fix for boolean values and other type issues
document.addEventListener('DOMContentLoaded', function() {
    console.log("Boolean Incentive Fix Loaded!");

    // Wait a bit to ensure the page is fully loaded
    setTimeout(function() {
        // Monitor clicks on the Edit buttons directly
        document.addEventListener('click', function(event) {
            // Check if the clicked element is an edit button
            if (event.target && event.target.classList.contains('select-incentive')) {
                // Get the incentive ID
                const incentiveId = event.target.getAttribute('data-incentive-id');
                console.log("Boolean fix: Edit button clicked for incentive ID:", incentiveId);

                // Wait for the original code to process the click
                setTimeout(function() {
                    // Find the row in the table to get the available status
                    const row = event.target.closest('tr');
                    if (row) {
                        // Get "Yes" or "No" from the first cell
                        const availableCell = row.cells[0];
                        const isAvailable = availableCell && availableCell.textContent.trim() === 'Yes';

                        console.log("Boolean fix: Available cell content:", availableCell.textContent);
                        console.log("Boolean fix: Determined isAvailable =", isAvailable);

                        // Set the radio buttons directly
                        const availableRadio = document.getElementById('incentiveAvailable');
                        const notAvailableRadio = document.getElementById('incentiveNotAvailable');

                        if (availableRadio && notAvailableRadio) {
                            availableRadio.checked = isAvailable;
                            notAvailableRadio.checked = !isAvailable;
                            console.log("Boolean fix: Set radio buttons - Available:", isAvailable);

                            // Manually trigger change event to update field states
                            if (isAvailable) {
                                availableRadio.dispatchEvent(new Event('change'));
                            } else {
                                notAvailableRadio.dispatchEvent(new Event('change'));
                            }
                        }

                        // Check if this is an "Other" type incentive
                        const typeCell = row.cells[1];
                        const isOtherType = typeCell && typeCell.textContent.includes('Other');

                        if (isOtherType) {
                            console.log("Boolean fix: This is an 'Other' type incentive");

                            // Set the type dropdown to "Other"
                            const typeSelect = document.getElementById('incentiveType');
                            if (typeSelect) {
                                for (let i = 0; i < typeSelect.options.length; i++) {
                                    if (typeSelect.options[i].value === 'OT') {
                                        typeSelect.selectedIndex = i;
                                        // Trigger change event
                                        typeSelect.dispatchEvent(new Event('change'));
                                        break;
                                    }
                                }
                            }

                            // Extract the other description if available
                            let otherDescription = '';
                            const match = typeCell.textContent.match(/\((.*?)\)/);
                            if (match && match[1]) {
                                otherDescription = match[1];
                            }

                            // Set the other description field
                            const otherContainer = document.getElementById('otherTypeContainer');
                            const otherField = document.getElementById('otherTypeDescription');

                            if (otherContainer && otherField) {
                                otherContainer.style.display = 'block';
                                otherField.value = otherDescription;
                                otherField.disabled = !isAvailable;

                                if (!isAvailable) {
                                    otherField.classList.add('disabled-field');
                                } else {
                                    otherField.classList.remove('disabled-field');
                                }

                                console.log("Boolean fix: Set other description to:", otherDescription);
                            }
                        }
                    }

                    // Make sure the edit section is visible
                    const editSection = document.getElementById('incentive-edit-section');
                    if (editSection) {
                        editSection.style.display = 'block';
                    }
                }, 100); // Give the original code time to process
            }
        });

        console.log("Boolean fix: Click handler installed");
    }, 500); // Wait for the page to be fully loaded
});
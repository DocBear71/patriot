// business-incentive-viewer.js - Handles business search and incentive viewing

window.viewBusinessIncentives = function(selectedBusiness) {
    console.log("viewBusinessIncentives called with business: ", selectedBusiness);

    // Lets make sure the business info selected is visible
    const businessInfoSection = document.getElementById('business-info-section');
    if (businessInfoSection) {
        businessInfoSection.style.display = 'block';
    } else {
        console.error("business-info-section not found in the DOM");
    }

    // Set the business ID in the hidden h5 field
    const selectedBusinessIdField = document.getElementById('selected-business-id');
    if (selectedBusinessIdField) {
        selectedBusinessIdField.value = selectedBusiness._Id || '';
    }

    // Then popoulate the business information fields
    populateBusinessInfo(selectedBusiness);

    // make fetch happen and display the incentives for the selected business
    if (selectedBusiness && selectedBusiness._id) {
        fetchIncentives(selectedBusiness._id, selectedBusiness.bname);
    }
};

document.addEventListener('DOMContentLoaded', function() {
    console.log("Business incentives viewer loaded!");

    // lets make sure we are on the corrent incentive.view.html page
    const path = window.location.pathname;
    if (path.includes('incentive-view.html') || path.endsWith('business-search.html')) {
        console.log("on incentive-view or business-search page, initializing viewer");

        // maek sure the business information section is hidden until a business is selected
        const businessInfoSection = document.getElementById('business-info-section');
        if (businessInfoSection) {
            businessInfoSection.style.display = 'none';
        } else {
            console.warn("business-info-section not found in the DOM");
        }

        // create an incentives container if none exists
        let incentivesContainer = document.getElementById('incentives-container');
        if (!incentivesContainer) {
            incentivesContainer = document.createElement('div');
            incentivesContainer.id = 'incentives-container';

            // now we add the container after the business ifo section
            if (businessInfoSection && businessInfoSection.parentNode) {
                businessInfoSection.parentNode.insertBefore(incentivesContainer, businessInfoSection.nextSibling);
            } else {
                // add to the main if no info section
                const main = document.querySelector('main');
                if (main) {
                    main.appendChild(incentivesContainer);
                } else {
                    console.warn("Could not find the proper parent for incentives container");
                    document.body.appendChild(incentivesContainer);
                }
            }
        }
    }
});

// function to populate the business information fields
function populateBusinessInfo(business) {
    if (!business) {
        console.error("No business data provided to populateBusinessInfo");
        return;
    }

    console.log("Populating business info with: ", business);

    try {
        // if they exist, set all the values for all business fields
        const bnameField = document.getElementById('bname');
        if (bnameField) {
            console.log(`Setting bname to ${business.bname || ''}`);
            bnameField.value = business.bname || '';
        } else {
            console.warn("Field bname not found in the DOM");
        }

        const address1Field = document.getElementById('address1');
        if (address1Field) {
            console.log(`Setting address1 to ${business.address1 || ''}`);
            address1Field.value = business.address1 || '';
        } else {
            console.warn("Field address1 not found in the DOM");
        }

        const address2Field = document.getElementById('address2');
        if (address2Field) {
            console.log(`Setting address2 to ${business.address2 || ''}`);
            address2Field.value = business.address2 || '';
        } else {
            console.warn("Field address2 not found in the DOM");
        }

        const cityField = document.getElementById('city');
        if (cityField) {
            console.log(`Setting city to ${business.city || ''}`);
            cityField.value = business.city || '';
        } else {
            console.warn("Field city not found in the DOM");
        }

        const zipField = document.getElementById('zip');
        if (zipField) {
            console.log(`Setting zip to ${business.zip || ''}`);
            zipField.value = business.zip || '';
        } else {
            console.warn("Field zip not found in the DOM");
        }

        const phoneField = document.getElementById('phone');
        if (phoneField) {
            console.log(`Setting phone to ${business.phone || ''}`);
            phoneField.value = business.phone || '';
        } else {
            console.warn("Field phone not found in the DOM");
        }

        // speical care for the select options for business state or business type
        const stateSelect = document.getElementById('state');
        if (stateSelect) {
            const stateValue = business.state || '';
            console.log(`Setting state to ${state.value}`);
            for (let i = 0; i < stateSelect.options.length; i++) {
                if (stateSelect.options[i].value === stateValue) {
                    stateSelect.selectedIndex = i;
                    break;
                }
            }
        } else {
            console.warn("Field state not found in the DOM");
        }

        const typeSelect = document.getElementById('type');
        if (typeSelect) {
            const typeValue = business.type || '';
            console.log(`Setting type to ${typeValue}`);
            for (let i = 0; i < typeSelect.options.length; i++) {
                if (typeSelect.options[i].value === typeValue) {
                    typeSelect.selectedIndex = i;
                    break;
                }
            }
        } else {
            console.warn("Field type not found in the DOM");
        }

        console.log("Business info populated successfully");
    } catch (error) {
        console.error("Error in populateBusinessInfo", error);
    }
}

// function to make fetch happen and display the incentives for the selected business
function fetchIncentives(businessId, businessName) {
    // get the incentives container we made earlier
    let incentivesContainer = document.getElementById('incentives-container');
    if (!incentivesContainer) {
        console.log("creating the incentives container");
        incentivesContainer = document.createElement('div');
        incentivesContainer.id = "incentives-container";

        // now find a good place to put it
        const businessInfoSection = document.getElementById('business-info-section')
        if (businessInfoSection && businessInfoSection.parentNode) {
            businessInfoSection.parentNode.insertBefore(incentivesContainer, businessInfoSection.nextSibling);
        } else {
            const main = document.querySelector('main');
                if (main) {
                    main.appendChild(incentivesContainer);
                } else {
                    document.body.appendChild(incentivesContainer);
                }
            }
    }

        // display a loading indicator
        incentivesContainer.innerHTML = '<p>Loading incentives...</p>';
        console.log("Fetching incentives for business ID: ", businessId);

        // Now to construct the API URL
        // local versus production
        const baseURL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
            ? `https://${window.location.host}`
            : `https://patriotthanks.vercel.app`;

        const apiURL = `${baseURL}/api/incentives/${businessId}`;
        console.log("Fetching from URL: ", apiURL);

        // make fetch happen for incentives from the API
        fetch(apiURL)
            .then(res => {
                if (!res.ok) {
                    throw new Error(`Failed to fetch incentives: ${res.status} ${res.statusText}`);
                }
                return res.json();
            })
            .then(data => {
                console.log("Incentives data received: ", data);

                // create the fieldset for the incentives to be shown
                let html = `
                    <fieldset id="incentives-section">
                        <legent>
                            <h3 class="caveat">Step 3: View Incentives for ${businessName}</h3>
                        </legent>
                    </fieldset>
                `;

                if (!data.results || data.results.length === 0) {
                    html += '<p>No incentives found for this business.</p>';
                } else {
                    html += `
                        <table class="results-table">
                            <thead>
                                <tr>
                                    <th>Available</th>
                                    <th>Type</th>
                                    <th>Amount (%)</th>
                                    <th>Information</th>
                                    <th>Date Added</th>
                                </tr>
                            </thead>
                        <tbody>
                    `;

                    data.results.forEach(incentive => {
                        const date = new Date(incentive.created_at).toLocaleDateString();
                        const available = incentive.is_available ? 'Yes' : 'No';
                        const type = getIncentiveTypeLabel(incentive.type);
                        const otherDescription = incentive.other_description ?
                            `<br><em>(${incentive.other_description})</em>` : '';

                        html += `
                            <tr>
                                <td>${available}</td>
                                <td>${type}${otherDescription}</td>
                                <td>${incentive.is_available ? incentive.amount + '%' : 'N/A'}</td>
                                <td>${incentive.information}</td>
                                <td>${date}</td>
                            </tr>
                        `;
                    });

                    html += `
                        </tbody>
                    </table>
                `;
                }

            html += `</fieldset>`;

                // now to update the incentives container
                incentivesContainer.innerHTML = html;

                // scroll for initiative section
                const incentivesSection = document.getElementById('incentives-section');
                if (incentivesSection) {
                    incentivesSection.scrollIntoView({ behavior: 'smooth' });
                }
            })
        .catch(error => {
            console.error("Error in fetching incentives: ", error);
            incentivesContainer.innerHTML = `<p class="error">Error in fetching incentives: ${error.message}</p>`;
        });
    }

// Helper function to convert incentive type codes to readable labels
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

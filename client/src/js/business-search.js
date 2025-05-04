/**
 * Enhanced business-search.js with Google Maps functionality
 * Implements AdvancedMarkerElement with proper error handling and performance optimizations
 */

// Configuration constants
const CONFIG = {
    mapId: 'ebe8ec43a7bc252d',
    defaultCenter: { lat: 39.8283, lng: -98.5795 }, // Center of US
    defaultZoom: 4,
    markerColors: {
        primary: '#EA4335',   // Red for primary results
        nearby: '#4285F4'     // Blue for nearby results
    },
    geocodeDelay: 200,      // Delay between geocoding requests (ms)
    imageLoadDelay: 1000,   // Delay for image loading retry (ms)
    maxNearbyDistance: 20000 // Maximum distance for nearby businesses (meters)
};

// State variables
let map = null;
let mapInitialized = false;
let markers = [];
let infoWindow = null;
let bounds = null;
let pendingBusinessesToDisplay = [];

// Cache for place data to reduce API calls
const placeCache = new Map();

/**
 * Clear markers from the map
 */
function clearMarkers() {
    if (!markers) {
        markers = [];
        return;
    }

    markers.forEach(marker => {
        if (marker) {
            marker.map = null;
        }
    });
    markers = [];
}
/**
 * View business details
 * @param {string} businessId - Business ID
 */
window.viewBusinessDetails = function(businessId) {
    console.log("View details for business:", businessId);
    // You can implement this to navigate to a details page or show more info
    alert("This feature is coming soon: View details for " + businessId);
};

/**
 * Show info window for places not in your database
 * @param {Object} place - Google Place object
 * @param {Object} position - Position for the info window
 */
function showPlaceInfoWindow(place, position) {
    // Format the content with an "Add to Database" button
    const contentString = `
    <div class="info-window">
      <h3>${place.displayName || 'Unnamed Place'}</h3>
      <p><strong>Address:</strong><br>${place.formattedAddress || 'Address not available'}</p>
      ${place.nationalPhoneNumber ? `<p><strong>Phone:</strong> ${place.nationalPhoneNumber}</p>` : ''}
      <p><strong>Type:</strong> ${getPlaceTypeLabel(place.types)}</p>
      <div class="info-window-actions">
        <button class="add-business-btn" 
                onclick="window.addBusinessToDatabase('${place.id}')">
          Add to Patriot Thanks
        </button>
      </div>
    </div>
  `;

    // Set content and open the info window
    infoWindow.setContent(contentString);
    infoWindow.setPosition(position);
    infoWindow.open(map);
}

/**
 * Convert place types to readable format
 * @param {Array} types - Array of place types
 * @returns {string} Readable type label
 */
function getPlaceTypeLabel(types) {
    if (!types || !types.length) return 'Unknown';

    // Map Google place types to more readable formats
    const typeMapping = {
        'restaurant': 'Restaurant',
        'food': 'Food',
        'store': 'Store',
        'establishment': 'Business',
        'point_of_interest': 'Point of Interest',
        'gas_station': 'Gas Station',
        'lodging': 'Lodging',
        'cafe': 'Cafe',
        'bar': 'Bar',
        // Add more mappings as needed
    };

    // Try to find a good primary type
    for (const type of types) {
        if (typeMapping[type]) {
            return typeMapping[type];
        }
    }

    // Default to first type if we can't find a mapping
    return types[0].replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Add a business to the database
 * @param {string} placeId - Google Place ID
 */
window.addBusinessToDatabase = async function(placeId) {
    console.log("Adding place to database:", placeId);

    try {
        // Load the Places library
        const { Place } = await google.maps.importLibrary("places");

        // Create a Place instance
        const place = new Place({
            id: placeId
        });

        // Fetch comprehensive place details
        await place.fetchFields({
            fields: [
                'displayName',
                'formattedAddress',
                'addressComponents',
                'location',
                'nationalPhoneNumber'
            ]
        });

        // Extract address components from the place
        const businessData = {
            name: place.displayName || '',
            address1: getAddressComponentFromPlace(place, 'street_number') + ' ' +
                getAddressComponentFromPlace(place, 'route'),
            city: getAddressComponentFromPlace(place, 'locality'),
            state: getAddressComponentFromPlace(place, 'administrative_area_level_1'),
            zip: getAddressComponentFromPlace(place, 'postal_code'),
            phone: place.nationalPhoneNumber || '',
            lat: place.location?.lat || 0,
            lng: place.location?.lng || 0,
            placeId: place.id
        };

        // Store in sessionStorage for the add business page to use
        sessionStorage.setItem('newBusinessData', JSON.stringify(businessData));

        // Redirect to add business page
        window.location.href = 'business-add.html?prefill=true';
    } catch (error) {
        console.error("Error fetching place details for addition:", error);
        alert("Sorry, we couldn't retrieve the details for this business. Please try again or add it manually.");
    }
};

/**
 * Extract address component from place
 * @param {Object} place - Google Place object
 * @param {string} type - Component type to extract
 * @returns {string} Extracted component text
 */
function getAddressComponentFromPlace(place, type) {
    if (!place.addressComponents) return '';

    const component = place.addressComponents.find(
        component => component.types.includes(type)
    );

    return component ? component.shortText : '';
}

/**
 * Convert business type codes to readable labels
 * @param {string} typeCode - Business type code
 * @returns {string} Readable type label
 */
function getBusinessTypeLabel(typeCode) {
    const types = {
        'AUTO': 'Automotive',
        'BEAU': 'Beauty',
        'BOOK': 'Bookstore',
        'CLTH': 'Clothing',
        'CONV': 'Convenience Store/Gas Station',
        'DEPT': 'Department Store',
        'ELEC': 'Electronics',
        'ENTR': 'Entertainment',
        'FURN': 'Furniture',
        'FUEL': 'Fuel Station/Truck Stop',
        'GIFT': 'Gift Shop',
        'GROC': 'Grocery',
        'HARDW': 'Hardware',
        'HEAL': 'Health',
        'JEWL': 'Jewelry',
        'OTHER': 'Other',
        'RX': 'Pharmacy',
        'REST': 'Restaurant',
        'RETAIL': 'Retail',
        'SERV': 'Service',
        'SPEC': 'Specialty',
        'SPRT': 'Sporting Goods',
        'TECH': 'Technology',
        'TOYS': 'Toys'
    };

    return types[typeCode] || typeCode;
}

/**
 * Convert incentive type codes to readable labels
 * @param {string} typeCode - Incentive type code
 * @returns {string} Readable type label
 */
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

/**
 * Fetch incentives for a specific business info window
 * @param {string} businessId - Business ID
 */
function fetchBusinessIncentivesForInfoWindow(businessId) {
    if (!businessId) {
        console.error("No business ID provided for fetching incentives");
        return;
    }

    // Determine the base URL
    const baseURL = getBaseURL();

    const apiURL = `${baseURL}/api/incentives.js?business_id=${businessId}`;

    fetch(apiURL)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to fetch incentives: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // Find the div in the info window
            const incentivesDiv = document.getElementById(`info-window-incentives-${businessId}`);

            if (!incentivesDiv) {
                console.error(`Could not find incentives div for business ${businessId}`);
                return;
            }

            // Check if there are any incentives
            if (!data.results || data.results.length === 0) {
                incentivesDiv.innerHTML = '<p><strong>Incentives:</strong> No incentives found</p>';
                return;
            }

            // Build HTML for incentives
            let incentivesHTML = '<p><strong>Incentives:</strong></p><ul class="incentives-list">';

            data.results.forEach(incentive => {
                if (incentive.is_available) {
                    const typeLabel = getIncentiveTypeLabel(incentive.type);
                    const otherDescription = incentive.other_description ?
                        ` (${incentive.other_description})` : '';

                    incentivesHTML += `
            <li>
              <strong>${typeLabel}${otherDescription}:</strong> ${incentive.amount}%
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
        })
        .catch(error => {
            console.error(`Error fetching incentives for info window: ${error}`);
            const incentivesDiv = document.getElementById(`info-window-incentives-${businessId}`);

            if (incentivesDiv) {
                incentivesDiv.innerHTML = '<p><strong>Incentives:</strong> Error loading incentives</p>';
            }
        });
}

/**
 * Fetch incentives for a specific business
 * @param {string} businessId - Business ID
 */
function fetchBusinessIncentives(businessId) {
    if (!businessId) {
        console.error("No business ID provided for fetching incentives");
        return;
    }

    // Determine the base URL
    const baseURL = getBaseURL();

    // Use the API endpoint with the baseURL
    const apiURL = `${baseURL}/api/incentives.js?business_id=${businessId}`;
    console.log("Fetching incentives from: ", apiURL);

    fetch(apiURL)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to fetch incentives: ${response.status} ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            console.log(`Incentives data for business ${businessId}:`, data);

            // Find the cell where we'll display incentives
            const incentivesCell = document.getElementById(`incentives-for-${businessId}`);

            if (!incentivesCell) {
                console.error(`Could not find cell for incentives-for-${businessId}`);
                return;
            }

            // Check if there are any incentives
            if (!data.results || data.results.length === 0) {
                incentivesCell.innerHTML = 'No incentives found';
                return;
            }

            // Build HTML for the incentives
            let incentivesHTML = '';

            data.results.forEach(incentive => {
                if (incentive.is_available) {
                    const typeLabel = getIncentiveTypeLabel(incentive.type);
                    const otherDescription = incentive.other_description ?
                        ` (${incentive.other_description})` : '';

                    incentivesHTML += `
            <div class="incentive-item">
              <strong>${typeLabel}${otherDescription}:</strong> ${incentive.amount}%
              <div class="incentive-info">${incentive.information || ''}</div>
            </div>
          `;
                }
            });

            if (incentivesHTML === '') {
                incentivesCell.innerHTML = 'No active incentives found';
            } else {
                incentivesCell.innerHTML = incentivesHTML;
            }
        })
        .catch(error => {
            console.error(`Error fetching incentives for business ${businessId}:`, error);
            const incentivesCell = document.getElementById(`incentives-for-${businessId}`);

            if (incentivesCell) {
                incentivesCell.innerHTML = 'Error loading incentives';
            }
        });
}

/**
 * Display search results in the table
 * @param {Array} businesses - Array of business objects
 */
function displaySearchResults(businesses) {
    try {
        const businessSearchTable = document.getElementById('business_search');
        const searchTableContainer = document.getElementById('search_table');

        if (!businessSearchTable || !searchTableContainer) {
            console.error("Required elements not found in the DOM");
            alert("There was an error displaying search results. Please try again later.");
            return;
        }

        // Get the table body
        let tableBody = businessSearchTable.querySelector('tbody');

        if (!tableBody) {
            console.error("Table body not found within business_search table");
            alert("There was an error displaying search results. Please try again later.");
            return;
        }

        // Clear existing rows
        tableBody.innerHTML = '';

        // Make sure businesses is an array
        if (!Array.isArray(businesses)) {
            console.error("businesses is not an array:", businesses);
            businesses = [];
        }

        // Show the search results table by making the block visible
        searchTableContainer.style.display = 'block';

        // Hide the "hidden" text in the h5
        const searchTableH5 = searchTableContainer.querySelector('h5');
        if (searchTableH5) {
            searchTableH5.style.display = 'none';
        }

        if (businesses.length === 0) {
            // Show no results message
            tableBody.innerHTML = '<tr><td colspan="5" class="text-center">No businesses found matching your search criteria.</td></tr>';

            // Scroll to the table even when no results are found
            searchTableContainer.scrollIntoView({behavior: 'smooth'});
            return;
        }

        // Add each business to the table
        businesses.forEach(business => {
            if (!business) return; // skip null or undefined entries

            // Format the address line
            const addressLine = business.address2
                ? `${business.address1}<br>${business.address2}<br>${business.city}, ${business.state} ${business.zip}`
                : `${business.address1}<br>${business.city}, ${business.state} ${business.zip}`;

            // Convert the business type code to a readable label
            const businessType = getBusinessTypeLabel(business.type);

            // Then create a new row
            const row = document.createElement('tr');

            // Add a View on Map button
            const viewMapButton = `<button class="view-map-btn" onclick="focusOnMapMarker('${business._id}')">View on Map</button>`;

            // First populate with basic business info
            row.innerHTML = `
        <th class="left_table" data-business-id="${business._id}">${business.bname}</th>
        <th class="left_table">${addressLine}</th>
        <th class="left_table">${businessType}</th>
        <th class="right_table" id="incentives-for-${business._id}">Loading incentives...</th>
        <th class="center_table">${viewMapButton}</th>
      `;

            tableBody.appendChild(row);

            // Now fetch incentives for this business
            fetchBusinessIncentives(business._id);
        });

        // Scroll to the results
        searchTableContainer.scrollIntoView({behavior: 'smooth'});

    } catch (error) {
        console.error("Error displaying search results: ", error);
        alert("There was an error displaying the search results: " + error.message);
    }
}

/**
 * Display business search results for other pages
 * @param {Array} businesses - Array of business objects
 * @param {HTMLElement} resultsContainer - Container for results
 */
function displayBusinessSearchResults(businesses, resultsContainer) {
    try {
        // clear any existing content
        resultsContainer.innerHTML = '';

        // Make sure businesses is an array
        if (!Array.isArray(businesses)) {
            console.error("businesses is not an array:", businesses);
            businesses = [];
        }

        if (businesses.length === 0) {
            resultsContainer.innerHTML = '<div class="error">No businesses found matching your search criteria.</div>';

            // Scroll to the results container even when no businesses are found
            resultsContainer.scrollIntoView({behavior: 'smooth'});
            return;
        }

        // create table
        const table = document.createElement('table');
        table.className = 'results-table';

        // Define column headers (we'll use these for data-title attributes too)
        const headers = {
            name: "Business Name",
            address: "Address",
            city: "City",
            state: "State",
            zip: "Zip",
            action: "Action"
        };

        // create the header for the table
        const thead = document.createElement('thead');
        thead.innerHTML = `
      <tr>
        <th>${headers.name}</th>
        <th>${headers.address}</th>
        <th>${headers.city}</th>
        <th>${headers.state}</th>
        <th>${headers.zip}</th>
        <th>${headers.action}</th>
      </tr>
    `;
        table.appendChild(thead);

        // create the table body then add each business to the table
        const tbody = document.createElement('tbody');

        businesses.forEach(business => {
            if (!business) return; // again, skip null or undefined

            const row = document.createElement('tr');

            row.innerHTML = `
        <td data-title="${headers.name}">${business.bname}</td>
        <td data-title="${headers.address}">${business.address1}${business.address2 ? '<br>' + business.address2 : ''}</td>
        <td data-title="${headers.city}">${business.city}</td>
        <td data-title="${headers.state}">${business.state}</td>
        <td data-title="${headers.zip}">${business.zip}</td>
        <td data-title="${headers.action}"><button class="select-business" data-business-id="${business._id}">Select</button></td>
      `;
            tbody.appendChild(row);
        });

        table.appendChild(tbody);
        resultsContainer.appendChild(table);

        // Add the responsive table CSS to the page if it doesn't exist yet
        addResponsiveTableStyles();

        // add the event listeners for the "select" buttons
        const selectButtons = document.querySelectorAll('.select-business');
        selectButtons.forEach(button => {
            button.addEventListener('click', function() {
                const businessId = this.getAttribute('data-business-id');
                if (!businessId) {
                    console.error("No business ID found on button");
                    return;
                }

                // Now find the business object based on that ID
                const selectedBusiness = businesses.find(bus => bus._id === businessId);
                if (!selectedBusiness) {
                    console.error("Could not find business with ID: " + businessId);
                    return;
                }

                console.log("Selected business: ", selectedBusiness);

                const currentPagePath = window.location.pathname;
                console.log("Current page: ", currentPagePath);

                // Handle selection based on current page
                handleBusinessSelectionByPage(currentPagePath, selectedBusiness);
            });
        });

        // have the browser scroll to the results
        resultsContainer.scrollIntoView({behavior: 'smooth'});

    } catch (error) {
        console.error("Error displaying business search results: " + error);
        const resultsContainer = document.getElementById('business-search-results');
        if (resultsContainer) {
            resultsContainer.innerHTML = `<div class="error">Error displaying search results: ${error.message}</div>`;
            // Scroll to the error message
            resultsContainer.scrollIntoView({behavior: 'smooth'});
        } else {
            alert("Error displaying search results: " + error.message);
        }
    }
}

/**
 * Handle business selection based on current page
 * @param {string} currentPagePath - Current page path
 * @param {Object} selectedBusiness - Selected business object
 */
function handleBusinessSelectionByPage(currentPagePath, selectedBusiness) {
    // Special handling for incentive-update.html
    if (currentPagePath.includes('incentive-update.html')) {
        console.log("On incentive-update page");
        if (typeof window.selectBusinessForIncentive === 'function') {
            window.selectBusinessForIncentive(selectedBusiness);
        } else if (typeof window.selectBusinessForIncentives === 'function') {
            window.selectBusinessForIncentives(selectedBusiness);
        } else {
            console.error("selectBusinessForIncentive(s) not found, falling back");
            handleBusinessSelection(selectedBusiness);
        }
    }
    // Check if we're on business-update.html
    else if (currentPagePath.includes('business-update.html')) {
        console.log("On business-update page");
        if (typeof window.selectBusinessForUpdate === 'function') {
            window.selectBusinessForUpdate(selectedBusiness);
        } else {
            console.error("selectBusinessForUpdate not found, falling back");
            handleBusinessSelection(selectedBusiness);
        }
    }
    // Check to see if we are on incentive-add page
    else if (currentPagePath.includes('incentive-add.html')) {
        console.log("On incentive-add page");
        // for incentive-add, call business-incentive-handler.js
        if (typeof window.selectBusinessForIncentive === 'function') {
            window.selectBusinessForIncentive(selectedBusiness);
        } else {
            handleBusinessSelection(selectedBusiness);
        }
    } else if (currentPagePath.includes('incentive-view.html') || currentPagePath.endsWith('business-search.html')) {
        console.log("On incentive-view page");
        // for incentive-view, call business-incentive-viewer.js
        if (typeof window.viewBusinessIncentives === 'function') {
            window.viewBusinessIncentives(selectedBusiness);
        } else {
            handleBusinessSelection(selectedBusiness);
        }
    } else {
        console.error("Using fallback business selection handler");
        handleBusinessSelection(selectedBusiness);
    }
}

/**
 * Add responsive table styles
 */
function addResponsiveTableStyles() {
    if (!document.getElementById('responsive-table-css')) {
        const style = document.createElement('style');
        style.id = 'responsive-table-css';
        style.textContent = `
      /* Base table styles */
      .results-table {
        width: 90%;
        margin: 20px auto;
        border-collapse: collapse;
        text-align: left;
      }
      
      .results-table th, .results-table td {
        border: 1px solid #ddd;
        padding: 8px;
      }
      
      .results-table th {
        background-color: #f2f2f2;
        font-weight: bold;
        text-align: center;
      }
      
      .results-table tr:nth-child(even) {
        background-color: #f9f9f9;
      }
      
      .results-table tr:hover {
        background-color: #f1f1f1;
      }
      
      /* Responsive table for small screens */
      @media only screen and (max-width: 767px) {
        .results-table {
          width: 100%;
          margin: 10px 0;
        }
        
        .results-table, .results-table thead, .results-table tbody, .results-table tr {
          display: block;
        }
        
        .results-table thead {
          display: none;
        }
        
        .results-table tr {
          border: 1px solid #ccc;
          margin-bottom: 15px;
          padding: 8px;
          background-color: #f9f9f9;
        }
        
        .results-table td {
          display: block;
          border: none;
          border-bottom: 1px solid #eee;
          padding: 8px;
          margin-bottom: 6px;
          text-align: left;
          position: relative;
        }
        
        .results-table td::before {
          content: attr(data-title);
          display: block;
          font-weight: bold;
          margin-bottom: 6px;
          color: #333;
        }
        
        /* Ensure buttons are properly displayed */
        .select-business {
          margin: 8px 0;
          display: inline-block;
        }
      }
    `;
        document.head.appendChild(style);
    }
}

/**
 * Helper function to handle business selection
 * @param {Object} business - Selected business object
 */
function handleBusinessSelection(business) {
    console.log("Handling business selection with fallback: ", business);

    try {
        // only to proceed if the necessary elements are available
        const businessInfoSection = document.getElementById('business-info-section');
        if (!businessInfoSection) {
            console.error("business-info-section not found");
            return;
        }

        // set the business ID if the field exists
        const selectedBusinessIdField = document.getElementById('selected-business-id');
        if (selectedBusinessIdField) {
            selectedBusinessId = business._id || '';
        }

        // now lets populate the business info fields
        populateBusinessInfo(business);

        // for incentive-add page, show the incentive section if it exists.
        const incentiveSection = document.getElementById('incentive-section');
        if (incentiveSection) {
            incentiveSection.style.display = 'block';
        }

        // now scroll to the business info section
        businessInfoSection.scrollIntoView({behavior: 'smooth'});
    } catch (error) {
        console.error("Error in handleBusinessSection: " + error);
        alert("There was an error selecting the business: " + error.message);
    }
}

/**
 * Function to populate business fields
 * @param {Object} business - Business object
 */
function populateBusinessInfo(business) {
    if (!business) {
        console.error("No business data provided to populateBusinessInfo");
        return;
    }

    try {
        // set the values for all business fields if they exist
        const bnameField = document.getElementById('bname');
        if (bnameField) bnameField.value = business.bname || '';

        const address1Field = document.getElementById('address1');
        if (address1Field) address1Field.value = business.address1 || '';

        const address2Field = document.getElementById('address2');
        if (address2Field) address2Field.value = business.address2 || '';

        const cityField = document.getElementById('city');
        if (cityField) cityField.value = business.city || '';

        const zipField = document.getElementById('zip');
        if (zipField) zipField.value = business.zip || '';

        const phoneField = document.getElementById('phone');
        if (phoneField) phoneField.value = business.phone || '';

        // for the select statements of state and business type
        // they are set differently
        const stateSelect = document.getElementById('state');
        if (stateSelect) {
            const stateValue = business.state || '';
            for (let i = 0; i < stateSelect.options.length; i++) {
                if (stateSelect.options[i].value === stateValue) {
                    stateSelect.selectedIndex = i;
                    break;
                }
            }
        }

        const typeSelect = document.getElementById('type');
        if (typeSelect) {
            const typeValue = business.type || '';
            for (let i = 0; i < typeSelect.options.length; i++) {
                if (typeSelect.options[i].value === typeValue) {
                    typeSelect.selectedIndex = i;
                    break;
                }
            }
        }

        console.log("Business info populated successfully");
    } catch (error) {
        console.error("Error in populateBusinessInfo: " + error);
    }
}

/**
 * Field validation function
 * @param {string} value - Field value
 * @returns {boolean} True if valid
 */
function isNotEmpty(value) {
    return value.trim() !== '';
}

/**
 * Apply validation styling to a field
 * @param {HTMLElement} field - Form field
 * @param {Function} validationFn - Validation function
 */
function validateField(field, validationFn) {
    console.log(`Validating ${field.id} with value: ${field.value}`);

    if (validationFn(field.value)) {
        field.classList.remove('invalid-field');
        field.classList.add('valid-field');
        field.setAttribute('data-valid', 'true');
        console.log(`${field.id} is VALID`);
    } else {
        field.classList.remove('valid-field');
        field.classList.add('invalid-field');
        field.setAttribute('data-valid', 'false');
        console.log(`${field.id} is INVALID`);
    }
}

/**
 * Get base URL based on environment
 * @returns {string} Base URL
 */
function getBaseURL() {
    return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? `https://${window.location.host}`
        : `https://patriotthanks.vercel.app`;
}

// /**
//  * Load Google Maps script with API key
//  */
// function loadGoogleMapsScript() {
//     // Get API key
//     const apiKey = 'AIzaSyCHKhYZwQR37M_0QctXUQe6VFRFrlhaYj8';
//     const mapId = CONFIG.mapId;
//
//     console.log("Loading Google Maps with Map ID:", mapId);
//
//     // Create and insert the Google Maps script with all recommended parameters
//     const script = document.createElement('script');
//     script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&map_ids=${mapId}&libraries=places,geometry,marker&callback=initGoogleMap&loading=async`;
//     script.async = true;
//     script.defer = true;
//     script.onerror = function() {
//         console.error('Google Maps API failed to load. Check your API key.');
//         alert('Error loading Google Maps. Please try again later.');
//     };
//     document.head.appendChild(script);
// }

/**
 * Initialize business search functionality
 */
function initBusinessSearch() {
    console.log("Business search with Google Maps loaded!");

    // Get form elements
    const form = {
        businessName: document.getElementById("business-name"),
        address: document.getElementById("address"),
    };

    // Get the form element
    const findBusiness = document.getElementById("business-search-form");

    // Modify the form submission handler to check map initialization
    if (findBusiness) {
        findBusiness.addEventListener('submit', function (event) {
            // Prevent the form from submitting immediately
            event.preventDefault();

            // Only require at least one search field to be filled
            if (!isNotEmpty(form.businessName.value) && !isNotEmpty(form.address.value)) {
                alert("Please enter either a business name or address to search");
            } else {
                const formData = {
                    businessName: form.businessName.value,
                    address: form.address.value,
                };

                console.log("Form data to submit:", formData);

                // Check if map is initialized
                if (!mapInitialized) {
                    console.warn("Map not initialized yet. Will display businesses after map loads.");
                }

                // Clear existing map markers
                clearMarkers();

                // Remove initial map message if it exists
                const initialMessage = document.getElementById('initial-map-message');
                if (initialMessage) {
                    initialMessage.remove();
                }

                // Submit the data to MongoDB
                retrieveFromMongoDB(formData);
            }
        });
    } else {
        console.warn("Business search form not found in the DOM");
    }

    // Add input event listeners for visual feedback if form elements exist
    if (form.businessName) {
        form.businessName.addEventListener('input', function () {
            validateField(this, isNotEmpty);
        });
    }

    if (form.address) {
        form.address.addEventListener('input', function () {
            validateField(this, isNotEmpty);
        });
    }
}

/**
 * Retrieve businesses from MongoDB
 * @param {Object} formData - Form data
 */
async function retrieveFromMongoDB(formData) {
    try {
        // Only include non-empty parameters in the query
        const params = {};
        if (formData.businessName && formData.businessName.trim() !== '') {
            params.business_name = formData.businessName;
        }
        if (formData.address && formData.address.trim() !== '') {
            params.address = formData.address;
        }

        const queryParams = new URLSearchParams(params).toString();

        // Determine the base URL
        const baseURL = getBaseURL();

        // Use the API endpoint with the baseURL
        const apiURL = `${baseURL}/api/business.js?operation=search&${queryParams}`;
        console.log("Submitting search to API at: ", apiURL);

        const res = await fetch(apiURL, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json; charset=UTF-8',
            }
        });

        console.log("Response status: ", res.status);

        if (!res.ok) {
            const errorText = await res.text();
            console.error("Error response: ", errorText);
            throw new Error(`Failed to retrieve data from MongoDB: ${res.status} ${errorText}`);
        }

        const data = await res.json();
        console.log("Search results:", data);

        // Check if data and data.results exist before proceeding
        if (!data || !data.results) {
            console.error("Invalid response format - missing results property");
            throw new Error("Invalid response format from server");
        }

        // Check the page to make sure the results display properly
        if (document.getElementById('search_table')) {
            // We are on the business-search.html page
            displaySearchResults(data.results);

            // Also display results on the map
            displayBusinessesOnMap(data.results);
        } else {
            // If on the incentive-add.html or incentive-view.html pages
            let resultsContainer = document.getElementById('business-search-results');

            if (!resultsContainer) {
                // Create the container if it doesn't exist
                resultsContainer = document.createElement('div');
                resultsContainer.id = 'business-search-results';

                // Decide where to insert the container
                const firstFieldset = document.querySelector('fieldset');
                if (firstFieldset) {
                    firstFieldset.parentNode.insertBefore(resultsContainer, firstFieldset.nextSibling);
                } else {
                    const main = document.querySelector('main');
                    if (main) {
                        main.appendChild(resultsContainer);
                    } else {
                        // If nothing else, just append the body
                        document.body.appendChild(resultsContainer);
                    }
                }

                console.log("Created business-search-results container");
            }
            displayBusinessSearchResults(data.results, resultsContainer);
        }
    } catch (error) {
        console.error("Error: ", error);
        // Show an error message to the user
        let errorContainer;

        if (document.getElementById('search_table')) {
            errorContainer = document.getElementById('search_table');
        } else {
            errorContainer = document.getElementById('business-search-results');
            if (!errorContainer) {
                errorContainer = document.createElement('div');
                errorContainer.id = 'business-search-results';
                const firstFieldset = document.querySelector('fieldset');
                if (firstFieldset) {
                    firstFieldset.parentNode.insertBefore(errorContainer, firstFieldset.nextSibling);
                } else {
                    document.body.appendChild(errorContainer);
                }
            }
        }

        errorContainer.innerHTML = `<div class="error">Search failed: ${error.message}</div>`;
        errorContainer.style.display = 'block';

        // Scroll to the error message
        errorContainer.scrollIntoView({behavior: 'smooth'});
    }
}

/**
 * Initialize Google Map - globally accessible function called by Google Maps API
 */
window.initGoogleMap = async function() {
    console.log("Global initGoogleMap function called");

    try {
        // Check if map container exists
        const mapContainer = document.getElementById("map");
        if (!mapContainer) {
            console.error("Map container not found in the DOM");
            return;
        }

        // Import required libraries
        const { Map } = await google.maps.importLibrary("maps");
        const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");

        // Create a map centered on the US with POI clicks disabled
        map = new Map(mapContainer, {
            center: CONFIG.defaultCenter,
            zoom: CONFIG.defaultZoom,
            mapId: CONFIG.mapId,
            clickableIcons: false  // Disable clickable POIs
        });

        // Create info window and bounds
        infoWindow = new google.maps.InfoWindow();
        bounds = new google.maps.LatLngBounds();

        // Add initial message
        addInitialMapMessage(mapContainer);

        // Add event listener for the reset map button
        setupResetMapButton();

        // Set flag that map is initialized
        mapInitialized = true;
        console.log("Google Map successfully initialized with Map ID:", CONFIG.mapId);

        // Process any pending businesses to display
        if (pendingBusinessesToDisplay.length > 0) {
            console.log("Processing pending businesses to display on map");
            displayBusinessesOnMap(pendingBusinessesToDisplay);
            pendingBusinessesToDisplay = [];
        }

        // Setup map handlers
        await setupMapClickHandler();
        setupMarkerClickPriority();

        // Schedule image loading for markers after a short delay
        setTimeout(() => initImageLoading(), 1500);

    } catch (error) {
        console.error("Error initializing Google Map:", error);
        mapInitialized = false;

        // Show user-friendly error message
        const mapContainer = document.getElementById("map");
        if (mapContainer) {
            mapContainer.innerHTML = `
        <div style="text-align: center; padding: 20px;">
          <p>Sorry, we couldn't load the map. Please try refreshing the page.</p>
          <p>Error: ${error.message}</p>
        </div>
      `;
        }
    }
};

/**
 * Add initial message to map
 * @param {HTMLElement} mapContainer - The map container element
 */
function addInitialMapMessage(mapContainer) {
    const initialMessage = document.createElement('div');
    initialMessage.id = 'initial-map-message';
    initialMessage.innerHTML = 'Search for businesses to see them on the map';
    initialMessage.style.position = 'absolute';
    initialMessage.style.top = '50%';
    initialMessage.style.left = '50%';
    initialMessage.style.transform = 'translate(-50%, -50%)';
    initialMessage.style.background = 'white';
    initialMessage.style.padding = '10px';
    initialMessage.style.borderRadius = '5px';
    initialMessage.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
    initialMessage.style.zIndex = '1';

    mapContainer.appendChild(initialMessage);
}

/**
 * Setup the reset map button
 */
function setupResetMapButton() {
    const resetMapButton = document.getElementById('reset-map');
    if (resetMapButton) {
        resetMapButton.addEventListener('click', resetMapView);
    }
}

/**
 * Function to focus on a specific marker for a business
 * @param {string} businessId - The business ID to focus on
 */
window.focusOnMapMarker = function(businessId) {
    console.log("focusOnMapMarker called for business ID:", businessId);

    // Check if map is initialized
    if (!mapInitialized || !map) {
        console.error("Map not initialized yet - cannot focus on marker");
        alert("Map is still loading. Please try again in a moment.");
        return;
    }

    // Check if markers exist
    if (!markers || markers.length === 0) {
        console.warn("No markers available yet.");
        alert("No businesses are currently displayed on the map.");
        return;
    }

    // Find the marker for this business
    const marker = markers.find(m => m.business && m.business._id === businessId);

    if (marker) {
        // Center the map on this marker
        map.setCenter(marker.position);
        map.setZoom(16);

        // Open the info window for this marker
        showInfoWindow(marker);

        // Scroll to the map
        document.getElementById('map').scrollIntoView({behavior: 'smooth'});

        console.log("Successfully focused on marker for business:", businessId);
    } else {
        console.warn(`No marker found for business ID: ${businessId}`);
        alert("This business could not be located on the map. It may not have a complete address.");
        document.getElementById('map').scrollIntoView({behavior: 'smooth'});
    }
};

/**
 * Reset map view to default
 */
function resetMapView() {
    if (!mapInitialized || !map) {
        console.error("Cannot reset map view - map not initialized");
        return;
    }

    // Center on US and zoom out
    map.setCenter(CONFIG.defaultCenter);
    map.setZoom(CONFIG.defaultZoom);

    // Close any open info windows
    if (infoWindow) {
        infoWindow.close();
    }
}

/**
 * Setup handler for map clicks
 */
async function setupMapClickHandler() {
    if (!map) {
        console.error("Map not initialized in setupMapClickHandler");
        return;
    }

    console.log("Setting up map click handler");

    try {
        // Import the Places library
        const { Place } = await google.maps.importLibrary("places");

        // Listen for POI clicks (Points of Interest - businesses, landmarks, etc.)
        map.addListener('click', async function(event) {
            console.log("Map clicked", event);

            // Check if clicked on a POI (a place on the map)
            if (event.placeId) {
                event.stop(); // Prevent the default info window

                console.log("POI clicked, placeId:", event.placeId);

                try {
                    // Create a Place instance with the clicked place ID
                    const place = new Place({
                        id: event.placeId
                    });

                    // Fetch the place details using the new API
                    await place.fetchFields({
                        fields: [
                            'displayName',
                            'formattedAddress',
                            'location',
                            'types',
                            'businessStatus',
                            'nationalPhoneNumber'
                        ]
                    });

                    console.log("Place details:", place);

                    // Show custom info window with "Add to Database" option
                    showPlaceInfoWindow(place, event.latLng);
                } catch (error) {
                    console.error("Error fetching place details:", error);
                }
            }
        });

        console.log("Map click handler set up");
    } catch (error) {
        console.error("Error setting up map click handler:", error);
    }
}

/**
 * Setup marker click priority over POIs
 */
function setupMarkerClickPriority() {
    // Skip if map isn't ready
    if (!map) {
        console.error("Map not initialized, cannot set up click priority");
        return;
    }

    console.log("Setting up marker click priority");

    // Create a listener for map clicks to intercept POI clicks
    map.addListener('click', function(event) {
        // Check if the click event has a placeId (indicating it's a POI)
        if (event.placeId) {
            // Find if any of our markers are near this click location
            const clickPoint = event.latLng;

            // Find if any of our markers are within a small radius (15 pixels on screen)
            const pixelRadius = 15;

            // Convert lat/lng to pixel coordinates
            const scale = Math.pow(2, map.getZoom());
            const projection = map.getProjection();
            const bounds = map.getBounds();

            if (!projection || !bounds) return;

            const ne = bounds.getNorthEast();
            const sw = bounds.getSouthWest();
            const worldWidth = projection.fromLatLngToPoint(ne).x - projection.fromLatLngToPoint(sw).x;
            const pixelsPerLngDegree = worldWidth / (ne.lng() - sw.lng());

            // Check each marker
            for (const marker of markers) {
                if (!marker.position) continue;

                // Get marker position
                const markerLat = typeof marker.position.lat === 'function' ?
                    marker.position.lat() : marker.position.lat;
                const markerLng = typeof marker.position.lng === 'function' ?
                    marker.position.lng() : marker.position.lng;

                const clickLat = clickPoint.lat();
                const clickLng = clickPoint.lng();

                // Convert coordinate difference to approximate pixels
                const latDiffInPixels = Math.abs(markerLat - clickLat) *
                    pixelsPerLngDegree * 111000 / (scale * Math.cos(markerLat * Math.PI / 180));
                const lngDiffInPixels = Math.abs(markerLng - clickLng) * pixelsPerLngDegree;

                const pixelDistance = Math.sqrt(
                    Math.pow(latDiffInPixels, 2) +
                    Math.pow(lngDiffInPixels, 2)
                );

                // If click is near our marker, stop event propagation
                if (pixelDistance < pixelRadius) {
                    console.log("Preventing POI click near our marker");
                    event.stop(); // Stop the event from being processed by Google Maps

                    // Trigger our own marker click
                    setTimeout(() => {
                        showInfoWindow(marker);
                    }, 10);

                    return;
                }
            }
        }
    });

    console.log("Marker click priority setup complete");
}

/**
 * Function to initialize image loading for markers
 */
function initImageLoading() {
    // Call this after markers are created
    if (!mapInitialized || markers.length === 0) {
        console.log("Map not initialized or no markers, delaying image loading");
        setTimeout(initImageLoading, CONFIG.imageLoadDelay);
        return;
    }

    console.log("Starting image loading for markers");
    enhanceMarkersWithImages();
}

/**
 * Display businesses on the map
 * @param {Array} businesses - Array of business objects to display
 */
function displayBusinessesOnMap(businesses) {
    // If map is not ready yet, store businesses for later display
    if (!mapInitialized || !map) {
        console.log("Map not initialized yet. Storing businesses for later display.");
        pendingBusinessesToDisplay = businesses;
        return;
    }

    console.log("Displaying businesses on map:", businesses.length);

    if (!Array.isArray(businesses) || businesses.length === 0) {
        console.log("No businesses to display on map");
        // Center the map on the US and zoom out
        map.setCenter(CONFIG.defaultCenter);
        map.setZoom(CONFIG.defaultZoom);
        return;
    }

    // Clear existing markers
    clearMarkers();
    bounds = new google.maps.LatLngBounds();

    // Process each business
    businesses.forEach((business, index) => {
        // Geocode the business address to get coordinates
        geocodeBusinessAddress(business, index, businesses.length);
    });
}

/**
 * Function to enhance markers with images
 */
async function enhanceMarkersWithImages() {
    // Only process if we have markers
    if (!markers || markers.length === 0) return;

    console.log("Enhancing markers with images...");

    for (const marker of markers) {
        if (!marker.business) continue;

        // Skip if business already has an image
        if (marker.business.image_url) continue;

        // Try to get an image for the business
        const imageUrl = await fetchPlacePhotosForBusiness(marker.business);

        if (imageUrl) {
            // Update the business object
            marker.business.image_url = imageUrl;

            // Update the marker with the new image
            updateMarkerWithImage(marker, imageUrl);
        }
    }
}

/**
 * Geocode a business address to get coordinates
 * @param {Object} business - Business object with address data
 * @param {number} index - Index of the business in the array
 * @param {number} total - Total number of businesses
 */
function geocodeBusinessAddress(business, index, total) {
    if (!business || !business.address1) {
        console.error("Invalid business data for geocoding", business);
        return;
    }

    // Construct the address string
    const addressString = `${business.address1}, ${business.city}, ${business.state} ${business.zip}`;

    // Create a geocoder
    const geocoder = new google.maps.Geocoder();

    // Add a small delay to avoid hitting geocoding rate limits
    setTimeout(() => {
        geocoder.geocode({'address': addressString}, function (results, status) {
            if (status === google.maps.GeocoderStatus.OK) {
                if (results[0]) {
                    const location = results[0].geometry.location;

                    // Create marker
                    addAdvancedMarker(business, location);

                    // Extend bounds
                    bounds.extend(location);

                    // If this is the last business, fit the map to the bounds
                    if (index === total - 1) {
                        map.fitBounds(bounds);

                        // If we only have one marker, zoom in appropriately
                        if (total === 1) {
                            map.setZoom(15);
                        }

                        // Search for nearby businesses if we have at least one result
                        if (total >= 1) {
                            // Use the current business instead of trying to access the businesses array
                            searchNearbyBusinesses(location, business.type);
                        }
                    }
                }
            } else {
                console.error("Geocode failed for address " + addressString + ": " + status);
            }
        });
    }, index * CONFIG.geocodeDelay); // Stagger requests
}

/**
 * Add an advanced marker to the map
 * @param {Object} business - Business object
 * @param {Object} location - Google Maps location object
 */
async function addAdvancedMarker(business, location) {
    try {
        // Import the marker library
        const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");

        // Create a position object from the location
        const position = { lat: location.lat(), lng: location.lng() };

        // Determine marker color based on whether it's a primary result or nearby result
        const isNearby = business.isNearby === true;
        const pinColor = isNearby ? CONFIG.markerColors.nearby : CONFIG.markerColors.primary;

        // Create a business type icon
        const businessIcon = getBusinessTypeIcon(business.type);

        // Create a pin element with an icon or image
        const pinElement = document.createElement('div');
        pinElement.className = 'custom-marker';
        pinElement.style.cursor = 'pointer';
        pinElement.style.zIndex = '1000'; // Higher z-index to prevent POI clicks

        // Different marker styles based on whether we have an image or not
        if (business.image_url) {
            // With business image
            pinElement.innerHTML = `
        <div class="marker-container">
          <div class="marker-pin" style="background-color: ${pinColor};">
            <div class="marker-image-container">
              <img src="${business.image_url}" alt="${business.bname}" class="marker-image">
            </div>
          </div>
          <div class="marker-shadow"></div>
        </div>
      `;
        } else {
            // With business type icon
            pinElement.innerHTML = `
        <div class="marker-container">
          <div class="marker-pin" style="background-color: ${pinColor};">
            <div class="marker-icon">
              ${businessIcon}
            </div>
          </div>
          <div class="marker-shadow"></div>
        </div>
      `;
        }

        // Create the advanced marker
        const marker = new AdvancedMarkerElement({
            position: position,
            map: map,
            title: business.bname,
            content: pinElement,
            collisionBehavior: isNearby ? 'OPTIONAL_AND_HIDES_LOWER_PRIORITY' : 'REQUIRED'
        });

        // Store the business data with the marker
        marker.business = business;
        marker.isNearby = isNearby;

        // Add click event listener using a single approach for efficiency
        pinElement.addEventListener('click', function(e) {
            console.log("Marker element clicked:", business.bname);
            // Stop propagation to prevent Google POI clicks
            e.stopPropagation();
            showInfoWindow(marker);
        });

        // Add the marker to our array
        markers.push(marker);
        console.log(`Added advanced marker for ${business.bname}`);

        return marker;
    } catch (error) {
        console.error("Error creating advanced marker:", error);
        return null;
    }
}

/**
 * Get an icon based on business type
 * @param {string} type - Business type code
 * @returns {string} HTML for the icon
 */
function getBusinessTypeIcon(type) {
    // Map business types to Font Awesome or other icons
    const iconMap = {
        'AUTO': '<i class="fa fa-car" aria-hidden="true"></i>',
        'BEAU': '<i class="fa fa-scissors" aria-hidden="true"></i>',
        'BOOK': '<i class="fa fa-book" aria-hidden="true"></i>',
        'CLTH': '<i class="fa fa-shopping-bag" aria-hidden="true"></i>',
        'CONV': '<i class="fa fa-shopping-basket" aria-hidden="true"></i>',
        'DEPT': '<i class="fa fa-building" aria-hidden="true"></i>',
        'ELEC': '<i class="fa fa-laptop" aria-hidden="true"></i>',
        'ENTR': '<i class="fa fa-film" aria-hidden="true"></i>',
        'FURN': '<i class="fa fa-bed" aria-hidden="true"></i>',
        'FUEL': '<i class="fa fa-gas-pump" aria-hidden="true"></i>',
        'GIFT': '<i class="fa fa-gift" aria-hidden="true"></i>',
        'GROC': '<i class="fa fa-shopping-cart" aria-hidden="true"></i>',
        'HARDW': '<i class="fa fa-hammer" aria-hidden="true"></i>',
        'HEAL': '<i class="fa fa-heartbeat" aria-hidden="true"></i>',
        'JEWL': '<i class="fa fa-gem" aria-hidden="true"></i>',
        'OTHER': '<i class="fa fa-store" aria-hidden="true"></i>',
        'RX': '<i class="fa fa-prescription-bottle" aria-hidden="true"></i>',
        'REST': '<i class="fa fa-utensils" aria-hidden="true"></i>',
        'RETAIL': '<i class="fa fa-shopping-bag" aria-hidden="true"></i>',
        'SERV': '<i class="fa fa-concierge-bell" aria-hidden="true"></i>',
        'SPEC': '<i class="fa fa-star" aria-hidden="true"></i>',
        'SPRT': '<i class="fa fa-futbol" aria-hidden="true"></i>',
        'TECH': '<i class="fa fa-microchip" aria-hidden="true"></i>',
        'TOYS': '<i class="fa fa-gamepad" aria-hidden="true"></i>'
    };

    // Return the icon or a default icon if type not found
    return iconMap[type] || '<i class="fa fa-store" aria-hidden="true"></i>';
}

/**
 * Fetch photos for a business from Google Places API using the current API
 * @param {Object} business - Business object
 * @returns {Promise<string|null>} Photo URL or null if not found
 */
async function fetchPlacePhotosForBusiness(business) {
    if (!business) {
        console.log("No business data provided");
        return null;
    }

    try {
        // Check cache first
        const cacheKey = business._id || business.bname + business.address1;
        if (placeCache.has(cacheKey)) {
            return placeCache.get(cacheKey);
        }

        // First try to get the placeId if we don't have one
        let placeId = business.placeId;

        if (!placeId) {
            // Try to find the place by search
            placeId = await findPlaceIdBySearch(business);
            if (placeId) {
                // Store it for future use
                business.placeId = placeId;
                console.log(`Found place ID for ${business.bname}: ${placeId}`);
            }
        }

        if (!placeId) {
            console.log(`No place ID found for ${business.bname}`);
            return null;
        }

        // Import the Places library
        const { Place } = await google.maps.importLibrary("places");

        console.log(`Fetching photos for ${business.bname} with place ID: ${placeId}`);

        // Create a Place instance
        const place = new Place({
            id: placeId
        });

        // Fetch place details including photos
        await place.fetchFields({
            fields: ['photos', 'displayName']
        });

        // If photos exist, get the first one
        if (place.photos && place.photos.length > 0) {
            console.log(`Found ${place.photos.length} photos for ${business.bname}`);

            // Get the first photo's reference
            const photo = place.photos[0];

            console.log("Photo object structure:", JSON.stringify(photo).substring(0, 200) + "...");

            try {
                // Attempt to use the new Google Maps Static API to get photo URL
                // This builds the URL to the Google Maps Static API with your API key
                const apiKey = window.appConfig.googleMapsApiKey;

                // Check if photo has a name property (reference)
                if (photo.name) {
                    const photoReference = photo.name;
                    const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=100&maxheight=100&photo_reference=${photoReference}&key=${apiKey}`;
                    console.log(`Generated photo URL for ${business.bname} using reference`);
                    placeCache.set(cacheKey, photoUrl);
                    return photoUrl;
                } else if (photo.reference) {
                    // Some versions might use reference directly
                    const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=100&maxheight=100&photo_reference=${photo.reference}&key=${apiKey}`;
                    console.log(`Generated photo URL for ${business.bname} using reference`);
                    placeCache.set(cacheKey, photoUrl);
                    return photoUrl;
                }
                // If we get here, we couldn't find a usable photo reference
                // Fall back to default icon
                console.log(`No usable photo reference found for ${business.bname}`);
            } catch (photoError) {
                console.error(`Error accessing photo for ${business.bname}:`, photoError);
            }
        }

        // Default icon fallback
        const defaultPhotoUrl = `https://maps.gstatic.com/mapfiles/place_api/icons/v1/png_71/generic_business-71.png`;
        placeCache.set(cacheKey, defaultPhotoUrl);
        console.log(`Using default photo for ${business.bname}`);
        return defaultPhotoUrl;
    } catch (error) {
        console.error(`Error fetching photos for ${business ? business.bname : 'unknown'}:`, error);
        // Default icon fallback on error
        const defaultPhotoUrl = `https://maps.gstatic.com/mapfiles/place_api/icons/v1/png_71/generic_business-71.png`;
        if (business) {
            const cacheKey = business._id || business.bname + business.address1;
            placeCache.set(cacheKey, defaultPhotoUrl);
        }
        return defaultPhotoUrl;
    }
}


/**
 * Find a place ID by searching Google Places API using the newer Place.searchByText API
 * @param {Object} business - Business object
 * @returns {Promise<string|null>} Place ID or null if not found
 */
async function findPlaceIdBySearch(business) {
    if (!business || !business.bname) return null;

    try {
        // Import the Places library
        const { Place } = await google.maps.importLibrary("places");

        // Create the search query - business name + address
        const query = `${business.bname} ${business.address1} ${business.city} ${business.state} ${business.zip}`;
        console.log(`Searching for place with query: ${query}`);

        // Use the new Place.searchByText API instead of PlacesService
        const searchResults = await Place.searchByText({
            textQuery: query,
            fields: ['id', 'displayName', 'formattedAddress']
        });

        if (searchResults && searchResults.places && searchResults.places.length > 0) {
            const placeId = searchResults.places[0].id;
            console.log(`Found place for ${business.bname}: ${placeId}`);
            return placeId;
        } else {
            console.log(`No place found for query: ${query}`);
            return null;
        }
    } catch (error) {
        console.error("Error finding place ID:", error);
        return null;
    }
}

/**
 * Update an existing marker with an image
 * @param {Object} marker - Marker object
 * @param {string} imageUrl - URL of the image
 */
function updateMarkerWithImage(marker, imageUrl) {
    if (!marker || !marker.content) return;

    const business = marker.business;
    if (!business) return;

    const isNearby = business.isNearby === true;
    const pinColor = isNearby ? CONFIG.markerColors.nearby : CONFIG.markerColors.primary;

    // Create new content with the image
    const pinElement = document.createElement('div');
    pinElement.className = 'custom-marker';
    pinElement.style.cursor = 'pointer';
    pinElement.style.zIndex = '1000';

    pinElement.innerHTML = `
    <div class="marker-container">
      <div class="marker-pin" style="background-color: ${pinColor};">
        <div class="marker-image-container">
          <img src="${imageUrl}" alt="${business.bname}" class="marker-image">
        </div>
      </div>
      <div class="marker-shadow"></div>
    </div>
  `;

    // Replace the old content
    marker.content = pinElement;

    // Re-add the click event listener
    pinElement.addEventListener('click', function(e) {
        console.log("Updated marker element clicked:", business.bname);
        e.stopPropagation();
        showInfoWindow(marker);
    });
}

/**
 * Show info window for a marker
 * @param {Object} marker - Marker object
 */
function showInfoWindow(marker) {
    console.log("showInfoWindow called with marker:", marker);

    if (!marker || !marker.business) {
        console.error("Invalid marker for info window", marker);
        return;
    }

    const business = marker.business;
    console.log("Business data for info window:", business);

    // Format address
    const addressLine = business.address2
        ? `${business.address1}<br>${business.address2}<br>${business.city}, ${business.state} ${business.zip}`
        : `${business.address1}<br>${business.city}, ${business.state} ${business.zip}`;

    // Get business type label
    const businessType = getBusinessTypeLabel(business.type);

    // Format phone number if available
    const phoneDisplay = business.phone
        ? `<p><strong>Phone:</strong> ${business.phone}</p>`
        : '';

    // Content for the info window
    const contentString = `
    <div class="info-window">
      <h3>${business.bname}</h3>
      <p><strong>Address:</strong><br>${addressLine}</p>
      ${phoneDisplay}
      <p><strong>Type:</strong> ${businessType}</p>
      <div id="info-window-incentives-${business._id}">
        <p><strong>Incentives:</strong> <em>Loading...</em></p>
      </div>
      <div class="info-window-actions">
        <button class="view-details-btn" 
                onclick="window.viewBusinessDetails('${business._id}')">
          View Details
        </button>
      </div>
    </div>
  `;

    // Create info window if it doesn't exist
    if (!infoWindow) {
        infoWindow = new google.maps.InfoWindow();
    }

    // Set content and open with modern approach using an options object
    infoWindow.setContent(contentString);
    infoWindow.open({
        map: map,
        anchor: marker,
        shouldFocus: false
    });

    console.log("Opened info window for marker using anchor method");

    // Fetch incentives for this business
    fetchBusinessIncentivesForInfoWindow(business._id);
}

/**
 * Search for nearby businesses of similar type
 * @param {Object} location - Center location for the search
 * @param {string} businessType - Type of business to search for
 */
function searchNearbyBusinesses(location, businessType) {
    // This function would typically use the Google Places API
    // For now, we'll implement a simpler version using our existing data

    console.log("Searching for nearby businesses near", location.lat(), location.lng());

    // Determine the base URL
    const baseURL = getBaseURL();

    // We'll search for businesses of the same type in the database
    const apiURL = `${baseURL}/api/business.js?operation=search&type=${businessType}`;

    fetch(apiURL)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to fetch nearby businesses: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (!data.results || data.results.length === 0) {
                console.log("No additional nearby businesses found");
                return;
            }

            console.log(`Found ${data.results.length} potential nearby businesses`);

            // Filter out businesses that are already on the map (to avoid duplicates)
            const existingBusinessIds = markers.map(marker => marker.business._id);
            const newBusinesses = data.results.filter(business =>
                !existingBusinessIds.includes(business._id)
            );

            console.log(`${newBusinesses.length} new businesses to add to map`);

            // Add the new businesses to the map
            newBusinesses.forEach((business, index) => {
                // We'll need to geocode these addresses
                setTimeout(() => {
                    geocodeNearbyBusiness(business, location);
                }, index * CONFIG.geocodeDelay); // Stagger requests
            });
        })
        .catch(error => {
            console.error("Error searching for nearby businesses:", error);
        });
}

/**
 * Geocode a nearby business address
 * @param {Object} business - Business object
 * @param {Object} centerLocation - Center location for distance calculation
 */
function geocodeNearbyBusiness(business, centerLocation) {
    if (!business || !business.address1) {
        return;
    }

    const addressString = `${business.address1}, ${business.city}, ${business.state} ${business.zip}`;
    const geocoder = new google.maps.Geocoder();

    geocoder.geocode({'address': addressString}, function (results, status) {
        if (status === google.maps.GeocoderStatus.OK && results[0]) {
            const location = results[0].geometry.location;

            // Calculate distance from center location
            const distance = google.maps.geometry.spherical.computeDistanceBetween(
                centerLocation,
                location
            );

            // Only add if within configured distance
            if (distance <= CONFIG.maxNearbyDistance) {
                // Mark this as a nearby business
                business.isNearby = true;

                // Add marker with different color to distinguish from search results
                addAdvancedMarker(business, location);
            }
        }
    });
}

// Initialize when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize business search functionality
    initBusinessSearch();
});
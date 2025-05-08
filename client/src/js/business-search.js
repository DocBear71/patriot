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
 * Show info window for places not in your database (with scrollable content)
 * @param {Object} place - Google Place object
 * @param {Object} position - Position for the info window
 */
function showPlaceInfoWindow(place, position) {
    // Create info window if it doesn't exist
    if (!infoWindow) {
        infoWindow = new google.maps.InfoWindow({
            maxWidth: 320,
            disableAutoPan: false
        });
    }

    // Get type label
    const placeTypeLabel = getPlaceTypeLabel(place.types);

    // Format the content with an "Add to Database" button and scrollable area
    const contentString = `
    <div class="info-window-wrapper">
      <div class="info-window-header">
        <h3>${place.displayName || 'Unnamed Place'}</h3>
      </div>
      <div class="info-window-content">
        <div class="info-window-scrollable">
          <p><strong>Address:</strong><br>${place.formattedAddress || 'Address not available'}</p>
          ${place.nationalPhoneNumber ? `<p><strong>Phone:</strong> ${place.nationalPhoneNumber}</p>` : ''}
          <p><strong>Type:</strong> ${placeTypeLabel}</p>
          <p>This business is not yet in the Patriot Thanks database.</p>
        </div>
      </div>
      <div class="info-window-footer">
        <button class="view-details-btn" 
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

    // Apply scrollable styles
    applyInfoWindowScrollableStyles();
}

/**
 * Get the user's current location
 * @returns {Promise<{lat: number, lng: number}>} Location coordinates
 */
function getUserLocation() {
    return new Promise((resolve, reject) => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                position => {
                    const userLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    console.log("Got user location:", userLocation);
                    resolve(userLocation);
                },
                error => {
                    console.warn("Error getting location:", error);
                    reject(error);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 5000,
                    maximumAge: 0
                }
            );
        } else {
            console.warn("Geolocation not supported by this browser");
            reject(new Error("Geolocation not supported"));
        }
    });
}

/**
 * Reverse geocode coordinates to get address
 * @param {Object} location - Object with lat and lng properties
 * @returns {Promise<string>} Formatted address
 */
async function reverseGeocode(location) {
    try {
        const geocoder = new google.maps.Geocoder();

        return new Promise((resolve, reject) => {
            geocoder.geocode({ 'location': location }, (results, status) => {
                if (status === google.maps.GeocoderStatus.OK) {
                    if (results[0]) {
                        console.log("Reverse geocoded address:", results[0].formatted_address);
                        resolve(results[0].formatted_address);
                    } else {
                        reject(new Error("No results found"));
                    }
                } else {
                    reject(new Error(`Geocoder failed due to: ${status}`));
                }
            });
        });
    } catch (error) {
        console.error("Error reverse geocoding:", error);
        return null;
    }
}

/**
 * Add some CSS to style the markers properly
 */
function addCustomMarkerStyles() {
    if (!document.getElementById('custom-marker-css')) {
        const style = document.createElement('style');
        style.id = 'custom-marker-css';
        style.textContent = `
            .custom-marker {
                cursor: pointer;
            }
            .marker-pin {
                width: 32px;
                height: 40px;
                border-radius: 50% 50% 50% 0;
                background-color: #EA4335;
                transform: rotate(-45deg);
                display: flex;
                justify-content: center;
                align-items: center;
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            }
            .marker-icon {
                transform: rotate(45deg);
                display: flex;
                justify-content: center;
                align-items: center;
                width: 24px;
                height: 24px;
            }
            .info-window {
                padding: 10px;
                max-width: 300px;
            }
            .info-window h3 {
                margin-top: 0;
                margin-bottom: 10px;
                color: #212121;
            }
            .add-business-btn {
                background-color: #EA4335;
                color: white;
                border: none;
                padding: 8px 12px;
                border-radius: 4px;
                cursor: pointer;
                margin-top: 10px;
            }
            .add-business-btn:hover {
                background-color: #D32F2F;
            }
        `;
        document.head.appendChild(style);
    }
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
            placeId: place.id,

            // Store coordinates for later use
            lat: place.location?.lat || 0,
            lng: place.location?.lng || 0,
            // Add this for proper GeoJSON formatting
            location: {
                type: 'Point',
                coordinates: [
                    place.location?.lng || 0,
                    place.location?.lat || 0
                ]
            }
        };

        // Log the coordinates to verify they're correct
        console.log(`Place coordinates: ${businessData.lat}, ${businessData.lng}`);

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
        : window.location.origin;
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
        useMyLocation: document.getElementById("use-my-location")
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
    if (form.useMyLocation) {
        form.useMyLocation.addEventListener('change', function() {
            const locationStatus = document.getElementById('location-status');

            if (this.checked) {
                // Disable the address field if using location
                if (form.address) {
                    form.address.disabled = true;
                    form.address.placeholder = "Using your current location...";
                }

                if (locationStatus) {
                    locationStatus.textContent = 'Location will be used when you search';
                    locationStatus.style.display = 'block';
                    locationStatus.style.color = '#666';
                }
            } else {
                // Re-enable the address field
                if (form.address) {
                    form.address.disabled = false;
                    form.address.placeholder = "Address, City, State, or Zip";
                }

                if (locationStatus) {
                    locationStatus.style.display = 'none';
                }
            }
        });
    }
}

// Update the retrieveFromMongoDB function
async function retrieveFromMongoDB(formData) {
    try {
        // Show a loading indicator
        const resultsContainer = document.getElementById('business-search-results') ||
            document.getElementById('search_table');
        if (resultsContainer) {
            resultsContainer.innerHTML = '<div class="loading">Searching for businesses...</div>';
            resultsContainer.style.display = 'block';
        }

        // Only include non-empty parameters in the query
        const params = {};
        if (formData.businessName && formData.businessName.trim() !== '') {
            params.business_name = formData.businessName;
        }
        if (formData.address && formData.address.trim() !== '') {
            params.address = formData.address;
        }

        // Process location if needed (your existing location code)
        // ...

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

        // Check if we got any results from our database
        if (!data.results || data.results.length === 0) {
            console.log("No results in our database, searching Google Places...");

            // If no results, search Google Places API
            await searchGooglePlaces(formData);
        } else {
            // We have results from our database, display them
            if (document.getElementById('search_table')) {
                displaySearchResults(data.results);
                displayBusinessesOnMap(data.results);
            } else {
                let resultsContainer = document.getElementById('business-search-results');
                if (!resultsContainer) {
                    // Create container if needed
                    // ...your existing container creation code
                }
                displayBusinessSearchResults(data.results, resultsContainer);
            }
        }
    } catch (error) {
        console.error("Error: ", error);
        // Show error message
        // ...your existing error handling code
    }
}

/**
 * Search Google Places when no results found in our database
 * @param {Object} formData - Form data with search criteria
 */
async function searchGooglePlaces(formData) {
    try {
        console.log("Searching Google Places for:", formData);

        // Make sure the map is visible
        const mapContainer = document.getElementById('map');
        if (mapContainer) {
            mapContainer.style.display = 'block';
            mapContainer.style.height = '400px'; // Set a specific height
            console.log("Map container style:", mapContainer.style.display, mapContainer.style.height);
        }

        // Force map refresh if it's already initialized
        if (mapInitialized && map) {
            console.log("Triggering map resize event");
            google.maps.event.trigger(map, 'resize');
        }

        // Load the Places library if not already loaded
        const { PlacesService } = await google.maps.importLibrary("places");

        // Need a map or element for PlacesService
        const placesService = new PlacesService(document.getElementById('map'));

        // Build the search query based on form data
        let searchQuery = '';
        if (formData.businessName) {
            searchQuery += formData.businessName;
        }
        if (formData.address) {
            searchQuery += ' ' + formData.address;
        }

        // Create the request object
        const request = {
            query: searchQuery.trim(),
            fields: ['name', 'formatted_address', 'geometry', 'place_id', 'types']
        };

        // Perform the search
        placesService.findPlaceFromQuery(request, (results, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && results) {
                console.log("Google Places results:", results);

                // Convert Google Places results to your business format
                const businessResults = results.map(place => {
                    // Extract address components if available
                    let address1 = '';
                    let city = '';
                    let state = '';
                    let zip = '';

                    if (place.formatted_address) {
                        const addressParts = place.formatted_address.split(',');
                        if (addressParts.length >= 1) {
                            address1 = addressParts[0].trim();
                        }
                        if (addressParts.length >= 2) {
                            city = addressParts[1].trim();
                        }
                        if (addressParts.length >= 3) {
                            const stateZip = addressParts[2].trim().split(' ');
                            if (stateZip.length >= 1) {
                                state = stateZip[0].trim();
                            }
                            if (stateZip.length >= 2) {
                                zip = stateZip[1].trim();
                            }
                        }
                    }

                    // Map Google place types to your business types
                    let businessType = 'OTHER';
                    if (place.types) {
                        if (place.types.includes('restaurant')) businessType = 'REST';
                        else if (place.types.includes('store')) businessType = 'RETAIL';
                        else if (place.types.includes('hardware_store')) businessType = 'HARDW';
                        // Add more type mappings as needed
                    }

                    // Create a business object with Google Place data
                    return {
                        _id: 'google_' + place.place_id, // Prefix to indicate it's from Google
                        bname: place.name,
                        address1: address1,
                        city: city,
                        state: state,
                        zip: zip,
                        type: businessType,
                        phone: '', // Phone not included in basic results
                        isGooglePlace: true, // Flag to indicate this is from Google Places
                        placeId: place.place_id,
                        location: {
                            type: 'Point',
                            coordinates: [
                                place.geometry.location.lng(),
                                place.geometry.location.lat()
                            ]
                        },
                        lat: place.geometry.location.lat(),
                        lng: place.geometry.location.lng()
                    };
                });

                // Display the Google Places results
                if (document.getElementById('search_table')) {
                    // Add a notification that these are Google Places results
                    const searchTableContainer = document.getElementById('search_table');
                    if (searchTableContainer) {
                        const notification = document.createElement('div');
                        notification.className = 'google-places-notification';
                        notification.innerHTML = 'The following businesses were found in Google Maps but are not yet in our database. Click "Add to Patriot Thanks" to add them.';
                        notification.style.padding = '10px';
                        notification.style.backgroundColor = '#f8f9fa';
                        notification.style.border = '1px solid #ddd';
                        notification.style.borderRadius = '5px';
                        notification.style.marginBottom = '15px';

                        searchTableContainer.appendChild(notification);
                    }

                    displayGoogleSearchResults(businessResults);
                    displayBusinessesOnMap(businessResults);
                } else {
                    let resultsContainer = document.getElementById('business-search-results');
                    if (!resultsContainer) {
                        // Create container if needed
                        // ...your existing container creation code
                    }
                    displayGoogleSearchResults(businessResults, resultsContainer);
                }
            } else {
                console.log("No results found in Google Places or error:", status);

                // Show no results message
                const searchTableContainer = document.getElementById('search_table');
                if (searchTableContainer) {
                    const tableBody = searchTableContainer.querySelector('tbody');
                    if (tableBody) {
                        tableBody.innerHTML = '<tr><td colspan="5" class="text-center">No businesses found matching your search criteria in our database or Google Maps.</td></tr>';
                    }
                    searchTableContainer.style.display = 'block';
                    searchTableContainer.scrollIntoView({behavior: 'smooth'});
                } else {
                    const resultsContainer = document.getElementById('business-search-results');
                    if (resultsContainer) {
                        resultsContainer.innerHTML = '<div class="error">No businesses found matching your search criteria in our database or Google Maps.</div>';
                        resultsContainer.scrollIntoView({behavior: 'smooth'});
                    }
                }
            }
        });

        // After processing results and creating markers
        console.log("Finished adding Google Places markers, markers count:", markers.length);

        // Force map to fit all markers
        if (map && bounds && !bounds.isEmpty()) {
            console.log("Fitting map to bounds");
            map.fitBounds(bounds);

            // If we only have one marker, zoom in appropriately
            if (markers.length === 1) {
                console.log("Single marker, setting zoom level");
                map.setZoom(15);
            }
        }
    } catch (error) {
        console.error("Error searching Google Places:", error);

        // Show error message to user
        let errorContainer;
        if (document.getElementById('search_table')) {
            errorContainer = document.getElementById('search_table');
        } else {
            errorContainer = document.getElementById('business-search-results');
        }

        if (errorContainer) {
            errorContainer.innerHTML = `<div class="error">Error searching Google Maps: ${error.message}</div>`;
            errorContainer.style.display = 'block';
            errorContainer.scrollIntoView({behavior: 'smooth'});
        }
    }
}

/**
 * Ensure map is visible and properly sized
 */
function ensureMapVisibility() {
    const mapContainer = document.getElementById('map');
    if (mapContainer) {
        // Ensure the map container is visible
        mapContainer.style.display = 'block';

        // Set a minimum height if not already set
        if (!mapContainer.style.height || mapContainer.style.height === 'auto') {
            mapContainer.style.height = '400px';
        }

        console.log("Map container dimensions:", mapContainer.offsetWidth, "x", mapContainer.offsetHeight);

        // If the map is initialized but no markers are showing, check zoom level
        if (mapInitialized && map && markers.length > 0) {
            // Force a resize event to refresh the map
            google.maps.event.trigger(map, 'resize');

            // If we have bounds, fit to them
            if (bounds && !bounds.isEmpty()) {
                map.fitBounds(bounds);
                console.log("Fitting map to bounds");
            } else if (markers.length === 1) {
                // If we only have one marker, center on it and zoom in
                map.setCenter(markers[0].position);
                map.setZoom(15);
                console.log("Centering on single marker");
            }
        }
    }
}

/**
 * Display Google Places search results
 * @param {Array} businesses - Array of business objects from Google Places
 */
function displayGoogleSearchResults(businesses) {
    const businessSearchTable = document.getElementById('business_search');
    const searchTableContainer = document.getElementById('search_table');

    if (!businessSearchTable || !searchTableContainer) {
        console.error("Required elements not found in the DOM");
        return;
    }

    // Get the table body
    let tableBody = businessSearchTable.querySelector('tbody');
    if (!tableBody) {
        console.error("Table body not found within business_search table");
        return;
    }

    // Clear existing rows
    tableBody.innerHTML = '';

    // Make sure businesses is an array
    if (!Array.isArray(businesses) || businesses.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center">No businesses found matching your search criteria.</td></tr>';
        searchTableContainer.style.display = 'block';
        searchTableContainer.scrollIntoView({behavior: 'smooth'});
        return;
    }

    // Show the search results table
    searchTableContainer.style.display = 'block';

    // Hide the "hidden" text in the h5
    const searchTableH5 = searchTableContainer.querySelector('h5');
    if (searchTableH5) {
        searchTableH5.style.display = 'none';
    }

    // Add each business to the table
    businesses.forEach(business => {
        if (!business) return; // skip null or undefined entries

        // Format the address line
        const addressLine = business.address1 ?
            `${business.address1}<br>${business.city}, ${business.state} ${business.zip}` :
            'Address information not available';

        // Convert the business type code to a readable label
        const businessType = getBusinessTypeLabel(business.type);

        // Create a new row
        const row = document.createElement('tr');

        // Add a View on Map button and Add to Database button
        const viewMapButton = `<button class="view-map-btn" onclick="focusOnMapMarker('${business._id}')">View on Map</button>`;
        const addToDbButton = business.isGooglePlace ?
            `<button class="add-to-db-btn" onclick="addGooglePlaceToDatabase('${business.placeId}')">Add to Patriot Thanks</button>` :
            '';

        // First populate with basic business info
        row.innerHTML = `
            <th class="left_table" data-business-id="${business._id}">${business.bname}</th>
            <th class="left_table">${addressLine}</th>
            <th class="left_table">${businessType}</th>
            <th class="right_table">${business.isGooglePlace ? 'Not in database yet' : 'Loading incentives...'}</th>
            <th class="center_table">${viewMapButton} ${addToDbButton}</th>
        `;

        tableBody.appendChild(row);

        // Only fetch incentives for businesses in our database
        if (!business.isGooglePlace) {
            fetchBusinessIncentives(business._id);
        }
    });

    // Scroll to the results
    searchTableContainer.scrollIntoView({behavior: 'smooth'});
}

/**
 * Add a Google Place to our database
 * @param {string} placeId - Google Place ID
 */
window.addGooglePlaceToDatabase = function(placeId) {

    window.addBusinessToDatabase(placeId);
};

// initGoogleMap function
window.initGoogleMap = async function() {
    console.log("Global initGoogleMap function called");
    console.log("Map container exists:", !!document.getElementById("map"));

    try {
        // Check if map container exists
        const mapContainer = document.getElementById("map");
        if (!mapContainer) {
            console.error("Map container not found in the DOM");
            return;
        }

        console.log("Map container dimensions:", mapContainer.offsetWidth, "x", mapContainer.offsetHeight);

        // Import required libraries
        const { Map } = await google.maps.importLibrary("maps");
        const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");

        // Create a map centered on the US with POI clicks disabled
        map = new Map(mapContainer, {
            center: CONFIG.defaultCenter,
            zoom: CONFIG.defaultZoom,
            mapId: CONFIG.mapId,
            clickableIcons: true
        });

        console.log("Map object created:", !!map);

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

        initAdditionalMapFeatures();

        // Add a force refresh of the map
        setTimeout(() => {
            if (map) {
                console.log("Forcing map refresh");
                google.maps.event.trigger(map, 'resize');

                // If we have bounds, fit to them
                if (bounds && !bounds.isEmpty()) {
                    map.fitBounds(bounds);
                }
            }
        }, 500);

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
 * Setup handler for map clicks to handle POI clicks
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
                // Stop the default info window
                event.stop();

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
                    alert("Error loading place details. Please try again.");
                }
            }
        });

        console.log("Map click handler set up");
    } catch (error) {
        console.error("Error setting up map click handler:", error);
    }
}


/**
 * Add event listeners to prioritize marker clicks over POI clicks
 */
function setupMarkerClickPriority() {
    if (!map) {
        console.error("Map not initialized, cannot set up click priority");
        return;
    }

    console.log("Setting up marker click priority");

    // Create listener that will get called before Google's POI click
    google.maps.event.addListener(map, 'click', function(event) {
        // Only process if we have a POI click (place ID present)
        if (event.placeId) {
            // Check if any of our markers are close to this click
            const clickPoint = event.latLng;

            // Search radius in pixels
            const pixelRadius = 20;

            // Get current projection
            const projection = map.getProjection();
            if (!projection) return;

            // Convert latLng to pixel coordinates
            const scale = Math.pow(2, map.getZoom());
            const worldCoordinate = projection.fromLatLngToPoint(clickPoint);

            // Check each marker
            for (const marker of markers) {
                if (!marker.position) continue;

                // Get marker position
                const markerLatLng = marker.position;

                // Convert to pixel coordinates
                const markerWorldCoord = projection.fromLatLngToPoint(markerLatLng);

                // Calculate distance in pixels
                const pixelDistance = Math.sqrt(
                    Math.pow((worldCoordinate.x - markerWorldCoord.x) * scale, 2) +
                    Math.pow((worldCoordinate.y - markerWorldCoord.y) * scale, 2)
                );

                // If click is near our marker
                if (pixelDistance <= pixelRadius) {
                    console.log("Preventing POI click, using our marker instead");
                    event.stop(); // Prevent default

                    // Trigger our marker click
                    setTimeout(() => {
                        showInfoWindow(marker);
                    }, 10);

                    return;
                }
            }
        }
    }, {passive: false}); // Important for event.stop() to work
}

/**
 * Initialize additional setups when Google Maps is loaded
 */
function initAdditionalMapFeatures() {
    console.log("Initializing additional map features");

    // Add custom CSS style to fix any potential styling issues
    addCustomMarkerStyleFixes();

    // Setup priority for marker clicks
    setupMarkerClickPriority();

    // Make all info windows have consistent styling
    customizeInfoWindows();
}

/**
 * Add style fixes for any potential CSS issues
 */
function addCustomMarkerStyleFixes() {
    if (!document.getElementById('marker-style-fixes')) {
        const style = document.createElement('style');
        style.id = 'marker-style-fixes';
        style.textContent = `
            /* Ensure icon is properly displayed inside marker */
            .marker-icon {
                display: flex;
                justify-content: center;
                align-items: center;
                width: 20px;
                height: 20px;
                color: #333;
            }
            
            /* Fix for Font Awesome icons inside markers */
            .marker-icon i {
                font-size: 12px !important;
                color: #333 !important;
            }
            
            /* Info window action button specific styling */
            .info-window-actions .view-details-btn {
                margin-top: 8px;
            }
        `;
        document.head.appendChild(style);
    }
}

/**
 * Customize Google Maps info windows globally
 */
function customizeInfoWindows() {
    // Apply the scrollable styles
    applyInfoWindowScrollableStyles();

    // Override close button behavior to make it larger and more visible
    const closeButtonStyles = document.createElement('style');
    closeButtonStyles.textContent = `
        /* Make close button more visible */
        .gm-ui-hover-effect {
            opacity: 0.8 !important;
            width: 24px !important;
            height: 24px !important;
            right: 2px !important;
            top: 2px !important;
        }
        
        .gm-ui-hover-effect span {
            width: 16px !important;
            height: 16px !important;
        }
        
        .gm-ui-hover-effect:hover {
            opacity: 1 !important;
        }
    `;
    document.head.appendChild(closeButtonStyles);
}

/**
 * Helper function to enhance info window creation with specific styling and behavior
 */
function createEnhancedInfoWindow() {
    // Create a new info window with custom options
    const newInfoWindow = new google.maps.InfoWindow({
        maxWidth: 320,
        disableAutoPan: false
    });

    // Add event listener to apply scrollable styles when the window opens
    google.maps.event.addListener(newInfoWindow, 'domready', function() {
        console.log("Info window DOM ready, applying styles");

        // Add a slight delay to ensure DOM elements are fully rendered
        setTimeout(() => {
            // Find the scrollable element and adjust its height if needed
            const scrollableElements = document.querySelectorAll('.info-window-scrollable');
            if (scrollableElements.length > 0) {
                console.log("Found scrollable elements, adjusting height");

                // Adjust height based on content
                scrollableElements.forEach(el => {
                    const content = el.querySelector('.incentives-list');
                    if (content && content.offsetHeight > 150) {
                        console.log("Large content detected, ensuring scrollable");
                        el.style.overflowY = 'auto';
                    }
                });
            }
        }, 100);
    });

    return newInfoWindow;
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

    ensureMapVisibility();

    // If we have at least one business with coordinates, show the map
    const hasCoordinates = businesses.some(business =>
        business.lat && business.lng ||
        (business.location && business.location.coordinates &&
            business.location.coordinates.length === 2)
    );

    if (hasCoordinates) {
        document.getElementById('map-container').style.display = 'block';
    }
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
 * Add an advanced marker to the map (Updated to work with your existing CSS)
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
        const pinClass = isNearby ? "nearby" : "primary";

        // Create a pin element
        const pinElement = document.createElement('div');
        pinElement.className = 'custom-marker';
        pinElement.style.cursor = 'pointer';
        pinElement.style.zIndex = '1000'; // Higher z-index to prevent POI clicks

        // Get business type icon
        const businessIcon = getBusinessTypeIconHTML(business.type);

        // Set innerHTML with the correct structure to match your CSS
        pinElement.innerHTML = `
            <div class="marker-container">
                <div class="marker-pin ${pinClass}">
                    <div class="marker-icon">
                        ${businessIcon}
                    </div>
                </div>
                <div class="marker-shadow"></div>
            </div>
        `;

        // Create the advanced marker
        const marker = new AdvancedMarkerElement({
            position: position,
            map: map,
            title: business.bname,
            content: pinElement,
            collisionBehavior: isNearby ? 'OPTIONAL_AND_HIDES_LOWER_PRIORITY' : 'REQUIRED_AND_HIDES_OPTIONAL'
        });

        // Store the business data with the marker
        marker.business = business;
        marker.isNearby = isNearby;
        marker.position = position;

        // Add click event listener
        pinElement.addEventListener('click', function(e) {
            console.log("Marker element clicked:", business.bname);
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
 * Get HTML for a business type icon
 * @param {string} businessType - Business type code
 * @returns {string} Icon HTML
 */
function getBusinessTypeIconHTML(businessType) {
    // Map business types to icon HTML
    // Using Font Awesome icons that are already included in your project
    const iconMap = {
        'AUTO': '<i class="fas fa-car" style="transform: rotate(-45deg);"></i>',
        'BEAU': '<i class="fas fa-spa" style="transform: rotate(-45deg);"></i>',
        'BOOK': '<i class="fas fa-book" style="transform: rotate(-45deg);"></i>',
        'CLTH': '<i class="fas fa-tshirt" style="transform: rotate(-45deg);"></i>',
        'CONV': '<i class="fas fa-store" style="transform: rotate(-45deg);"></i>',
        'DEPT': '<i class="fas fa-shopping-bag" style="transform: rotate(-45deg);"></i>',
        'ELEC': '<i class="fas fa-bolt" style="transform: rotate(-45deg);"></i>',
        'ENTR': '<i class="fas fa-film" style="transform: rotate(-45deg);"></i>',
        'FURN': '<i class="fas fa-couch" style="transform: rotate(-45deg);"></i>',
        'FUEL': '<i class="fas fa-gas-pump" style="transform: rotate(-45deg);"></i>',
        'GIFT': '<i class="fas fa-gift" style="transform: rotate(-45deg);"></i>',
        'GROC': '<i class="fas fa-shopping-cart" style="transform: rotate(-45deg);"></i>',
        'HARDW': '<i class="fas fa-hammer" style="transform: rotate(-45deg);"></i>',
        'HEAL': '<i class="fas fa-heartbeat" style="transform: rotate(-45deg);"></i>',
        'JEWL': '<i class="fas fa-gem" style="transform: rotate(-45deg);"></i>',
        'OTHER': '<i class="fas fa-store-alt" style="transform: rotate(-45deg);"></i>',
        'RX': '<i class="fas fa-prescription-bottle-alt" style="transform: rotate(-45deg);"></i>',
        'REST': '<i class="fas fa-utensils" style="transform: rotate(-45deg);"></i>',
        'RETAIL': '<i class="fas fa-shopping-basket" style="transform: rotate(-45deg);"></i>',
        'SERV': '<i class="fas fa-concierge-bell" style="transform: rotate(-45deg);"></i>',
        'SPEC': '<i class="fas fa-star" style="transform: rotate(-45deg);"></i>',
        'SPRT': '<i class="fas fa-football-ball" style="transform: rotate(-45deg);"></i>',
        'TECH': '<i class="fas fa-laptop" style="transform: rotate(-45deg);"></i>',
        'TOYS': '<i class="fas fa-gamepad" style="transform: rotate(-45deg);"></i>'
    };

    // Return the icon for this business type, or a default
    return iconMap[businessType] || '<i class="fas fa-store" style="transform: rotate(-45deg);"></i>';
}


/**
 * Get an SVG icon for a business type (new function)
 * @param {string} businessType - Business type code
 * @returns {string} SVG icon markup
 */
function getBusinessTypeSVGIcon(businessType) {
    // Map business types to SVG icons
    const businessTypeIcons = {
        'AUTO': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20"><path fill="#EA4335" d="M5,11L6.5,6.5H17.5L19,11M17.5,16A1.5,1.5 0 0,1 16,14.5A1.5,1.5 0 0,1 17.5,13A1.5,1.5 0 0,1 19,14.5A1.5,1.5 0 0,1 17.5,16M6.5,16A1.5,1.5 0 0,1 5,14.5A1.5,1.5 0 0,1 6.5,13A1.5,1.5 0 0,1 8,14.5A1.5,1.5 0 0,1 6.5,16M18.92,6C18.72,5.42 18.16,5 17.5,5H6.5C5.84,5 5.28,5.42 5.08,6L3,12V20A1,1 0 0,0 4,21H5A1,1 0 0,0 6,20V19H18V20A1,1 0 0,0 19,21H20A1,1 0 0,0 21,20V12L18.92,6Z"/></svg>',
        'BEAU': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20"><path fill="#4285F4" d="M15.5,9.63C15.31,6.84 14.18,4.12 12.06,2C9.92,4.14 8.74,6.86 8.5,9.63C9.79,10.31 10.97,11.19 12,12.26C13.03,11.2 14.21,10.32 15.5,9.63M12,15.45C9.85,12.17 6.18,10 2,10C2,20 11.32,21.89 12,22C12.68,21.88 22,20 22,10C17.82,10 14.15,12.17 12,15.45Z"/></svg>',
        'REST': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20"><path fill="#FBC02D" d="M8.1,13.34L3.91,9.16C2.35,7.59 2.35,5.06 3.91,3.5L10.93,10.5L8.1,13.34M14.88,11.53L13.41,13L20.29,19.88L18.88,21.29L12,14.41L5.12,21.29L3.71,19.88L13.47,10.12C12.76,8.59 13.26,6.44 14.85,4.85C16.76,2.93 19.5,2.57 20.96,4.03C22.43,5.5 22.07,8.24 20.15,10.15C18.56,11.74 16.41,12.24 14.88,11.53Z"/></svg>',
        'GROC': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20"><path fill="#0F9D58" d="M7,18A2,2 0 0,1 5,20A2,2 0 0,1 3,18A2,2 0 0,1 5,16A2,2 0 0,1 7,18M17,18A2,2 0 0,1 15,20A2,2 0 0,1 13,18A2,2 0 0,1 15,16A2,2 0 0,1 17,18M7.17,14.75L7.2,14.63L8.1,13H15.55C16.3,13 16.96,12.59 17.3,11.97L21.16,4.96L19.42,4H19.41L18.31,6L15.55,11H8.53L8.4,10.73L6.16,6L5.21,4L4.27,2H1V4H3L6.6,11.59L5.25,14.04C5.09,14.32 5,14.65 5,15A2,2 0 0,0 7,17H19V15H7.42C7.29,15 7.17,14.89 7.17,14.75Z"/></svg>',
        'OTHER': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20"><path fill="#616161" d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,7V9H16V13C16,14.1 15.1,15 14,15H12V17H8V13H12V11H8V7H12Z"/></svg>'
        // Add more type-specific icons as needed
    };

    // Return the icon for this business type, or a default
    return businessTypeIcons[businessType] ||
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20"><path fill="#616161" d="M12,7V3H2V21H22V7H12M10,19H4V17H10V19M10,15H4V13H10V15M10,11H4V9H10V11M10,7H4V5H10V7M20,19H12V5H20V19M18,11H14V13H18V11M18,7H14V9H18V7M18,15H14V17H18V15Z"/></svg>';
}


/**
 * Fetch icon for a business based on its type
 * @param {Object} business - Business object
 * @returns {Promise<string>} Icon URL
 */
async function fetchPlacePhotosForBusiness(business) {
    if (!business) {
        console.log("No business data provided");
        return getDefaultBusinessIcon();
    }

    try {
        // Check cache first
        const cacheKey = business._id || business.bname + business.address1;
        if (placeCache.has(cacheKey)) {
            return placeCache.get(cacheKey);
        }

        // Get an appropriate icon based on business type
        const iconUrl = getBusinessTypeIcon(business.type);

        // Add to cache
        placeCache.set(cacheKey, iconUrl);
        return iconUrl;
    } catch (error) {
        console.error(`Error getting business icon: ${error.message}`);
        return getDefaultBusinessIcon();
    }
}

/**
 * Get an appropriate icon for a business type
 * @param {string} businessType - Business type code
 * @returns {string} Icon URL
 */
function getBusinessTypeIcon(businessType) {
    // Map business types to icon URLs
    const businessTypeIcons = {
        'AUTO': 'https://maps.gstatic.com/mapfiles/place_api/icons/v1/png_71/car_repair-71.png',
        'BEAU': 'https://maps.gstatic.com/mapfiles/place_api/icons/v1/png_71/spa-71.png',
        'BOOK': 'https://maps.gstatic.com/mapfiles/place_api/icons/v1/png_71/shopping-71.png',
        'CLTH': 'https://maps.gstatic.com/mapfiles/place_api/icons/v1/png_71/shopping-71.png',
        'CONV': 'https://maps.gstatic.com/mapfiles/place_api/icons/v1/png_71/convenience-71.png',
        'DEPT': 'https://maps.gstatic.com/mapfiles/place_api/icons/v1/png_71/shopping-71.png',
        'ELEC': 'https://maps.gstatic.com/mapfiles/place_api/icons/v1/png_71/electronics-71.png',
        'ENTR': 'https://maps.gstatic.com/mapfiles/place_api/icons/v1/png_71/movies-71.png',
        'FURN': 'https://maps.gstatic.com/mapfiles/place_api/icons/v1/png_71/shopping-71.png',
        'FUEL': 'https://maps.gstatic.com/mapfiles/place_api/icons/v1/png_71/gas_station-71.png',
        'GIFT': 'https://maps.gstatic.com/mapfiles/place_api/icons/v1/png_71/shopping-71.png',
        'GROC': 'https://maps.gstatic.com/mapfiles/place_api/icons/v1/png_71/supermarket-71.png',
        'HARDW': 'https://maps.gstatic.com/mapfiles/place_api/icons/v1/png_71/hardware-71.png',
        'HEAL': 'https://maps.gstatic.com/mapfiles/place_api/icons/v1/png_71/generic_business-71.png',
        'JEWL': 'https://maps.gstatic.com/mapfiles/place_api/icons/v1/png_71/shopping-71.png',
        'OTHER': 'https://maps.gstatic.com/mapfiles/place_api/icons/v1/png_71/generic_business-71.png',
        'RX': 'https://maps.gstatic.com/mapfiles/place_api/icons/v1/png_71/pharmacy-71.png',
        'REST': 'https://maps.gstatic.com/mapfiles/place_api/icons/v1/png_71/restaurant-71.png',
        'RETAIL': 'https://maps.gstatic.com/mapfiles/place_api/icons/v1/png_71/shopping-71.png',
        'SERV': 'https://maps.gstatic.com/mapfiles/place_api/icons/v1/png_71/generic_business-71.png',
        'SPEC': 'https://maps.gstatic.com/mapfiles/place_api/icons/v1/png_71/shopping-71.png',
        'SPRT': 'https://maps.gstatic.com/mapfiles/place_api/icons/v1/png_71/sports-71.png',
        'TECH': 'https://maps.gstatic.com/mapfiles/place_api/icons/v1/png_71/electronics-71.png',
        'TOYS': 'https://maps.gstatic.com/mapfiles/place_api/icons/v1/png_71/shopping-71.png'
    };

    // If we have an icon for this business type, use it
    if (businessTypeIcons[businessType]) {
        return businessTypeIcons[businessType];
    }

    // Default icon
    return getDefaultBusinessIcon();
}

/**
 * Get default business icon
 * @returns {string} Default icon URL
 */
function getDefaultBusinessIcon() {
    return 'https://maps.gstatic.com/mapfiles/place_api/icons/v1/png_71/generic_business-71.png';
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
 * Show info window for a marker with scrollable content
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

    // Check if this is a Google Places result or a database result
    const isGooglePlace = business._id && business._id.toString().startsWith('google_');

    // Create incentives section based on whether it's a Google Places result
    const incentivesSection = isGooglePlace
        ? `<div class="info-window-incentives">
             <p><strong>Incentives:</strong> <em>Not in database yet</em></p>
           </div>`
        : `<div id="info-window-incentives-${business._id}">
             <p><strong>Incentives:</strong> <em>Loading...</em></p>
           </div>`;

    // Add an "Add to Database" button if it's a Google Places result
    const actionButton = isGooglePlace
        ? `<button class="add-to-db-btn" 
                onclick="window.addBusinessToDatabase('${business.placeId}')">
             Add to Patriot Thanks
           </button>`
        : `<button class="view-details-btn" 
                onclick="window.viewBusinessDetails('${business._id}')">
             View Details
           </button>`;

    // Content for the info window with scrollable container
    const contentString = `
    <div class="info-window-wrapper">
      <div class="info-window-header">
        <h3>${business.bname}</h3>
      </div>
      <div class="info-window-content">
        <div class="info-window-scrollable">
          <p><strong>Address:</strong><br>${addressLine}</p>
          ${phoneDisplay}
          <p><strong>Type:</strong> ${businessType}</p>
          ${incentivesSection}
        </div>
      </div>
      <div class="info-window-footer">
        ${actionButton}
      </div>
    </div>
    `;

    // Create info window if it doesn't exist
    if (!infoWindow) {
        infoWindow = new google.maps.InfoWindow({
            maxWidth: 320,
            disableAutoPan: false
        });
    }

    // Set content and open with modern approach using an options object
    infoWindow.setContent(contentString);
    infoWindow.open({
        map: map,
        anchor: marker,
        shouldFocus: false
    });

    console.log("Opened info window for marker using anchor method");

    // Apply custom CSS to make scrollable content
    applyInfoWindowScrollableStyles();

    // Only fetch incentives for businesses from our database
    if (!isGooglePlace) {
        fetchBusinessIncentivesForInfoWindow(business._id);
    }
}

/**
 * Apply custom CSS to make info windows scrollable
 */
function applyInfoWindowScrollableStyles() {
    if (!document.getElementById('info-window-scrollable-styles')) {
        const style = document.createElement('style');
        style.id = 'info-window-scrollable-styles';
        style.textContent = `
            /* Info window structure */
            .info-window-wrapper {
                width: 300px;
                max-width: 300px;
                display: flex;
                flex-direction: column;
            }
            
            .info-window-header {
                padding: 8px 12px;
                border-bottom: 1px solid #eee;
                background-color: #f8f8f8;
            }
            
            .info-window-header h3 {
                margin: 0;
                font-size: 16px;
                color: #333;
                word-break: break-word;
            }
            
            .info-window-content {
                max-height: 200px;
                overflow: hidden;
                position: relative;
            }
            
            .info-window-scrollable {
                padding: 10px 12px;
                overflow-y: auto;
                max-height: 200px;
                scrollbar-width: thin;
                scrollbar-color: #ddd #f8f8f8;
            }
            
            .info-window-scrollable::-webkit-scrollbar {
                width: 8px;
            }
            
            .info-window-scrollable::-webkit-scrollbar-track {
                background: #f8f8f8;
            }
            
            .info-window-scrollable::-webkit-scrollbar-thumb {
                background-color: #ddd;
                border-radius: 4px;
                border: 2px solid #f8f8f8;
            }
            
            .info-window-footer {
                padding: 8px 12px;
                border-top: 1px solid #eee;
                background-color: #f8f8f8;
                display: flex;
                justify-content: flex-end;
            }
            
            /* Incentives list */
            .incentives-list {
                margin: 8px 0;
                padding-left: 20px;
            }
            
            .incentives-list li {
                margin-bottom: 6px;
            }
            
            /* Override Google's default styles */
            .gm-style .gm-style-iw-c {
                padding: 0 !important;
                border-radius: 8px !important;
                box-shadow: 0 2px 7px 1px rgba(0,0,0,0.3) !important;
            }
            
            .gm-style .gm-style-iw-d {
                overflow: hidden !important;
                padding: 0 !important;
            }
            
            /* Ensure the info window size is consistent */
            .gm-style-iw.gm-style-iw-c {
                max-width: 320px !important;
            }
        `;
        document.head.appendChild(style);
    }
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

// Save the original initGoogleMap function
const originalInitGoogleMap = window.initGoogleMap;

// Create a new wrapper function that calls the original function
window.initGoogleMap = async function() {
    console.log("Global initGoogleMap function called");

    try {
        // Check if map container exists
        const mapContainer = document.getElementById("map");
        if (!mapContainer) {
            console.error("Map container not found in the DOM");
            return;
        }

        console.log("Map container dimensions:", mapContainer.offsetWidth, "x", mapContainer.offsetHeight);

        // Import required libraries
        const { Map } = await google.maps.importLibrary("maps");
        const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");

        // Create a map centered on the US with POI clicks disabled
        map = new Map(mapContainer, {
            center: CONFIG.defaultCenter,
            zoom: CONFIG.defaultZoom,
            mapId: CONFIG.mapId,
            clickableIcons: true
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

        initAdditionalMapFeatures();

        // Add a force refresh of the map
        setTimeout(() => {
            if (map) {
                console.log("Forcing map refresh");
                google.maps.event.trigger(map, 'resize');

                // If we have bounds, fit to them
                if (bounds && !bounds.isEmpty()) {
                    map.fitBounds(bounds);
                }
            }
        }, 500);

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

// Initialize when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize business search functionality
    initBusinessSearch();
    addCustomMarkerStyles();
});
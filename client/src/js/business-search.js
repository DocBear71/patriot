// brand new business-search.js not working properly

// Enhanced debugging functions to help identify and fix issues

/**
 * Debug the current map state with detailed information
 */
function debugMapState() {
    console.log("==== MAP DEBUGGING INFO ====");
    console.log("Map initialized:", mapInitialized);
    console.log("Map object exists:", !!map);

    if (map) {
        try {
            const center = map.getCenter();
            console.log("Map center:", center ? `${center.lat()}, ${center.lng()}` : "undefined");
            console.log("Map zoom:", map.getZoom());
            console.log("Map type:", map.getMapTypeId());
            console.log("Map ID:", map.getMapId());
        } catch (error) {
            console.error("Error getting map properties:", error);
        }
    }

    console.log("Markers count:", markers ? markers.length : 0);

    if (markers && markers.length > 0) {
        console.log("Markers summary:");
        markers.forEach((marker, index) => {
            try {
                let position;
                if (marker.getPosition) {
                    position = marker.getPosition();
                } else if (marker.position) {
                    position = marker.position;
                }

                const positionStr = position ?
                    (typeof position.lat === 'function' ?
                        `${position.lat()}, ${position.lng()}` :
                        `${position.lat}, ${position.lng}`) :
                    "unknown";

                console.log(`  Marker #${index}: Business: ${marker.business ? marker.business.bname : 'unknown'}, Position: ${positionStr}`);
            } catch (error) {
                console.error(`  Error getting marker #${index} info:`, error);
            }
        });
    }

    console.log("Bounds:", bounds ? "exists" : "not created");
    if (bounds) {
        try {
            const ne = bounds.getNorthEast();
            const sw = bounds.getSouthWest();
            console.log("  NE:", ne ? `${ne.lat()}, ${ne.lng()}` : "undefined");
            console.log("  SW:", sw ? `${sw.lat()}, ${sw.lng()}` : "undefined");
            console.log("  Empty:", bounds.isEmpty());

            // Check for invalid coordinates
            if (ne && sw) {
                const hasNaN = isNaN(ne.lat()) || isNaN(ne.lng()) || isNaN(sw.lat()) || isNaN(sw.lng());
                console.log("  Has NaN coordinates:", hasNaN);
            }
        } catch (error) {
            console.error("  Error getting bounds info:", error);
        }
    }

    console.log("Map container:", document.getElementById("map") ? "found" : "not found");
    const mapContainer = document.getElementById("map");
    if (mapContainer) {
        console.log("  Display:", window.getComputedStyle(mapContainer).display);
        console.log("  Dimensions:", `${mapContainer.offsetWidth} × ${mapContainer.offsetHeight}`);
        console.log("  Position:", mapContainer.style.position);
        console.log("  Visibility:", window.getComputedStyle(mapContainer).visibility);
        console.log("  Z-index:", window.getComputedStyle(mapContainer).zIndex);
    }

    // Check for Google Maps libraries
    console.log("Google Maps libraries:");
    console.log("  maps:", !!google.maps);
    console.log("  places:", !!google.maps.places);
    console.log("  geometry:", !!google.maps.geometry);
    console.log("  marker:", !!google.maps.marker);

    console.log("Google Maps API Key:", getGoogleMapsApiKey() ? "found" : "not found");
    console.log("==== END DEBUGGING INFO ====");
}

/**
 * Validate a position object to ensure it has valid coordinates
 * @param {Object} position - Position object to validate
 * @returns {boolean} True if position is valid
 */
function isValidPosition(position) {
    if (!position) {
        console.warn("Position is null or undefined");
        return false;
    }

    let lat, lng;

    if (position instanceof google.maps.LatLng) {
        try {
            lat = position.lat();
            lng = position.lng();
        } catch (error) {
            console.warn("Error getting lat/lng from LatLng:", error);
            return false;
        }
    } else if (typeof position.lat === 'function' && typeof position.lng === 'function') {
        try {
            lat = position.lat();
            lng = position.lng();
        } catch (error) {
            console.warn("Error calling lat/lng functions:", error);
            return false;
        }
    } else if (position.lat !== undefined && position.lng !== undefined) {
        lat = parseFloat(position.lat);
        lng = parseFloat(position.lng);
    } else {
        console.warn("Position does not have lat/lng properties");
        return false;
    }

    // Check for NaN, Infinity, or out of range values
    if (isNaN(lat) || isNaN(lng)) {
        console.warn("Position has NaN coordinates:", lat, lng);
        return false;
    }

    if (!isFinite(lat) || !isFinite(lng)) {
        console.warn("Position has non-finite coordinates:", lat, lng);
        return false;
    }

    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
        console.warn("Position coordinates out of range:", lat, lng);
        return false;
    }

    return true;
}

/**
 * Create a safe LatLng object from various position formats
 * @param {Object} position - Position object in various formats
 * @returns {google.maps.LatLng|null} Google LatLng object or null if invalid
 */
function createSafeLatLng(position) {
    if (!position) {
        return null;
    }

    try {
        if (position instanceof google.maps.LatLng) {
            // Already a LatLng, just validate it
            if (isValidPosition(position)) {
                return position;
            }
            return null;
        }

        let lat, lng;

        if (typeof position.lat === 'function' && typeof position.lng === 'function') {
            lat = position.lat();
            lng = position.lng();
        } else if (position.lat !== undefined && position.lng !== undefined) {
            lat = parseFloat(position.lat);
            lng = parseFloat(position.lng);
        } else if (position.latitude !== undefined && position.longitude !== undefined) {
            lat = parseFloat(position.latitude);
            lng = parseFloat(position.longitude);
        } else if (Array.isArray(position) && position.length >= 2) {
            lat = parseFloat(position[0]);
            lng = parseFloat(position[1]);
        } else {
            console.warn("Position format not recognized:", position);
            return null;
        }

        // Validate the coordinates
        if (isNaN(lat) || isNaN(lng) || !isFinite(lat) || !isFinite(lng)) {
            console.warn("Invalid coordinates:", lat, lng);
            return null;
        }

        if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
            console.warn("Coordinates out of range:", lat, lng);
            return null;
        }

        // Create a new LatLng object
        return new google.maps.LatLng(lat, lng);
    } catch (error) {
        console.error("Error creating LatLng:", error);
        return null;
    }
}

/**
 * Safe implementation of the fitBounds function
 * @param {google.maps.Map} mapObj - Google Maps object
 * @param {google.maps.LatLngBounds} boundsObj - Bounds object
 * @param {number} defaultZoom - Default zoom level if bounds fail
 * @returns {boolean} True if bounds were successfully fitted
 */
function safelyFitBounds(mapObj, boundsObj, defaultZoom = 11) {
    if (!mapObj || !boundsObj) {
        return false;
    }

    try {
        // Validate bounds
        const ne = boundsObj.getNorthEast();
        const sw = boundsObj.getSouthWest();

        if (!ne || !sw || isNaN(ne.lat()) || isNaN(ne.lng()) || isNaN(sw.lat()) || isNaN(sw.lng())) {
            console.warn("Invalid bounds for fitBounds:", boundsObj);
            return false;
        }

        if (boundsObj.isEmpty()) {
            console.warn("Empty bounds, not fitting");
            return false;
        }

        // All looks good, try to fit the bounds
        mapObj.fitBounds(boundsObj);
        return true;
    } catch (error) {
        console.error("Error fitting bounds:", error);

        // Try to set a default zoom as fallback
        try {
            if (defaultZoom !== undefined) {
                mapObj.setZoom(defaultZoom);
            }
        } catch (zoomError) {
            console.error("Error setting fallback zoom:", zoomError);
        }

        return false;
    }
}

/**
 * Safely center the map on a position
 * @param {google.maps.Map} mapObj - Google Maps object
 * @param {Object} position - Position to center on
 * @param {number} zoom - Zoom level to set
 * @returns {boolean} True if center was successful
 */
function safelySetCenter(mapObj, position, zoom) {
    if (!mapObj) {
        return false;
    }

    try {
        const safePosition = createSafeLatLng(position);
        if (!safePosition) {
            return false;
        }

        mapObj.setCenter(safePosition);

        if (zoom !== undefined) {
            mapObj.setZoom(zoom);
        }

        return true;
    } catch (error) {
        console.error("Error setting map center:", error);
        return false;
    }
}

/**
 * Create a new clean bounds object
 * @returns {google.maps.LatLngBounds} New bounds object
 */
function createNewBounds() {
    return new google.maps.LatLngBounds();
}

/**
 * Reset the map view to default
 */
function safeResetMapView() {
    if (!mapInitialized || !map) {
        console.error("Cannot reset map view - map not initialized");
        return;
    }

    try {
        // Center on US and zoom out with safe method
        safelySetCenter(map, CONFIG.defaultCenter, CONFIG.defaultZoom);

        // Close any open info windows
        if (infoWindow) {
            infoWindow.close();
        }
    } catch (error) {
        console.error("Error resetting map view:", error);
    }
}

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

// Global flag to track if Google Maps is being initialized
let googleMapsInitializing = false;

// Global flag to track if Google Maps is already initialized
let googleMapsInitialized = false;

// Function to safely initialize Google Maps once
function ensureGoogleMapsInitialized() {
    // If already initialized or currently initializing, don't do anything
    if (googleMapsInitialized || googleMapsInitializing) {
        console.log("Google Maps already initialized or initializing");
        return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
        try {
            googleMapsInitializing = true;
            console.log("Starting Google Maps initialization");

            // Check if Google Maps API is already loaded
            if (window.google && window.google.maps) {
                console.log("Google Maps API is already loaded, just initializing map");
                initGoogleMap();
                googleMapsInitialized = true;
                googleMapsInitializing = false;
                resolve();
                return;
            }

            // Get API key from config
            const apiKey = window.appConfig?.googleMapsApiKey || 'AIzaSyCHKhYZwQR37M_0QctXUQe6VFRFrlhaYj8';
            const mapId = window.appConfig?.googleMapsMapId || 'ebe8ec43a7bc252d';

            // Create a callback function for when Maps loads
            window.initGoogleMapCallback = function() {
                console.log("Google Maps callback executed");
                initGoogleMap();
                googleMapsInitialized = true;
                googleMapsInitializing = false;
                resolve();
            };

            // Create the script element
            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&map_ids=${mapId}&libraries=places,geometry,marker&callback=initGoogleMapCallback&loading=async&v=weekly`;
            script.async = true;
            script.defer = true;
            script.onerror = function(error) {
                console.error('Google Maps API failed to load:', error);
                googleMapsInitializing = false;
                reject(error);
            };

            // Add the script to the page
            document.head.appendChild(script);
        } catch (error) {
            googleMapsInitializing = false;
            console.error("Error initializing Google Maps:", error);
            reject(error);
        }
    });
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
 * Modified to work with Place API format
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

    // Get type label - place.types might be in different formats depending on API version
    const placeTypeLabel = getPlaceTypeLabel(place.types);

    // Extract display name based on which API was used
    const displayName = place.displayName || place.name || 'Unnamed Place';

    // Get address - different APIs provide different formats
    const formattedAddress = place.formattedAddress || place.formatted_address || 'Address not available';

    // Get phone number - different APIs provide different formats
    const phoneNumber = place.nationalPhoneNumber || place.formatted_phone_number || '';

    // Calculate distance if available
    let distanceText = '';
    if (place.distance) {
        distanceText = `<p><strong>Distance:</strong> ${(place.distance / 1609.34).toFixed(1)} miles</p>`;
    }

    // Format the content with an "Add to Database" button and scrollable area - using your existing CSS classes
    const contentString = `
    <div class="info-window">
        <h3>${displayName}</h3>
        <p><strong>Address:</strong><br>${formattedAddress}</p>
        ${phoneNumber ? `<p><strong>Phone:</strong> ${phoneNumber}</p>` : ''}
        ${distanceText}
        <p><strong>Type:</strong> ${placeTypeLabel}</p>
        <p><strong>Incentives:</strong> <em>Not in database</em></p>
        <p>This business is not yet in the Patriot Thanks database.</p>
        <div class="info-window-actions">
            <button class="add-business-btn" 
                    onclick="window.addBusinessToDatabase('${place.place_id || place.id}')">
                Add to Patriot Thanks
            </button>
        </div>
    </div>
  `;

    // Set content and open the info window
    infoWindow.setContent(contentString);

    // Make sure we set the position properly
    if (position.lat && typeof position.lat === 'function') {
        infoWindow.setPosition(position);
    } else {
        infoWindow.setPosition(new google.maps.LatLng(position.lat, position.lng));
    }

    infoWindow.open(map);
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

// /**
//  * Reverse geocode coordinates to get address
//  * @param {Object} location - Object with lat and lng properties
//  * @returns {Promise<string>} Formatted address
//  */
// async function reverseGeocode(location) {
//     try {
//         const geocoder = new google.maps.Geocoder();
//
//         return new Promise((resolve, reject) => {
//             geocoder.geocode({ 'location': location }, (results, status) => {
//                 if (status === google.maps.GeocoderStatus.OK) {
//                     if (results[0]) {
//                         console.log("Reverse geocoded address:", results[0].formatted_address);
//                         resolve(results[0].formatted_address);
//                     } else {
//                         reject(new Error("No results found"));
//                     }
//                 } else {
//                     reject(new Error(`Geocoder failed due to: ${status}`));
//                 }
//             });
//         });
//     } catch (error) {
//         console.error("Error reverse geocoding:", error);
//         return null;
//     }
// }

/**
 * Add custom CSS to style the markers properly
 */
function addCustomMarkerStyles() {
    if (!document.getElementById('custom-marker-css')) {
        const style = document.createElement('style');
        style.id = 'custom-marker-css';
        style.textContent = `
            .custom-marker {
                cursor: pointer;
            }
            
            .marker-container {
                position: relative;
                width: 32px;
                height: 40px;
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
                position: absolute;
                top: 0;
                left: 0;
            }
            
            .marker-pin.nearby {
                background-color: #4285F4;
            }
            
            .marker-icon {
                transform: rotate(45deg);
                display: flex;
                justify-content: center;
                align-items: center;
                width: 20px;
                height: 20px;
            }
            
            .marker-icon i {
                font-size: 14px !important;
                color: white !important;
            }
            
            .marker-shadow {
                background-color: rgba(0, 0, 0, 0.2);
                border-radius: 50%;
                height: 14px;
                width: 14px;
                position: absolute;
                bottom: -3px;
                left: 9px;
                filter: blur(2px);
                z-index: -1;
            }
            
            /* Info window action button styling */
            .info-window-actions .add-business-btn,
            .info-window-actions .view-details-btn {
                margin-top: 8px;
                font-weight: bold;
                text-transform: uppercase;
                font-size: 12px;
                padding: 8px 12px;
                border-radius: 4px;
                cursor: pointer;
                transition: background-color 0.2s ease;
                border: none;
                color: white;
                letter-spacing: 0.5px;
            }
            
            .info-window-actions .add-business-btn {
                background-color: #EA4335;
            }
            
            .info-window-actions .add-business-btn:hover {
                background-color: #D32F2F;
            }
            
            .info-window-actions .view-details-btn {
                background-color: #4285F4;
            }
            
            .info-window-actions .view-details-btn:hover {
                background-color: #2A75F3;
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

    // Skip if this is a Google Place result (not in our database)
    if (businessId.startsWith('google_')) {
        const incentivesDiv = document.getElementById(`info-window-incentives-${businessId}`);
        if (incentivesDiv) {
            incentivesDiv.innerHTML = '<p><strong>Incentives:</strong> Not in database</p>';
        }
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

// /**
//  * Search Google Places when no results found in our database
//  * Using the completely new Places API (v1) to avoid deprecation warnings
//  * @param {Object} formData - Form data with search criteria
//  */
// async function searchGooglePlaces(formData) {
//     try {
//         console.log("Searching Google Places for:", formData);
//
//         // Make map visible
//         const mapContainer = document.getElementById('map');
//         if (mapContainer) {
//             mapContainer.style.display = 'block';
//             mapContainer.style.height = '400px';
//         }
//
//         // Clear existing markers
//         clearMarkers();
//
//         // Build search query
//         let searchQuery = '';
//         if (formData.businessName) searchQuery += formData.businessName;
//         if (formData.address) searchQuery += ' ' + formData.address;
//         searchQuery = searchQuery.trim();
//
//         // Show loading indicator
//         const loadingDiv = document.createElement('div');
//         loadingDiv.id = 'map-loading';
//         loadingDiv.innerHTML = 'Searching for businesses...';
//         loadingDiv.style.position = 'absolute';
//         loadingDiv.style.top = '50%';
//         loadingDiv.style.left = '50%';
//         loadingDiv.style.transform = 'translate(-50%, -50%)';
//         loadingDiv.style.backgroundColor = 'white';
//         loadingDiv.style.padding = '10px';
//         loadingDiv.style.borderRadius = '5px';
//         loadingDiv.style.zIndex = '1000';
//         mapContainer.appendChild(loadingDiv);
//
//         // Geocode the address or use the current location
//         let searchLocation;
//
//         // Check if user wants to use their location
//         const useMyLocation = document.getElementById('use-my-location') &&
//             document.getElementById('use-my-location').checked;
//
//         if (useMyLocation) {
//             try {
//                 const userLocation = await getUserLocation();
//                 searchLocation = {
//                     latitude: userLocation.lat,
//                     longitude: userLocation.lng
//                 };
//                 console.log("Using user's current location for search:", searchLocation);
//             } catch (error) {
//                 console.error("Error getting user location:", error);
//                 // Fall back to geocoding the address
//                 let useLocationFailed = true;
//             }
//         }
//
//         if (!useMyLocation || typeof useLocationFailed !== 'undefined') {
//             try {
//                 // Geocode address using Geocoding API directly
//                 const geocodeApiUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(formData.address || searchQuery)}&key=${getGoogleMapsApiKey()}`;
//
//                 const response = await fetch(geocodeApiUrl);
//                 const geocodeData = await response.json();
//
//                 if (geocodeData.status === 'OK' && geocodeData.results && geocodeData.results.length > 0) {
//                     const location = geocodeData.results[0].geometry.location;
//                     searchLocation = {
//                         latitude: location.lat,
//                         longitude: location.lng
//                     };
//
//                     // Create a Google Maps LatLng object for map operations
//                     const googleMapsLocation = new google.maps.LatLng(location.lat, location.lng);
//
//                     // Create new bounds
//                     bounds = new google.maps.LatLngBounds();
//                     bounds.extend(googleMapsLocation);
//
//                     console.log("Geocoded search center:", searchLocation);
//                 } else {
//                     throw new Error(`Geocoding failed: ${geocodeData.status}`);
//                 }
//             } catch (error) {
//                 console.error("Error geocoding address:", error);
//
//                 // Fall back to default US center
//                 searchLocation = {
//                     latitude: CONFIG.defaultCenter.lat,
//                     longitude: CONFIG.defaultCenter.lng
//                 };
//
//                 // Create a Google Maps LatLng object for map operations
//                 const googleMapsLocation = new google.maps.LatLng(
//                     CONFIG.defaultCenter.lat,
//                     CONFIG.defaultCenter.lng
//                 );
//
//                 // Create new bounds
//                 bounds = new google.maps.LatLngBounds();
//                 bounds.extend(googleMapsLocation);
//
//                 console.log("Using default US center for search");
//             }
//         }
//
//         try {
//             // Search radius - 80km is about 50 miles
//             const searchRadius = 50000;
//
//             // Use the modern Places API - Text Search
//             const placeResults = await searchPlacesWithTextSearch(searchQuery, searchLocation, searchRadius);
//
//             // Remove loading indicator
//             const loadingElement = document.getElementById('map-loading');
//             if (loadingElement) loadingElement.remove();
//
//             if (!placeResults || placeResults.length === 0) {
//                 console.log("No places found");
//                 // Show no results message
//                 const searchTableContainer = document.getElementById('search_table');
//                 if (searchTableContainer) {
//                     const tableBody = searchTableContainer.querySelector('tbody');
//                     if (tableBody) {
//                         tableBody.innerHTML = '<tr><td colspan="5" class="text-center">No businesses found matching your search criteria within 50 miles.</td></tr>';
//                     }
//                     searchTableContainer.style.display = 'block';
//                 }
//                 return;
//             }
//
//             console.log("Found places:", placeResults.length);
//
//             // Process places into business objects and add markers
//             const businessResults = processPlaceResults(placeResults, searchLocation);
//
//             if (businessResults.length === 0) {
//                 // Show no results message
//                 const searchTableContainer = document.getElementById('search_table');
//                 if (searchTableContainer) {
//                     const tableBody = searchTableContainer.querySelector('tbody');
//                     if (tableBody) {
//                         tableBody.innerHTML = '<tr><td colspan="5" class="text-center">No businesses found matching your search criteria within 50 miles.</td></tr>';
//                     }
//                     searchTableContainer.style.display = 'block';
//                 }
//                 return;
//             }
//
//             // Sort by distance
//             businessResults.sort((a, b) => a.distance - b.distance);
//
//             // Display results
//             displaySearchResults(businessResults);
//
//             // Fit map to bounds
//             if (bounds && !bounds.isEmpty()) {
//                 map.fitBounds(bounds);
//
//                 // Adjust zoom level
//                 setTimeout(() => {
//                     if (businessResults.length <= 2) {
//                         const currentZoom = map.getZoom();
//                         if (currentZoom > 14) {
//                             map.setZoom(14);
//                         }
//                     } else if (businessResults.length > 10) {
//                         const currentZoom = map.getZoom();
//                         if (currentZoom < 10) {
//                             map.setZoom(10);
//                         }
//                     }
//                 }, 100);
//             } else {
//                 // If bounds are empty, center on search location
//                 map.setCenter(new google.maps.LatLng(searchLocation.latitude, searchLocation.longitude));
//                 map.setZoom(11);
//             }
//
//         } catch (error) {
//             console.error("Error searching places:", error);
//
//             // Remove loading indicator
//             const loadingElement = document.getElementById('map-loading');
//             if (loadingElement) loadingElement.remove();
//
//             // Show error in search results
//             const searchTableContainer = document.getElementById('search_table');
//             if (searchTableContainer) {
//                 const tableBody = searchTableContainer.querySelector('tbody');
//                 if (tableBody) {
//                     tableBody.innerHTML = `<tr><td colspan="5" class="text-center">Error searching for businesses: ${error.message}</td></tr>`;
//                 }
//                 searchTableContainer.style.display = 'block';
//             }
//
//             // Center map on search location if possible
//             if (searchLocation) {
//                 map.setCenter(new google.maps.LatLng(searchLocation.latitude, searchLocation.longitude));
//                 map.setZoom(11);
//             }
//         }
//     } catch (error) {
//         console.error("Error in searchGooglePlaces:", error);
//
//         // Remove loading indicator if it exists
//         const loadingElement = document.getElementById('map-loading');
//         if (loadingElement) loadingElement.remove();
//
//         // Show error message
//         const searchTableContainer = document.getElementById('search_table');
//         if (searchTableContainer) {
//             searchTableContainer.style.display = 'block';
//             const tableBody = searchTableContainer.querySelector('tbody');
//             if (tableBody) {
//                 tableBody.innerHTML = `<tr><td colspan="5" class="text-center">Error searching for businesses: ${error.message}</td></tr>`;
//             }
//         }
//     }
// }

// Add these functions to your business-search.js file to use the server-side endpoints

// /**
//  * Geocode an address using the server-side endpoint
//  * @param {string} address - Address to geocode
//  * @returns {Promise<{lat: number, lng: number} | null>} Location coordinates or null
//  */
// async function geocodeAddressServerSide(address) {
//     try {
//         console.log(`Geocoding address via server: ${address}`);
//
//         if (!address) {
//             console.error("No address provided for geocoding");
//             return null;
//         }
//
//         // Get the base URL
//         const baseURL = getBaseURL();
//         const url = `${baseURL}/api/geocode?address=${encodeURIComponent(address)}`;
//
//         console.log("Calling geocode API:", url);
//         const response = await fetch(url);
//
//         if (!response.ok) {
//             const errorText = await response.text();
//             console.error(`Geocoding failed with status ${response.status}:`, errorText);
//             throw new Error(`Geocoding failed: ${response.status}`);
//         }
//
//         const data = await response.json();
//         if (!data.success || !data.location) {
//             console.error("Geocoding returned no results:", data);
//             throw new Error('Geocoding returned no results');
//         }
//
//         console.log(`Geocoding result:`, data.location);
//         return data.location;
//     } catch (error) {
//         console.error("Error geocoding address:", error);
//
//         // Fallback to client-side geocoding
//         try {
//             console.log("Falling back to client-side geocoding");
//             const geocoder = new google.maps.Geocoder();
//             return new Promise((resolve, reject) => {
//                 geocoder.geocode({'address': address}, function(results, status) {
//                     if (status === google.maps.GeocoderStatus.OK && results[0]) {
//                         const location = results[0].geometry.location;
//                         const result = {
//                             lat: location.lat(),
//                             lng: location.lng()
//                         };
//                         console.log("Client-side geocoding result:", result);
//                         resolve(result);
//                     } else {
//                         console.error("Client-side geocoding failed:", status);
//                         reject(new Error(`Client-side geocoding failed: ${status}`));
//                     }
//                 });
//             });
//         } catch (fallbackError) {
//             console.error("Client-side geocoding fallback also failed:", fallbackError);
//             return null;
//         }
//     }
// }
//
// /**
//  * Search for places via the server-side endpoint
//  * @param {string} query - Search query
//  * @param {Object} location - Location with latitude and longitude
//  * @param {number} radius - Search radius in meters
//  * @returns {Promise<Array>} Places search results
//  */
// async function searchPlacesServerSide(query, location, radius = 50000) {
//     try {
//         console.log(`Searching places via server: ${query}`);
//
//         // Get the base URL
//         const baseURL = getBaseURL();
//
//         // Build the URL with query parameters
//         let url = `${baseURL}/api/places/search?query=${encodeURIComponent(query)}`;
//
//         // Add location params if available
//         if (location && location.latitude && location.longitude) {
//             url += `&latitude=${location.latitude}&longitude=${location.longitude}&radius=${radius}`;
//         }
//
//         const response = await fetch(url);
//         if (!response.ok) {
//             const errorData = await response.json();
//             throw new Error(errorData.message || `Places search failed: ${response.status}`);
//         }
//
//         const data = await response.json();
//         if (!data.success) {
//             throw new Error('Places search returned an error');
//         }
//
//         console.log(`Found ${data.results.length} places`);
//         return data.results;
//     } catch (error) {
//         console.error("Error searching places:", error);
//         return [];
//     }
// }

// Update the existing geocodeAddressServerSide function to always use the client-side fallback
async function geocodeAddressServerSide(address) {
    try {
        // Always use client-side geocoding for now
        return await geocodeAddressClientSide(address);
    } catch (error) {
        console.error("Geocoding fallback failed:", error);
        return null;
    }
}

// Update the existing searchPlacesServerSide function to always use the client-side fallback
async function searchPlacesServerSide(query, location, radius = 50000) {
    try {
        // Always use client-side places search for now
        return await searchPlacesClientSide(query, location, radius);
    } catch (error) {
        console.error("Places search fallback failed:", error);
        return [];
    }
}

/**
 * Get details for a specific place via the server-side endpoint
 * @param {string} placeId - Google Place ID
 * @returns {Promise<Object|null>} Place details or null
 */
async function getPlaceDetailsServerSide(placeId) {
    try {
        console.log(`Getting place details via server: ${placeId}`);

        // Get the base URL
        const baseURL = getBaseURL();
        const url = `${baseURL}/api/places/details/${placeId}`;

        const response = await fetch(url);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Place details failed: ${response.status}`);
        }

        const data = await response.json();
        if (!data.success || !data.place) {
            throw new Error('Place details returned no results');
        }

        return data.place;
    } catch (error) {
        console.error("Error getting place details:", error);
        return null;
    }
}

/**
 * Geocode an address using client-side geocoding
 * @param {string} address - Address to geocode
 * @returns {Promise<{lat: number, lng: number} | null>} Location coordinates or null
 */
async function geocodeAddressClientSide(address) {
    try {
        console.log(`Geocoding address client-side: ${address}`);

        if (!address) {
            console.error("No address provided for geocoding");
            return null;
        }

        // Create a new geocoder
        const geocoder = new google.maps.Geocoder();

        // Return a promise that resolves with the geocoding result
        return new Promise((resolve, reject) => {
            geocoder.geocode({'address': address}, function(results, status) {
                if (status === google.maps.GeocoderStatus.OK && results[0]) {
                    const location = results[0].geometry.location;
                    const result = {
                        lat: location.lat(),
                        lng: location.lng()
                    };
                    console.log("Client-side geocoding result:", result);
                    resolve(result);
                } else {
                    console.error("Client-side geocoding failed:", status);
                    reject(new Error(`Client-side geocoding failed: ${status}`));
                }
            });
        });
    } catch (error) {
        console.error("Error in client-side geocoding:", error);
        return null;
    }
}

/**
 * Search for places using client-side Places API
 * @param {string} query - Search query
 * @param {Object} location - Location with latitude and longitude
 * @param {number} radius - Search radius in meters
 * @returns {Promise<Array>} Places search results
 */
async function searchPlacesClientSide(query, location) {
    // Make sure Google Maps is initialized first
    await ensureGoogleMapsInitialized();

    return new Promise((resolve, reject) => {
        try {
            console.log("Using client-side Places API search:", query);

            // Create a map div if not already present (needed for PlacesService)
            let mapDiv = document.getElementById('map');
            if (!mapDiv) {
                console.error("Map element not found, creating temporary map div");
                mapDiv = document.createElement('div');
                mapDiv.id = 'temp-map-div';
                mapDiv.style.display = 'none';
                document.body.appendChild(mapDiv);

                // Create a temporary map if needed
                if (!map) {
                    map = new google.maps.Map(mapDiv, {
                        center: { lat: location.latitude || location.lat || 0, lng: location.longitude || location.lng || 0 },
                        zoom: 10
                    });
                }
            }

            // Create location as LatLng object
            const center = new google.maps.LatLng(
                parseFloat(location.latitude) || parseFloat(location.lat) || 0,
                parseFloat(location.longitude) || parseFloat(location.lng) || 0
            );

            // Create the places service
            const service = new google.maps.places.PlacesService(map);

            // Set up the search request
            const request = {
                query: query,
                location: center,
                radius: 50000 // 50km radius
            };

            // Perform the search
            service.textSearch(request, (results, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
                    console.log(`Found ${results.length} places via client-side API`);

                    // Process the results into a consistent format
                    const formattedResults = results.map(place => {
                        // Ensure we have valid location data
                        if (!place.geometry || !place.geometry.location) {
                            console.warn("Place missing geometry or location:", place);
                            return null;
                        }

                        return {
                            id: place.place_id,
                            place_id: place.place_id,
                            name: place.name,
                            displayName: place.name,
                            formatted_address: place.formatted_address,
                            formattedAddress: place.formatted_address,
                            // Store both formats of location for compatibility
                            location: {
                                lat: place.geometry.location.lat(),
                                lng: place.geometry.location.lng()
                            },
                            geometry: {
                                location: place.geometry.location
                            },
                            types: place.types,
                            business_status: place.business_status
                        };
                    }).filter(place => place !== null); // Remove null entries

                    // Clean up temporary div if we created one
                    if (mapDiv.id === 'temp-map-div') {
                        document.body.removeChild(mapDiv);
                    }

                    resolve(formattedResults);
                } else {
                    console.error("Places search failed:", status);

                    // Clean up temporary div if we created one
                    if (mapDiv.id === 'temp-map-div') {
                        document.body.removeChild(mapDiv);
                    }

                    if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
                        resolve([]);
                    } else {
                        reject(new Error(`Places search failed: ${status}`));
                    }
                }
            });
        } catch (error) {
            console.error("Error in client-side places search:", error);
            reject(error);
        }
    });
}

// Update these functions to use the server-side endpoints

// Modified geocodeBusinessAddress function to use server-side geocoding
function geocodeBusinessAddress(business, index, total) {
    if (!business || !business.address1) {
        console.error("Invalid business data for geocoding", business);
        return;
    }

    // Construct the address string
    const addressString = `${business.address1}, ${business.city}, ${business.state} ${business.zip}`;

    // Add a small delay to avoid hitting rate limits
    setTimeout(async () => {
        try {
            // Use server-side geocoding instead of direct Google API call
            const location = await geocodeAddressServerSide(addressString);

            if (location) {
                // Store the coordinates in the business object
                business.lat = location.lat;
                business.lng = location.lng;

                // Create a Google Maps LatLng object
                const googleMapsLocation = new google.maps.LatLng(location.lat, location.lng);

                // Create marker
                addAdvancedMarker(business, googleMapsLocation);

                // Extend bounds
                bounds.extend(googleMapsLocation);

                // If this is the last business, fit the map to the bounds
                if (index === total - 1) {
                    map.fitBounds(bounds);

                    // If we only have one marker, zoom in appropriately
                    if (total === 1) {
                        map.setZoom(15);
                    }

                    // Search for nearby businesses if we have at least one result
                    if (total >= 1) {
                        searchNearbyBusinesses(googleMapsLocation, business.type);
                    }
                }
            } else {
                console.error("Geocoding failed for address: " + addressString);
            }
        } catch (error) {
            console.error("Error in geocodeBusinessAddress:", error);
        }
    }, index * CONFIG.geocodeDelay); // Stagger requests
}

// Modified searchGooglePlaces function to use server-side places search
async function searchGooglePlaces(formData) {
    try {
        console.log("Searching Google Places for:", formData);

        // Make map visible
        const mapContainer = document.getElementById('map');
        if (mapContainer) {
            mapContainer.style.display = 'block';
            mapContainer.style.height = '400px';
        }

        // Clear existing markers
        clearMarkers();

        // Create new bounds
        bounds = new google.maps.LatLngBounds();

        // Build search query
        let searchQuery = '';
        if (formData.businessName) searchQuery += formData.businessName;
        if (formData.address) searchQuery += ' ' + formData.address;
        searchQuery = searchQuery.trim();

        // Show loading indicator
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'map-loading';
        loadingDiv.className = 'loading-indicator';
        loadingDiv.innerHTML = 'Searching for businesses...';
        mapContainer.appendChild(loadingDiv);

        // Geocode the address or use current location
        let searchLocation;

        // Check if user wants to use their location
        const useMyLocation = document.getElementById('use-my-location') &&
            document.getElementById('use-my-location').checked;

        if (useMyLocation) {
            try {
                const userLocation = await getUserLocation();
                searchLocation = {
                    latitude: userLocation.lat,
                    longitude: userLocation.lng
                };
                console.log("Using user's current location for search:", searchLocation);
            } catch (error) {
                console.error("Error getting user location:", error);
                let useLocationFailed = true;
            }
        }

        if (!useMyLocation || typeof useLocationFailed !== 'undefined') {
            try {
                // Use client-side geocoding
                const geocodeResult = await geocodeAddressClientSide(formData.address || searchQuery);

                if (geocodeResult) {
                    searchLocation = {
                        latitude: geocodeResult.lat,
                        longitude: geocodeResult.lng
                    };

                    // Create a Google Maps LatLng object for map operations
                    const googleMapsLocation = new google.maps.LatLng(
                        geocodeResult.lat,
                        geocodeResult.lng
                    );

                    // Extend bounds
                    bounds.extend(googleMapsLocation);

                    console.log("Geocoded search center:", searchLocation);
                } else {
                    throw new Error(`Geocoding failed for address: ${formData.address || searchQuery}`);
                }
            } catch (error) {
                console.error("Error geocoding address:", error);

                // Fall back to default US center
                searchLocation = {
                    latitude: CONFIG.defaultCenter.lat,
                    longitude: CONFIG.defaultCenter.lng
                };

                // Create a Google Maps LatLng object for map operations
                const googleMapsLocation = new google.maps.LatLng(
                    CONFIG.defaultCenter.lat,
                    CONFIG.defaultCenter.lng
                );

                // Extend bounds
                bounds.extend(googleMapsLocation);

                console.log("Using default US center for search");
            }
        }

        try {
            // Use client-side places search
            const placeResults = await searchPlacesClientSide(
                searchQuery,
                searchLocation
            );

            // Remove loading indicator
            const loadingElement = document.getElementById('map-loading');
            if (loadingElement) loadingElement.remove();

            if (!placeResults || placeResults.length === 0) {
                console.log("No places found");
                // Show no results message
                showErrorMessage('No businesses found matching your search criteria within 50 miles.');
                return;
            }

            console.log("Found places:", placeResults.length);

            // Process places into business objects and add markers
            const businessResults = processPlaceResults(placeResults, searchLocation);

            if (businessResults.length === 0) {
                // Show no results message
                showErrorMessage('No businesses found matching your search criteria within 50 miles.');
                return;
            }

            // Sort by distance
            businessResults.sort((a, b) => a.distance - b.distance);

            // Display results
            displaySearchResults(businessResults);

            // Safe bounds adjustment
            if (bounds && !bounds.isEmpty()) {
                // Check if bounds has valid coordinates before fitting
                let validBounds = true;
                const ne = bounds.getNorthEast();
                const sw = bounds.getSouthWest();

                if (isNaN(ne.lat()) || isNaN(ne.lng()) || isNaN(sw.lat()) || isNaN(sw.lng())) {
                    console.warn("Invalid bounds coordinates detected, using center position instead");
                    validBounds = false;
                }

                if (validBounds) {
                    try {
                        map.fitBounds(bounds);

                        // Adjust zoom level safely
                        setTimeout(() => {
                            try {
                                if (businessResults.length <= 2) {
                                    const currentZoom = map.getZoom();
                                    if (currentZoom > 14) {
                                        map.setZoom(14);
                                    }
                                } else if (businessResults.length > 10) {
                                    const currentZoom = map.getZoom();
                                    if (currentZoom < 10) {
                                        map.setZoom(10);
                                    }
                                }
                            } catch (zoomError) {
                                console.error("Error adjusting zoom:", zoomError);
                            }
                        }, 100);
                    } catch (fitBoundsError) {
                        console.error("Error fitting bounds:", fitBoundsError);
                        // If fitBounds fails, center on search location
                        map.setCenter(new google.maps.LatLng(
                            searchLocation.latitude,
                            searchLocation.longitude
                        ));
                        map.setZoom(11);
                    }
                } else {
                    // Use search location as center
                    map.setCenter(new google.maps.LatLng(
                        searchLocation.latitude,
                        searchLocation.longitude
                    ));
                    map.setZoom(11);
                }
            } else {
                // If bounds is empty, center on search location
                map.setCenter(new google.maps.LatLng(
                    searchLocation.latitude,
                    searchLocation.longitude
                ));
                map.setZoom(11);
            }
        } catch (error) {
            console.error("Error searching places:", error);

            // Remove loading indicator
            const loadingElement = document.getElementById('map-loading');
            if (loadingElement) loadingElement.remove();

            // Show error in search results
            showErrorMessage(`Error searching for businesses: ${error.message}`);

            // Center map on search location if possible
            if (searchLocation) {
                try {
                    map.setCenter(new google.maps.LatLng(
                        searchLocation.latitude,
                        searchLocation.longitude
                    ));
                    map.setZoom(11);
                } catch (centerError) {
                    console.error("Error centering map:", centerError);
                }
            }
        }
    } catch (error) {
        console.error("Error in searchGooglePlaces:", error);

        // Remove loading indicator if it exists
        const loadingElement = document.getElementById('map-loading');
        if (loadingElement) loadingElement.remove();

        // Show error message
        showErrorMessage(`Error searching for businesses: ${error.message}`);
    }
}

// Modified window.addBusinessToDatabase function to use server-side place details
window.addBusinessToDatabase = async function(placeId) {
    console.log("Adding place to database:", placeId);

    try {
        // Use server-side endpoint to get place details
        const place = await getPlaceDetailsServerSide(placeId);

        if (!place) {
            throw new Error("Could not retrieve place details");
        }

        // Create business data object from place details
        const businessData = {
            name: place.name || '',
            address1: place.address_components.street_number + ' ' + place.address_components.route,
            city: place.address_components.city,
            state: place.address_components.state,
            zip: place.address_components.zip,
            phone: place.phone || '',
            placeId: place.place_id,

            // Store coordinates for later use
            lat: place.location.lat || 0,
            lng: place.location.lng || 0,
            // Add this for proper GeoJSON formatting
            location: {
                type: 'Point',
                coordinates: [
                    place.location.lng || 0,
                    place.location.lat || 0
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
 * Search places using the new Places API Text Search endpoint
 * @param {string} query - Search query text
 * @param {Object} location - Location with latitude and longitude
 * @param {number} radius - Search radius in meters
 * @returns {Promise<Array>} Array of place results
 */
async function searchPlacesWithTextSearch(query, location, radius) {
    try {
        // Get the API key
        const apiKey = getGoogleMapsApiKey();

        // If no API key, show an error
        if (!apiKey) {
            console.error("No Google Maps API key found");
            throw new Error("Google Maps API key is missing");
        }

        // Create the request body for Text Search
        const requestBody = {
            textQuery: query || "businesses"
        };

        // Add location bias if available
        if (location) {
            requestBody.locationBias = {
                circle: {
                    center: {
                        latitude: location.latitude,
                        longitude: location.longitude
                    },
                    radius: radius
                }
            };
        }

        console.log("Making Places API request with:", {
            query: requestBody.textQuery,
            location: location ? `${location.latitude},${location.longitude}` : 'not provided',
            radius: radius
        });

        // Set up the request
        const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': apiKey,
                'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.types,places.primaryType,places.nationalPhoneNumber'
            },
            body: JSON.stringify(requestBody)
        });

        // Parse the response
        const data = await response.json();

        if (data.error) {
            console.error("Places API error:", data.error);
            throw new Error(`Places API error: ${data.error.message}`);
        }

        console.log("Places API response:", data);

        // Return the places array or an empty array if no results
        return data.places || [];
    } catch (error) {
        console.error("Error in searchPlacesWithTextSearch:", error);
        throw error;
    }
}

// Add an error handling function to show user-friendly messages
function showErrorMessage(message, container) {
    // If a specific container is provided, use it; otherwise use default
    const targetContainer = container || document.getElementById('search_table');
    if (targetContainer) {
        targetContainer.style.display = 'block';

        // If it's the search table, look for its tbody
        const tableBody = targetContainer.querySelector('tbody');
        if (tableBody) {
            tableBody.innerHTML = `<tr><td colspan="5" class="text-center error-message">${message}</td></tr>`;
        } else {
            // Otherwise just put the message in the container
            targetContainer.innerHTML = `<div class="error-message">${message}</div>`;
        }

        // Scroll to the message
        targetContainer.scrollIntoView({behavior: 'smooth'});
    } else {
        // Fallback to alert if no container is available
        alert(message);
    }
}



/**
 * Process place results into business objects and add markers
 * @param {Array} places - Place results from API
 * @param {Object} searchLocation - Search center location
 * @returns {Array} Array of business objects
 */
function processPlaceResults(places, searchLocation) {
    const businessResults = [];

    // Create the search location as LatLng for distance calculations
    const searchLatLng = new google.maps.LatLng(searchLocation.latitude, searchLocation.longitude);

    // Create new bounds for this search
    bounds = new google.maps.LatLngBounds();

    // Extend bounds with the search center location
    bounds.extend(searchLatLng);

    places.forEach(place => {
        try {
            // Skip if no location
            if (!place.location) return;

            // Extract address components
            const addressParts = place.formattedAddress ? place.formattedAddress.split(',') : [];
            let address1 = '';
            let city = '';
            let state = '';
            let zip = '';

            if (addressParts.length >= 1) address1 = addressParts[0].trim();
            if (addressParts.length >= 2) city = addressParts[1].trim();
            if (addressParts.length >= 3) {
                const stateZip = addressParts[2].trim().split(' ');
                if (stateZip.length >= 1) state = stateZip[0].trim();
                if (stateZip.length >= 2) zip = stateZip[1].trim();
            }

            // Map to business type
            let businessType = 'OTHER';
            if (place.primaryType) {
                if (place.primaryType === 'restaurant') businessType = 'REST';
                else if (place.primaryType === 'store') businessType = 'RETAIL';
                else if (place.primaryType === 'hardware_store') businessType = 'HARDW';
                else if (place.primaryType === 'gas_station') businessType = 'FUEL';
                // Add more mappings as needed
            }

            // Properly create Google Maps LatLng object for place location
            let placeLatLng;

            // Handle different formats of location data
            if (place.location && place.location.lat && place.location.lng) {
                // Direct lat/lng format
                placeLatLng = new google.maps.LatLng(
                    parseFloat(place.location.lat),
                    parseFloat(place.location.lng)
                );
            } else if (place.location && typeof place.location.latitude === 'number' && typeof place.location.longitude === 'number') {
                // Latitude/longitude format
                placeLatLng = new google.maps.LatLng(
                    place.location.latitude,
                    place.location.longitude
                );
            } else if (place.geometry && place.geometry.location) {
                // Standard Places API format
                if (typeof place.geometry.location.lat === 'function') {
                    // It's already a LatLng object
                    placeLatLng = place.geometry.location;
                } else {
                    // It's a lat/lng literal
                    placeLatLng = new google.maps.LatLng(
                        place.geometry.location.lat,
                        place.geometry.location.lng
                    );
                }
            } else {
                console.warn("Place has no valid location data:", place);
                return; // Skip this place
            }

            // Calculate distance
            const distance = google.maps.geometry.spherical.computeDistanceBetween(
                searchLatLng,
                placeLatLng
            );

            // Check for duplicates
            const isDuplicate = markers.some(marker => {
                if (!marker.business) return false;

                if (marker.business.placeId === place.id ||
                    marker.business.placeId === place.place_id ||
                    marker.business._id === 'google_' + place.id ||
                    marker.business._id === 'google_' + place.place_id) {
                    return true;
                }

                return false;
            });

            if (isDuplicate) return;

            // Create business object
            const business = {
                _id: 'google_' + (place.id || place.place_id),
                bname: place.displayName || place.name || 'Unknown Business',
                address1: address1,
                city: city,
                state: state,
                zip: zip,
                type: businessType,
                phone: place.nationalPhoneNumber || place.formatted_phone_number || '',
                isGooglePlace: true,
                placeId: place.id || place.place_id,
                lat: placeLatLng.lat(),
                lng: placeLatLng.lng(),
                distance: distance
            };

            // Add marker with properly created LatLng object
            addAdvancedMarker(business, placeLatLng);

            // Add this location to the bounds
            bounds.extend(placeLatLng);

            // Add to results
            businessResults.push(business);
        } catch (error) {
            console.error("Error processing place:", error);
            // Skip this place and continue with others
        }
    });

    return businessResults;
}


// /**
//  * Get the Google Maps API key from the app configuration
//  * @returns {string} API key
//  */
// function getGoogleMapsApiKey() {
//     // Try to get API key from window.appConfig
//     if (window.appConfig && window.appConfig.googleMapsApiKey) {
//         return window.appConfig.googleMapsApiKey;
//     }
//
//     // As a fallback, look for a meta tag with the API key
//     const metaTag = document.querySelector('meta[name="google-maps-api-key"]');
//     if (metaTag) {
//         return metaTag.content;
//     }
//
//     // Another option - check if there's a global API key variable
//     if (typeof GOOGLE_MAPS_API_KEY !== 'undefined') {
//         return GOOGLE_MAPS_API_KEY;
//     }
//
//     // Final fallback - look for an API key in any script tags
//     const scriptTags = document.querySelectorAll('script[src*="maps.googleapis.com"]');
//     for (const script of scriptTags) {
//         const src = script.getAttribute('src');
//         const keyMatch = src.match(/[?&]key=([^&]+)/);
//         if (keyMatch && keyMatch[1]) {
//             return keyMatch[1];
//         }
//     }
//
//     console.error("Could not find Google Maps API key");
//     return '';
// }

// /**
//  * Perform a custom place search using the Geocoding API
//  * This avoids the need for PlacesService
//  * @param {string} query - Search query
//  * @param {Object} location - Center location
//  * @param {number} radius - Search radius in meters
//  * @returns {Promise<Array>} Array of place IDs
//  */
// async function performCustomPlaceSearch(query, location, radius) {
//     try {
//         // For simplicity, use a predefined set of common business types
//         const commonBusinessTypes = [
//             'store', 'restaurant', 'cafe', 'bar', 'supermarket',
//             'pharmacy', 'gas_station', 'department_store', 'hardware_store',
//             'shopping_mall', 'clothing_store', 'home_goods_store'
//         ];
//
//         // Build a geocoding URL with business type bias
//         // This is a workaround to get businesses without using PlacesService
//         const geocoder = new google.maps.Geocoder();
//
//         // Combine query with location
//         const fullQuery = query ?
//             `${query} near ${location.lat()},${location.lng()}` :
//             `businesses near ${location.lat()},${location.lng()}`;
//
//         console.log("Geocoding with query:", fullQuery);
//
//         const results = await new Promise((resolve, reject) => {
//             geocoder.geocode({
//                 'address': fullQuery,
//                 'location': location,
//                 'radius': radius
//             }, function(results, status) {
//                 if (status === google.maps.GeocoderStatus.OK && results && results.length > 0) {
//                     resolve(results);
//                 } else if (status === google.maps.GeocoderStatus.ZERO_RESULTS) {
//                     resolve([]);
//                 } else {
//                     reject(new Error(`Geocoding search failed: ${status}`));
//                 }
//             });
//         });
//
//         // Extract and filter unique place IDs from results
//         const placeIds = [];
//         if (results && results.length > 0) {
//             for (const result of results) {
//                 if (result.place_id && !placeIds.includes(result.place_id)) {
//                     placeIds.push(result.place_id);
//                 }
//             }
//         }
//
//         return placeIds;
//     } catch (error) {
//         console.error("Error in custom place search:", error);
//         return [];
//     }
// }
//
// /**
//  * Fetch place details for an array of place IDs
//  * Uses Place API for individual place details to avoid warnings
//  * @param {Array} placeIds - Array of place IDs
//  * @param {Object} searchLocation - Search center location
//  * @param {number} searchRadius - Search radius in meters
//  * @returns {Promise<Array>} Array of business objects
//  */
// async function fetchPlaceDetailsForIds(placeIds, searchLocation, searchRadius) {
//     try {
//         // Import the Place library
//         const { Place } = await google.maps.importLibrary("places");
//
//         const businessResults = [];
//         const promises = [];
//
//         for (const placeId of placeIds) {
//             promises.push((async () => {
//                 try {
//                     // Create a Place instance
//                     const place = new Place({
//                         id: placeId
//                     });
//
//                     // Fetch place details
//                     await place.fetchFields({
//                         fields: [
//                             'displayName',
//                             'formattedAddress',
//                             'addressComponents',
//                             'location',
//                             'types',
//                             'nationalPhoneNumber'
//                         ]
//                     });
//
//                     console.log("Place details:", place);
//
//                     // Extract address components
//                     const addressComponents = {};
//                     if (place.addressComponents) {
//                         for (const component of place.addressComponents) {
//                             for (const type of component.types) {
//                                 addressComponents[type] = component.shortText;
//                             }
//                         }
//                     }
//
//                     // Create address parts
//                     const address1 = `${addressComponents.street_number || ''} ${addressComponents.route || ''}`.trim();
//                     const city = addressComponents.locality || '';
//                     const state = addressComponents.administrative_area_level_1 || '';
//                     const zip = addressComponents.postal_code || '';
//
//                     // Map to business type
//                     let businessType = 'OTHER';
//                     if (place.types) {
//                         if (place.types.includes('restaurant')) businessType = 'REST';
//                         else if (place.types.includes('store')) businessType = 'RETAIL';
//                         else if (place.types.includes('hardware_store')) businessType = 'HARDW';
//                         else if (place.types.includes('gas_station')) businessType = 'FUEL';
//                         // Add more mappings as needed
//                     }
//
//                     // Calculate distance from search location
//                     let distance = 0;
//                     if (place.location && searchLocation) {
//                         distance = google.maps.geometry.spherical.computeDistanceBetween(
//                             searchLocation,
//                             place.location
//                         );
//                     }
//
//                     // Skip if out of range
//                     if (distance > searchRadius) {
//                         console.log(`Skipping ${place.displayName} - too far (${distance/1000}km)`);
//                         return null;
//                     }
//
//                     // Check if this place matches an existing marker by name and location
//                     const isDuplicate = markers.some(marker => {
//                         if (!marker.business) return false;
//
//                         // Match by name and proximity
//                         const nameSimilarity = similarity(
//                             marker.business.bname ? marker.business.bname.toLowerCase() : '',
//                             place.displayName ? place.displayName.toLowerCase() : ''
//                         );
//
//                         if (nameSimilarity > 0.7 && place.location) {
//                             // Get positions
//                             const markerPos = marker.position;
//                             const placePos = place.location;
//
//                             // Calculate distance
//                             const distance = google.maps.geometry.spherical.computeDistanceBetween(
//                                 new google.maps.LatLng(markerPos.lat, markerPos.lng),
//                                 placePos
//                             );
//
//                             // If within 100 meters, it's a duplicate
//                             if (distance < 100) {
//                                 console.log(`Skipping duplicate: ${place.displayName} (matches ${marker.business.bname})`);
//                                 return true;
//                             }
//                         }
//
//                         return false;
//                     });
//
//                     // Skip duplicates
//                     if (isDuplicate) return null;
//
//                     // Create business object
//                     const business = {
//                         _id: 'google_' + place.id,
//                         bname: place.displayName,
//                         address1: address1 || (place.formattedAddress || '').split(',')[0] || '',
//                         city: city,
//                         state: state,
//                         zip: zip,
//                         type: businessType,
//                         phone: place.nationalPhoneNumber || '',
//                         isGooglePlace: true,
//                         placeId: place.id,
//                         lat: place.location?.lat || 0,
//                         lng: place.location?.lng || 0,
//                         distance: distance
//                     };
//
//                     // Add marker if we have coordinates
//                     if (place.location && place.location.lat) {
//                         addAdvancedMarker(business, place.location);
//
//                         // Extend bounds with this place
//                         bounds.extend(place.location);
//                     }
//
//                     return business;
//                 } catch (error) {
//                     console.error(`Error processing place ${placeId}:`, error);
//                     return null;
//                 }
//             })());
//         }
//
//         // Wait for all place details to be fetched
//         const results = await Promise.all(promises);
//
//         // Filter out null results and add valid businesses
//         results.filter(result => result !== null).forEach(business => {
//             businessResults.push(business);
//         });
//
//         return businessResults;
//     } catch (error) {
//         console.error("Error fetching place details:", error);
//         return [];
//     }
// }



/**
 * Ensure map is visible and properly sized
 */
function ensureMapVisibility() {
    const mapContainer = document.getElementById('map');
    if (mapContainer) {
        // Force the map to be visible and sized properly
        mapContainer.style.display = 'block';
        mapContainer.style.height = '400px';

        console.log("Map container dimensions:", mapContainer.offsetWidth, "x", mapContainer.offsetHeight);

        // Force map refresh if initialized
        if (mapInitialized && map) {
            // Trigger resize event to refresh the map
            google.maps.event.trigger(map, 'resize');

            // If we have markers, make sure they're visible
            if (markers.length > 0) {
                // Create new bounds if needed
                if (!bounds) {
                    bounds = new google.maps.LatLngBounds();
                }

                // Add all markers to bounds
                markers.forEach(marker => {
                    if (marker && marker.position) {
                        bounds.extend(marker.position);
                    }
                });

                // Fit bounds if not empty
                if (!bounds.isEmpty()) {
                    map.fitBounds(bounds);
                    console.log("Fitted map to bounds for", markers.length, "markers");
                } else if (markers.length === 1 && markers[0].position) {
                    // Center on single marker
                    map.setCenter(markers[0].position);
                    map.setZoom(15);
                    console.log("Centered on single marker");
                }
            }
        }
    }
}

// /**
//  * Display Google Places search results
//  * @param {Array} businesses - Array of business objects from Google Places
//  */
// function displayGoogleSearchResults(businesses) {
//     const businessSearchTable = document.getElementById('business_search');
//     const searchTableContainer = document.getElementById('search_table');
//
//     if (!businessSearchTable || !searchTableContainer) {
//         console.error("Required elements not found in the DOM");
//         return;
//     }
//
//     // Get the table body
//     let tableBody = businessSearchTable.querySelector('tbody');
//     if (!tableBody) {
//         console.error("Table body not found within business_search table");
//         return;
//     }
//
//     // Clear existing rows
//     tableBody.innerHTML = '';
//
//     // Make sure businesses is an array
//     if (!Array.isArray(businesses) || businesses.length === 0) {
//         tableBody.innerHTML = '<tr><td colspan="5" class="text-center">No businesses found matching your search criteria.</td></tr>';
//         searchTableContainer.style.display = 'block';
//         searchTableContainer.scrollIntoView({behavior: 'smooth'});
//         return;
//     }
//
//     // Show the search results table
//     searchTableContainer.style.display = 'block';
//
//     // Hide the "hidden" text in the h5
//     const searchTableH5 = searchTableContainer.querySelector('h5');
//     if (searchTableH5) {
//         searchTableH5.style.display = 'none';
//     }
//
//     // Add each business to the table
//     businesses.forEach(business => {
//         if (!business) return; // skip null or undefined entries
//
//         // Format the address line
//         const addressLine = business.address1 ?
//             `${business.address1}<br>${business.city}, ${business.state} ${business.zip}` :
//             'Address information not available';
//
//         // Convert the business type code to a readable label
//         const businessType = getBusinessTypeLabel(business.type);
//
//         // Format distance if available
//         const distanceText = business.distance ?
//             ` (${(business.distance / 1609.34).toFixed(1)} miles)` : '';
//
//         // Create a new row
//         const row = document.createElement('tr');
//
//         // Add a View on Map button and Add to Database button
//         const viewMapButton = `<button class="view-map-btn" onclick="focusOnMapMarker('${business._id}')">View on Map</button>`;
//         const addToDbButton = business.isGooglePlace ?
//             `<button class="add-to-db-btn" onclick="addBusinessToDatabase('${business.placeId}')">Add to Patriot Thanks</button>` :
//             '';
//
//         // First populate with basic business info
//         row.innerHTML = `
//             <th class="left_table" data-business-id="${business._id}">${business.bname}${distanceText}</th>
//             <th class="left_table">${addressLine}</th>
//             <th class="left_table">${businessType}</th>
//             <th class="right_table">${business.isGooglePlace ? 'Not in database yet' : 'Loading incentives...'}</th>
//             <th class="center_table">${viewMapButton} ${addToDbButton}</th>
//         `;
//
//         tableBody.appendChild(row);
//
//         // Only fetch incentives for businesses in our database
//         if (!business.isGooglePlace) {
//             fetchBusinessIncentives(business._id);
//         }
//     });
//
//     // Scroll to the results
//     searchTableContainer.scrollIntoView({behavior: 'smooth'});
// }

/**
 * Show info window for Google Places results not in the database
 * @param {Object} business - Business object from Google Places
 * @param {Object} position - Map position
 */
function showGooglePlaceInfoWindow(business, position) {
    console.log("Showing Google Place info window for", business.bname);

    // Create info window if needed
    if (!infoWindow) {
        infoWindow = new google.maps.InfoWindow({
            maxWidth: 320,
            disableAutoPan: false
        });
    }

    // Format address
    const addressLine = business.address2
        ? `${business.address1}<br>${business.address2}<br>${business.city}, ${business.state} ${business.zip}`
        : `${business.address1}<br>${business.city}, ${business.state} ${business.zip}`;

    // Get business type label
    const businessType = getBusinessTypeLabel(business.type);

    // Format distance if available
    const distanceText = business.distance
        ? `<p><strong>Distance:</strong> ${(business.distance / 1609.34).toFixed(1)} miles</p>` : '';

    // Create content with "Add to Patriot Thanks" button - using your existing CSS classes
    const contentString = `
    <div class="info-window">
        <h3>${business.bname}</h3>
        <p><strong>Address:</strong><br>${addressLine}</p>
        ${business.phone ? `<p><strong>Phone:</strong> ${business.phone}</p>` : ''}
        ${distanceText}
        <p><strong>Type:</strong> ${businessType}</p>
        <p><strong>Status:</strong> This business is not yet in the Patriot Thanks database.</p>
        <div class="info-window-actions">
            <button class="add-business-btn" 
                    onclick="window.addBusinessToDatabase('${business.placeId}')">
                Add to Patriot Thanks
            </button>
        </div>
    </div>
    `;

    // Set content and open
    infoWindow.setContent(contentString);

    // Apply scrollable styles
    applyInfoWindowScrollableStyles();

    // Handle position
    if (position.lat && typeof position.lat === 'function') {
        infoWindow.setPosition(position);
    } else {
        infoWindow.setPosition(new google.maps.LatLng(position.lat, position.lng));
    }

    infoWindow.open(map);

    // Add event listener to ensure scrollable styles are applied
    google.maps.event.addListener(infoWindow, 'domready', function() {
        console.log("Google Place info window DOM ready, forcing scrollable behavior");

        // Force scrollable styling application
        const iwOuter = document.querySelector('.gm-style-iw');
        if (iwOuter) {
            // Force scrollable
            const iwContainer = iwOuter.querySelector('.gm-style-iw-d');
            if (iwContainer) {
                iwContainer.style.overflow = 'auto';
                iwContainer.style.maxHeight = '350px';
            }
        }
    });

    console.log("Opened Google Place info window");
}



/**
 * Add a Google Place to our database
 * @param {string} placeId - Google Place ID
 */
window.addGooglePlaceToDatabase = async function(placeId) {
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

// Modify your existing initGoogleMap function
window.initGoogleMap = function() {
    console.log("Global initGoogleMap function called");

    try {
        // Check if map container exists
        const mapContainer = document.getElementById("map");
        if (!mapContainer) {
            console.error("Map container not found in the DOM");
            return;
        }

        console.log("Map container dimensions:", mapContainer.offsetWidth, "x", mapContainer.offsetHeight);

        // Only create the map if it doesn't already exist
        if (!map) {
            // Create a map centered on the US with POI clicks enabled
            map = new google.maps.Map(mapContainer, {
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
            setupMapClickHandler();
            setupMarkerClickPriority();

            initAdditionalMapFeatures();
        } else {
            console.log("Map already exists, skipping initialization");
        }

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
 * Initialize the advanced marker creation with proper setup
 */
async function initAdvancedMarkers() {
    try {
        // Add the custom marker styles
        addCustomMarkerStyles();

        // Check if Font Awesome is loaded
        if (!document.querySelector('link[href*="font-awesome"]')) {
            console.warn("Font Awesome might not be loaded - adding fallback");

            // Add fallback Font Awesome if needed
            const fontAwesomeLink = document.createElement('link');
            fontAwesomeLink.rel = 'stylesheet';
            fontAwesomeLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css';
            document.head.appendChild(fontAwesomeLink);
        }

        // Load the marker library in advance
        await google.maps.importLibrary("marker");
        console.log("Advanced marker library loaded successfully");

        return true;
    } catch (error) {
        console.error("Error initializing advanced markers:", error);
        return false;
    }
}

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
        try {
            // Get position based on marker type
            let position;
            if (marker.getPosition) {
                // Standard marker
                position = marker.getPosition();
            } else if (marker.position) {
                // Advanced marker
                if (typeof marker.position.lat === 'function') {
                    // It's already a LatLng object
                    position = marker.position;
                } else {
                    // It's a position object with lat/lng properties
                    position = new google.maps.LatLng(
                        parseFloat(marker.position.lat),
                        parseFloat(marker.position.lng)
                    );
                }
            } else if (marker.business && marker.business.lat && marker.business.lng) {
                // Fall back to business object coordinates
                position = new google.maps.LatLng(
                    parseFloat(marker.business.lat),
                    parseFloat(marker.business.lng)
                );
            } else {
                console.error("Could not determine marker position");
                alert("Could not focus on this business on the map.");
                return;
            }

            // Verify position has valid coordinates
            if (isNaN(position.lat()) || isNaN(position.lng())) {
                console.error("Invalid marker position coordinates:", position);
                alert("This business has invalid map coordinates.");
                return;
            }

            // Center the map on this marker
            map.setCenter(position);
            map.setZoom(16);

            // Open the info window for this marker
            if (marker.business.isGooglePlace) {
                showGooglePlaceInfoWindow(marker.business, position);
            } else {
                showInfoWindow(marker);
            }

            // Scroll to the map
            document.getElementById('map').scrollIntoView({behavior: 'smooth'});

            console.log("Successfully focused on marker for business:", businessId);
        } catch (error) {
            console.error("Error focusing on marker:", error);
            alert("There was an error focusing on this business on the map.");
        }
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
                    // Check if this is already one of our markers
                    const existingMarker = markers.find(marker =>
                        marker.business &&
                        (marker.business.placeId === event.placeId ||
                            marker.business._id === 'google_' + event.placeId)
                    );

                    if (existingMarker) {
                        // If it's already one of our markers, show our custom info window
                        console.log("Found existing marker for clicked place");
                        showInfoWindow(existingMarker);
                        return;
                    }

                    // Otherwise, create a Place instance with the clicked place ID
                    const place = new Place({
                        id: event.placeId
                    });

                    // Fetch the place details using the modern API
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

                    // Calculate distance if possible
                    if (place.location) {
                        // Try to calculate distance from current center
                        const center = map.getCenter();
                        const distance = google.maps.geometry.spherical.computeDistanceBetween(
                            center,
                            place.location
                        );
                        place.distance = distance;
                    }

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
 * Apply custom CSS to make info windows scrollable
 */
function applyInfoWindowScrollableStyles() {
    if (!document.getElementById('info-window-scrollable-styles')) {
        const style = document.createElement('style');
        style.id = 'info-window-scrollable-styles';
        style.textContent = `
            /* Info window structure */
            .gm-style .gm-style-iw-c {
                padding: 0 !important;
                border-radius: 8px !important;
                box-shadow: 0 2px 7px 1px rgba(0,0,0,0.3) !important;
                max-width: 330px !important;
                max-height: 400px !important;
                overflow: hidden !important;
            }
            
            .gm-style .gm-style-iw-d {
                overflow: auto !important;
                max-height: 350px !important;
                padding-right: 8px !important; /* Allow space for scrollbar */
            }
            
            /* Custom info window styles */
            .info-window {
                padding: 12px;
                max-width: 300px;
            }
            
            .info-window h3 {
                margin-top: 0;
                margin-bottom: 10px;
                color: #212121;
                font-size: 16px;
                line-height: 1.3;
            }
            
            .info-window p {
                margin: 6px 0;
                font-size: 14px;
                line-height: 1.4;
            }
            
            .info-window-actions {
                margin-top: 12px;
                padding-top: 8px;
                border-top: 1px solid #eee;
                text-align: right;
            }
            
            .add-business-btn {
                background-color: #EA4335;
                color: white;
                border: none;
                padding: 8px 12px;
                border-radius: 4px;
                cursor: pointer;
                margin-top: 5px;
                font-size: 13px;
                font-weight: 500;
            }
            
            .add-business-btn:hover {
                background-color: #D32F2F;
            }
            
            .view-details-btn {
                background-color: #4285F4;
                color: white;
                border: none;
                padding: 8px 12px;
                border-radius: 4px;
                cursor: pointer;
                margin-top: 5px;
                font-size: 13px;
                font-weight: 500;
            }
            
            .view-details-btn:hover {
                background-color: #2A75F3;
            }
            
            /* Incentives list */
            .incentives-list {
                margin: 8px 0;
                padding-left: 20px;
            }
            
            .incentives-list li {
                margin-bottom: 6px;
            }
            
            /* Custom scrollbar styles */
            .gm-style .gm-style-iw-d::-webkit-scrollbar {
                width: 6px;
                height: 6px;
            }
            
            .gm-style .gm-style-iw-d::-webkit-scrollbar-track {
                background: #f1f1f1;
                border-radius: 3px;
            }
            
            .gm-style .gm-style-iw-d::-webkit-scrollbar-thumb {
                background: #c1c1c1;
                border-radius: 3px;
            }
            
            .gm-style .gm-style-iw-d::-webkit-scrollbar-thumb:hover {
                background: #a8a8a8;
            }
            
            /* Close button adjustment */
            .gm-ui-hover-effect {
                top: 2px !important;
                right: 2px !important;
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
 * Helper function to calculate string similarity
 */
function similarity(s1, s2) {
    if (!s1 || !s2) return 0;

    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;

    if (longer.length === 0) return 1.0;

    return (longer.length - editDistance(longer, shorter)) / parseFloat(longer.length);
}

/**
 * Calculate edit distance between strings
 */
function editDistance(s1, s2) {
    s1 = s1.toLowerCase();
    s2 = s2.toLowerCase();

    const costs = [];

    for (let i = 0; i <= s1.length; i++) {
        let lastValue = i;
        for (let j = 0; j <= s2.length; j++) {
            if (i === 0) {
                costs[j] = j;
            } else if (j > 0) {
                let newValue = costs[j - 1];
                if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
                    newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
                }
                costs[j - 1] = lastValue;
                lastValue = newValue;
            }
        }
        if (i > 0) costs[s2.length] = lastValue;
    }

    return costs[s2.length];
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

// /**
//  * Function to enhance markers with images
//  */
// async function enhanceMarkersWithImages() {
//     // Only process if we have markers
//     if (!markers || markers.length === 0) return;
//
//     console.log("Enhancing markers with images...");
//
//     for (const marker of markers) {
//         if (!marker.business) continue;
//
//         // Skip if business already has an image
//         if (marker.business.image_url) continue;
//
//         // Try to get an image for the business
//         const imageUrl = await fetchPlacePhotosForBusiness(marker.business);
//
//         if (imageUrl) {
//             // Update the business object
//             marker.business.image_url = imageUrl;
//
//             // Update the marker with the new image
//             updateMarkerWithImage(marker, imageUrl);
//         }
//     }
// }

// /**
//  * Geocode a business address to get coordinates
//  * @param {Object} business - Business object with address data
//  * @param {number} index - Index of the business in the array
//  * @param {number} total - Total number of businesses
//  */
// function geocodeBusinessAddress(business, index, total) {
//     if (!business || !business.address1) {
//         console.error("Invalid business data for geocoding", business);
//         return;
//     }
//
//     // Construct the address string
//     const addressString = `${business.address1}, ${business.city}, ${business.state} ${business.zip}`;
//
//     // Create a geocoder
//     const geocoder = new google.maps.Geocoder();
//
//     // Add a small delay to avoid hitting geocoding rate limits
//     setTimeout(() => {
//         geocoder.geocode({'address': addressString}, function (results, status) {
//             if (status === google.maps.GeocoderStatus.OK) {
//                 if (results[0]) {
//                     const location = results[0].geometry.location;
//
//                     // Store the coordinates in the business object
//                     business.lat = location.lat();
//                     business.lng = location.lng();
//
//                     // Create marker
//                     addAdvancedMarker(business, location);
//
//                     // Extend bounds
//                     bounds.extend(location);
//
//                     // If this is the last business, fit the map to the bounds
//                     if (index === total - 1) {
//                         map.fitBounds(bounds);
//
//                         // If we only have one marker, zoom in appropriately
//                         if (total === 1) {
//                             map.setZoom(15);
//                         }
//
//                         // Search for nearby businesses if we have at least one result
//                         if (total >= 1) {
//                             // Use the current business instead of trying to access the businesses array
//                             searchNearbyBusinesses(location, business.type);
//                         }
//                     }
//                 }
//             } else {
//                 console.error("Geocode failed for address " + addressString + ": " + status);
//             }
//         });
//     }, index * CONFIG.geocodeDelay); // Stagger requests
// }

/**
 * Add an advanced marker to the map (Updated to ensure icons display correctly)
 * @param {Object} business - Business object
 * @param {Object} location - Google Maps location object
 */
async function addAdvancedMarker(business, location) {
    try {
        // Import the marker library
        const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");

        // Create a position object from the location
        let position;
        if (location instanceof google.maps.LatLng) {
            // It's already a LatLng object
            position = location;
        } else if (location.lat && typeof location.lat === 'function') {
            // It's a LatLng-like object with lat() method
            position = location;
        } else if (typeof location.lat === 'number' && typeof location.lng === 'number') {
            // It's a position object with numeric lat/lng
            position = new google.maps.LatLng(location.lat, location.lng);
        } else if (business.lat && business.lng) {
            // Use the coordinates from the business object
            position = new google.maps.LatLng(
                parseFloat(business.lat),
                parseFloat(business.lng)
            );
        } else {
            console.error("Invalid position for marker:", location);
            return null;
        }

        // Validate position has real coordinates
        if (isNaN(position.lat()) || isNaN(position.lng())) {
            console.error("Position has NaN coordinates:", position);
            return null;
        }

        // Ensure business name is a string
        const businessTitle = typeof business.bname === 'string' ? business.bname : String(business.bname || 'Business');

        // Determine marker color
        const isNearby = business.isNearby === true;
        const pinClass = isNearby ? "nearby" : "primary";
        const pinColor = isNearby ? CONFIG.markerColors.nearby : CONFIG.markerColors.primary;

        // Get business type icon
        const businessIcon = getBusinessTypeIconHTML(business.type);

        // Create a pin element
        const pinElement = document.createElement('div');
        pinElement.className = 'custom-marker';
        pinElement.setAttribute('title', businessTitle);
        pinElement.style.cursor = 'pointer';

        // Set innerHTML with container for better positioning
        pinElement.innerHTML = `
            <div class="marker-container">
                <div class="marker-pin ${pinClass}" style="background-color: ${pinColor};">
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
            title: businessTitle,
            content: pinElement,
            collisionBehavior: isNearby ? 'OPTIONAL_AND_HIDES_LOWER_PRIORITY' : 'REQUIRED_AND_HIDES_OPTIONAL'
        });

        // Store the business data with the marker
        marker.business = business;
        marker.isNearby = isNearby;
        marker.position = position;

        // Add click event listener
        pinElement.addEventListener('click', function(e) {
            console.log("Marker element clicked:", businessTitle);
            e.stopPropagation();
            showInfoWindow(marker);
        });

        // Add the marker to our array
        markers.push(marker);
        console.log(`Added advanced marker for ${businessTitle}`);

        return marker;
    } catch (error) {
        console.error("Error creating advanced marker:", error);

        // Fall back to standard marker if advanced marker fails
        return createFallbackMarker(business, location);
    }
}



/**
 * Create a fallback standard marker if advanced marker fails
 * @param {Object} business - Business object
 * @param {Object} location - Location object
 * @returns {Object} Google Maps marker
 */
function createFallbackMarker(business, location) {
    try {
        // Create a position object from the location
        let position;
        if (location.lat && typeof location.lat === 'function') {
            position = { lat: location.lat(), lng: location.lng() };
        } else if (typeof location.lat === 'number') {
            position = location;
        } else if (business.lat && business.lng) {
            position = { lat: business.lat, lng: business.lng };
        } else {
            console.error("Invalid location for fallback marker:", location);
            return null;
        }

        // Ensure business name is a string
        const businessTitle = String(business.bname || 'Business');

        // Determine marker color
        const isNearby = business.isNearby === true;
        const pinColor = isNearby ? CONFIG.markerColors.nearby : CONFIG.markerColors.primary;

        // Create a standard marker
        const marker = new google.maps.Marker({
            position: new google.maps.LatLng(position.lat, position.lng),
            map: map,
            title: businessTitle, // Ensure title is a string
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: pinColor,
                fillOpacity: 1,
                strokeWeight: 1,
                strokeColor: '#FFFFFF',
                scale: 10
            },
            animation: google.maps.Animation.DROP
        });

        // Store the business data with the marker
        marker.business = business;
        marker.isNearby = isNearby;
        marker.position = position;

        // Add click event listener
        marker.addListener('click', function() {
            showInfoWindow(marker);
        });

        // Add the marker to our array
        markers.push(marker);
        console.log(`Added fallback marker for ${businessTitle}`);

        return marker;
    } catch (error) {
        console.error("Error creating fallback marker:", error);
        return null;
    }
}

// /**
//  * Create an Advanced Marker (using the recommended API)
//  */
// async function createAdvancedMarker(business) {
//     try {
//         if (!business || !business.lat || !business.lng) {
//             console.error("Invalid business data for marker:", business);
//             return null;
//         }
//
//         // Import the AdvancedMarkerElement library
//         const { AdvancedMarkerElement, PinElement } = await google.maps.importLibrary("marker");
//
//         // Create position object from business coordinates
//         const position = {
//             lat: business.lat,
//             lng: business.lng
//         };
//
//         console.log(`Creating advanced marker for ${business.bname} at position:`, position);
//
//         // Determine marker color based on type
//         const isNearby = business.isNearby === true;
//         const pinColor = isNearby ? CONFIG.markerColors.nearby : CONFIG.markerColors.primary;
//
//         // Create a pin element using the proper modern approach
//         const pin = new PinElement({
//             background: pinColor,
//             borderColor: "#ffffff",
//             glyphColor: "#ffffff",
//             scale: 1.2,
//         });
//
//         // Create the advanced marker
//         const marker = new AdvancedMarkerElement({
//             position: position,
//             map: map,
//             title: business.bname,
//             content: pin.element,
//         });
//
//         // Store business data with the marker
//         marker.business = business;
//
//         // UPDATED: Use 'gmp-click' event instead of 'click'
//         marker.addEventListener("gmp-click", () => {
//             console.log(`Marker clicked for: ${business.bname}`);
//             showInfoWindow(marker);
//         });
//
//         // Add to markers array
//         markers.push(marker);
//         console.log(`Successfully added marker for ${business.bname} - Markers count: ${markers.length}`);
//
//         return marker;
//     } catch (error) {
//         console.error(`Error creating marker for ${business ? business.bname : 'unknown business'}:`, error);
//
//         // Fall back to standard marker as backup if advanced marker fails
//         try {
//             return fallbackCreateStandardMarker(business);
//         } catch (fallbackError) {
//             console.error("Fallback marker creation also failed:", fallbackError);
//             return null;
//         }
//     }
// }

/**
 * Fallback function to create a standard marker if advanced marker fails
 */
function fallbackCreateStandardMarker(business) {
    if (!business || !business.lat || !business.lng) {
        console.error("Invalid business data for fallback marker:", business);
        return null;
    }

    console.log(`Creating fallback standard marker for ${business.bname}`);

    // Create position object
    const position = {
        lat: business.lat,
        lng: business.lng
    };

    // Determine marker color
    const isNearby = business.isNearby === true;
    const pinColor = isNearby ? CONFIG.markerColors.nearby : CONFIG.markerColors.primary;

    // Create standard marker
    const marker = new google.maps.Marker({
        position: position,
        map: map,
        title: business.bname,
        icon: {
            path: google.maps.SymbolPath.CIRCLE,
            fillColor: pinColor,
            fillOpacity: 1,
            strokeWeight: 1,
            strokeColor: "#FFFFFF",
            scale: 10
        },
        animation: google.maps.Animation.DROP
    });

    // Store business data
    marker.business = business;

    // Add click listener
    marker.addListener('click', function() {
        console.log(`Fallback marker clicked for: ${business.bname}`);
        showInfoWindow(marker);
    });

    // Add to markers array
    markers.push(marker);
    console.log(`Successfully added fallback marker for ${business.bname} - Markers count: ${markers.length}`);

    return marker;
}

/**
 * Get HTML for a business type icon - Updated to ensure icons display properly
 * @param {string} businessType - Business type code
 * @returns {string} Icon HTML
 */
function getBusinessTypeIconHTML(businessType) {
    // Map business types to icon HTML
    // Using Font Awesome icons with proper styling to ensure visibility
    const iconMap = {
        'AUTO': '<i class="fas fa-car" aria-hidden="true"></i>',
        'BEAU': '<i class="fas fa-spa" aria-hidden="true"></i>',
        'BOOK': '<i class="fas fa-book" aria-hidden="true"></i>',
        'CLTH': '<i class="fas fa-tshirt" aria-hidden="true"></i>',
        'CONV': '<i class="fas fa-store" aria-hidden="true"></i>',
        'DEPT': '<i class="fas fa-shopping-bag" aria-hidden="true"></i>',
        'ELEC': '<i class="fas fa-bolt" aria-hidden="true"></i>',
        'ENTR': '<i class="fas fa-film" aria-hidden="true"></i>',
        'FURN': '<i class="fas fa-couch" aria-hidden="true"></i>',
        'FUEL': '<i class="fas fa-gas-pump" aria-hidden="true"></i>',
        'GIFT': '<i class="fas fa-gift" aria-hidden="true"></i>',
        'GROC': '<i class="fas fa-shopping-cart" aria-hidden="true"></i>',
        'HARDW': '<i class="fas fa-hammer" aria-hidden="true"></i>',
        'HEAL': '<i class="fas fa-heartbeat" aria-hidden="true"></i>',
        'JEWL': '<i class="fas fa-gem" aria-hidden="true"></i>',
        'OTHER': '<i class="fas fa-store-alt" aria-hidden="true"></i>',
        'RX': '<i class="fas fa-prescription-bottle-alt" aria-hidden="true"></i>',
        'REST': '<i class="fas fa-utensils" aria-hidden="true"></i>',
        'RETAIL': '<i class="fas fa-shopping-basket" aria-hidden="true"></i>',
        'SERV': '<i class="fas fa-concierge-bell" aria-hidden="true"></i>',
        'SPEC': '<i class="fas fa-star" aria-hidden="true"></i>',
        'SPRT': '<i class="fas fa-football-ball" aria-hidden="true"></i>',
        'TECH': '<i class="fas fa-laptop" aria-hidden="true"></i>',
        'TOYS': '<i class="fas fa-gamepad" aria-hidden="true"></i>'
    };

    // Return the icon for this business type, or a default
    return iconMap[businessType] || '<i class="fas fa-store" aria-hidden="true"></i>';
}


// /**
//  * Get an SVG icon for a business type (new function)
//  * @param {string} businessType - Business type code
//  * @returns {string} SVG icon markup
//  */
// function getBusinessTypeSVGIcon(businessType) {
//     // Map business types to SVG icons
//     const businessTypeIcons = {
//         'AUTO': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20"><path fill="#EA4335" d="M5,11L6.5,6.5H17.5L19,11M17.5,16A1.5,1.5 0 0,1 16,14.5A1.5,1.5 0 0,1 17.5,13A1.5,1.5 0 0,1 19,14.5A1.5,1.5 0 0,1 17.5,16M6.5,16A1.5,1.5 0 0,1 5,14.5A1.5,1.5 0 0,1 6.5,13A1.5,1.5 0 0,1 8,14.5A1.5,1.5 0 0,1 6.5,16M18.92,6C18.72,5.42 18.16,5 17.5,5H6.5C5.84,5 5.28,5.42 5.08,6L3,12V20A1,1 0 0,0 4,21H5A1,1 0 0,0 6,20V19H18V20A1,1 0 0,0 19,21H20A1,1 0 0,0 21,20V12L18.92,6Z"/></svg>',
//         'BEAU': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20"><path fill="#4285F4" d="M15.5,9.63C15.31,6.84 14.18,4.12 12.06,2C9.92,4.14 8.74,6.86 8.5,9.63C9.79,10.31 10.97,11.19 12,12.26C13.03,11.2 14.21,10.32 15.5,9.63M12,15.45C9.85,12.17 6.18,10 2,10C2,20 11.32,21.89 12,22C12.68,21.88 22,20 22,10C17.82,10 14.15,12.17 12,15.45Z"/></svg>',
//         'REST': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20"><path fill="#FBC02D" d="M8.1,13.34L3.91,9.16C2.35,7.59 2.35,5.06 3.91,3.5L10.93,10.5L8.1,13.34M14.88,11.53L13.41,13L20.29,19.88L18.88,21.29L12,14.41L5.12,21.29L3.71,19.88L13.47,10.12C12.76,8.59 13.26,6.44 14.85,4.85C16.76,2.93 19.5,2.57 20.96,4.03C22.43,5.5 22.07,8.24 20.15,10.15C18.56,11.74 16.41,12.24 14.88,11.53Z"/></svg>',
//         'GROC': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20"><path fill="#0F9D58" d="M7,18A2,2 0 0,1 5,20A2,2 0 0,1 3,18A2,2 0 0,1 5,16A2,2 0 0,1 7,18M17,18A2,2 0 0,1 15,20A2,2 0 0,1 13,18A2,2 0 0,1 15,16A2,2 0 0,1 17,18M7.17,14.75L7.2,14.63L8.1,13H15.55C16.3,13 16.96,12.59 17.3,11.97L21.16,4.96L19.42,4H19.41L18.31,6L15.55,11H8.53L8.4,10.73L6.16,6L5.21,4L4.27,2H1V4H3L6.6,11.59L5.25,14.04C5.09,14.32 5,14.65 5,15A2,2 0 0,0 7,17H19V15H7.42C7.29,15 7.17,14.89 7.17,14.75Z"/></svg>',
//         'OTHER': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20"><path fill="#616161" d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,7V9H16V13C16,14.1 15.1,15 14,15H12V17H8V13H12V11H8V7H12Z"/></svg>'
//         // Add more type-specific icons as needed
//     };
//
//     // Return the icon for this business type, or a default
//     return businessTypeIcons[businessType] ||
//         '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20"><path fill="#616161" d="M12,7V3H2V21H22V7H12M10,19H4V17H10V19M10,15H4V13H10V15M10,11H4V9H10V11M10,7H4V5H10V7M20,19H12V5H20V19M18,11H14V13H18V11M18,7H14V9H18V7M18,15H14V17H18V15Z"/></svg>';
// }


// /**
//  * Fetch icon for a business based on its type
//  * @param {Object} business - Business object
//  * @returns {Promise<string>} Icon URL
//  */
// async function fetchPlacePhotosForBusiness(business) {
//     if (!business) {
//         console.log("No business data provided");
//         return getDefaultBusinessIcon();
//     }
//
//     try {
//         // Check cache first
//         const cacheKey = business._id || business.bname + business.address1;
//         if (placeCache.has(cacheKey)) {
//             return placeCache.get(cacheKey);
//         }
//
//         // Get an appropriate icon based on business type
//         const iconUrl = getBusinessTypeIcon(business.type);
//
//         // Add to cache
//         placeCache.set(cacheKey, iconUrl);
//         return iconUrl;
//     } catch (error) {
//         console.error(`Error getting business icon: ${error.message}`);
//         return getDefaultBusinessIcon();
//     }
// }

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

// /**
//  * Update an existing marker with an image
//  * @param {Object} marker - Marker object
//  * @param {string} imageUrl - URL of the image
//  */
// function updateMarkerWithImage(marker, imageUrl) {
//     if (!marker || !marker.content) return;
//
//     const business = marker.business;
//     if (!business) return;
//
//     const isNearby = business.isNearby === true;
//     const pinColor = isNearby ? CONFIG.markerColors.nearby : CONFIG.markerColors.primary;
//
//     // Create new content with the image
//     const pinElement = document.createElement('div');
//     pinElement.className = 'custom-marker';
//     pinElement.style.cursor = 'pointer';
//     pinElement.style.zIndex = '1000';
//
//     pinElement.innerHTML = `
//     <div class="marker-container">
//       <div class="marker-pin" style="background-color: ${pinColor};">
//         <div class="marker-image-container">
//           <img src="${imageUrl}" alt="${business.bname}" class="marker-image">
//         </div>
//       </div>
//       <div class="marker-shadow"></div>
//     </div>
//   `;
//
//     // Replace the old content
//     marker.content = pinElement;
//
//     // Re-add the click event listener
//     pinElement.addEventListener('click', function(e) {
//         console.log("Updated marker element clicked:", business.bname);
//         e.stopPropagation();
//         showInfoWindow(marker);
//     });
// }

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

    // Format distance if available
    const distanceDisplay = business.distance
        ? `<p><strong>Distance:</strong> ${(business.distance / 1609.34).toFixed(1)} miles</p>`
        : '';

    // Check if this is a Google Places result not in our database
    const isGooglePlace = business.isGooglePlace === true;

    // Customize the footer button based on whether it's in our database
    let actionButtons;
    if (isGooglePlace) {
        actionButtons = `
        <button class="add-business-btn" 
                onclick="window.addBusinessToDatabase('${business.placeId}')">
            Add to Patriot Thanks
        </button>`;
    } else {
        actionButtons = `
        <button class="view-details-btn" 
                onclick="window.viewBusinessDetails('${business._id}')">
            View Details
        </button>`;
    }

    // Content for the info window with your existing CSS classes
    const contentString = `
    <div class="info-window">
        <h3>${business.bname}</h3>
        <p><strong>Address:</strong><br>${addressLine}</p>
        ${phoneDisplay}
        ${distanceDisplay}
        <p><strong>Type:</strong> ${businessType}</p>
        <div id="info-window-incentives-${business._id}">
            <p><strong>Incentives:</strong> <em>${isGooglePlace ? 'Not in database' : 'Loading...'}</em></p>
        </div>
        ${isGooglePlace ? '<p>This business is not yet in the Patriot Thanks database.</p>' : ''}
        <div class="info-window-actions">
            ${actionButtons}
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

    // Set content for the info window
    infoWindow.setContent(contentString);

    // Apply scrollable styles
    applyInfoWindowScrollableStyles();

    // Open the info window based on marker type
    try {
        if (marker.getPosition) {
            // It's a standard Google Maps marker
            infoWindow.open(map, marker);
        } else if (typeof marker.position === 'object' && marker.position !== null) {
            // For both AdvancedMarkerElement and position objects
            if (marker.position.lat && typeof marker.position.lat === 'function') {
                // It's a LatLng object
                infoWindow.setPosition(marker.position);
                infoWindow.open(map);
            } else if (marker.position.lat && typeof marker.position.lat === 'number') {
                // It's a position object with lat/lng properties
                infoWindow.setPosition(new google.maps.LatLng(
                    marker.position.lat,
                    marker.position.lng
                ));
                infoWindow.open(map);
            } else {
                // Try to open it against the marker
                infoWindow.open(map, marker);
            }
        } else {
            // Fallback for any other marker type
            if (business.lat && business.lng) {
                infoWindow.setPosition(new google.maps.LatLng(business.lat, business.lng));
                infoWindow.open(map);
            } else {
                console.error("Unable to position info window for marker");
            }
        }
    } catch (error) {
        console.error("Error opening info window:", error);
        // Final fallback - try to get position from business
        if (business.lat && business.lng) {
            infoWindow.setPosition(new google.maps.LatLng(business.lat, business.lng));
            infoWindow.open(map);
        }
    }

    console.log("Opened info window for marker");

    // Only fetch incentives if it's in our database
    if (!isGooglePlace) {
        fetchBusinessIncentivesForInfoWindow(business._id);
    }

    // Add event listener to ensure scrollable styles are applied when the window opens
    google.maps.event.addListener(infoWindow, 'domready', function() {
        console.log("Info window DOM ready, forcing scrollable behavior");

        // Force scrollable styling application
        const iwOuter = document.querySelector('.gm-style-iw');
        if (iwOuter) {
            const iwBackground = iwOuter.previousElementSibling;
            if (iwBackground) {
                iwBackground.style.display = 'none'; // Remove background if needed
            }

            // Force scrollable
            const iwCloseBtn = iwOuter.nextElementSibling;
            if (iwCloseBtn) {
                iwCloseBtn.style.top = '3px';
                iwCloseBtn.style.right = '3px';
            }

            // Add specific scrollable class to the container
            const iwContainer = iwOuter.querySelector('.gm-style-iw-d');
            if (iwContainer) {
                iwContainer.style.overflow = 'auto';
                iwContainer.style.maxHeight = '350px';
            }
        }
    });
}





/**
 * Search for nearby businesses of similar type
 * @param {Object} location - Center location for the search
 * @param {string} businessType - Type of business to search for
 */
function searchNearbyBusinesses(location, businessType) {
    console.log("Searching for nearby businesses near", location.lat(), location.lng());

    // Determine the base URL
    const baseURL = getBaseURL();

    // Search for businesses of the same type in the database
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
 * Debug the current map state
 */
function debugMapState() {
    console.log("==== MAP DEBUGGING INFO ====");
    console.log("Map initialized:", mapInitialized);
    console.log("Map object exists:", !!map);
    console.log("Google Maps API Key found:", !!getGoogleMapsApiKey());
    if (map) {
        console.log("Map center:", map.getCenter().toString());
        console.log("Map zoom:", map.getZoom());
    }
    console.log("Markers count:", markers.length);
    if (markers.length > 0) {
        console.log("First marker position:", markers[0].position);
        console.log("First marker business:", markers[0].business);
    }
    console.log("Bounds empty:", bounds ? bounds.isEmpty() : "no bounds");
    console.log("Map container:", document.getElementById("map"));
    if (document.getElementById("map")) {
        console.log("Map container display:", window.getComputedStyle(document.getElementById("map")).display);
        console.log("Map container dimensions:", document.getElementById("map").offsetWidth, "×", document.getElementById("map").offsetHeight);
    }
    console.log("==== END DEBUGGING INFO ====");
}

// Fix for the geocoding error - use a server-side approach
// Add this function to your code
function getGoogleMapsApiKey() {
    // Try to get API key from window.appConfig
    if (window.appConfig && window.appConfig.googleMapsApiKey) {
        return window.appConfig.googleMapsApiKey;
    }

    // As a fallback, look for a meta tag with the API key
    const metaTag = document.querySelector('meta[name="google-maps-api-key"]');
    if (metaTag) {
        return metaTag.content;
    }

    // Another option - check if there's a global API key variable
    if (typeof GOOGLE_MAPS_API_KEY !== 'undefined') {
        return GOOGLE_MAPS_API_KEY;
    }

    // Final fallback - look for an API key in any script tags
    const scriptTags = document.querySelectorAll('script[src*="maps.googleapis.com"]');
    for (const script of scriptTags) {
        const src = script.getAttribute('src');
        const keyMatch = src.match(/[?&]key=([^&]+)/);
        if (keyMatch && keyMatch[1]) {
            return keyMatch[1];
        }
    }

    console.error("Could not find Google Maps API key");
    return '';
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

                // Store the coordinates in the business object
                business.lat = location.lat();
                business.lng = location.lng();
                business.distance = distance;

                // Add marker with different color to distinguish from search results
                addAdvancedMarker(business, location);
            }
        }
    });
}

/**
 * Focus on map marker with proper handling for both marker types
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
        // Get position based on marker type
        let position;
        if (marker instanceof google.maps.marker.AdvancedMarkerElement) {
            position = marker.position;
        } else {
            position = marker.getPosition();
        }

        // Center the map on this marker
        map.setCenter(position);
        map.setZoom(16);

        // Open the info window for this marker
        if (marker.business.isGooglePlace) {
            showGooglePlaceInfoWindow(marker.business, position);
        } else {
            showInfoWindow(marker);
        }

        // Scroll to the map
        document.getElementById('map').scrollIntoView({behavior: 'smooth'});

        console.log("Successfully focused on marker for business:", businessId);
    } else {
        console.warn(`No marker found for business ID: ${businessId}`);
        alert("This business could not be located on the map. It may not have a complete address.");
        document.getElementById('map').scrollIntoView({behavior: 'smooth'});
    }
};

// // Save the original initGoogleMap function
// const originalInitGoogleMap = window.initGoogleMap;
//
// // Create a new wrapper function that calls the original function
// // Make sure the initGoogleMap function is properly defined and accessible
// window.initGoogleMap = async function() {
//     console.log("initGoogleMap called");
//
//     try {
//         // Check if map container exists
//         const mapContainer = document.getElementById("map");
//         if (!mapContainer) {
//             console.error("Map container not found in the DOM");
//             return;
//         }
//
//         console.log("Map container dimensions:", mapContainer.offsetWidth, "x", mapContainer.offsetHeight);
//
//         // Import required libraries
//         const { Map } = await google.maps.importLibrary("maps");
//         const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");
//
//         // Create map
//         map = new Map(mapContainer, {
//             center: CONFIG.defaultCenter,
//             zoom: CONFIG.defaultZoom,
//             mapId: CONFIG.mapId
//         });
//
//         console.log("Map created successfully");
//
//         // Create needed objects
//         infoWindow = new google.maps.InfoWindow();
//         bounds = new google.maps.LatLngBounds();
//
//         // Add initial message
//         const initialMessage = document.createElement('div');
//         initialMessage.id = 'initial-map-message';
//         initialMessage.innerHTML = 'Search for businesses to see them on the map';
//         initialMessage.style.position = 'absolute';
//         initialMessage.style.top = '50%';
//         initialMessage.style.left = '50%';
//         initialMessage.style.transform = 'translate(-50%, -50%)';
//         initialMessage.style.background = 'white';
//         initialMessage.style.padding = '10px';
//         initialMessage.style.borderRadius = '5px';
//         initialMessage.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
//         initialMessage.style.zIndex = '1';
//         mapContainer.appendChild(initialMessage);
//
//         // Set flag
//         mapInitialized = true;
//         console.log("Map initialization complete");
//
//         // Process any pending businesses
//         if (pendingBusinessesToDisplay.length > 0) {
//             console.log("Processing pending businesses:", pendingBusinessesToDisplay.length);
//             displayBusinessesOnMap(pendingBusinessesToDisplay);
//             pendingBusinessesToDisplay = [];
//         }
//
//         // Set up map click handler
//         map.addListener('click', function(event) {
//             console.log("Map clicked at", event.latLng.lat(), event.latLng.lng());
//             // Your existing click handler code...
//         });
//
//     } catch (error) {
//         console.error("Error initializing Google Map:", error);
//         mapInitialized = false;
//
//         // Show error message
//         const mapContainer = document.getElementById("map");
//         if (mapContainer) {
//             mapContainer.innerHTML = `
//                 <div style="text-align: center; padding: 20px;">
//                     <p>Sorry, we couldn't load the map. Please try refreshing the page.</p>
//                     <p>Error: ${error.message}</p>
//                 </div>
//             `;
//         }
//     }
// };

// Initialize when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize business search functionality
    initBusinessSearch();
    addCustomMarkerStyles();
});
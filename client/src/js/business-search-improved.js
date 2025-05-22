/**
* Enhanced business-search-improved.js with improved chain business support
* Combines the best of both versions with proper error handling
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
    maxNearbyDistance: 20000, // Maximum distance for nearby businesses (meters)
    debugMode: false        // Set to true to enable detailed debugging
};

// State variables
let map = null;
let mapInitialized = false;
let markers = [];
let infoWindow = null;
let bounds = null;
let pendingBusinessesToDisplay = [];
let currentSearchLocation = null;

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
    console.log("Current search location:", currentSearchLocation ?
        `${currentSearchLocation.lat}, ${currentSearchLocation.lng}` : "none");
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

        // Add a listener to adjust zoom if it's too close
        google.maps.event.addListenerOnce(mapObj, 'bounds_changed', function() {
            const zoomLevel = mapObj.getZoom();
            if (zoomLevel > 16) {
                mapObj.setZoom(16);
            } else if (zoomLevel < 4) {
                mapObj.setZoom(4);
            }
        });

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
 * Create a new clean bounds object
 * @returns {google.maps.LatLngBounds} New bounds object
 */
function createNewBounds() {
    return new google.maps.LatLngBounds();
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
            const apiKey = window.appConfig?.googleMapsApiKey || getGoogleMapsApiKey();
            const mapId = window.appConfig?.googleMapsMapId || CONFIG.mapId;

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
 * Add custom CSS to style the markers properly with explicit Font Awesome icon handling
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
            
            /* Critical fix - ensure Font Awesome icons are visible */
            .marker-icon i.fas,
            .marker-icon i.fa,
            .marker-icon i.far,
            .marker-icon i.fab {
                display: inline-block !important;
                font-size: 14px !important;
                color: white !important;
                line-height: 1 !important;
                width: auto !important;
                height: auto !important;
                vertical-align: middle !important;
            }
            
            /* Fallback icon content for missing Font Awesome */
            .marker-icon i.fas.fa-store-alt:after {
                content: "🏪";
                font-family: sans-serif;
                font-size: 14px;
            }
            
            .marker-icon i.fas.fa-shopping-cart:after {
                content: "🛒";
                font-family: sans-serif;
                font-size: 14px;
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
            .info-window-actions {
                margin-top: 12px;
                padding-top: 8px;
                border-top: 1px solid #eee;
                text-align: right;
            }
            
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
                display: inline-block;
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
 * Add chain badge styles for better UI
 */
function addChainBadgeStyles() {
    if (!document.getElementById('chain-badge-css')) {
        const style = document.createElement('style');
        style.id = 'chain-badge-css';
        style.textContent = `
            .chain-badge {
                display: inline-block;
                background-color: #4285F4;
                color: white;
                padding: 2px 6px;
                border-radius: 4px;
                font-size: 0.8em;
                margin-left: 5px;
                font-weight: normal;
            }

            .chain-badge.small {
                font-size: 0.7em;
                padding: 1px 4px;
            }
            
            .admin-action-btn {
                background-color: #673AB7;
                color: white;
                border: none;
                padding: 5px 10px;
                border-radius: 4px;
                cursor: pointer;
            }
            
            .view-chain-btn {
                background-color: #2196F3;
                color: white;
                border: none;
                padding: 5px 10px;
                border-radius: 4px;
                cursor: pointer;
            }
            
            .add-to-db-btn {
                background-color: #4CAF50;
                color: white;
                border: none;
                padding: 5px 10px;
                border-radius: 4px;
                cursor: pointer;
            }
            
            .view-map-btn {
                background-color: #FF9800;
                color: white;
                border: none;
                padding: 5px 10px;
                border-radius: 4px;
                cursor: pointer;
            }
        `;
        document.head.appendChild(style);
    }
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
        'hardware_store': 'Hardware Store',
        'home_goods_store': 'Home Goods',
        'department_store': 'Department Store',
        'grocery_or_supermarket': 'Grocery Store',
        'furniture_store': 'Furniture Store',
        'electronics_store': 'Electronics Store'
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
 * @param {string} chainId - Optional chain ID if this place is part of a chain
 */
window.addBusinessToDatabase = async function(placeId, chainId = null) {
    console.log("Adding place to database:", placeId, "Chain ID:", chainId);

    try {
        // Use the Places Service to get details
        const service = new google.maps.places.PlacesService(map);

        const request = {
            placeId: placeId,
            fields: ['name', 'formatted_address', 'formatted_phone_number', 'geometry', 'address_components']
        };

        service.getDetails(request, async (place, status) => {
            if (status !== google.maps.places.PlacesServiceStatus.OK || !place) {
                console.error("Error fetching place details:", status);
                alert("Sorry, we couldn't retrieve the details for this business. Please try again or add it manually.");
                return;
            }

            console.log("Place details retrieved:", place);

            // Extract address components
            const addressComponents = {};
            if (place.address_components) {
                for (const component of place.address_components) {
                    for (const type of component.types) {
                        addressComponents[type] = component.short_name;
                    }
                }
            }

            // Format the business data
            const businessData = {
                name: place.name || '',
                address1: (addressComponents.street_number || '') + ' ' + (addressComponents.route || ''),
                city: addressComponents.locality || '',
                state: addressComponents.administrative_area_level_1 || '',
                zip: addressComponents.postal_code || '',
                phone: place.formatted_phone_number || '',
                placeId: place.place_id,
                formattedAddress: place.formatted_address, // Save the full formatted address

                // Store coordinates for later use
                lat: place.geometry?.location.lat() || 0,
                lng: place.geometry?.location.lng() || 0,

                // Add this for proper GeoJSON formatting
                location: {
                    type: 'Point',
                    coordinates: [
                        place.geometry?.location.lng() || 0,
                        place.geometry?.location.lat() || 0
                    ]
                }
            };

            // If this is a chain location, add chain data
            if (chainId) {
                businessData.chain_id = chainId;

                try {
                    // Get chain name from the server
                    const chain = await getChainDetails(chainId);
                    if (chain && chain.bname) {
                        businessData.chain_name = chain.bname;
                    }
                } catch (error) {
                    console.error("Error getting chain details:", error);
                }

                // Add extra message for chain location
                alert("This business will be added as a location of " +
                    (businessData.chain_name || "the chain") +
                    ". Chain-wide incentives already apply to this location.");
            }

            // Store in sessionStorage for the add business page to use
            sessionStorage.setItem('newBusinessData', JSON.stringify(businessData));

            // Redirect to add business page
            window.location.href = 'business-add.html?prefill=true';
        });
    } catch (error) {
        console.error("Error in addBusinessToDatabase:", error);
        alert("Sorry, we couldn't add this business to the database. Please try again or add it manually.");
    }
};

/**
 * Helper function to get chain details
 * @param {string} chainId - Chain ID
 * @returns {Promise<Object>} - Chain details
 */
async function getChainDetails(chainId) {
    if (!chainId) return null;

    // Get the base URL
    const baseURL = getBaseURL();

    try {
        const response = await fetch(`${baseURL}/api/business.js?operation=get&id=${chainId}`);

        if (!response.ok) {
            throw new Error(`Failed to get chain details: ${response.status}`);
        }

        const data = await response.json();

        if (data.result) {
            return data.result;
        }

        return null;
    } catch (error) {
        console.error("Error getting chain details:", error);
        return null;
    }
}

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
 * Get base URL based on environment
 * @returns {string} Base URL
 */
function getBaseURL() {
    return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? `https://${window.location.host}`
        : window.location.origin;
}

/**
 * Initialize business search functionality
 */
function initBusinessSearch() {
    console.log("Business search initialization...");

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

            // Check if at least one field is filled or location is enabled
            if (!form.businessName?.value && !form.address?.value && !(form.useMyLocation?.checked)) {
                alert("Please enter either a business name, an address, or use your current location to search");
                return;
            }

            const formData = {
                businessName: form.businessName?.value || '',
                address: form.address?.value || '',
                useMyLocation: form.useMyLocation?.checked || false
            };

            console.log("Form data to submit:", formData);

            // Check if map is initialized
            if (!mapInitialized) {
                console.warn("Map not initialized yet. Will initialize and display businesses after map loads.");
                ensureGoogleMapsInitialized().then(() => {
                    // Clear existing map markers
                    clearMarkers();
                    // Submit the data to MongoDB
                    retrieveFromMongoDB(formData);
                }).catch(error => {
                    console.error("Failed to initialize Google Maps:", error);
                    alert("There was a problem loading the map. Please try refreshing the page.");
                });
            } else {
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

    // Handle "Use my location" checkbox
    if (form.useMyLocation) {
        form.useMyLocation.addEventListener('change', function () {
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

    // Add the refresh button
    addRefreshButton();

    // Check for newly added businesses when page loads
    checkForNewlyAddedBusiness();
}

/**
 * Add refresh button to the search form
 */
function addRefreshButton() {
    // Get the form element
    const searchForm = document.getElementById('business-search-form');
    if (!searchForm) return;

    // Check if the button already exists
    if (document.getElementById('refresh-search-btn')) return;

    // Create the refresh button
    const refreshButton = document.createElement('button');
    refreshButton.id = 'refresh-search-btn';
    refreshButton.type = 'button'; // Not a submit button
    refreshButton.className = 'refresh-btn';
    refreshButton.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh Results';

    // Add some inline styles
    refreshButton.style.marginLeft = '10px';
    refreshButton.style.backgroundColor = '#28a745';
    refreshButton.style.color = 'white';
    refreshButton.style.border = 'none';
    refreshButton.style.borderRadius = '4px';
    refreshButton.style.padding = '8px 12px';
    refreshButton.style.cursor = 'pointer';

    // Add click handler
    refreshButton.addEventListener('click', function () {
        // Get current form data
        const businessName = document.getElementById('business-name')?.value || '';
        const address = document.getElementById('address')?.value || '';
        const useMyLocation = document.getElementById('use-my-location')?.checked || false;

        // Create form data object
        const formData = {
            businessName: businessName,
            address: address,
            useMyLocation: useMyLocation
        };

        // Clear existing map markers
        clearMarkers();

        // Remove initial map message if it exists
        const initialMessage = document.getElementById('initial-map-message');
        if (initialMessage) {
            initialMessage.remove();
        }

        // Add a small animation to the button
        this.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i> Refreshing...';

        // Submit the data to MongoDB with cache-busting
        retrieveFromMongoDB(formData, true);

        // Restore button text after a short delay
        setTimeout(() => {
            this.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh Results';
        }, 1000);
    });

    // Find the submit button
    const submitButton = searchForm.querySelector('input[type="submit"]');

    // Insert the refresh button after the submit button
    if (submitButton && submitButton.parentNode) {
        submitButton.parentNode.insertBefore(refreshButton, submitButton.nextSibling);
    } else {
        // If submit button not found, append to the form
        searchForm.appendChild(refreshButton);
    }
}

/**
 * Check for newly added businesses when the page loads
 */
function checkForNewlyAddedBusiness() {
    // Check URL parameters for a newly added business
    const urlParams = new URLSearchParams(window.location.search);
    const newBusinessAdded = urlParams.get('business_added');
    const businessName = urlParams.get('business_name');

    if (newBusinessAdded === 'true' && businessName) {
        // Show success message
        showNewBusinessAlert(businessName);

        // Pre-fill search form with the business name
        const businessNameField = document.getElementById('business-name');
        if (businessNameField) {
            businessNameField.value = businessName;
            validateField(businessNameField, isNotEmpty);
        }

        // Automatically trigger search after a short delay
        setTimeout(() => {
            const searchForm = document.getElementById('business-search-form');
            if (searchForm) {
                // Create and dispatch a submit event
                const submitEvent = new Event('submit', {cancelable: true});
                searchForm.dispatchEvent(submitEvent);
            }
        }, 500);
    }
}

/**
 * Show alert when a new business is added
 * @param {string} businessName - Name of the newly added business
 */
function showNewBusinessAlert(businessName) {
    // Create alert container
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-success';
    alertDiv.role = 'alert';
    alertDiv.style.marginBottom = '20px';
    alertDiv.style.animation = 'fadeIn 0.5s';

    // Add alert content
    alertDiv.innerHTML = `
        <strong>Success!</strong> "${businessName}" has been added to the database. 
        Searching for this business now...
        <button type="button" class="close" data-dismiss="alert" aria-label="Close">
            <span aria-hidden="true">&times;</span>
        </button>
    `;

    // Add inline styles if needed
    alertDiv.style.backgroundColor = '#d4edda';
    alertDiv.style.border = '1px solid #c3e6cb';
    alertDiv.style.color = '#155724';
    alertDiv.style.borderRadius = '4px';
    alertDiv.style.padding = '12px 20px';

    // Add close button functionality
    const closeButton = alertDiv.querySelector('.close');
    if (closeButton) {
        closeButton.style.float = 'right';
        closeButton.style.fontSize = '20px';
        closeButton.style.fontWeight = 'bold';
        closeButton.style.lineHeight = '20px';
        closeButton.style.color = '#155724';
        closeButton.style.opacity = '0.5';
        closeButton.style.cursor = 'pointer';

        closeButton.addEventListener('click', function () {
            alertDiv.remove();
        });
    }

    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeOut {
            from { opacity: 1; transform: translateY(0); }
            to { opacity: 0; transform: translateY(-10px); }
        }
    `;
    document.head.appendChild(style);

    // Insert alert at the top of the main content
    const mainContent = document.querySelector('main') || document.body;
    mainContent.insertBefore(alertDiv, mainContent.firstChild);

    // Auto-remove after 8 seconds
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.style.animation = 'fadeOut 0.5s';
            setTimeout(() => alertDiv.remove(), 500);
        }
    }, 8000);
}

/**
 * Enhanced version to search for businesses from MongoDB with proper location handling
 * @param {Object} formData - Form data with search parameters
 * @param bustCache
 */
async function retrieveFromMongoDB(formData, bustCache = false) {
    try {
        console.log("Starting search with form data:", formData);

        // Show loading indicator
        const resultsContainer = document.getElementById('business-search-results') ||
            document.getElementById('search_table');
        if (resultsContainer) {
            resultsContainer.innerHTML = '<div class="loading-indicator">Searching for businesses...</div>';
            resultsContainer.style.display = 'block';
        }

        // Process search location first
        let searchLocation = null;

        // Check if we should use current location
        if (formData.useMyLocation) {
            try {
                console.log("Getting user's location for search...");
                searchLocation = await getUserLocation();
                console.log("User location for search:", searchLocation);

                // Store this as current search location
                window.currentSearchLocation = searchLocation;
            } catch (error) {
                console.error("Error getting user location:", error);
                alert("Unable to get your current location. Please try entering an address instead.");
                return;
            }
        }
        // If address is provided, geocode it
        else if (formData.address && formData.address.trim() !== '') {
            try {
                console.log("Geocoding address for search:", formData.address);
                const geocodedLocation = await geocodeAddressClientSide(formData.address);

                if (geocodedLocation && geocodedLocation.lat && geocodedLocation.lng) {
                    searchLocation = geocodedLocation;
                    console.log("Successfully geocoded address to:", searchLocation);

                    // Store this location for map centering
                    window.currentSearchLocation = searchLocation;

                    // Center map on the search location immediately
                    if (map && searchLocation) {
                        const center = new google.maps.LatLng(searchLocation.lat, searchLocation.lng);
                        map.setCenter(center);
                        map.setZoom(11); // City level zoom
                    }
                } else {
                    console.warn("Client-side geocoding failed");
                    throw new Error(`Geocoding failed for address: ${formData.address}`);
                }
            } catch (error) {
                console.error("Error geocoding address:", error);
                alert("We couldn't recognize that address. Please try a more specific address.");
                return;
            }
        }

        // Build API request parameters
        const params = {};
        if (formData.businessName && formData.businessName.trim() !== '') {
            params.business_name = formData.businessName;
        }
        if (formData.address && formData.address.trim() !== '') {
            params.address = formData.address;
        }

        // Add location parameters if we have them
        if (searchLocation && searchLocation.lat && searchLocation.lng) {
            params.lat = searchLocation.lat;
            params.lng = searchLocation.lng;
            params.radius = 25; // Search radius in miles
        }

        // Add cache-busting parameter if requested
        if (bustCache) {
            params.ts = new Date().getTime();
        }

        const queryParams = new URLSearchParams(params).toString();

        // Get base URL and build API endpoint
        const baseURL = getBaseURL();
        const apiURL = `${baseURL}/api/business.js?operation=search&${queryParams}`;
        console.log("Submitting search to API:", apiURL);

        const response = await fetch(apiURL, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json; charset=UTF-8',
                'Cache-Control': bustCache ? 'no-cache, no-store, must-revalidate' : 'default',
                'Pragma': bustCache ? 'no-cache' : 'default',
                'Expires': bustCache ? '0' : 'default'
            }
        });

        console.log("Response status:", response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Error response:", errorText);
            throw new Error(`Failed to retrieve data: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        console.log("Search results from database:", data);

        // Clear existing markers and create fresh bounds
        clearMarkers();
        bounds = new google.maps.LatLngBounds();

        // Process search results
        if (!data.results || data.results.length === 0) {
            console.log("No results in database, searching Google Places...");

            // Search Google Places if no database results
            if (searchLocation && formData.businessName) {
                await searchGooglePlacesForSpecificBusiness(formData.businessName, searchLocation);
            } else {
                await searchGooglePlaces(formData, searchLocation);
            }
        } else {
            console.log(`Found ${data.results.length} businesses in database`);

            // Display businesses on map first
            displayBusinessesOnMap(data.results);

            // Then display in table/list
            if (document.getElementById('search_table')) {
                displaySearchResults(data.results);
            } else {
                const resultsContainer = document.getElementById('business-search-results');
                if (resultsContainer) {
                    displayBusinessSearchResults(data.results, resultsContainer);
                }
            }

            // Search for nearby businesses if we have a search location
            if (searchLocation && searchLocation.lat && searchLocation.lng) {
                const searchLatLng = new google.maps.LatLng(searchLocation.lat, searchLocation.lng);

                // Use business type from first result for nearby search
                if (data.results.length > 0) {
                    const businessType = data.results[0].type;
                    searchNearbyBusinesses(searchLatLng, businessType);
                }
            }
        }
    } catch (error) {
        console.error("Search error:", error);

        // Show error message
        const resultsContainer = document.getElementById('business-search-results') ||
            document.getElementById('search_table');
        if (resultsContainer) {
            resultsContainer.innerHTML = `<div class="error-message">Error searching for businesses: ${error.message}</div>`;
            resultsContainer.style.display = 'block';
        } else {
            alert(`Error searching for businesses: ${error.message}`);
        }
    }
}

/**
 * Fixed geocodeAddressClientSide function for reliable geocoding
 * @param {string} address - Address to geocode
 * @returns {Promise<{lat: number, lng: number}|null>} Location coordinates
 */
async function geocodeAddressClientSide(address) {
    return new Promise((resolve, reject) => {
        try {
            console.log(`Geocoding address client-side: ${address}`);

            if (!address) {
                console.error("No address provided for geocoding");
                reject(new Error("No address provided"));
                return;
            }

            // Ensure Google Maps API is loaded
            if (!window.google || !window.google.maps) {
                reject(new Error("Google Maps API not loaded"));
                return;
            }

            // Create a new geocoder
            const geocoder = new google.maps.Geocoder();

            // Geocode the address
            geocoder.geocode({'address': address}, function (results, status) {
                if (status === google.maps.GeocoderStatus.OK && results && results.length > 0) {
                    const location = results[0].geometry.location;
                    const result = {
                        lat: location.lat(),
                        lng: location.lng(),
                        formattedAddress: results[0].formatted_address
                    };
                    console.log("Client-side geocoding result:", result);
                    resolve(result);
                } else {
                    console.error("Client-side geocoding failed:", status);
                    reject(new Error(`Geocoding failed: ${status}`));
                }
            });
        } catch (error) {
            console.error("Error in client-side geocoding:", error);
            reject(error);
        }
    });
}

/**
 * Search Google Places for a specific business name
 * @param {string} businessName - Name of business to search for
 * @param {Object} searchLocation - Location to search around
 */
async function searchGooglePlacesForSpecificBusiness(businessName, searchLocation) {
    try {
        console.log("Searching specifically for:", businessName);

        // Make map visible
        const mapContainer = document.getElementById('map');
        if (mapContainer) {
            mapContainer.style.display = 'block';
            mapContainer.style.height = '500px';
        }

        // Show loading indicator
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'map-loading';
        loadingDiv.className = 'loading-indicator';
        loadingDiv.innerHTML = 'Searching for businesses...';
        mapContainer.appendChild(loadingDiv);

        // Create LatLng for the search location
        const latlng = new google.maps.LatLng(searchLocation.lat, searchLocation.lng);

        // Center map on the search location
        map.setCenter(latlng);
        map.setZoom(11);

        // Use the Places Service for text search
        const service = new google.maps.places.PlacesService(map);

        const request = {
            query: businessName,
            location: latlng,
            radius: 50000 // 50km radius
        };

        // Perform the search
        service.textSearch(request, (results, status) => {
            // Remove loading indicator
            const loadingElement = document.getElementById('map-loading');
            if (loadingElement) loadingElement.remove();

            if (status === google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
                console.log("Found specific businesses:", results.length);

                // Process results and create business objects
                const businesses = results.map(place => {
                    return {
                        _id: 'google_' + place.place_id,
                        bname: place.name,
                        address1: place.formatted_address || '',
                        city: '',
                        state: '',
                        zip: '',
                        isGooglePlace: true,
                        placeId: place.place_id,
                        lat: place.geometry.location.lat(),
                        lng: place.geometry.location.lng()
                    };
                });

                // Add markers and display results
                businesses.forEach(business => {
                    createBusinessMarker(business);
                });

                displaySearchResults(businesses);
            } else {
                console.log("No specific businesses found:", status);
                // Fall back to regular search
                searchGooglePlaces({businessName: businessName}, searchLocation);
            }
        });
    } catch (error) {
        console.error("Error in specific business search:", error);
        // Fall back to regular search
        searchGooglePlaces({businessName: businessName}, searchLocation);
    }
}

/**
 * Enhanced searchGooglePlaces function
 * @param {Object} formData - Form data with search parameters
 * @param {Object} searchLocation - Location to search around
 */
async function searchGooglePlaces(formData, searchLocation = null) {
    try {
        console.log("Searching Google Places for:", formData);

        // Make map visible
        const mapContainer = document.getElementById('map');
        if (mapContainer) {
            mapContainer.style.display = 'block';
            mapContainer.style.height = '500px';
        }

        // Clear existing markers and create new bounds
        clearMarkers();
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

        // Use provided search location or get user location
        let placesLocation;
        if (searchLocation) {
            placesLocation = new google.maps.LatLng(searchLocation.lat, searchLocation.lng);
            bounds.extend(placesLocation);
            map.setCenter(placesLocation);
            map.setZoom(12);
        } else {
            // Use default US center
            placesLocation = new google.maps.LatLng(CONFIG.defaultCenter.lat, CONFIG.defaultCenter.lng);
            bounds.extend(placesLocation);
            console.log("Using default US center for search");
        }

        try {
            // Use Places Service for text search
            const service = new google.maps.places.PlacesService(map);

            const request = {
                query: searchQuery,
                location: placesLocation,
                radius: 40000 // 40km search radius
            };

            service.textSearch(request, (results, status) => {
                // Remove loading indicator
                const loadingElement = document.getElementById('map-loading');
                if (loadingElement) loadingElement.remove();

                if (status === google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
                    console.log("Found places via Places API:", results.length);

                    // Process the results
                    const businessResults = results.map(place => {
                        // Extract address components
                        const addressParts = place.formatted_address ? place.formatted_address.split(',') : [];
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

                        // Calculate distance from search center
                        const placeLatLng = place.geometry.location;
                        const distance = google.maps.geometry.spherical.computeDistanceBetween(
                            placesLocation,
                            placeLatLng
                        );

                        // Create business object
                        const business = {
                            _id: 'google_' + place.place_id,
                            bname: place.name,
                            address1: address1,
                            city: city,
                            state: state,
                            zip: zip,
                            formattedAddress: place.formatted_address,
                            type: mapGooglePlaceTypeToBusinessType(place.types),
                            phone: place.formatted_phone_number || '',
                            isGooglePlace: true,
                            placeId: place.place_id,
                            lat: place.geometry.location.lat(),
                            lng: place.geometry.location.lng(),
                            distance: distance
                        };

                        // Add marker
                        createBusinessMarker(business);

                        // Extend bounds
                        bounds.extend(placeLatLng);

                        return business;
                    });

                    // Check for chain matches
                    findChainMatchesForResults(businessResults).then(() => {
                        // Sort by distance
                        businessResults.sort((a, b) => a.distance - b.distance);

                        // Display results
                        displaySearchResults(businessResults);

                        // Fit map bounds
                        if (bounds && !bounds.isEmpty()) {
                            safelyFitBounds(map, bounds);
                        }
                    });
                } else {
                    console.log("No places found via Places API:", status);
                    showErrorMessage('No businesses found matching your search criteria.');
                }
            });
        } catch (error) {
            console.error("Error searching places:", error);

            // Remove loading indicator
            const loadingElement = document.getElementById('map-loading');
            if (loadingElement) loadingElement.remove();

            showErrorMessage(`Error searching for businesses: ${error.message}`);
        }
    } catch (error) {
        console.error("Error in searchGooglePlaces:", error);
        showErrorMessage(`Error searching for businesses: ${error.message}`);
    }
}

/**
 * Create a business marker with working info window
 * @param {Object} business - Business object
 * @returns {Object} Created marker
 */
function createBusinessMarker(business) {
    try {
        // Validate coordinates
        if (!business.lat || !business.lng ||
            isNaN(parseFloat(business.lat)) || isNaN(parseFloat(business.lng))) {
            console.warn(`Invalid coordinates for business: ${business.bname}`);
            return null;
        }

        // Create position
        const position = new google.maps.LatLng(
            parseFloat(business.lat),
            parseFloat(business.lng)
        );

        // Determine marker color
        const isFromDatabase = !business.isGooglePlace;
        const markerColor = isFromDatabase ? CONFIG.markerColors.primary : CONFIG.markerColors.nearby;

        // Create marker with improved settings
        const marker = new google.maps.Marker({
            position: position,
            map: map,
            title: business.bname,
            animation: google.maps.Animation.DROP,
            optimized: false, // Disable optimization for better click handling
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: markerColor,
                fillOpacity: 1,
                strokeWeight: 2,
                strokeColor: '#FFFFFF',
                scale: 12 // Slightly larger for easier clicking
            }
        });

        // Store business data
        marker.business = business;

        // Add click event with improved handling
        marker.addListener('click', function() {
            console.log("Marker clicked for business:", business.bname);
            showInfoWindow(this);
        });

        // Add to markers array
        markers.push(marker);

        // Add to bounds
        if (bounds) {
            bounds.extend(position);
        }

        return marker;
    } catch (error) {
        console.error("Error creating business marker:", error);
        return null;
    }
}

function applyMapHeightFix() {
    // Check if styles already applied
    if (!document.getElementById('map-height-fix')) {
        const style = document.createElement('style');
        style.id = 'map-height-fix';
        style.textContent = mapHeightCSS;
        document.head.appendChild(style);

        console.log("Applied map height and info window positioning fixes");

        // Force map resize if it exists
        if (map && google.maps.event) {
            setTimeout(() => {
                google.maps.event.trigger(map, 'resize');
                console.log("Triggered map resize event");
            }, 100);
        }
    }
}

const mapHeightCSS = `
#map {
    width: 100%;
    height: 800px !important; /* Increased from 500px */
    min-height: 800px;
    border: 1px solid #ccc;
    border-radius: 4px;
    margin: 10px 0;
    position: relative;
}

#map-container {
    width: 90%;
    margin: 20px auto;
    clear: both;
}

.map-controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
    padding: 0 5px;
}

/* Ensure proper info window positioning */
.gm-style .gm-style-iw-c {
    padding: 0 !important;
    border-radius: 8px !important;
    box-shadow: 0 2px 7px 1px rgba(0,0,0,0.3) !important;
    max-width: 330px !important;
    max-height: 400px !important;
    overflow: hidden !important;
    position: relative !important;
    z-index: 1000 !important;
    /* Ensure it's positioned correctly relative to the tail */
    margin-bottom: 15px !important;
}

.gm-style .gm-style-iw-d {
    overflow: auto !important;
    max-height: 350px !important;
    padding-right: 8px !important;
}

.gm-style .gm-style-iw {
    /* Override any problematic positioning */
    position: relative !important;
    z-index: 1001 !important;
}

.gm-style .gm-style-iw-t {
    position: absolute !important;
    width: 100% !important;
    /* Override the inline bottom positioning that's causing the issue */
    bottom: 0px !important;
    /* Ensure proper positioning */
    right: auto !important;
    left: 50% !important;
    transform: translateX(-50%) !important;
    /* Make sure it's properly sized */
    height: 15px !important;
}

.gm-style .gm-style-iw-tc {
    /* This is the tail connector - make sure it's positioned correctly */
    top: auto !important;
    bottom: -15px !important;
    left: 50% !important;
    right: auto !important;
    transform: translateX(-50%) !important;
    width: 24px !important;
    height: 24px !important;
}
`;

/**
 * Show info window for a business marker
 * @param {Object} marker - The marker that was clicked
 */
function showBusinessInfoWindow(marker) {
    if (!marker || !marker.business) {
        console.error("Invalid marker or missing business data");
        return;
    }

    const business = marker.business;
    console.log("Showing info window for business:", business.bname);

    // Create info window if needed
    if (!infoWindow) {
        infoWindow = new google.maps.InfoWindow({
            maxWidth: 320,
            disableAutoPan: false
        });
    }

    // Check if this is a Google Places result
    const isGooglePlace = business.isGooglePlace === true;
    const isChainLocation = !!business.chain_id;

    // Format address
    const addressText = business.address1 ?
        `<p><strong>Address:</strong><br>${business.address1}${business.city ? ', ' + business.city : ''}${business.state ? ', ' + business.state : ''}${business.zip ? ' ' + business.zip : ''}</p>` :
        '';

    // Create chain badge if applicable
    const chainBadge = isChainLocation ?
        `<span style="display:inline-block; background-color:#4285F4; color:white; padding:2px 6px; border-radius:4px; font-size:0.8em; margin-left:5px;">${business.chain_name || 'Chain Location'}</span>` :
        '';

    // Determine action button
    let actionButton;
    if (isGooglePlace) {
        if (isChainLocation) {
            actionButton = `
                <button style="background-color:#EA4335; color:white; border:none; padding:8px 12px; border-radius:4px; cursor:pointer; margin-top:10px;" 
                        onclick="window.addBusinessToDatabase('${business.placeId}', '${business.chain_id}')">
                    Add to Database
                </button>
            `;
        } else {
            actionButton = `
                <button style="background-color:#EA4335; color:white; border:none; padding:8px 12px; border-radius:4px; cursor:pointer; margin-top:10px;" 
                        onclick="window.addBusinessToDatabase('${business.placeId}')">
                    Add to Patriot Thanks
                </button>
            `;
        }
    } else {
        actionButton = `
            <button style="background-color:#4285F4; color:white; border:none; padding:8px 12px; border-radius:4px; cursor:pointer; margin-top:10px;" 
                    onclick="window.viewBusinessDetails('${business._id}')">
                View Details
            </button>
        `;
    }

    // Build content
    const content = `
        <div style="max-width:300px; font-family:Arial,sans-serif;">
            <h3 style="margin-top:0; margin-bottom:8px; font-size:16px;">${business.bname} ${chainBadge}</h3>
            ${addressText}
            <div id="incentives-container-${business._id || business.placeId}">
                <p><em>Loading incentives...</em></p>
            </div>
            <div style="text-align:right;">
                ${actionButton}
            </div>
        </div>
    `;

    // Set content and open
    infoWindow.setContent(content);
    infoWindow.open(map, marker);

    // Load incentives after window is open
    if (isGooglePlace && isChainLocation) {
        fetchChainIncentivesForInfoWindow(business.placeId, business.chain_id, true);
    } else if (!isGooglePlace) {
        fetchBusinessIncentivesForInfoWindow(business._id, true);
    } else {
        const incentivesDiv = document.getElementById(`incentives-container-${business._id || business.placeId}`);
        if (incentivesDiv) {
            incentivesDiv.innerHTML = `<p><em>This business is not yet in the Patriot Thanks database.</em></p>`;
        }
    }
}

/**
 * Fetch chain incentives for a Google Places result - simple version
 * @param {string} placeId - Google Place ID
 * @param {string} chainId - Chain ID in database
 * @param {boolean} isNativeInfoWindow - Whether using native Google InfoWindow
 */
function fetchChainIncentivesForInfoWindow(placeId, chainId, isNativeInfoWindow = false) {
    if (!chainId) {
        console.error("No chain ID provided for fetching incentives");
        return;
    }

    // Get container element ID based on info window type
    const containerSelector = isNativeInfoWindow ?
        `incentives-container-${placeId}` :
        `info-window-incentives-${placeId}`;

    // Get incentives container
    const incentivesDiv = document.getElementById(containerSelector);
    if (!incentivesDiv) {
        console.error(`Could not find incentives div for place ${placeId}`);
        return;
    }

    // Determine the base URL
    const baseURL = getBaseURL();

    // Build API URL
    const apiURL = `${baseURL}/api/combined-api.js?operation=incentives&business_id=${chainId}`;

    console.log("Fetching chain incentives from:", apiURL);

    fetch(apiURL)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to fetch chain incentives: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log(`Chain incentives data for place ${placeId}:`, data);

            // Check if there are any incentives
            if (!data.results || data.results.length === 0) {
                incentivesDiv.innerHTML = '<p><strong>Chain Incentives:</strong> No incentives found</p>';
                return;
            }

            // Build HTML for incentives
            let incentivesHTML = '<p><strong>Chain Incentives:</strong></p><ul style="margin:8px 0; padding-left:20px;">';

            data.results.forEach(incentive => {
                if (incentive.is_available) {
                    const typeLabel = getIncentiveTypeLabel(incentive.type);
                    const otherDescription = incentive.other_description ?
                        ` (${incentive.other_description})` : '';

                    // All chain incentives should have the chain badge
                    const chainBadge = '<span style="display:inline-block; background-color:#4285F4; color:white; padding:1px 4px; border-radius:4px; font-size:0.7em; margin-left:5px;">Chain-wide</span>';

                    incentivesHTML += `
                        <li>
                            <strong>${typeLabel}${otherDescription}:</strong> ${incentive.amount}% ${chainBadge}
                            ${incentive.information ? `<div style="font-size:13px; color:#555; margin-top:2px;">${incentive.information}</div>` : ''}
                        </li>
                    `;
                }
            });

            incentivesHTML += '</ul>';

            // Add explanation for chain locations
            incentivesHTML += `
                <div style="margin-top:10px; font-style:italic; color:#666; font-size:12px;">
                    This location matches ${data.chain_info ? data.chain_info.bname : 'a chain'} in our database.
                    Chain-wide incentives apply to all locations.
                </div>
            `;

            incentivesDiv.innerHTML = incentivesHTML;
        })
        .catch(error => {
            console.error(`Error fetching chain incentives: ${error}`);
            incentivesDiv.innerHTML = '<p><strong>Chain Incentives:</strong> Error loading incentives</p>';
        });
}

/**
 * Show info window for a marker with scrollable content
 * @param {Object} marker - Marker object
 */
// Diagnostic version of showInfoWindow to troubleshoot visibility issues
function showInfoWindow(marker) {
    console.log("showInfoWindow called with marker:", marker);

    if (!marker || !marker.business) {
        console.error("Invalid marker for info window", marker);
        return;
    }

    const business = marker.business;
    console.log("Business data for info window:", business);

    // Extract coordinates properly
    let businessLat, businessLng;

    if (business.isGooglePlace && typeof business.lat === 'function' && typeof business.lng === 'function') {
        try {
            businessLat = business.lat();
            businessLng = business.lng();
            console.log("Extracted Google Places coordinates:", businessLat, businessLng);
        } catch (error) {
            console.error("Error extracting Google Places coordinates:", error);
            return;
        }
    } else {
        businessLat = parseFloat(business.lat);
        businessLng = parseFloat(business.lng);
        console.log("Using database coordinates:", businessLat, businessLng);
    }

    // Validate coordinates
    if (isNaN(businessLat) || isNaN(businessLng)) {
        console.error("Invalid coordinates:", businessLat, businessLng);
        return;
    }

    // Update business object
    business.lat = businessLat;
    business.lng = businessLng;

    // Format content
    const addressLine = business.address2
        ? `${business.address1}<br>${business.address2}<br>${business.city}, ${business.state} ${business.zip}`
        : `${business.address1}<br>${business.city}, ${business.state} ${business.zip}`;

    const businessType = getBusinessTypeLabel(business.type);
    const phoneDisplay = business.phone ? `<p><strong>Phone:</strong> ${business.phone}</p>` : '';
    const distanceDisplay = business.distance && !isNaN(business.distance)
        ? `<p><strong>Distance:</strong> ${(business.distance / 1609.34).toFixed(1)} miles</p>`
        : '';

    const isGooglePlace = business.isGooglePlace === true;
    const businessDisplayId = isGooglePlace ? business.placeId : business._id;

    let actionButtons;
    if (isGooglePlace) {
        actionButtons = `<button class="add-business-btn" onclick="window.addBusinessToDatabase('${business.placeId}')">Add to Patriot Thanks</button>`;
    } else {
        actionButtons = `<button class="view-details-btn" onclick="window.viewBusinessDetails('${business._id}')">View Details</button>`;
    }

    // Simple content without complex styling initially
    const contentString = `
    <div class="info-window" style="padding: 10px; max-width: 280px;">
        <h3 style="margin: 0 0 8px 0; font-size: 16px;">${business.bname}</h3>
        <p style="margin: 4px 0;"><strong>Address:</strong><br>${addressLine}</p>
        ${phoneDisplay}
        ${distanceDisplay}
        <p style="margin: 4px 0;"><strong>Type:</strong> ${businessType}</p>
        <div id="info-window-incentives-${businessDisplayId}" style="margin: 8px 0;">
            <p><strong>Incentives:</strong> <em>${isGooglePlace ? 'Not in database' : 'Loading...'}</em></p>
        </div>
        ${isGooglePlace ? '<p style="font-style: italic; color: #666;">This business is not yet in the Patriot Thanks database.</p>' : ''}
        <div style="margin-top: 10px; text-align: center;">
            ${actionButtons}
        </div>
    </div>
    `;

    // Create or reuse info window with minimal configuration
    if (!infoWindow) {
        infoWindow = new google.maps.InfoWindow({
            maxWidth: 300,
            disableAutoPan: false
            // Remove pixelOffset for now to see if that's causing issues
        });
    }

    infoWindow.setContent(contentString);
    infoWindow.close();

    const markerPosition = new google.maps.LatLng(businessLat, businessLng);

    try {
        console.log("Panning to position:", businessLat, businessLng);
        map.panTo(markerPosition);

        setTimeout(() => {
            try {
                if (marker.getPosition && typeof marker.getPosition === 'function') {
                    console.log("Opening info window on standard marker");
                    infoWindow.open(map, marker);
                } else {
                    console.log("Opening info window at position");
                    infoWindow.setPosition(markerPosition);
                    infoWindow.open(map);
                }

                console.log("Info window opened successfully");

                // Diagnostic: Check if info window is actually visible
                setTimeout(() => {
                    checkInfoWindowVisibility();
                }, 500);

            } catch (openError) {
                console.error("Error opening info window:", openError);
                infoWindow.setPosition(markerPosition);
                infoWindow.open(map);
            }
        }, 300); // Increased delay

    } catch (error) {
        console.error("Error positioning info window:", error);
        return;
    }

    // Simplified DOM ready handler - NO tail positioning fixes initially
    google.maps.event.addListenerOnce(infoWindow, 'domready', function() {
        console.log("Info window DOM ready");

        setTimeout(() => {
            // Just check visibility and basic styling
            const iwOuter = document.querySelector('.gm-style-iw');
            if (iwOuter) {
                console.log("Found info window element:", iwOuter);
                console.log("Info window styles:", window.getComputedStyle(iwOuter));

                // Check if it's visible
                const rect = iwOuter.getBoundingClientRect();
                console.log("Info window position:", rect);

                if (rect.width === 0 || rect.height === 0) {
                    console.error("Info window has zero dimensions!");
                }

                if (rect.top < 0 || rect.left < 0 || rect.top > window.innerHeight || rect.left > window.innerWidth) {
                    console.error("Info window is positioned outside viewport!");
                }
            } else {
                console.error("Could not find info window element in DOM");
            }

            // Load incentives for database businesses
            if (!isGooglePlace) {
                setTimeout(() => {
                    fetchBusinessIncentivesForInfoWindow(business._id, false);
                }, 100);
            }
        }, 200);
    });
}

// Diagnostic function to check info window visibility
function checkInfoWindowVisibility() {
    console.log("=== INFO WINDOW VISIBILITY DIAGNOSTIC ===");

    const iwElements = document.querySelectorAll('.gm-style-iw, .gm-style-iw-c, .gm-style-iw-d');
    console.log("Found info window elements:", iwElements.length);

    iwElements.forEach((element, index) => {
        const rect = element.getBoundingClientRect();
        const styles = window.getComputedStyle(element);

        console.log(`Element ${index} (${element.className}):`);
        console.log("  Position:", rect);
        console.log("  Visibility:", styles.visibility);
        console.log("  Display:", styles.display);
        console.log("  Opacity:", styles.opacity);
        console.log("  Z-index:", styles.zIndex);
        console.log("  Transform:", styles.transform);
    });

    // Check if there are any elements with the tail class that might be causing issues
    const tailElements = document.querySelectorAll('.gm-style-iw-t');
    console.log("Found tail elements:", tailElements.length);

    tailElements.forEach((element, index) => {
        const rect = element.getBoundingClientRect();
        const styles = window.getComputedStyle(element);

        console.log(`Tail ${index}:`);
        console.log("  Position:", rect);
        console.log("  Bottom:", styles.bottom);
        console.log("  Right:", styles.right);
        console.log("  Left:", styles.left);
        console.log("  Transform:", styles.transform);
    });

    console.log("=== END DIAGNOSTIC ===");
}

// Temporary function to remove any problematic CSS that might be hiding info windows
function removeProblematicInfoWindowCSS() {
    // Remove any existing CSS that might be causing issues
    const existingStyles = document.querySelectorAll('#info-window-position-fix, #map-height-fix');
    existingStyles.forEach(style => {
        console.log("Removing potentially problematic style:", style.id);
        style.remove();
    });

    // Add very minimal CSS to ensure visibility
    const style = document.createElement('style');
    style.id = 'minimal-info-window-fix';
    style.textContent = `
        /* Minimal CSS to ensure info windows are visible */
        .gm-style .gm-style-iw-c {
            max-width: 320px !important;
            max-height: 400px !important;
            overflow: visible !important;
        }
        
        .gm-style .gm-style-iw-d {
            overflow: auto !important;
            max-height: 350px !important;
        }
        
        .gm-style .gm-style-iw {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
        }
        
        /* Don't touch the tail positioning for now */
        .gm-style .gm-style-iw-t {
            /* Let Google handle this naturally */
        }
    `;
    document.head.appendChild(style);

    console.log("Applied minimal info window CSS");
}

// Call this to reset and test
window.debugInfoWindow = function() {
    console.log("Starting info window debug...");
    removeProblematicInfoWindowCSS();

    // Close any existing info window
    if (infoWindow) {
        infoWindow.close();
    }

    console.log("Ready for testing - try clicking a marker now");
};

// Auto-apply the minimal CSS when this script loads
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        removeProblematicInfoWindowCSS();
    }, 1000);
});

/**
 * Enhanced fetchBusinessIncentivesForInfoWindow function with better error handling
 * @param {string} businessId - Business ID
 * @param {boolean} isNativeInfoWindow - Whether using native Google InfoWindow
 */
function fetchBusinessIncentivesForInfoWindow(businessId, isNativeInfoWindow = false) {
    if (!businessId || businessId.startsWith('google_')) {
        return;
    }

    setTimeout(() => {
        const incentivesDiv = document.getElementById(`info-window-incentives-${businessId}`);

        if (!incentivesDiv) {
            console.error(`Could not find incentives div for business ${businessId}`);
            return;
        }

        const baseURL = getBaseURL();
        const apiURL = `${baseURL}/api/combined-api.js?operation=incentives&business_id=${businessId}`;

        fetch(apiURL)
            .then(response => response.json())
            .then(data => {
                if (!data.results || data.results.length === 0) {
                    incentivesDiv.innerHTML = '<p><strong>Incentives:</strong> No incentives found</p>';
                    return;
                }

                let incentivesHTML = '<p><strong>Incentives:</strong></p><ul style="margin:8px 0; padding-left:20px;">';

                data.results.forEach(incentive => {
                    if (incentive.is_available) {
                        const typeLabel = getIncentiveTypeLabel(incentive.type);
                        const otherDescription = incentive.other_description ? ` (${incentive.other_description})` : '';
                        incentivesHTML += `<li><strong>${typeLabel}${otherDescription}:</strong> ${incentive.amount}%</li>`;
                    }
                });

                incentivesHTML += '</ul>';
                incentivesDiv.innerHTML = incentivesHTML;
            })
            .catch(error => {
                console.error(`Error fetching incentives:`, error);
                incentivesDiv.innerHTML = '<p><strong>Incentives:</strong> Error loading</p>';
            });
    }, 300);
}

function fixInfoWindowTailPositioning() {
    console.log("Attempting to fix info window tail positioning");

    // Try multiple selectors to find the tail element
    let tailElement = document.querySelector('.gm-style-iw-t');

    if (!tailElement) {
        // Try alternative selector
        tailElement = document.querySelector('[class*="gm-style-iw-t"]');
    }

    if (tailElement) {
        console.log("Found info window tail element, applying fixes");

        // Remove the problematic positioning
        tailElement.style.removeProperty('bottom');
        tailElement.style.removeProperty('right');

        // Apply correct positioning
        tailElement.style.setProperty('bottom', '0px', 'important');
        tailElement.style.setProperty('right', 'auto', 'important');
        tailElement.style.setProperty('left', '50%', 'important');
        tailElement.style.setProperty('transform', 'translateX(-50%)', 'important');
        tailElement.style.setProperty('width', '20px', 'important');
        tailElement.style.setProperty('height', '15px', 'important');

        console.log("Applied positioning fixes to tail element");

        // Also check for and fix the tail connector
        const tailConnector = document.querySelector('.gm-style-iw-tc');
        if (tailConnector) {
            tailConnector.style.setProperty('top', 'auto', 'important');
            tailConnector.style.setProperty('bottom', '-15px', 'important');
            tailConnector.style.setProperty('left', '50%', 'important');
            tailConnector.style.setProperty('right', 'auto', 'important');
            tailConnector.style.setProperty('transform', 'translateX(-50%)', 'important');
            console.log("Fixed tail connector positioning");
        }

        return true;
    } else {
        console.warn("Could not find tail element to fix");
        return false;
    }
}

function applyInfoWindowPositioningFixes() {
    if (!document.getElementById('info-window-position-fix')) {
        const style = document.createElement('style');
        style.id = 'info-window-position-fix';
        style.textContent = `
            /* CRITICAL: Fix for Google Maps InfoWindow tail positioning */
            .gm-style .gm-style-iw-t {
                position: absolute !important;
                width: 20px !important;
                height: 15px !important;
                bottom: 0px !important;
                right: auto !important;
                left: 50% !important;
                transform: translateX(-50%) !important;
            }
            
            /* Override inline styles with high specificity */
            .gm-style div[class="gm-style-iw-t"][style] {
                bottom: 0px !important;
                right: auto !important;
                left: 50% !important;
                transform: translateX(-50%) !important;
                width: 20px !important;
                height: 15px !important;
            }
            
            /* Fix tail connector */
            .gm-style .gm-style-iw-tc {
                top: auto !important;
                bottom: -15px !important;
                left: 50% !important;
                right: auto !important;
                transform: translateX(-50%) !important;
            }
            
            /* Ensure info window container positioning */
            .gm-style .gm-style-iw-c {
                margin-bottom: 15px !important;
                position: relative !important;
            }
        `;
        document.head.appendChild(style);
        console.log("Applied info window positioning fixes");
    }
}

/**
 * Fixed displayBusinessesOnMap function for better GeoJSON handling
 * @param {Array} businesses - Array of business objects
 */
function displayBusinessesOnMap(businesses) {
    // Skip if map not ready
    if (!map) {
        console.log("Map not ready, storing businesses for later display");
        pendingBusinessesToDisplay = businesses;
        return;
    }

    console.log("Displaying businesses on map:", businesses.length);

    // Clear existing markers and create new bounds
    clearMarkers();
    bounds = new google.maps.LatLngBounds();

    // Counter for valid markers
    let validMarkers = 0;

    // Process each business
    businesses.forEach(business => {
        try {
            console.log("Processing business for map:", business.bname);

            // Handle different coordinate formats
            let lat, lng;

            // For MongoDB businesses with GeoJSON format
            if (business.location && business.location.coordinates &&
                Array.isArray(business.location.coordinates) && business.location.coordinates.length >= 2) {
                // MongoDB stores as [longitude, latitude]
                lng = business.location.coordinates[0];
                lat = business.location.coordinates[1];
            }
            // For businesses with direct lat/lng fields
            else if (business.lat !== undefined && business.lng !== undefined) {
                lat = parseFloat(business.lat);
                lng = parseFloat(business.lng);
            } else {
                console.warn(`Business ${business.bname} missing coordinates`);
                return;
            }

            // Validate coordinates
            if (isNaN(lat) || isNaN(lng)) {
                console.warn(`Invalid coordinates for ${business.bname}:`, lat, lng);
                return;
            }

            // Update business object with coordinates
            business.lat = lat;
            business.lng = lng;

            // Create marker
            const marker = createBusinessMarker(business);
            if (marker) {
                validMarkers++;
            }
        } catch (error) {
            console.error(`Error adding business ${business.bname} to map:`, error);
        }
    });

    console.log(`Added ${validMarkers} valid markers to the map`);

    // Update map view
    setTimeout(() => {
        try {
            if (validMarkers > 0 && bounds && !bounds.isEmpty()) {
                console.log("Fitting map to bounds of markers");
                safelyFitBounds(map, bounds);
            } else if (window.currentSearchLocation) {
                console.log("Centering on search location:", window.currentSearchLocation);
                map.setCenter(new google.maps.LatLng(
                    window.currentSearchLocation.lat,
                    window.currentSearchLocation.lng
                ));
                map.setZoom(11);
            }
        } catch (error) {
            console.error("Error updating map view:", error);
        }
    }, 200);
}

/**
 * Enhanced findChainMatchesForResults function
 * @param {Array} businesses - Business objects from Places API
 * @returns {Promise<Array>} Updated business objects with chain info
 */
async function findChainMatchesForResults(businesses) {
    const promises = businesses.map(business => {
        return findMatchingChainForPlaceResult(business.bname)
            .then(matchingChain => {
                if (matchingChain) {
                    console.log(`Found matching chain for place: ${business.bname}`);
                    business.chain_id = matchingChain._id;
                    business.chain_name = matchingChain.bname;
                    business.isChainLocation = true;
                }
                return business;
            })
            .catch(error => {
                console.error(`Error matching chain for ${business.bname}:`, error);
                return business;
            });
    });

    await Promise.all(promises);
    return businesses;
}

/**
 * Find matching chain for a Google Places business result
 * Enhanced with local fallback for when API is not available
 * @param {string} placeName - Name of the place to match with chains
 * @returns {Promise<Object|null>} - Matching chain or null if no match
 */
async function findMatchingChainForPlaceResult(placeName) {
    try {
        if (!placeName) {
            console.warn("Empty place name provided for chain matching");
            return null;
        }

        console.log("Checking if place matches a chain:", placeName);

        // Get the base URL
        const baseURL = getBaseURL();

        try {
            // Try server-side chain matching first
            const response = await fetch(`${baseURL}/api/business.js?operation=find_matching_chain&place_name=${encodeURIComponent(placeName)}`);

            // Check if the response is successful, but also handle 404 gracefully
            if (response.status === 404) {
                console.log("No matching chains found for", placeName);
                // Fall back to client-side matching
                return findMatchingChainLocally(placeName);
            }

            if (!response.ok) {
                console.error("Error searching for matching chains:", response.status);
                // Fall back to client-side matching
                return findMatchingChainLocally(placeName);
            }

            const data = await response.json();

            if (data.success && data.chain) {
                console.log("Found matching chain for place:", data.chain.bname);
                return data.chain;
            }

            // If API returns no matches, check locally as fallback
            return findMatchingChainLocally(placeName);
        } catch (error) {
            console.error("Error with chain matching API, falling back to local matching:", error);
            return findMatchingChainLocally(placeName);
        }
    } catch (error) {
        console.error("Error finding matching chain:", error);
        return null;
    }
}

/**
 * Map Google place types to business type codes
 * @param {Array} types - Array of Google place types
 * @returns {string} Business type code
 */
function mapGooglePlaceTypeToBusinessType(types) {
    if (!types || !Array.isArray(types)) return 'OTHER';

    // Map Google place types to our business type codes
    if (types.includes('restaurant')) return 'REST';
    if (types.includes('meal_takeaway')) return 'REST';
    if (types.includes('cafe')) return 'REST';
    if (types.includes('bakery')) return 'REST';
    if (types.includes('bar')) return 'REST';

    if (types.includes('grocery_or_supermarket')) return 'GROC';
    if (types.includes('supermarket')) return 'GROC';

    if (types.includes('gas_station')) return 'FUEL';
    if (types.includes('hardware_store')) return 'HARDW';
    if (types.includes('department_store')) return 'DEPT';
    if (types.includes('convenience_store')) return 'CONV';
    if (types.includes('clothing_store')) return 'CLTH';
    if (types.includes('shoe_store')) return 'CLTH';

    if (types.includes('electronics_store')) return 'ELEC';
    if (types.includes('computer_store')) return 'TECH';

    if (types.includes('furniture_store')) return 'FURN';
    if (types.includes('store')) return 'RETAIL';
    if (types.includes('drugstore')) return 'RX';
    if (types.includes('pharmacy')) return 'RX';

    if (types.includes('car_dealer')) return 'AUTO';
    if (types.includes('car_repair')) return 'AUTO';
    if (types.includes('car_wash')) return 'AUTO';

    if (types.includes('beauty_salon')) return 'BEAU';
    if (types.includes('hair_care')) return 'BEAU';
    if (types.includes('spa')) return 'BEAU';

    if (types.includes('book_store')) return 'BOOK';
    if (types.includes('library')) return 'BOOK';

    if (types.includes('movie_theater')) return 'ENTR';
    if (types.includes('amusement_park')) return 'ENTR';
    if (types.includes('aquarium')) return 'ENTR';
    if (types.includes('art_gallery')) return 'ENTR';
    if (types.includes('museum')) return 'ENTR';
    if (types.includes('zoo')) return 'ENTR';

    if (types.includes('sporting_goods_store')) return 'SPRT';
    if (types.includes('gym')) return 'SPRT';

    if (types.includes('jewelry_store')) return 'JEWL';
    if (types.includes('home_goods_store')) return 'GIFT';
    if (types.includes('gift_shop')) return 'GIFT';

    if (types.includes('health')) return 'HEAL';
    if (types.includes('doctor')) return 'HEAL';
    if (types.includes('dentist')) return 'HEAL';
    if (types.includes('hospital')) return 'HEAL';

    if (types.includes('point_of_interest')) return 'SPEC';
    if (types.includes('establishment')) return 'SERV';

    // Default to OTHER if no specific mapping found
    return 'OTHER';
}

/**
 * Search for nearby businesses of similar type
 * @param {google.maps.LatLng} location - Center location
 * @param {string} businessType - Business type to search for
 */
function searchNearbyBusinesses(location, businessType) {
    try {
        console.log("Searching for nearby businesses near", location.lat(), location.lng());

        // Get base URL
        const baseURL = getBaseURL();

        // Search for businesses of the same type in the database
        const apiURL = `${baseURL}/api/business.js?operation=search&type=${businessType}&lat=${location.lat()}&lng=${location.lng()}&radius=25`;

        fetch(apiURL)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to fetch nearby businesses: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (!data.results || data.results.length === 0) {
                    console.log("No additional nearby businesses found in database");
                    return;
                }

                console.log(`Found ${data.results.length} potential nearby businesses in database`);

                // Filter out businesses already on the map
                const existingBusinessIds = markers.map(marker => marker.business?._id).filter(id => id);
                const newBusinesses = data.results.filter(business =>
                    !existingBusinessIds.includes(business._id)
                );

                console.log(`${newBusinesses.length} new businesses to add to map from database`);

                // Add new businesses to the map
                newBusinesses.forEach(business => {
                    // Mark as nearby for different styling
                    business.isNearby = true;

                    // Create marker if business has coordinates
                    if (business.lat && business.lng) {
                        const position = new google.maps.LatLng(business.lat, business.lng);

                        // Only add if within reasonable distance
                        const distance = google.maps.geometry.spherical.computeDistanceBetween(
                            location,
                            position
                        );

                        if (distance < 80000) { // 80km or about 50 miles
                            createBusinessMarker(business);

                            // Extend bounds
                            if (bounds) {
                                bounds.extend(position);
                            }
                        } else {
                            console.log(`Skipping distant business: ${business.bname} (${distance / 1609} miles)`);
                        }
                    }
                });

                // Update map bounds if we added markers
                if (newBusinesses.length > 0 && bounds && !bounds.isEmpty()) {
                    safelyFitBounds(map, bounds);
                }
            })
            .catch(error => {
                console.error("Error searching for nearby businesses in database:", error);
            });
    } catch (error) {
        console.error("Error in searchNearbyBusinesses:", error);
    }
}

/**
 * Show error message in appropriate container
 * @param {string} message - Error message to display
 * @param {HTMLElement} container - Optional specific container
 */
function showErrorMessage(message, container) {
    const targetContainer = container || document.getElementById('search_table');
    if (targetContainer) {
        targetContainer.style.display = 'block';

        const tableBody = targetContainer.querySelector('tbody');
        if (tableBody) {
            tableBody.innerHTML = `<tr><td colspan="5" class="text-center error-message">${message}</td></tr>`;
        } else {
            targetContainer.innerHTML = `<div class="error-message">${message}</div>`;
        }

        targetContainer.scrollIntoView({behavior: 'smooth'});
    } else {
        alert(message);
    }
}

/**
 * Initialize the Google Map
 */
window.initGoogleMap = function() {
    console.log("Enhanced initGoogleMap function called");

    try {
        // Apply CSS fixes first
        applyMapHeightFix();

        // Check if map container exists
        const mapContainer = document.getElementById("map");
        if (!mapContainer) {
            console.error("Map container not found in the DOM");
            return;
        }

        console.log("Map container dimensions:", mapContainer.offsetWidth, "x", mapContainer.offsetHeight);

        // Only create the map if it doesn't already exist
        if (!map) {
            // Create map with enhanced settings for better info window handling
            map = new google.maps.Map(mapContainer, {
                center: CONFIG.defaultCenter,
                zoom: CONFIG.defaultZoom,
                mapId: CONFIG.mapId || 'ebe8ec43a7bc252d',
                clickableIcons: true,
                gestureHandling: 'greedy', // Better touch handling
                zoomControl: true,
                mapTypeControl: false,
                scaleControl: true,
                streetViewControl: false,
                rotateControl: false,
                fullscreenControl: true
            });

            console.log("Map object created with enhanced settings:", !!map);

            // Create info window with better settings
            infoWindow = new google.maps.InfoWindow({
                maxWidth: 320,
                disableAutoPan: false,
                pixelOffset: new google.maps.Size(0, -10)
            });

            bounds = new google.maps.LatLngBounds();

            // Add initial message
            addInitialMapMessage(mapContainer);

            // Setup reset map button
            setupResetMapButton();

            // Set initialization flag
            mapInitialized = true;
            console.log("Google Map successfully initialized with enhanced settings");

            // Process any pending businesses
            if (pendingBusinessesToDisplay.length > 0) {
                console.log("Processing pending businesses to display on map");
                displayBusinessesOnMap(pendingBusinessesToDisplay);
                pendingBusinessesToDisplay = [];
            }

            // Setup map handlers
            setupMapClickHandler();
            setupMarkerClickPriority();
            initAdditionalMapFeatures();

            // Trigger resize to ensure proper rendering
            setTimeout(() => {
                google.maps.event.trigger(map, 'resize');
            }, 200);

        } else {
            console.log("Map already exists, applying height fix and triggering resize");
            applyMapHeightFix();
            setTimeout(() => {
                google.maps.event.trigger(map, 'resize');
            }, 100);
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
 * Add initial message to map
 * @param {HTMLElement} mapContainer - Map container element
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
        resetMapButton.addEventListener('click', function() {
            resetMapView();
        });
    }
}

/**
 * Reset map view to default
 */
function resetMapView() {
    if (!mapInitialized || !map) {
        console.error("Cannot reset map view - map not initialized");
        return;
    }

    try {
        // Center on US and zoom out
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
 * Setup map click handler for POI clicks
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

        // Listen for POI clicks
        map.addListener('click', async function(event) {
            console.log("Map clicked", event);

            // Check if clicked on a POI
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
                        console.log("Found existing marker for clicked place");
                        showInfoWindow(existingMarker);
                        return;
                    }

                    // Create a Place instance with the clicked place ID
                    const place = new Place({
                        id: event.placeId
                    });

                    // Fetch place details
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

                    // Extract business name
                    const businessName = place.displayName || '';

                    // Check if this business matches any chains
                    let chainMatch = null;
                    try {
                        chainMatch = await findMatchingChainForPlaceResult(businessName);
                    } catch (error) {
                        console.error("Error checking for chain match:", error);
                    }

                    // Create business object from the place
                    const business = {
                        _id: 'google_' + place.id,
                        bname: businessName,
                        address1: place.formattedAddress || '',
                        city: '',
                        state: '',
                        zip: '',
                        isGooglePlace: true,
                        placeId: place.id,
                        lat: place.location?.lat || 0,
                        lng: place.location?.lng || 0
                    };

                    // Add chain info if it matches
                    if (chainMatch) {
                        console.log(`POI "${businessName}" matches chain: ${chainMatch.bname}`);
                        business.chain_id = chainMatch._id;
                        business.chain_name = chainMatch.bname;
                        business.isChainLocation = true;
                    }

                    // Calculate distance if possible
                    if (place.location && window.currentSearchLocation) {
                        business.distance = google.maps.geometry.spherical.computeDistanceBetween(
                            new google.maps.LatLng(place.location.lat, place.location.lng),
                            new google.maps.LatLng(
                                window.currentSearchLocation.lat,
                                window.currentSearchLocation.lng
                            )
                        );
                    }

                    // Create temporary marker for info window
                    const tempMarker = {
                        business: business,
                        position: place.location ?
                            new google.maps.LatLng(place.location.lat, place.location.lng) :
                            event.latLng
                    };

                    // Show custom info window
                    showInfoWindow(tempMarker);
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
 * Setup marker click priority over POI clicks
 */
function setupMarkerClickPriority() {
    if (!map) {
        console.error("Map not initialized, cannot set up click priority");
        return;
    }

    console.log("Setting up marker click priority");

    // Create listener that gets called before Google's POI click
    google.maps.event.addListener(map, 'click', function(event) {
        // Only process if we have a POI click
        if (event.placeId) {
            // Check if any of our markers are close to this click
            const clickPoint = event.latLng;
            const pixelRadius = 20;
            const projection = map.getProjection();

            if (!projection) return;

            // Convert latLng to pixel coordinates
            const scale = Math.pow(2, map.getZoom());
            const worldCoordinate = projection.fromLatLngToPoint(clickPoint);

            // Check each marker
            for (const marker of markers) {
                if (!marker.position) continue;

                const markerLatLng = marker.position;
                const markerWorldCoord = projection.fromLatLngToPoint(markerLatLng);

                // Calculate distance in pixels
                const pixelDistance = Math.sqrt(
                    Math.pow((worldCoordinate.x - markerWorldCoord.x) * scale, 2) +
                    Math.pow((worldCoordinate.y - markerWorldCoord.y) * scale, 2)
                );

                // If click is near our marker
                if (pixelDistance <= pixelRadius) {
                    console.log("Preventing POI click, using our marker instead");
                    event.stop();

                    // Trigger our marker click
                    setTimeout(() => {
                        showInfoWindow(marker);
                    }, 10);

                    return;
                }
            }
        }
    }, {passive: false});
}

/**
 * Initialize additional map features
 */
function initAdditionalMapFeatures() {
    console.log("Initializing additional map features");

    // Add custom CSS fixes
    addCustomMarkerStyleFixes();

    // Setup marker click priority
    setupMarkerClickPriority();

    // Customize info windows
    customizeInfoWindows();
}

/**
 * Add custom marker style fixes
 */
function addCustomMarkerStyleFixes() {
    if (!document.getElementById('marker-style-fixes')) {
        const style = document.createElement('style');
        style.id = 'marker-style-fixes';
        style.textContent = `
            /* Ensure proper marker display */
            .marker-icon {
                display: flex;
                justify-content: center;
                align-items: center;
                width: 20px;
                height: 20px;
                color: #333;
            }
            
            /* Fix for Font Awesome icons */
            .marker-icon i {
                font-size: 12px !important;
                color: #333 !important;
            }
            
            /* Info window styling */
            .info-window-actions .view-details-btn {
                margin-top: 8px;
            }
        `;
        document.head.appendChild(style);
    }
}

/**
 * Customize Google Maps info windows
 */
function customizeInfoWindows() {
    // Apply scrollable styles
    applyInfoWindowScrollableStyles();

    // Improve close button visibility
    const closeButtonStyles = document.createElement('style');
    closeButtonStyles.textContent = `
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
 * Apply scrollable styles to info windows
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
 * Enhanced focus on map marker function
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

        // Try to fetch the business and create a marker for it
        fetchBusinessAndCreateMarker(businessId);
        return;
    }

    // Find the marker for this business
    const marker = markers.find(m => m.business && m.business._id === businessId);

    if (marker) {
        try {
            // Get position from marker
            let position;
            if (marker.getPosition && typeof marker.getPosition === 'function') {
                position = marker.getPosition();
            } else if (marker.position) {
                position = marker.position;
            } else if (marker.business && marker.business.lat && marker.business.lng) {
                position = new google.maps.LatLng(
                    parseFloat(marker.business.lat),
                    parseFloat(marker.business.lng)
                );
            } else {
                console.error("Could not determine marker position");
                alert("Could not focus on this business on the map.");
                return;
            }

            // Center the map on this marker
            map.setCenter(position);
            map.setZoom(16);

            // Show info window
            showInfoWindow(marker);

            // Scroll to the map
            document.getElementById('map').scrollIntoView({behavior: 'smooth'});

            console.log("Successfully focused on marker for business:", businessId);
        } catch (error) {
            console.error("Error focusing on marker:", error);
            alert("There was an error focusing on this business on the map.");
        }
    } else {
        console.warn(`No marker found for business ID: ${businessId}`);

        // Try to fetch the business and create a marker
        fetchBusinessAndCreateMarker(businessId);
    }
};

/**
 * Fetch business data and create marker if not found
 * @param {string} businessId - Business ID to fetch
 */
function fetchBusinessAndCreateMarker(businessId) {
    console.log("Fetching business data for marker creation:", businessId);

    const baseURL = getBaseURL();

    fetch(`${baseURL}/api/business.js?operation=get&id=${businessId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to fetch business: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.result) {
                console.log("Found business data:", data.result);

                // Create marker for this business
                const marker = createBusinessMarker(data.result);

                if (marker) {
                    // Center on the marker
                    map.setCenter(marker.getPosition());
                    map.setZoom(15);

                    // Show info window
                    showInfoWindow(marker);

                    console.log("Created and focused on new marker for business:", businessId);
                }
            } else {
                console.error("Business data not found");
                alert("Business information could not be found.");
            }

            // Scroll to the map
            document.getElementById('map').scrollIntoView({behavior: 'smooth'});
        })
        .catch(error => {
            console.error("Error fetching business data:", error);
            alert("There was an error getting information for this business.");

            // Still scroll to the map
            document.getElementById('map').scrollIntoView({behavior: 'smooth'});
        });
}

// Ensure Google Maps is properly initialized when DOM loads
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM loaded, initializing business search...");

    applyInfoWindowPositioningFixes();
    applyMapHeightFix();
    // Add custom styles
    addCustomMarkerStyles();
    addChainBadgeStyles();

    // Initialize business search functionality
    initBusinessSearch();

    // Check for newly added businesses
    checkForNewlyAddedBusiness();

    // Check if Google Maps is already loaded
    if (window.google && window.google.maps) {
        console.log("Google Maps already loaded, initializing map");
        initGoogleMap();
    } else {
        console.log("Google Maps not yet loaded, will be initialized via callback");
    }
});

/**
 * Field validation function
 * @param {string} value - Field value
 * @returns {boolean} True if valid
 */
function isNotEmpty(value) {
    return value && value.trim() !== '';
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
 * Enhanced display search results function to properly categorize businesses
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

        // Show the search results table
        searchTableContainer.style.display = 'block';

        // Hide the "hidden" text in the h5
        const searchTableH5 = searchTableContainer.querySelector('h5');
        if (searchTableH5) {
            searchTableH5.style.display = 'none';
        }

        if (businesses.length === 0) {
            // Show no results message
            tableBody.innerHTML = '<tr><td colspan="5" class="text-center">No businesses found matching your search criteria.</td></tr>';
            searchTableContainer.scrollIntoView({behavior: 'smooth'});
            return;
        }

        // Split businesses into categories
        const databaseBusinesses = businesses.filter(b => !b.isGooglePlace);
        const chainMatchedPlaces = businesses.filter(b => b.isGooglePlace && b.chain_id);
        const regularPlaces = businesses.filter(b => b.isGooglePlace && !b.chain_id);

        console.log(`Businesses to display: ${databaseBusinesses.length} from database, ${chainMatchedPlaces.length} chain-matched Places, ${regularPlaces.length} regular Places`);

        // Add database businesses first
        databaseBusinesses.forEach(business => {
            addBusinessRow(business, tableBody, false);
        });

        // Add chain-matched Places businesses
        chainMatchedPlaces.forEach(business => {
            addBusinessRow(business, tableBody, true);
        });

        // Add regular Places businesses
        regularPlaces.forEach(business => {
            addBusinessRow(business, tableBody, true);
        });

        // Scroll to the results
        searchTableContainer.scrollIntoView({behavior: 'smooth'});

    } catch (error) {
        console.error("Error displaying search results: ", error);
        alert("There was an error displaying the search results: " + error.message);
    }
}

/**
 * Helper function to add a business row to the table
 * @param {Object} business - Business object
 * @param {Element} tableBody - Table body element
 * @param {boolean} isFromPlaces - Whether this business is from Places API
 */
function addBusinessRow(business, tableBody, isFromPlaces) {
    if (!business) return;

    // Format the address line
    const addressLine = business.address2
        ? `${business.address1}<br>${business.address2}<br>${business.city}, ${business.state} ${business.zip}`
        : `${business.address1}<br>${business.city}, ${business.state} ${business.zip}`;

    // Convert business type to readable label
    const businessType = getBusinessTypeLabel(business.type);

    // Check business type and create badges
    const isChainLocation = !!business.chain_id;
    const isParentChain = !!business.is_chain;
    const isGooglePlace = !!business.isGooglePlace;

    // Create chain badge
    let chainBadge = '';
    if (isParentChain) {
        chainBadge = '<span class="chain-badge">National Chain</span>';
    } else if (isChainLocation) {
        chainBadge = '<span class="chain-badge">Chain Location</span>';
    } else if (isFromPlaces && business.chain_name) {
        chainBadge = `<span class="chain-badge">Potential ${business.chain_name || 'Chain'} Location</span>`;
    }

    // Create appropriate action button
    let actionButton;

    if (isParentChain) {
        const isAdmin = checkIfUserIsAdmin();
        if (isAdmin) {
            actionButton = `<button class="admin-action-btn" onclick="handleChainBusinessAction('${business._id}', true)">Admin: Edit Chain</button>`;
        } else {
            actionButton = `<button class="view-chain-btn" onclick="viewChainDetails('${business._id}')">View Chain Info</button>`;
        }
    } else if (isGooglePlace) {
        if (isChainLocation) {
            actionButton = `<button class="add-to-db-btn" onclick="addBusinessToDatabase('${business.place_data?.place_id || business.placeId || ''}', '${business.chain_id || ''}')">Add Chain Location</button>`;
        } else {
            actionButton = `<button class="add-to-db-btn" onclick="addBusinessToDatabase('${business.place_data?.place_id || business.placeId || ''}')">Add to Database</button>`;
        }
    } else {
        actionButton = `<button class="view-map-btn" onclick="focusOnMapMarker('${business._id}')">View on Map</button>`;
    }

    // Create the row
    const row = document.createElement('tr');
    row.innerHTML = `
        <th class="left_table" data-business-id="${business._id}">
            ${business.bname} ${chainBadge}
        </th>
        <th class="left_table">${addressLine}</th>
        <th class="left_table">${businessType}</th>
        <th class="right_table" id="incentives-for-${business._id}">
            ${isFromPlaces && !isChainLocation ? 'Not in database yet' : 'Loading incentives...'}
        </th>
        <th class="center_table">${actionButton}</th>
    `;

    tableBody.appendChild(row);

    // Handle incentives lookup
    if (isFromPlaces && isChainLocation) {
        fetchChainIncentivesForPlacesResult(business._id, business.chain_id);
    } else if (!isGooglePlace) {
        fetchBusinessIncentives(business._id, business.chain_id);
    }
}

/**
 * Fetch incentives for a specific business for table display
 * @param {string} businessId - Business ID
 * @param {string} chainId - Optional chain ID
 */
function fetchBusinessIncentives(businessId, chainId = null) {
    if (!businessId) {
        console.error("No business ID provided for fetching incentives");
        return;
    }

    // Determine the base URL
    const baseURL = getBaseURL();

    // Build the API URL with optional chain_id
    let apiURL = `${baseURL}/api/combined-api.js?operation=incentives&business_id=${businessId}`;
    if (chainId) {
        apiURL += `&chain_id=${chainId}`;
    }

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

                    // Add a badge for chain-wide incentives
                    const chainBadge = incentive.is_chain_wide ?
                        '<span class="chain-badge small">Chain-wide</span>' : '';

                    incentivesHTML += `
                        <div class="incentive-item">
                            <strong>${typeLabel}${otherDescription}:</strong> ${incentive.amount}% ${chainBadge}
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
 * Fetch chain incentives for a Google Places result
 * @param {string} placeId - Google Place ID
 * @param {string} chainId - Chain ID in database
 */
function fetchChainIncentivesForPlacesResult(placeId, chainId) {
    if (!placeId || !chainId) {
        console.error("Missing place ID or chain ID for fetching chain incentives");
        return;
    }

    // Determine the base URL
    const baseURL = getBaseURL();

    // Build the API URL to fetch chain incentives
    const apiURL = `${baseURL}/api/combined-api.js?operation=incentives&business_id=${chainId}`;

    console.log("Fetching chain incentives for Places result: ", apiURL);

    fetch(apiURL)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to fetch chain incentives: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log(`Chain incentives data for place ${placeId}:`, data);

            // Find the cell where we'll display incentives
            const incentivesCell = document.getElementById(`incentives-for-${placeId}`);

            if (!incentivesCell) {
                console.error(`Could not find cell for incentives-for-${placeId}`);
                return;
            }

            // Check if there are any chain incentives
            if (!data.results || data.results.length === 0) {
                incentivesCell.innerHTML = 'No chain incentives available';
                return;
            }

            // Build HTML for the chain incentives
            let incentivesHTML = '';

            data.results.forEach(incentive => {
                if (incentive.is_available) {
                    const typeLabel = getIncentiveTypeLabel(incentive.type);
                    const otherDescription = incentive.other_description ?
                        ` (${incentive.other_description})` : '';

                    incentivesHTML += `
                        <div class="incentive-item">
                            <strong>${typeLabel}${otherDescription}:</strong> ${incentive.amount}% 
                            <span class="chain-badge small">Chain-wide</span>
                            <div class="incentive-info">${incentive.information || ''}</div>
                        </div>
                    `;
                }
            });

            if (incentivesHTML === '') {
                incentivesCell.innerHTML = 'Not in database yet';
            } else {
                incentivesCell.innerHTML = incentivesHTML;
            }
        })
        .catch(error => {
            console.error(`Error fetching chain incentives for place ${placeId}:`, error);
            const incentivesCell = document.getElementById(`incentives-for-${placeId}`);

            if (incentivesCell) {
                incentivesCell.innerHTML = 'Not in database yet';
            }
        });
}

/**
 * Check if the current user is an admin
 * @returns {boolean} True if user is admin
 */
function checkIfUserIsAdmin() {
    try {
        // Get session data from localStorage
        const sessionData = localStorage.getItem('patriotThanksSession');
        if (!sessionData) return false;

        const session = JSON.parse(sessionData);

        // Check if user has admin privileges
        return (session.user && (session.user.isAdmin === true || session.user.level === 'Admin'));
    } catch (error) {
        console.error("Error checking admin status:", error);
        return false;
    }
}




// Helper function to perform the actual incentives fetch
function performIncentivesFetch(businessId, incentivesDiv) {
    const baseURL = getBaseURL();
    const apiURL = `${baseURL}/api/combined-api.js?operation=incentives&business_id=${businessId}`;

    console.log("Fetching incentives from:", apiURL);

    fetch(apiURL)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to fetch incentives: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log(`Incentives data for business ${businessId}:`, data);

            // Check if there are any incentives
            if (!data.results || data.results.length === 0) {
                incentivesDiv.innerHTML = '<p><strong>Incentives:</strong> No incentives found</p>';
                return;
            }

            // Build HTML for incentives
            let incentivesHTML = '<p><strong>Incentives:</strong></p><ul style="margin:8px 0; padding-left:20px;">';

            data.results.forEach(incentive => {
                if (incentive.is_available) {
                    const typeLabel = getIncentiveTypeLabel(incentive.type);
                    const otherDescription = incentive.other_description ?
                        ` (${incentive.other_description})` : '';

                    // Add chain badge for chain-wide incentives
                    const chainBadge = incentive.is_chain_wide ?
                        '<span style="display:inline-block; background-color:#4285F4; color:white; padding:1px 4px; border-radius:4px; font-size:0.7em; margin-left:5px;">Chain-wide</span>' :
                        '';

                    incentivesHTML += `
                        <li>
                            <strong>${typeLabel}${otherDescription}:</strong> ${incentive.amount}% ${chainBadge}
                            ${incentive.information ? `<div style="font-size:13px; color:#555; margin-top:2px;">${incentive.information}</div>` : ''}
                        </li>
                    `;
                }
            });

            incentivesHTML += '</ul>';

            if (incentivesHTML === '<p><strong>Incentives:</strong></p><ul style="margin:8px 0; padding-left:20px;"></ul>') {
                incentivesDiv.innerHTML = '<p><strong>Incentives:</strong> No active incentives found</p>';
            } else {
                incentivesDiv.innerHTML = incentivesHTML;
            }
        })
        .catch(error => {
            console.error(`Error fetching incentives for info window: ${error}`);
            incentivesDiv.innerHTML = '<p><strong>Incentives:</strong> Error loading incentives</p>';
        });
}

// Export functions for global access
if (typeof window !== 'undefined') {
    window.retrieveFromMongoDB = retrieveFromMongoDB;
    window.displaySearchResults = displaySearchResults;
    window.displayBusinessesOnMap = displayBusinessesOnMap;
    window.initGoogleMap = initGoogleMap;
    window.debugMapState = debugMapState;
    window.validateField = validateField;
    window.isNotEmpty = isNotEmpty;
}
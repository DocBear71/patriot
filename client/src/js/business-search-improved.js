/**
 * Enhanced business-search-improved.js with improved chain business support
 * Combines the best of both versions with proper error handling
 */

// Configuration constants
// Configuration constants
const CONFIG = {
    mapId: 'ebe8ec43a7bc252d',
    defaultCenter: {lat: 39.8283, lng: -98.5795}, // Center of US
    defaultZoom: 4,
    markerColors: {
        primary: '#EA4335',      // RED - Primary search results (database)
        nearby: '#4285F4',       // BLUE - Google Places results
        database: '#28a745',     // GREEN - Nearby database businesses
        chain: '#FF9800'         // ORANGE - Chain indicators
    },
    geocodeDelay: 200,
    imageLoadDelay: 1000,
    maxNearbyDistance: 20000,
    debugMode: false
};

// State variables
let map = null;
let mapInitialized = false;
let markers = [];
let infoWindow = null;
let bounds = null;
let pendingBusinessesToDisplay = [];
let currentSearchLocation = null;

// Cache for place data and chain matching
const placeCache = new Map();
const chainMatchCache = new Map();
const apiCallQueue = [];
let isProcessingQueue = false;

// Global flags
let googleMapsInitializing = false;
let googleMapsInitialized = false;

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
 * Validate a position object to ensure it has valid coordinates
 * @param {Object} position - Position object to validate
 * @returns {boolean} True if position is valid
 */
function isValidPosition(position) {
    if (!position) return false;

    let lat, lng;
    if (position instanceof google.maps.LatLng) {
        try {
            lat = position.lat();
            lng = position.lng();
        } catch (error) {
            return false;
        }
    } else if (typeof position.lat === 'function' && typeof position.lng === 'function') {
        try {
            lat = position.lat();
            lng = position.lng();
        } catch (error) {
            return false;
        }
    } else if (position.lat !== undefined && position.lng !== undefined) {
        lat = parseFloat(position.lat);
        lng = parseFloat(position.lng);
    } else {
        return false;
    }

    return !isNaN(lat) && !isNaN(lng) && isFinite(lat) && isFinite(lng) &&
        Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

/**
 * Create a safe LatLng object from various position formats
 * @param {Object} position - Position object in various formats
 * @returns {google.maps.LatLng|null} Google LatLng object or null if invalid
 */
function createSafeLatLng(position) {
    if (!position) return null;

    try {
        if (position instanceof google.maps.LatLng) {
            return isValidPosition(position) ? position : null;
        }

        let lat, lng;
        if (typeof position.lat === 'function' && typeof position.lng === 'function') {
            lat = position.lat();
            lng = position.lng();
        } else if (position.lat !== undefined && position.lng !== undefined) {
            lat = parseFloat(position.lat);
            lng = parseFloat(position.lng);
        } else if (Array.isArray(position) && position.length >= 2) {
            lat = parseFloat(position[0]);
            lng = parseFloat(position[1]);
        } else {
            return null;
        }

        if (isNaN(lat) || isNaN(lng) || !isFinite(lat) || !isFinite(lng) ||
            Math.abs(lat) > 90 || Math.abs(lng) > 180) {
            return null;
        }

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
    if (!mapObj || !boundsObj) return false;

    try {
        const ne = boundsObj.getNorthEast();
        const sw = boundsObj.getSouthWest();

        if (!ne || !sw || isNaN(ne.lat()) || isNaN(ne.lng()) ||
            isNaN(sw.lat()) || isNaN(sw.lng()) || boundsObj.isEmpty()) {
            return false;
        }

        mapObj.fitBounds(boundsObj);

        google.maps.event.addListenerOnce(mapObj, 'bounds_changed', function () {
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
            window.initGoogleMapCallback = function () {
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
            script.onerror = function (error) {
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
window.viewBusinessDetails = function (businessId) {
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
                    resolve(userLocation);
                },
                error => reject(error),
                {
                    enableHighAccuracy: true,
                    timeout: 5000,
                    maximumAge: 0
                }
            );
        } else {
            reject(new Error("Geolocation not supported"));
        }
    });
}

/**
 * Get base URL
 */
function getBaseURL() {
    return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? `https://${window.location.host}`
        : window.location.origin;
}

/**
 * Enhanced addBusinessToDatabase function with better user messaging and modern Places API
 * @param {string} placeId - Google Place ID
 * @param {string} chainId - Optional chain ID if this place is part of a chain
 */
window.addBusinessToDatabase = async function (placeId, chainId = null) {
    console.log("Adding place to database:", placeId, "Chain ID:", chainId);

    try {
        // Import the new Places library instead of using deprecated PlacesService
        const {Place} = await google.maps.importLibrary("places");

        // Create a Place instance with the clicked place ID
        const place = new Place({
            id: placeId
        });

        // Fetch place details using the new API
        await place.fetchFields({
            fields: [
                'displayName',
                'formattedAddress',
                'addressComponents',
                'location',
                'nationalPhoneNumber',
                'internationalPhoneNumber'
            ]
        });

        console.log("Place details retrieved with new API:", place);

        // Extract address components
        const addressComponents = {};
        if (place.addressComponents) {
            for (const component of place.addressComponents) {
                for (const type of component.types) {
                    addressComponents[type] = component.shortText || component.longText;
                }
            }
        }

        // Format the business data
        const businessData = {
            name: place.displayName || '',
            address1: (addressComponents.street_number || '') + ' ' + (addressComponents.route || ''),
            city: addressComponents.locality || '',
            state: addressComponents.administrative_area_level_1 || '',
            zip: addressComponents.postal_code || '',
            phone: place.nationalPhoneNumber || place.internationalPhoneNumber || '',
            placeId: place.id,
            formattedAddress: place.formattedAddress,

            // Store coordinates for later use
            lat: place.location?.lat() || 0,
            lng: place.location?.lng() || 0,

            // Add this for proper GeoJSON formatting
            location: {
                type: 'Point',
                coordinates: [
                    place.location?.lng() || 0,
                    place.location?.lat() || 0
                ]
            }
        };

        // Enhanced messaging for chain locations
        let redirectMessage = '';
        let chainMessage = '';

        if (chainId) {
            try {
                // Get chain name from the server
                const chain = await getChainDetails(chainId);
                if (chain && chain.bname) {
                    businessData.chain_name = chain.bname;
                    chainMessage = `This business will be added as a location of ${chain.bname}. Chain-wide incentives already apply to this location.`;
                } else {
                    chainMessage = "This business will be added as a chain location. Chain-wide incentives may apply.";
                }
            } catch (error) {
                console.error("Error getting chain details:", error);
                chainMessage = "This business will be added as a chain location.";
            }
        }

        // Enhanced redirect messaging
        redirectMessage = `
${chainMessage ? chainMessage + '\n\n' : ''}You will now be redirected to the "Add Business" page where the form will be pre-filled with this business information.

After you complete adding the business, you will be returned to this search page.

Click OK to continue.`;

        // Show enhanced alert with better messaging
        if (confirm(redirectMessage)) {
            // Store in sessionStorage for the add business page to use
            sessionStorage.setItem('newBusinessData', JSON.stringify(businessData));

            // Store return URL for after business is added
            sessionStorage.setItem('returnToSearch', window.location.href);

            // Redirect to add business page
            window.location.href = 'business-add.html?prefill=true';
        }

    } catch (error) {
        console.error("Error in addBusinessToDatabase:", error);
        alert("Sorry, we couldn't retrieve the business information. Please try again or add it manually.");
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
        findBusiness.addEventListener('submit', async function (event) {
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
                ensureGoogleMapsInitialized().then(async () => {
                    // Clear existing map markers
                    clearMarkers();
                    // Submit the data to MongoDB
                    await performEnhancedBusinessSearch(formData, false);
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
                await performEnhancedBusinessSearch(formData, false);
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
    refreshButton.addEventListener('click', async function () {
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
        await performEnhancedBusinessSearch(formData, false);

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
    const businessId = urlParams.get('business_id');

    if (newBusinessAdded === 'true' && businessName) {
        // Show enhanced success message
        showBusinessAddedSuccessMessage(businessName, businessId);

        // Clean up URL parameters
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);

        // Pre-fill search form with the business name (but no address to get all locations)
        const businessNameField = document.getElementById('business-name');
        const addressField = document.getElementById('address');

        if (businessNameField) {
            businessNameField.value = businessName;
            validateField(businessNameField, isNotEmpty);
        }

        // IMPORTANT: Clear the address field to search for all locations of this business
        if (addressField) {
            addressField.value = '';
        }

        // Automatically trigger search after a short delay
        setTimeout(() => {
            const searchForm = document.getElementById('business-search-form');
            if (searchForm) {
                const submitEvent = new Event('submit', {cancelable: true});
                searchForm.dispatchEvent(submitEvent);
            }
        }, 1000);
    }
}

/**
 * Search Google Places for a specific business name near a location
 * @param {string} businessName - Name of business to search for
 * @param {Object} searchLocation - Location to search around
 * @returns {Promise<Array>} Array of business objects
 */
async function searchGooglePlacesForBusiness(businessName, searchLocation) {
    try {
        console.log("Searching Google Places (new API) for:", businessName, "near", searchLocation);

        // Import the new Places library
        const {Place, SearchNearbyRequest} = await google.maps.importLibrary("places");

        // Create search location
        const center = new google.maps.LatLng(searchLocation.lat, searchLocation.lng);

        // Create a text search request using the new API
        const request = {
            textQuery: businessName,
            locationBias: {
                center: center,
                radius: 40000 // 40km radius
            },
            maxResultCount: 20,
            // Specify the fields we need
            fields: [
                'id',
                'displayName',
                'formattedAddress',
                'location',
                'types',
                'nationalPhoneNumber',
                'internationalPhoneNumber'
            ]
        };

        console.log("New Places API request:", request);

        // Perform text search using the new API
        const {places} = await Place.searchByText(request);

        if (!places || places.length === 0) {
            console.log("No businesses found via new Places API");
            return [];
        }

        console.log("Found businesses via new Places API:", places.length);

        // FILTER OUT UNWANTED RESULTS
        const filteredResults = places.filter(place => {
            const name = place.displayName.toLowerCase();

            // Skip department-specific results
            if (name.includes('pro desk') ||
                name.includes('garden center') ||
                name.includes('rental center') ||
                name.includes('tool rental') ||
                name.includes('customer service')) {
                console.log("Filtering out department:", place.displayName);
                return false;
            }

            // Skip if it has weird formatting that suggests it's not a main store
            if (name.includes(' - ') && !name.toLowerCase().startsWith(businessName.toLowerCase())) {
                console.log("Filtering out formatted result:", place.displayName);
                return false;
            }

            return true;
        });

        console.log(`Filtered to ${filteredResults.length} main store results`);

        // Process results and create business objects
        const businessPromises = filteredResults.map(async (place) => {
            // Extract address components
            const addressParts = place.formattedAddress ? place.formattedAddress.split(',') : [];
            let address1 = '';
            let city = '';
            let state = '';
            let zip = '';

            if (addressParts.length >= 1) address1 = addressParts[0].trim();
            if (addressParts.length >= 2) city = addressParts[1].trim();
            if (addressParts.length >= 3) {
                const stateZipMatch = addressParts[2].trim().match(/^([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/);
                if (stateZipMatch) {
                    state = stateZipMatch[1];
                    zip = stateZipMatch[2];
                }
            }

            // Calculate distance from search center
            const placeLatLng = place.location;
            const distance = google.maps.geometry.spherical.computeDistanceBetween(center, placeLatLng);

            // Extract coordinates safely
            let lat = 0, lng = 0;
            if (place.location) {
                try {
                    lat = typeof place.location.lat === 'function' ? place.location.lat() : place.location.lat || 0;
                    lng = typeof place.location.lng === 'function' ? place.location.lng() : place.location.lng || 0;
                } catch (coordError) {
                    console.warn("Error extracting coordinates from new Places API:", coordError);
                    lat = searchLocation.lat; // Fallback
                    lng = searchLocation.lng;
                }
            }

            // Create base business object
            const business = {
                _id: 'google_' + place.id,
                bname: place.displayName,
                address1: address1,
                city: city,
                state: state,
                zip: zip,
                formattedAddress: place.formattedAddress,
                type: mapGooglePlaceTypeToBusinessType(place.types),
                phone: place.nationalPhoneNumber || place.internationalPhoneNumber || '',
                isGooglePlace: true,
                placeId: place.id,
                lat: lat,
                lng: lng,
                distance: distance
            };

            // ENHANCED CHAIN MATCHING
            try {
                const chainMatch = await findMatchingChainForPlaceResult(place.displayName);
                if (chainMatch) {
                    console.log(`Found chain match for "${place.displayName}": ${chainMatch.bname}`);
                    business.chain_id = chainMatch._id;
                    business.chain_name = chainMatch.bname;
                    business.isChainLocation = true;
                } else {
                    console.log(`No chain match found for: ${place.displayName}`);
                }
            } catch (error) {
                console.warn("Error checking for chain match:", error);
            }

            return business;
        });

        // Wait for all chain matching to complete
        const businesses = await Promise.all(businessPromises);

        // Sort by distance
        businesses.sort((a, b) => a.distance - b.distance);

        console.log("Final processed businesses with new API:", businesses.map(b => ({
            name: b.bname,
            placeId: b.placeId,
            isChain: !!b.chain_id,
            chainName: b.chain_name
        })));

        return businesses;

    } catch (error) {
        console.error("Error in new Places API search:", error);

        // Fallback to old API if new one fails
        console.warn("Falling back to deprecated PlacesService API");
        return await searchGooglePlacesForBusinessLegacy(businessName, searchLocation);
    }
}

async function searchGooglePlacesForBusinessLegacy(businessName, searchLocation) {
    return new Promise((resolve, reject) => {
        try {
            console.log("Using legacy PlacesService as fallback");

            if (!map) {
                reject(new Error("Map not initialized"));
                return;
            }

            const latlng = new google.maps.LatLng(searchLocation.lat, searchLocation.lng);
            const service = new google.maps.places.PlacesService(map);

            const request = {
                query: businessName,
                location: latlng,
                radius: 40000
            };

            service.textSearch(request, async (results, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
                    // Same filtering and processing logic as before
                    const filteredResults = results.filter(place => {
                        const name = place.name.toLowerCase();
                        return !name.includes('pro desk') &&
                            !name.includes('garden center') &&
                            !name.includes('rental center');
                    });

                    const businesses = await Promise.all(filteredResults.map(async (place) => {
                        // Same processing logic as the new API version
                        const business = {
                            _id: 'google_' + place.place_id,
                            bname: place.name,
                            // ... rest of the processing
                            isGooglePlace: true,
                            placeId: place.place_id,
                            lat: place.geometry.location.lat(),
                            lng: place.geometry.location.lng(),
                        };

                        // Chain matching
                        const chainMatch = await findMatchingChainForPlaceResult(place.name);
                        if (chainMatch) {
                            business.chain_id = chainMatch._id;
                            business.chain_name = chainMatch.bname;
                            business.isChainLocation = true;
                        }

                        return business;
                    }));

                    resolve(businesses);
                } else {
                    console.log("Legacy API also found no results");
                    resolve([]);
                }
            });
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Enhanced displayBusinessesOnMap to handle distant markers better
 */
function displayBusinessesOnMap(businesses) {
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
    let nearbyMarkers = 0;
    let skippedBusinesses = 0;

    // Process each business
    businesses.forEach(business => {
        try {
            console.log("Processing business for map:", business.bname);

            // CRITICAL FIX: Skip parent chain businesses (no physical location)
            if (business.is_chain === true) {
                console.log(`Skipping parent chain business: ${business.bname} (no physical location)`);
                skippedBusinesses++;
                return;
            }

            // Handle different coordinate formats
            let lat, lng;

            if (business.location && business.location.coordinates &&
                Array.isArray(business.location.coordinates) && business.location.coordinates.length >= 2) {
                lng = business.location.coordinates[0];
                lat = business.location.coordinates[1];
            } else if (business.lat !== undefined && business.lng !== undefined) {
                lat = parseFloat(business.lat);
                lng = parseFloat(business.lng);
            } else {
                console.warn(`Business ${business.bname} missing coordinates`);
                skippedBusinesses++;
                return;
            }

            // Enhanced coordinate validation
            if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
                console.warn(`Invalid coordinates for ${business.bname}: lat=${lat}, lng=${lng}`);
                skippedBusinesses++;
                return;
            }

            // Validate coordinate ranges
            if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
                console.warn(`Coordinates out of range for ${business.bname}: lat=${lat}, lng=${lng}`);
                skippedBusinesses++;
                return;
            }

            // Update business object with coordinates
            business.lat = lat;
            business.lng = lng;

            // Create marker
            const marker = createBusinessMarker(business);
            if (marker) {
                validMarkers++;

                // Check if this business is near the search location
                if (window.currentSearchLocation) {
                    const businessLatLng = new google.maps.LatLng(lat, lng);
                    const searchLatLng = new google.maps.LatLng(
                        window.currentSearchLocation.lat,
                        window.currentSearchLocation.lng
                    );

                    const distance = google.maps.geometry.spherical.computeDistanceBetween(
                        businessLatLng,
                        searchLatLng
                    );

                    // If within 50 miles of search location, count as nearby
                    if (distance <= 80467) { // 50 miles in meters
                        nearbyMarkers++;
                        console.log(`${business.bname} is ${(distance * 0.000621371).toFixed(1)} miles from search location`);
                    } else {
                        console.log(`${business.bname} is ${(distance * 0.000621371).toFixed(1)} miles from search location (distant)`);
                    }
                }

                // ALWAYS extend bounds to include this marker
                const position = new google.maps.LatLng(lat, lng);
                bounds.extend(position);
            }
        } catch (error) {
            console.error(`Error adding business ${business.bname} to map:`, error);
            skippedBusinesses++;
        }
    });

    console.log(`Added ${validMarkers} valid markers to the map (${nearbyMarkers} nearby, ${skippedBusinesses} skipped)`);

    // IMPROVED MAP CENTERING LOGIC
    setTimeout(() => {
        try {
            // Priority 1: If we have a search location and nearby businesses, center on search location
            if (window.currentSearchLocation && nearbyMarkers > 0) {
                console.log("Centering map on search location with nearby businesses");

                const searchLatLng = new google.maps.LatLng(
                    window.currentSearchLocation.lat,
                    window.currentSearchLocation.lng
                );

                map.setCenter(searchLatLng);
                map.setZoom(12); // City level zoom
            }
            // Priority 2: If we have search location but only distant businesses, still center on search location
            else if (window.currentSearchLocation && validMarkers > 0) {
                console.log("Centering map on search location (distant businesses only)");

                const searchLatLng = new google.maps.LatLng(
                    window.currentSearchLocation.lat,
                    window.currentSearchLocation.lng
                );

                map.setCenter(searchLatLng);
                map.setZoom(10); // Regional zoom to potentially see distant markers
            }
            // Priority 3: If no search location but we have businesses, fit to bounds
            else if (validMarkers > 0 && bounds && !bounds.isEmpty()) {
                console.log("No search location, fitting map to business bounds");
                safelyFitBounds(map, bounds);
            }
            // Priority 4: Default fallback
            else {
                console.log("Using default map center (no valid businesses to display)");
                map.setCenter(CONFIG.defaultCenter);
                map.setZoom(CONFIG.defaultZoom);
            }
        } catch (error) {
            console.error("Error updating map view:", error);
        }
    }, 200);
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
 * Safely extract coordinates from various Google Maps objects
 * @param {Object} locationObj - Location object (could be LatLng, Place.location, etc.)
 * @returns {Object} Object with lat and lng properties, or null if invalid
 */
function safeExtractCoordinates(locationObj) {
    try {
        if (!locationObj) {
            return null;
        }

        let lat, lng;

        // Handle Google Maps LatLng objects
        if (typeof locationObj.lat === 'function' && typeof locationObj.lng === 'function') {
            lat = locationObj.lat();
            lng = locationObj.lng();
        }
        // Handle plain objects with lat/lng properties
        else if (locationObj.lat !== undefined && locationObj.lng !== undefined) {
            lat = parseFloat(locationObj.lat);
            lng = parseFloat(locationObj.lng);
        }
        // Handle latitude/longitude properties
        else if (locationObj.latitude !== undefined && locationObj.longitude !== undefined) {
            lat = parseFloat(locationObj.latitude);
            lng = parseFloat(locationObj.longitude);
        }
        // Handle arrays [lat, lng]
        else if (Array.isArray(locationObj) && locationObj.length >= 2) {
            lat = parseFloat(locationObj[0]);
            lng = parseFloat(locationObj[1]);
        } else {
            console.warn("Unrecognized location object format:", locationObj);
            return null;
        }

        // Validate the extracted coordinates
        if (isNaN(lat) || isNaN(lng) || !isFinite(lat) || !isFinite(lng)) {
            console.warn("Invalid coordinates extracted:", lat, lng);
            return null;
        }

        // Check coordinate ranges
        if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
            console.warn("Coordinates out of valid range:", lat, lng);
            return null;
        }

        return {lat: lat, lng: lng};
    } catch (error) {
        console.error("Error extracting coordinates:", error);
        return null;
    }
}

/**
 * Fixed showInfoWindow function with safe coordinate handling
 * @param {Object} marker - The marker that was clicked
 */
function showInfoWindow(marker) {
    console.log("showInfoWindow called with marker:", marker);

    if (!marker || !marker.business) {
        console.error("Invalid marker for info window", marker);
        return;
    }

    const business = marker.business;
    console.log("Business data for info window:", business);

    // Close any existing info window
    if (infoWindow) {
        infoWindow.close();
    }

    // Create new info window with minimal configuration
    infoWindow = new google.maps.InfoWindow({
        maxWidth: 300,
        disableAutoPan: false
    });

    // Build the content
    const content = buildInfoWindowContent(business);

    // Set content
    infoWindow.setContent(content);

    // Get marker position safely
    let position = null;

    // Try to get position from marker first
    if (marker.getPosition && typeof marker.getPosition === 'function') {
        try {
            position = marker.getPosition();
        } catch (error) {
            console.warn("Error getting position from marker.getPosition():", error);
        }
    }

    // Fallback to marker.position property
    if (!position && marker.position) {
        position = marker.position;
    }

    // Fallback to business coordinates
    if (!position && business) {
        const coords = safeExtractCoordinates(business);
        if (coords) {
            position = new google.maps.LatLng(coords.lat, coords.lng);
        }
    }

    // Final fallback - use a default position if we still don't have one
    if (!position) {
        console.error("Could not determine position for info window");
        position = new google.maps.LatLng(39.8283, -98.5795); // Center of US
    }

    // Validate the position before using it
    const validatedCoords = safeExtractCoordinates(position);
    if (!validatedCoords) {
        console.error("Invalid position for info window");
        return;
    }

    // Create a safe LatLng object
    const safePosition = new google.maps.LatLng(validatedCoords.lat, validatedCoords.lng);

    // Pan to position first
    try {
        map.panTo(safePosition);
    } catch (panError) {
        console.warn("Error panning to position:", panError);
        // Continue anyway
    }

    // Wait a moment then open the info window
    setTimeout(() => {
        try {
            // Try to open on the marker first
            if (marker.getPosition) {
                infoWindow.open(map, marker);
            } else {
                // Open at the position
                infoWindow.setPosition(safePosition);
                infoWindow.open(map);
            }

            console.log("Info window opened successfully");

            // Apply positioning fix after DOM is ready
            google.maps.event.addListenerOnce(infoWindow, 'domready', function () {
                console.log("Info window DOM ready");

                // Wait longer for Google to finish its initial rendering
                setTimeout(() => {
                    fixInfoWindowPositioning();

                    // Load incentives if this is a database business
                    if (!business.isGooglePlace) {
                        setTimeout(() => {
                            loadIncentivesForInfoWindow(business._id);
                        }, 200);
                    } else if (business.chain_id) {
                        setTimeout(() => {
                            loadChainIncentivesForInfoWindow(business.placeId, business.chain_id);
                        }, 200);
                    }
                }, 300);
            });

        } catch (error) {
            console.error("Error opening info window:", error);
        }
    }, 200);
}

/**
 * Enhanced error handling wrapper for critical functions
 * @param {Function} func - Function to wrap
 * @param {string} funcName - Name of the function for logging
 * @returns {Function} Wrapped function with error handling
 */
function withErrorHandling(func, funcName) {
    return function (...args) {
        try {
            return func.apply(this, args);
        } catch (error) {
            console.error(`Error in ${funcName}:`, error);
            // Don't re-throw, just log and continue
            return null;
        }
    };
}

/**
 * Fix info window positioning issues
 */
function fixInfoWindowPositioning() {
    console.log("Applying info window positioning fix");

    // Find the info window elements
    const iwContainer = document.querySelector('.gm-style-iw-c');
    const iwContent = document.querySelector('.gm-style-iw-d');
    const iwTail = document.querySelector('.gm-style-iw-t');

    if (!iwContainer) {
        console.log("Info window container not found");
        return;
    }

    // Check current position and dimensions
    const rect = iwContainer.getBoundingClientRect();
    console.log("Info window position:", rect);

    // If width is too small (like 1px), force proper dimensions
    if (rect.width < 50) {
        console.log("Info window width too small, forcing proper dimensions");

        // Remove any width restrictions
        iwContainer.style.width = 'auto';
        iwContainer.style.minWidth = '280px';
        iwContainer.style.maxWidth = '320px';

        if (iwContent) {
            iwContent.style.width = 'auto';
            iwContent.style.minWidth = '280px';
        }
    }

    // Fix positioning issues
    if (rect.top < 0 || rect.top > window.innerHeight || rect.left < 0 || rect.left > window.innerWidth || rect.width < 50) {
        console.log("Info window has positioning/sizing issues, applying comprehensive fix");

        // Don't remove transform completely, just fix problematic values
        const currentTransform = iwContainer.style.transform;
        if (currentTransform && currentTransform.includes('translate')) {
            console.log("Current transform:", currentTransform);
            // Only reset if transform is causing issues
            const transformMatch = currentTransform.match(/translate\(([^,]+),\s*([^)]+)\)/);
            if (transformMatch) {
                const translateX = parseFloat(transformMatch[1]);
                const translateY = parseFloat(transformMatch[2]);

                // If translation is extreme, reset it
                if (Math.abs(translateX) > window.innerWidth || Math.abs(translateY) > window.innerHeight) {
                    console.log("Resetting extreme transform values");
                    iwContainer.style.transform = 'translate(0px, 0px)';
                }
            }
        }

        // Ensure proper display properties
        iwContainer.style.display = 'block';
        iwContainer.style.visibility = 'visible';
        iwContainer.style.opacity = '1';

        // Fix the tail positioning if it exists
        if (iwTail) {
            iwTail.style.bottom = '0px';
            iwTail.style.left = '50%';
            iwTail.style.right = 'auto';
            iwTail.style.transform = 'translateX(-50%)';
        }

        console.log("Applied comprehensive positioning fix");

        // Trigger a resize to force re-rendering
        setTimeout(() => {
            google.maps.event.trigger(map, 'resize');
            const newRect = iwContainer.getBoundingClientRect();
            console.log("Info window dimensions after fix:", newRect);
        }, 100);
    }
}

/**
 * Load incentives for a database business
 * @param {string} businessId - Business ID
 */
function loadIncentivesForInfoWindow(businessId) {
    const container = document.getElementById(`incentives-container-${businessId}`);
    if (!container) {
        console.error("Incentives container not found for business:", businessId);
        return;
    }

    const baseURL = getBaseURL();
    const apiURL = `${baseURL}/api/combined-api.js?operation=incentives&business_id=${businessId}`;

    fetch(apiURL)
        .then(response => response.json())
        .then(data => {
            if (!data.results || data.results.length === 0) {
                container.innerHTML = '<p style="margin:4px 0; font-style:italic; color:#666;">No incentives available</p>';
                return;
            }

            let incentivesHTML = '<p style="margin:4px 0;"><strong>Incentives:</strong></p><ul style="margin:4px 0; padding-left:16px; font-size:13px;">';

            data.results.forEach(incentive => {
                if (incentive.is_available) {
                    const typeLabel = getIncentiveTypeLabel(incentive.type);
                    const otherDescription = incentive.other_description ? ` (${incentive.other_description})` : '';
                    const chainBadge = incentive.is_chain_wide ?
                        '<span style="background-color:#4285F4; color:white; padding:1px 4px; border-radius:3px; font-size:11px; margin-left:4px;">Chain-wide</span>' : '';

                    incentivesHTML += `<li style="margin-bottom:4px;"><strong>${typeLabel}${otherDescription}:</strong> ${incentive.amount}% ${chainBadge}</li>`;
                }
            });

            incentivesHTML += '</ul>';
            container.innerHTML = incentivesHTML;
        })
        .catch(error => {
            console.error("Error loading incentives:", error);
            container.innerHTML = '<p style="margin:4px 0; font-style:italic; color:#666;">Error loading incentives</p>';
        });
}

/**
 * Load chain incentives for a Google Places result
 * @param {string} placeId - Google Place ID
 * @param {string} chainId - Chain ID
 */
function loadChainIncentivesForInfoWindow(placeId, chainId) {
    const container = document.getElementById(`incentives-container-${placeId}`);
    if (!container) {
        console.error("Incentives container not found for place:", placeId);
        return;
    }

    const baseURL = getBaseURL();
    const apiURL = `${baseURL}/api/combined-api.js?operation=incentives&business_id=${chainId}`;

    fetch(apiURL)
        .then(response => response.json())
        .then(data => {
            if (!data.results || data.results.length === 0) {
                container.innerHTML = '<p style="margin:4px 0; font-style:italic; color:#666;">No chain incentives available</p>';
                return;
            }

            let incentivesHTML = '<p style="margin:4px 0;"><strong>Chain Incentives:</strong></p><ul style="margin:4px 0; padding-left:16px; font-size:13px;">';

            data.results.forEach(incentive => {
                if (incentive.is_available) {
                    const typeLabel = getIncentiveTypeLabel(incentive.type);
                    const otherDescription = incentive.other_description ? ` (${incentive.other_description})` : '';

                    incentivesHTML += `<li style="margin-bottom:4px;"><strong>${typeLabel}${otherDescription}:</strong> ${incentive.amount}% <span style="background-color:#4285F4; color:white; padding:1px 4px; border-radius:3px; font-size:11px; margin-left:4px;">Chain-wide</span></li>`;
                }
            });

            incentivesHTML += '</ul>';
            incentivesHTML += '<p style="margin:8px 0 4px 0; font-size:12px; font-style:italic; color:#666;">These incentives apply to all locations of this chain.</p>';

            container.innerHTML = incentivesHTML;
        })
        .catch(error => {
            console.error("Error loading chain incentives:", error);
            container.innerHTML = '<p style="margin:4px 0; font-style:italic; color:#666;">Error loading chain incentives</p>';
        });
}

/**
 * Apply CSS fixes for info windows
 */
function applyInfoWindowCSS() {
    if (!document.getElementById('info-window-fix-css')) {
        const style = document.createElement('style');
        style.id = 'info-window-fix-css';
        style.textContent = `
            /* Ensure info windows are visible and properly positioned */
            .gm-style .gm-style-iw-c {
                max-width: 320px !important;
                max-height: 400px !important;
                padding: 0 !important;
                border-radius: 8px !important;
                box-shadow: 0 2px 7px 1px rgba(0,0,0,0.3) !important;
                overflow: hidden !important;
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

            /* Fix tail positioning */
            .gm-style .gm-style-iw-t {
                bottom: 0px !important;
                left: 50% !important;
                right: auto !important;
                transform: translateX(-50%) !important;
                width: 20px !important;
                height: 15px !important;
            }

            /* Ensure close button is visible */
            .gm-ui-hover-effect {
                opacity: 0.8 !important;
                top: 2px !important;
                right: 2px !important;
            }

            .gm-ui-hover-effect:hover {
                opacity: 1 !important;
            }

            /* Custom scrollbar for info window content */
            .gm-style .gm-style-iw-d::-webkit-scrollbar {
                width: 6px;
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
        `;
        document.head.appendChild(style);
        console.log("Applied info window CSS fixes");
    }
}

function applyCSSOnlyTailFix() {
    if (!document.getElementById('css-only-tail-fix')) {
        const style = document.createElement('style');
        style.id = 'css-only-tail-fix';
        style.textContent = `
            /* Target only the tail positioning without affecting the container */
            .gm-style .gm-style-iw-t {
                bottom: 0px !important;
                left: 0px !important;
                right: 0px !important;
                transform: translateX(-50%) !important;
                width: 0 !important;
                height: 0 !important;
            }
            
            /* Don't touch the main container transform */
            .gm-style .gm-style-iw-c {
                /* Let Google handle the main positioning */
            }
        `;
        document.head.appendChild(style);
        console.log("Applied CSS-only tail fix");
    }
}

// Remove any existing aggressive CSS that might be hiding things
function removeAggressiveCSS() {
    const stylesToRemove = [
        'final-info-window-fix',
        'info-window-position-fix',
        'minimal-info-window-fix'
    ];

    stylesToRemove.forEach(id => {
        const existingStyle = document.getElementById(id);
        if (existingStyle) {
            console.log("Removing potentially problematic CSS:", id);
            existingStyle.remove();
        }
    });
}

// Apply only the most basic CSS to ensure visibility
function applyBasicInfoWindowCSS() {
    if (!document.getElementById('basic-info-window-css')) {
        const style = document.createElement('style');
        style.id = 'basic-info-window-css';
        style.textContent = `
            /* Very basic CSS - just ensure visibility */
            .gm-style .gm-style-iw-c {
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
            }
            
            .gm-style .gm-style-iw {
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
            }
            
            /* Map height fix */
            #map-container {
                width: 90%;
                margin: 20px auto;
                clear: both;
                position: relative;
            }

            #map {
                width: 100%;
                height: 800px !important;
                min-height: 800px;
                border: 1px solid #ccc;
                border-radius: 4px;
                margin: 10px 0;
                position: relative;
                z-index: 1;
            }
        `;
        document.head.appendChild(style);
        console.log("Applied basic info window CSS");
    }
}

// Enhanced CSS to prevent the positioning issues
function applyInfoWindowPositioningFixes() {
    if (!document.getElementById('final-info-window-fix')) {
        const style = document.createElement('style');
        style.id = 'final-info-window-fix';
        style.textContent = `
            /* CRITICAL: Override Google's tail positioning that causes off-screen issues */
            ..gm-style .gm-style-iw-t {
                bottom: 0px !important;
                left: 0px !important;
                right: 0px !important;
                transform: translateX(-50%) !important;
                width: 0 !important;
                height: 0 !important;
            }
            
            /* Prevent off-screen positioning */
            .gm-style .gm-style-iw-c {
                max-width: 320px !important;
                max-height: 400px !important;
                overflow: hidden !important;
                /* Prevent problematic transforms */
                transform: none !important;
            }
            
            /* Ensure visibility */
            .gm-style .gm-style-iw {
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
            }
            
            .gm-style .gm-style-iw-d {
                overflow: auto !important;
                max-height: 350px !important;
            }
            
            /* Fix tail connector */
            .gm-style .gm-style-iw-tc {
                top: auto !important;
                bottom: -15px !important;
                left: 50% !important;
                right: auto !important;
                transform: translateX(-50%) !important;
            }
            
            /* Map container styles */
            #map-container {
                width: 90%;
                margin: 20px auto;
                clear: both;
                position: relative;
            }

            #map {
                width: 100%;
                height: 800px !important;
                min-height: 800px;
                border: 1px solid #ccc;
                border-radius: 4px;
                margin: 10px 0;
                position: relative;
                z-index: 1;
            }
        `;
        document.head.appendChild(style);
        console.log("Applied final info window positioning fixes");
    }
}

/**
 * FINAL: Enhanced address key creation
 */
function createEnhancedAddressKey(business) {
    const parts = [];
    if (business.address1) parts.push(business.address1.toLowerCase().trim());
    if (business.city) parts.push(business.city.toLowerCase().trim());
    if (business.state) parts.push(business.state.toLowerCase().trim());
    if (business.placeId) parts.push(`place_${business.placeId}`);
    if (business._id && !business._id.startsWith('google_')) parts.push(`db_${business._id}`);
    return parts.join('|');
}

/**
 * FINAL: Enhanced business name key for chains
 */
function createBusinessNameKey(business) {
    if (business.isChainLocation || business.chain_id) {
        const addressPart = business.address1 ? business.address1.toLowerCase().replace(/\d+/g, '').trim() : '';
        return `${business.bname.toLowerCase().trim()}_${addressPart}`;
    }
    return business.bname.toLowerCase().trim();
}

/**
 * FINAL: Fixed categorization with proper duplicate detection
 */
function categorizeResultsWithFixedDuplicateDetection(primaryResults, placesResults, nearbyDatabaseBusinesses) {
    const finalPrimaryResults = [...primaryResults];
    const usedAddresses = new Set();
    const usedBusinessNames = new Set();

    // Track primary results
    finalPrimaryResults.forEach(business => {
        const addressKey = createEnhancedAddressKey(business);
        const nameKey = createBusinessNameKey(business);
        usedAddresses.add(addressKey);
        usedBusinessNames.add(nameKey);
    });

    // Filter Places results
    const finalPlacesResults = placesResults.filter(business => {
        const addressKey = createEnhancedAddressKey(business);
        const nameKey = createBusinessNameKey(business);

        if (usedAddresses.has(addressKey) || usedBusinessNames.has(nameKey)) {
            return false;
        }

        usedAddresses.add(addressKey);
        usedBusinessNames.add(nameKey);
        return true;
    });

    // Filter nearby results
    const finalNearbyResults = nearbyDatabaseBusinesses.filter(business => {
        const addressKey = createEnhancedAddressKey(business);
        const nameKey = createBusinessNameKey(business);
        return !usedAddresses.has(addressKey) && !usedBusinessNames.has(nameKey);
    });

    return { finalPrimaryResults, finalPlacesResults, finalNearbyResults };
}

/**
 * Enhanced fetchBusinessIncentivesForInfoWindow function with better error handling
 * @param {string} businessId - Business ID
 */
function fetchBusinessIncentivesForInfoWindow(businessId) {
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
                        const chainBadge = incentive.is_chain_wide ?
                            '<span style="display:inline-block; background-color:#4285F4; color:white; padding:1px 4px; border-radius:4px; font-size:0.7em; margin-left:5px;">Chain-wide</span>' : '';
                        incentivesHTML += `<li><strong>${typeLabel}${otherDescription}:</strong> ${incentive.amount}% ${chainBadge}</li>`;
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
 * Fixed findMatchingChainLocally function (was missing)
 * @param {string} placeName - Name of the place to match with chains
 * @returns {Promise<Object|null>} - Matching chain or null if no match
 */
function findMatchingChainLocally(placeName) {
    return new Promise((resolve) => {
        try {
            if (!placeName) {
                resolve(null);
                return;
            }

            console.log("Enhanced local chain matching for:", placeName);

            // Enhanced chain database with more variations
            const commonChains = [
                {
                    name: 'The Home Depot',
                    variations: ['the home depot', 'home depot', 'homedepot'],
                    id: '681fe0e67d92c3d3e1e2a3da' // Your actual chain ID from the logs
                },
                {
                    name: 'Lowe\'s',
                    variations: ['lowes', 'lowe\'s', 'lowes home improvement', 'lowe\'s home improvement'],
                    id: 'lowes_chain_id'
                },
                {
                    name: 'Walmart',
                    variations: ['walmart', 'wal-mart', 'walmart supercenter'],
                    id: 'walmart_chain_id'
                },
                {
                    name: 'Target',
                    variations: ['target', 'target store'],
                    id: 'target_chain_id'
                },
                {
                    name: 'Best Buy',
                    variations: ['best buy', 'bestbuy'],
                    id: 'bestbuy_chain_id'
                },
                {
                    name: 'McDonald\'s',
                    variations: ['mcdonalds', 'mcdonald\'s', 'mickey d\'s'],
                    id: 'mcdonalds_chain_id'
                }
            ];

            const lowerPlaceName = placeName.toLowerCase().trim();

            for (const chain of commonChains) {
                for (const variation of chain.variations) {
                    // Check for exact match or if place name contains the variation
                    if (lowerPlaceName === variation ||
                        lowerPlaceName.includes(variation) ||
                        variation.includes(lowerPlaceName)) {

                        console.log(`Enhanced local match: "${placeName}" matches "${chain.name}"`);
                        resolve({
                            _id: chain.id,
                            bname: chain.name,
                            isLocalMatch: true
                        });
                        return;
                    }
                }
            }

            console.log("No enhanced local chain match found for:", placeName);
            resolve(null);
        } catch (error) {
            console.error("Error in enhanced local chain matching:", error);
            resolve(null);
        }
    });
}

/**
 * Fixed setupMapClickHandler function with proper error handling
 */
async function setupMapClickHandler() {
    if (!map) {
        console.error("Map not initialized in setupMapClickHandler");
        return;
    }

    console.log("Setting up map click handler");

    try {
        // Import the Places library
        const {Place} = await google.maps.importLibrary("places");

        // Listen for POI clicks
        map.addListener('click', async function (event) {
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
                        showEnhancedInfoWindow(existingMarker);
                        return;
                    }

                    // Create a Place instance with the clicked place ID
                    const place = new Place({
                        id: event.placeId
                    });

                    // Fetch place details with correct field names
                    await place.fetchFields({
                        fields: [
                            'displayName',
                            'formattedAddress',
                            'addressComponents',
                            'location',
                            'types',
                            'businessStatus',
                            'nationalPhoneNumber',
                            'internationalPhoneNumber'
                        ]
                    });

                    console.log("Place details:", place);

                    // Extract business name safely
                    const businessName = place.displayName || 'Unknown Business';

                    // Parse address components properly
                    let address1 = '';
                    let city = '';
                    let state = '';
                    let zip = '';
                    let phone = '';

                    // Extract phone number - FIXED: removed formattedPhoneNumber
                    phone = place.nationalPhoneNumber || place.internationalPhoneNumber || '';

                    // Parse address components if available
                    if (place.addressComponents && place.addressComponents.length > 0) {
                        console.log("Parsing address components:", place.addressComponents);

                        // Extract components using the same logic as addBusinessToDatabase
                        const streetNumber = getAddressComponent(place.addressComponents, 'street_number');
                        const route = getAddressComponent(place.addressComponents, 'route');
                        city = getAddressComponent(place.addressComponents, 'locality');
                        state = getAddressComponent(place.addressComponents, 'administrative_area_level_1');
                        zip = getAddressComponent(place.addressComponents, 'postal_code');

                        // Combine street number and route for address1
                        if (streetNumber && route) {
                            address1 = `${streetNumber} ${route}`;
                        } else if (route) {
                            address1 = route;
                        } else if (streetNumber) {
                            address1 = streetNumber;
                        }
                    }

                    // Fallback: if we couldn't parse components, parse the formatted address
                    if (!address1 && place.formattedAddress) {
                        console.log("Falling back to formatted address parsing");
                        const addressParts = place.formattedAddress.split(',').map(part => part.trim());

                        if (addressParts.length >= 1) address1 = addressParts[0];
                        if (addressParts.length >= 2) city = addressParts[1];
                        if (addressParts.length >= 3) {
                            // Parse "State ZIP" format
                            const stateZipMatch = addressParts[2].match(/^([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/);
                            if (stateZipMatch) {
                                state = stateZipMatch[1];
                                zip = stateZipMatch[2];
                            } else {
                                // If pattern doesn't match, try to split by space
                                const stateZipParts = addressParts[2].split(' ');
                                if (stateZipParts.length >= 2) {
                                    state = stateZipParts[0];
                                    zip = stateZipParts[1];
                                }
                            }
                        }
                    }

                    // Extract coordinates safely
                    let lat = 0, lng = 0;
                    if (place.location) {
                        try {
                            lat = typeof place.location.lat === 'function' ? place.location.lat() : place.location.lat || 0;
                            lng = typeof place.location.lng === 'function' ? place.location.lng() : place.location.lng || 0;
                        } catch (coordError) {
                            console.warn("Error extracting coordinates:", coordError);
                            // Use event coordinates as fallback
                            if (event.latLng) {
                                lat = event.latLng.lat();
                                lng = event.latLng.lng();
                            }
                        }
                    } else if (event.latLng) {
                        lat = event.latLng.lat();
                        lng = event.latLng.lng();
                    }

                    // Map business type from Google Places types
                    const businessType = mapGooglePlaceTypeToBusinessType(place.types || []);

                    // Check if this business matches any chains (with error handling)
                    let chainMatch = null;
                    try {
                        chainMatch = await findMatchingChainForPlaceResult(businessName);
                    } catch (error) {
                        console.warn("Error checking for chain match (non-critical):", error);
                        // Continue without chain match
                    }

                    // Create properly parsed business object
                    const business = {
                        _id: 'google_' + place.id,
                        bname: businessName,
                        address1: address1,
                        city: city,
                        state: state,
                        zip: zip,
                        phone: phone,
                        type: businessType,
                        formattedAddress: place.formattedAddress,
                        isGooglePlace: true,
                        placeId: place.id,
                        lat: lat,
                        lng: lng,
                        types: place.types || []
                    };

                    // Add chain info if it matches
                    if (chainMatch) {
                        console.log(`POI "${businessName}" matches chain: ${chainMatch.bname}`);
                        business.chain_id = chainMatch._id;
                        business.chain_name = chainMatch.bname;
                        business.isChainLocation = true;
                    }

                    // Calculate distance if possible
                    if (lat && lng && window.currentSearchLocation) {
                        try {
                            business.distance = google.maps.geometry.spherical.computeDistanceBetween(
                                new google.maps.LatLng(lat, lng),
                                new google.maps.LatLng(
                                    window.currentSearchLocation.lat,
                                    window.currentSearchLocation.lng
                                )
                            );
                        } catch (distanceError) {
                            console.warn("Error calculating distance:", distanceError);
                            // Distance calculation failed, continue without it
                        }
                    }

                    console.log("Parsed business object:", business);

                    // Create temporary marker for info window
                    const tempMarker = {
                        business: business,
                        position: new google.maps.LatLng(lat, lng),
                        getPosition: function () {
                            return this.position;
                        }
                    };

                    // Show enhanced info window
                    showEnhancedInfoWindow(tempMarker);
                } catch (error) {
                    console.error("Error fetching place details:", error);
                    // Show a user-friendly message instead of breaking
                    alert("Unable to load details for this location. Please try again.");
                }
            }
        });

        console.log("Map click handler set up successfully");
    } catch (error) {
        console.error("Error setting up map click handler:", error);
        // Don't break the app if this fails
    }
}

/**
 * Helper function to extract address components (same as used in addBusinessToDatabase)
 * @param {Array} addressComponents - Array of address components from Google Places
 * @param {string} type - Component type to extract
 * @returns {string} Extracted component text
 */
function getAddressComponent(addressComponents, type) {
    if (!addressComponents || !Array.isArray(addressComponents)) return '';

    const component = addressComponents.find(
        component => component.types && component.types.includes(type)
    );

    return component ? (component.shortText || component.short_name || '') : '';
}

/**
 * Enhanced business type mapping from Google Places types
 * @param {Array} types - Array of Google place types
 * @returns {string} Business type code
 */
function mapGooglePlaceTypeToBusinessType(types) {
    if (!types || !Array.isArray(types)) return 'OTHER';

    // More comprehensive mapping
    const typeMap = {
        // Restaurants and Food
        'restaurant': 'REST',
        'meal_takeaway': 'REST',
        'meal_delivery': 'REST',
        'cafe': 'REST',
        'bakery': 'REST',
        'bar': 'REST',
        'night_club': 'REST',
        'food': 'REST',
        'mexican_restaurant': 'REST',
        'chinese_restaurant': 'REST',
        'italian_restaurant': 'REST',
        'japanese_restaurant': 'REST',
        'indian_restaurant': 'REST',
        'thai_restaurant': 'REST',
        'american_restaurant': 'REST',
        'pizza_restaurant': 'REST',
        'seafood_restaurant': 'REST',
        'steak_house': 'REST',
        'sushi_restaurant': 'REST',
        'vegetarian_restaurant': 'REST',
        'fast_food_restaurant': 'REST',

        // Retail and Shopping
        'grocery_or_supermarket': 'GROC',
        'supermarket': 'GROC',
        'convenience_store': 'CONV',
        'gas_station': 'FUEL',
        'hardware_store': 'HARDW',
        'department_store': 'DEPT',
        'clothing_store': 'CLTH',
        'shoe_store': 'CLTH',
        'electronics_store': 'ELEC',
        'furniture_store': 'FURN',
        'home_goods_store': 'FURN',
        'jewelry_store': 'JEWL',
        'book_store': 'BOOK',
        'bicycle_store': 'SPRT',
        'sporting_goods_store': 'SPRT',
        'toy_store': 'TOYS',
        'pet_store': 'OTHER',
        'florist': 'GIFT',
        'gift_shop': 'GIFT',

        // Automotive
        'car_dealer': 'AUTO',
        'car_rental': 'AUTO',
        'car_repair': 'AUTO',
        'car_wash': 'AUTO',
        'auto_parts_store': 'AUTO',

        // Health and Beauty
        'pharmacy': 'RX',
        'drugstore': 'RX',
        'hospital': 'HEAL',
        'doctor': 'HEAL',
        'dentist': 'HEAL',
        'veterinary_care': 'HEAL',
        'beauty_salon': 'BEAU',
        'hair_care': 'BEAU',
        'spa': 'BEAU',

        // Entertainment
        'movie_theater': 'ENTR',
        'amusement_park': 'ENTR',
        'zoo': 'ENTR',
        'aquarium': 'ENTR',
        'museum': 'ENTR',
        'art_gallery': 'ENTR',
        'bowling_alley': 'ENTR',
        'casino': 'ENTR',

        // Services
        'bank': 'SERV',
        'atm': 'SERV',
        'post_office': 'SERV',
        'laundry': 'SERV',
        'gym': 'SPRT',
        'library': 'BOOK',

        // Lodging
        'lodging': 'OTHER',
        'hotel': 'OTHER',
        'motel': 'OTHER',

        // Generic
        'store': 'RETAIL',
        'shopping_mall': 'RETAIL',
        'establishment': 'OTHER',
        'point_of_interest': 'OTHER'
    };

    // Find the most specific type first
    for (const type of types) {
        if (typeMap[type]) {
            return typeMap[type];
        }
    }

    // Default to OTHER if no mapping found
    return 'OTHER';
}

/**
 * Fixed buildInfoWindowContent function with better Google Places handling
 * @param {Object} business - Business object
 * @returns {string} HTML content
 */
function buildInfoWindowContent(business) {
    const isGooglePlace = business.isGooglePlace === true;
    const isChainLocation = !!business.chain_id;

    // Format address
    let addressText = '';
    if (business.address1) {
        addressText = `<p><strong>Address:</strong><br>${business.address1}`;
        if (business.city) addressText += `, ${business.city}`;
        if (business.state) addressText += `, ${business.state}`;
        if (business.zip) addressText += ` ${business.zip}`;
        addressText += '</p>';
    } else if (business.formattedAddress) {
        addressText = `<p><strong>Address:</strong><br>${business.formattedAddress}</p>`;
    }

    // Create chain badge if applicable
    const chainBadge = isChainLocation ?
        `<span style="display:inline-block; background-color:#4285F4; color:white; padding:2px 6px; border-radius:4px; font-size:0.8em; margin-left:5px;">${business.chain_name || 'Chain Location'}</span>` :
        '';

    // Business type (for Google Places, try to determine from types)
    let businessType = '';
    if (business.type) {
        businessType = `<p><strong>Type:</strong> ${getBusinessTypeLabel(business.type)}</p>`;
    } else if (isGooglePlace && business.types && business.types.length > 0) {
        const placeType = getPlaceTypeLabel(business.types);
        businessType = `<p><strong>Type:</strong> ${placeType}</p>`;
    }

    // Distance if available
    const distanceText = business.distance ?
        `<p><strong>Distance:</strong> ${(business.distance / 1609).toFixed(1)} miles</p>` : '';

    // Status for Google Places
    const statusText = isGooglePlace ?
        '<p style="color:#666; font-style:italic;">This business is not yet in the Patriot Thanks database.</p>' : '';

    // Chain explanation if applicable
    const chainExplanation = isChainLocation ?
        `<p style="color:#4285F4; font-size:12px; margin-top:8px;">This location appears to match ${business.chain_name} in our database. Chain-wide incentives may apply.</p>` : '';

    // Determine action button
    let actionButton;
    if (isGooglePlace) {
        if (isChainLocation) {
            actionButton = `
                <button style="background-color:#EA4335; color:white; border:none; padding:8px 12px; border-radius:4px; cursor:pointer; width:100%;" 
                        onclick="window.addBusinessToDatabase('${business.placeId}', '${business.chain_id}')">
                    Add ${business.chain_name} Location
                </button>
            `;
        } else {
            actionButton = `
                <button style="background-color:#EA4335; color:white; border:none; padding:8px 12px; border-radius:4px; cursor:pointer; width:100%;" 
                        onclick="window.addBusinessToDatabase('${business.placeId}')">
                    Add to Patriot Thanks
                </button>
            `;
        }
    } else {
        actionButton = `
            <button style="background-color:#4285F4; color:white; border:none; padding:8px 12px; border-radius:4px; cursor:pointer; width:100%;" 
                    onclick="window.viewBusinessDetails('${business._id}')">
                View Details
            </button>
        `;
    }

    // Build complete content
    return `
        <div style="max-width:280px; font-family:Arial,sans-serif; padding:8px;">
            <h3 style="margin:0 0 8px 0; font-size:16px; line-height:1.2;">${business.bname} ${chainBadge}</h3>
            ${addressText}
            ${businessType}
            ${distanceText}
            ${statusText}
            ${chainExplanation}
            <div id="incentives-container-${business._id || business.placeId}" style="margin:8px 0;">
                ${isGooglePlace && !isChainLocation ?
        '<p style="margin:4px 0; font-style:italic; color:#666;">Add this business to see available incentives.</p>' :
        '<p style="margin:4px 0;"><em>Loading incentives...</em></p>'}
            </div>
            <div style="margin-top:12px; text-align:center;">
                ${actionButton}
            </div>
        </div>
    `;
}

/**
 * Enhanced getPlaceTypeLabel function for Google Places types
 * @param {Array} types - Array of place types
 * @returns {string} Readable type label
 */
function getPlaceTypeLabel(types) {
    if (!types || !types.length) return 'Business';

    // Map Google place types to more readable formats
    const typeMapping = {
        'restaurant': 'Restaurant',
        'food': 'Food & Dining',
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
        'electronics_store': 'Electronics Store',
        'clothing_store': 'Clothing Store',
        'shoe_store': 'Shoe Store',
        'beauty_salon': 'Beauty Salon',
        'hair_care': 'Hair Salon',
        'spa': 'Spa',
        'pharmacy': 'Pharmacy',
        'drugstore': 'Pharmacy',
        'bank': 'Bank',
        'atm': 'ATM',
        'shopping_mall': 'Shopping Mall',
        'supermarket': 'Supermarket',
        'convenience_store': 'Convenience Store',
        'car_dealer': 'Car Dealer',
        'car_repair': 'Auto Repair',
        'car_wash': 'Car Wash',
        'gym': 'Gym',
        'hospital': 'Hospital',
        'doctor': 'Medical',
        'dentist': 'Dental',
        'veterinary_care': 'Veterinary',
        'movie_theater': 'Movie Theater',
        'amusement_park': 'Amusement Park',
        'zoo': 'Zoo',
        'aquarium': 'Aquarium',
        'museum': 'Museum',
        'library': 'Library',
        'book_store': 'Bookstore',
        'jewelry_store': 'Jewelry Store',
        'florist': 'Florist',
        'pet_store': 'Pet Store',
        'bicycle_store': 'Bike Shop',
        'sporting_goods_store': 'Sporting Goods'
    };

    // Try to find a good primary type
    for (const type of types) {
        if (typeMapping[type]) {
            return typeMapping[type];
        }
    }

    // Default to first type if we can't find a mapping, cleaned up
    return types[0].replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Initialize the Google Map
 */
window.initGoogleMap = function () {
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
        resetMapButton.addEventListener('click', function () {
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
 * Setup marker click priority over POI clicks
 */
function setupMarkerClickPriority() {
    if (!map) {
        console.error("Map not initialized, cannot set up click priority");
        return;
    }

    console.log("Setting up enhanced marker click priority");

    // Create listener that gets called before Google's POI click
    google.maps.event.addListener(map, 'click', function (event) {
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
                    console.log("Preventing POI click, using our enhanced marker instead");
                    event.stop();

                    // Trigger our enhanced marker click
                    setTimeout(() => {
                        showEnhancedInfoWindow(marker); // USE ENHANCED VERSION
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
window.focusOnMapMarker = function (businessId) {
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

            // Show enhanced info window
            showEnhancedInfoWindow(marker); // USE ENHANCED VERSION

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

                // Create enhanced marker for this business
                const marker = createBusinessMarker(data.result); // This now uses enhanced markers

                if (marker) {
                    // Center on the marker
                    map.setCenter(marker.position);
                    map.setZoom(15);

                    // Show enhanced info window
                    showEnhancedInfoWindow(marker);

                    console.log("Created and focused on new enhanced marker for business:", businessId);
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
document.addEventListener('DOMContentLoaded', function () {
    console.log("DOM loaded, initializing enhanced business search...");

    // Add enhanced marker styles FIRST
    addEnhancedMarkerStyles();

    // Apply the existing positioning fixes
    setTimeout(() => {
        applyInfoWindowPositioningFixes();
        applyMapHeightFix();
        applyInfoWindowCSS();
        applyCSSOnlyTailFix();
        applyInfoWindowPositioningFixes();
        removeProblematicInfoWindowCSS();
    }, 500);

    // Add existing custom styles
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
        // Ensure loading indicator is hidden
        hideLoadingIndicator();

        const businessSearchTable = document.getElementById('business_search');
        const searchTableContainer = document.getElementById('search_table');

        if (!businessSearchTable || !searchTableContainer) {
            console.error("Required elements not found in the DOM");
            showErrorMessage("There was an error displaying search results. Please try again later.");
            return;
        }

        // Get the table body
        let tableBody = businessSearchTable.querySelector('tbody');

        if (!tableBody) {
            console.error("Table body not found within business_search table");
            showErrorMessage("There was an error displaying search results. Please try again later.");
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
        hideLoadingIndicator();
        showErrorMessage("There was an error displaying the search results: " + error.message);
    }
}

/**
 * Enhanced CSS for better loading indicators
 */
function addEnhancedLoadingCSS() {
    if (!document.getElementById('enhanced-loading-css')) {
        const style = document.createElement('style');
        style.id = 'enhanced-loading-css';
        style.textContent = `
            .loading-indicator {
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                padding: 30px 20px;
                text-align: center;
                background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
                border-radius: 8px;
                margin: 20px 0;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }

            .loading-text {
                font-size: 16px;
                color: #333;
                margin-bottom: 15px;
                font-weight: 500;
            }

            .loading-spinner {
                width: 40px;
                height: 40px;
                border: 4px solid #f3f3f3;
                border-top: 4px solid #4285F4;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            /* Enhanced error messages */
            .error-message {
                color: #721c24;
                padding: 20px;
                background: linear-gradient(135deg, #f8d7da 0%, #f1b0b7 100%);
                border: 1px solid #f5c6cb;
                border-radius: 8px;
                margin: 20px 0;
                text-align: center;
                font-weight: 500;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }

            /* Fade in animation for results */
            .search-results-container {
                animation: fadeIn 0.5s ease-in;
            }

            @keyframes fadeIn {
                from { 
                    opacity: 0; 
                    transform: translateY(20px); 
                }
                to { 
                    opacity: 1; 
                    transform: translateY(0); 
                }
            }
        `;
        document.head.appendChild(style);
    }
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
 * Get business type text icon (emoji version)
 * @param {string} businessType - Business type code
 * @returns {string} Emoji icon
 */
function getBusinessTypeTextIcon(businessType) {
    const iconMap = {
        'AUTO': '🚗',
        'BEAU': '💇',
        'BOOK': '📚',
        'CLTH': '👕',
        'CONV': '🏪',
        'DEPT': '🛍️',
        'ELEC': '⚡',
        'ENTR': '🎬',
        'FURN': '🪑',
        'FUEL': '⛽',
        'GIFT': '🎁',
        'GROC': '🛒',
        'HARDW': '🔨',
        'HEAL': '❤️',
        'JEWL': '💎',
        'OTHER': '🏬',
        'RX': '💊',
        'REST': '🍽️',
        'RETAIL': '🛍️',
        'SERV': '🔧',
        'SPEC': '⭐',
        'SPRT': '🏈',
        'TECH': '💻',
        'TOYS': '🎮'
    };

    return `<span style="font-size: 16px; color: white; text-shadow: 0 1px 2px rgba(0,0,0,0.5);">${iconMap[businessType] || '🏬'}</span>`;
}

/**
 * Enhanced fallback marker creation
 * @param {Object} business - Business object
 * @param {Object} location - Location object
 * @returns {Object} Google Maps marker
 */
function createEnhancedFallbackMarker(business, location) {
    try {
        console.log("Creating enhanced fallback marker for:", business.bname);

        // Create a safe position
        let position = createSafeLatLng(location);
        if (!position && business.lat && business.lng) {
            position = new google.maps.LatLng(
                parseFloat(business.lat),
                parseFloat(business.lng)
            );
        }

        if (!position) {
            console.error("Invalid location for enhanced fallback marker:", location);
            return null;
        }

        // Determine marker styling
        const isFromDatabase = !business.isGooglePlace;
        const isChainLocation = !!business.chain_id;

        // Choose marker color
        const markerColor = isFromDatabase ? CONFIG.markerColors.primary : CONFIG.markerColors.nearby;

        // Create a standard marker with custom icon
        const marker = new google.maps.Marker({
            position: position,
            map: map,
            title: business.bname,
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: markerColor,
                fillOpacity: 0.9,
                strokeWeight: 2,
                strokeColor: '#FFFFFF',
                scale: isFromDatabase ? 14 : 12  // Database businesses slightly larger
            },
            animation: google.maps.Animation.DROP,
            zIndex: isFromDatabase ? 1000 : 100  // Database businesses on top
        });

        // Store the business data
        marker.business = business;
        marker.position = position;
        marker.isFromDatabase = isFromDatabase;

        // Add click event listener
        marker.addListener('click', function () {
            console.log("Enhanced fallback marker clicked:", business.bname);
            showEnhancedInfoWindow(marker);
        });

        // Add the marker to our array
        markers.push(marker);
        console.log(`Added enhanced fallback marker for ${business.bname}`);

        return marker;
    } catch (error) {
        console.error("Error creating enhanced fallback marker:", error);
        return null;
    }
}

/**
 * Enhanced info window with better content organization
 * @param {Object} marker - The marker that was clicked
 */
function showEnhancedInfoWindow(marker) {
    console.log("showEnhancedInfoWindow called with marker:", marker);

    if (!marker || !marker.business) {
        console.error("Invalid marker for enhanced info window", marker);
        return;
    }

    const business = marker.business;
    const isGooglePlace = business.isGooglePlace === true;
    const isChainLocation = !!business.chain_id;

    // Close any existing info window
    if (infoWindow) {
        infoWindow.close();
    }

    // Create new info window
    infoWindow = new google.maps.InfoWindow({
        maxWidth: 320,
        disableAutoPan: false
    });

    // Build enhanced content
    const content = buildEnhancedInfoWindowContent(business);

    // Set content
    infoWindow.setContent(content);

    // Get safe position
    let position = marker.position;
    if (!position && marker.getPosition) {
        position = marker.getPosition();
    }
    if (!position) {
        position = createSafeLatLng(business);
    }

    if (!position) {
        console.error("Could not determine position for enhanced info window");
        return;
    }

    // Pan to position
    try {
        map.panTo(position);
    } catch (panError) {
        console.warn("Error panning to position:", panError);
    }

    // Open info window
    setTimeout(() => {
        try {
            if (marker.getPosition) {
                infoWindow.open(map, marker);
            } else {
                infoWindow.setPosition(position);
                infoWindow.open(map);
            }

            console.log("Enhanced info window opened successfully");

            // Apply fixes after DOM is ready
            google.maps.event.addListenerOnce(infoWindow, 'domready', function () {
                setTimeout(() => {
                    applyEnhancedInfoWindowFixes();

                    // FIXED: Load incentives with correct container handling
                    if (!isGooglePlace) {
                        // Database business
                        loadIncentivesForEnhancedWindow(business._id);
                    } else if (isChainLocation) {
                        // Google Places chain location - use placeId as container ID
                        console.log(`Loading chain incentives for place: ${business.placeId}, chain: ${business.chain_id}`);
                        loadChainIncentivesForEnhancedWindow(business.placeId, business.chain_id);
                    }
                    // Non-chain Google Places don't need incentives loaded
                }, 200); // Increased delay to ensure DOM is ready
            });

        } catch (error) {
            console.error("Error opening enhanced info window:", error);
        }
    }, 200);
}

/**
 * Build enhanced info window content with better organization
 * @param {Object} business - Business object
 * @returns {string} HTML content
 */
function buildEnhancedInfoWindowContent(business) {
    const isGooglePlace = business.isGooglePlace === true;
    const isChainLocation = !!business.chain_id;

    // Enhanced address formatting
    let addressHTML = '';
    if (business.address1) {
        addressHTML = `<div class="info-address">
            <strong>📍 Address:</strong><br>
            ${business.address1}`;

        if (business.address2) {
            addressHTML += `<br>${business.address2}`;
        }

        const locationParts = [];
        if (business.city) locationParts.push(business.city);
        if (business.state) locationParts.push(business.state);
        if (business.zip) locationParts.push(business.zip);

        if (locationParts.length > 0) {
            addressHTML += `<br>${locationParts.join(', ')}`;
        }

        addressHTML += '</div>';
    } else if (business.formattedAddress) {
        const addressParts = business.formattedAddress.split(',').map(part => part.trim());
        addressHTML = `<div class="info-address">
            <strong>📍 Address:</strong><br>`;

        if (addressParts.length >= 1) {
            addressHTML += addressParts[0];
        }
        if (addressParts.length >= 2) {
            addressHTML += `<br>${addressParts.slice(1).join(', ')}`;
        }

        addressHTML += '</div>';
    }

    // Phone number with better formatting
    const phoneHTML = business.phone ?
        `<div class="info-phone"><strong>📞 Phone:</strong> <a href="tel:${business.phone.replace(/\D/g, '')}" style="color: #4285F4; text-decoration: none;">${business.phone}</a></div>` : '';

    // Business type with better labeling
    let typeHTML = '';
    if (business.type && business.type !== 'OTHER') {
        typeHTML = `<div class="info-type"><strong>🏢 Type:</strong> ${getBusinessTypeLabel(business.type)}</div>`;
    }

    // Distance with better formatting
    const distanceHTML = business.distance ?
        `<div class="info-distance"><strong>📏 Distance:</strong> ${(business.distance / 1609).toFixed(1)} miles</div>` : '';

    // Enhanced chain badge
    const chainBadge = isChainLocation ?
        `<span class="enhanced-chain-badge">🔗 ${business.chain_name || 'Chain Location'}</span>` : '';

    // Enhanced status and messaging for chain locations
    let statusHTML = '';
    let chainExplanation = '';

    if (isGooglePlace) {
        if (isChainLocation) {
            statusHTML = '<div class="info-status chain-match">🔗 This location appears to match a chain in our database!</div>';
            chainExplanation = `<div class="chain-explanation">
                ✨ Great news! This location matches <strong>${business.chain_name}</strong> in our database. 
                Chain-wide incentives should apply to this location once added.
            </div>`;
        } else {
            statusHTML = '<div class="info-status google-place">ℹ️ This business is not yet in the Patriot Thanks database.</div>';
        }
    } else {
        statusHTML = '<div class="info-status database-business">✅ This business is in the Patriot Thanks database.</div>';
    }

    // Enhanced action button
    let actionButton;
    if (isGooglePlace) {
        if (isChainLocation) {
            actionButton = `
                <button class="enhanced-add-btn chain-add" onclick="window.addBusinessToDatabase('${business.placeId}', '${business.chain_id}')">
                    🔗 Add ${business.chain_name} Location
                </button>
            `;
        } else {
            actionButton = `
                <button class="enhanced-add-btn" onclick="window.addBusinessToDatabase('${business.placeId}')">
                    ➕ Add to Patriot Thanks
                </button>
            `;
        }
    } else {
        actionButton = `
            <button class="enhanced-view-btn" onclick="window.viewBusinessDetails('${business._id}')">
                👁️ View Details
            </button>
        `;
    }

    // Unique container ID
    const containerId = business._id || business.placeId;

    // Enhanced incentives messaging
    let incentivesMessage;
    if (isGooglePlace && isChainLocation) {
        incentivesMessage = '<em>⏳ Loading chain incentives...</em>';
    } else if (isGooglePlace && !isChainLocation) {
        incentivesMessage = '<em>💡 Add this business to see available incentives.</em>';
    } else {
        incentivesMessage = '<em>⏳ Loading incentives...</em>';
    }

    return `
        <div class="enhanced-info-window">
            <div class="info-header">
                <h3>${business.bname} ${chainBadge}</h3>
            </div>
            
            <div class="info-body">
                ${addressHTML}
                ${phoneHTML}
                ${typeHTML}
                ${distanceHTML}
                ${statusHTML}
                ${chainExplanation}
                
                <div class="info-incentives">
                    <div id="incentives-container-${containerId}">
                        ${incentivesMessage}
                    </div>
                </div>
            </div>
            
            <div class="info-actions">
                ${actionButton}
            </div>
        </div>
    `;
}

/**
 * Load incentives for enhanced info window (database businesses)
 * @param {string} businessId - Business ID
 */
function loadIncentivesForEnhancedWindow(businessId) {
    const container = document.getElementById(`incentives-container-${businessId}`);
    if (!container) {
        console.error("Enhanced incentives container not found for business:", businessId);
        return;
    }

    const baseURL = getBaseURL();
    const apiURL = `${baseURL}/api/combined-api.js?operation=incentives&business_id=${businessId}`;

    fetch(apiURL)
        .then(response => response.json())
        .then(data => {
            if (!data.results || data.results.length === 0) {
                container.innerHTML = '<em>💭 No incentives available</em>';
                return;
            }

            let incentivesHTML = '<div class="incentives-header"><strong>🎁 Available Incentives:</strong></div>';
            incentivesHTML += '<div class="incentives-list">';

            data.results.forEach(incentive => {
                if (incentive.is_available) {
                    const typeLabel = getIncentiveTypeLabel(incentive.type);
                    const otherDescription = incentive.other_description ? ` (${incentive.other_description})` : '';
                    const chainBadge = incentive.is_chain_wide ?
                        '<span class="mini-chain-badge">🔗 Chain-wide</span>' : '';

                    incentivesHTML += `
                        <div class="incentive-item">
                            <div class="incentive-type">${typeLabel}${otherDescription}:</div>
                            <div class="incentive-amount">${incentive.amount}% ${chainBadge}</div>
                            ${incentive.information ? `<div class="incentive-info">${incentive.information}</div>` : ''}
                        </div>
                    `;
                }
            });

            incentivesHTML += '</div>';
            container.innerHTML = incentivesHTML;
        })
        .catch(error => {
            console.error("Error loading incentives:", error);
            container.innerHTML = '<em>❌ Error loading incentives</em>';
        });
}

/**
 * Load chain incentives for enhanced info window (Google Places)
 * @param {string} placeId - Google Place ID
 * @param {string} chainId - Chain ID
 */
function loadChainIncentivesForEnhancedWindow(placeId, chainId) {
    // CRITICAL FIX: Use the correct container ID format
    const container = document.getElementById(`incentives-container-${placeId}`);
    if (!container) {
        console.error("Enhanced chain incentives container not found for place:", placeId);
        // Try alternative container ID formats
        const altContainer = document.getElementById(`incentives-container-google_${placeId}`);
        if (altContainer) {
            console.log("Found alternative container ID format");
            loadChainIncentivesInContainer(altContainer, chainId);
            return;
        }

        // Last resort - find any container that might match
        const possibleContainers = document.querySelectorAll('[id*="incentives-container"]');
        console.log("Available incentives containers:", Array.from(possibleContainers).map(c => c.id));
        return;
    }

    loadChainIncentivesInContainer(container, chainId);
}

/**
 * Helper function to load chain incentives in a specific container
 */
function loadChainIncentivesInContainer(container, chainId) {
    const baseURL = getBaseURL();
    const apiURL = `${baseURL}/api/combined-api.js?operation=incentives&business_id=${chainId}`;

    console.log("Loading chain incentives from:", apiURL);

    fetch(apiURL)
        .then(response => response.json())
        .then(data => {
            if (!data.results || data.results.length === 0) {
                container.innerHTML = '<em>💭 No chain incentives available</em>';
                return;
            }

            let incentivesHTML = '<div class="incentives-header"><strong>🎁 Chain-wide Incentives:</strong></div>';
            incentivesHTML += '<div class="incentives-list">';

            data.results.forEach(incentive => {
                if (incentive.is_available) {
                    const typeLabel = getIncentiveTypeLabel(incentive.type);
                    const otherDescription = incentive.other_description ? ` (${incentive.other_description})` : '';

                    incentivesHTML += `
                        <div class="incentive-item chain-incentive">
                            <div class="incentive-type">${typeLabel}${otherDescription}:</div>
                            <div class="incentive-amount">${incentive.amount}% <span class="mini-chain-badge">🔗 Chain-wide</span></div>
                            ${incentive.information ? `<div class="incentive-info">${incentive.information}</div>` : ''}
                        </div>
                    `;
                }
            });

            incentivesHTML += '</div>';
            incentivesHTML += '<div class="chain-note">✨ Great! These incentives apply to all locations of this chain.</div>';

            container.innerHTML = incentivesHTML;
            console.log("Successfully loaded chain incentives");
        })
        .catch(error => {
            console.error("Error loading chain incentives:", error);
            container.innerHTML = '<em>❌ Error loading chain incentives</em>';
        });
}

/**
 * Enhanced info window positioning fixes with padding correction
 */
function applyEnhancedInfoWindowFixes() {
    const iwContainer = document.querySelector('.gm-style-iw-c');
    const iwContent = document.querySelector('.gm-style-iw-d');
    const iwTail = document.querySelector('.gm-style-iw-t');

    if (iwContainer) {
        const rect = iwContainer.getBoundingClientRect();

        // Fix width if too small
        if (rect.width < 50) {
            iwContainer.style.width = 'auto';
            iwContainer.style.minWidth = '300px';
            iwContainer.style.maxWidth = '350px';
        }

        // Reset any padding/margin that Google might have added incorrectly
        iwContainer.style.padding = '0';
        iwContainer.style.margin = '0';

        // Fix positioning if off-screen
        if (rect.top < 0 || rect.top > window.innerHeight || rect.left < 0 || rect.left > window.innerWidth) {
            iwContainer.style.position = 'relative';
            iwContainer.style.transform = 'none';
        }
    }

    // Ensure content container has no padding (our content will have its own)
    if (iwContent) {
        iwContent.style.padding = '0';
        iwContent.style.margin = '0';
        iwContent.style.overflow = 'auto';
        iwContent.style.maxHeight = '350px';
    }

    // Fix tail positioning
    if (iwTail) {
        iwTail.style.bottom = '0px';
        iwTail.style.left = '50%';
        iwTail.style.right = 'auto';
        iwTail.style.transform = 'translateX(-50%)';
    }

    console.log("Applied enhanced info window fixes with proper padding");
}

/**
 * Add enhanced marker and info window styles
 */
function addEnhancedMarkerStyles() {
    if (!document.getElementById('enhanced-marker-styles')) {
        const style = document.createElement('style');
        style.id = 'enhanced-marker-styles';
        style.textContent = `
            /* Enhanced marker container */
            .enhanced-custom-marker {
                cursor: pointer;
                transition: transform 0.2s ease;
                z-index: 100;
            }

            .enhanced-marker-container {
                position: relative;
                width: 36px;
                height: 46px;
            }

            /* Enhanced pin styling */
            .enhanced-marker-pin {
                width: 32px;
                height: 40px;
                border-radius: 50% 50% 50% 0;
                transform: rotate(-45deg);
                display: flex;
                justify-content: center;
                align-items: center;
                box-shadow: 0 3px 6px rgba(0,0,0,0.3);
                position: absolute;
                top: 0;
                left: 2px;
                border: 2px solid white;
            }

            .enhanced-marker-pin.primary {
                background: linear-gradient(45deg, #EA4335, #FF6B6B);
            }

            .enhanced-marker-pin.nearby {
                background: linear-gradient(45deg, #4285F4, #64B5F6);
            }

            /* Enhanced icon styling */
            .enhanced-marker-icon {
                transform: rotate(45deg);
                display: flex;
                justify-content: center;
                align-items: center;
                width: 20px;
                height: 20px;
                font-size: 16px;
                filter: drop-shadow(0 1px 2px rgba(0,0,0,0.5));
            }

            /* Enhanced shadow */
            .enhanced-marker-shadow {
                position: absolute;
                bottom: -2px;
                left: 8px;
                width: 20px;
                height: 8px;
                background: radial-gradient(ellipse, rgba(0,0,0,0.3) 0%, transparent 70%);
                border-radius: 50%;
                filter: blur(1px);
            }

            /* Chain indicator */
            .chain-indicator {
                position: absolute;
                top: -5px;
                right: -5px;
                background: #FFD700;
                border-radius: 50%;
                width: 18px;
                height: 18px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 10px;
                border: 2px solid white;
                box-shadow: 0 1px 3px rgba(0,0,0,0.3);
                z-index: 1001;
            }

            /* CRITICAL: Google Maps info window container fixes */
            .gm-style .gm-style-iw-c {
                padding: 0 !important;
                border-radius: 8px !important;
                box-shadow: 0 2px 7px 1px rgba(0,0,0,0.3) !important;
                max-width: 350px !important;
                max-height: 400px !important;
                overflow: hidden !important;
            }

            .gm-style .gm-style-iw-d {
                overflow: auto !important;
                max-height: 350px !important;
                padding: 0 !important;
                /* Add proper padding that Google Maps won't strip */
                margin: 0 !important;
            }

            /* Enhanced info window styles with proper padding */
            .enhanced-info-window {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                max-width: 320px;
                line-height: 1.4;
                /* CRITICAL: Add padding to the content container instead of relying on Google's padding */
                padding: 12px 12px 12px 12px !important;
                margin: 0;
                box-sizing: border-box;
            }

            .info-header {
                border-bottom: 2px solid #f0f0f0;
                padding-bottom: 8px;
                margin-bottom: 12px;
            }

            .info-header h3 {
                margin: 0;
                font-size: 16px;
                color: #333;
                font-weight: 600;
            }

            .enhanced-chain-badge {
                display: inline-block;
                background: linear-gradient(45deg, #4285F4, #64B5F6);
                color: white;
                padding: 2px 8px;
                border-radius: 12px;
                font-size: 11px;
                margin-left: 8px;
                font-weight: 500;
            }

            .info-body > div {
                margin: 8px 0;
                font-size: 14px;
            }

            .info-address, .info-phone, .info-type, .info-distance {
                color: #555;
            }

            .info-status {
                padding: 6px 10px;
                border-radius: 6px;
                font-size: 13px;
                margin: 10px 0;
            }

            .info-status.database-business {
                background-color: #e8f5e8;
                color: #2e7d32;
            }

            .info-status.google-place {
                background-color: #e3f2fd;
                color: #1565c0;
            }

            .chain-explanation {
                background-color: #fff3e0;
                padding: 8px;
                border-radius: 6px;
                font-size: 13px;
                color: #ef6c00;
                border-left: 3px solid #ff9800;
            }

            .info-incentives {
                margin: 12px 0;
            }

            .incentives-header {
                font-weight: 600;
                color: #333;
                margin-bottom: 8px;
            }

            .incentive-item {
                background-color: #f8f9fa;
                padding: 8px;
                border-radius: 6px;
                margin: 6px 0;
                border-left: 3px solid #4285F4;
            }

            .incentive-type {
                font-weight: 500;
                color: #333;
            }

            .incentive-amount {
                font-size: 16px;
                font-weight: 600;
                color: #2e7d32;
                margin: 2px 0;
            }

            .incentive-info {
                font-size: 12px;
                color: #666;
                font-style: italic;
                margin-top: 4px;
            }

            .mini-chain-badge {
                background: #4285F4;
                color: white;
                padding: 1px 6px;
                border-radius: 8px;
                font-size: 10px;
                margin-left: 4px;
            }

            .chain-note {
                font-size: 12px;
                color: #666;
                font-style: italic;
                margin-top: 8px;
                padding: 4px 8px;
                background-color: #f0f8ff;
                border-radius: 4px;
            }

            .info-actions {
                margin-top: 12px;
                padding-top: 12px;
                border-top: 1px solid #eee;
                text-align: center;
                /* Add bottom margin to ensure spacing at bottom */
                margin-bottom: 4px;
            }

            .enhanced-add-btn, .enhanced-view-btn {
                background: linear-gradient(45deg, #4285F4, #64B5F6);
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 8px;
                cursor: pointer;
                font-weight: 500;
                font-size: 14px;
                transition: all 0.2s ease;
                width: 100%;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }

            .enhanced-add-btn {
                background: linear-gradient(45deg, #EA4335, #FF6B6B);
            }

            .enhanced-add-btn:hover, .enhanced-view-btn:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 8px rgba(0,0,0,0.15);
            }

            /* ENHANCED SCROLLBAR - More visible and styled */
            .gm-style .gm-style-iw-d::-webkit-scrollbar {
                width: 8px;
                height: 8px;
            }

            .gm-style .gm-style-iw-d::-webkit-scrollbar-track {
                background: #f1f1f1;
                border-radius: 4px;
                border: 1px solid #e0e0e0;
            }

            .gm-style .gm-style-iw-d::-webkit-scrollbar-thumb {
                background: linear-gradient(180deg, #4285F4, #64B5F6);
                border-radius: 4px;
                border: 1px solid #3367D6;
                box-shadow: inset 0 1px 2px rgba(255,255,255,0.3);
            }

            .gm-style .gm-style-iw-d::-webkit-scrollbar-thumb:hover {
                background: linear-gradient(180deg, #3367D6, #4285F4);
                cursor: pointer;
            }

            .gm-style .gm-style-iw-d::-webkit-scrollbar-thumb:active {
                background: linear-gradient(180deg, #2A56C6, #3367D6);
            }

            /* Add padding indicator when content is scrollable */
            .gm-style .gm-style-iw-d::before {
                content: '';
                display: block;
                height: 1px;
                width: 100%;
                background: transparent;
            }

            .gm-style .gm-style-iw-d::after {
                content: '';
                display: block;
                height: 1px;
                width: 100%;
                background: transparent;
            }

            /* Responsive adjustments */
            @media (max-width: 400px) {
                .enhanced-info-window {
                    max-width: 280px;
                    padding: 10px 10px 10px 10px !important;
                }
                
                .enhanced-marker-container {
                    width: 32px;
                    height: 42px;
                }
                
                .enhanced-marker-pin {
                    width: 28px;
                    height: 36px;
                }

                .gm-style .gm-style-iw-d::-webkit-scrollbar {
                    width: 6px;
                }
            }

            /* Fix for tail positioning */
            .gm-style .gm-style-iw-t {
                bottom: 0px !important;
                left: 50% !important;
                right: auto !important;
                transform: translateX(-50%) !important;
                width: 20px !important;
                height: 15px !important;
            }

            /* Ensure close button is properly positioned */
            .gm-ui-hover-effect {
                opacity: 0.8 !important;
                top: 8px !important;
                right: 8px !important;
                width: 24px !important;
                height: 24px !important;
                z-index: 1002 !important;
            }

            .gm-ui-hover-effect:hover {
                opacity: 1 !important;
            }
        `;
        document.head.appendChild(style);
    }
}

/**
 * Enhanced searchNearbyBusinesses function to find truly similar businesses
 * @param {google.maps.LatLng} location - Center location
 * @param {string} primaryBusinessType - Primary business type from search results
 */
function searchNearbyBusinesses(location, primaryBusinessType) {
    try {
        console.log("Searching for nearby similar businesses near", location.lat(), location.lng());
        console.log("Primary business type:", primaryBusinessType);

        // Get similar business types based on the primary type
        const similarTypes = getSimilarBusinessTypes(primaryBusinessType);
        console.log("Looking for similar business types:", similarTypes);

        if (similarTypes.length === 0) {
            console.log("No similar business types defined for:", primaryBusinessType);
            return;
        }

        // Get base URL
        const baseURL = getBaseURL();

        // Search for each similar business type
        const searchPromises = similarTypes.map(businessType => {
            const apiURL = `${baseURL}/api/business.js?operation=search&type=${businessType}&lat=${location.lat()}&lng=${location.lng()}&radius=15`;
            console.log("Searching for similar businesses:", apiURL);

            return fetch(apiURL)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Failed to fetch businesses of type ${businessType}: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => ({
                    businessType: businessType,
                    results: data.results || []
                }));
        });

        // Execute all searches in parallel
        Promise.all(searchPromises)
            .then(searchResults => {
                // Combine all results
                let allSimilarBusinesses = [];
                searchResults.forEach(result => {
                    if (result.results.length > 0) {
                        console.log(`Found ${result.results.length} businesses of type ${result.businessType}`);
                        allSimilarBusinesses = allSimilarBusinesses.concat(result.results);
                    }
                });

                if (allSimilarBusinesses.length === 0) {
                    console.log("No similar businesses found in the area");
                    return;
                }

                console.log(`Found ${allSimilarBusinesses.length} total potential similar businesses`);

                // Filter out businesses already on the map (avoid duplicates)
                const existingBusinessIds = markers.map(marker => marker.business?._id).filter(id => id);
                const existingBusinessNames = markers.map(marker => marker.business?.bname.toLowerCase()).filter(name => name);

                const newSimilarBusinesses = allSimilarBusinesses.filter(business => {
                    // Exclude if already displayed by ID
                    if (existingBusinessIds.includes(business._id)) {
                        return false;
                    }

                    // Exclude if very similar name (avoid chain duplicates)
                    const businessNameLower = business.bname.toLowerCase();
                    const isDuplicate = existingBusinessNames.some(existingName => {
                        return businessNameLower.includes(existingName) || existingName.includes(businessNameLower);
                    });

                    return !isDuplicate;
                });

                console.log(`${newSimilarBusinesses.length} new similar businesses to add to map`);

                // Add new similar businesses to the map with blue markers
                let addedCount = 0;
                newSimilarBusinesses.forEach(business => {
                    // Mark as nearby similar business for blue marker styling
                    business.isNearby = true;
                    business.isSimilarBusiness = true;

                    // Create marker if business has coordinates
                    const businessLocation = getBusinessLocation(business);
                    if (businessLocation) {
                        const position = new google.maps.LatLng(businessLocation.lat, businessLocation.lng);

                        // Only add if within reasonable distance (15 miles)
                        const distance = google.maps.geometry.spherical.computeDistanceBetween(
                            location,
                            position
                        );

                        if (distance <= 24140) { // 15 miles in meters
                            const marker = createSimilarBusinessMarker(business, position);
                            if (marker) {
                                addedCount++;
                                console.log(`Added similar business: ${business.bname} (${(distance / 1609).toFixed(1)} miles) - ${getBusinessTypeLabel(business.type)}`);
                            }
                        } else {
                            console.log(`Skipping distant similar business: ${business.bname} (${(distance / 1609).toFixed(1)} miles)`);
                        }
                    } else {
                        console.warn(`Similar business ${business.bname} missing coordinates`);
                    }
                });

                console.log(`Added ${addedCount} similar businesses with blue markers`);
            })
            .catch(error => {
                console.error("Error searching for similar businesses:", error);
            });

    } catch (error) {
        console.error("Error in searchNearbyBusinesses:", error);
    }
}

/**
 * Get similar business types for a given primary type
 * @param {string} primaryType - Primary business type
 * @returns {Array} Array of similar business type codes
 */
function getSimilarBusinessTypes(primaryType) {
    const similarBusinessMap = {
        // Hardware stores - compete with each other
        'HARDW': ['HARDW', 'DEPT'], // Include department stores that sell hardware

        // Restaurants - group by general category
        'REST': ['REST'], // All restaurants are similar

        // Grocery stores
        'GROC': ['GROC', 'CONV'], // Grocery and convenience stores

        // Department stores
        'DEPT': ['DEPT', 'RETAIL', 'HARDW'], // Department stores, retail, and hardware

        // Clothing stores
        'CLTH': ['CLTH', 'DEPT'], // Clothing and department stores

        // Electronics
        'ELEC': ['ELEC', 'DEPT', 'TECH'], // Electronics, department, and tech stores

        // Furniture
        'FURN': ['FURN', 'DEPT'], // Furniture and department stores

        // Automotive
        'AUTO': ['AUTO', 'FUEL'], // Auto services and fuel stations

        // Health and beauty
        'BEAU': ['BEAU', 'RX'], // Beauty and pharmacy
        'RX': ['RX', 'BEAU', 'GROC'], // Pharmacy, beauty, and grocery (many have pharmacies)

        // Entertainment
        'ENTR': ['ENTR'], // Entertainment venues

        // Sporting goods
        'SPRT': ['SPRT', 'DEPT'], // Sporting goods and department stores

        // Gas stations and convenience
        'FUEL': ['FUEL', 'CONV'], // Fuel and convenience stores
        'CONV': ['CONV', 'FUEL', 'GROC'], // Convenience, fuel, and small grocery

        // Services
        'SERV': ['SERV'], // General services

        // Default fallback
        'OTHER': ['OTHER', 'RETAIL']
    };

    // Get similar types, excluding the exact same type to avoid duplicates
    const similarTypes = similarBusinessMap[primaryType] || [primaryType];

    // Remove the primary type itself to avoid finding the same businesses again
    return similarTypes.filter(type => type !== primaryType);
}

/**
 * Extract location from business object (handles different coordinate formats)
 * @param {Object} business - Business object
 * @returns {Object|null} Object with lat/lng or null if invalid
 */
function getBusinessLocation(business) {
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
        return null;
    }

    // Validate coordinates
    if (isNaN(lat) || isNaN(lng)) {
        return null;
    }

    return {lat, lng};
}

/**
 * Create a blue marker for similar businesses
 * @param {Object} business - Business object
 * @param {google.maps.LatLng} position - Marker position
 * @returns {Object} Created marker
 */
function createSimilarBusinessMarker(business, position) {
    try {
        // Update business coordinates
        business.lat = position.lat();
        business.lng = position.lng();

        // Use the enhanced marker creation but force blue color
        return createEnhancedBusinessMarker(business, position, true); // true = force nearby/blue styling
    } catch (error) {
        console.error("Error creating similar business marker:", error);
        return createEnhancedFallbackMarker(business, position);
    }
}

/**
 * Update the enhanced marker creation to support forced nearby styling
 * @param {Object} business - Business object
 * @param {Object} location - Google Maps location object
 * @param {boolean} forceNearby - Force blue/nearby styling
 */
async function createEnhancedBusinessMarker(business, location, forceNearby = false) {
    try {
        // Import the marker library
        const {AdvancedMarkerElement} = await google.maps.importLibrary("marker");

        // Create a position object from the location
        let position = createSafeLatLng(location);
        if (!position) {
            console.error("Invalid position for enhanced marker:", location);
            return createEnhancedFallbackMarker(business, location);
        }

        // Determine marker styling
        const isFromDatabase = !business.isGooglePlace;
        const isNearby = forceNearby || business.isNearby === true || business.isSimilarBusiness === true;

        // Choose marker color and style
        let markerColor, markerClass;
        if (isNearby || business.isSimilarBusiness) {
            markerColor = CONFIG.markerColors.nearby; // Blue for nearby/similar businesses
            markerClass = "nearby";
        } else if (isFromDatabase) {
            markerColor = CONFIG.markerColors.primary; // Red for primary search results
            markerClass = "primary";
        } else {
            markerColor = CONFIG.markerColors.nearby; // Blue for Google Places
            markerClass = "nearby";
        }

        // Get business icon
        const businessIcon = getBusinessTypeTextIcon(business.type);

        // Create enhanced pin element
        const pinElement = document.createElement('div');
        pinElement.className = 'enhanced-custom-marker';
        pinElement.setAttribute('title', business.bname);
        pinElement.style.cursor = 'pointer';

        // Enhanced marker HTML with better styling
        pinElement.innerHTML = `
            <div class="enhanced-marker-container">
                <div class="enhanced-marker-pin ${markerClass}" style="background-color: ${markerColor};">
                    <div class="enhanced-marker-icon">
                        ${businessIcon}
                    </div>
                </div>
                <div class="enhanced-marker-shadow"></div>
                ${business.chain_id ? '<div class="chain-indicator">⭐</div>' : ''}
                ${business.isSimilarBusiness ? '<div class="similar-indicator">≈</div>' : ''}
            </div>
        `;

        // Create the advanced marker
        const marker = new AdvancedMarkerElement({
            position: position,
            map: map,
            title: business.bname,
            content: pinElement,
            collisionBehavior: isFromDatabase ? 'REQUIRED_AND_HIDES_OPTIONAL' : 'OPTIONAL_AND_HIDES_LOWER_PRIORITY'
        });

        // Store the business data and position
        marker.business = business;
        marker.position = position;
        marker.isFromDatabase = isFromDatabase;
        marker.isSimilarBusiness = business.isSimilarBusiness || forceNearby;

        // Add click event listener
        pinElement.addEventListener('click', function (e) {
            console.log("Enhanced similar business marker clicked:", business.bname);
            e.stopPropagation();
            showEnhancedInfoWindow(marker);
        });

        // Add hover effects
        pinElement.addEventListener('mouseenter', function () {
            pinElement.style.transform = 'scale(1.1)';
            pinElement.style.zIndex = '1000';
        });

        pinElement.addEventListener('mouseleave', function () {
            pinElement.style.transform = 'scale(1)';
            pinElement.style.zIndex = 'auto';
        });

        // Add the marker to our array
        markers.push(marker);
        console.log(`Added enhanced ${business.isSimilarBusiness ? 'similar business' : ''} marker for ${business.bname}`);

        return marker;
    } catch (error) {
        console.error("Error creating enhanced marker:", error);
        return createEnhancedFallbackMarker(business, location);
    }
}

/**
 * Enhanced chain database with comprehensive name variations
 * This should eventually be moved to your database, but for now we'll handle it client-side
 */
const COMPREHENSIVE_CHAIN_DATABASE = {
    // Home Depot variations
    'homedepot': {
        id: '681fe0e67d92c3d3e1e2a3da',
        canonicalName: 'The Home Depot',
        variations: [
            'home depot',
            'the home depot',
            'homedepot',
            'home depot store',
            'the home depot store'
        ],
        keywords: ['home', 'depot', 'hardware', 'improvement']
    },

    // Olive Garden variations
    'olivegardenitalian': {
        id: 'olive_garden_chain_id', // Replace with your actual Olive Garden chain ID
        canonicalName: 'Olive Garden',
        variations: [
            'olive garden',
            'olive garden italian restaurant',
            'olive garden italian',
            'olivegarden',
            'olive garden restaurant'
        ],
        keywords: ['olive', 'garden', 'italian', 'restaurant', 'pasta']
    },

    // Lowe's variations
    'lowes': {
        id: 'lowes_chain_id',
        canonicalName: 'Lowe\'s',
        variations: [
            'lowes',
            'lowe\'s',
            'lowes home improvement',
            'lowe\'s home improvement',
            'lowes companies',
            'lowe\'s companies'
        ],
        keywords: ['lowes', 'lowe\'s', 'home', 'improvement', 'hardware']
    },

    // McDonald's variations
    'mcdonalds': {
        id: 'mcdonalds_chain_id',
        canonicalName: 'McDonald\'s',
        variations: [
            'mcdonalds',
            'mcdonald\'s',
            'mickey d\'s',
            'micky d\'s',
            'mcdonalds restaurant',
            'mcdonald\'s restaurant'
        ],
        keywords: ['mcdonalds', 'mcdonald\'s', 'fast', 'food', 'burger']
    },

    // Walmart variations
    'walmart': {
        id: 'walmart_chain_id',
        canonicalName: 'Walmart',
        variations: [
            'walmart',
            'wal-mart',
            'walmart supercenter',
            'wal-mart supercenter',
            'walmart store',
            'wal-mart store'
        ],
        keywords: ['walmart', 'wal-mart', 'supercenter', 'retail']
    },

    // Target variations
    'target': {
        id: 'target_chain_id',
        canonicalName: 'Target',
        variations: [
            'target',
            'target store',
            'target corporation',
            'target retail'
        ],
        keywords: ['target', 'retail', 'store']
    },

    // Best Buy variations
    'bestbuy': {
        id: 'bestbuy_chain_id',
        canonicalName: 'Best Buy',
        variations: [
            'best buy',
            'bestbuy',
            'best buy store',
            'bestbuy store'
        ],
        keywords: ['best', 'buy', 'electronics', 'tech']
    },

    // Starbucks variations
    'starbucks': {
        id: 'starbucks_chain_id',
        canonicalName: 'Starbucks',
        variations: [
            'starbucks',
            'starbucks coffee',
            'starbucks corporation',
            'starbucks store'
        ],
        keywords: ['starbucks', 'coffee', 'cafe']
    }
};

/**
 * Advanced fuzzy matching algorithm
 * @param {string} searchTerm - The term to search for
 * @param {string} targetTerm - The term to match against
 * @returns {number} Similarity score between 0 and 1
 */
function calculateSimilarity(searchTerm, targetTerm) {
    if (!searchTerm || !targetTerm) return 0;

    const search = searchTerm.toLowerCase().trim();
    const target = targetTerm.toLowerCase().trim();

    // Exact match
    if (search === target) return 1.0;

    // One contains the other
    if (search.includes(target) || target.includes(search)) {
        return 0.9;
    }

    // Levenshtein distance for fuzzy matching
    const distance = levenshteinDistance(search, target);
    const maxLength = Math.max(search.length, target.length);
    const similarity = 1 - (distance / maxLength);

    return Math.max(0, similarity);
}

/**
 * Calculate Levenshtein distance between two strings
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Edit distance
 */
function levenshteinDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    matrix[i][j - 1] + 1,     // insertion
                    matrix[i - 1][j] + 1      // deletion
                );
            }
        }
    }

    return matrix[str2.length][str1.length];
}

/**
 * Extract key words from a business name for matching
 * @param {string} businessName - Business name to extract keywords from
 * @returns {Array} Array of keywords
 */
function extractKeywords(businessName) {
    if (!businessName) return [];

    const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'up', 'about', 'into', 'over', 'after', 'store', 'restaurant', 'inc', 'llc', 'corp', 'company', 'companies'];

    return businessName
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
        .split(/\s+/)
        .filter(word => word.length > 1 && !commonWords.includes(word))
        .filter(Boolean);
}

/**
 * Enhanced chain matching with comprehensive fuzzy logic
 * @param {string} placeName - Name from Google Places
 * @returns {Promise<Object|null>} Matching chain or null
 */
async function findMatchingChainForPlaceResult(placeName) {
    try {
        if (!placeName) return null;

        console.log("🔍 Advanced chain matching for:", placeName);

        const cleanPlaceName = placeName.trim();
        let bestMatch = null;
        let bestScore = 0;
        const minimumScore = 0.7; // Threshold for accepting a match

        // Step 1: Try server-side exact matches first
        try {
            const serverMatch = await tryServerSideChainMatching(cleanPlaceName);
            if (serverMatch) {
                console.log("✅ Server-side exact match found:", serverMatch.bname);
                return serverMatch;
            }
        } catch (error) {
            console.warn("Server-side matching failed, using local matching:", error.message);
        }

        // Step 2: Advanced local fuzzy matching
        const searchKeywords = extractKeywords(cleanPlaceName);
        console.log("🏷️ Search keywords:", searchKeywords);

        for (const [key, chainData] of Object.entries(COMPREHENSIVE_CHAIN_DATABASE)) {
            // Test against all variations
            for (const variation of chainData.variations) {
                const score = calculateSimilarity(cleanPlaceName, variation);

                if (score > bestScore && score >= minimumScore) {
                    bestScore = score;
                    bestMatch = {
                        _id: chainData.id,
                        bname: chainData.canonicalName,
                        matchType: 'variation',
                        matchScore: score,
                        matchedVariation: variation
                    };
                }
            }

            // Test against keywords
            const keywordMatches = searchKeywords.filter(keyword =>
                chainData.keywords.some(chainKeyword =>
                    calculateSimilarity(keyword, chainKeyword) >= 0.8
                )
            );

            if (keywordMatches.length >= 2) { // Need at least 2 keyword matches
                const keywordScore = 0.8; // High confidence for multiple keyword matches

                if (keywordScore > bestScore) {
                    bestScore = keywordScore;
                    bestMatch = {
                        _id: chainData.id,
                        bname: chainData.canonicalName,
                        matchType: 'keywords',
                        matchScore: keywordScore,
                        matchedKeywords: keywordMatches
                    };
                }
            }
        }

        if (bestMatch) {
            console.log(`🎯 Best match found: "${cleanPlaceName}" → "${bestMatch.bname}" (${bestMatch.matchType}, score: ${bestMatch.matchScore.toFixed(2)})`);

            // Try to get the actual chain data from your database
            try {
                const dbChainData = await getChainFromDatabase(bestMatch.bname);
                if (dbChainData) {
                    return dbChainData;
                }
            } catch (dbError) {
                console.warn("Could not fetch chain from database:", dbError);
            }

            // Return our local match if database lookup fails
            return bestMatch;
        }

        console.log("❌ No suitable chain match found for:", cleanPlaceName);
        return null;

    } catch (error) {
        console.error("Error in advanced chain matching:", error);
        return null;
    }
}

/**
 * Try server-side chain matching with variations
 * @param {string} placeName - Place name to match
 * @returns {Promise<Object|null>} Chain data or null
 */
async function tryServerSideChainMatching(placeName) {
    const baseURL = getBaseURL();
    const variations = generateNameVariations(placeName);
    const allNames = [placeName, ...variations];

    for (const name of allNames) {
        try {
            const response = await fetch(`${baseURL}/api/business.js?operation=find_matching_chain&place_name=${encodeURIComponent(name)}`);

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.chain) {
                    console.log(`Server match found with "${name}":`, data.chain.bname);
                    return data.chain;
                }
            }
        } catch (error) {
            continue; // Try next variation
        }
    }

    return null;
}

/**
 * Get chain data from your database by name
 * @param {string} chainName - Canonical chain name
 * @returns {Promise<Object|null>} Chain data from database
 */
async function getChainFromDatabase(chainName) {
    try {
        const baseURL = getBaseURL();

        // Try searching for the chain by name
        const response = await fetch(`${baseURL}/api/business.js?operation=search&business_name=${encodeURIComponent(chainName)}&is_chain=true`);

        if (response.ok) {
            const data = await response.json();
            if (data.results && data.results.length > 0) {
                // Find the chain (not a location)
                const chainBusiness = data.results.find(b => b.is_chain === true);
                if (chainBusiness) {
                    return {
                        _id: chainBusiness._id,
                        bname: chainBusiness.bname
                    };
                }
            }
        }

        return null;
    } catch (error) {
        console.error("Error fetching chain from database:", error);
        return null;
    }
}

/**
 * Enhanced name variations generator
 * @param {string} placeName - Original place name
 * @returns {Array} Array of name variations
 */
function generateNameVariations(placeName) {
    const variations = [];
    const lowerName = placeName.toLowerCase();

    // Add/remove "The"
    if (lowerName.startsWith('the ')) {
        variations.push(placeName.substring(4));
    } else {
        variations.push('The ' + placeName);
    }

    // Remove common business suffixes
    const suffixesToRemove = [
        ' italian restaurant',
        ' italian',
        ' restaurant',
        ' store',
        ' location',
        ' home improvement',
        ' companies',
        ' corporation',
        ' corp',
        ' inc',
        ' llc'
    ];

    suffixesToRemove.forEach(suffix => {
        if (lowerName.includes(suffix.toLowerCase())) {
            variations.push(placeName.replace(new RegExp(suffix, 'gi'), '').trim());
        }
    });

    // Add common suffixes
    const suffixesToAdd = [
        ' restaurant',
        ' store'
    ];

    suffixesToAdd.forEach(suffix => {
        if (!lowerName.includes(suffix.toLowerCase())) {
            variations.push(placeName + suffix);
        }
    });

    // Remove duplicates and return
    return [...new Set(variations)].filter(v => v !== placeName);
}

/**
 * Enhanced search function that handles partial names better
 * @param {Object} formData - Form data with search parameters
 * @param {boolean} bustCache - Whether to bust cache
 */
async function retrieveFromMongoDB(formData, bustCache = false) {
    try {
        console.log("🔍 Starting enhanced search with form data:", formData);

        // Show loading indicator
        const resultsContainer = document.getElementById('business-search-results') ||
            document.getElementById('search_table');
        if (resultsContainer) {
            resultsContainer.innerHTML = '<div class="loading-indicator" id="main-loading">Searching for businesses...</div>';
            resultsContainer.style.display = 'block';
        }

        // Process search location first
        let searchLocation = null;

        if (formData.useMyLocation) {
            try {
                updateLoadingMessage("Getting your location...");
                searchLocation = await getUserLocation();
                window.currentSearchLocation = searchLocation;
            } catch (error) {
                console.error("Error getting user location:", error);
                hideLoadingIndicator();
                alert("Unable to get your current location. Please try entering an address instead.");
                return;
            }
        } else if (formData.address && formData.address.trim() !== '') {
            try {
                updateLoadingMessage("Finding location...");
                const geocodedLocation = await geocodeAddressClientSide(formData.address);
                if (geocodedLocation && geocodedLocation.lat && geocodedLocation.lng) {
                    searchLocation = geocodedLocation;
                    window.currentSearchLocation = searchLocation;

                    if (map && searchLocation) {
                        const center = new google.maps.LatLng(searchLocation.lat, searchLocation.lng);
                        map.setCenter(center);
                        map.setZoom(11);
                    }
                } else {
                    throw new Error(`Geocoding failed for address: ${formData.address}`);
                }
            } catch (error) {
                console.error("Error geocoding address:", error);
                hideLoadingIndicator();
                alert("We couldn't recognize that address. Please try a more specific address.");
                return;
            }
        }

        // Update loading message
        updateLoadingMessage("Searching database...");

        // Enhanced database search
        const dbResults = await searchDatabaseWithFuzzyMatching(formData, searchLocation, bustCache);

        console.log(`📊 Database search returned ${dbResults.length} businesses`);

        // Analyze results
        let nearbyBusinesses = [];
        let distantBusinesses = [];

        if (dbResults && dbResults.length > 0) {
            dbResults.forEach(business => {
                const businessLocation = getBusinessLocation(business);
                if (!businessLocation || !searchLocation) {
                    distantBusinesses.push(business);
                    return;
                }

                const businessLatLng = new google.maps.LatLng(businessLocation.lat, businessLocation.lng);
                const searchLatLng = new google.maps.LatLng(searchLocation.lat, searchLocation.lng);
                const distance = google.maps.geometry.spherical.computeDistanceBetween(businessLatLng, searchLatLng);
                const distanceInMiles = distance * 0.000621371;

                if (distanceInMiles <= 50) {
                    nearbyBusinesses.push(business);
                } else {
                    distantBusinesses.push(business);
                }
            });
        }

        console.log(`📍 Location analysis: ${nearbyBusinesses.length} nearby, ${distantBusinesses.length} distant`);

        // ENHANCED LOGIC: Always show database results first, then supplement with Google Places
        const allDatabaseBusinesses = [...nearbyBusinesses, ...distantBusinesses];

        if (allDatabaseBusinesses.length > 0) {
            console.log("✅ Found businesses in database, displaying those first");

            // Update loading message
            updateLoadingMessage("Loading results...");

            // Hide loading indicator before displaying results
            hideLoadingIndicator();

            // Display database results
            displayBusinessesOnMap(allDatabaseBusinesses);
            displaySearchResults(allDatabaseBusinesses);

            // If we have a search location but no nearby database businesses, supplement with Google Places
            if (searchLocation && nearbyBusinesses.length === 0 && formData.businessName) {
                console.log("🌐 No nearby database businesses, supplementing with Google Places");
                await supplementWithGooglePlaces(formData.businessName, searchLocation, allDatabaseBusinesses);
            }

            // Search for similar businesses
            if (searchLocation) {
                const searchLatLng = new google.maps.LatLng(searchLocation.lat, searchLocation.lng);
                const businessType = allDatabaseBusinesses[0].type || 'OTHER';
                searchNearbyBusinesses(searchLatLng, businessType);
            }

        } else if (formData.businessName && searchLocation) {
            // No database results, search Google Places
            console.log("🌐 No database businesses found, searching Google Places");

            updateLoadingMessage("Searching Google Places...");

            try {
                const placesResults = await searchGooglePlacesForBusiness(formData.businessName, searchLocation);

                if (placesResults && placesResults.length > 0) {
                    console.log(`📍 Found ${placesResults.length} businesses via Google Places`);

                    updateLoadingMessage("Loading results...");
                    hideLoadingIndicator();

                    displayBusinessesOnMap(placesResults);
                    displaySearchResults(placesResults);
                } else {
                    hideLoadingIndicator();
                    showNoResultsMessage();
                }
            } catch (placesError) {
                console.error("Error searching Google Places:", placesError);
                hideLoadingIndicator();
                showErrorMessage("Error searching for businesses. Please try again.");
            }
        } else {
            // No results found
            hideLoadingIndicator();
            showNoResultsMessage();
        }
    } catch (error) {
        console.error("Enhanced search error:", error);
        hideLoadingIndicator();
        showErrorMessage(`Error searching for businesses: ${error.message}`);
    }
}

/**
 * Supplement database results with Google Places when needed
 * @param {string} businessName - Business name to search for
 * @param {Object} searchLocation - Search location
 * @param {Array} existingBusinesses - Existing database businesses
 */
async function supplementWithGooglePlaces(businessName, searchLocation, existingBusinesses) {
    try {
        console.log("🔍 Supplementing with Google Places for:", businessName);

        const placesResults = await searchGooglePlacesForBusiness(businessName, searchLocation);

        if (placesResults && placesResults.length > 0) {
            console.log(`📍 Found ${placesResults.length} additional businesses via Google Places`);

            // Filter out Google Places that might duplicate existing database businesses
            const existingAddresses = existingBusinesses.map(b =>
                `${b.address1} ${b.city} ${b.state}`.toLowerCase().replace(/\s+/g, ' ')
            );

            const newPlacesResults = placesResults.filter(place => {
                const placeAddress = `${place.address1} ${place.city} ${place.state}`.toLowerCase().replace(/\s+/g, ' ');
                return !existingAddresses.some(existingAddr =>
                    existingAddr.includes(placeAddress) || placeAddress.includes(existingAddr)
                );
            });

            if (newPlacesResults.length > 0) {
                console.log(`📍 Adding ${newPlacesResults.length} new Google Places results`);

                // Add Google Places markers to the map
                newPlacesResults.forEach(business => {
                    createBusinessMarker(business);
                });

                // Update the table to include Google Places results
                const allResults = [...existingBusinesses, ...newPlacesResults];
                displaySearchResults(allResults);
            }
        }
    } catch (error) {
        console.error("Error supplementing with Google Places:", error);
        // Don't fail the whole search if supplemental search fails
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

    console.log(`🎁 Fetching incentives for business: ${businessId}, chain: ${chainId}`);

    // Determine the base URL
    const baseURL = getBaseURL();

    // Build the API URL
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
                console.log(`No incentives found for business ${businessId}`);
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
                            ${incentive.information ? `<div class="incentive-info">${incentive.information}</div>` : ''}
                        </div>
                    `;
                }
            });

            if (incentivesHTML === '') {
                incentivesCell.innerHTML = 'No active incentives found';
            } else {
                incentivesCell.innerHTML = incentivesHTML;
            }

            console.log(`✅ Successfully loaded incentives for business ${businessId}`);
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
 * Helper function to add a business row to the table
 * @param {Object} business - Business object
 * @param {Element} tableBody - Table body element
 * @param {boolean} isFromPlaces - Whether this business is from Places API
 */
function addBusinessRow(business, tableBody, isFromPlaces) {
    if (!business) return;

    // Skip parent chain businesses
    if (business.is_chain === true) {
        console.log(`Skipping parent chain business in table: ${business.bname}`);
        return;
    }

    // Ensure we have valid address information for display
    let addressLine = '';

    if (business.address1) {
        addressLine = business.address2 ?
            `${business.address1}<br>${business.address2}<br>${business.city}, ${business.state} ${business.zip}` :
            `${business.address1}<br>${business.city}, ${business.state} ${business.zip}`;
    } else if (business.formattedAddress) {
        addressLine = business.formattedAddress.replace(/,/g, '<br>');
    } else {
        console.warn(`Business ${business.bname} has no address information`);
        return;
    }

    // Convert business type to readable label
    const businessType = getBusinessTypeLabel(business.type);

    // Check business type and create badges
    const isChainLocation = !!business.chain_id;
    const isGooglePlace = !!business.isGooglePlace;

    // Create chain badge - only for chain locations
    let chainBadge = '';
    if (isChainLocation) {
        chainBadge = '<span class="chain-badge">Chain Location</span>';
    }

    // Create appropriate action button
    let actionButton;

    if (isGooglePlace) {
        if (isChainLocation) {
            actionButton = `<button class="add-to-db-btn" onclick="addBusinessToDatabase('${business.placeId || ''}', '${business.chain_id || ''}')">Add Chain Location</button>`;
        } else {
            actionButton = `<button class="add-to-db-btn" onclick="addBusinessToDatabase('${business.placeId || ''}')">Add to Database</button>`;
        }
    } else {
        // Database business - regular view on map button
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

    // ENHANCED: Handle incentives lookup with better debugging
    if (isFromPlaces && isChainLocation) {
        console.log(`🔗 Loading chain incentives for Google Places result: ${business.bname}`);
        fetchChainIncentivesForPlacesResult(business._id, business.chain_id);
    } else if (!isGooglePlace) {
        console.log(`🏢 Loading incentives for database business: ${business.bname} (ID: ${business._id})`);
        // Add a small delay to ensure the DOM element is ready
        setTimeout(() => {
            fetchBusinessIncentives(business._id, business.chain_id);
        }, 100);
    }
}

/**
 * Enhanced createBusinessMarker to ensure database businesses get red markers
 */
function createBusinessMarker(business) {
    try {
        console.log(`🔍 MARKER DEBUG: Creating marker for ${business.bname}`);
        console.log(`   - isGooglePlace: ${business.isGooglePlace}`);
        console.log(`   - _id: ${business._id}`);
        console.log(`   - Source: ${business._id?.startsWith('google_') ? 'GOOGLE PLACES' : 'DATABASE'}`);

        // Validate coordinates
        if (!business.lat || !business.lng ||
            isNaN(parseFloat(business.lat)) || isNaN(parseFloat(business.lng))) {
            console.warn(`❌ Invalid coordinates for business: ${business.bname}`);
            return null;
        }

        // Create position
        const position = new google.maps.LatLng(
            parseFloat(business.lat),
            parseFloat(business.lng)
        );

        // CRITICAL FIX: Properly determine if this is a database business
        const isFromDatabase = !business.isGooglePlace && !business._id?.startsWith('google_');

        // Set proper flags on business object
        business.isFromDatabase = isFromDatabase;
        business.isGooglePlace = !isFromDatabase;

        console.log(`🏷️ FINAL DETERMINATION: ${business.bname} → ${isFromDatabase ? 'DATABASE (RED MARKER)' : 'GOOGLE PLACES (BLUE MARKER)'}`);

        // Use enhanced marker creation with explicit color forcing
        const marker = createEnhancedBusinessMarkerFixed(business, position, isFromDatabase);

        // Add to bounds if successful
        if (marker && bounds) {
            bounds.extend(position);
        }

        return marker;
    } catch (error) {
        console.error("❌ Error creating business marker:", error);
        return null;
    }
}

function fetchBusinessIncentivesFixed(businessId, chainId = null) {
    if (!businessId || businessId.startsWith('google_')) {
        console.log(`⏭️ Skipping incentives for Google Places business: ${businessId}`);
        return;
    }

    console.log(`🎁 INCENTIVES DEBUG: Fetching for business ID: ${businessId}`);
    console.log(`   - Chain ID: ${chainId || 'None'}`);

    // Wait for DOM to be ready
    setTimeout(() => {
        const incentivesCell = document.getElementById(`incentives-for-${businessId}`);

        if (!incentivesCell) {
            console.error(`❌ Could not find incentives cell for business ${businessId}`);
            console.log(`   - Looking for element ID: incentives-for-${businessId}`);

            // Debug: List all incentives containers
            const allIncentiveElements = document.querySelectorAll('[id*="incentives-for"]');
            console.log(`🔍 Available incentive elements:`, Array.from(allIncentiveElements).map(el => el.id));
            return;
        }

        console.log(`✅ Found incentives cell for ${businessId}`);
        incentivesCell.innerHTML = '<span class="loading-incentives">Loading incentives...</span>';

        // Determine the base URL
        const baseURL = getBaseURL();
        const apiURL = `${baseURL}/api/combined-api.js?operation=incentives&business_id=${businessId}`;

        console.log(`🌐 Fetching incentives from: ${apiURL}`);

        fetch(apiURL)
            .then(response => {
                console.log(`📡 Incentives API response status: ${response.status}`);
                if (!response.ok) {
                    throw new Error(`Failed to fetch incentives: ${response.status} ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                console.log(`📊 Incentives data for business ${businessId}:`, data);

                // Check if there are any incentives
                if (!data.results || data.results.length === 0) {
                    console.log(`ℹ️ No incentives found for business ${businessId}`);
                    incentivesCell.innerHTML = '<em style="color: #666;">No incentives available</em>';
                    return;
                }

                // Build HTML for the incentives
                let incentivesHTML = '';
                let activeIncentivesCount = 0;

                data.results.forEach(incentive => {
                    if (incentive.is_available) {
                        activeIncentivesCount++;
                        const typeLabel = getIncentiveTypeLabel(incentive.type);
                        const otherDescription = incentive.other_description ?
                            ` (${incentive.other_description})` : '';

                        // Add a badge for chain-wide incentives
                        const chainBadge = incentive.is_chain_wide ?
                            '<span class="chain-badge small">Chain-wide</span>' : '';

                        incentivesHTML += `
                            <div class="incentive-item">
                                <strong>${typeLabel}${otherDescription}:</strong> ${incentive.amount}% ${chainBadge}
                                ${incentive.information ? `<div class="incentive-info">${incentive.information}</div>` : ''}
                            </div>
                        `;
                    }
                });

                if (activeIncentivesCount === 0) {
                    incentivesCell.innerHTML = '<em style="color: #666;">No active incentives found</em>';
                } else {
                    incentivesCell.innerHTML = incentivesHTML;
                    console.log(`✅ Successfully loaded ${activeIncentivesCount} incentives for business ${businessId}`);
                }
            })
            .catch(error => {
                console.error(`❌ Error fetching incentives for business ${businessId}:`, error);
                incentivesCell.innerHTML = '<span class="incentives-error">Error loading incentives</span>';
            });
    }, 200); // Increased delay to ensure DOM elements are ready
}

function addBusinessRowFixed(business, tableBody, isFromPlaces) {
    if (!business) return;

    // Skip parent chain businesses
    if (business.is_chain === true) {
        console.log(`⏭️ Skipping parent chain business in table: ${business.bname}`);
        return;
    }

    console.log(`📝 Adding table row for: ${business.bname}`);
    console.log(`   - Is from Places: ${isFromPlaces}`);
    console.log(`   - Business ID: ${business._id}`);
    console.log(`   - Is chain location: ${!!business.chain_id}`);

    // Format address
    let addressLine = '';
    if (business.address1) {
        addressLine = business.address2 ?
            `${business.address1}<br>${business.address2}<br>${business.city}, ${business.state} ${business.zip}` :
            `${business.address1}<br>${business.city}, ${business.state} ${business.zip}`;
    } else if (business.formattedAddress) {
        addressLine = business.formattedAddress.replace(/,/g, '<br>');
    } else {
        console.warn(`❌ Business ${business.bname} has no address information`);
        return;
    }

    // Convert business type to readable label
    const businessType = getBusinessTypeLabel(business.type);

    // Check business type and create badges
    const isChainLocation = !!business.chain_id;
    const isGooglePlace = !!business.isGooglePlace;

    // Create chain badge
    let chainBadge = '';
    if (isChainLocation) {
        chainBadge = '<span class="chain-badge">Chain Location</span>';
    }

    // Create appropriate action button
    let actionButton;
    if (isGooglePlace) {
        if (isChainLocation) {
            actionButton = `<button class="add-to-db-btn" onclick="addBusinessToDatabase('${business.placeId || ''}', '${business.chain_id || ''}')">Add Chain Location</button>`;
        } else {
            actionButton = `<button class="add-to-db-btn" onclick="addBusinessToDatabase('${business.placeId || ''}')">Add to Database</button>`;
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
            ${isFromPlaces && !isChainLocation ? 'Not in database yet' : '<span class="loading-incentives">Loading incentives...</span>'}
        </th>
        <th class="center_table">${actionButton}</th>
    `;

    tableBody.appendChild(row);

    // CRITICAL FIX: Handle incentives loading properly
    if (!isGooglePlace) {
        console.log(`🎁 Scheduling incentives load for database business: ${business.bname} (ID: ${business._id})`);
        // Use the fixed incentives function
        fetchBusinessIncentivesFixed(business._id, business.chain_id);
    } else if (isChainLocation) {
        console.log(`🔗 Scheduling chain incentives load for Google Places: ${business.bname}`);
        fetchChainIncentivesForPlacesResult(business._id, business.chain_id);
    } else {
        console.log(`ℹ️ No incentives to load for non-chain Google Places: ${business.bname}`);
    }
}

/**
 * Update the loading message
 * @param {string} message - New loading message
 */
function updateLoadingMessage(message) {
    const loadingIndicator = document.getElementById('main-loading');
    if (loadingIndicator) {
        loadingIndicator.innerHTML = `<div class="loading-text">${message}</div><div class="loading-spinner"></div>`;
    }
}

function hideLoadingIndicator() {
    const loadingIndicator = document.getElementById('main-loading');
    if (loadingIndicator) loadingIndicator.remove();

    const allLoadingIndicators = document.querySelectorAll('.loading-indicator');
    allLoadingIndicators.forEach(indicator => {
        if (indicator.id === 'main-loading' || indicator.textContent.includes('Searching')) {
            indicator.remove();
        }
    });
}

function showNoResultsMessage() {
    hideLoadingIndicator();
    const resultsContainer = document.getElementById('business-search-results') || document.getElementById('search_table');
    if (resultsContainer) {
        resultsContainer.innerHTML = '<div class="error-message">No businesses found matching your search criteria in this area.</div>';
        resultsContainer.style.display = 'block';
    }
}

function showErrorMessage(message) {
    hideLoadingIndicator();
    const resultsContainer = document.getElementById('business-search-results') || document.getElementById('search_table');
    if (resultsContainer) {
        resultsContainer.innerHTML = `<div class="error-message">${message}</div>`;
        resultsContainer.style.display = 'block';
    }
}

/**
 * Search database with fuzzy matching capabilities
 * @param {Object} formData - Form data
 * @param {Object} searchLocation - Search location
 * @param {boolean} bustCache - Cache busting flag
 * @returns {Promise<Array>} Search results
 */
async function searchDatabaseWithFuzzyMatching(formData, searchLocation, bustCache) {
    const params = {};

    if (formData.businessName && formData.businessName.trim() !== '') {
        params.business_name = formData.businessName;
    }

    if (formData.address && formData.address.trim() !== '' && !searchLocation) {
        params.address = formData.address;
    }

    if (searchLocation && searchLocation.lat && searchLocation.lng) {
        params.lat = searchLocation.lat;
        params.lng = searchLocation.lng;
        params.radius = 25;
    }

    if (bustCache) {
        params.ts = new Date().getTime();
    }

    const queryParams = new URLSearchParams(params).toString();
    const baseURL = getBaseURL();
    const apiURL = `${baseURL}/api/business.js?operation=search&${queryParams}`;

    const response = await fetch(apiURL, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json; charset=UTF-8',
            'Cache-Control': bustCache ? 'no-cache, no-store, must-revalidate' : 'default'
        }
    });

    if (!response.ok) {
        throw new Error(`Database search failed: ${response.status}`);
    }

    const data = await response.json();
    const rawResults = data.results || [];

    // CRITICAL FIX: Filter out parent chain businesses from location-based searches
    const filteredResults = rawResults.filter(business => {
        // Always exclude parent chains (businesses with is_chain: true) from location searches
        if (business.is_chain === true) {
            console.log(`Filtering out parent chain business: ${business.bname}`);
            return false;
        }

        // For location-based searches, ensure business has valid coordinates
        if (searchLocation) {
            const hasValidLocation = hasValidCoordinates(business);
            if (!hasValidLocation) {
                console.log(`Filtering out business without valid coordinates: ${business.bname}`);
                return false;
            }
        }

        return true;
    });

    console.log(`📊 Filtered ${rawResults.length} raw results to ${filteredResults.length} location businesses`);

    return filteredResults;
}

/**
 * Check if a business has valid coordinates
 * @param {Object} business - Business object
 * @returns {boolean} True if business has valid coordinates
 */
function hasValidCoordinates(business) {
    // Check direct lat/lng fields
    if (business.lat !== undefined && business.lng !== undefined) {
        const lat = parseFloat(business.lat);
        const lng = parseFloat(business.lng);
        return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
    }

    // Check GeoJSON coordinates
    if (business.location && business.location.coordinates &&
        Array.isArray(business.location.coordinates) && business.location.coordinates.length >= 2) {
        const lng = parseFloat(business.location.coordinates[0]);
        const lat = parseFloat(business.location.coordinates[1]);
        return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
    }

    return false;
}

function buildEnhancedInfoWindowContentFixed2(business) {
    const isGooglePlace = business.isGooglePlace === true;
    const isChainLocation = !!business.chain_id;
    const isFromDatabase = !isGooglePlace;

    // Enhanced address formatting
    let addressHTML = '';
    if (business.address1) {
        addressHTML = `<div class="info-address">
            <strong>📍 Address:</strong><br>
            ${business.address1}`;

        if (business.address2) {
            addressHTML += `<br>${business.address2}`;
        }

        const locationParts = [];
        if (business.city) locationParts.push(business.city);
        if (business.state) locationParts.push(business.state);
        if (business.zip) locationParts.push(business.zip);

        if (locationParts.length > 0) {
            addressHTML += `<br>${locationParts.join(', ')}`;
        }

        addressHTML += '</div>';
    } else if (business.formattedAddress) {
        const addressParts = business.formattedAddress.split(',').map(part => part.trim());
        addressHTML = `<div class="info-address">
            <strong>📍 Address:</strong><br>`;

        if (addressParts.length >= 1) {
            addressHTML += addressParts[0];
        }
        if (addressParts.length >= 2) {
            addressHTML += `<br>${addressParts.slice(1).join(', ')}`;
        }

        addressHTML += '</div>';
    }

    // Phone number
    const phoneHTML = business.phone ?
        `<div class="info-phone"><strong>📞 Phone:</strong> <a href="tel:${business.phone.replace(/\D/g, '')}" style="color: #4285F4; text-decoration: none;">${business.phone}</a></div>` : '';

    // Business type
    let typeHTML = '';
    if (business.type && business.type !== 'OTHER') {
        typeHTML = `<div class="info-type"><strong>🏢 Type:</strong> ${getBusinessTypeLabel(business.type)}</div>`;
    }

    // Distance
    const distanceHTML = business.distance ?
        `<div class="info-distance"><strong>📏 Distance:</strong> ${(business.distance / 1609).toFixed(1)} miles</div>` : '';

    // Chain badge
    const chainBadge = isChainLocation ?
        `<span class="enhanced-chain-badge">🔗 ${business.chain_name || 'Chain Location'}</span>` : '';

    // Status and messaging
    let statusHTML = '';
    let chainExplanation = '';

    if (isGooglePlace) {
        if (isChainLocation) {
            statusHTML = '<div class="info-status chain-match">🔗 This location appears to match a chain in our database!</div>';
            chainExplanation = `<div class="chain-explanation">
                ✨ Great news! This location matches <strong>${business.chain_name}</strong> in our database. 
                Chain-wide incentives should apply to this location once added.
            </div>`;
        } else {
            statusHTML = '<div class="info-status google-place">ℹ️ This business is not yet in the Patriot Thanks database.</div>';
        }
    } else {
        statusHTML = '<div class="info-status database-business">✅ This business is in the Patriot Thanks database.</div>';
    }

    // Action button
    let actionButton;
    if (isGooglePlace) {
        if (isChainLocation) {
            actionButton = `
                <button class="enhanced-add-btn chain-add" onclick="window.addBusinessToDatabase('${business.placeId}', '${business.chain_id}')">
                    🔗 Add ${business.chain_name} Location
                </button>
            `;
        } else {
            actionButton = `
                <button class="enhanced-add-btn" onclick="window.addBusinessToDatabase('${business.placeId}')">
                    ➕ Add to Patriot Thanks
                </button>
            `;
        }
    } else {
        actionButton = `
            <button class="enhanced-view-btn" onclick="window.viewBusinessDetails('${business._id}')">
                👁️ View Details
            </button>
        `;
    }

    // CRITICAL FIX: Use consistent container ID format
    // For Google Places: use "google_" + placeId format to match table IDs
    const containerId = isGooglePlace ? `google_${business.placeId}` : business._id;

    console.log(`🆔 INFO WINDOW: Using container ID: ${containerId} for business: ${business.bname}`);

    // FIXED: Incentives messaging with proper chain handling
    let incentivesMessage;
    if (isFromDatabase && isChainLocation) {
        incentivesMessage = '<em>⏳ Loading chain incentives...</em>';
    } else if (isFromDatabase) {
        incentivesMessage = '<em>⏳ Loading incentives...</em>';
    } else if (isGooglePlace && isChainLocation) {
        incentivesMessage = '<em>⏳ Loading chain incentives...</em>';
    } else {
        incentivesMessage = '<em>💡 Add this business to see available incentives.</em>';
    }

    return `
        <div class="enhanced-info-window">
            <div class="info-header">
                <h3>${business.bname} ${chainBadge}</h3>
            </div>
            
            <div class="info-body">
                ${addressHTML}
                ${phoneHTML}
                ${typeHTML}
                ${distanceHTML}
                ${statusHTML}
                ${chainExplanation}
                
                <div class="info-incentives">
                    <div id="incentives-container-${containerId}">
                        ${incentivesMessage}
                    </div>
                </div>
            </div>
            
            <div class="info-actions">
                ${actionButton}
            </div>
        </div>
    `;
}

// FIX 2: Enhanced info window display with consistent container ID handling
function showEnhancedInfoWindowFixed2(marker) {
    console.log("🪟 INFO WINDOW: Showing enhanced info window for:", marker.business?.bname);

    if (!marker || !marker.business) {
        console.error("❌ Invalid marker for info window");
        return;
    }

    const business = marker.business;
    const isGooglePlace = business.isGooglePlace === true;
    const isChainLocation = !!business.chain_id;
    const isFromDatabase = !isGooglePlace;

    // Close existing info window
    if (infoWindow) {
        infoWindow.close();
    }

    // Create new info window
    infoWindow = new google.maps.InfoWindow({
        maxWidth: 320,
        disableAutoPan: false
    });

    // Build enhanced content
    const content = buildEnhancedInfoWindowContentFixed2(business);

    // Set content
    infoWindow.setContent(content);

    // Get position
    let position = marker.position;
    if (!position && marker.getPosition) {
        position = marker.getPosition();
    }
    if (!position) {
        position = createSafeLatLng(business);
    }

    if (!position) {
        console.error("❌ Could not determine position for info window");
        return;
    }

    // Pan to position
    try {
        map.panTo(position);
    } catch (panError) {
        console.warn("⚠️ Error panning to position:", panError);
    }

    // Open info window
    setTimeout(() => {
        try {
            if (marker.getPosition) {
                infoWindow.open(map, marker);
            } else {
                infoWindow.setPosition(position);
                infoWindow.open(map);
            }

            console.log("✅ Info window opened successfully");

            // Load incentives after DOM is ready
            google.maps.event.addListenerOnce(infoWindow, 'domready', function () {
                setTimeout(() => {
                    applyEnhancedInfoWindowFixes();

                    // FIXED: Use consistent container ID logic
                    const containerId = isGooglePlace ? `google_${business.placeId}` : business._id;

                    console.log(`🎁 INCENTIVES: Loading for container ID: ${containerId}`);

                    if (isFromDatabase && isChainLocation) {
                        // Database business with chain - load chain incentives
                        console.log(`🔗 Loading chain incentives for database business: ${business.bname}`);
                        loadChainIncentivesForDatabaseBusinessFixed(containerId, business.chain_id);
                    } else if (isFromDatabase) {
                        // Database business without chain - load regular incentives
                        console.log(`🏢 Loading regular incentives for database business: ${business.bname}`);
                        loadIncentivesForEnhancedWindowFixed(containerId);
                    } else if (isGooglePlace && isChainLocation) {
                        // Google Places with chain - load chain incentives
                        console.log(`🌐 Loading chain incentives for Google Places: ${business.bname}`);
                        loadChainIncentivesForEnhancedWindowFixed(containerId, business.chain_id);
                    }
                    // Non-chain Google Places don't need incentives loaded
                }, 300);
            });

        } catch (error) {
            console.error("❌ Error opening info window:", error);
        }
    }, 200);
}

// FIX 3: Enhanced chain incentives loading with consistent container ID
function loadChainIncentivesForEnhancedWindowFixed(containerId, chainId) {
    console.log(`🔗 CHAIN INCENTIVES: Loading for container ${containerId}, chain ${chainId}`);

    const container = document.getElementById(`incentives-container-${containerId}`);
    if (!container) {
        console.error(`❌ Container not found: incentives-container-${containerId}`);

        // Debug: List available containers
        const allContainers = document.querySelectorAll('[id*="incentives-container"]');
        console.log("🔍 Available containers:", Array.from(allContainers).map(c => c.id));
        return;
    }

    console.log(`✅ Found container: incentives-container-${containerId}`);

    const baseURL = getBaseURL();
    const apiURL = `${baseURL}/api/combined-api.js?operation=incentives&business_id=${chainId}`;

    console.log(`🌐 Fetching chain incentives from: ${apiURL}`);

    fetch(apiURL)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Chain incentives API failed: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log(`📊 Chain incentives data:`, data);

            if (!data.results || data.results.length === 0) {
                container.innerHTML = '<em>💭 No chain incentives available</em>';
                return;
            }

            let incentivesHTML = '<div class="incentives-header"><strong>🎁 Chain-wide Incentives:</strong></div>';
            incentivesHTML += '<div class="incentives-list">';

            data.results.forEach(incentive => {
                if (incentive.is_available) {
                    const typeLabel = getIncentiveTypeLabel(incentive.type);
                    const otherDescription = incentive.other_description ? ` (${incentive.other_description})` : '';

                    incentivesHTML += `
                        <div class="incentive-item chain-incentive">
                            <div class="incentive-type">${typeLabel}${otherDescription}:</div>
                            <div class="incentive-amount">${incentive.amount}% <span class="mini-chain-badge">🔗 Chain-wide</span></div>
                            ${incentive.information ? `<div class="incentive-info">${incentive.information}</div>` : ''}
                        </div>
                    `;
                }
            });

            incentivesHTML += '</div>';
            incentivesHTML += '<div class="chain-note">✨ Great! These incentives apply to all locations of this chain.</div>';

            container.innerHTML = incentivesHTML;

            console.log(`✅ Successfully loaded chain incentives for ${containerId}`);
        })
        .catch(error => {
            console.error(`❌ Error loading chain incentives:`, error);
            container.innerHTML = '<em>❌ Error loading chain incentives</em>';
        });
}

// FIX 4: Enhanced regular incentives loading
function loadIncentivesForEnhancedWindowFixed(containerId) {
    console.log(`🏢 REGULAR INCENTIVES: Loading for container ${containerId}`);

    const container = document.getElementById(`incentives-container-${containerId}`);
    if (!container) {
        console.error(`❌ Container not found: incentives-container-${containerId}`);
        return;
    }

    const baseURL = getBaseURL();
    const apiURL = `${baseURL}/api/combined-api.js?operation=incentives&business_id=${containerId}`;

    fetch(apiURL)
        .then(response => response.json())
        .then(data => {
            if (!data.results || data.results.length === 0) {
                container.innerHTML = '<em>💭 No incentives available</em>';
                return;
            }

            let incentivesHTML = '<div class="incentives-header"><strong>🎁 Available Incentives:</strong></div>';
            incentivesHTML += '<div class="incentives-list">';

            data.results.forEach(incentive => {
                if (incentive.is_available) {
                    const typeLabel = getIncentiveTypeLabel(incentive.type);
                    const otherDescription = incentive.other_description ? ` (${incentive.other_description})` : '';
                    const chainBadge = incentive.is_chain_wide ?
                        '<span class="mini-chain-badge">🔗 Chain-wide</span>' : '';

                    incentivesHTML += `
                        <div class="incentive-item">
                            <div class="incentive-type">${typeLabel}${otherDescription}:</div>
                            <div class="incentive-amount">${incentive.amount}% ${chainBadge}</div>
                            ${incentive.information ? `<div class="incentive-info">${incentive.information}</div>` : ''}
                        </div>
                    `;
                }
            });

            incentivesHTML += '</div>';
            container.innerHTML = incentivesHTML;

            console.log(`✅ Successfully loaded regular incentives for ${containerId}`);
        })
        .catch(error => {
            console.error("❌ Error loading incentives:", error);
            container.innerHTML = '<em>❌ Error loading incentives</em>';
        });
}

// FIX 5: Enhanced database business chain incentives loading
function loadChainIncentivesForDatabaseBusinessFixed(containerId, chainId) {
    console.log(`🔗 DATABASE CHAIN INCENTIVES: Loading for container ${containerId}, chain ${chainId}`);

    const container = document.getElementById(`incentives-container-${containerId}`);
    if (!container) {
        console.error(`❌ Container not found: incentives-container-${containerId}`);
        return;
    }

    const baseURL = getBaseURL();
    const apiURL = `${baseURL}/api/combined-api.js?operation=incentives&business_id=${chainId}`;

    console.log(`🌐 Fetching database chain incentives from: ${apiURL}`);

    fetch(apiURL)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Chain incentives API failed: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log(`📊 Database chain incentives data:`, data);

            if (!data.results || data.results.length === 0) {
                container.innerHTML = '<em>💭 No chain incentives available</em>';
                return;
            }

            let incentivesHTML = '<div class="incentives-header"><strong>🎁 Available Incentives:</strong></div>';
            incentivesHTML += '<div class="incentives-list">';

            data.results.forEach(incentive => {
                if (incentive.is_available) {
                    const typeLabel = getIncentiveTypeLabel(incentive.type);
                    const otherDescription = incentive.other_description ? ` (${incentive.other_description})` : '';

                    incentivesHTML += `
                        <div class="incentive-item chain-incentive">
                            <div class="incentive-type">${typeLabel}${otherDescription}:</div>
                            <div class="incentive-amount">${incentive.amount}% <span class="mini-chain-badge">🔗 Chain-wide</span></div>
                            ${incentive.information ? `<div class="incentive-info">${incentive.information}</div>` : ''}
                        </div>
                    `;
                }
            });

            incentivesHTML += '</div>';
            container.innerHTML = incentivesHTML;

            console.log(`✅ Successfully loaded database chain incentives for ${containerId}`);
        })
        .catch(error => {
            console.error(`❌ Error loading database chain incentives:`, error);
            container.innerHTML = '<em>❌ Error loading chain incentives</em>';
        });
}

// FIX 1: Rate-limited chain matching with caching
async function findMatchingChainForPlaceResultFixed(placeName) {
    try {
        if (!placeName) return null;

        console.log("🔍 CACHED CHAIN MATCHING: Checking for:", placeName);

        const cleanPlaceName = placeName.trim().toLowerCase();

        // Check cache first
        if (chainMatchCache.has(cleanPlaceName)) {
            const cachedResult = chainMatchCache.get(cleanPlaceName);
            console.log(`💾 CACHE HIT: ${placeName} → ${cachedResult ? cachedResult.bname : 'No match'}`);
            return cachedResult;
        }

        // Try local matching first (faster and doesn't use API)
        const localMatch = await findMatchingChainLocallyEnhanced(placeName);
        if (localMatch) {
            console.log(`🏠 LOCAL MATCH: ${placeName} → ${localMatch.bname}`);
            chainMatchCache.set(cleanPlaceName, localMatch);
            return localMatch;
        }

        // Queue API call to avoid rate limiting
        return new Promise((resolve) => {
            apiCallQueue.push({
                placeName: placeName,
                cleanName: cleanPlaceName,
                resolve: resolve
            });

            processApiQueue();
        });

    } catch (error) {
        console.error("❌ Error in cached chain matching:", error);
        return null;
    }
}

// FIX 2: Process API queue with rate limiting
async function processApiQueue() {
    if (isProcessingQueue || apiCallQueue.length === 0) {
        return;
    }

    isProcessingQueue = true;

    while (apiCallQueue.length > 0) {
        const {placeName, cleanName, resolve} = apiCallQueue.shift();

        try {
            console.log(`🌐 API QUEUE: Processing ${placeName} (${apiCallQueue.length} remaining)`);

            // Try server-side matching with single call
            const serverMatch = await tryServerSideChainMatchingOptimized(placeName);

            if (serverMatch) {
                console.log(`✅ SERVER MATCH: ${placeName} → ${serverMatch.bname}`);
                chainMatchCache.set(cleanName, serverMatch);
                resolve(serverMatch);
            } else {
                console.log(`❌ NO MATCH: ${placeName}`);
                chainMatchCache.set(cleanName, null);
                resolve(null);
            }

            // Rate limiting: wait 200ms between API calls
            if (apiCallQueue.length > 0) {
                await new Promise(resolve => setTimeout(resolve, 200));
            }

        } catch (error) {
            console.error(`❌ API queue error for ${placeName}:`, error);
            chainMatchCache.set(cleanName, null);
            resolve(null);

            // Wait longer after error
            if (apiCallQueue.length > 0) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
    }

    isProcessingQueue = false;
}

// FIX 3: Enhanced local chain matching with more patterns
function findMatchingChainLocallyEnhanced(placeName) {
    return new Promise((resolve) => {
        try {
            if (!placeName) {
                resolve(null);
                return;
            }

            console.log("🏠 ENHANCED LOCAL: Matching for:", placeName);

            // Enhanced chain database with more patterns
            const enhancedChainDatabase = {
                // Home Depot variations
                'homedepot': {
                    id: '681fe0e67d92c3d3e1e2a3da',
                    name: 'The Home Depot',
                    patterns: [
                        /^the home depot$/i,
                        /^home depot$/i,
                        /^homedepot$/i,
                        /home depot/i
                    ]
                },

                // Olive Garden variations
                'olivegarden': {
                    id: '682b61ee7e3ea12414dd4665',
                    name: 'Olive Garden',
                    patterns: [
                        /^olive garden$/i,
                        /^olive garden italian restaurant$/i,
                        /^olive garden italian$/i,
                        /olive garden/i
                    ]
                },

                // Lowe's variations
                'lowes': {
                    id: 'lowes_chain_id',
                    name: 'Lowe\'s',
                    patterns: [
                        /^lowes$/i,
                        /^lowe's$/i,
                        /^lowes home improvement$/i,
                        /^lowe's home improvement$/i,
                        /lowes?/i
                    ]
                },

                // McDonald's variations
                'mcdonalds': {
                    id: 'mcdonalds_chain_id',
                    name: 'McDonald\'s',
                    patterns: [
                        /^mcdonalds$/i,
                        /^mcdonald's$/i,
                        /^mickey d's$/i,
                        /mcdonald/i
                    ]
                },

                // Walmart variations
                'walmart': {
                    id: 'walmart_chain_id',
                    name: 'Walmart',
                    patterns: [
                        /^walmart$/i,
                        /^wal-mart$/i,
                        /^walmart supercenter$/i,
                        /walmart/i
                    ]
                }
            };

            const testName = placeName.toLowerCase().trim();

            // Test against all chain patterns
            for (const [key, chain] of Object.entries(enhancedChainDatabase)) {
                for (const pattern of chain.patterns) {
                    if (pattern.test(testName)) {
                        console.log(`🎯 ENHANCED LOCAL MATCH: "${placeName}" → "${chain.name}" (pattern: ${pattern})`);
                        resolve({
                            _id: chain.id,
                            bname: chain.name,
                            isLocalMatch: true
                        });
                        return;
                    }
                }
            }

            console.log(`❌ No enhanced local match for: ${placeName}`);
            resolve(null);
        } catch (error) {
            console.error("❌ Error in enhanced local matching:", error);
            resolve(null);
        }
    });
}

// FIX 4: Optimized server-side chain matching (single API call)
async function tryServerSideChainMatchingOptimized(placeName) {
    const baseURL = getBaseURL();

    // Try the most likely match first - just the base name
    const cleanName = placeName.replace(/\s+(italian\s+restaurant|restaurant|store|location|inc|llc|corp)$/i, '').trim();

    try {
        const response = await fetch(`${baseURL}/api/business.js?operation=find_matching_chain&place_name=${encodeURIComponent(cleanName)}`);

        if (response.ok) {
            const data = await response.json();
            if (data.success && data.chain) {
                console.log(`✅ OPTIMIZED SERVER MATCH: "${placeName}" → "${data.chain.bname}" (using "${cleanName}")`);
                return data.chain;
            }
        }
    } catch (error) {
        console.error(`❌ Optimized server matching failed for "${cleanName}":`, error.message);
    }

    console.log(`❌ No optimized server match for: ${placeName}`);
    return null;
}

// FIX 5: Clear cache function (for testing)
function clearChainMatchCache() {
    chainMatchCache.clear();
    console.log("🧹 CACHE CLEARED: Chain match cache has been cleared");
}

// FIX 6: Cache status function (for debugging)
function getChainMatchCacheStatus() {
    console.log("📊 CACHE STATUS:");
    console.log(`   - Total entries: ${chainMatchCache.size}`);
    console.log(`   - API queue length: ${apiCallQueue.length}`);
    console.log(`   - Processing queue: ${isProcessingQueue}`);

    if (chainMatchCache.size > 0) {
        console.log("   - Cached entries:");
        for (const [key, value] of chainMatchCache.entries()) {
            console.log(`     ${key} → ${value ? value.bname : 'No match'}`);
        }
    }
}

// FIX 2: Approximate location fallback
async function getApproximateLocation() {
    // This would typically use IP geolocation service
    // For now, return a default location (can be enhanced with actual IP geolocation)
    return {
        lat: 39.8283,
        lng: -98.5795,
        source: 'default-us-center'
    };
}

// FIX 3: User-friendly error messages
function showUserFriendlyError(errorType, message) {
    const resultsContainer = document.getElementById('business-search-results') ||
        document.getElementById('search_table');

    if (!resultsContainer) return;

    const errorIcons = {
        'location': '📍',
        'geocoding': '🗺️',
        'no-results': '🔍',
        'critical': '⚠️',
        'network': '🌐'
    };

    const icon = errorIcons[errorType] || '❌';

    resultsContainer.innerHTML = `
        <div class="user-friendly-error">
            <div class="error-icon">${icon}</div>
            <div class="error-message">${message}</div>
            <div class="error-actions">
                <button onclick="location.reload()" class="retry-btn">🔄 Try Again</button>
                <button onclick="clearSearchForm()" class="clear-btn">🆕 New Search</button>
            </div>
        </div>
    `;
    resultsContainer.style.display = 'block';
}

// FIX 4: Success message with details
function showSearchSuccessMessage(dbCount, placesCount, locationSource) {
    // Create a subtle success indicator
    const successBanner = document.createElement('div');
    successBanner.className = 'search-success-banner';
    successBanner.innerHTML = `
        <div class="success-content">
            <span class="success-icon">✅</span>
            <span class="success-text">
                Found ${dbCount + placesCount} businesses
                ${dbCount > 0 ? `(${dbCount} in database` : ''}
                ${placesCount > 0 ? `${dbCount > 0 ? ', ' : '('}${placesCount} nearby)` : dbCount > 0 ? ')' : ''}
            </span>
            <button onclick="this.parentElement.parentElement.remove()" class="close-success">×</button>
        </div>
    `;

    // Add to page temporarily
    const mainContent = document.querySelector('main') || document.body;
    mainContent.insertBefore(successBanner, mainContent.firstChild);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (successBanner.parentNode) {
            successBanner.remove();
        }
    }, 5000);
}

// FIX 5: Clear search form function
function clearSearchForm() {
    const form = document.getElementById('business-search-form');
    if (form) {
        form.reset();

        // Clear validation classes
        const inputs = form.querySelectorAll('input');
        inputs.forEach(input => {
            input.classList.remove('valid-field', 'invalid-field');
            input.removeAttribute('data-valid');
        });

        // Clear results
        const resultsContainer = document.getElementById('business-search-results') ||
            document.getElementById('search_table');
        if (resultsContainer) {
            resultsContainer.style.display = 'none';
        }

        // Clear map markers
        clearMarkers();

        // Reset map view
        if (map) {
            map.setCenter(CONFIG.defaultCenter);
            map.setZoom(CONFIG.defaultZoom);
        }

        console.log("🆕 FORM CLEARED: Search form and results cleared");
    }
}

// FIX 6: Enhanced debugging dashboard
function createDebugDashboard() {
    // Remove existing dashboard
    const existingDashboard = document.getElementById('debug-dashboard');
    if (existingDashboard) {
        existingDashboard.remove();
    }

    // Create comprehensive debug dashboard
    const dashboard = document.createElement('div');
    dashboard.id = 'debug-dashboard';
    dashboard.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: rgba(0,0,0,0.9);
        color: white;
        padding: 15px;
        border-radius: 8px;
        z-index: 10000;
        font-family: monospace;
        font-size: 11px;
        max-width: 350px;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    `;

    dashboard.innerHTML = `
        <h4 style="margin: 0 0 10px 0; color: #4CAF50; text-align: center;">🛠️ Debug Dashboard</h4>
        
        <div class="debug-section">
            <h5 style="color: #2196F3; margin: 10px 0 5px 0;">🔍 Quick Tests</h5>
            <button onclick="testSpecificSearch('Olive Garden', false)" class="debug-btn">Test Olive Garden</button>
            <button onclick="testSpecificSearch('The Home Depot', true)" class="debug-btn">Test Home Depot + Location</button>
            <button onclick="testSpecificSearch('McDonald\\'s', false)" class="debug-btn">Test McDonald's</button>
        </div>

        <div class="debug-section">
            <h5 style="color: #FF9800; margin: 10px 0 5px 0;">📊 System Status</h5>
            <button onclick="debugBusinessSearch()" class="debug-btn">Full System Debug</button>
            <button onclick="getChainMatchCacheStatus()" class="debug-btn">Cache Status</button>
            <button onclick="checkMapMarkers()" class="debug-btn">Check Markers</button>
        </div>

        <div class="debug-section">
            <h5 style="color: #9C27B0; margin: 10px 0 5px 0;">🧹 Maintenance</h5>
            <button onclick="clearChainMatchCache()" class="debug-btn">Clear Cache</button>
            <button onclick="clearSearchForm()" class="debug-btn">Clear Form</button>
            <button onclick="resetMapView()" class="debug-btn">Reset Map</button>
        </div>

        <div class="debug-section">
            <h5 style="color: #F44336; margin: 10px 0 5px 0;">🚨 Emergency</h5>
            <button onclick="emergencyReset()" class="debug-btn danger">Emergency Reset</button>
            <button onclick="location.reload()" class="debug-btn danger">Reload Page</button>
        </div>

        <div id="debug-status" style="margin-top: 10px; padding: 5px; background: rgba(255,255,255,0.1); border-radius: 4px; font-size: 10px;">
            Ready for debugging
        </div>

        <button onclick="document.getElementById('debug-dashboard').remove()" 
                style="position: absolute; top: 5px; right: 8px; background: none; border: none; color: #f44336; font-size: 16px; cursor: pointer;">×</button>
    `;

    // Add dashboard styles
    const style = document.createElement('style');
    style.textContent = `
        .debug-btn {
            display: block;
            width: 100%;
            margin: 2px 0;
            padding: 6px 8px;
            background: #333;
            color: white;
            border: 1px solid #555;
            border-radius: 4px;
            cursor: pointer;
            font-size: 10px;
            transition: background 0.2s;
        }
        
        .debug-btn:hover {
            background: #555;
        }
        
        .debug-btn.danger {
            background: #d32f2f;
            border-color: #b71c1c;
        }
        
        .debug-btn.danger:hover {
            background: #f44336;
        }
        
        .debug-section {
            margin-bottom: 10px;
            padding-bottom: 8px;
            border-bottom: 1px solid #333;
        }
        
        .debug-section:last-child {
            border-bottom: none;
        }
    `;
    document.head.appendChild(style);

    document.body.appendChild(dashboard);
    console.log("🛠️ DEBUG DASHBOARD: Created comprehensive debugging dashboard");
}

// FIX 7: Enhanced marker checking
function checkMapMarkers() {
    console.log("🎯 MARKER CHECK: Analyzing current markers...");

    if (!markers || markers.length === 0) {
        console.log("❌ No markers found");
        updateDebugStatus("No markers on map");
        return;
    }

    let databaseMarkers = 0;
    let placesMarkers = 0;
    let invalidMarkers = 0;

    markers.forEach((marker, index) => {
        if (!marker.business) {
            invalidMarkers++;
            return;
        }

        if (marker.business.isGooglePlace) {
            placesMarkers++;
        } else {
            databaseMarkers++;
        }

        console.log(`   ${index + 1}. ${marker.business.bname} (${marker.business.isGooglePlace ? 'PLACES' : 'DATABASE'})`);
    });

    const summary = `${markers.length} markers: ${databaseMarkers} database, ${placesMarkers} places, ${invalidMarkers} invalid`;
    console.log(`📊 MARKER SUMMARY: ${summary}`);
    updateDebugStatus(summary);
}

// FIX 8: Emergency reset function
function emergencyReset() {
    console.log("🚨 EMERGENCY RESET: Performing complete system reset...");

    try {
        // Clear all markers
        clearMarkers();

        // Clear cache
        if (typeof clearChainMatchCache === 'function') {
            clearChainMatchCache();
        }

        // Clear form
        clearSearchForm();

        // Reset map
        if (map) {
            map.setCenter(CONFIG.defaultCenter);
            map.setZoom(CONFIG.defaultZoom);
        }

        // Close any info windows
        if (infoWindow) {
            infoWindow.close();
        }

        // Clear any modals or overlays
        document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
        document.body.classList.remove('modal-open');
        document.body.style.paddingRight = '';
        document.body.style.overflow = '';

        // Clear any error messages
        const errorElements = document.querySelectorAll('.error-message, .user-friendly-error, .loading-indicator');
        errorElements.forEach(el => el.remove());

        console.log("✅ EMERGENCY RESET: System reset completed");
        updateDebugStatus("Emergency reset completed");

    } catch (error) {
        console.error("❌ EMERGENCY RESET FAILED:", error);
        updateDebugStatus("Emergency reset failed - try page reload");
    }
}

// FIX 9: Update debug status helper
function updateDebugStatus(message) {
    const statusEl = document.getElementById('debug-status');
    if (statusEl) {
        statusEl.textContent = `${new Date().toLocaleTimeString()}: ${message}`;
    }
}

// FIX 10: Enhanced CSS for user-friendly messages
function addEnhancedUserInterfaceCSS() {
    if (!document.getElementById('enhanced-ui-css')) {
        const style = document.createElement('style');
        style.id = 'enhanced-ui-css';
        style.textContent = `
            /* User-friendly error messages */
            .user-friendly-error {
                text-align: center;
                padding: 40px 20px;
                background: linear-gradient(135deg, #fff3e0 0%, #ffccbc 100%);
                border-radius: 12px;
                margin: 20px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            }

            .error-icon {
                font-size: 48px;
                margin-bottom: 16px;
            }

            .error-message {
                font-size: 16px;
                color: #333;
                margin-bottom: 20px;
                line-height: 1.5;
            }

            .error-actions {
                display: flex;
                gap: 10px;
                justify-content: center;
                flex-wrap: wrap;
            }

            .retry-btn, .clear-btn {
                padding: 10px 20px;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-weight: 500;
                transition: all 0.2s;
            }

            .retry-btn {
                background: #4CAF50;
                color: white;
            }

            .retry-btn:hover {
                background: #45a049;
                transform: translateY(-1px);
            }

            .clear-btn {
                background: #2196F3;
                color: white;
            }

            .clear-btn:hover {
                background: #1976D2;
                transform: translateY(-1px);
            }

            /* Success banner */
            .search-success-banner {
                background: linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 100%);
                border: 1px solid #4caf50;
                border-radius: 8px;
                margin: 10px 0;
                animation: slideInFromTop 0.5s ease-out;
            }

            .success-content {
                display: flex;
                align-items: center;
                padding: 12px 16px;
                gap: 10px;
            }

            .success-icon {
                font-size: 18px;
            }

            .success-text {
                flex: 1;
                color: #2e7d32;
                font-weight: 500;
            }

            .close-success {
                background: none;
                border: none;
                font-size: 18px;
                color: #2e7d32;
                cursor: pointer;
                padding: 0;
                width: 24px;
                height: 24px;
            }

            .close-success:hover {
                background: rgba(76, 175, 80, 0.1);
                border-radius: 50%;
            }

            @keyframes slideInFromTop {
                from {
                    opacity: 0;
                    transform: translateY(-20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            /* Enhanced loading indicator */
            .loading-indicator {
                text-align: center;
                padding: 40px 20px;
                background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
                border-radius: 12px;
                margin: 20px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            }

            .loading-text {
                font-size: 18px;
                color: #333;
                margin-bottom: 20px;
                font-weight: 500;
            }

            .loading-spinner {
                width: 40px;
                height: 40px;
                border: 4px solid #e3f2fd;
                border-top: 4px solid #2196f3;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto;
            }
        `;
        document.head.appendChild(style);
    }
}

// FIX 6: Enhanced info window with category awareness
function showEnhancedInfoWindowWithCategory(marker) {
    console.log("🪟 CATEGORY INFO WINDOW: Showing for:", marker.business?.bname);

    if (!marker || !marker.business) {
        console.error("❌ Invalid marker for category info window");
        return;
    }

    const business = marker.business;
    const isGooglePlace = business.isGooglePlace === true;
    const isChainLocation = !!business.chain_id;
    const isFromDatabase = business.isFromDatabase === true;
    const isNearbyDatabase = business.isNearbyDatabase === true;
    const isPrimaryResult = business.isPrimaryResult === true;

    // Close existing info window
    if (infoWindow) {
        infoWindow.close();
    }

    // Create new info window
    infoWindow = new google.maps.InfoWindow({
        maxWidth: 320,
        disableAutoPan: false
    });

    // Build category-aware content
    const content = buildCategoryAwareInfoWindowContent(business);

    // Set content
    infoWindow.setContent(content);

    // Get position
    let position = marker.position;
    if (!position && marker.getPosition) {
        position = marker.getPosition();
    }
    if (!position) {
        position = createSafeLatLng(business);
    }

    if (!position) {
        console.error("❌ Could not determine position for category info window");
        return;
    }

    // Pan to position
    try {
        map.panTo(position);
    } catch (panError) {
        console.warn("⚠️ Error panning to position:", panError);
    }

    // Open info window
    setTimeout(() => {
        try {
            if (marker.getPosition) {
                infoWindow.open(map, marker);
            } else {
                infoWindow.setPosition(position);
                infoWindow.open(map);
            }

            console.log("✅ Category info window opened successfully");

            // Load incentives after DOM is ready
            google.maps.event.addListenerOnce(infoWindow, 'domready', function () {
                setTimeout(() => {
                    applyEnhancedInfoWindowFixes();

                    // Use consistent container ID logic
                    const containerId = isGooglePlace ? `google_${business.placeId}` : business._id;

                    console.log(`🎁 CATEGORY INCENTIVES: Loading for ${containerId} (${business.markerColor})`);

                    if (isFromDatabase && isChainLocation) {
                        // Database business with chain - load chain incentives
                        loadChainIncentivesForDatabaseBusinessFixed(containerId, business.chain_id);
                    } else if (isFromDatabase) {
                        // Database business without chain - load regular incentives
                        loadIncentivesForEnhancedWindowFixed(containerId);
                    } else if (isGooglePlace && isChainLocation) {
                        // Google Places with chain - load chain incentives
                        loadChainIncentivesForEnhancedWindowFixed(containerId, business.chain_id);
                    }
                }, 300);
            });

        } catch (error) {
            console.error("❌ Error opening category info window:", error);
        }
    }, 200);
}

// FIX 7: Build category-aware info window content
function buildCategoryAwareInfoWindowContent(business) {
    const isGooglePlace = business.isGooglePlace === true;
    const isChainLocation = !!business.chain_id;
    const isFromDatabase = business.isFromDatabase === true;
    const isNearbyDatabase = business.isNearbyDatabase === true;
    const isPrimaryResult = business.isPrimaryResult === true;

    // Enhanced address formatting
    let addressHTML = '';
    if (business.address1) {
        addressHTML = `<div class="info-address">
            <strong>📍 Address:</strong><br>
            ${business.address1}`;

        if (business.address2) {
            addressHTML += `<br>${business.address2}`;
        }

        const locationParts = [];
        if (business.city) locationParts.push(business.city);
        if (business.state) locationParts.push(business.state);
        if (business.zip) locationParts.push(business.zip);

        if (locationParts.length > 0) {
            addressHTML += `<br>${locationParts.join(', ')}`;
        }

        addressHTML += '</div>';
    } else if (business.formattedAddress) {
        const addressParts = business.formattedAddress.split(',').map(part => part.trim());
        addressHTML = `<div class="info-address">
            <strong>📍 Address:</strong><br>`;

        if (addressParts.length >= 1) {
            addressHTML += addressParts[0];
        }
        if (addressParts.length >= 2) {
            addressHTML += `<br>${addressParts.slice(1).join(', ')}`;
        }

        addressHTML += '</div>';
    }

    // Phone number
    const phoneHTML = business.phone ?
        `<div class="info-phone"><strong>📞 Phone:</strong> <a href="tel:${business.phone.replace(/\D/g, '')}" style="color: #4285F4; text-decoration: none;">${business.phone}</a></div>` : '';

    // Business type
    let typeHTML = '';
    if (business.type && business.type !== 'OTHER') {
        typeHTML = `<div class="info-type"><strong>🏢 Type:</strong> ${getBusinessTypeLabel(business.type)}</div>`;
    }

    // Distance
    const distanceHTML = business.distance ?
        `<div class="info-distance"><strong>📏 Distance:</strong> ${(business.distance / 1609).toFixed(1)} miles</div>` : '';

    // Enhanced chain badge with category awareness
    let chainBadge = '';
    if (isChainLocation) {
        const badgeColor = isPrimaryResult ? '#4285F4' : isNearbyDatabase ? '#28a745' : '#4285F4';
        chainBadge = `<span class="enhanced-chain-badge" style="background-color: ${badgeColor};">🔗 ${business.chain_name || 'Chain Location'}</span>`;
    }

    // Category-aware status messaging
    let statusHTML = '';
    let explanationHTML = '';

    if (isPrimaryResult) {
        statusHTML = '<div class="info-status primary-result">🎯 This business matches your search and is in the Patriot Thanks database.</div>';
    } else if (isNearbyDatabase) {
        statusHTML = '<div class="info-status nearby-database">🏢 This business is in the Patriot Thanks database (found nearby).</div>';
        explanationHTML = '<div class="nearby-explanation">💡 This business appeared because it\'s in your search area and already in our database.</div>';
    } else if (isGooglePlace && isChainLocation) {
        statusHTML = '<div class="info-status chain-match">🔗 This location appears to match a chain in our database!</div>';
        explanationHTML = `<div class="chain-explanation">
            ✨ Great news! This location matches <strong>${business.chain_name}</strong> in our database. 
            Chain-wide incentives should apply to this location once added.
        </div>`;
    } else if (isGooglePlace) {
        statusHTML = '<div class="info-status google-place">ℹ️ This business is not yet in the Patriot Thanks database.</div>';
    }

    // Category-aware action button
    let actionButton;
    if (isFromDatabase) {
        // Database business (both primary and nearby)
        actionButton = `
            <button class="enhanced-view-btn" onclick="window.viewBusinessDetails('${business._id}')">
                👁️ View Details
            </button>
        `;
    } else if (isGooglePlace && isChainLocation) {
        // Google Places with chain match
        actionButton = `
            <button class="enhanced-add-btn chain-add" onclick="window.addBusinessToDatabase('${business.placeId}', '${business.chain_id}')">
                🔗 Add ${business.chain_name} Location
            </button>
        `;
    } else if (isGooglePlace) {
        // Regular Google Places
        actionButton = `
            <button class="enhanced-add-btn" onclick="window.addBusinessToDatabase('${business.placeId}')">
                ➕ Add to Patriot Thanks
            </button>
        `;
    }

    // Container ID for incentives
    const containerId = isGooglePlace ? `google_${business.placeId}` : business._id;

    // Category-aware incentives messaging
    let incentivesMessage;
    if (isFromDatabase && isChainLocation) {
        incentivesMessage = '<em>⏳ Loading chain incentives...</em>';
    } else if (isFromDatabase) {
        incentivesMessage = '<em>⏳ Loading incentives...</em>';
    } else if (isGooglePlace && isChainLocation) {
        incentivesMessage = '<em>⏳ Loading chain incentives...</em>';
    } else {
        incentivesMessage = '<em>💡 Add this business to see available incentives.</em>';
    }

    return `
        <div class="enhanced-info-window category-aware">
            <div class="info-header">
                <h3>${business.bname} ${chainBadge}</h3>
            </div>
            
            <div class="info-body">
                ${addressHTML}
                ${phoneHTML}
                ${typeHTML}
                ${distanceHTML}
                ${statusHTML}
                ${explanationHTML}
                
                <div class="info-incentives">
                    <div id="incentives-container-${containerId}">
                        ${incentivesMessage}
                    </div>
                </div>
            </div>
            
            <div class="info-actions">
                ${actionButton}
            </div>
        </div>
    `;
}

function displayBusinessesOnMapWithCategories(businesses) {
    if (!map) {
        console.log("⏳ Map not ready, storing businesses for later display");
        pendingBusinessesToDisplay = businesses;
        return;
    }

    console.log(`🗺️ CATEGORIZED DISPLAY: Displaying ${businesses.length} businesses on map`);

    // Clear existing markers and create new bounds
    clearMarkers();
    bounds = new google.maps.LatLngBounds();

    // Counters for each category
    let primaryMarkers = 0;
    let nearbyDatabaseMarkers = 0;
    let placesMarkers = 0;
    let skippedBusinesses = 0;

    // Process each business with category handling
    businesses.forEach((business, index) => {
        try {
            console.log(`🔄 Processing business ${index + 1}/${businesses.length}: ${business.bname} (${business.markerColor || 'unknown'})`);

            // Skip parent chain businesses
            if (business.is_chain === true) {
                console.log(`🚫 Skipping parent chain business: ${business.bname}`);
                skippedBusinesses++;
                return;
            }

            // Get coordinates
            const businessLocation = getBusinessLocation(business);
            if (!businessLocation) {
                console.warn(`❌ Business ${business.bname} missing coordinates`);
                skippedBusinesses++;
                return;
            }

            // Update business object with coordinates
            business.lat = businessLocation.lat;
            business.lng = businessLocation.lng;

            // Create categorized marker
            const marker = createCategorizedBusinessMarker(business);
            if (marker) {
                // Count by category
                switch (business.markerColor) {
                    case 'primary':
                        primaryMarkers++;
                        break;
                    case 'database':
                        nearbyDatabaseMarkers++;
                        break;
                    case 'nearby':
                    default:
                        placesMarkers++;
                        break;
                }

                console.log(`✅ Created ${business.markerColor} marker for ${business.bname}`);

                // Extend bounds
                const position = new google.maps.LatLng(businessLocation.lat, businessLocation.lng);
                bounds.extend(position);
            } else {
                console.error(`❌ Failed to create marker for ${business.bname}`);
                skippedBusinesses++;
            }
        } catch (error) {
            console.error(`❌ Error processing business ${business.bname}:`, error);
            skippedBusinesses++;
        }
    });

    console.log(`📊 CATEGORIZED MARKER SUMMARY:`);
    console.log(`   - 🔴 Primary (RED): ${primaryMarkers} markers`);
    console.log(`   - 🟢 Nearby Database (GREEN): ${nearbyDatabaseMarkers} markers`);
    console.log(`   - 🔵 Google Places (BLUE): ${placesMarkers} markers`);
    console.log(`   - ❌ Skipped: ${skippedBusinesses} businesses`);
    console.log(`   - ✅ Total Created: ${primaryMarkers + nearbyDatabaseMarkers + placesMarkers} markers`);

    // Update map view with intelligent centering
    setTimeout(() => {
        try {
            if (window.currentSearchLocation && (primaryMarkers > 0 || nearbyDatabaseMarkers > 0)) {
                console.log("📍 Centering map on search location with results");
                const searchLatLng = new google.maps.LatLng(
                    window.currentSearchLocation.lat,
                    window.currentSearchLocation.lng
                );
                map.setCenter(searchLatLng);
                map.setZoom(12);
            } else if (primaryMarkers + nearbyDatabaseMarkers + placesMarkers > 0 && bounds && !bounds.isEmpty()) {
                console.log("🎯 Fitting map to all business bounds");
                safelyFitBounds(map, bounds);
            } else {
                console.log("🌎 Using default map center");
                map.setCenter(CONFIG.defaultCenter);
                map.setZoom(CONFIG.defaultZoom);
            }
        } catch (error) {
            console.error("❌ Error updating map view:", error);
        }
    }, 200);
}

// FIX 2: Categorized business marker creation
function createCategorizedBusinessMarker(business) {
    try {
        // Validate coordinates
        if (!business.lat || !business.lng ||
            isNaN(parseFloat(business.lat)) || isNaN(parseFloat(business.lng))) {
            console.warn(`❌ Invalid coordinates for business: ${business.bname}`);
            return null;
        }

        // Create position
        const position = new google.maps.LatLng(
            parseFloat(business.lat),
            parseFloat(business.lng)
        );

        // Use the enhanced marker creation with categories
        const marker = createEnhancedBusinessMarkerWithCategory(business, position);

        return marker;
    } catch (error) {
        console.error("❌ Error creating categorized business marker:", error);
        return null;
    }
}

// FIX 3: Enhanced search results display with categories
function displaySearchResultsWithCategories(businesses) {
    try {
        console.log(`📋 CATEGORIZED RESULTS: Displaying ${businesses.length} businesses in table`);

        // Ensure loading indicator is hidden
        hideLoadingIndicator();

        const businessSearchTable = document.getElementById('business_search');
        const searchTableContainer = document.getElementById('search_table');

        if (!businessSearchTable || !searchTableContainer) {
            console.error("❌ Required table elements not found in the DOM");
            showErrorMessage("There was an error displaying search results. Please try again later.");
            return;
        }

        // Get the table body
        let tableBody = businessSearchTable.querySelector('tbody');
        if (!tableBody) {
            console.error("❌ Table body not found");
            showErrorMessage("There was an error displaying search results. Please try again later.");
            return;
        }

        // Clear existing rows
        tableBody.innerHTML = '';

        // Show the search results table
        searchTableContainer.style.display = 'block';

        // Hide the "hidden" text in the h5
        const searchTableH5 = searchTableContainer.querySelector('h5');
        if (searchTableH5) {
            searchTableH5.style.display = 'none';
        }

        if (businesses.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" class="text-center">No businesses found matching your search criteria.</td></tr>';
            searchTableContainer.scrollIntoView({behavior: 'smooth'});
            return;
        }

        // Categorize businesses for display
        const primaryBusinesses = businesses.filter(b => b.markerColor === 'primary');
        const nearbyDatabaseBusinesses = businesses.filter(b => b.markerColor === 'database');
        const placesBusinesses = businesses.filter(b => b.markerColor === 'nearby');

        console.log(`📊 TABLE CATEGORIES:`);
        console.log(`   - Primary Results: ${primaryBusinesses.length}`);
        console.log(`   - Nearby Database: ${nearbyDatabaseBusinesses.length}`);
        console.log(`   - Google Places: ${placesBusinesses.length}`);

        // Add section headers and businesses in priority order
        let rowIndex = 0;

        // SECTION 1: Primary Search Results (RED)
        if (primaryBusinesses.length > 0) {
            addTableSectionHeader(tableBody, `🎯 Search Results (${primaryBusinesses.length})`, 'primary-section');
            primaryBusinesses.forEach((business, index) => {
                console.log(`📝 Adding primary business ${index + 1}: ${business.bname}`);
                addCategorizedBusinessRow(business, tableBody, 'primary');
                rowIndex++;
            });
        }

        // SECTION 2: Nearby Database Businesses (GREEN)
        if (nearbyDatabaseBusinesses.length > 0) {
            addTableSectionHeader(tableBody, `🏢 Nearby Businesses in Database (${nearbyDatabaseBusinesses.length})`, 'database-section');
            nearbyDatabaseBusinesses.forEach((business, index) => {
                console.log(`📝 Adding nearby database business ${index + 1}: ${business.bname}`);
                addCategorizedBusinessRow(business, tableBody, 'database');
                rowIndex++;
            });
        }

        // SECTION 3: Google Places Results (BLUE)
        if (placesBusinesses.length > 0) {
            addTableSectionHeader(tableBody, `🌐 Additional Locations Found (${placesBusinesses.length})`, 'places-section');
            placesBusinesses.forEach((business, index) => {
                console.log(`📝 Adding Google Places business ${index + 1}: ${business.bname}`);
                addCategorizedBusinessRow(business, tableBody, 'places');
                rowIndex++;
            });
        }

        // Scroll to the results
        searchTableContainer.scrollIntoView({behavior: 'smooth'});

        console.log(`✅ Categorized search results displayed: ${rowIndex} total rows`);

    } catch (error) {
        console.error("❌ Error displaying categorized search results:", error);
        hideLoadingIndicator();
        showErrorMessage("There was an error displaying the search results: " + error.message);
    }
}

// FIX 4: Add table section headers
function addTableSectionHeader(tableBody, title, sectionClass) {
    const headerRow = document.createElement('tr');
    headerRow.className = `section-header ${sectionClass}`;
    headerRow.innerHTML = `
        <td colspan="5" class="section-header-cell">
            <strong>${title}</strong>
        </td>
    `;
    tableBody.appendChild(headerRow);
}

// FIX 5: Add categorized business row
function addCategorizedBusinessRow(business, tableBody, category) {
    if (!business) return;

    // Skip parent chain businesses
    if (business.is_chain === true) {
        console.log(`⏭️ Skipping parent chain business in table: ${business.bname}`);
        return;
    }

    console.log(`📝 Adding categorized table row: ${business.bname} (${category})`);

    // Format address
    let addressLine = '';
    if (business.address1) {
        addressLine = business.address2 ?
            `${business.address1}<br>${business.address2}<br>${business.city}, ${business.state} ${business.zip}` :
            `${business.address1}<br>${business.city}, ${business.state} ${business.zip}`;
    } else if (business.formattedAddress) {
        addressLine = business.formattedAddress.replace(/,/g, '<br>');
    } else {
        console.warn(`❌ Business ${business.bname} has no address information`);
        return;
    }

    // Business type
    const businessType = getBusinessTypeLabel(business.type);

    // Category-specific badges and styling
    let categoryBadge = '';
    let rowClass = '';

    switch (category) {
        case 'primary':
            categoryBadge = '<span class="category-badge primary-badge">🎯 Search Result</span>';
            rowClass = 'primary-result-row';
            break;
        case 'database':
            categoryBadge = '<span class="category-badge database-badge">🏢 In Database</span>';
            rowClass = 'database-result-row';
            break;
        case 'places':
            categoryBadge = '<span class="category-badge places-badge">🌐 Found Nearby</span>';
            rowClass = 'places-result-row';
            break;
    }

    // Chain badge
    const chainBadge = business.chain_id ? '<span class="chain-badge">🔗 Chain Location</span>' : '';

    // Category-specific action button
    let actionButton;
    if (category === 'primary' || category === 'database') {
        // Database businesses
        actionButton = `<button class="view-map-btn ${category}" onclick="focusOnMapMarker('${business._id}')">📍 View on Map</button>`;
    } else {
        // Google Places businesses
        if (business.chain_id) {
            actionButton = `<button class="add-to-db-btn chain" onclick="addBusinessToDatabase('${business.placeId}', '${business.chain_id}')">🔗 Add Chain Location</button>`;
        } else {
            actionButton = `<button class="add-to-db-btn" onclick="addBusinessToDatabase('${business.placeId}')">➕ Add to Database</button>`;
        }
    }

    // Create the row with category styling
    const row = document.createElement('tr');
    row.className = `business-row ${rowClass}`;
    row.innerHTML = `
        <th class="left_table" data-business-id="${business._id}">
            ${business.bname} ${chainBadge}
            <div class="category-badges">${categoryBadge}</div>
        </th>
        <th class="left_table">${addressLine}</th>
        <th class="left_table">${businessType}</th>
        <th class="right_table" id="incentives-for-${business._id}">
            ${(category === 'primary' || category === 'database') ? '<span class="loading-incentives">Loading incentives...</span>' : 'Not in database yet'}
        </th>
        <th class="center_table">${actionButton}</th>
    `;

    tableBody.appendChild(row);

    // Load incentives for database businesses
    if (category === 'primary' || category === 'database') {
        console.log(`🎁 Scheduling incentives load for ${category} business: ${business.bname} (ID: ${business._id})`);
        // Use the fixed incentives function
        setTimeout(() => {
            fetchBusinessIncentivesFixed(business._id, business.chain_id);
        }, 100);
    } else if (category === 'places' && business.chain_id) {
        console.log(`🔗 Scheduling chain incentives load for Places business: ${business.bname}`);
        fetchChainIncentivesForPlacesResult(business._id, business.chain_id);
    }
}

// FIX 6: Enhanced success message with categories
function showEnhancedSearchSuccessMessage(primaryCount, nearbyDatabaseCount, placesCount) {
    // Create enhanced success banner
    const successBanner = document.createElement('div');
    successBanner.className = 'enhanced-search-success-banner';

    let message = `Found ${primaryCount + nearbyDatabaseCount + placesCount} businesses: `;
    const parts = [];

    if (primaryCount > 0) {
        parts.push(`<span class="success-primary">${primaryCount} search result${primaryCount !== 1 ? 's' : ''}</span>`);
    }
    if (nearbyDatabaseCount > 0) {
        parts.push(`<span class="success-database">${nearbyDatabaseCount} nearby database business${nearbyDatabaseCount !== 1 ? 'es' : ''}</span>`);
    }
    if (placesCount > 0) {
        parts.push(`<span class="success-places">${placesCount} additional location${placesCount !== 1 ? 's' : ''}</span>`);
    }

    message += parts.join(', ');

    successBanner.innerHTML = `
        <div class="enhanced-success-content">
            <span class="success-icon">✅</span>
            <span class="success-text">${message}</span>
            <button onclick="this.parentElement.parentElement.remove()" class="close-success">×</button>
        </div>
        <div class="success-legend">
            <span class="legend-item"><span class="legend-dot red"></span>Search Results</span>
            <span class="legend-item"><span class="legend-dot green"></span>Nearby Database</span>
            <span class="legend-item"><span class="legend-dot blue"></span>Additional Locations</span>
        </div>
    `;

    // Add to page
    const mainContent = document.querySelector('main') || document.body;
    mainContent.insertBefore(successBanner, mainContent.firstChild);

    // Auto-remove after 8 seconds
    setTimeout(() => {
        if (successBanner.parentNode) {
            successBanner.remove();
        }
    }, 8000);
}

// FIX 7: Update map legend with categories
function updateMapLegendWithCategories() {
    const mapContainer = document.getElementById('map-container');
    if (!mapContainer) return;

    // Remove existing legend
    const existingLegend = mapContainer.querySelector('.map-legend');
    if (existingLegend) {
        existingLegend.remove();
    }

    // Create enhanced legend
    const legend = document.createElement('div');
    legend.className = 'map-legend enhanced-legend';
    legend.innerHTML = `
        <div class="legend-item">
            <div class="legend-color primary"></div>
            <span>Primary Search Results</span>
        </div>
        <div class="legend-item">
            <div class="legend-color database"></div>
            <span>Nearby Database Businesses</span>
        </div>
        <div class="legend-item">
            <div class="legend-color nearby"></div>
            <span>Additional Locations Found</span>
        </div>
    `;

    mapContainer.appendChild(legend);
}

/**
 * FINAL: Main enhanced business search function
 */
async function performEnhancedBusinessSearch(formData, bustCache = false) {
    try {
        // Show loading
        const resultsContainer = document.getElementById('business-search-results') ||
            document.getElementById('search_table');
        if (resultsContainer) {
            resultsContainer.innerHTML = '<div class="loading-indicator" id="main-loading"><div class="loading-text">Searching for businesses...</div><div class="loading-spinner"></div></div>';
            resultsContainer.style.display = 'block';
        }

        // Process search location
        let searchLocation = null;
        let searchRadius = 30;

        if (formData.useMyLocation) {
            updateLoadingMessage("Getting your location...");
            searchLocation = await getUserLocation();
            window.currentSearchLocation = searchLocation;
        } else if (formData.address && formData.address.trim() !== '') {
            updateLoadingMessage("Finding location...");
            const geocodedLocation = await geocodeAddressClientSide(formData.address);
            if (geocodedLocation && geocodedLocation.lat && geocodedLocation.lng) {
                searchLocation = geocodedLocation;
                window.currentSearchLocation = searchLocation;

                if (/^\d{5}$/.test(formData.address.trim())) {
                    searchRadius = 25;
                } else if (formData.address.toLowerCase().includes('city') || formData.address.split(',').length >= 2) {
                    searchRadius = 30;
                } else {
                    searchRadius = 20;
                }

                if (map && searchLocation) {
                    const center = new google.maps.LatLng(searchLocation.lat, searchLocation.lng);
                    map.setCenter(center);
                    map.setZoom(searchRadius <= 20 ? 12 : 11);
                }
            } else {
                throw new Error(`Geocoding failed for address: ${formData.address}`);
            }
        }

        // Search database
        updateLoadingMessage("Searching database...");
        let primaryResults = [];
        if (formData.businessName && formData.businessName.trim() !== '') {
            primaryResults = await searchDatabaseWithFuzzyMatching(formData, searchLocation, bustCache);
            primaryResults = primaryResults.filter(business => business.is_chain !== true);
        }

        // Search Google Places
        let placesResults = [];
        if (formData.businessName && searchLocation) {
            updateLoadingMessage("Searching for additional locations...");
            const placesSearchLocation = { ...searchLocation, searchRadius: Math.max(searchRadius, 35) };
            placesResults = await searchGooglePlacesForBusinessEnhanced(formData.businessName, placesSearchLocation);
        }

        // Always search nearby when location available
        let nearbyDatabaseBusinesses = [];
        if (searchLocation) {
            updateLoadingMessage("Finding other nearby businesses in database...");
            nearbyDatabaseBusinesses = await searchNearbyDatabaseBusinessesEnhanced(searchLocation, searchRadius, formData.businessName);
        }

        // Categorize results
        const {finalPrimaryResults, finalPlacesResults, finalNearbyResults} =
            categorizeResultsWithFixedDuplicateDetection(primaryResults, placesResults, nearbyDatabaseBusinesses);

        // Display results
        const allResults = [...finalPrimaryResults, ...finalPlacesResults, ...finalNearbyResults];

        if (allResults.length > 0) {
            // Set flags
            finalPrimaryResults.forEach(business => {
                business.isGooglePlace = false;
                business.isFromDatabase = true;
                business.isPrimaryResult = true;
                business.markerColor = 'primary';
                business.priority = 1;
            });

            finalPlacesResults.forEach(business => {
                business.isGooglePlace = true;
                business.isFromDatabase = false;
                business.isPrimaryResult = false;
                business.isRelevantPlaces = true;
                business.markerColor = 'nearby';
                business.priority = 2;
            });

            finalNearbyResults.forEach(business => {
                business.isGooglePlace = false;
                business.isFromDatabase = true;
                business.isPrimaryResult = false;
                business.isNearbyDatabase = true;
                business.markerColor = 'database';
                business.priority = 3;
            });

            hideLoadingIndicator();
            displayBusinessesOnMapWithBetterPriority(allResults);
            displaySearchResultsWithBetterPriority(allResults);
            showImprovedSearchSuccessMessage(finalPrimaryResults.length, finalPlacesResults.length, finalNearbyResults.length, formData.businessName);
        } else {
            hideLoadingIndicator();
            showNoResultsMessage();
        }

    } catch (error) {
        console.error("Enhanced search error:", error);
        hideLoadingIndicator();
        showErrorMessage(`Error searching for businesses: ${error.message}`);
    }
}

/**
 * FIXED: Enhanced search results display with better priority order
 */
function displaySearchResultsWithBetterPriority(businesses) {
    try {
        console.log(`📋 IMPROVED RESULTS: Displaying ${businesses.length} businesses in better priority order`);

        // Ensure loading indicator is hidden
        hideLoadingIndicator();

        const businessSearchTable = document.getElementById('business_search');
        const searchTableContainer = document.getElementById('search_table');

        if (!businessSearchTable || !searchTableContainer) {
            console.error("❌ Required table elements not found in the DOM");
            showErrorMessage("There was an error displaying search results. Please try again later.");
            return;
        }

        // Get the table body
        let tableBody = businessSearchTable.querySelector('tbody');
        if (!tableBody) {
            console.error("❌ Table body not found");
            showErrorMessage("There was an error displaying search results. Please try again later.");
            return;
        }

        // Clear existing rows
        tableBody.innerHTML = '';

        // Show the search results table
        searchTableContainer.style.display = 'block';

        // Hide the "hidden" text in the h5
        const searchTableH5 = searchTableContainer.querySelector('h5');
        if (searchTableH5) {
            searchTableH5.style.display = 'none';
        }

        if (businesses.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" class="text-center">No businesses found matching your search criteria.</td></tr>';
            searchTableContainer.scrollIntoView({behavior: 'smooth'});
            return;
        }

        // IMPROVED: Categorize businesses by NEW priority order
        const primaryBusinesses = businesses.filter(b => b.priority === 1); // Database matches
        const relevantPlacesBusinesses = businesses.filter(b => b.priority === 2); // Relevant Google Places
        const nearbyDatabaseBusinesses = businesses.filter(b => b.priority === 3); // Other nearby businesses

        console.log(`📊 IMPROVED TABLE CATEGORIES:`);
        console.log(`   - 🔴 Primary Database Results: ${primaryBusinesses.length}`);
        console.log(`   - 🔵 Additional Relevant Locations: ${relevantPlacesBusinesses.length}`);
        console.log(`   - 🟢 Other Nearby Businesses: ${nearbyDatabaseBusinesses.length}`);

        // Add section headers and businesses in IMPROVED priority order
        let rowIndex = 0;

        // SECTION 1: Primary Search Results (RED) - Highest Priority
        if (primaryBusinesses.length > 0) {
            addTableSectionHeader(tableBody, `🎯 Database Results (${primaryBusinesses.length})`, 'primary-section');
            primaryBusinesses.forEach((business, index) => {
                console.log(`📝 Adding primary business ${index + 1}: ${business.bname}`);
                addCategorizedBusinessRow(business, tableBody, 'primary');
                rowIndex++;
            });
        }

        // SECTION 2: Additional Relevant Locations (BLUE) - Second Priority
        if (relevantPlacesBusinesses.length > 0) {
            addTableSectionHeader(tableBody, `📍 Additional Locations Found (${relevantPlacesBusinesses.length})`, 'places-section');
            relevantPlacesBusinesses.forEach((business, index) => {
                console.log(`📝 Adding relevant Places business ${index + 1}: ${business.bname}`);
                addCategorizedBusinessRow(business, tableBody, 'places');
                rowIndex++;
            });
        }

        // SECTION 3: Other Nearby Database Businesses (GREEN) - Third Priority
        if (nearbyDatabaseBusinesses.length > 0) {
            addTableSectionHeader(tableBody, `🏢 Other Nearby Businesses (${nearbyDatabaseBusinesses.length})`, 'database-section');
            nearbyDatabaseBusinesses.forEach((business, index) => {
                console.log(`📝 Adding nearby database business ${index + 1}: ${business.bname}`);
                addCategorizedBusinessRow(business, tableBody, 'database');
                rowIndex++;
            });
        }

        // Scroll to the results
        searchTableContainer.scrollIntoView({behavior: 'smooth'});

        console.log(`✅ Improved priority search results displayed: ${rowIndex} total rows`);

    } catch (error) {
        console.error("❌ Error displaying improved priority search results:", error);
        hideLoadingIndicator();
        showErrorMessage("There was an error displaying the search results: " + error.message);
    }
}

/**
 * FIXED: Display businesses on map with better priority (same marker colors, better order)
 */
function displayBusinessesOnMapWithBetterPriority(businesses) {
    if (!map) {
        console.log("⏳ Map not ready, storing businesses for later display");
        pendingBusinessesToDisplay = businesses;
        return;
    }

    console.log(`🗺️ IMPROVED MAP DISPLAY: Displaying ${businesses.length} businesses with better priority`);

    // Clear existing markers and create new bounds
    clearMarkers();
    bounds = new google.maps.LatLngBounds();

    // Counters for each priority category
    let primaryMarkers = 0;
    let relevantPlacesMarkers = 0;
    let nearbyDatabaseMarkers = 0;
    let skippedBusinesses = 0;

    // Sort businesses by priority to ensure proper display order
    const sortedBusinesses = [...businesses].sort((a, b) => (a.priority || 999) - (b.priority || 999));

    // Process each business with improved priority handling
    sortedBusinesses.forEach((business, index) => {
        try {
            console.log(`🔄 Processing business ${index + 1}/${sortedBusinesses.length}: ${business.bname} (Priority: ${business.priority})`);

            // Skip parent chain businesses
            if (business.is_chain === true) {
                console.log(`🚫 Skipping parent chain business: ${business.bname}`);
                skippedBusinesses++;
                return;
            }

            // Get coordinates
            const businessLocation = getBusinessLocation(business);
            if (!businessLocation) {
                console.warn(`❌ Business ${business.bname} missing coordinates`);
                skippedBusinesses++;
                return;
            }

            // Update business object with coordinates
            business.lat = businessLocation.lat;
            business.lng = businessLocation.lng;

            // Create categorized marker with priority awareness
            const marker = createCategorizedBusinessMarker(business);
            if (marker) {
                // Count by priority category
                switch (business.priority) {
                    case 1:
                        primaryMarkers++;
                        break;
                    case 2:
                        relevantPlacesMarkers++;
                        break;
                    case 3:
                        nearbyDatabaseMarkers++;
                        break;
                    default:
                        nearbyDatabaseMarkers++; // fallback
                        break;
                }

                console.log(`✅ Created priority ${business.priority} marker for ${business.bname}`);

                // Extend bounds
                const position = new google.maps.LatLng(businessLocation.lat, businessLocation.lng);
                bounds.extend(position);
            } else {
                console.error(`❌ Failed to create marker for ${business.bname}`);
                skippedBusinesses++;
            }
        } catch (error) {
            console.error(`❌ Error processing business ${business.bname}:`, error);
            skippedBusinesses++;
        }
    });

    console.log(`📊 IMPROVED PRIORITY MARKER SUMMARY:`);
    console.log(`   - 🔴 Priority 1 - Database Results (RED): ${primaryMarkers} markers`);
    console.log(`   - 🔵 Priority 2 - Additional Locations (BLUE): ${relevantPlacesMarkers} markers`);
    console.log(`   - 🟢 Priority 3 - Other Nearby (GREEN): ${nearbyDatabaseMarkers} markers`);
    console.log(`   - ❌ Skipped: ${skippedBusinesses} businesses`);
    console.log(`   - ✅ Total Created: ${primaryMarkers + relevantPlacesMarkers + nearbyDatabaseMarkers} markers`);

    // Update map view with intelligent centering
    setTimeout(() => {
        try {
            if (window.currentSearchLocation && (primaryMarkers > 0 || relevantPlacesMarkers > 0)) {
                console.log("📍 Centering map on search location with relevant results");
                const searchLatLng = new google.maps.LatLng(
                    window.currentSearchLocation.lat,
                    window.currentSearchLocation.lng
                );
                map.setCenter(searchLatLng);
                map.setZoom(12);
            } else if (primaryMarkers + relevantPlacesMarkers + nearbyDatabaseMarkers > 0 && bounds && !bounds.isEmpty()) {
                console.log("🎯 Fitting map to all business bounds");
                safelyFitBounds(map, bounds);
            } else {
                console.log("🌎 Using default map center");
                map.setCenter(CONFIG.defaultCenter);
                map.setZoom(CONFIG.defaultZoom);
            }
        } catch (error) {
            console.error("❌ Error updating map view:", error);
        }
    }, 200);
}

/**
 * FIXED: Enhanced success message with better priority explanation
 */
function showImprovedSearchSuccessMessage(primaryCount, placesCount, nearbyCount, searchTerm) {
    // Create enhanced success banner
    const successBanner = document.createElement('div');
    successBanner.className = 'enhanced-search-success-banner';

    let message = `Found ${primaryCount + placesCount + nearbyCount} businesses`;

    if (searchTerm) {
        message += ` for "${searchTerm}"`;
    }

    message += ': ';

    const parts = [];

    if (primaryCount > 0) {
        parts.push(`<span class="success-primary">${primaryCount} in database</span>`);
    }
    if (placesCount > 0) {
        parts.push(`<span class="success-places">${placesCount} additional location${placesCount !== 1 ? 's' : ''}</span>`);
    }
    if (nearbyCount > 0) {
        parts.push(`<span class="success-database">${nearbyCount} other nearby</span>`);
    }

    message += parts.join(', ');

    successBanner.innerHTML = `
        <div class="enhanced-success-content">
            <span class="success-icon">✅</span>
            <span class="success-text">${message}</span>
            <button onclick="this.parentElement.parentElement.remove()" class="close-success">×</button>
        </div>
        <div class="success-legend">
            <span class="legend-item"><span class="legend-dot red"></span>Database Results</span>
            <span class="legend-item"><span class="legend-dot blue"></span>Additional Locations</span>
            <span class="legend-item"><span class="legend-dot green"></span>Other Nearby</span>
        </div>
    `;

    // Add to page
    const mainContent = document.querySelector('main') || document.body;
    mainContent.insertBefore(successBanner, mainContent.firstChild);

    // Auto-remove after 8 seconds
    setTimeout(() => {
        if (successBanner.parentNode) {
            successBanner.remove();
        }
    }, 8000);
}

/**
 * FINAL: Enhanced Google Places search with proper radius
 */
async function searchGooglePlacesForBusinessEnhanced(businessName, searchLocation) {
    try {
        const {Place} = await google.maps.importLibrary("places");
        const center = new google.maps.LatLng(searchLocation.lat, searchLocation.lng);
        const searchRadius = 50000; // 50km

        const request = {
            textQuery: businessName,
            locationBias: { center: center, radius: searchRadius },
            maxResultCount: 20,
            fields: ['id', 'displayName', 'formattedAddress', 'location', 'types',
                'nationalPhoneNumber', 'internationalPhoneNumber', 'businessStatus']
        };

        const {places} = await Place.searchByText(request);
        if (!places || places.length === 0) {
            // Fallback with larger radius
            const fallbackRequest = {
                ...request,
                locationBias: { center: center, radius: 75000 }
            };
            const {places: fallbackPlaces} = await Place.searchByText(fallbackRequest);
            if (!fallbackPlaces || fallbackPlaces.length === 0) return [];
            return await processPlacesResults(fallbackPlaces, center, businessName);
        }

        return await processPlacesResults(places, center, businessName);
    } catch (error) {
        console.error("Error in Places API search:", error);
        return [];
    }
}

/**
 * Process Places API results
 */
async function processPlacesResults(places, searchCenter, businessName) {
    const validPlaces = places.filter(place => {
        if (place.businessStatus === 'CLOSED_PERMANENTLY') return false;

        const placeName = place.displayName.toLowerCase();
        const searchTerm = businessName.toLowerCase();

        if (!placeName.includes(searchTerm) && !searchTerm.includes(placeName)) {
            const searchWords = searchTerm.split(' ');
            const placeWords = placeName.split(' ');

            let matchCount = 0;
            for (const searchWord of searchWords) {
                if (placeWords.some(placeWord =>
                    placeWord.includes(searchWord) || searchWord.includes(placeWord)
                )) {
                    matchCount++;
                }
            }

            if (matchCount < Math.ceil(searchWords.length / 2)) return false;
        }
        return true;
    });

    const businessPromises = validPlaces.map(async (place) => {
        const addressParts = place.formattedAddress ? place.formattedAddress.split(',') : [];
        let address1 = '', city = '', state = '', zip = '';

        if (addressParts.length >= 1) address1 = addressParts[0].trim();
        if (addressParts.length >= 2) city = addressParts[1].trim();
        if (addressParts.length >= 3) {
            const stateZipMatch = addressParts[2].trim().match(/^([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/);
            if (stateZipMatch) {
                state = stateZipMatch[1];
                zip = stateZipMatch[2];
            }
        }

        const distance = google.maps.geometry.spherical.computeDistanceBetween(searchCenter, place.location);

        let lat = 0, lng = 0;
        if (place.location) {
            try {
                lat = typeof place.location.lat === 'function' ? place.location.lat() : place.location.lat || 0;
                lng = typeof place.location.lng === 'function' ? place.location.lng() : place.location.lng || 0;
            } catch (coordError) {
                lat = searchCenter.lat();
                lng = searchCenter.lng();
            }
        }

        const business = {
            _id: 'google_' + place.id,
            bname: place.displayName,
            address1, city, state, zip,
            formattedAddress: place.formattedAddress,
            type: mapGooglePlaceTypeToBusinessType(place.types),
            phone: place.nationalPhoneNumber || place.internationalPhoneNumber || '',
            isGooglePlace: true,
            placeId: place.id,
            lat, lng, distance,
            businessStatus: place.businessStatus
        };

        try {
            const chainMatch = await findMatchingChainForPlaceResult(place.displayName);
            if (chainMatch) {
                business.chain_id = chainMatch._id;
                business.chain_name = chainMatch.bname;
                business.isChainLocation = true;
            }
        } catch (error) {
            console.warn(`Chain matching failed for ${place.displayName}:`, error.message);
        }

        return business;
    });

    const businesses = await Promise.all(businessPromises);
    businesses.sort((a, b) => a.distance - b.distance);
    return businesses;
}

/**
 * FINAL: Enhanced nearby database search
 */
async function searchNearbyDatabaseBusinessesEnhanced(searchLocation, radiusKm, excludeBusinessName = '') {
    try {
        const baseURL = getBaseURL();
        const enhancedRadius = Math.max(radiusKm, 30);

        const params = new URLSearchParams({
            operation: 'search',
            lat: searchLocation.lat,
            lng: searchLocation.lng,
            radius: enhancedRadius,
            limit: 100
        });

        const response = await fetch(`${baseURL}/api/business.js?${params.toString()}`);
        if (!response.ok) throw new Error(`Nearby search failed: ${response.status}`);

        const data = await response.json();
        let nearbyBusinesses = data.results || [];

        return nearbyBusinesses.filter(business => {
            if (business.is_chain === true) return false;

            if (excludeBusinessName) {
                const businessNameLower = business.bname.toLowerCase();
                const excludeNameLower = excludeBusinessName.toLowerCase();

                if (businessNameLower === excludeNameLower ||
                    businessNameLower.includes(excludeNameLower) ||
                    excludeNameLower.includes(businessNameLower)) {
                    return false;
                }
            }

            return hasValidCoordinates(business);
        });
    } catch (error) {
        console.error("Error in nearby database search:", error);
        return [];
    }
}

/**
 * ENHANCED: Better nearby search that provides more debugging info
 */
async function searchNearbyDatabaseBusinessesWithDebugging(searchLocation, radiusKm, excludeBusinessName = '') {
    try {
        console.log(`🏢 DEBUGGING NEARBY SEARCH: ${radiusKm}km radius around ${searchLocation.lat}, ${searchLocation.lng}`);
        console.log(`   Excluding business name: "${excludeBusinessName}"`);

        const baseURL = getBaseURL();

        // Use larger radius for metro areas
        const enhancedRadius = Math.max(radiusKm, 30);
        console.log(`   Using enhanced radius: ${enhancedRadius}km`);

        // Build API URL for location-based search
        const params = new URLSearchParams({
            operation: 'search',
            lat: searchLocation.lat,
            lng: searchLocation.lng,
            radius: enhancedRadius,
            limit: 100
        });

        const apiURL = `${baseURL}/api/business.js?${params.toString()}`;
        console.log(`🌐 DEBUGGING nearby search URL: ${apiURL}`);

        const response = await fetch(apiURL);
        if (!response.ok) {
            throw new Error(`Nearby search failed: ${response.status}`);
        }

        const data = await response.json();
        let nearbyBusinesses = data.results || [];

        console.log(`📊 DEBUGGING raw nearby results: ${nearbyBusinesses.length} businesses total`);

        // Log ALL businesses found (first 20) for debugging
        console.log("🔍 ALL NEARBY BUSINESSES FOUND (first 20):");
        nearbyBusinesses.slice(0, 20).forEach((business, index) => {
            const isChain = business.is_chain === true ? ' (CHAIN PARENT)' : '';
            const hasCoords = hasValidCoordinates(business) ? '✅' : '❌';
            console.log(`   ${index + 1}. ${business.bname} - ${business.city}, ${business.state} ${hasCoords}${isChain}`);
        });

        // Filter with detailed logging
        const filteredBusinesses = nearbyBusinesses.filter((business, index) => {
            console.log(`🔍 FILTERING #${index + 1}: ${business.bname}`);

            // Exclude parent chains
            if (business.is_chain === true) {
                console.log(`   🚫 EXCLUDE: Parent chain business`);
                return false;
            }

            // Check coordinates
            if (!hasValidCoordinates(business)) {
                console.log(`   🚫 EXCLUDE: Invalid coordinates`);
                return false;
            }

            // Check business name exclusion
            if (excludeBusinessName) {
                const businessNameLower = business.bname.toLowerCase();
                const excludeNameLower = excludeBusinessName.toLowerCase();

                if (businessNameLower === excludeNameLower ||
                    businessNameLower.includes(excludeNameLower) ||
                    excludeNameLower.includes(businessNameLower)) {
                    console.log(`   🚫 EXCLUDE: Matches excluded name "${excludeBusinessName}"`);
                    return false;
                }
            }

            console.log(`   ✅ INCLUDE: ${business.bname}`);
            return true;
        });

        console.log(`✅ DEBUGGING FILTER RESULTS: ${filteredBusinesses.length} businesses after filtering`);

        // Log final results
        if (filteredBusinesses.length > 0) {
            console.log("📋 FINAL NEARBY BUSINESSES:");
            filteredBusinesses.slice(0, 10).forEach((business, index) => {
                console.log(`   ${index + 1}. ${business.bname} (${business.type}) - ${business.city}, ${business.state}`);
            });
        } else {
            console.log("❌ NO NEARBY BUSINESSES after filtering - this indicates a potential issue");
        }

        return filteredBusinesses;

    } catch (error) {
        console.error("❌ Error in debugging nearby database search:", error);
        return [];
    }
}

console.log("🚀 NEARBY SEARCH FIX loaded!");
console.log("🔍 Run debugNearbySearchOnly() to debug just the nearby search");
console.log("📍 Should now show: 1 red (Cedar Rapids), 9 blue (Las Vegas Olive Gardens), + green (Home Depot, etc.)");

// Export functions for global access
if (typeof window !== 'undefined') {
    // Export only the final working functions
    window.performEnhancedBusinessSearch = performEnhancedBusinessSearch;
    window.retrieveFromMongoDB = performEnhancedBusinessSearch;
    window.searchGooglePlacesForBusinessEnhanced = searchGooglePlacesForBusinessEnhanced;
    window.searchNearbyDatabaseBusinessesEnhanced = searchNearbyDatabaseBusinessesEnhanced;
    window.categorizeResultsWithFixedDuplicateDetection = categorizeResultsWithFixedDuplicateDetection;
    window.createEnhancedAddressKey = createEnhancedAddressKey;
    window.createBusinessNameKey = createBusinessNameKey;
    window.clearMarkers = clearMarkers;
    window.getUserLocation = getUserLocation;
    window.getBaseURL = getBaseURL;
    window.isValidPosition = isValidPosition;
    window.createSafeLatLng = createSafeLatLng;
    window.safelyFitBounds = safelyFitBounds;
    window.searchNearbyDatabaseBusinessesWithDebugging = searchNearbyDatabaseBusinessesWithDebugging;
    window.processPlacesResults = processPlacesResults;
    window.searchGooglePlacesForBusiness = searchGooglePlacesForBusinessEnhanced;
    window.searchNearbyDatabaseBusinesses = searchNearbyDatabaseBusinessesEnhanced;
    window.displaySearchResultsWithBetterPriority = displaySearchResultsWithBetterPriority;
    window.displayBusinessesOnMapWithBetterPriority = displayBusinessesOnMapWithBetterPriority;
    window.showImprovedSearchSuccessMessage = showImprovedSearchSuccessMessage;
    window.displayBusinessesOnMap = displayBusinessesOnMapWithCategories;
    window.displaySearchResults = displaySearchResultsWithCategories;
    window.displayBusinessesOnMapFixed = displayBusinessesOnMapWithCategories;
    window.displaySearchResultsFixed = displaySearchResultsWithCategories;
    window.showEnhancedInfoWindowWithCategory = showEnhancedInfoWindowWithCategory;
    window.buildCategoryAwareInfoWindowContent = buildCategoryAwareInfoWindowContent;
    window.createCategorizedBusinessMarker = createCategorizedBusinessMarker;
    window.addTableSectionHeader = addTableSectionHeader;
    window.addCategorizedBusinessRow = addCategorizedBusinessRow;
    window.showEnhancedSearchSuccessMessage = showEnhancedSearchSuccessMessage;
    window.updateMapLegendWithCategories = updateMapLegendWithCategories;
    window.getApproximateLocation = getApproximateLocation;
    window.showUserFriendlyError = showUserFriendlyError;
    window.showSearchSuccessMessage = showSearchSuccessMessage;
    window.clearSearchForm = clearSearchForm;
    window.createDebugDashboard = createDebugDashboard;
    window.checkMapMarkers = checkMapMarkers;
    window.emergencyReset = emergencyReset;
    window.updateDebugStatus = updateDebugStatus;
    window.addEnhancedUserInterfaceCSS = addEnhancedUserInterfaceCSS;
    window.findMatchingChainForPlaceResult = findMatchingChainForPlaceResultFixed;
    window.findMatchingChainLocallyEnhanced = findMatchingChainLocallyEnhanced;
    window.tryServerSideChainMatchingOptimized = tryServerSideChainMatchingOptimized;
    window.clearChainMatchCache = clearChainMatchCache;
    window.getChainMatchCacheStatus = getChainMatchCacheStatus;
    window.processApiQueue = processApiQueue;
    window.buildEnhancedInfoWindowContent = buildEnhancedInfoWindowContentFixed2;
    window.showEnhancedInfoWindow = showEnhancedInfoWindowFixed2;
    window.loadChainIncentivesForEnhancedWindow = loadChainIncentivesForEnhancedWindowFixed;
    window.loadIncentivesForEnhancedWindow = loadIncentivesForEnhancedWindowFixed;
    window.loadChainIncentivesForDatabaseBusiness = loadChainIncentivesForDatabaseBusinessFixed;
    window.createBusinessMarker = createBusinessMarker;
    window.fetchBusinessIncentivesFixed = fetchBusinessIncentivesFixed;
    window.addBusinessRowFixed = addBusinessRowFixed;
    window.fetchBusinessIncentives = fetchBusinessIncentivesFixed;
    window.addBusinessRow = addBusinessRowFixed;
    window.supplementWithGooglePlaces = supplementWithGooglePlaces;
    window.createBusinessMarker = createBusinessMarker;
    window.searchDatabaseWithFuzzyMatching = searchDatabaseWithFuzzyMatching;
    window.hasValidCoordinates = hasValidCoordinates;
    window.checkForNewlyAddedBusiness = checkForNewlyAddedBusiness;
    window.updateLoadingMessage = updateLoadingMessage;
    window.hideLoadingIndicator = hideLoadingIndicator;
    window.showNoResultsMessage = showNoResultsMessage;
    window.showErrorMessage = showErrorMessage;
    window.addEnhancedLoadingCSS = addEnhancedLoadingCSS;
    window.calculateSimilarity = calculateSimilarity;
    window.extractKeywords = extractKeywords;
    window.generateNameVariations = generateNameVariations;
    window.tryServerSideChainMatching = tryServerSideChainMatching;
    window.getChainFromDatabase = getChainFromDatabase;
    window.searchGooglePlacesForBusinessLegacy = searchGooglePlacesForBusinessLegacy;
    window.loadChainIncentivesInContainer = loadChainIncentivesInContainer;
    window.generateNameVariations = generateNameVariations;
    window.findMatchingChainLocally = findMatchingChainLocally;
    window.initGoogleMap = initGoogleMap;
    window.debugMapState = debugMapState;
    window.validateField = validateField;
    window.isNotEmpty = isNotEmpty;
    window.setupMapClickHandler = setupMapClickHandler;
    window.buildInfoWindowContent = buildInfoWindowContent;
    window.getPlaceTypeLabel = getPlaceTypeLabel;
    window.safeExtractCoordinates = safeExtractCoordinates;
    window.showInfoWindow = showInfoWindow;
    window.withErrorHandling = withErrorHandling;
    window.createEnhancedBusinessMarker = createEnhancedBusinessMarker;
    window.showEnhancedInfoWindow = showEnhancedInfoWindow;
    window.buildEnhancedInfoWindowContent = buildEnhancedInfoWindowContent;
    window.addEnhancedMarkerStyles = addEnhancedMarkerStyles;
    window.getBusinessTypeTextIcon = getBusinessTypeTextIcon;
    window.createEnhancedFallbackMarker = createEnhancedFallbackMarker;
    window.createEnhancedBusinessMarker = createEnhancedBusinessMarker;
    window.addEnhancedMarkerStyles = addEnhancedMarkerStyles;
    window.searchNearbyBusinesses = searchNearbyBusinesses;
    window.getSimilarBusinessTypes = getSimilarBusinessTypes;
    window.getBusinessLocation = getBusinessLocation;
    window.createSimilarBusinessMarker = createSimilarBusinessMarker;

    addEnhancedUserInterfaceCSS();

}


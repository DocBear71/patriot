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
async function showPlaceInfoWindow(place, position) {
    try {
        // Extract business name
        const businessName = place.displayName || place.name || 'Unnamed Place';

        // Check if this place matches a chain in our database
        let chainMatch = null;
        try {
            chainMatch = await findMatchingChainForPlaceResult(businessName);
        } catch (error) {
            console.error("Error checking chain match:", error);
        }

        // Create a business object
        const business = {
            _id: 'google_' + (place.place_id || place.id),
            bname: businessName,
            address1: place.formattedAddress || place.formatted_address || 'Address not available',
            city: '',
            state: '',
            zip: '',
            phone: place.nationalPhoneNumber || place.formatted_phone_number || '',
            isGooglePlace: true,
            placeId: place.place_id || place.id,
            lat: position.lat(),
            lng: position.lng()
        };

        // If the place matches a chain, add chain info
        if (chainMatch) {
            console.log(`Place "${businessName}" matches chain: ${chainMatch.bname}`);
            business.chain_id = chainMatch._id;
            business.chain_name = chainMatch.bname;
            business.isChainLocation = true;
        }

        // Create a temporary marker object for the info window
        const tempMarker = {
            business: business,
            position: position
        };

        // Show the custom info window with the business
        showInfoWindow(tempMarker);
    } catch (error) {
        console.error("Error in showPlaceInfoWindow:", error);

        // Fallback to standard info window
        const infoWindow = new google.maps.InfoWindow({
            content: `<div class="info-window">
                        <h3>${place.displayName || place.name || 'Unnamed Place'}</h3>
                        <p><strong>Address:</strong><br>${place.formattedAddress || place.formatted_address || 'Address not available'}</p>
                        <p><strong>Status:</strong> Not in database</p>
                      </div>`,
            position: position
        });
        infoWindow.open(map);
    }
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
 * Extract just the street number and name for more lenient matching
 * @param {string} address - Full address string
 * @returns {string} - Just the street number and name
 */
function getStreetNumberAndName(address) {
    if (!address) return '';

    // Normalize first
    const normalized = normalizeAddress(address);

    // Try to extract just the street number and name
    // This regex looks for a number followed by one or more words
    const match = normalized.match(/(\d+)\s+([a-z]+(?:\s+[a-z]+)*)/i);

    if (match && match.length >= 3) {
        // Return the number and first word of street name
        return `${match[1]} ${match[2].split(' ')[0]}`;
    }

    return normalized;
}

/**
 * Enhanced normalizeAddress function with more abbreviation replacements
 * @param {string} address - Address string to normalize
 * @returns {string} - Normalized address
 */
function normalizeAddress(address) {
    if (!address) return '';

    return address
        .toLowerCase()
        // Replace common abbreviations
        .replace(/\bst\b/g, 'street')
        .replace(/\be\b/g, 'east')
        .replace(/\bw\b/g, 'west')
        .replace(/\bn\b/g, 'north')
        .replace(/\bs\b/g, 'south')
        .replace(/\bave\b/g, 'avenue')
        .replace(/\bblvd\b/g, 'boulevard')
        .replace(/\brd\b/g, 'road')
        .replace(/\bdr\b/g, 'drive')
        .replace(/\bln\b/g, 'lane')
        .replace(/\bct\b/g, 'court')
        .replace(/\bpkwy\b/g, 'parkway')
        .replace(/\bpl\b/g, 'place')
        .replace(/\bapt\b/g, '')
        .replace(/\bste\b/g, '')
        .replace(/\bunit\b/g, '')
        .replace(/\b#\d+\b/g, '')
        // Remove all non-alphanumeric characters except spaces
        .replace(/[^a-z0-9\s]/g, '')
        // Replace multiple spaces with a single space
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Check if a Google Places result matches a business in our database
 * @param {Object} place - Business object from Google Places
 * @param {Array} databaseBusinesses - Array of businesses from database
 * @returns {Object|null} - Matching database business or null if no match
 */
function findMatchingDatabaseBusiness(place, databaseBusinesses) {
    if (!place || !Array.isArray(databaseBusinesses) || databaseBusinesses.length === 0) {
        return null;
    }

    // First normalize the place's address and name for comparison
    const placeAddress = normalizeAddress(place.address1 || '');
    const placeName = (place.bname || '').toLowerCase();

    // Extract just the street number and name for more lenient matching
    const placeStreetMatch = getStreetNumberAndName(place.address1 || '');

    console.log(`Finding database match for place: ${place.bname}, address: ${place.address1}`);
    console.log(`Normalized place address: ${placeAddress}`);
    console.log(`Street number and name: ${placeStreetMatch}`);

    // Keep track of the best match
    let bestMatch = null;
    let bestMatchScore = 0;

    // Check each database business
    for (const dbBusiness of databaseBusinesses) {
        // Skip if essential data is missing
        if (!dbBusiness || !dbBusiness.bname) continue;

        // Check for name match (case insensitive)
        const nameMatch = placeName === (dbBusiness.bname || '').toLowerCase();

        // Check for address match using normalized comparison
        const dbAddress = normalizeAddress(dbBusiness.address1 || '');
        const addressMatch = placeAddress && dbAddress && placeAddress === dbAddress;

        // Extract just the street number and name for more lenient matching
        const dbStreetMatch = getStreetNumberAndName(dbBusiness.address1 || '');
        const streetMatch = placeStreetMatch && dbStreetMatch && placeStreetMatch === dbStreetMatch;

        console.log(`Comparing with DB business: ${dbBusiness.bname}, address: ${dbBusiness.address1}`);
        console.log(`Normalized DB address: ${dbAddress}`);
        console.log(`Street number and name: ${dbStreetMatch}`);
        console.log(`Name match: ${nameMatch}, Address match: ${addressMatch}, Street match: ${streetMatch}`);

        // Handle the "New" vs "New York" city parsing issue
        const cityMatch =
            place.city &&
            dbBusiness.city &&
            (place.city.toLowerCase() === dbBusiness.city.toLowerCase() ||
                (place.city.toLowerCase() === 'new' &&
                    dbBusiness.city.toLowerCase().startsWith('new')));

        // Check for coordinate proximity if both have coordinates
        let coordinatesMatch = false;

        if (place.lat && place.lng &&
            dbBusiness.location && dbBusiness.location.coordinates &&
            dbBusiness.location.coordinates.length >= 2) {

            const distance = Math.sqrt(
                Math.pow(place.lat - dbBusiness.location.coordinates[1], 2) +
                Math.pow(place.lng - dbBusiness.location.coordinates[0], 2)
            );

            // If coordinates are within ~100 meters (very rough estimation)
            coordinatesMatch = distance < 0.001;
            console.log(`Coordinates match: ${coordinatesMatch} (distance: ${distance})`);
        }

        // Calculate a match score (higher is better)
        let matchScore = 0;
        if (nameMatch) matchScore += 50;
        if (addressMatch) matchScore += 40;
        if (streetMatch) matchScore += 30;
        if (cityMatch) matchScore += 20;
        if (coordinatesMatch) matchScore += 10;

        console.log(`Match score: ${matchScore}`);

        // Update best match if this is better
        if (matchScore > bestMatchScore) {
            bestMatch = dbBusiness;
            bestMatchScore = matchScore;
        }
    }

    // Consider it a match if the score is high enough
    // Name match + either address or street match should be enough
    if (bestMatchScore >= 70) {
        console.log(`Found matching database business: ${bestMatch._id} with score ${bestMatchScore}`);
        return bestMatch;
    }

    // No match found
    console.log("No matching database business found");
    return null;
}

/**
 * Local fallback for chain matching when API is unavailable
 * Hardcoded for common chains until API is working
 * @param {string} placeName - Place name to match
 * @returns {Object|null} - Chain object or null if no match
 */
function findMatchingChainLocally(placeName) {
    if (!placeName) return null;

    // Normalize the place name for comparison
    const normalizedName = placeName.toLowerCase()
        .replace(/^the\s+/, '')
        .replace(/\s+inc\.?$/, '')
        .replace(/\s+corp\.?$/, '')
        .trim();

    // Add special handling for Lowe's which might have a different format
    const isLowes = normalizedName.includes('lowes') ||
        normalizedName.includes('lowe\'s') ||
        normalizedName.includes('lowes home') ||
        normalizedName.includes('lowe\'s home');

    console.log(`Normalized place name: "${normalizedName}", isLowes: ${isLowes}`);

    // List of known chains to check against with real chain IDs
    // Based on the console logs, we know the Home Depot chain ID
    const knownChains = [
        {
            _id: '681fe0e67d92c3d3e1e2a3da', // Home Depot chain ID from your database
            bname: 'The Home Depot',
            normalizedName: 'home depot',
            type: 'HARDW',
            is_chain: true
        },
        // Add more chains here if you know their IDs
        {
            _id: 'walmart_chain_id', // Replace with actual Walmart chain ID if available
            bname: 'Walmart',
            normalizedName: 'walmart',
            type: 'RETAIL',
            is_chain: true
        },
        {
            _id: 'lowes_chain_id', // Replace with actual Lowe's chain ID if available
            bname: 'Lowe\'s Home Improvement',
            normalizedName: 'lowes home improvement',
            type: 'HARDW',
            is_chain: true
        }
        // You can add more chains as you create them in your database
    ];

    // Check for matches
    for (const chain of knownChains) {
        // Special handling for Lowe's
        if (isLowes && chain.normalizedName.includes('lowes')) {
            console.log(`Local chain match found: "${placeName}" matches "${chain.bname}" (via Lowe's special handling)`);
            return chain;
        }

        // Normal matching logic
        if (normalizedName.includes(chain.normalizedName) ||
            chain.normalizedName.includes(normalizedName)) {
            console.log(`Local chain match found: "${placeName}" matches "${chain.bname}"`);
            return chain;
        }
    }

    return null;
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
 * Enhanced addBusinessToDatabase function that handles chain-matched places differently
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
 * Finish adding business process
 * @param {Object} businessData - Business data to store
 */
function finishAddingBusiness(businessData) {
    // Store in sessionStorage for the add business page to use
    sessionStorage.setItem('newBusinessData', JSON.stringify(businessData));

    // Log the data being stored
    console.log("Storing business data in sessionStorage:", businessData);

    // Redirect to add business page
    window.location.href = 'business-add.html?prefill=true';
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

    const apiURL = `${baseURL}/api/combined-api.js?operation=incentives&business_id=${businessId}`;

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

// Updated function to fetch chain incentives for a Google Places result
function fetchChainIncentivesForPlacesResult(placeId, chainId) {
    if (!placeId || !chainId) {
        console.error("Missing place ID or chain ID for fetching chain incentives");
        return;
    }

    // Determine the base URL
    const baseURL = getBaseURL();

    // Build the API URL to fetch chain incentives for Places result
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

            // Find the div where we'll display incentives
            const incentivesDiv = document.getElementById(`info-window-incentives-${placeId}`);

            if (!incentivesDiv) {
                console.error(`Could not find incentives div for place ${placeId}`);
                return;
            }

            // Check if there are any chain incentives
            if (!data.results || data.results.length === 0) {
                incentivesDiv.innerHTML = '<p><strong>Incentives:</strong> No chain incentives available</p>';
                return;
            }

            // Build HTML for the chain incentives
            let incentivesHTML = '<p><strong>Incentives:</strong></p><ul class="incentives-list">';

            data.results.forEach(incentive => {
                if (incentive.is_available) {
                    const typeLabel = getIncentiveTypeLabel(incentive.type);
                    const otherDescription = incentive.other_description ?
                        ` (${incentive.other_description})` : '';

                    incentivesHTML += `
                        <li>
                            <strong>${typeLabel}${otherDescription}:</strong> ${incentive.amount}% 
                            <span class="chain-badge small">Chain-wide</span>
                            ${incentive.information ? `<div>${incentive.information}</div>` : ''}
                        </li>
                    `;
                }
            });

            incentivesHTML += '</ul>';

            if (incentivesHTML === '<p><strong>Incentives:</strong></p><ul class="incentives-list"></ul>') {
                incentivesDiv.innerHTML = '<p><strong>Incentives:</strong> No active chain incentives found</p>';
            } else {
                incentivesDiv.innerHTML = incentivesHTML;
            }
        })
        .catch(error => {
            console.error(`Error fetching chain incentives for place ${placeId}:`, error);
            const incentivesDiv = document.getElementById(`info-window-incentives-${placeId}`);

            if (incentivesDiv) {
                incentivesDiv.innerHTML = '<p><strong>Incentives:</strong> Error loading incentives</p>';
            }
        });
}

/**
 * Enhanced version of displaySearchResults to properly categorize businesses
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

        // IMPORTANT: Split businesses into three categories
        // 1. Database businesses (not from Google Places)
        const databaseBusinesses = businesses.filter(b => !b.isGooglePlace);

        // 2. Chain-matched Places businesses
        const chainMatchedPlaces = businesses.filter(b => b.isGooglePlace && b.chain_id);

        // 3. Regular Places businesses
        const regularPlaces = businesses.filter(b => b.isGooglePlace && !b.chain_id);

        console.log(`Businesses to display: ${databaseBusinesses.length} from database, ${chainMatchedPlaces.length} chain-matched Places, ${regularPlaces.length} regular Places`);

        // Add database businesses first
        databaseBusinesses.forEach(business => {
            addBusinessRow(business, tableBody, false);
        });

        // Add chain-matched Places businesses next
        chainMatchedPlaces.forEach(business => {
            addBusinessRow(business, tableBody, true);
        });

        // Add regular Places businesses last
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
    if (!business) return; // skip null or undefined entries

    // Format the address line
    const addressLine = business.address2
        ? `${business.address1}<br>${business.address2}<br>${business.city}, ${business.state} ${business.zip}`
        : `${business.address1}<br>${business.city}, ${business.state} ${business.zip}`;

    // Convert the business type code to a readable label
    const businessType = getBusinessTypeLabel(business.type);

    // Check if this is a chain or from Places API
    const isChainLocation = business.chain_id ? true : false;
    const isParentChain = business.is_chain ? true : false;
    const isGooglePlace = business.isGooglePlace ? true : false;

    // Create appropriate badge for chain businesses
    let chainBadge = '';
    if (isParentChain) {
        chainBadge = '<span class="chain-badge">National Chain</span>';
    } else if (isChainLocation) {
        chainBadge = '<span class="chain-badge">Chain Location</span>';
    } else if (isFromPlaces && business.chain_name) {
        chainBadge = `<span class="chain-badge">Potential ${business.chain_name || 'Chain'} Location</span>`;
    }

    // Create the appropriate button based on business type
    let actionButton;

    if (isParentChain) {
        // For chain parent businesses, only allow admin access
        const isAdmin = checkIfUserIsAdmin();

        if (isAdmin) {
            actionButton = `<button class="admin-action-btn" onclick="handleChainBusinessAction('${business._id}', true)">Admin: Edit Chain</button>`;
        } else {
            actionButton = `<button class="view-chain-btn" onclick="viewChainDetails('${business._id}')">View Chain Info</button>`;
        }
    } else if (isGooglePlace) {
        // For Google Places results, offer to add to database - with different text for chain matches
        if (isChainLocation) {
            actionButton = `<button class="add-to-db-btn" onclick="addBusinessToDatabase('${business.place_data?.place_id || business.placeId || ''}', '${business.chain_id || ''}')">Add Chain Location</button>`;
        } else {
            actionButton = `<button class="add-to-db-btn" onclick="addBusinessToDatabase('${business.place_data?.place_id || business.placeId || ''}')">Add to Database</button>`;
        }
    } else {
        // For database businesses, show map view button
        actionButton = `<button class="view-map-btn" onclick="focusOnMapMarker('${business._id}')">View on Map</button>`;
    }

    // Create a new row
    const row = document.createElement('tr');

    // First populate with basic business info
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

    // Handle incentives lookup based on business type
    if (isFromPlaces && isChainLocation) {
        // For Places API results with chain, get chain incentives
        fetchChainIncentivesForPlacesResult(business._id, business.chain_id);
    } else if (!isGooglePlace) {
        // For database businesses, fetch regular incentives
        fetchBusinessIncentives(business._id, business.chain_id);
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
            // Check if this is a chain business
            const isChainLocation = business.chain_id ? true : false;
            const isParentChain = business.is_chain ? true : false;
            // Create chain badge if needed
            let chainBadge = '';
            if (isParentChain) {
                chainBadge = '<span class="chain-badge">National Chain</span>';
            } else if (isChainLocation) {
                chainBadge = '<span class="chain-badge">Chain Location</span>';
            }

            // Create select button based on if this is a chain parent
            let selectButton;
            if (isParentChain) {
                // Special handling for chain parent - only allow admins
                const isAdmin = checkIfUserIsAdmin(); // You'll need to implement this function

                if (isAdmin) {
                    selectButton = `<button class="select-business admin-only" data-business-id="${business._id}">Admin: Edit Chain</button>`;
                } else {
                    selectButton = `<button class="view-chain-button" data-business-id="${business._id}">View Chain Info</button>`;
                }
            } else {
                // Regular business or chain location
                selectButton = `<button class="select-business" data-business-id="${business._id}">Select</button>`;
            }

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
        setupBusinessSelectionButtons(resultsContainer, businesses);

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
 * Set up business selection buttons with proper handling for chain parents
 */
function setupBusinessSelectionButtons(container, businesses) {
    // Handle regular select buttons
    const selectButtons = container.querySelectorAll('.select-business');
    selectButtons.forEach(button => {
        button.addEventListener('click', function() {
            const businessId = this.getAttribute('data-business-id');
            if (!businessId) {
                console.error("No business ID found on button");
                return;
            }

            // Find the business object
            const selectedBusiness = businesses.find(bus => bus._id === businessId);
            if (!selectedBusiness) {
                console.error("Could not find business with ID: " + businessId);
                return;
            }

            console.log("Selected business: ", selectedBusiness);

            // Handle based on current page
            const currentPagePath = window.location.pathname;
            handleBusinessSelectionByPage(currentPagePath, selectedBusiness);
        });
    });

    // Handle view chain buttons (for non-admin users on chain parents)
    const viewChainButtons = container.querySelectorAll('.view-chain-button');
    viewChainButtons.forEach(button => {
        button.addEventListener('click', function() {
            const businessId = this.getAttribute('data-business-id');
            if (!businessId) return;

            // Find the business object
            const chainBusiness = businesses.find(bus => bus._id === businessId);
            if (!chainBusiness) return;

            // Show information about the chain
            showChainInfoDialog(chainBusiness);
        });
    });
}

/**
 * Check if the current user is an admin
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
          color: #fff;
          background-color: #00f;
          border-radius: 5px;
          
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

            // Check if at least one field is filled
            if (!form.businessName?.value && !form.address?.value && !(form.useMyLocation?.checked)) {
                alert("Please enter either a business name, an address, or use your current location to search");
                return;
            }

            const formData = {
                businessName: form.businessName?.value || '',
                address: form.address?.value || '',
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

    // Add the refresh button
    addRefreshButton();
}

/**
 * Add refresh button to the search form
 * Place this code in your initBusinessSearch function after the form listeners
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
    refreshButton.addEventListener('click', function() {
        // Get current form data
        const businessName = document.getElementById('business-name')?.value || '';
        const address = document.getElementById('address')?.value || '';
        const useMyLocation = document.getElementById('use-my-location')?.checked || false;

        // Create form data object
        const formData = {
            businessName: businessName,
            address: address
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
        retrieveFromMongoDB(formData);

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
 * Add this to your DOMContentLoaded event handler
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
                const submitEvent = new Event('submit', { cancelable: true });
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

        closeButton.addEventListener('click', function() {
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

        // Ensure Google Maps API is loaded
        if (!window.google || !window.google.maps) {
            await new Promise((resolve, reject) => {
                const checkInterval = setInterval(() => {
                    if (window.google && window.google.maps) {
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 200);

                // Set a timeout in case Google Maps never loads
                setTimeout(() => {
                    clearInterval(checkInterval);
                    reject(new Error("Google Maps API failed to load"));
                }, 10000);
            });
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
 * Complete replacement that uses the updated Places API
 * @param {string} query - Search query
 * @param {Object} location - Location with latitude and longitude
 * @param {number} radius - Search radius in meters
 * @returns {Promise<Array>} Places search results
 */
async function searchPlacesClientSide(query, location, radius = 50000) {
    // Make sure Google Maps is initialized first
    if (!window.google || !window.google.maps) {
        await new Promise((resolve, reject) => {
            const checkInterval = setInterval(() => {
                if (window.google && window.google.maps) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 200);

            // Set a timeout in case Google Maps never loads
            setTimeout(() => {
                clearInterval(checkInterval);
                reject(new Error("Google Maps API failed to load"));
            }, 10000);
        });
    }

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
                        center: {
                            lat: location.latitude || location.lat || 0,
                            lng: location.longitude || location.lng || 0
                        },
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
                radius: radius // 50km radius
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

/**
 * Geocode a business address to get coordinates
 * Uses a client-side approach with proper error handling
 * @param {Object} business - Business object with address data
 * @param {number} index - Index of the business in the array
 * @param {number} total - Total number of businesses
 */
function geocodeBusinessAddress(business, index, total) {
    // Skip if business data is invalid or address is missing
    if (!business) {
        console.error("Invalid business data for geocoding");
        return;
    }

    // Ensure business has complete address data
    if (!business.address1 || !business.city || !business.state || !business.zip) {
        console.error("Incomplete address data for geocoding business:", business.bname || "Unknown");

        // If it's a chain business, they might not have an address - use default coordinates
        if (business.is_chain) {
            console.log("Chain business without address, using default center");

            // Use default US center coordinates
            business.lat = CONFIG.defaultCenter.lat;
            business.lng = CONFIG.defaultCenter.lng;

            // Create a position object
            const position = new google.maps.LatLng(business.lat, business.lng);

            // Add marker
            addAdvancedMarker(business, position);

            // Extend bounds
            bounds.extend(position);

            return;
        }

        return;
    }

    // Construct the address string
    const addressString = `${business.address1}, ${business.city}, ${business.state} ${business.zip}`;

    // Add a small delay to avoid hitting rate limits
    setTimeout(async () => {
        try {
            // Use client-side geocoding directly
            const geocoder = new google.maps.Geocoder();

            geocoder.geocode({'address': addressString}, function(results, status) {
                if (status === google.maps.GeocoderStatus.OK) {
                    if (results[0]) {
                        const location = results[0].geometry.location;

                        // Store the coordinates in the business object
                        business.lat = location.lat();
                        business.lng = location.lng();

                        // Create marker
                        addAdvancedMarker(business, location);

                        // Extend bounds if valid
                        if (bounds && location) {
                            bounds.extend(location);
                        }

                        // If this is the last business, fit the map to the bounds
                        if (index === total - 1) {
                            if (bounds && !bounds.isEmpty()) {
                                // Safely set map bounds
                                try {
                                    map.fitBounds(bounds);
                                } catch (error) {
                                    console.error("Error fitting bounds:", error);
                                    // Fallback to center on the location
                                    map.setCenter(location);
                                    map.setZoom(15);
                                }
                            } else {
                                // If bounds is empty or invalid, just center on the location
                                map.setCenter(location);
                                map.setZoom(15);
                            }

                            // If we only have one marker, zoom in appropriately
                            if (total === 1) {
                                map.setZoom(15);
                            }

                            // Search for nearby businesses if we have at least one result
                            if (total >= 1) {
                                searchNearbyBusinesses(location, business.type);
                            }
                        }
                    }
                } else {
                    console.error("Geocode failed for address " + addressString + ": " + status);
                }
            });
        } catch (error) {
            console.error("Error in geocodeBusinessAddress:", error);
        }
    }, index * CONFIG.geocodeDelay); // Stagger requests
}

/**
 * Update retrieveFromMongoDB function to include cache-busting
 */
async function retrieveFromMongoDB(formData) {
    try {
        // Show a loading indicator
        const resultsContainer = document.getElementById('business-search-results') ||
            document.getElementById('search_table');
        if (resultsContainer) {
            resultsContainer.innerHTML = '<div class="loading-indicator">Searching for businesses...</div>';
            resultsContainer.style.display = 'block';
        }

        // Process search location as before...
        let searchLocation = null;

        // Check if we should use current location
        const useMyLocation = document.getElementById('use-my-location') &&
            document.getElementById('use-my-location').checked;

        if (useMyLocation) {
            try {
                console.log("Getting user's location for search...");
                searchLocation = await getUserLocation();
                console.log("User location for search:", searchLocation);
            } catch (error) {
                console.error("Error getting user location:", error);
            }
        }
        // If not using location but address is provided, geocode it
        else if (formData.address && formData.address.trim() !== '') {
            try {
                console.log("Geocoding address for search:", formData.address);
                const geocodedLocation = await geocodeAddressClientSide(formData.address);

                if (geocodedLocation && geocodedLocation.lat && geocodedLocation.lng) {
                    searchLocation = geocodedLocation;
                    console.log("Successfully geocoded address to:", searchLocation);
                } else {
                    console.warn("Client-side geocoding failed, trying server-side");

                    const baseURL = getBaseURL();
                    const geocodeUrl = `${baseURL}/api/geocode?address=${encodeURIComponent(formData.address)}`;

                    const response = await fetch(geocodeUrl);
                    const data = await response.json();

                    if (data.success && data.location) {
                        searchLocation = data.location;
                        console.log("Server-side geocoded location:", searchLocation);
                    } else {
                        console.warn("Both client and server geocoding failed");
                    }
                }
            } catch (error) {
                console.error("Error geocoding address:", error);
            }
        }

        // Save the search location to a global variable so we can use it to filter results
        window.currentSearchLocation = searchLocation;

        // Build params as before
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

        // Add a timestamp cache-busting parameter to ensure fresh results
        params.ts = new Date().getTime();

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
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });

        console.log("Response status: ", res.status);

        if (!res.ok) {
            const errorText = await res.text();
            console.error("Error response: ", errorText);
            throw new Error(`Failed to retrieve data from MongoDB: ${res.status} ${errorText}`);
        }

        const data = await res.json();
        console.log("Search results from database:", data);

        // Process search results as before...
        if (!data.results || data.results.length === 0) {
            console.log("No results in our database, searching Google Places...");

            // If no results, search Google Places API
            await searchGooglePlaces(formData, searchLocation);
        } else {
            // We have results from our database, display them
            // First display on map
            displayBusinessesOnMap(data.results);

            // Then in table/list
            if (document.getElementById('search_table')) {
                displaySearchResults(data.results);
            } else {
                const resultsContainer = document.getElementById('business-search-results');
                if (resultsContainer) {
                    displayBusinessSearchResults(data.results, resultsContainer);
                }
            }

            // Only search for nearby businesses if we have a search location
            if (searchLocation && searchLocation.lat && searchLocation.lng) {
                // Create Google Maps LatLng from search location
                const searchLatLng = new google.maps.LatLng(
                    searchLocation.lat,
                    searchLocation.lng
                );

                // For nearby searches, use the business type from first result
                if (data.results.length > 0) {
                    const businessType = data.results[0].type;
                    searchNearbyBusinesses(searchLatLng, businessType);
                }
            }
        }
    } catch (error) {
        console.error("Search error: ", error);
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
 * Enhanced searchGooglePlaces function that properly respects the search location and bounds
 */
async function searchGooglePlaces(formData, searchLocation = null) {
    try {
        console.log("Searching Google Places for:", formData);

        if (searchLocation) {
            console.log("Using provided search location:", searchLocation);
        }

        // Make map visible
        const mapContainer = document.getElementById('map');
        if (mapContainer) {
            mapContainer.style.display = 'block';
            mapContainer.style.height = '500px';
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

        // If we don't have a search location yet, try to geocode the address
        if (!searchLocation && formData.address) {
            try {
                console.log("Need to geocode address for Places search:", formData.address);
                // Use client-side geocoding
                const geocodeResult = await geocodeAddressClientSide(formData.address);

                if (geocodeResult) {
                    searchLocation = geocodeResult;
                    console.log("Geocoded search center:", searchLocation);
                }
            } catch (error) {
                console.error("Error geocoding address for Google Places search:", error);
            }
        }

        // Make sure searchLocation is in the correct format for Google Places API
        let placesLocation = null;
        if (searchLocation) {
            placesLocation = new google.maps.LatLng(
                searchLocation.lat || searchLocation.latitude,
                searchLocation.lng || searchLocation.longitude
            );

            // Add location to bounds
            bounds.extend(placesLocation);

            // Focus the map on this location initially
            map.setCenter(placesLocation);
            map.setZoom(12); // Zoom into city level
        } else {
            // If no location found, use default US center
            placesLocation = new google.maps.LatLng(
                CONFIG.defaultCenter.lat,
                CONFIG.defaultCenter.lng
            );
            bounds.extend(placesLocation);
            console.log("Using default US center for search");
        }

        try {
            // Use Places library directly
            const service = new google.maps.places.PlacesService(map);

            // Create the request object
            const request = {
                query: searchQuery,
                location: placesLocation,
                radius: 25000 // 25km search radius (smaller than before)
            };

            console.log("Places API request:", request);

            // Execute the search
            service.textSearch(request, (results, status) => {
                // Remove loading indicator
                const loadingElement = document.getElementById('map-loading');
                if (loadingElement) loadingElement.remove();

                if (status !== google.maps.places.PlacesServiceStatus.OK || !results || results.length === 0) {
                    console.log("No places found via Places API");
                    showErrorMessage('No businesses found matching your search criteria.');
                    return;
                }

                console.log("Found places via Google Places API:", results.length);

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
                    const placeLatLng = new google.maps.LatLng(
                        place.geometry.location.lat(),
                        place.geometry.location.lng()
                    );

                    let distance = 0;
                    if (placesLocation) {
                        distance = google.maps.geometry.spherical.computeDistanceBetween(
                            placesLocation,
                            placeLatLng
                        );
                    }

                    // Only include places within reasonable distance of search location
                    if (distance > 80000) { // 80km or about 50 miles
                        console.log(`Skipping place too far from search location: ${place.name} - ${distance/1609} miles`);
                        return null;
                    }

                    // Create business object
                    const business = {
                        _id: 'google_' + place.place_id,
                        bname: place.name,
                        address1: address1,
                        city: city,
                        state: state,
                        zip: zip,
                        formattedAddress: place.formatted_address, // Keep the full formatted address
                        type: mapGooglePlaceTypeToBusinessType(place.types),
                        phone: place.formatted_phone_number || '',
                        isGooglePlace: true,
                        placeId: place.place_id,
                        lat: place.geometry.location.lat(),
                        lng: place.geometry.location.lng(),
                        distance: distance
                    };

                    // Add marker
                    addAdvancedMarker(business, placeLatLng);

                    // Extend bounds
                    bounds.extend(placeLatLng);

                    return business;
                })
                    .filter(business => business !== null); // Remove null entries (too far away)

                // Match with chains
                findChainMatchesForResults(businessResults).then(() => {
                    // Sort by distance
                    businessResults.sort((a, b) => a.distance - b.distance);

                    // Display results
                    displaySearchResults(businessResults);

                    // Adjust map view - ensure it focuses on the search area
                    try {
                        // Only use non-empty bounds
                        if (bounds && !bounds.isEmpty()) {
                            map.fitBounds(bounds);

                            // Set appropriate zoom level
                            setTimeout(() => {
                                const currentZoom = map.getZoom();
                                // Don't zoom out too far
                                if (currentZoom < 10) {
                                    map.setZoom(10);
                                }
                                // Don't zoom in too close
                                else if (currentZoom > 15) {
                                    map.setZoom(15);
                                }
                            }, 100);
                        } else {
                            // If bounds is empty, focus on the search location
                            map.setCenter(placesLocation);
                            map.setZoom(11);
                        }
                    } catch (error) {
                        console.error("Error adjusting map view:", error);
                        // Default to search location
                        map.setCenter(placesLocation);
                        map.setZoom(11);
                    }
                });
            });
        } catch (error) {
            console.error("Error searching places:", error);

            // Remove loading indicator
            const loadingElement = document.getElementById('map-loading');
            if (loadingElement) loadingElement.remove();

            // Show error
            showErrorMessage(`Error searching for businesses: ${error.message}`);
        }
    } catch (error) {
        console.error("Error in searchGooglePlaces:", error);
        showErrorMessage(`Error searching for businesses: ${error.message}`);
    }
}

// Helper function to map Google Place types to your business types
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
 * Enhanced function to find chain matches for Places API results
 * while preserving the original Google Places data
 * @param {Array} businesses - Business objects from Places API
 * @returns {Promise<Array>} - Updated business objects with chain info
 */
async function findChainMatchesForResults(businesses) {
    const promises = businesses.map(business => {
        return findMatchingChainForPlaceResult(business.bname)
            .then(matchingChain => {
                if (matchingChain) {
                    console.log(`Found matching chain for place: ${business.bname}`);

                    // Store original Google Places data before adding chain info
                    const originalAddress = business.address1;
                    const originalCity = business.city;
                    const originalState = business.state;
                    const originalZip = business.zip;
                    const originalPhone = business.phone;
                    const originalFormattedAddress = business.formattedAddress;

                    // Add chain information to the business
                    business.chain_id = matchingChain._id;
                    business.chain_name = matchingChain.bname;
                    business.is_from_places_api = true;

                    // Restore the original Google Places data
                    business.address1 = originalAddress;
                    business.city = originalCity;
                    business.state = originalState;
                    business.zip = originalZip;
                    business.phone = originalPhone;
                    business.formattedAddress = originalFormattedAddress;

                    console.log(`Nearby place "${business.bname}" matches chain: ${matchingChain.bname}`);
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
 * Enhanced function to properly preserve Place data when adding a business to database
 * @param {string} placeId - Google Place ID
 * @param {string} chainId - Optional chain ID if this is part of a chain
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

            // Add chain information if provided
            if (chainId) {
                businessData.chain_id = chainId;

                // Try to get chain name
                try {
                    const chain = await getChainDetails(chainId);
                    if (chain && chain.bname) {
                        businessData.chain_name = chain.bname;
                    }
                } catch (error) {
                    console.error("Error getting chain details:", error);
                    // Continue without chain name
                }
            }

            // Store in sessionStorage for the add business page to use
            sessionStorage.setItem('newBusinessData', JSON.stringify(businessData));

            // Log the data being stored
            console.log("Storing business data in sessionStorage:", businessData);

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
 * Handle actions for chain businesses
 * @param {string} businessId - Business ID
 * @param {boolean} isAdmin - Whether the current user is an admin
 */
window.handleChainBusinessAction = function(businessId, isAdmin) {
    if (isAdmin) {
        // For admins, redirect to the chain management page
        window.location.href = `manage-chains.html?chain_id=${businessId}`;
    } else {
        // For regular users, show chain info
        viewChainDetails(businessId);
    }
};

/**
 * View chain details for regular users
 * @param {string} chainId - Chain business ID
 */
window.viewChainDetails = function(chainId) {
    // Fetch chain details
    const baseURL = getBaseURL();

    fetch(`${baseURL}/api/business.js?operation=get&id=${chainId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to fetch chain details: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (!data.result) {
                throw new Error('Chain not found');
            }

            // Show chain info dialog
            showChainInfoDialog(data.result);
        })
        .catch(error => {
            console.error("Error fetching chain details:", error);
            alert(`Error: ${error.message}`);
        });
};

/**
 * Show a dialog with chain information
 * @param {Object} chainBusiness - Chain business object
 */
function showChainInfoDialog(chainBusiness) {
    try {
        console.log("Showing chain info dialog for:", chainBusiness.bname);

        // Create modal content
        const modalContent = `
            <div class="modal fade" id="chainInfoModal" tabindex="-1" role="dialog" aria-labelledby="chainInfoModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-lg" role="document">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="chainInfoModalLabel">Chain Information: ${chainBusiness.bname}</h5>
                            <button type="button" class="close" data-bs-dismiss="modal" aria-label="Close">
                                <span aria-hidden="true">&times;</span>
                            </button>
                        </div>
                        <div class="modal-body">
                            <div class="alert alert-info">
                                <p><strong>${chainBusiness.bname}</strong> is a national chain business in the Patriot Thanks database.</p>
                                <p>Chain businesses can only be modified by administrators, but chain incentives apply to all locations nationwide.</p>
                            </div>
                            <div class="business-details">
                                <p><strong>Business Type:</strong> ${getBusinessTypeLabel(chainBusiness.type)}</p>
                                <p>Chain incentives will be displayed for businesses that match this chain, even if they are not in the database.</p>
                            </div>
                            <div class="chain-incentives">
                                <h4>Chain Incentives</h4>
                                <div class="loading-incentives">Loading chain incentives...</div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if present
        const existingModal = document.getElementById('chainInfoModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Append the modal to the body
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalContent;
        document.body.appendChild(modalContainer.firstChild);

        // Get the modal element
        const modalElement = document.getElementById('chainInfoModal');

        // Check if Bootstrap 5 is being used
        if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
            // Bootstrap 5
            const modal = new bootstrap.Modal(modalElement);
            modal.show();
        } else {
            // Bootstrap 4 or jQuery fallback
            try {
                if (typeof $ !== 'undefined' && $.fn.modal) {
                    $(modalElement).modal('show');
                } else {
                    // Manual fallback if jQuery/Bootstrap not available
                    modalElement.style.display = 'block';
                    modalElement.classList.add('show');

                    // Add backdrop manually
                    const backdrop = document.createElement('div');
                    backdrop.className = 'modal-backdrop show';
                    document.body.appendChild(backdrop);

                    // Add close functionality to buttons
                    const closeButtons = modalElement.querySelectorAll('[data-bs-dismiss="modal"]');
                    closeButtons.forEach(button => {
                        button.addEventListener('click', function() {
                            modalElement.style.display = 'none';
                            modalElement.classList.remove('show');
                            document.body.removeChild(backdrop);
                        });
                    });
                }
            } catch (error) {
                console.error("Error showing modal with jQuery fallback:", error);
                alert(`Chain Information: ${chainBusiness.bname} is a national chain business that can only be modified by administrators.`);
            }
        }

        // Fetch and display chain incentives
        fetchChainIncentives(chainBusiness._id);
    } catch (error) {
        console.error("Error in showChainInfoDialog:", error);
        // Fallback to alert
        alert(`Chain Information: ${chainBusiness.bname} is a national chain business that can only be modified by administrators.`);
    }
}

/**
 * Fetch incentives for a chain and display them in the modal
 * @param {string} chainId - Chain business ID
 */
function fetchChainIncentives(chainId) {
    // Get the base URL
    const baseURL = getBaseURL();

    // Use the API endpoint for incentives
    const apiURL = `${baseURL}/api/combined-api.js?operation=incentives&business_id=${chainId}`;

    fetch(apiURL)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to fetch incentives: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // Get the container
            const container = document.querySelector('.chain-incentives');
            if (!container) return;

            // Remove loading indicator
            const loadingElement = container.querySelector('.loading-incentives');
            if (loadingElement) {
                loadingElement.remove();
            }

            // If there are no incentives
            if (!data.results || data.results.length === 0) {
                container.innerHTML += '<div class="alert alert-warning">No chain-wide incentives found.</div>';
                return;
            }

            // Build HTML for the incentives
            let incentivesHTML = '<div class="list-group">';

            data.results.forEach(incentive => {
                if (incentive.is_available) {
                    const typeLabel = getIncentiveTypeLabel(incentive.type);
                    const otherDescription = incentive.other_description ?
                        ` (${incentive.other_description})` : '';

                    // Format amount based on discount_type
                    let amountDisplay = incentive.amount + '%';
                    if (incentive.discount_type === 'dollar') {
                        amountDisplay = '$' + incentive.amount.toFixed(2);
                    }

                    incentivesHTML += `
                        <div class="list-group-item">
                            <div class="d-flex w-100 justify-content-between">
                                <h5 class="mb-1">${typeLabel}${otherDescription}</h5>
                                <span class="badge bg-primary">${amountDisplay}</span>
                            </div>
                            <p class="mb-1">${incentive.information || 'No additional information available.'}</p>
                        </div>
                    `;
                }
            });

            incentivesHTML += '</div>';

            // Append to the container
            container.innerHTML += incentivesHTML;
        })
        .catch(error => {
            console.error(`Error fetching chain incentives:`, error);
            const container = document.querySelector('.chain-incentives');
            if (container) {
                container.innerHTML += `<div class="alert alert-danger">Error loading chain incentives: ${error.message}</div>`;
            }
        });
}

/**
 * Process Google Places results with chain matching
 * @param {Array} places - Place results from Google Places API
 * @param {Object} searchLocation - Search center location
 * @returns {Array} - Processed business objects
 */
function processPlaceResults(places, searchLocation) {
    if (!places || places.length === 0) {
        console.log("No places to process");
        return [];
    }

    // Create the search location as LatLng for distance calculations
    const searchLatLng = new google.maps.LatLng(searchLocation.latitude, searchLocation.longitude);

    // Create new bounds for this search
    bounds = new google.maps.LatLngBounds();

    // Extend bounds with the search center location
    bounds.extend(searchLatLng);

    // Process each place and add markers immediately
    const businessResults = [];

    // Process all places and create basic business objects
    places.forEach((place, index) => {
        try {
            // Skip if no location or geometry
            if (!place.geometry || !place.geometry.location) {
                console.warn("Place missing location data:", place);
                return;
            }

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

            // Map to business type based on place types
            let businessType = 'OTHER';
            if (place.types) {
                if (place.types.includes('restaurant')) businessType = 'REST';
                else if (place.types.includes('store')) businessType = 'RETAIL';
                else if (place.types.includes('hardware_store')) businessType = 'HARDW';
                else if (place.types.includes('gas_station')) businessType = 'FUEL';
                else if (place.types.includes('grocery_or_supermarket')) businessType = 'GROC';
                else if (place.types.includes('electronics_store')) businessType = 'ELEC';
                else if (place.types.includes('department_store')) businessType = 'DEPT';
                // Additional mappings as needed
            }

            // Properly create Google Maps LatLng object for place location
            let placeLatLng;

            // Handle different formats of location data from Places API
            if (place.geometry && place.geometry.location) {
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
            } else if (place.location && typeof place.location.lat === 'number') {
                // Direct lat/lng format from newer Places API
                placeLatLng = new google.maps.LatLng(
                    place.location.lat,
                    place.location.lng
                );
            } else {
                console.warn("Could not determine location for place:", place);
                return; // Skip this place
            }

            // Calculate distance from search center
            const distance = google.maps.geometry.spherical.computeDistanceBetween(
                searchLatLng,
                placeLatLng
            );

            // Check for duplicates in existing markers
            const isDuplicate = markers.some(marker => {
                if (!marker.business) return false;

                if (marker.business.placeId === place.place_id ||
                    marker.business.placeId === place.id ||
                    marker.business._id === 'google_' + place.place_id ||
                    marker.business._id === 'google_' + place.id) {
                    return true;
                }

                return false;
            });

            if (isDuplicate) {
                console.log("Skipping duplicate place:", place.name);
                return;
            }

            // Create business object
            const business = {
                _id: 'google_' + (place.place_id || place.id),
                bname: place.name || place.displayName || 'Unknown Business',
                address1: address1,
                city: city,
                state: state,
                zip: zip,
                type: businessType,
                phone: place.formatted_phone_number || place.nationalPhoneNumber || '',
                isGooglePlace: true,
                placeId: place.place_id || place.id,
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
            console.error("Error processing place:", error, place);
            // Skip this place and continue
        }
    });

    console.log("Processed", businessResults.length, "places into business objects");
    return businessResults;
}

/**
 * Ensure map is visible and properly sized
 */
function ensureMapVisibility() {
    const mapContainer = document.getElementById('map');
    if (mapContainer) {
        // Force the map to be visible and sized properly
        mapContainer.style.display = 'block';
        mapContainer.style.height = '500px';

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

// Updated initGoogleMap function
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
                mapId: CONFIG.mapId || 'ebe8ec43a7bc252d',
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
            console.log("Google Map successfully initialized");

            // Process any pending businesses to display
            if (pendingBusinessesToDisplay.length > 0) {
                console.log("Processing pending businesses to display on map");
                displayBusinessesOnMap(pendingBusinessesToDisplay);
                pendingBusinessesToDisplay = [];
            }

            // Setup map handlers
            setupMapClickHandler();
            setupMarkerClickPriority();

            // Initialize additional features like customizing info windows
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

                    // Extract business name
                    const businessName = place.displayName || '';

                    // Check if this business matches any chains before showing the info window
                    let chainMatch = null;

                    try {
                        chainMatch = await findMatchingChainForPlaceResult(businessName);
                    } catch (error) {
                        console.error("Error checking for chain match:", error);
                    }

                    // Create a business object from the place
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

                    // If it matches a chain, add the chain info
                    if (chainMatch) {
                        console.log(`POI "${businessName}" matches chain: ${chainMatch.bname}`);
                        business.chain_id = chainMatch._id;
                        business.chain_name = chainMatch.bname;
                        business.isChainLocation = true;
                    }

                    // Calculate distance if possible
                    if (place.location && window.currentSearchLocation) {
                        // Try to calculate distance from current center
                        const distance = google.maps.geometry.spherical.computeDistanceBetween(
                            new google.maps.LatLng(place.location.lat, place.location.lng),
                            new google.maps.LatLng(
                                window.currentSearchLocation.lat,
                                window.currentSearchLocation.lng
                            )
                        );
                        business.distance = distance;
                    }

                    // Create a temporary marker object for the info window
                    const tempMarker = {
                        business: business,
                        position: place.location ?
                            new google.maps.LatLng(place.location.lat, place.location.lng) :
                            event.latLng
                    };

                    // Show custom info window with chain matching
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
 * Fixed createMarker function that handles both advanced and standard markers
 * @param {Object} business - Business object
 * @param {Object} position - Position object with lat/lng
 * @param {boolean} isNearby - Whether this is a nearby business
 * @param {boolean} isPlaceResult - Whether this is from Places API
 * @returns {Object} - The created marker
 */
function createMarker(business, position, isNearby = false, isPlaceResult = false) {
    console.log(`Creating marker for ${business.bname} at [${position.lat}, ${position.lng}]`);

    try {
        // Try advanced marker first with proper error handling
        try {
            if (typeof google.maps.marker === 'undefined' ||
                typeof google.maps.marker.AdvancedMarkerElement === 'undefined') {
                throw new Error("Advanced Markers API not available");
            }

            // Create pin element
            const pinElement = document.createElement('div');
            pinElement.className = 'custom-marker';

            // Determine marker color based on whether it's nearby
            const pinClass = isNearby ? "nearby" : "primary";
            const pinColor = isNearby ? CONFIG.markerColors.nearby : CONFIG.markerColors.primary;

            // Use text icons for reliability
            const businessIcon = getBusinessTypeTextIcon(business.type || 'store');

            // Set HTML content for marker
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
            const marker = new google.maps.marker.AdvancedMarkerElement({
                position: position,
                map: map,
                title: business.bname || 'Business',
                content: pinElement
            });

            // Attach business data and click event
            marker.business = business;
            marker.isNearby = isNearby;
            marker.position = position;

            // Add click event manually since AdvancedMarkerElement handles events differently
            pinElement.addEventListener('click', function() {
                showInfoWindow(marker);
            });

            return marker;
        } catch (error) {
            console.log("Advanced marker creation failed, falling back to standard marker:", error);
            // Fall through to standard marker creation
        }

        // Create a standard marker as fallback
        const marker = new google.maps.Marker({
            position: position,
            map: map,
            title: business.bname || 'Business',
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: isNearby ? CONFIG.markerColors.nearby : CONFIG.markerColors.primary,
                fillOpacity: 1,
                strokeWeight: 1,
                strokeColor: '#FFFFFF',
                scale: 10
            }
        });

        // Attach business data
        marker.business = business;
        marker.isNearby = isNearby;

        // Add click event
        marker.addListener('click', function() {
            showInfoWindow(marker);
        });

        return marker;
    } catch (error) {
        console.error("Error creating marker:", error);
        return null;
    }
}

/**
 * Get text icon for business type - emoji-based for reliability
 * @param {string} businessType - Business type code
 * @returns {string} - Text/emoji icon HTML
 */
function getBusinessTypeTextIcon(businessType) {
    // Map business types to emoji or text symbols
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

    // Return with styling
    return `<span style="font-size: 14px; color: white;">${iconMap[businessType] || '🏬'}</span>`;
}

/**
 * Modified displayBusinessesOnMap function to properly handle coordinates
 * @param {Array} businesses - Array of business objects to display
 */
function displayBusinessesOnMap(businesses) {
    // If map is not ready yet, store businesses for later
    if (!map) {
        businessesToDisplayOnMap = businesses;
        console.log("Map not ready, storing businesses for later display");
        return;
    }

    console.log("Displaying businesses on map:", businesses.length);

    // Clear existing markers
    clearMarkers();

    // Count types of businesses
    const databaseBusinesses = businesses.filter(b => !b.isGooglePlace);
    const placesBusinesses = businesses.filter(b => b.isGooglePlace);

    console.log(`Found ${databaseBusinesses.length} database businesses and ${placesBusinesses.length} Places API businesses`);

    // Add businesses to map
    businesses.forEach(business => {
        try {
            // Check for needed properties
            if (!business) {
                console.error("Invalid business object");
                return;
            }

            // Get coordinates based on business source
            let position;
            if (!business.isGooglePlace && business.location && business.location.coordinates) {
                // Database businesses use GeoJSON format (lng, lat)
                const coords = business.location.coordinates;
                console.log("Database business coordinates:", coords);

                // MongoDB uses [longitude, latitude] format
                // Google Maps uses {lat, lng} format
                if (Array.isArray(coords) && coords.length === 2) {
                    position = {
                        lat: coords[1], // Second element is latitude
                        lng: coords[0]  // First element is longitude
                    };
                } else if (business.lat && business.lng) {
                    position = {
                        lat: parseFloat(business.lat),
                        lng: parseFloat(business.lng)
                    };
                }
            } else if (business.isGooglePlace) {
                // Places API businesses use standard format
                if (business.lat && business.lng) {
                    position = {
                        lat: parseFloat(business.lat),
                        lng: parseFloat(business.lng)
                    };
                }
            }

            if (!position) {
                console.error("Missing coordinates for business:", business);
                return;
            }

            console.log(`Creating marker for ${business.bname} at [${position.lat}, ${position.lng}]`);

            // Create marker with our fixed function
            const marker = createMarker(
                business,
                position,
                business.isNearby,
                business.isGooglePlace
            );

            if (marker) {
                // Add to markers array
                markers.push(marker);
            }
        } catch (error) {
            console.error("Error processing business for map display:", error, business);
        }
    });

    // Update map bounds to fit all markers
    updateMapBounds();
}

/**
 * Simplified showInfoWindow function
 * @param {Object} marker - Marker object
 */
function showInfoWindow(marker) {
    console.log("showInfoWindow called with marker:", marker);

    if (!marker || !marker.business) {
        console.error("Invalid marker or missing business data");
        return;
    }

    // Get business data
    const business = marker.business;
    console.log("Business data for info window:", business);

    // Get info window elements
    const infoWindow = document.getElementById('info-window');
    const infoWindowContent = document.getElementById('info-window-content');

    if (!infoWindow || !infoWindowContent) {
        console.error("Info window elements not found");
        return;
    }

    // Check if this is a Google Places result
    const isGooglePlace = business.isGooglePlace === true;

    // Check if this is a chain location
    const isChainLocation = business.chain_id ? true : false;

    // Format distance
    let distanceText = '';
    if (business.distance) {
        const distanceValue = typeof business.distance === 'number'
            ? (business.distance / 1609.34).toFixed(1)
            : business.distance;
        distanceText = `<div class="business-distance">Distance: ${distanceValue} miles</div>`;
    }

    // Format address
    const addressText = business.address1
        ? `<div class="business-address">Address: ${business.address1} ${business.city || ''}</div>`
        : '';

    // Format business type
    const typeText = business.type
        ? `<div class="business-type">Type: ${formatBusinessType(business.type)}</div>`
        : '';

    // Create chain badge if applicable
    const chainBadge = isChainLocation
        ? `<div class="chain-badge">${business.chain_name || 'Chain Location'}</div>`
        : '';

    // Determine the action button
    let actionButton = '';
    if (isGooglePlace) {
        // For Google Places results, show "Add to Database" button
        if (isChainLocation) {
            actionButton = `
                <button class="add-business-btn" 
                        onclick="window.addBusinessToDatabase('${business.placeId}', '${business.chain_id}')">
                    Add to Database
                </button>
            `;
        } else {
            actionButton = `
                <button class="add-business-btn" 
                        onclick="window.addBusinessToDatabase('${business.placeId}')">
                    Add to Patriot Thanks
                </button>
            `;
        }
    } else {
        // For database businesses, show "View Details" button
        actionButton = `
            <button class="view-details-btn" 
                    onclick="window.viewBusinessDetails('${business._id}')">
                View Details
            </button>
        `;
    }

    // Build content HTML
    const contentHTML = `
        <div class="info-window-title">${business.bname}</div>
        ${chainBadge}
        ${addressText}
        ${distanceText}
        ${typeText}
        <div class="info-window-incentives" id="info-window-incentives">
            <div class="loading-indicator">Loading incentives...</div>
        </div>
        <div class="info-window-actions">
            ${actionButton}
        </div>
    `;

    // Set the content
    infoWindowContent.innerHTML = contentHTML;

    // Position the info window
    positionInfoWindow(marker);

    // Show info window
    infoWindow.style.display = 'block';
    infoWindow.style.opacity = '1';

    console.log("Info window opened for business:", business.bname);

    // Load incentives
    if (isGooglePlace && isChainLocation) {
        // For Google Places results that match chains, fetch chain incentives
        fetchChainIncentivesForInfoWindow(business.placeId, business.chain_id);
    } else if (!isGooglePlace) {
        // For database businesses, fetch regular incentives
        fetchIncentivesForInfoWindow(business._id, business.chain_id);
    } else {
        // For regular Google Places results, show "not in database" message
        const incentivesDiv = document.getElementById('info-window-incentives');
        if (incentivesDiv) {
            incentivesDiv.innerHTML = `
                <div class="no-incentives-message">
                    This business is not yet in the Patriot Thanks database.
                </div>
            `;
        }
    }
}

/**
 * Simple function to position info window relative to the map
 * @param {Object} marker - The marker object
 */
function positionInfoWindow(marker) {
    // Get the map container
    const mapContainer = document.getElementById('map');
    const infoWindow = document.getElementById('info-window');

    if (!mapContainer || !infoWindow) {
        console.error("Missing elements for positioning info window");
        return;
    }

    // Get the map container dimensions
    const mapRect = mapContainer.getBoundingClientRect();

    // Simply position the info window in the center of the map
    infoWindow.style.left = Math.max((mapRect.width - 300) / 2, 20) + 'px';
    infoWindow.style.top = Math.max((mapRect.height - 350) / 2, 20) + 'px';
}

/**
 * Close the info window
 */
function closeInfoWindow() {
    const infoWindow = document.getElementById('info-window');
    if (infoWindow) {
        infoWindow.style.opacity = '0';
        setTimeout(() => {
            infoWindow.style.display = 'none';
        }, 200);
    }
}

/**
 * Fetch incentives for info window
 * @param {string} businessId - Business ID
 * @param {string} chainId - Optional chain ID
 */
function fetchIncentivesForInfoWindow(businessId, chainId = null) {
    // Get incentives container
    const incentivesDiv = document.getElementById('info-window-incentives');
    if (!incentivesDiv) {
        console.error("Incentives container not found");
        return;
    }

    if (!businessId) {
        incentivesDiv.innerHTML = '<p><strong>Incentives:</strong> Error loading incentives</p>';
        return;
    }

    // Determine the base URL
    const baseURL = getBaseURL();

    // Build API URL
    let apiURL = `${baseURL}/api/combined-api.js?operation=incentives&business_id=${businessId}`;
    if (chainId) {
        apiURL += `&chain_id=${chainId}`;
    }

    console.log("Fetching incentives from: ", apiURL);

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
            let incentivesHTML = '<p><strong>Incentives:</strong></p><ul class="incentives-list">';

            data.results.forEach(incentive => {
                if (incentive.is_available) {
                    const typeLabel = getIncentiveTypeLabel(incentive.type);
                    const otherDescription = incentive.other_description ?
                        ` (${incentive.other_description})` : '';

                    // Add a badge for chain-wide incentives
                    const chainBadge = incentive.is_chain_wide ?
                        '<span class="chain-badge small">Chain-wide</span>' : '';

                    incentivesHTML += `
                        <li>
                            <strong>${typeLabel}${otherDescription}:</strong> ${incentive.amount}% ${chainBadge}
                            ${incentive.information ? `<div class="incentive-info">${incentive.information}</div>` : ''}
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
            console.error(`Error fetching incentives: ${error}`);
            incentivesDiv.innerHTML = '<p><strong>Incentives:</strong> Error loading incentives</p>';
        });
}

/**
 * Update map bounds to fit all markers
 */
function updateMapBounds() {
    if (!map || markers.length === 0) {
        return;
    }

    try {
        // Create new bounds
        const bounds = new google.maps.LatLngBounds();

        // Add each marker to bounds
        markers.forEach(marker => {
            // Get position from marker
            let position;

            if (marker.position && typeof marker.position.lat === 'function') {
                // It's already a LatLng object
                position = marker.position;
            } else if (marker.position) {
                // It's a position object with lat/lng properties
                position = new google.maps.LatLng(
                    marker.position.lat,
                    marker.position.lng
                );
            } else if (marker.getPosition) {
                // Standard marker
                position = marker.getPosition();
            } else if (marker.business && marker.business.lat && marker.business.lng) {
                // Fallback to business coordinates
                position = new google.maps.LatLng(
                    parseFloat(marker.business.lat),
                    parseFloat(marker.business.lng)
                );
            }

            // Add to bounds if valid position
            if (position && !isNaN(position.lat()) && !isNaN(position.lng())) {
                bounds.extend(position);
            }
        });

        // Only adjust bounds if not empty
        if (!bounds.isEmpty()) {
            map.fitBounds(bounds);

            // Don't zoom in too close for single markers
            if (markers.length === 1) {
                google.maps.event.addListenerOnce(map, 'bounds_changed', function() {
                    if (map.getZoom() > 15) map.setZoom(15);
                });
            }
        }
    } catch (error) {
        console.error("Error updating map bounds:", error);
    }
}

/**
 * Corrected function to ensure proper coordinates for database businesses
 * @param {Object} business - Business object
 * @param {Object} position - Map position
 * @param {boolean} isNearby - Whether this is a nearby business
 * @param {boolean} isFromDatabase - Whether this business is from the database
 */
function addAdvancedMarker(business, position, isNearby = false, isFromDatabase = false) {
    try {
        // Import the marker library
        const { AdvancedMarkerElement } = google.maps.importLibrary("marker");

        // First, ensure we have valid coordinates
        let validPosition;

        // For database businesses, check for proper coordinate format
        if (isFromDatabase && business.location && business.location.coordinates) {
            // Make sure we're using lng, lat order for GeoJSON (MongoDB uses this format)
            if (business.location.coordinates.length >= 2) {
                console.log(`Database business coordinates: [${business.location.coordinates[0]}, ${business.location.coordinates[1]}]`);

                // Create position using correct order - MongoDB stores as [lng, lat]
                validPosition = new google.maps.LatLng(
                    business.location.coordinates[1], // Latitude is second in GeoJSON
                    business.location.coordinates[0]  // Longitude is first in GeoJSON
                );
            } else {
                console.error("Invalid coordinates array in business location:", business.location);
                return null;
            }
        }
        // For non-database businesses or if location.coordinates isn't available
        else if (position) {
            if (position instanceof google.maps.LatLng) {
                // It's already a LatLng object
                validPosition = position;
            } else if (position.lat && typeof position.lat === 'function') {
                // It's a LatLng-like object with lat() method
                validPosition = position;
            } else if (typeof position.lat === 'number' && typeof position.lng === 'number') {
                // It's a position object with numeric lat/lng
                validPosition = new google.maps.LatLng(position.lat, position.lng);
            } else if (business.lat && business.lng) {
                // Use the coordinates from the business object
                validPosition = new google.maps.LatLng(
                    parseFloat(business.lat),
                    parseFloat(business.lng)
                );
            } else {
                console.error("Invalid position for marker:", position);
                return null;
            }
        } else {
            console.error("No valid position found for marker");
            return null;
        }

        // Validate position has real coordinates
        if (!validPosition || isNaN(validPosition.lat()) || isNaN(validPosition.lng())) {
            console.error("Position has NaN coordinates:", validPosition);
            return null;
        }

        // Log the final position being used
        console.log(`Creating marker for ${business.bname} at [${validPosition.lat()}, ${validPosition.lng()}]`);

        // Ensure business name is a string
        const businessTitle = typeof business.bname === 'string' ? business.bname : String(business.bname || 'Business');

        // IMPORTANT FIX: Determine marker color based on whether it's in the database
        // Database businesses = red (primary)
        // Places API businesses = blue (nearby)
        const pinClass = isNearby ? "nearby" : "primary";
        const pinColor = isNearby ? CONFIG.markerColors.nearby : CONFIG.markerColors.primary;

        // Get business type icon - use text icons for reliability
        const businessIcon = getBusinessTypeTextIcon(business.type);

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
            position: validPosition,
            map: map,
            title: businessTitle,
            content: pinElement,
            collisionBehavior: isNearby ? 'OPTIONAL_AND_HIDES_LOWER_PRIORITY' : 'REQUIRED_AND_HIDES_OPTIONAL'
        });

        // Store the business data with the marker
        marker.business = business;
        marker.isNearby = isNearby;
        marker.position = validPosition;

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
        return null;
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
 * Get HTML for a business type icon - Updated with explicit styling
 * @param {string} businessType - Business type code
 * @returns {string} Icon HTML
 */
function getBusinessTypeIconHTML(businessType) {
    // Map business types to icon HTML with inline styles to ensure visibility
    const iconMap = {
        'AUTO': '<i class="fas fa-car" aria-hidden="true" style="color: white !important; display: inline-block !important;"></i>',
        'BEAU': '<i class="fas fa-spa" aria-hidden="true" style="color: white !important; display: inline-block !important;"></i>',
        'BOOK': '<i class="fas fa-book" aria-hidden="true" style="color: white !important; display: inline-block !important;"></i>',
        'CLTH': '<i class="fas fa-tshirt" aria-hidden="true" style="color: white !important; display: inline-block !important;"></i>',
        'CONV': '<i class="fas fa-store" aria-hidden="true" style="color: white !important; display: inline-block !important;"></i>',
        'DEPT': '<i class="fas fa-shopping-bag" aria-hidden="true" style="color: white !important; display: inline-block !important;"></i>',
        'ELEC': '<i class="fas fa-bolt" aria-hidden="true" style="color: white !important; display: inline-block !important;"></i>',
        'ENTR': '<i class="fas fa-film" aria-hidden="true" style="color: white !important; display: inline-block !important;"></i>',
        'FURN': '<i class="fas fa-couch" aria-hidden="true" style="color: white !important; display: inline-block !important;"></i>',
        'FUEL': '<i class="fas fa-gas-pump" aria-hidden="true" style="color: white !important; display: inline-block !important;"></i>',
        'GIFT': '<i class="fas fa-gift" aria-hidden="true" style="color: white !important; display: inline-block !important;"></i>',
        'GROC': '<i class="fas fa-shopping-cart" aria-hidden="true" style="color: white !important; display: inline-block !important;"></i>',
        'HARDW': '<i class="fas fa-hammer" aria-hidden="true" style="color: white !important; display: inline-block !important;"></i>',
        'HEAL': '<i class="fas fa-heartbeat" aria-hidden="true" style="color: white !important; display: inline-block !important;"></i>',
        'JEWL': '<i class="fas fa-gem" aria-hidden="true" style="color: white !important; display: inline-block !important;"></i>',
        'OTHER': '<i class="fas fa-store-alt" aria-hidden="true" style="color: white !important; display: inline-block !important;"></i>',
        'RX': '<i class="fas fa-prescription-bottle-alt" aria-hidden="true" style="color: white !important; display: inline-block !important;"></i>',
        'REST': '<i class="fas fa-utensils" aria-hidden="true" style="color: white !important; display: inline-block !important;"></i>',
        'RETAIL': '<i class="fas fa-shopping-basket" aria-hidden="true" style="color: white !important; display: inline-block !important;"></i>',
        'SERV': '<i class="fas fa-concierge-bell" aria-hidden="true" style="color: white !important; display: inline-block !important;"></i>',
        'SPEC': '<i class="fas fa-star" aria-hidden="true" style="color: white !important; display: inline-block !important;"></i>',
        'SPRT': '<i class="fas fa-football-ball" aria-hidden="true" style="color: white !important; display: inline-block !important;"></i>',
        'TECH': '<i class="fas fa-laptop" aria-hidden="true" style="color: white !important; display: inline-block !important;"></i>',
        'TOYS': '<i class="fas fa-gamepad" aria-hidden="true" style="color: white !important; display: inline-block !important;"></i>'
    };

    // Return the icon for this business type, or a default with inline styling
    return iconMap[businessType] || '<i class="fas fa-store" aria-hidden="true" style="color: white !important; display: inline-block !important;"></i>';
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
 * Enhanced function to check if a business from Google Places
 * is already in the database by comparing address
 * @param {Object} business - Business object from Google Places
 * @returns {boolean} - True if business address is already in database
 */
async function isAddressInDatabase(business) {
    try {
        if (!business || !business.address1 || !business.city || !business.state || !business.zip) {
            console.log("Can't check database: incomplete address information", business);
            return false;
        }

        const addressString =
            `${business.address1}, ${business.city}, ${business.state} ${business.zip}`.toLowerCase();
        console.log("Checking if address exists in database:", addressString);

        // Get the base URL
        const baseURL = getBaseURL();

        // Use the search operation to check if this address exists
        const searchParams = new URLSearchParams({
            address: addressString,
            exact: 'true' // Add a parameter to indicate we want exact matches
        }).toString();

        const response = await fetch(`${baseURL}/api/business.js?operation=search&${searchParams}`);

        if (!response.ok) {
            console.warn("Error checking address in database:", response.status);
            return false;
        }

        const data = await response.json();

        // If we get results, the address is in the database
        const exists = data.results && data.results.length > 0;
        console.log(`Address exists in database: ${exists}`);
        return exists;
    } catch (error) {
        console.error("Error checking if address is in database:", error);
        return false;
    }
}

/**
 * Enhanced version of fetchChainIncentivesForInfoWindow that better handles the UI
 * @param {string} placeId - The Google Place ID
 * @param {string} chainId - The chain ID in your database
 */
function fetchChainIncentivesForInfoWindow(placeId, chainId) {
    if (!placeId || !chainId) {
        console.error("Missing place ID or chain ID for fetching chain incentives");
        return;
    }

    console.log(`Fetching chain incentives for info window - Place ID: ${placeId}, Chain ID: ${chainId}`);

    // Determine the base URL
    const baseURL = getBaseURL();

    // Build API URL to fetch chain incentives
    const apiURL = `${baseURL}/api/combined-api.js?operation=incentives&business_id=${chainId}`;

    console.log("Fetching chain incentives API URL:", apiURL);

    fetch(apiURL)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to fetch chain incentives: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log(`Chain incentives data for info window (Place: ${placeId}, Chain: ${chainId}):`, data);

            // FIXED: Use the general incentives div instead of a place-specific one
            const incentivesDiv = document.getElementById('info-window-incentives');

            if (!incentivesDiv) {
                console.error(`Could not find incentives div for info window`);
                return;
            }

            // Check if there are any incentives
            if (!data.results || data.results.length === 0) {
                incentivesDiv.innerHTML = '<p><strong>Chain Incentives:</strong> No chain incentives found</p>';
                return;
            }

            // Build HTML for incentives
            let incentivesHTML = '<p><strong>Chain Incentives:</strong></p><ul class="incentives-list">';

            data.results.forEach(incentive => {
                if (incentive.is_available) {
                    const typeLabel = getIncentiveTypeLabel(incentive.type);
                    const otherDescription = incentive.other_description ?
                        ` (${incentive.other_description})` : '';

                    incentivesHTML += `
                        <li>
                            <strong>${typeLabel}${otherDescription}:</strong> ${incentive.amount}%
                            <span class="chain-badge small">Chain-wide</span>
                            ${incentive.information ? `<div class="incentive-info">${incentive.information}</div>` : ''}
                        </li>
                    `;
                }
            });

            incentivesHTML += '</ul>';

            // Add a message explaining that this is a chain location
            incentivesHTML += `
                <div class="chain-location-message">
                    This location matches the ${data.chain_info?.bname || 'The Home Depot'} chain in our database. 
                    Chain-wide incentives apply, but this specific location is not yet added to our database.
                </div>
            `;

            if (incentivesHTML === '<p><strong>Chain Incentives:</strong></p><ul class="incentives-list"></ul>') {
                incentivesDiv.innerHTML = '<p><strong>Incentives:</strong> No active chain incentives found</p>';
            } else {
                incentivesDiv.innerHTML = incentivesHTML;
            }
        })
        .catch(error => {
            console.error(`Error fetching chain incentives for info window: ${error}`);
            const incentivesDiv = document.getElementById('info-window-incentives');

            if (incentivesDiv) {
                incentivesDiv.innerHTML = '<p><strong>Incentives:</strong> Error loading incentives</p>';
            }
        });
}

/**
 * Modified function to check if a business from Google Places API already exists in database
 * This function helps prevent duplicate businesses from being added
 * @param {string} placeId - The Google Place ID
 * @returns {Promise<boolean>} - Promise resolving to true if business exists
 */
async function isPlaceAlreadyInDatabase(placeId) {
    if (!placeId) return false;

    try {
        // Get the base URL
        const baseURL = getBaseURL();

        // Make API request to check if place exists
        const response = await fetch(`${baseURL}/api/business.js?operation=check_place_exists&place_id=${placeId}`);

        if (!response.ok) {
            // If the endpoint doesn't exist yet, this will fail
            // In that case, return false (not in database)
            console.warn("Error checking if place exists:", response.status);
            return false;
        }

        const data = await response.json();
        return data.exists === true;
    } catch (error) {
        console.error("Error checking if place exists:", error);
        return false;
    }
}

/**
 * Enhanced function to search for nearby businesses focusing on search location
 * @param {Object} location - Center location for the search
 * @param {string} businessType - Type of business to search for
 */
/**
 * Improved searchNearbyBusinesses to respect the current search location
 */
function searchNearbyBusinesses(location, businessType) {
    if (!location) {
        console.error("No location provided for nearby business search");
        return;
    }

    // Get coordinates properly
    let lat, lng;

    if (typeof location.lat === 'function') {
        lat = location.lat();
        lng = location.lng();
    } else {
        lat = location.lat;
        lng = location.lng;
    }

    console.log(`Searching for nearby businesses near ${lat} ${lng}`);

    // Only search if we have valid coordinates
    if (!isNaN(lat) && !isNaN(lng)) {
        // First search our database with the correct coordinates
        searchNearbyBusinessesInDatabase(lat, lng, businessType);

        // Then search Google Places with the correct coordinates
        searchNearbyBusinessesWithPlaces(lat, lng, businessType);
    } else {
        console.warn("Invalid coordinates for nearby search:", lat, lng);
    }
}

/**
 * Filter nearby businesses to ensure they're only from the current search area
 * @param {Array} businesses - Array of businesses to filter
 * @returns {Array} - Filtered array of businesses
 */
function filterBusinessesBySearchLocation(businesses) {
    // If we don't have a current search location, return all businesses
    if (!window.currentSearchLocation) {
        return businesses;
    }

    // Create a LatLng object from the current search location
    const searchLatLng = new google.maps.LatLng(
        window.currentSearchLocation.lat,
        window.currentSearchLocation.lng
    );

    // Filter businesses that are too far from the search location
    return businesses.filter(business => {
        // Skip if missing coordinates
        if (!business.lat || !business.lng) {
            return false;
        }

        // Create a LatLng object from the business location
        const businessLatLng = new google.maps.LatLng(
            business.lat,
            business.lng
        );

        // Calculate distance in meters
        const distance = google.maps.geometry.spherical.computeDistanceBetween(
            searchLatLng,
            businessLatLng
        );

        // Convert to miles
        const distanceInMiles = distance / 1609.34;

        // Keep businesses within 50 miles
        const isNearby = distanceInMiles <= 50;

        if (!isNearby) {
            console.log(`Filtering out distant business: ${business.bname} - ${distanceInMiles.toFixed(1)} miles from search location`);
        }

        return isNearby;
    });
}

/**
 * Enhanced function to search for nearby businesses in database
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {string} businessType - Business type code
 */
function searchNearbyBusinessesInDatabase(lat, lng, businessType) {
    // Determine the base URL
    const baseURL = getBaseURL();

    // Build API URL with location and type parameters
    const apiURL = `${baseURL}/api/business.js?operation=search&type=${businessType}&lat=${lat}&lng=${lng}&radius=25`;

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

            // Filter out businesses that are already on the map (to avoid duplicates)
            const existingBusinessIds = markers.map(marker => marker.business?._id).filter(id => id);
            const newBusinesses = data.results.filter(business =>
                !existingBusinessIds.includes(business._id)
            );

            console.log(`${newBusinesses.length} new businesses to add to map from database`);

            // Add the new businesses to the map
            newBusinesses.forEach(business => {
                // Mark as nearby for different styling
                business.isNearby = true;

                // Create LatLng object for the marker
                if (business.lat && business.lng) {
                    const position = new google.maps.LatLng(business.lat, business.lng);

                    // Only add if within reasonable distance
                    const distance = google.maps.geometry.spherical.computeDistanceBetween(
                        new google.maps.LatLng(lat, lng),
                        position
                    );

                    if (distance < 80000) { // 80km or about 50 miles
                        // Add marker
                        addAdvancedMarker(business, position);

                        // Extend bounds
                        if (bounds) {
                            bounds.extend(position);
                        }
                    } else {
                        console.log(`Skipping distant business: ${business.bname} (${distance/1609} miles)`);
                    }
                }
            });

            // Update map bounds if we added markers
            if (newBusinesses.length > 0 && bounds && !bounds.isEmpty()) {
                map.fitBounds(bounds);
            }
        })
        .catch(error => {
            console.error("Error searching for nearby businesses in database:", error);
        });
}

/**
 * Enhanced function to search for nearby businesses using Google Places
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {string} businessType - Business type code
 */
function searchNearbyBusinessesWithPlaces(lat, lng, businessType) {
    // Convert our business type to Google Places type
    const placesType = convertBusinessTypeToPlacesType(businessType);
    if (!placesType) {
        console.log("No suitable Places type for business type:", businessType);
        return;
    }

    // Create PlacesService
    const service = new google.maps.places.PlacesService(map);

    // Create location object
    const searchLocation = new google.maps.LatLng(lat, lng);

    // Set up nearby search request
    const request = {
        location: searchLocation,
        radius: 10000, // 10km radius
        type: placesType
    };

    // Perform the search
    service.nearbySearch(request, (results, status) => {
        if (status !== google.maps.places.PlacesServiceStatus.OK || !results || results.length === 0) {
            console.log("No nearby places found via Places API");
            return;
        }

        console.log(`Found ${results.length} nearby places via Places API`);

        // Filter out places that are already on the map
        const existingPlaceIds = markers.map(marker => marker.business?.placeId).filter(id => id);
        const newPlaces = results.filter(place =>
            !existingPlaceIds.includes(place.place_id)
        );

        console.log(`${newPlaces.length} new places to add to map from Places API`);

        // Process up to 10 new places (to avoid cluttering the map)
        const placesToAdd = newPlaces.slice(0, 10);

        // Add each place as a marker
        placesToAdd.forEach(place => {
            try {
                // Skip if missing geometry
                if (!place.geometry || !place.geometry.location) return;

                // Calculate distance to ensure it's not too far
                const distance = google.maps.geometry.spherical.computeDistanceBetween(
                    searchLocation,
                    place.geometry.location
                );

                // Skip if too far away
                if (distance > 80000) { // 80km or about 50 miles
                    console.log(`Skipping distant place: ${place.name} (${distance/1609} miles)`);
                    return;
                }

                // Extract address components
                let address1 = '';
                let city = '';
                let state = '';
                let zip = '';

                if (place.vicinity) {
                    const addressParts = place.vicinity.split(',');
                    if (addressParts.length >= 1) address1 = addressParts[0].trim();
                    if (addressParts.length >= 2) {
                        const cityParts = addressParts[1].trim().split(' ');
                        city = cityParts[0];
                        if (cityParts.length > 1) {
                            state = cityParts[cityParts.length - 2];
                            zip = cityParts[cityParts.length - 1];
                        }
                    }
                }

                // Create business object
                const business = {
                    _id: 'google_' + place.place_id,
                    bname: place.name,
                    address1: address1,
                    city: city,
                    state: state,
                    zip: zip,
                    formattedAddress: place.vicinity, // Use vicinity as formatted address
                    type: mapGooglePlaceTypeToBusinessType(place.types),
                    phone: place.formatted_phone_number || '',
                    isGooglePlace: true,
                    isNearby: true, // Mark as nearby for different styling
                    placeId: place.place_id,
                    lat: place.geometry.location.lat(),
                    lng: place.geometry.location.lng(),
                    distance: distance
                };

                // Add marker
                addAdvancedMarker(business, place.geometry.location);

                // Extend bounds
                if (bounds) {
                    bounds.extend(place.geometry.location);
                }

                // Check if this place matches any chains
                findMatchingChainForPlaceResult(place.name)
                    .then(chainMatch => {
                        if (chainMatch) {
                            console.log(`Nearby place "${place.name}" matches chain: ${chainMatch.bname}`);

                            // Update the business object with chain info while preserving location data
                            business.chain_id = chainMatch._id;
                            business.chain_name = chainMatch.bname;

                            // Update marker if needed - like refreshing the icon or info window content
                            // This would be appropriate if markers have chain-specific styling
                        }
                    })
                    .catch(error => {
                        console.error("Error checking chain match:", error);
                    });
            } catch (error) {
                console.error("Error processing nearby place:", error);
            }
        });

        // Update map bounds if we added markers
        if (placesToAdd.length > 0 && bounds && !bounds.isEmpty()) {
            // Don't zoom out too much - maintain reasonable context
            const currentZoom = map.getZoom();
            map.fitBounds(bounds);

            // After bounds are fit, check if zoom is too far out
            setTimeout(() => {
                const newZoom = map.getZoom();
                if (newZoom < 10 && currentZoom > 10) {
                    // Don't zoom out past city level
                    map.setZoom(10);
                }
            }, 100);
        }
    });
}

/**
 * Convert our business type code to Google Places type
 * @param {string} businessType - Our business type code
 * @returns {string|null} - Google Places type or null if no match
 */
function convertBusinessTypeToPlacesType(businessType) {
    // Map our business types to Google Places types
    const typeMapping = {
        'REST': 'restaurant',
        'GROC': 'grocery_or_supermarket',
        'FUEL': 'gas_station',
        'HARDW': 'hardware_store',
        'DEPT': 'department_store',
        'CONV': 'convenience_store',
        'CLTH': 'clothing_store',
        'ELEC': 'electronics_store',
        'FURN': 'furniture_store',
        'RETAIL': 'store',
        'RX': 'pharmacy',
        'AUTO': 'car_dealer',
        'BEAU': 'beauty_salon',
        'BOOK': 'book_store',
        'ENTR': 'movie_theater',
        'SPRT': 'sporting_goods',
        'GIFT': 'home_goods_store',
        'HEAL': 'drugstore',
        'JEWL': 'jewelry_store',
        'SERV': 'establishment',
        'SPEC': 'store',
        'TECH': 'electronics_store',
        'TOYS': 'shopping_mall',
        'OTHER': 'establishment'
    };

    return typeMapping[businessType] || 'establishment';
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
 * Format a business type code to a readable label
 * @param {string} type - Business type code
 * @returns {string} Readable business type label
 */
function formatBusinessType(type) {
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

    return types[type] || type;
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

// Ensure Google Maps is properly initialized
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM loaded, initializing business search...");

    // Add custom marker styles and chain badge styles
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
// Enhanced business-search.js with Google Maps functionality using AdvancedMarkerElement

let map = null;
let mapInitialized = false;
let markers = [];
let infoWindow = null;
let bounds = null;
let pendingBusinessesToDisplay = [];

// Define initGoogleMap in the global scope so the Maps API can find it
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
            center: {lat: 39.8283, lng: -98.5795}, // Center of US
            zoom: 4,
            mapId: 'ebe8ec43a7bc252d',  // Your map ID
            clickableIcons: false  // Disable clickable POIs
        });

        // Create info window
        infoWindow = new google.maps.InfoWindow();
        bounds = new google.maps.LatLngBounds();

        // Add initial message
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

        // Add event listener for the reset map button
        const resetMapButton = document.getElementById('reset-map');
        if (resetMapButton) {
            resetMapButton.addEventListener('click', resetMapView);
        }

        // Set flags that map is initialized
        mapInitialized = true;
        console.log("Google Map successfully initialized with Map ID:", 'ebe8ec43a7bc252d');

        // Process any pending businesses to display
        if (pendingBusinessesToDisplay.length > 0) {
            console.log("Processing pending businesses to display on map");
            displayBusinessesOnMap(pendingBusinessesToDisplay);
            pendingBusinessesToDisplay = [];
        }

        // Setup map click handler AFTER map is initialized
        await setupMapClickHandler();

    } catch (error) {
        console.error("Error initializing Google Map:", error);
        mapInitialized = false;
    }

    await setupMapClickHandler();
    setupMarkerClickPriority();
    setTimeout(initImageLoading, 1500);
};

// Define this function globally so it can be accessed from the HTML
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

// Simple function to reset map view
function resetMapView() {
    if (!mapInitialized || !map) {
        console.error("Cannot reset map view - map not initialized");
        return;
    }

    // Center on US and zoom out
    map.setCenter({lat: 39.8283, lng: -98.5795});
    map.setZoom(4);

    // Close any open info windows
    if (infoWindow) {
        infoWindow.close();
    }
}

// Basic placeholder function to prevent errors
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
        map.addListener('click', function(event) {
            console.log("Map clicked", event);
            // Further implementation can be added later
        });

        console.log("Map click handler set up");
    } catch (error) {
        console.error("Error setting up map click handler:", error);
    }
}

// Function to set up marker click priority over POIs
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

// Function to initialize image loading for markers
function initImageLoading() {
    // Call this after markers are created
    if (!mapInitialized || markers.length === 0) {
        console.log("Map not initialized or no markers, delaying image loading");
        setTimeout(initImageLoading, 1000);
        return;
    }

    console.log("Starting image loading for markers");
    enhanceMarkersWithImages();
}

// Updated displayBusinessesOnMap function to use only AdvancedMarkerElement
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
        map.setCenter({lat: 39.8283, lng: -98.5795});
        map.setZoom(4);
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

// Function to enhance markers with images
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

// Updated geocodeBusinessAddress to work with AdvancedMarkerElement
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
    }, index * 200); // Stagger requests with a 200ms delay per business
}

// Enhanced addAdvancedMarker function with image support
async function addAdvancedMarker(business, location) {
    try {
        // Import the marker library
        const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");

        // Create a position object from the location
        const position = { lat: location.lat(), lng: location.lng() };

        // Determine marker color based on whether it's a primary result or nearby result
        const isNearby = business.isNearby === true;
        const pinColor = isNearby ? '#4285F4' : '#EA4335'; // Blue for nearby, Red for primary

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

        // Add multiple event listeners to ensure clicks are captured
        // 1. Add click to the pin element (direct DOM event)
        pinElement.addEventListener('click', function(e) {
            console.log("Marker element clicked:", business.bname);
            // Stop propagation to prevent Google POI clicks
            e.stopPropagation();
            showInfoWindow(marker);
        });

        // 2. Add gmp-click to the marker (Google Maps Platform event)
        marker.addEventListener('gmp-click', function(e) {
            console.log("Marker gmp-click triggered:", business.bname);
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

// After markers are created in displayBusinessesOnMap
initImageLoading();

// Function to get an icon based on business type
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

async function fetchPlacePhotosForBusiness(business) {
    if (!business) {
        console.log("No business data provided");
        return null;
    }

    try {
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

            // Get the first photo with reasonable dimensions
            const photoUrl = place.photos[0].getUrl({
                maxWidth: 100,
                maxHeight: 100
            });

            console.log(`Got photo URL for ${business.bname}`);
            return photoUrl;
        }

        console.log(`No photos found for ${business.bname}`);
        return null;
    } catch (error) {
        console.error(`Error fetching photos for ${business ? business.bname : 'unknown'}:`, error);
        return null;
    }
}

// Helper function to find a place ID by searching
async function findPlaceIdBySearch(business) {
    if (!business || !business.bname) return null;

    try {
        // Import the required library
        const { PlacesService } = await google.maps.importLibrary("places");

        // Create a service that can be used for places search
        // We need a div element to create the service (per Google Maps API requirements)
        const serviceDiv = document.createElement('div');
        document.body.appendChild(serviceDiv);
        const service = new google.maps.places.PlacesService(serviceDiv);

        // Create the search query - business name + address
        const query = `${business.bname} ${business.address1} ${business.city} ${business.state} ${business.zip}`;

        // Use a promise to handle the async callback
        return new Promise((resolve, reject) => {
            service.textSearch(
                {
                    query: query,
                    fields: ['place_id']
                },
                (results, status) => {
                    // Remove the temporary div
                    document.body.removeChild(serviceDiv);

                    if (status === google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
                        console.log(`Found place for ${business.bname}:`, results[0].place_id);
                        resolve(results[0].place_id);
                    } else {
                        console.log(`No place found for query: ${query}`);
                        resolve(null);
                    }
                }
            );
        });
    } catch (error) {
        console.error("Error finding place ID:", error);
        return null;
    }
}



// Update an existing marker with an image
function updateMarkerWithImage(marker, imageUrl) {
    if (!marker || !marker.content) return;

    const business = marker.business;
    if (!business) return;

    const isNearby = business.isNearby === true;
    const pinColor = isNearby ? '#4285F4' : '#EA4335';

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



async function addMarker(business, location) {
    // Create a position object from the location
    const position = { lat: location.lat(), lng: location.lng() };

    // Determine marker color based on whether it's a primary result or nearby result
    const isNearby = business.isNearby === true;

    try {
        // First try to use AdvancedMarkerElement if available
        if (google.maps.marker && google.maps.marker.AdvancedMarkerElement) {
            const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");

            // Create a simple DOM element for the marker
            const markerElement = document.createElement('div');
            markerElement.className = 'map-marker';
            markerElement.style.cursor = 'pointer';
            markerElement.style.width = '32px';
            markerElement.style.height = '32px';
            markerElement.style.backgroundImage = isNearby ?
                'url(https://maps.google.com/mapfiles/ms/icons/blue-dot.png)' :
                'url(https://maps.google.com/mapfiles/ms/icons/red-dot.png)';
            markerElement.style.backgroundSize = 'contain';
            markerElement.style.backgroundRepeat = 'no-repeat';

            // Create the marker
            const marker = new AdvancedMarkerElement({
                map: map,
                position: position,
                title: business.bname,
                content: markerElement
            });

            // Store the business data
            marker.business = business;
            marker.isNearby = isNearby;

            // Add event listener for the advanced marker
            // We'll add a direct DOM click event instead of using gmp-click
            markerElement.addEventListener('click', function() {
                console.log("Advanced marker DOM element clicked:", business.bname);
                showInfoWindow(marker);
            });

            // Also add the gmp-click event as backup
            marker.addEventListener('gmp-click', function() {
                console.log("Advanced marker gmp-click:", business.bname);
                showInfoWindow(marker);
            });

            // Add the marker to our array
            markers.push(marker);
            console.log(`Added advanced marker for ${business.bname}`);

            return marker;
        } else {
            throw new Error("Advanced markers not available, falling back to standard markers");
        }
    } catch (error) {
        console.log("Using standard marker fallback:", error.message);

        // Fallback to standard Google Maps Marker
        const marker = new google.maps.Marker({
            position: position,
            map: map,
            title: business.bname,
            animation: google.maps.Animation.DROP,
            icon: {
                url: isNearby ?
                    'https://maps.google.com/mapfiles/ms/icons/blue-dot.png' :
                    'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
                scaledSize: new google.maps.Size(32, 32)
            },
            clickable: true
        });

        // Store the business data
        marker.business = business;
        marker.isNearby = isNearby;

        // Add click event listener using bind to ensure proper 'this' context
        google.maps.event.addListener(marker, 'click', function() {
            console.log("Standard marker clicked:", business.bname);
            showInfoWindow(marker);
        });

        // Add the marker to our array
        markers.push(marker);
        console.log(`Added standard marker for ${business.bname}`);

        return marker;
    }
}

// Updated showInfoWindow function optimized for AdvancedMarkerElement
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


// Test function for creating advanced markers only
function createTestAdvancedMarker() {
    console.log("Creating test advanced marker");

    // Get the map center
    const center = map.getCenter();

    (async () => {
        try {
            const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");

            // Create a test business object
            const testBusiness = {
                _id: 'test123',
                bname: 'Test Advanced Business',
                address1: '123 Test Street',
                city: 'Test City',
                state: 'TS',
                zip: '12345',
                type: 'TEST',
                phone: '555-TEST'
            };

            // Add the advanced marker at the center of the map
            const testMarker = await addAdvancedMarker(testBusiness, {
                lat: () => center.lat(),
                lng: () => center.lng()
            });

            console.log("Test marker added at center:", center.lat(), center.lng());

            // Optionally, show info window immediately
            if (testMarker) {
                setTimeout(() => {
                    showInfoWindow(testMarker);
                }, 500);
            }
        } catch (error) {
            console.error("Error creating test advanced marker:", error);
            alert("Error creating test marker: " + error.message);
        }
    })();
}



// Add this function to the window for debugging
window.testAdvancedMarker = createTestAdvancedMarker;

// Add a test button to the map when initialized
function addTestButton() {
    const mapContainer = document.getElementById("map-container");
    if (mapContainer) {
        const testButton = document.createElement('button');
        testButton.textContent = 'Test Advanced Marker';
        testButton.className = 'map-test-button';
        testButton.style.position = 'absolute';
        testButton.style.bottom = '10px';
        testButton.style.left = '10px';
        testButton.style.zIndex = '100';
        testButton.style.padding = '5px 10px';
        testButton.style.backgroundColor = '#fff';
        testButton.style.border = '1px solid #ccc';
        testButton.style.borderRadius = '4px';
        testButton.onclick = createTestAdvancedMarker;

        mapContainer.appendChild(testButton);
    }
}

// Fetch incentives specifically for the info window
function fetchBusinessIncentivesForInfoWindow(businessId) {
    if (!businessId) {
        console.error("No business ID provided for fetching incentives");
        return;
    }

    // Determine the base URL
    const baseURL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? `https://${window.location.host}`
        : `https://patriotthanks.vercel.app`;

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

// Search for nearby businesses of similar type
function searchNearbyBusinesses(location, businessType) {
    // This function would typically use the Google Places API
    // For now, we'll implement a simpler version using our existing data

    console.log("Searching for nearby businesses near", location.lat(), location.lng());

    // Determine the base URL
    const baseURL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? `https://${window.location.host}`
        : `https://patriotthanks.vercel.app`;

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
                }, index * 200); // Stagger requests
            });
        })
        .catch(error => {
            console.error("Error searching for nearby businesses:", error);
        });
}

// Update the searchNearbyBusinesses function for AdvancedMarkerElement
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

            // Only add if within 20km (adjust as needed)
            if (distance <= 20000) {
                // Mark this as a nearby business
                business.isNearby = true;

                // Add marker with different color to distinguish from search results
                addAdvancedMarker(business, location);
            }
        }
    });
}

// Updated clearMarkers function for AdvancedMarkerElement
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

// View business details (placeholder function, implement as needed)
window.viewBusinessDetails = function (businessId) {
    console.log("View details for business:", businessId);
    // You can implement this to navigate to a details page or show more info
    alert("This feature is coming soon: View details for " + businessId);
};

// Handle clicks on the map for places that aren't in your database
// Using the newer google.maps.places.Place API
async function setupMapClickHandler() {
    // Make sure the Places library is loaded
    const { Place } = await google.maps.importLibrary("places");

    // Listen for POI clicks (Points of Interest - businesses, landmarks, etc.)
    map.addListener('click', async function(event) {
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

    console.log("Map click handler set up for POIs using new Place API");
}

// Helper function to convert business type codes to readable labels
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

// Function to fetch incentives for a specific business
function fetchBusinessIncentives(businessId) {
    if (!businessId) {
        console.error("No business ID provided for fetching incentives");
        return;
    }

    // Determine the base URL of local or production
    const baseURL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? `https://${window.location.host}`
        : `https://patriotthanks.vercel.app`;

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

// Make sure the focusOnMapMarker function works with AdvancedMarkerElement
window.focusOnMapMarker = function (businessId) {
    console.log("Attempting to focus on business ID:", businessId);

    // Check if map is initialized
    if (!mapInitialized || !map) {
        console.error("Map not initialized yet - cannot focus on marker");
        alert("Map is still loading. Please try again in a moment.");
        return;
    }

    console.log("Current markers:", markers.length);

    // Check if markers array exists and has items
    if (!markers || markers.length === 0) {
        console.warn("No markers available yet.");
        alert("No businesses are currently displayed on the map.");
        return;
    }

    // Find the marker for this business
    const marker = markers.find(m => m.business && m.business._id === businessId);

    if (marker) {
        // Get the marker position
        const position = marker.position;

        // Center the map on this marker's position
        map.setCenter(position);
        map.setZoom(16);

        // Open the info window for this marker
        showInfoWindow(marker);

        // Scroll to the map
        document.getElementById('map').scrollIntoView({behavior: 'smooth'});

        console.log("Successfully focused on marker for business:", businessId);
    } else {
        console.warn(`No marker found for business ID: ${businessId}`);

        // Let the user know
        alert("This business could not be located on the map. It may not have a complete address.");

        // Scroll to the map anyway
        document.getElementById('map').scrollIntoView({behavior: 'smooth'});
    }
};


// RESTORED FROM ORIGINAL: displayBusinessSearchResults function to add data-title attributes
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

        // add the event listeners for the "select" buttons
        const selectButtons = document.querySelectorAll('.select-business');
        selectButtons.forEach(button => {
            button.addEventListener('click', function () {
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

                // FIXED: Added special handling for incentive-update.html
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

// RESTORED FROM ORIGINAL: helper function to populate business information fields
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

// RESTORED FROM ORIGINAL: function to populate business fields
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
// Function validation
function isNotEmpty(value) {
    return value.trim() !== '';
}

// Apply validation styling to a field
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

// Add input event listeners for visual feedback
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



// Show info window for places not in your database
// Updated to work with the new Place class
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


// Convert place types to readable format
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

// Function to handle adding a business to your database
// Updated to use the new Place API
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

// Helper function to extract address components
function getAddressComponentFromPlace(place, type) {
    if (!place.addressComponents) return '';

    const component = place.addressComponents.find(
        component => component.types.includes(type)
    );

    return component ? component.shortText : '';
}

// Updated Google Maps script loading function
function loadGoogleMapsScript() {
    // Get API key from runtime config or use your actual API key
    const apiKey = 'AIzaSyCHKhYZwQR37M_0QctXUQe6VFRFrlhaYj8';
    const mapId = 'ebe8ec43a7bc252d';

    console.log("Loading Google Maps with Map ID:", mapId);

    // Create and insert the Google Maps script with all recommended parameters
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&map_ids=${mapId}&libraries=places,geometry,marker&callback=initGoogleMap&loading=async`;
    script.async = true;
    script.defer = true;
    script.onerror = function() {
        console.error('Google Maps API failed to load. Check your API key.');
        alert('Error loading Google Maps. Please try again later.');
    };
    document.head.appendChild(script);
}


document.addEventListener('DOMContentLoaded', function() {
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



    // Call this after map initialization and after markers are added
    setupMarkerClickPriority();

    function resetMapView() {
        if (!mapInitialized || !map) {
            console.error("Cannot reset map view - map not initialized");
            return;
        }

        // Center on US and zoom out
        map.setCenter({lat: 39.8283, lng: -98.5795});
        map.setZoom(4);

        // Close any open info windows
        if (infoWindow) {
            infoWindow.close();
        }
    }

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

            // Determine the base URL of local or production
            const baseURL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                ? `https://${window.location.host}`
                : `https://patriotthanks.vercel.app`;

            // use the API endpoint with the baseURL
            const apiURL = `${baseURL}/api/business.js?operation=search&${queryParams}`;
            console.log("submitting search to API at: ", apiURL);

            const res = await fetch(apiURL, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json; charset=UTF-8',
                }
            });

            console.log("response status: ", res.status);

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






    // Execute the script loading when DOM is ready
    document.addEventListener('DOMContentLoaded', loadGoogleMapsScript);
});
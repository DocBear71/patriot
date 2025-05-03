// Enhanced business-search.js with Google Maps functionality using AdvancedMarkerElement

let map = null;
let mapInitialized = false;
let markers = [];
let infoWindow = null;
let bounds = null;
let pendingBusinessesToDisplay = [];

document.addEventListener('DOMContentLoaded', function() {
    console.log("Business search with Google Maps loaded!");

    // Map related variables
    let map;
    let markers = [];
    let infoWindow;
    let bounds;

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

    // Initialize Google Map
    function initMap() {
        console.log("Initializing Google Map");

        try {
            // Check if map container exists
            const mapContainer = document.getElementById("map");
            if (!mapContainer) {
                console.error("Map container not found in the DOM");
                return;
            }

            // Create a map centered on the US
            map = new google.maps.Map(mapContainer, {
                center: {lat: 39.8283, lng: -98.5795}, // Center of US
                zoom: 4,
                mapTypeId: google.maps.MapTypeId.ROADMAP
            });

            infoWindow = new google.maps.InfoWindow();
            bounds = new google.maps.LatLngBounds();

            // Add a message to the map when it's first loaded
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
                resetMapButton.addEventListener('click', function () {
                    resetMapView();
                });
            }

            // Set flag that map is initialized
            mapInitialized = true;
            console.log("Google Map successfully initialized");

            // If there are any pending businesses to display, show them now
            if (pendingBusinessesToDisplay.length > 0) {
                console.log("Processing pending businesses to display on map");
                displayBusinessesOnMap(pendingBusinessesToDisplay);
                pendingBusinessesToDisplay = [];
            }
        } catch (error) {
            console.error("Error initializing Google Map:", error);
            mapInitialized = false;
        }
    }

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

    // Display businesses on Google Map
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

    // Geocode business address to get map coordinates
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
                        addMarker(business, location);

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

    // Add a marker to the map using AdvancedMarkerElement
    function addMarker(business, location) {
        // First, make sure the required libraries are loaded
        if (!google.maps.marker || !google.maps.marker.AdvancedMarkerElement) {
            console.error("AdvancedMarkerElement not available. Make sure to include the marker library.");
            return null;
        }

        // Create a position object from the location
        const position = { lat: location.lat(), lng: location.lng() };

        // Create the marker content - we'll use a pin with a customizable background color
        let markerContent;

        // Determine marker color based on whether it's a primary result or nearby result
        const isNearby = business.isNearby === true;
        const pinColor = isNearby ? '#4285F4' : '#EA4335'; // Blue for nearby, Red for primary

        // Create a pin element with the appropriate color
        const pinElement = document.createElement('div');
        pinElement.innerHTML = `
            <div style="width: 24px; height: 24px; border-radius: 50% 50% 50% 0; 
                        transform: rotate(-45deg); background-color: ${pinColor}; 
                        display: flex; justify-content: center; align-items: center; 
                        position: relative; top: -12px; left: 0px; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">
                <div style="width: 12px; height: 12px; border-radius: 50%; 
                            background-color: white; transform: rotate(45deg);"></div>
            </div>
        `;

        markerContent = pinElement;

        // Create the advanced marker
        const marker = new google.maps.marker.AdvancedMarkerElement({
            position: position,
            map: map,
            title: business.bname,
            content: markerContent
        });

        // Store the business data with the marker
        marker.business = business;
        marker.isNearby = isNearby;

        // Add click event to show info window
        marker.addEventListener('click', () => {
            showInfoWindow(marker);
        });

        // Add the marker to our array
        markers.push(marker);

        return marker;
    }

    // Show info window with business details
    function showInfoWindow(marker) {
        if (!marker || !marker.business) {
            console.error("Invalid marker for info window", marker);
            return;
        }

        const business = marker.business;

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

        // Get the position of the marker
        const position = marker.position;

        // Set content and open the info window
        infoWindow.setContent(contentString);
        infoWindow.setPosition(position);
        infoWindow.open(map);

        // Fetch incentives for this business
        fetchBusinessIncentivesForInfoWindow(business._id);
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

    // Geocode nearby business addresses and add to map if within range
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
                    const marker = addMarker(business, location);
                }
            }
        });
    }

    // Clear all markers from the map
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

    // Add global accessible initialization function for the Google Maps callback
    window.initGoogleMap = function () {
        console.log("Google Maps API loaded, initializing map");
        initMap();
    };

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

    // Function to focus on a specific marker in the map
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
});
// Enhanced business-search.js with Google Maps functionality

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

    // Initialize Google Map
    function initMap() {
        console.log("Initializing Google Map");

        // Create a map centered on the US
        map = new google.maps.Map(document.getElementById("map"), {
            center: { lat: 39.8283, lng: -98.5795 }, // Center of US
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

        document.getElementById("map").appendChild(initialMessage);
    }

    // Add form submission handler
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
        if (!map) {
            console.error("Map not initialized");
            return;
        }

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
            geocoder.geocode({ 'address': addressString }, function(results, status) {
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
                                const lastBusiness = businesses[businesses.length - 1];
                                const lastLocation = results[0].geometry.location;
                                searchNearbyBusinesses(lastLocation, lastBusiness.type);
                            }
                        }
                    }
                } else {
                    console.error("Geocode failed for address " + addressString + ": " + status);
                }
            });
        }, index * 200); // Stagger requests with a 200ms delay per business
    }

    // Add a marker to the map
    function addMarker(business, location) {
        const marker = new google.maps.Marker({
            position: location,
            map: map,
            title: business.bname,
            animation: google.maps.Animation.DROP,
            icon: {
                url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png', // Standard businesses
                scaledSize: new google.maps.Size(32, 32)
            }
        });

        // Store the business data with the marker
        marker.business = business;

        // Add click event to show info window
        marker.addListener('click', function() {
            showInfoWindow(this);
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

        // Set content and open the info window
        infoWindow.setContent(contentString);
        infoWindow.open(map, marker);

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

        geocoder.geocode({ 'address': addressString }, function(results, status) {
            if (status === google.maps.GeocoderStatus.OK && results[0]) {
                const location = results[0].geometry.location;

                // Calculate distance from center location
                const distance = google.maps.geometry.spherical.computeDistanceBetween(
                    centerLocation,
                    location
                );

                // Only add if within 20km (adjust as needed)
                if (distance <= 20000) {
                    // Add marker with different color to distinguish from search results
                    const marker = new google.maps.Marker({
                        position: location,
                        map: map,
                        title: business.bname,
                        animation: google.maps.Animation.DROP,
                        icon: {
                            url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png', // Nearby businesses
                            scaledSize: new google.maps.Size(32, 32)
                        }
                    });

                    // Store business data with the marker
                    marker.business = business;
                    marker.isNearby = true;

                    // Add click event to show info window
                    marker.addListener('click', function() {
                        showInfoWindow(this);
                    });

                    // Add to markers array
                    markers.push(marker);
                }
            }
        });
    }

    // Clear all markers from the map
    function clearMarkers() {
        markers.forEach(marker => {
            marker.setMap(null);
        });
        markers = [];
    }

    // View business details (placeholder function, implement as needed)
    window.viewBusinessDetails = function(businessId) {
        console.log("View details for business:", businessId);
        // You can implement this to navigate to a details page or show more info
        alert("This feature is coming soon: View details for " + businessId);
    };

    // Add global accessible initialization function for the Google Maps callback
    window.initGoogleMap = function() {
        initMap();
    };

    // Helper function to convert business type codes to readable labels
    function getBusinessTypeLabel(typeCode) {
        const types = {
            'REST': 'Restaurant',
            'GROC': 'Grocery',
            'DEPT': 'Department Store',
            'CLTH': 'Clothing',
            'ELEC': 'Electronics',
            'HARDW': 'Hardware',
            'FURN': 'Furniture',
            'AUTO': 'Automotive',
            'SERV': 'Service',
            'ENTR': 'Entertainment',
            'SPRT': 'Sporting Goods',
            'TOYS': 'Toys',
            'HEAL': 'Health',
            'BEAU': 'Beauty',
            'JEWL': 'Jewelry',
            'BOOK': 'Bookstore',
            'GIFT': 'Gift Shop',
            'SPEC': 'Specialty',
            'RX': 'Pharmacy',
            'RETAIL': 'Retail',
            'TECH': 'Technology',
            'OTHER': 'Other'
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
    window.focusOnMapMarker = function(businessId) {
        // Find the marker for this business
        const marker = markers.find(m => m.business && m.business._id === businessId);

        if (marker) {
            // Center the map on this marker
            map.setCenter(marker.getPosition());
            map.setZoom(16);

            // Open the info window for this marker
            showInfoWindow(marker);

            // Scroll to the map
            document.getElementById('map').scrollIntoView({behavior: 'smooth'});
        } else {
            console.error(`No marker found for business ID: ${businessId}`);
        }
    };

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
// api/places.js
const axios = require('axios');

// Export a function that handles the request
module.exports = async (req, res) => {
    try {
        // Check if it's a details request or a search request
        if (req.url.includes('/details/')) {
            // Extract place ID from URL
            const placeId = req.url.split('/details/')[1];
            return handlePlaceDetails(req, res, placeId);
        } else {
            // Handle search request
            return handlePlacesSearch(req, res);
        }
    } catch (error) {
        console.error('Places API error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error in Places API',
            error: error.message
        });
    }
};

async function handlePlacesSearch(req, res) {
    const { query, latitude, longitude, radius = 50000 } = req.query;

    if (!query) {
        return res.status(400).json({
            success: false,
            message: 'Query parameter is required'
        });
    }

    // Get API key from environment variables
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
        console.error('Google Maps API key is not configured');
        return res.status(500).json({
            success: false,
            message: 'Server configuration error: Google Maps API key is missing'
        });
    }

    // Use Place Search API (Text Search) for simpler queries
    let url;
    if (latitude && longitude) {
        // If we have coordinates, use them to bias the search
        url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&location=${latitude},${longitude}&radius=${radius}&key=${apiKey}`;
    } else {
        // Otherwise just search by query
        url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`;
    }

    console.log(`Making Places API request with query: ${query}`);
    const response = await axios.get(url);

    if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
        console.error(`Places API error: ${response.data.status}`);
        return res.status(400).json({
            success: false,
            message: `Places API error: ${response.data.status}`,
            error: response.data.error_message || 'Unknown error'
        });
    }

    // Process and return the results
    const places = response.data.results.map(place => ({
        place_id: place.place_id,
        name: place.name,
        formatted_address: place.formatted_address,
        location: {
            lat: place.geometry.location.lat,
            lng: place.geometry.location.lng
        },
        types: place.types,
        business_status: place.business_status,
    }));

    return res.json({
        success: true,
        results: places
    });
}

async function handlePlaceDetails(req, res, placeId) {
    if (!placeId) {
        return res.status(400).json({
            success: false,
            message: 'Place ID parameter is required'
        });
    }

    // Get API key from environment variables
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
        console.error('Google Maps API key is not configured');
        return res.status(500).json({
            success: false,
            message: 'Server configuration error: Google Maps API key is missing'
        });
    }

    // Use the Place Details API to get comprehensive information
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,formatted_phone_number,geometry,types,address_components&key=${apiKey}`;

    console.log(`Getting details for place ID: ${placeId}`);
    const response = await axios.get(url);

    if (response.data.status !== 'OK') {
        console.error(`Place Details API error: ${response.data.status}`);
        return res.status(400).json({
            success: false,
            message: `Place Details API error: ${response.data.status}`,
            error: response.data.error_message || 'Unknown error'
        });
    }

    // Extract address components
    const place = response.data.result;
    const addressComponents = {};

    if (place.address_components) {
        for (const component of place.address_components) {
            for (const type of component.types) {
                addressComponents[type] = component.short_name;
            }
        }
    }

    // Format the place details in a way that matches client expectations
    const placeDetails = {
        place_id: placeId,
        name: place.name,
        formatted_address: place.formatted_address,
        phone: place.formatted_phone_number || '',
        location: {
            lat: place.geometry.location.lat,
            lng: place.geometry.location.lng
        },
        address_components: {
            street_number: addressComponents.street_number || '',
            route: addressComponents.route || '',
            city: addressComponents.locality || addressComponents.administrative_area_level_2 || '',
            state: addressComponents.administrative_area_level_1 || '',
            zip: addressComponents.postal_code || '',
            country: addressComponents.country || 'US'
        },
        types: place.types
    };

    return res.json({
        success: true,
        place: placeDetails
    });
}
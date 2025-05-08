// api/places.js
// Server-side API endpoint for Google Places functionality
const axios = require('axios');

/**
 * Search for places using the Google Places API
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.search = async (req, res) => {
    try {
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
            console.error(`Places API error: ${response.data.status}, Message: ${response.data.error_message || 'No error message'}`);
            return res.status(400).json({
                success: false,
                message: `Places API error: ${response.data.status}`,
                error: response.data.error_message || 'Unknown error'
            });
        }

        // Process and return the results in a format matching the client-side needs
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
    } catch (error) {
        console.error('Server places search error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error while searching places',
            error: error.message
        });
    }
};

/**
 * Get details for a specific place
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.details = async (req, res) => {
    try {
        const { placeId } = req.params;

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
            console.error(`Place Details API error: ${response.data.status}, Message: ${response.data.error_message || 'No error message'}`);
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
    } catch (error) {
        console.error('Server place details error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error while fetching place details',
            error: error.message
        });
    }
};

// Export the module
module.exports = exports;
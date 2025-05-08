// api/places.js
const axios = require('axios');

/**
 * @route   GET /api/places/search
 * @desc    Search for places using the Places API
 * @access  Public
 */
exports.search = async (req, res) => {
    try {
        const { query, latitude, longitude, radius = 50000 } = req.query;

        if (!query || !latitude || !longitude) {
            return res.status(400).json({
                success: false,
                message: 'Query, latitude, and longitude parameters are required'
            });
        }

        // Use the Text Search API to find places
        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        const placesUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&location=${latitude},${longitude}&radius=${radius}&key=${apiKey}`;

        const response = await axios.get(placesUrl);

        if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
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
            geometry: {
                location: {
                    lat: place.geometry.location.lat,
                    lng: place.geometry.location.lng
                }
            },
            types: place.types,
            business_status: place.business_status
        }));

        return res.json({
            success: true,
            places
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
 * @route   GET /api/places/details
 * @desc    Get details for a specific place
 * @access  Public
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

        // Use the Place Details API to get information
        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,formatted_phone_number,geometry,types&key=${apiKey}`;

        const response = await axios.get(detailsUrl);

        if (response.data.status !== 'OK') {
            return res.status(400).json({
                success: false,
                message: `Place Details API error: ${response.data.status}`,
                error: response.data.error_message || 'Unknown error'
            });
        }

        // Return the place details
        return res.json({
            success: true,
            place: response.data.result
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

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
        console.log("Places search API called with query:", req.query);

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

        console.log("Making Places API request to Google");
        const response = await axios.get(url);
        console.log("Places API response status:", response.status);

        if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
            console.error(`Places API error: ${response.data.status}, Message: ${response.data.error_message || 'No error message'}`);
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

        console.log(`Found ${places.length} places`);
        return res.json({
            success: true,
            results: places
        });
    } catch (error) {
        console.error('Server places search error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error while searching places',
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

// Export the module with a fallback for direct import
module.exports = exports.search ? exports : { search: exports };
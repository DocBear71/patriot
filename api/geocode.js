// api/geocode.js
const axios = require('axios');

// Export a function that handles the request
module.exports = async (req, res) => {
    try {
        const { address } = req.query;

        if (!address) {
            return res.status(400).json({
                success: false,
                message: 'Address parameter is required'
            });
        }

        // Use Google Maps Geocoding API
        const apiKey = process.env.GOOGLE_MAPS_API_KEY;

        if (!apiKey) {
            console.error('Google Maps API key is not configured');
            return res.status(500).json({
                success: false,
                message: 'Server configuration error: Google Maps API key is missing'
            });
        }
        // At the beginning of your API handler
        console.log("API Key length:", process.env.GOOGLE_MAPS_API_KEY ? process.env.GOOGLE_MAPS_API_KEY.length : 0);
        console.log("API Key first 10 chars:", process.env.GOOGLE_MAPS_API_KEY ? process.env.GOOGLE_MAPS_API_KEY.slice(0, 10) : "none");

        const encodedAddress = encodeURIComponent(address);
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`;

        const response = await axios.get(url);

        if (response.data.status === 'OK' && response.data.results.length > 0) {
            const location = response.data.results[0].geometry.location;
            return res.status(200).json({
                success: true,
                location: {
                    lat: location.lat,
                    lng: location.lng
                }
            });
        } else {
            console.warn(`Geocoding failed with status: ${response.data.status}`);
            return res.status(404).json({
                success: false,
                message: `Geocoding failed: ${response.data.status}`,
                error: response.data.error_message || 'No results found'
            });
        }
    } catch (error) {
        console.error('Geocoding error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error while geocoding address',
            error: error.message
        });
    }
};
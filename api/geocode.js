// api/geocode.js
// Server-side API endpoint for geocoding addresses
const axios = require('axios');

/**
 * Geocode an address to get coordinates
 * @param {string} address - Full address to geocode
 * @returns {Promise<{lat: number, lng: number} | null>} Location coordinates or null
 */
async function geocodeAddress(address) {
    try {
        // Use Google Maps Geocoding API
        const apiKey = process.env.GOOGLE_MAPS_API_KEY; // Get key from environment variable

        if (!apiKey) {
            console.error('Google Maps API key is not configured');
            throw new Error('Server configuration error: Google Maps API key is missing');
        }

        const encodedAddress = encodeURIComponent(address);
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`;

        const response = await axios.get(url);

        if (response.data.status === 'OK' && response.data.results.length > 0) {
            const location = response.data.results[0].geometry.location;
            return {
                lat: location.lat,
                lng: location.lng
            };
        } else {
            console.warn(`Geocoding failed with status: ${response.data.status}`);
            console.warn(`Address: ${address}`);
            console.warn(`Error message: ${response.data.error_message || 'No error message'}`);
            return null;
        }
    } catch (error) {
        console.error('Geocoding error:', error);
        throw error;
    }
}

/**
 * Geocode API endpoint handler
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
module.exports = async (req, res) => {
    try {
        const { address } = req.query;

        if (!address) {
            return res.status(400).json({
                success: false,
                message: 'Address parameter is required'
            });
        }

        console.log(`Geocoding address: ${address}`);
        const location = await geocodeAddress(address);

        if (!location) {
            return res.status(404).json({
                success: false,
                message: 'Could not geocode the provided address'
            });
        }

        return res.json({
            success: true,
            location
        });
    } catch (error) {
        console.error('Server geocode error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error while geocoding address',
            error: error.message
        });
    }
};
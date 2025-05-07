// utils/geocoding.js
const axios = require('axios');

/**
 * Geocode an address to get coordinates
 * @param {string} address - Full address to geocode
 * @returns {Promise<{lat: number, lng: number} | null>} Location coordinates or null
 */
async function geocodeAddress(address) {
    try {
        // Use Google Maps Geocoding API
        const apiKey = process.env.GOOGLE_MAPS_API_KEY; // Store API key in environment variables
        const encodedAddress = encodeURIComponent(address);
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`;

        const response = await axios.get(url);

        if (response.data.status === 'OK' && response.data.results.length > 0) {
            const location = response.data.results[0].geometry.location;
            return {
                lat: location.lat,
                lng: location.lng
            };
        }

        return null;
    } catch (error) {
        console.error('Geocoding error:', error);
        return null;
    }
}

module.exports = { geocodeAddress };
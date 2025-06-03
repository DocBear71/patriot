// utils/geocoding.js - FIXED to use axios instead of fetch

const axios = require('axios');

/**
 * Geocode an address to get coordinates
 * @param {string} address - Full address to geocode
 * @returns {Promise<{lat: number, lng: number} | null>} Location coordinates or null
 */
async function geocodeAddress(address) {
    try {
        console.log("🗺️ Geocoding address:", address);

        // Use Google Maps Geocoding API
        const apiKey = process.env.GOOGLE_MAPS_API_KEY;

        if (!apiKey) {
            console.error('❌ Google Maps API key is not configured');
            return null;
        }

        const encodedAddress = encodeURIComponent(address);
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`;

        console.log("📍 Making geocoding request to Google Maps API");

        const response = await axios.get(url, {
            timeout: 10000, // 10 second timeout
            headers: {
                'User-Agent': 'PatriotThanks-Geocoder'
            }
        });

        if (response.data && response.data.status === 'OK' && response.data.results && response.data.results.length > 0) {
            const location = response.data.results[0].geometry.location;
            const coordinates = {
                lat: location.lat,
                lng: location.lng
            };

            console.log("✅ Geocoding successful:", coordinates);
            return coordinates;
        } else {
            console.warn("⚠️ Geocoding failed with status:", response.data?.status || 'Unknown');
            return null;
        }

    } catch (error) {
        console.error('❌ Geocoding error:', error.message);
        return null;
    }
}

module.exports = { geocodeAddress };
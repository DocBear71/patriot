// utils/geocoding.js

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
        const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`);
        const data = await response.json();

        if (data.results && data.results.length > 0) {
            const location = data.results[0].geometry.location;
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
// api/place-photo.js - Serverless function to proxy Google Places photos
const https = require('https');
const http = require('http');

/**
 * Serverless function to proxy Google Places photo requests
 * Avoids CORS issues by fetching the photo on the server side
 */
module.exports = async (req, res) => {
    // Handle OPTIONS request for CORS
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    console.log("Place photo API hit:", req.method);
    console.log("Query parameters:", req.query);

    // Only allow GET requests
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    // Get parameters from query
    const { placeId, maxwidth = 100, maxheight = 100 } = req.query;

    // Basic validation
    if (!placeId) {
        return res.status(400).json({ message: 'placeId parameter is required' });
    }

    try {
        // Get photo reference for this place ID
        const photoReference = await getPhotoReference(placeId);

        if (!photoReference) {
            console.log(`No photo reference found for place ID: ${placeId}`);
            return res.status(404).json({ message: 'No photo found for this place' });
        }

        // Get the photo using the reference
        const photoBuffer = await getGooglePlacePhoto(photoReference, maxwidth, maxheight);

        // Set appropriate content type and cache headers
        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours

        // Send the photo data
        res.status(200).send(photoBuffer);
    } catch (error) {
        console.error(`Error fetching place photo: ${error.message}`);

        // Don't expose internal error details to the client
        if (error.statusCode) {
            return res.status(error.statusCode).json({ message: error.message });
        }

        return res.status(500).json({ message: 'Error fetching photo' });
    }
};

/**
 * Get a photo reference for a place ID
 * @param {string} placeId - Google Place ID
 * @returns {Promise<string|null>} - Photo reference or null if not found
 */
async function getPhotoReference(placeId) {
    // Get the Google API key from environment variables
    const apiKey = process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyCHKhYZwQR37M_0QctXUQe6VFRFrlhaYj8';

    // Define the Places API endpoint URL for place details
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=photos&key=${apiKey}`;

    console.log(`Fetching place details for ID: ${placeId}`);

    try {
        // Make the request to Google Places API
        const placeData = await fetchJson(url);

        // Check if we have photos in the response
        if (placeData &&
            placeData.result &&
            placeData.result.photos &&
            placeData.result.photos.length > 0 &&
            placeData.result.photos[0].photo_reference) {

            return placeData.result.photos[0].photo_reference;
        }

        // Special handling for new-style photo references
        if (placeData &&
            placeData.result &&
            placeData.result.photos &&
            placeData.result.photos.length > 0 &&
            placeData.result.photos[0].name) {

            return placeData.result.photos[0].name;
        }

        console.log('No photo reference found in response');
        return null;
    } catch (error) {
        console.error(`Error fetching place details: ${error.message}`);
        throw error;
    }
}

/**
 * Get a place photo using its reference
 * @param {string} photoReference - Photo reference from Places API
 * @param {number} maxwidth - Maximum width of the photo
 * @param {number} maxheight - Maximum height of the photo
 * @returns {Promise<Buffer>} - Photo data as a buffer
 */
async function getGooglePlacePhoto(photoReference, maxwidth, maxheight) {
    // Get the Google API key from environment variables
    const apiKey = process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyCHKhYZwQR37M_0QctXUQe6VFRFrlhaYj8';

    // Define the Places API endpoint URL for photos
    const url = `https://maps.googleapis.com/maps/api/place/photo?photoreference=${photoReference}&maxwidth=${maxwidth}&maxheight=${maxheight}&key=${apiKey}`;

    console.log(`Fetching photo with reference: ${photoReference.substring(0, 20)}...`);

    try {
        // Make the request to Google Places API
        const photoBuffer = await fetchBuffer(url);
        return photoBuffer;
    } catch (error) {
        console.error(`Error fetching photo: ${error.message}`);
        throw error;
    }
}

/**
 * Fetch JSON data from a URL
 * @param {string} url - URL to fetch
 * @returns {Promise<Object>} - JSON response
 */
function fetchJson(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (response) => {
            // Check if the response is a redirect
            if (response.statusCode === 301 || response.statusCode === 302) {
                // Follow the redirect
                return fetchJson(response.headers.location)
                    .then(resolve)
                    .catch(reject);
            }

            // Check for error status codes
            if (response.statusCode < 200 || response.statusCode >= 300) {
                const error = new Error(`Request failed with status code ${response.statusCode}`);
                error.statusCode = response.statusCode;
                reject(error);
                return;
            }

            // Collect data chunks
            const chunks = [];
            response.on('data', (chunk) => chunks.push(chunk));

            // Process the complete response
            response.on('end', () => {
                try {
                    const data = JSON.parse(Buffer.concat(chunks).toString());
                    resolve(data);
                } catch (error) {
                    reject(new Error(`Error parsing JSON: ${error.message}`));
                }
            });
        }).on('error', reject);
    });
}

/**
 * Fetch binary data from a URL
 * @param {string} url - URL to fetch
 * @returns {Promise<Buffer>} - Response as buffer
 */
function fetchBuffer(url) {
    return new Promise((resolve, reject) => {
        // Determine the protocol based on the URL
        const protocol = url.startsWith('https') ? https : http;

        protocol.get(url, (response) => {
            // Check if the response is a redirect
            if (response.statusCode === 301 || response.statusCode === 302) {
                // Follow the redirect
                return fetchBuffer(response.headers.location)
                    .then(resolve)
                    .catch(reject);
            }

            // Check for error status codes
            if (response.statusCode < 200 || response.statusCode >= 300) {
                const error = new Error(`Request failed with status code ${response.statusCode}`);
                error.statusCode = response.statusCode;
                reject(error);
                return;
            }

            // Collect data chunks
            const chunks = [];
            response.on('data', (chunk) => chunks.push(chunk));

            // Process the complete response
            response.on('end', () => {
                resolve(Buffer.concat(chunks));
            });
        }).on('error', reject);
    });
}
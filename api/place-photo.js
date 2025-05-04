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
    console.log("Full URL:", req.url);

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
        // Get the Google API key - use a known working one for testing
        const apiKey = 'AIzaSyCHKhYZwQR37M_0QctXUQe6VFRFrlhaYj8';

        // Define the Places API endpoint URL for place details - use fields=photos,name for minimal data
        const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=photos,name&key=${apiKey}`;

        console.log("Using place details URL:", detailsUrl);

        // Make the request to Google Places API
        try {
            // Fetch the place details
            const placeData = await fetchJson(detailsUrl);
            console.log("Place data:", JSON.stringify(placeData).substring(0, 300) + "...");

            // Check status first
            if (placeData.status !== 'OK') {
                return res.status(200).json({
                    message: `Google API error: ${placeData.status}`,
                    debug: {
                        placeId: placeId,
                        status: placeData.status,
                        error_message: placeData.error_message || 'No error message'
                    },
                    fallbackUrl: `https://maps.gstatic.com/mapfiles/place_api/icons/v1/png_71/restaurant-71.png`
                });
            }

            // Check if photos exist in the response
            if (!placeData.result || !placeData.result.photos || placeData.result.photos.length === 0) {
                const placeName = placeData.result ? placeData.result.name : 'Unknown place';
                return res.status(200).json({
                    message: `No photos available for ${placeName}`,
                    debug: {
                        placeId: placeId,
                        placeName: placeName
                    },
                    fallbackUrl: `https://maps.gstatic.com/mapfiles/place_api/icons/v1/png_71/restaurant-71.png`
                });
            }

            // Extract the photo reference
            const photoDetails = placeData.result.photos[0];
            console.log("Photo details:", JSON.stringify(photoDetails));

            // Check for the photo reference - try both old and new formats
            const photoReference = photoDetails.photo_reference;

            if (!photoReference) {
                return res.status(200).json({
                    message: 'Photo reference not found in API response',
                    debug: {
                        placeId: placeId,
                        photoDetails: photoDetails
                    },
                    fallbackUrl: `https://maps.gstatic.com/mapfiles/place_api/icons/v1/png_71/restaurant-71.png`
                });
            }

            // Construct the photo URL
            const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?photoreference=${photoReference}&maxwidth=${maxwidth}&maxheight=${maxheight}&key=${apiKey}`;
            console.log("Photo URL:", photoUrl);

            try {
                // Fetch the photo - this will follow any redirects
                const photoBuffer = await fetchBuffer(photoUrl);

                // Set appropriate content type and cache headers
                res.setHeader('Content-Type', 'image/jpeg');
                res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours

                // Send the photo data
                return res.status(200).send(photoBuffer);
            } catch (photoError) {
                console.error("Error fetching photo:", photoError);
                return res.status(200).json({
                    message: 'Error fetching photo',
                    debug: {
                        placeId: placeId,
                        photoUrl: photoUrl,
                        error: photoError.message
                    },
                    fallbackUrl: `https://maps.gstatic.com/mapfiles/place_api/icons/v1/png_71/restaurant-71.png`
                });
            }
        } catch (placeError) {
            console.error("Error fetching place details:", placeError);
            return res.status(200).json({
                message: 'Error fetching place details',
                debug: {
                    placeId: placeId,
                    detailsUrl: detailsUrl,
                    error: placeError.message
                },
                fallbackUrl: `https://maps.gstatic.com/mapfiles/place_api/icons/v1/png_71/restaurant-71.png`
            });
        }
    } catch (error) {
        console.error("Top-level error:", error);
        return res.status(200).json({
            message: 'Server error',
            debug: {
                placeId: placeId,
                error: error.message
            },
            fallbackUrl: `https://maps.gstatic.com/mapfiles/place_api/icons/v1/png_71/restaurant-71.png`
        });
    }
};

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
                console.log(`Redirect to ${response.headers.location}`);
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
                    const body = Buffer.concat(chunks).toString();
                    console.log(`Response body preview: ${body.substring(0, 200)}...`);
                    const data = JSON.parse(body);
                    resolve(data);
                } catch (error) {
                    console.error(`Error parsing JSON: ${error.message}`);
                    reject(new Error(`Error parsing JSON: ${error.message}`));
                }
            });
        }).on('error', (error) => {
            console.error(`HTTP request error: ${error.message}`);
            reject(error);
        });
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
            console.log(`Photo fetch status: ${response.statusCode}`);

            // Check if the response is a redirect
            if (response.statusCode === 301 || response.statusCode === 302) {
                console.log(`Photo redirect to ${response.headers.location}`);
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
            response.on('data', (chunk) => {
                chunks.push(chunk);
            });

            // Process the complete response
            response.on('end', () => {
                console.log(`Photo data received, size: ${chunks.reduce((sum, c) => sum + c.length, 0)} bytes`);
                resolve(Buffer.concat(chunks));
            });
        }).on('error', (error) => {
            console.error(`HTTP request error: ${error.message}`);
            reject(error);
        });
    });
}
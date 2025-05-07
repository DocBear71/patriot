// update-business-locations.js
const connect = require('./config/db');
const Business = require('./models/Business');

/**
 * Update all businesses with approximate coordinates based on zip codes
 */
async function updateBusinessLocations() {
    try {
        // Connect to MongoDB using your existing configuration
        console.log('Connecting to MongoDB...');
        await connect;
        console.log('MongoDB connected successfully');

        // Define a map of zip codes to approximate coordinates for Cedar Rapids area
        const zipCoordinates = {
            '52401': { lat: 41.9779, lng: -91.6656 }, // Downtown Cedar Rapids
            '52402': { lat: 42.0208, lng: -91.6386 }, // Northeast Cedar Rapids
            '52403': { lat: 41.9564, lng: -91.6503 }, // Southeast Cedar Rapids
            '52404': { lat: 41.9445, lng: -91.6879 }, // Southwest Cedar Rapids
            '52405': { lat: 42.0307, lng: -91.7030 }, // Northwest Cedar Rapids
            '52302': { lat: 42.0342, lng: -91.5865 }, // Marion
            '52227': { lat: 41.9111, lng: -91.7868 }, // Fairfax
            '52233': { lat: 42.0494, lng: -91.8876 }, // Hiawatha
            '52411': { lat: 42.0215, lng: -91.7122 }  // Northern Cedar Rapids
        };

        // Find all businesses without location data
        const businesses = await Business.find({
            $or: [
                { location: { $exists: false } },
                { location: null }
            ]
        });

        console.log(`Found ${businesses.length} businesses without location data`);

        // Loop through each business and update its location
        for (const business of businesses) {
            console.log(`Processing ${business.bname} at ${business.address1}, ${business.zip}`);

            // Check if we have coordinates for this zip code
            if (zipCoordinates[business.zip]) {
                const coordinates = zipCoordinates[business.zip];

                // Add a small random offset to avoid all businesses in same zip code having identical coordinates
                const latOffset = (Math.random() - 0.5) * 0.01;  // ~0.5 mile variance
                const lngOffset = (Math.random() - 0.5) * 0.01;

                const finalLat = coordinates.lat + latOffset;
                const finalLng = coordinates.lng + lngOffset;

                // Update business with coordinates
                business.location = {
                    type: 'Point',
                    coordinates: [finalLng, finalLat]  // GeoJSON uses [longitude, latitude]
                };

                await business.save();
                console.log(`  Updated ${business.bname} with approximate coordinates: [${finalLng.toFixed(6)}, ${finalLat.toFixed(6)}]`);
            } else {
                console.warn(`  No coordinates available for zip code ${business.zip}`);
            }
        }

        console.log('All businesses updated successfully');
        setTimeout(() => process.exit(0), 1000);

    } catch (error) {
        console.error('Error updating business locations:', error);
        setTimeout(() => process.exit(1), 1000);
    }
}

// Run the update function
updateBusinessLocations();
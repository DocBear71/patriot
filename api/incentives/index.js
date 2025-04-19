// api/incentives/index.js - Get incentives for a business
const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');

// Create an Express server instance
const app = express();

// Enable JSON body parsing
app.use(express.json());

// Enable CORS for all routes
app.use(cors());

// MongoDB connection details
const MONGODB_URI = process.env.MONGODB_URI_PATRIOT || 'mongodb://localhost:27017/patriot-thanks';
const MONGODB_DB = process.env.MONGODB_DB_PATRIOT || 'patriot-thanks';
const INCENTIVES_COLLECTION = 'incentives';

// Handle OPTIONS preflight requests
app.options('*', cors());

// GET endpoint for retrieving incentives by business ID
app.get('/:businessId', async (req, res) => {
    console.log("Get incentives API hit:", req.method);
    console.log("Business ID:", req.params.businessId);

    let client = null;

    try {
        // Connect to MongoDB
        client = await MongoClient.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 10000,
            socketTimeoutMS: 15000,
        });

        const db = client.db(MONGODB_DB);
        const incentivesCollection = db.collection(INCENTIVES_COLLECTION);

        // Get business ID from path parameter
        const businessId = req.params.businessId;

        // Find incentives for the business
        const incentives = await incentivesCollection.find({
            business_id: businessId
        }).toArray();

        return res.status(200).json({
            message: 'Incentives retrieved successfully',
            results: incentives
        });

    } catch (error) {
        console.error('Get incentives error:', error);
        return res.status(500).json({ message: 'Server error while retrieving incentives: ' + error.message });
    } finally {
        // Close the connection
        if (client) await client.close();
    }
});

// GET endpoint for testing
app.get('/', (req, res) => {
    res.status(200).json({ message: 'Incentives API is available' });
});

// Export the Express API
module.exports = app;
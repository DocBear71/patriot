// api/incentive-add.js
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

// Handle OPTIONS preflight requests
app.options('*', cors());

// POST endpoint for adding incentives
app.post('/', async (req, res) => {
    console.log("Incentive API route hit:", req.method);

    try {
        console.log("Connecting to MongoDB...");

        // Connect to MongoDB
        const client = await MongoClient.connect(MONGODB_URI);
        console.log("Connected to MongoDB");

        const db = client.db(MONGODB_DB);

        // Extract incentive data from request body
        const incentiveData = req.body;
        console.log("Received incentive data:", incentiveData);

        // Validate required fields
        if (!incentiveData.business_id) {
            return res.status(400).json({ message: 'Business ID is required' });
        }

        // Convert string business_id to ObjectId if needed
        if (typeof incentiveData.business_id === 'string') {
            incentiveData.business_id = new ObjectId(incentiveData.business_id);
        }

        console.log("Inserting incentive data...");
        // Insert incentive data
        const result = await db.collection('incentives').insertOne(incentiveData);
        console.log("Incentive inserted successfully:", result.insertedId);

        // Close connection
        await client.close();

        // Return success response
        return res.status(201).json({
            message: 'Incentive added successfully',
            incentiveId: result.insertedId
        });

    } catch (error) {
        console.error('Incentive submission error:', error);
        return res.status(500).json({ message: 'Server error during incentive submission: ' + error.message });
    }
});

// GET endpoint for testing
app.get('/', (req, res) => {
    res.status(200).json({ message: 'Incentive API is available' });
});

// Export the Express API
module.exports = app;
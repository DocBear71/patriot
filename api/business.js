// api/register.js
const express = require('express');
const { MongoClient } = require('mongodb');
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

// POST endpoint for user registration
app.post('/', async (req, res) => {
    console.log("API route hit:", req.method);

    try {
        console.log("Connecting to MongoDB...");

        // Connect to MongoDB
        const client = await MongoClient.connect(MONGODB_URI);
        console.log("Connected to MongoDB");

        const db = client.db(MONGODB_DB);

        // Extract user data from request body
        const businessData = req.body;
        console.log("Received user data:", businessData);

        // Check if business already exists
        const existingBusiness = await db.collection('business').findOne({
            address1: businessData.address1,
            address2: businessData.address2,
            city: businessData.city,
            state: businessData.state,
            zip: businessData.zip
        });
        if (existingBusiness) {
            return res.status(409).json({ message: 'Business with this address already exists' });
        }

        console.log("Inserting business data...");
        // Insert business data
        const result = await db.collection('business').insertOne(businessData);
        console.log("User inserted successfully:", result.insertedId);

        // Close connection
        await client.close();

        // Return success response
        return res.status(201).json({
            message: 'Business submitted successfully',
            userId: result.insertedId
        });

    } catch (error) {
        console.error('Submission error:', error);
        return res.status(500).json({ message: 'Server error during submission: ' + error.message });
    }
});

// GET endpoint for testing
app.get('/', (req, res) => {
    res.status(200).json({ message: 'Business API is available' });
});

// Export the Express API
module.exports = app;
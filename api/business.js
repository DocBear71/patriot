// api/business.js - Business registration endpoint
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
const BUSINESS_COLLECTION = 'business';

// Handle OPTIONS preflight requests
app.options('*', cors());

// POST endpoint for business registration
app.post('/', async (req, res) => {
    console.log("Business API hit:", req.method);

    let client = null;

    try {
        console.log("Connecting to MongoDB...");

        // Connect to MongoDB
        client = await MongoClient.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 10000,
            socketTimeoutMS: 15000,
        });
        console.log("Connected to MongoDB");

        const db = client.db(MONGODB_DB);
        const collection = db.collection(BUSINESS_COLLECTION);

        // Extract business data from request body
        const businessData = req.body;
        console.log("Received business data:", businessData);

        // Check if business already exists
        const existingBusiness = await collection.findOne({
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
        const result = await collection.insertOne(businessData);
        console.log("Business registered successfully:", result.insertedId);

        // Return success response
        return res.status(201).json({
            message: 'Business registered successfully',
            businessId: result.insertedId
        });

    } catch (error) {
        console.error('Business submission error:', error);
        return res.status(500).json({ message: 'Server error during business submission: ' + error.message });
    } finally {
        // Close the connection
        if (client) await client.close();
    }
});

// GET endpoint for testing
app.get('/', (req, res) => {
    res.status(200).json({ message: 'Business API is available' });
});

// Export the Express API
module.exports = app;
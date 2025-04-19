// api/incentives/add.js - Add incentives to a business
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
const BUSINESS_COLLECTION = 'business';

// Handle OPTIONS preflight requests
app.options('*', cors());

// POST endpoint for adding an incentive
app.post('/', async (req, res) => {
    console.log("Incentives add API hit:", req.method);
    console.log("Request body:", req.body);

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
        const businessCollection = db.collection(BUSINESS_COLLECTION);

        // Extract incentive data from request body
        const incentiveData = req.body;

        // Basic validation
        if (!incentiveData.business_id) {
            return res.status(400).json({ message: 'Business ID is required' });
        }

        // Check if the business exists
        const businessExists = await businessCollection.findOne({
            _id: new ObjectId(incentiveData.business_id)
        });

        if (!businessExists) {
            return res.status(404).json({ message: 'Business not found' });
        }

        // Prepare incentive data for insertion
        const incentive = {
            business_id: incentiveData.business_id,
            is_available: incentiveData.is_available,
            type: incentiveData.type || '',
            amount: parseFloat(incentiveData.amount) || 0,
            information: incentiveData.information || '',
            created_at: new Date(),
            updated_at: new Date()
        };

        // Add the other_description field if provided
        if (incentiveData.type === 'OT' && incentiveData.other_description) {
            incentive.other_description = incentiveData.other_description;
        }

        // Insert incentive data
        const result = await incentivesCollection.insertOne(incentive);

        // Return success response
        return res.status(201).json({
            message: 'Incentive added successfully',
            incentiveId: result.insertedId
        });

    } catch (error) {
        console.error('Incentive submission error:', error);
        return res.status(500).json({ message: 'Server error during incentive submission: ' + error.message });
    } finally {
        // Close the connection
        if (client) await client.close();
    }
});

// GET endpoint for testing
app.get('/', (req, res) => {
    res.status(200).json({ message: 'Incentives Add API is available' });
});

// Export the Express API
module.exports = app;
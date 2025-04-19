// api/business-search.js - Business search endpoint
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

// GET endpoint for business search
app.get('/', async (req, res) => {
    console.log("Business search API hit:", req.method);
    console.log("Query parameters:", req.query);

    let client = null;

    try {
        // Connect to MongoDB
        client = await MongoClient.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 10000,
            socketTimeoutMS: 15000,
        });

        const db = client.db(MONGODB_DB);
        const collection = db.collection(BUSINESS_COLLECTION);

        // Build query based on provided parameters
        const query = {};
        const searchConditions = [];

        if (req.query.businessName && req.query.businessName.trim() !== '') {
            // Search by business name
            searchConditions.push({ bname: { $regex: req.query.businessName, $options: 'i' } });
        }

        if (req.query.address && req.query.address.trim() !== '') {
            // Search in multiple address fields
            searchConditions.push({ address1: { $regex: req.query.address, $options: 'i' } });
            searchConditions.push({ address2: { $regex: req.query.address, $options: 'i' } });
            searchConditions.push({ city: { $regex: req.query.address, $options: 'i' } });
            searchConditions.push({ zip: { $regex: req.query.address, $options: 'i' } });
        }

        // If we have search conditions, use $or to match any of them
        if (searchConditions.length > 0) {
            query.$or = searchConditions;
        }

        console.log("MongoDB Query:", JSON.stringify(query, null, 2));

        // Find businesses matching the query
        const businesses = await collection.find(query).toArray();

        return res.status(200).json({
            message: 'Search successful',
            results: businesses
        });

    } catch (error) {
        console.error('Search error:', error);
        return res.status(500).json({ message: 'Server error during search: ' + error.message });
    } finally {
        // Close the connection
        if (client) await client.close();
    }
});

// Export the Express API
module.exports = app;
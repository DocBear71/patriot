// api/users/update.js - Update user profile
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
const USERS_COLLECTION = 'users';

// Handle OPTIONS preflight requests
app.options('*', cors());

// PUT endpoint for updating user profile
app.put('/', async (req, res) => {
    console.log("User update API hit:", req.method);

    let client = null;

    try {
        // Extract user data from request body
        const userData = req.body;

        // Basic validation
        if (!userData._id) {
            return res.status(400).json({ message: 'User ID is required' });
        }

        // Connect to MongoDB
        client = await MongoClient.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 10000,
            socketTimeoutMS: 15000,
        });

        const db = client.db(MONGODB_DB);
        const collection = db.collection(USERS_COLLECTION);

        // Prepare data for update (exclude _id field)
        const { _id, ...updateData } = userData;

        // Update user profile
        const result = await collection.updateOne(
            { _id: new ObjectId(_id) },
            { $set: updateData }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Return success response
        return res.status(200).json({
            message: 'User profile updated successfully',
            modifiedCount: result.modifiedCount
        });

    } catch (error) {
        console.error('Profile update error:', error);
        return res.status(500).json({ message: 'Server error during profile update: ' + error.message });
    } finally {
        // Close the connection
        if (client) await client.close();
    }
});

// GET endpoint for testing
app.get('/', (req, res) => {
    res.status(200).json({ message: 'User Update API is available' });
});

// Export the Express API
module.exports = app;
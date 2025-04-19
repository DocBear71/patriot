// api/verify-admin-code.js - Admin code verification endpoint
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

// POST endpoint for admin code verification
app.post('/', async (req, res) => {
    console.log("Admin code verification API hit:", req.method);

    let client = null;

    try {
        // Extract verification data from request body
        const { code, userId } = req.body;

        // Basic validation
        if (!code) {
            return res.status(400).json({ message: 'Access code is required' });
        }

        // Connect to MongoDB
        client = await MongoClient.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 10000,
            socketTimeoutMS: 15000,
        });

        const db = client.db(MONGODB_DB);
        const adminCodesCollection = db.collection('admin_codes');
        const usersCollection = db.collection(USERS_COLLECTION);

        // Find the code in the admin_codes collection
        const adminCode = await adminCodesCollection.findOne({ code: code });

        if (!adminCode) {
            return res.status(401).json({ message: 'Invalid admin access code' });
        }

        // Check if code is expired
        if (adminCode.expiration && new Date() > new Date(adminCode.expiration)) {
            return res.status(401).json({ message: 'Admin access code has expired' });
        }

        // If userId is provided, update the user's status to Admin
        if (userId) {
            await usersCollection.updateOne(
                { _id: new ObjectId(userId) },
                { $set: { status: 'AD', isAdmin: true } }
            );
        }

        // Return success response
        return res.status(200).json({
            message: 'Admin access verified successfully',
            description: adminCode.description,
            access: true
        });

    } catch (error) {
        console.error('Admin verification error:', error);
        return res.status(500).json({ message: 'Server error during admin verification: ' + error.message });
    } finally {
        // Close the connection
        if (client) await client.close();
    }
});

// GET endpoint for testing
app.get('/', (req, res) => {
    res.status(200).json({ message: 'Admin Verification API is available' });
});

// Export the Express API
module.exports = app;
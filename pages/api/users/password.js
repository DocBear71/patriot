// api/users/password.js - Update user password
const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
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

// PUT endpoint for updating password
app.put('/', async (req, res) => {
    console.log("Password update API hit:", req.method);

    let client = null;

    try {
        // Extract password data from request body
        const { userId, currentPassword, newPassword } = req.body;

        // Basic validation
        if (!userId || !currentPassword || !newPassword) {
            return res.status(400).json({
                message: 'User ID, current password, and new password are required'
            });
        }

        // Connect to MongoDB
        client = await MongoClient.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 10000,
            socketTimeoutMS: 15000,
        });

        const db = client.db(MONGODB_DB);
        const collection = db.collection(USERS_COLLECTION);

        // Find the user
        const user = await collection.findOne({ _id: new ObjectId(userId) });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Verify current password
        const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Current password is incorrect' });
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update the password
        const result = await collection.updateOne(
            { _id: new ObjectId(userId) },
            { $set: { password: hashedPassword, updated_at: new Date() } }
        );

        // Return success response
        return res.status(200).json({
            message: 'Password updated successfully',
            success: true
        });

    } catch (error) {
        console.error('Password update error:', error);
        return res.status(500).json({
            message: 'Server error during password update: ' + error.message
        });
    } finally {
        // Close the connection
        if (client) await client.close();
    }
});

// GET endpoint for testing
app.get('/', (req, res) => {
    res.status(200).json({ message: 'Password Update API is available' });
});

// Export the Express API
module.exports = app;
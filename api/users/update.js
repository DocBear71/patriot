// api/users/update.js - Update user profile
const connect = require('../../config/db');
const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;

// Define user schema
const userSchema = new mongoose.Schema({
    fname: String,
    lname: String,
    address1: String,
    address2: String,
    city: String,
    state: String,
    zip: String,
    status: String,
    level: String,
    email: String,
    password: String,
    isAdmin: Boolean,
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
});

// Initialize the User model
let User;
try {
    // Try to fetch the existing model
    User = mongoose.model('User');
} catch (error) {
    // Define the model if it doesn't exist
    User = mongoose.model('User', userSchema, 'user');
}

module.exports = async (req, res) => {
    // CORS handled through next.config.js

    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Handle GET request for testing
    if (req.method === 'GET') {
        return res.status(200).json({ message: 'User update API is available' });
    }

    // Only allow PUT requests for user updates (to match your frontend)
    if (req.method !== 'PUT') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        console.log("User update API hit:", req.method);
        console.log("Request body:", req.body);

        // Extract user data from request body
        const userData = req.body;

        // Basic validation
        if (!userData._id) {
            return res.status(400).json({ message: 'User ID is required' });
        }

        // Connect to MongoDB
        await connect;

        // Find the user by ID to verify it exists
        const existingUser = await User.findOne({ _id: new ObjectId(userData._id) });

        if (!existingUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Prepare data for update (exclude _id field)
        const { _id, ...updateData } = userData;

        // Add updated timestamp
        updateData.updated_at = new Date();

        // Update the user
        const result = await User.updateOne(
            { _id: new ObjectId(_id) },
            { $set: updateData }
        );

        if (result.modifiedCount === 0) {
            return res.status(200).json({
                message: 'No changes were made to the user profile',
                success: true
            });
        }

        // Return success response
        return res.status(200).json({
            message: 'User profile updated successfully',
            success: true
        });

    } catch (error) {
        console.error('User update error:', error);
        return res.status(500).json({
            message: 'Server error during user update: ' + error.message
        });
    }
};
// api/users/index.js - Combined user endpoint handlers, formerly get.js, password.js, profile.js, and update.js
const connect = require('../../config/db');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { ObjectId } = mongoose.Types;

// Define user schema once
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

// Initialize the User model once
let User;
try {
    User = mongoose.model('User');
} catch (error) {
    User = mongoose.model('User', userSchema, 'users');
}

/**
 * Combined API handler for all user operations
 */
module.exports = async (req, res) => {
    // Handle OPTIONS request for CORS
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Route the request based on path and method
    const { operation } = req.query;

    try {
        switch (operation) {
            case 'profile':
                return await handleProfileGet(req, res);
            case 'get':
                return await handleUserGet(req, res);
            case 'update':
                return await handleUserUpdate(req, res);
            case 'password':
                return await handlePasswordUpdate(req, res);
            default:
                if (req.method === 'GET') {
                return res.status(200).json({
                    message: 'User API is available',
                    operations: ['profile', 'get', 'update', 'password']
                });
            }
                return res.status(400).json({ message: 'Invalid operation' });
        }
    } catch (error) {
        console.error(`Error in users API (${operation || 'unknown'}):`, error);
        return res.status(500).json({ message: 'Server error: ' + error.message });
    }
};

/**
 * Handle GET request for user profile
 */
async function handleProfileGet(req, res) {
    // Only allow GET requests
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    console.log("Profile API hit:", req.method);
    console.log("Query params:", req.query);

    const userId = req.query.userId;

    if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
    }

    // Connect to MongoDB
    await connect;

    // Find the user
    let user;
    try {
        user = await User.findOne({ _id: new ObjectId(userId) });
    } catch (error) {
        console.log("Error finding user:", error);
        // Try with string ID if ObjectId fails
        user = await User.findOne({ _id: userId });
    }

    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }

    // Convert to plain object and remove password
    const userData = user.toObject ? user.toObject() : { ...user };
    delete userData.password;

    console.log("Returning user data:", userData);

    return res.status(200).json({
        user: userData,
        success: true
    });
}

/**
 * Handle GET request for user by ID
 */
async function handleUserGet(req, res) {
    // Only allow GET requests
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    // Get user ID from query
    const userId = req.query.id;

    if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
    }

    // Connect to MongoDB
    await connect;

    // Find the user
    const user = await User.findOne({ _id: new ObjectId(userId) });

    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }

    // Create a user object without the password
    const userData = user.toObject();
    delete userData.password;

    // Return user data
    return res.status(200).json({
        user: userData,
        success: true
    });
}

/**
 * Handle PUT request for updating user profile
 */
async function handleUserUpdate(req, res) {
    // Handle GET request for testing
    if (req.method === 'GET') {
        return res.status(200).json({ message: 'User update API is available' });
    }

    // Only allow PUT requests for user updates
    if (req.method !== 'PUT') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

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
}

/**
 * Handle POST request for updating user password
 */
async function handlePasswordUpdate(req, res) {
    // Handle GET request for testing
    if (req.method === 'GET') {
        return res.status(200).json({ message: 'password update API is available' });
    }

    // Only allow POST requests for password updates
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    console.log("Password update API hit:", req.method);
    console.log("Request body:", req.body);

    // Extract password data from request body
    const { userId, currentPassword, newPassword } = req.body;

    // Basic validation
    if (!userId || !currentPassword || !newPassword) {
        return res.status(400).json({
            message: 'User ID, current password, and new password are required'
        });
    }

    await connect;

    // Find the user
    const userExists = await User.findOne({ _id: new ObjectId(userId) });

    if (!userExists) {
        return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, userExists.password);

    if (!isPasswordValid) {
        return res.status(401).json({ message: 'Current password is incorrect' });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the password
    const result = await User.updateOne(
        { _id: new ObjectId(userId) },
        { $set: { password: hashedPassword, updated_at: new Date() } }
    );

    // Return success response
    return res.status(200).json({
        message: 'Password updated successfully',
        success: true
    });
}
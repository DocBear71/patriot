// api/users/password.js - Update user password
const connect = require('../../config/db');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { ObjectId } = mongoose.Types;

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

let User;
try {
    // try to fetch the existing models
    User = mongoose.model('User');
} catch (error) {
    // lets define the models if they do not exist
    User = mongoose.model('User', userSchema, 'user');
}
// PUT endpoint for updating password
module.exports = async (req, res) => {
    // CORS enabled through next.config.js
    console.log("Password update API hit:", req.method);

    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Handle GET request for testing
    if (req.method === 'GET') {
        return res.status(200).json({ message: 'password Add API is available' });
    }

    // Only allow POST requests for actual operations
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
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

    } catch (error) {
        console.error('Password update error:', error);
        return res.status(500).json({
            message: 'Server error during password update: ' + error.message
        });
    }
};

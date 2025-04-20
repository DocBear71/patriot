// api/users/get.js
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
    User = mongoose.model('User');
} catch (error) {
    User = mongoose.model('User', userSchema, 'user');
}

module.exports = async (req, res) => {
    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Only allow GET requests
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
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

    } catch (error) {
        console.error('Get user error:', error);
        return res.status(500).json({
            message: 'Server error: ' + error.message
        });
    }
};
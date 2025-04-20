// api/users/profile.js
const connect = require('../../config/db');
const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;

// Define user schema (same as your other user endpoints)
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
    User = mongoose.model('User');
} catch (error) {
    User = mongoose.model('User', userSchema, 'user');
}

module.exports = async (req, res) => {
    // Handle OPTIONS request
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Only allow GET requests
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
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

    } catch (error) {
        console.error("Profile fetch error:", error);
        return res.status(500).json({ message: 'Server error: ' + error.message });
    }
};
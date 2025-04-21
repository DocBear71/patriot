// api/admin/users/index.js - Simplified admin users endpoint
const connect = require('../../../config/db');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

// Using the same User model as your existing code
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

// Main handler function
module.exports = async (req, res) => {
    console.log("Admin users API called:", req.method);

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        res.setHeader('Allow', 'GET, POST, OPTIONS');
        return res.status(200).end();
    }

    try {
        // Get session token from request headers
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Authorization required' });
        }

        const token = authHeader.split(' ')[1];

        // Verify token and check admin status
        let userId;
        try {
            // Using the same JWT secret as your auth system
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'patriot-thanks-secret-key');
            userId = decoded.userId;
        } catch (error) {
            console.error("Token verification error:", error);
            return res.status(401).json({ message: 'Invalid or expired token' });
        }

        // Connect to database
        await connect;

        // Check if user exists and is admin
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.level !== 'Admin' && user.isAdmin !== true) {
            return res.status(403).json({ message: 'Admin access required' });
        }

        // Handle different HTTP methods
        switch (req.method) {
            case 'GET':
                return await getUsers(req, res);
            case 'POST':
                return await createUser(req, res);
            default:
                return res.status(405).json({ message: 'Method not allowed' });
        }
    } catch (error) {
        console.error("Admin users API error:", error);
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/**
 * Get users with filtering and pagination
 */
async function getUsers(req, res) {
    try {
        // Parse query parameters
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Build filter object
        const filter = {};

        // Search filter (search by name or email)
        if (req.query.search) {
            const searchRegex = new RegExp(req.query.search, 'i');
            filter.$or = [
                { fname: searchRegex },
                { lname: searchRegex },
                { email: searchRegex }
            ];
        }

        // Status filter
        if (req.query.status) {
            filter.status = req.query.status;
        }

        // Level filter
        if (req.query.level) {
            filter.level = req.query.level;
        }

        console.log("User filter:", filter);

        // Get total count
        const total = await User.countDocuments(filter);

        // Get users
        const users = await User.find(filter)
            .select('-password') // Exclude password
            .sort({ created_at: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        console.log(`Found ${users.length} users`);

        return res.status(200).json({
            users,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error('Error getting users:', error);
        return res.status(500).json({ message: 'Error retrieving users', error: error.message });
    }
}

/**
 * Create a new user
 */
async function createUser(req, res) {
    try {
        // Implementation will go here when needed
        return res.status(501).json({ message: 'Not implemented yet' });
    } catch (error) {
        console.error('Error creating user:', error);
        return res.status(500).json({ message: 'Error creating user', error: error.message });
    }
}
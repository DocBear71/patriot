// api/auth-verify.js - Combined auth verification and admin-verify endpoints
// This combines admin-verify.js with token verification functions from auth.js

const connect = require('../config/db');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { ObjectId } = mongoose.Types;

// Initialize User model
let User;
try {
    User = mongoose.model('User');
} catch (error) {
    // If model isn't registered yet, define it
    const userSchema = new mongoose.Schema({
        fname: String,
        lname: String,
        email: String,
        password: String,
        isAdmin: Boolean,
        level: String,
        created_at: { type: Date, default: Date.now },
        updated_at: { type: Date, default: Date.now }
    });

    // Register the model
    User = mongoose.model('User', userSchema, 'users');
}

/**
 * Main handler function
 */
module.exports = async (req, res) => {
    // Handle OPTIONS request for CORS
    if (req.method === 'OPTIONS') {
        res.setHeader('Allow', 'GET, OPTIONS');
        return res.status(200).end();
    }

    console.log("Auth verification API hit:", req.method, req.url);

    // Extract operation from query params
    const { operation } = req.query;

    try {
        // Route based on operation
        if (operation === 'admin-verify') {
            return await handleAdminVerify(req, res);
        } else if (operation === 'verify-token') {
            return await handleVerifyToken(req, res);
        } else {
            // Default to token verification
            return await handleVerifyToken(req, res);
        }
    } catch (error) {
        console.error(`Error in auth verification:`, error);
        return res.status(500).json({ message: 'Server error: ' + error.message });
    }
};

/**
 * Handle token verification
 */
async function handleVerifyToken(req, res) {
    console.log("Verify token handler called");

    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Authorization required' });
    }

    const token = authHeader.split(' ')[1];

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'patriot-thanks-secret-key');

        // Connect to database
        try {
            await connect;
            console.log("Database connection established");
        } catch (dbError) {
            console.error("Database connection error:", dbError);
            return res.status(500).json({
                message: 'Database connection error',
                error: dbError.message
            });
        }

        // Find the user
        const user = await User.findById(decoded.userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Return user information
        return res.status(200).json({
            isValid: true,
            userId: user._id,
            isAdmin: user.isAdmin || user.level === 'Admin',
            level: user.level,
            name: `${user.fname} ${user.lname}`
        });
    } catch (error) {
        console.error('Token verification error:', error);

        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Invalid or expired token' });
        }

        return res.status(500).json({ message: 'Server error', error: error.message });
    }
}

/**
 * Handle admin verification
 */
async function handleAdminVerify(req, res) {
    console.log("Admin verify handler called");

    // For simplicity, we'll reuse the token verification function
    // but add additional admin check

    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Authorization required' });
    }

    const token = authHeader.split(' ')[1];

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'patriot-thanks-secret-key');

        // Connect to database
        try {
            await connect;
            console.log("Database connection established");
        } catch (dbError) {
            console.error("Database connection error:", dbError);
            return res.status(500).json({
                message: 'Database connection error',
                error: dbError.message
            });
        }

        // Find the user
        const user = await User.findById(decoded.userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if user is admin
        const isAdmin = user.level === 'Admin' || user.isAdmin === true;

        if (!isAdmin) {
            return res.status(403).json({ message: 'Admin access required' });
        }

        // Return admin information
        return res.status(200).json({
            isValid: true,
            isAdmin: true,
            userId: user._id,
            level: user.level,
            name: `${user.fname} ${user.lname}`
        });
    } catch (error) {
        console.error('Admin verification error:', error);

        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Invalid or expired token' });
        }

        return res.status(500).json({ message: 'Server error', error: error.message });
    }
}
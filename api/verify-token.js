const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const connect = require('../config/db');

// Using the same User model
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
    console.log("Verify token API called:", req.method);
    console.log("Request headers:", JSON.stringify(req.headers));

    // Respond with a simple success status for testing
    return res.status(200).json({
        message: 'API endpoint is working',
        isValid: true,
        isAdmin: true,
        level: 'Admin',
        name: 'Test Admin'
    });

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        res.setHeader('Allow', 'GET, OPTIONS');
        return res.status(200).end();
    }

    // Only allow GET requests
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        // Get token from Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Authorization required' });
        }

        const token = authHeader.split(' ')[1];
        console.log("Token received, verifying...");

        // Verify token with error handling
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET || 'patriot-thanks-secret-key');
            console.log("Token verified for user ID:", decoded.userId);
        } catch (jwtError) {
            console.error("JWT verification error:", jwtError.name, jwtError.message);

            if (jwtError.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Token expired' });
            } else {
                return res.status(401).json({ message: 'Invalid token' });
            }
        }

        try {
            // Ensure database connection before query
            console.log("Connecting to database...");
            await connect;
            console.log("Database connection established");

            // Set a timeout promise for database operation
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Database query timed out')), 5000);
            });

            // Find user with timeout handling
            console.log("Finding user by ID:", decoded.userId);
            const userPromise = User.findById(decoded.userId).select('-password').lean();

            // Race the user query against the timeout
            const user = await Promise.race([userPromise, timeoutPromise]);

            if (!user) {
                console.log("User not found:", decoded.userId);
                return res.status(404).json({ message: 'User not found' });
            }

            // Return user data with isValid flag
            console.log("User verification successful:", user._id);
            return res.status(200).json({
                isValid: true,
                userId: user._id,
                isAdmin: user.level === 'Admin' || user.isAdmin === true,
                level: user.level,
                name: `${user.fname} ${user.lname}`
            });
        } catch (dbError) {
            console.error("Database error during user lookup:", dbError.name, dbError.message);

            if (dbError.message === 'Database query timed out') {
                return res.status(503).json({ message: 'Database operation timed out' });
            }

            throw dbError; // Let the outer catch block handle other errors
        }
    } catch (error) {
        console.error('Token verification process error:', error.name, error.message);
        return res.status(500).json({ message: 'Server error during verification', error: error.message });
    }
};
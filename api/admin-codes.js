// api/admin-codes.js - Backend for admin code management
const connect = require('../config/db');
const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;

// Initialize AdminCode model with error handling
let AdminCode;

try {
    AdminCode = mongoose.model('AdminCode');
} catch (error) {
    // If model isn't registered yet, define it
    const adminCodeSchema = new mongoose.Schema({
        code: String,
        description: String,
        expiration: Date,
        created_at: { type: Date, default: Date.now }
    });

    // Register the model
    AdminCode = mongoose.model('AdminCode', adminCodeSchema, 'admin_codes');
}

// Initialize User model for admin verification
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
        level: String
    });

    // Register the model
    User = mongoose.model('User', userSchema, 'users');
}

/**
 * Helper to verify that the user has admin access
 */
async function verifyAdminAccess(req) {
    // Get token from request headers
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { success: false, status: 401, message: 'Authorization required' };
    }

    const token = authHeader.split(' ')[1];

    // Verify token and check admin status
    let userId;
    try {
        // Using JWT from auth.js
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'patriot-thanks-secret-key');
        userId = decoded.userId;
    } catch (error) {
        console.error("Token verification error:", error);
        return { success: false, status: 401, message: 'Invalid or expired token' };
    }

    // Connect to MongoDB
    try {
        await connect;
    } catch (dbError) {
        console.error("Database connection error:", dbError);
        return {
            success: false,
            status: 500,
            message: 'Database connection error',
            error: dbError.message
        };
    }

    // Check if user exists and is admin
    const user = await User.findById(userId);

    if (!user) {
        return { success: false, status: 404, message: 'User not found' };
    }

    if (user.level !== 'Admin' && user.isAdmin !== true) {
        return { success: false, status: 403, message: 'Admin access required' };
    }

    return { success: true, userId, user };
}

/**
 * Main API handler for admin code management
 */
module.exports = async (req, res) => {
    // Handle OPTIONS request for CORS
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        return res.status(200).end();
    }

    // Route based on operation parameter
    const { operation } = req.query;
    console.log(`Admin Codes API called with operation: ${operation || 'none'}, method: ${req.method}`);

    try {
        // First verify admin access for all operations
        const adminCheck = await verifyAdminAccess(req);
        if (!adminCheck.success) {
            return res.status(adminCheck.status).json({ message: adminCheck.message });
        }

        // Route to appropriate handler based on operation
        switch (operation) {
            case 'list':
                return await handleListCodes(req, res);
            case 'create':
                return await handleCreateCode(req, res);
            case 'delete':
                return await handleDeleteCode(req, res);
            default:
                return res.status(400).json({ message: 'Invalid operation' });
        }
    } catch (error) {
        console.error(`Error in admin codes API (${operation || 'unknown'}):`, error);
        return res.status(500).json({ message: 'Server error: ' + error.message });
    }
};

/**
 * Handle listing all admin codes
 */
async function handleListCodes(req, res) {
    try {
        // Connect to MongoDB
        await connect;

        // Get all codes, sorted by creation date (newest first)
        const codes = await AdminCode.find({})
            .sort({ created_at: -1 })
            .lean();

        return res.status(200).json({ codes });
    } catch (error) {
        console.error("Error listing admin codes:", error);
        return res.status(500).json({ message: 'Error retrieving admin codes: ' + error.message });
    }
}

/**
 * Handle creating a new admin code
 */
async function handleCreateCode(req, res) {
    try {
        // Extract code data from request body
        const { code, description, expiration } = req.body;

        // Basic validation
        if (!code || !description) {
            return res.status(400).json({ message: 'Code and description are required' });
        }

        // Connect to MongoDB
        await connect;

        // Check if code already exists
        const existingCode = await AdminCode.findOne({ code });
        if (existingCode) {
            return res.status(409).json({ message: 'An access code with this value already exists' });
        }

        // Prepare new code document
        const newCode = new AdminCode({
            code,
            description,
            expiration: expiration ? new Date(expiration) : null,
            created_at: new Date()
        });

        // Save to database
        await newCode.save();

        return res.status(201).json({
            message: 'Admin access code created successfully',
            code: newCode
        });
    } catch (error) {
        console.error("Error creating admin code:", error);
        return res.status(500).json({ message: 'Error creating admin code: ' + error.message });
    }
}

/**
 * Handle deleting an admin code
 */
async function handleDeleteCode(req, res) {
    try {
        // Extract code ID from request body
        const { codeId } = req.body;

        // Basic validation
        if (!codeId) {
            return res.status(400).json({ message: 'Code ID is required' });
        }

        // Connect to MongoDB
        await connect;

        // Delete the code
        const result = await AdminCode.findByIdAndDelete(codeId);

        if (!result) {
            return res.status(404).json({ message: 'Admin code not found' });
        }

        return res.status(200).json({
            message: 'Admin access code deleted successfully',
            codeId
        });
    } catch (error) {
        console.error("Error deleting admin code:", error);
        return res.status(500).json({ message: 'Error deleting admin code: ' + error.message });
    }
}
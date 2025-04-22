// api/admin/users/[userId].js - Handle operations on a specific user
const connect = require('../../../config/db');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
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
    User = mongoose.model('User', userSchema, 'users');
}

// Main handler function
module.exports = async (req, res) => {
    console.log("Admin user operation API called:", req.method);

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        res.setHeader('Allow', 'GET, PUT, DELETE, OPTIONS');
        return res.status(200).end();
    }

    try {
        // Get userId from request query or param
        let userId = req.query.userId || req.url.split('/').pop();



        // Remove .js extension if present
        if (userId && userId.endsWith('.js')) {
            userId = userId.replace('.js', '');
        }

        if (!userId) {
            return res.status(400).json({ message: 'User ID is required' });
        }

        console.log("Operating on user ID:", userId);

        // Get session token from request headers
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Authorization required' });
        }

        const token = authHeader.split(' ')[1];

        // Verify token and check admin status
        let adminUserId;
        try {
            // Using the same JWT secret as your auth system
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'patriot-thanks-secret-key');
            adminUserId = decoded.userId;
        } catch (error) {
            console.error("Token verification error:", error);
            return res.status(401).json({ message: 'Invalid or expired token' });
        }

        // Connect to MongoDB - fix the connection call
        try {
            await connect;  // Since connect is already a Promise, just await it
            console.log("Database connection established");
        } catch (dbError) {
            console.error("Database connection error:", dbError);
            return res.status(500).json({ message: 'Database connection error', error: dbError.message });
        }

        // Check if admin user exists and is admin
        const adminUser = await User.findById(adminUserId);

        if (!adminUser) {
            return res.status(404).json({ message: 'Admin user not found' });
        }

        if (adminUser.level !== 'Admin' && adminUser.isAdmin !== true) {
            return res.status(403).json({ message: 'Admin access required' });
        }

        // Handle different HTTP methods
        switch (req.method) {
            case 'GET':
                return await getUser(req, res, userId);
            case 'PUT':
                return await updateUser(req, res, userId);
            case 'DELETE':
                return await deleteUser(req, res, userId, adminUserId);
            default:
                return res.status(405).json({ message: 'Method not allowed' });
        }
    } catch (error) {
        console.error("Admin user operation API error:", error);
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/**
 * Get a single user by ID
 */
async function getUser(req, res, userId) {
    try {
        const user = await User.findById(userId).select('-password').lean();

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        return res.status(200).json({ user });
    } catch (error) {
        console.error('Error getting user:', error);
        return res.status(500).json({ message: 'Error retrieving user', error: error.message });
    }
}

/**
 * Update an existing user
 */
async function updateUser(req, res, userId) {
    try {
        // Get update data from request body
        const updateData = req.body;

        // Find user to update
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // If email is changing, check if it's already taken
        if (updateData.email && updateData.email !== user.email) {
            const existingUser = await User.findOne({ email: updateData.email });

            if (existingUser && existingUser._id.toString() !== userId) {
                return res.status(409).json({ message: 'Email is already registered by another user' });
            }
        }

        // If password is provided, hash it
        if (updateData.password) {
            updateData.password = await bcrypt.hash(updateData.password, 10);
        }

        // Set admin status based on level
        if (updateData.level) {
            updateData.isAdmin = updateData.level === 'Admin';
        }

        // Add updated timestamp
        updateData.updated_at = new Date();

        // Update user
        await User.findByIdAndUpdate(userId, updateData);

        // Get updated user (without password)
        const updatedUser = await User.findById(userId).select('-password').lean();

        return res.status(200).json({
            message: 'User updated successfully',
            user: updatedUser
        });
    } catch (error) {
        console.error('Error updating user:', error);
        return res.status(500).json({ message: 'Error updating user', error: error.message });
    }
}

/**
 * Delete a user
 */
async function deleteUser(req, res, userId, adminUserId) {
    try {
        // Check if user exists
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Prevent deleting self
        if (userId === adminUserId) {
            return res.status(403).json({ message: 'You cannot delete your own account' });
        }

        // Delete the user
        await User.findByIdAndDelete(userId);

        return res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        return res.status(500).json({ message: 'Error deleting user', error: error.message });
    }
}
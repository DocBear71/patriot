// api/admin/users/index.js - Admin user management API
const connect = require('../../../config/db');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
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

// Initialize the User model once
let User;
try {
    User = mongoose.model('User');
} catch (error) {
    User = mongoose.model('User', userSchema, 'user');
}

/**
 * Middleware to verify admin access
 */
async function verifyAdmin(req, res, next) {
    // Get the authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Authorization token required' });
    }

    // Extract the token
    const token = authHeader.split(' ')[1];

    try {
        // Verify the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'patriot-thanks-secret-key');

        // Check if user exists and is an admin
        const user = await User.findById(decoded.userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.level !== 'Admin' && user.isAdmin !== true) {
            return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
        }

        // Add user ID to request
        req.userId = decoded.userId;
        next();
    } catch (error) {
        console.error('Token verification error:', error);
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
}

/**
 * Main handler for admin user operations
 */
module.exports = async (req, res) => {
    // Handle OPTIONS request for CORS
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        // Connect to database
        await connect;

        // Verify admin access first (except for OPTIONS)
        if (req.method !== 'OPTIONS') {
            await verifyAdmin(req, res, function() {
                // Determine the operation based on method and path
                if (req.url.match(/\/[a-zA-Z0-9]+$/)) {
                    // URL pattern matches "/api/admin/users/{id}"
                    const userId = req.url.split('/').pop();

                    switch (req.method) {
                        case 'GET':
                            return getUserById(req, res, userId);
                        case 'PUT':
                            return updateUser(req, res, userId);
                        case 'DELETE':
                            return deleteUser(req, res, userId);
                        default:
                            return res.status(405).json({ message: 'Method not allowed' });
                    }
                } else {
                    // URL pattern matches "/api/admin/users"
                    switch (req.method) {
                        case 'GET':
                            return getUsers(req, res);
                        case 'POST':
                            return createUser(req, res);
                        default:
                            return res.status(405).json({ message: 'Method not allowed' });
                    }
                }
            });
        }
    } catch (error) {
        console.error('Admin Users API error:', error);
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/**
 * Get users with filtering, pagination
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

        // Get total count
        const total = await User.countDocuments(filter);

        // Get users
        const users = await User.find(filter)
            .select('-password') // Exclude password
            .sort({ created_at: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

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
 * Get user by ID
 */
async function getUserById(req, res, userId) {
    try {
        // Find user by ID
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
 * Create new user
 */
async function createUser(req, res) {
    try {
        const {
            fname, lname, email, password, address1, address2,
            city, state, zip, status, level
        } = req.body;

        // Validate required fields
        if (!fname || !lname || !email || !password || !status || !level) {
            return res.status(400).json({
                message: 'Missing required fields',
                required: ['fname', 'lname', 'email', 'password', 'status', 'level']
            });
        }

        // Check if email already exists
        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(409).json({ message: 'Email already registered' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user object
        const newUser = new User({
            fname,
            lname,
            email,
            password: hashedPassword,
            address1,
            address2,
            city,
            state,
            zip,
            status,
            level,
            isAdmin: level === 'Admin',
            created_at: new Date(),
            updated_at: new Date()
        });

        // Save user
        await newUser.save();

        // Return success
        return res.status(201).json({
            message: 'User created successfully',
            user: {
                _id: newUser._id,
                fname: newUser.fname,
                lname: newUser.lname,
                email: newUser.email
            }
        });
    } catch (error) {
        console.error('Error creating user:', error);
        return res.status(500).json({ message: 'Error creating user', error: error.message });
    }
}

/**
 * Update user
 */
async function updateUser(req, res, userId) {
    try {
        const userData = req.body;

        // Find user
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // If email is being changed, check if the new email already exists
        if (userData.email && userData.email !== user.email) {
            const existingUser = await User.findOne({ email: userData.email });

            if (existingUser && existingUser._id.toString() !== userId) {
                return res.status(409).json({ message: 'Email already registered by another user' });
            }
        }

        // If password is provided, hash it
        if (userData.password) {
            userData.password = await bcrypt.hash(userData.password, 10);
        }

        // Set isAdmin based on level
        if (userData.level) {
            userData.isAdmin = userData.level === 'Admin';
        }

        // Set updated timestamp
        userData.updated_at = new Date();

        // Update user
        const result = await User.findByIdAndUpdate(userId, userData, { new: true }).select('-password');

        return res.status(200).json({
            message: 'User updated successfully',
            user: result
        });
    } catch (error) {
        console.error('Error updating user:', error);
        return res.status(500).json({ message: 'Error updating user', error: error.message });
    }
}

/**
 * Delete user
 */
async function deleteUser(req, res, userId) {
    try {
        // Find user
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Prevent deleting self
        if (userId === req.userId) {
            return res.status(403).json({ message: 'You cannot delete your own account' });
        }

        // Delete user
        await User.findByIdAndDelete(userId);

        return res.status(200).json({
            message: 'User deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting user:', error);
        return res.status(500).json({ message: 'Error deleting user', error: error.message });
    }
}
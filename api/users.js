// api/users.js - Combined user endpoints for both regular users and admin functionality
const connect = require('../config/db');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
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
 * HELPER FUNCTIONS
 */

// Helper to verify admin access
async function verifyAdminAccess(req) {
    // Get session token from request headers
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { success: false, status: 401, message: 'Authorization required' };
    }

    const token = authHeader.split(' ')[1];

    // Verify token and check admin status
    let userId;
    try {
        // Using the same JWT secret
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'patriot-thanks-secret-key');
        userId = decoded.userId;
    } catch (error) {
        console.error("Token verification error:", error);
        return { success: false, status: 401, message: 'Invalid or expired token' };
    }

    // Connect to MongoDB if not already connected
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

    return { success: true, userId };
}

// Helper to establish DB connection
async function connectDB() {
    try {
        await connect;
        console.log("Database connection established");
        return { success: true };
    } catch (dbError) {
        console.error("Database connection error:", dbError);
        return {
            success: false,
            error: dbError,
            message: 'Database connection error'
        };
    }
}

/**
 * Main handler function - Routes all user endpoints
 */
module.exports = async (req, res) => {
    // Handle OPTIONS request for CORS
    if (req.method === 'OPTIONS') {
        res.setHeader('Allow', 'GET, POST, PUT, DELETE, OPTIONS');
        return res.status(200).end();
    }

    console.log("Users API hit:", req.method, req.url);
    console.log("Query params:", req.query);

    // Extract path components
    const url = req.url || '';
    const pathParts = url.split('?')[0].split('/').filter(Boolean);

    // Determine request type
    const isAdmin = pathParts[0] === 'admin';
    const pathBase = isAdmin ? pathParts[1] : pathParts[0];
    const userId = isAdmin ? pathParts[2] : pathParts[1];

    // Extract operation from query params
    const { operation } = req.query;

    try {
        // Admin routes
        if (isAdmin) {
            // Verify admin access first
            const adminCheck = await verifyAdminAccess(req);
            if (!adminCheck.success) {
                return res.status(adminCheck.status).json({ message: adminCheck.message });
            }

            // Handle admin routes
            if (!userId) {
                // Admin users listing and creation
                switch (req.method) {
                    case 'GET':
                        return await handleAdminGetUsers(req, res);
                    case 'POST':
                        return await handleAdminCreateUser(req, res);
                    default:
                        return res.status(405).json({ message: 'Method not allowed' });
                }
            } else {
                // Admin operations on specific user
                switch (req.method) {
                    case 'GET':
                        return await handleAdminGetUser(req, res, userId);
                    case 'PUT':
                        return await handleAdminUpdateUser(req, res, userId);
                    case 'DELETE':
                        return await handleAdminDeleteUser(req, res, userId, adminCheck.userId);
                    default:
                        return res.status(405).json({ message: 'Method not allowed' });
                }
            }
        }

        // Standard user routes
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
        console.error(`Error in users API:`, error);
        return res.status(500).json({ message: 'Server error: ' + error.message });
    }
};

/**
 * REGULAR USER ENDPOINTS
 */

/**
 * Handle GET request for user profile
 */
async function handleProfileGet(req, res) {
    // Only allow GET requests
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const userId = req.query.userId;

    if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
    }

    // Connect to database
    const dbConnection = await connectDB();
    if (!dbConnection.success) {
        return res.status(500).json({
            message: dbConnection.message,
            error: dbConnection.error.message
        });
    }

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

    // Connect to database
    const dbConnection = await connectDB();
    if (!dbConnection.success) {
        return res.status(500).json({
            message: dbConnection.message,
            error: dbConnection.error.message
        });
    }

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

    // Extract user data from request body
    const userData = req.body;

    // Basic validation
    if (!userData._id) {
        return res.status(400).json({ message: 'User ID is required' });
    }

    // Connect to database
    const dbConnection = await connectDB();
    if (!dbConnection.success) {
        return res.status(500).json({
            message: dbConnection.message,
            error: dbConnection.error.message
        });
    }

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

    // Extract password data from request body
    const { userId, currentPassword, newPassword } = req.body;

    // Basic validation
    if (!userId || !currentPassword || !newPassword) {
        return res.status(400).json({
            message: 'User ID, current password, and new password are required'
        });
    }

    // Connect to database
    const dbConnection = await connectDB();
    if (!dbConnection.success) {
        return res.status(500).json({
            message: dbConnection.message,
            error: dbConnection.error.message
        });
    }

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

/**
 * ADMIN USER ENDPOINTS
 */

/**
 * Get users with filtering and pagination (Admin)
 */
async function handleAdminGetUsers(req, res) {
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
 * Create a new user (Admin)
 */
async function handleAdminCreateUser(req, res) {
    try {
        // Validate required fields
        const { fname, lname, email, status, level, password } = req.body;

        if (!fname || !lname || !email || !status || !level) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // Check if email is already in use
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already in use' });
        }

        // Hash password if provided
        let hashedPassword = undefined;
        if (password) {
            hashedPassword = await bcrypt.hash(password, 10);
        } else {
            return res.status(400).json({ message: 'Password is required for new users' });
        }

        // Create user
        const newUser = new User({
            ...req.body,
            password: hashedPassword,
            created_at: new Date(),
            updated_at: new Date()
        });

        await newUser.save();

        // Return user without password
        const userResponse = newUser.toObject();
        delete userResponse.password;

        return res.status(201).json({
            message: 'User created successfully',
            user: userResponse
        });
    } catch (error) {
        console.error('Error creating user:', error);
        return res.status(500).json({ message: 'Error creating user', error: error.message });
    }
}

/**
 * Get a single user by ID (Admin)
 */
async function handleAdminGetUser(req, res, userId) {
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
 * Update an existing user (Admin)
 */
async function handleAdminUpdateUser(req, res, userId) {
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
 * Delete a user (Admin)
 */
async function handleAdminDeleteUser(req, res, userId, adminUserId) {
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
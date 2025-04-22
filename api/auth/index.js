// api/auth/index.js - Consolidated authentication API (login, register, verify-admin)
const connect = require('../../config/db');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { ObjectId } = mongoose.Types;
const jwt = require('jsonwebtoken');
const Users = require("../../models/Users");

// Define schemas
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

const adminCodeSchema = new mongoose.Schema({
    code: String,
    description: String,
    expiration: Date,
    created_at: { type: Date, default: Date.now }
});

// Initialize models
let User, AdminCode;
try {
    User = mongoose.model('User');
} catch (error) {
    User = mongoose.model('User', userSchema, 'users');
}

try {
    AdminCode = mongoose.model('AdminCode');
} catch (error) {
    AdminCode = mongoose.model('AdminCode', adminCodeSchema, 'admin_codes');
}

/**
 * Consolidated authentication API handler
 */
module.exports = async (req, res) => {
    // Handle OPTIONS request
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Route based on operation parameter
    const { operation } = req.query;

    try {
        switch (operation) {
            case 'login':
                return await handleLogin(req, res);
            case 'register':
                return await handleRegister(req, res);
            case 'verify-admin':
                return await handleVerifyAdmin(req, res);
            case 'verify-token':
                return await handleVerifyToken(req, res);
            case 'list-users':
                return await handleListUsers(req, res);
            default:
                // If no operation specified, return API info for GET requests
                if (req.method === 'GET') {
                    return res.status(200).json({
                        message: 'Authentication API is available',
                        operations: ['login', 'register', 'verify-admin', 'verify-token']
                    });
                }
                return res.status(400).json({ message: 'Invalid operation' });
        }
    } catch (error) {
        console.error(`Error in auth API (${operation || 'unknown'}):`, error);
        return res.status(500).json({ message: 'Server error: ' + error.message });
    }
};

function handleVerifyToken(req, res) {
    console.log("Verify token handler called");

    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Authorization required' });
    }

    const token = authHeader.split(' ')[1];

    // For now, just return success for testing
    return res.status(200).json({
        isValid: true,
        userId: "test-user-id",
        isAdmin: true,
        level: "Admin",
        name: "Test Admin User"
    });
}
/**
 * Handle user login
 */
async function handleLogin(req, res) {
    // Handle GET request for testing
    if (req.method === 'GET') {
        return res.status(200).json({ message: 'Login API is available' });
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    console.log("Login API hit:", req.method);

    try {
        // Connect to MongoDB
        await connect();

        // Extract login credentials from request body
        const { email, password } = req.body;

        // Basic validation
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        // Find user by email
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Compare passwords
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Generate JWT token
        const token = jwt.sign(
            {
                userId: user._id,
                isAdmin: user.isAdmin || user.level === 'Admin'
            },
            process.env.JWT_SECRET || 'patriot-thanks-secret-key',
            { expiresIn: process.env.JWT_EXPIRY || '7d' }
        );
        console.log('JWT Token generated successfully');
        console.log('Generated token:', token);

        // Return success response with user info (excluding password)
        const userInfo = user.toObject();
        delete userInfo.password;

        return res.status(200).json({
            message: 'Login successful',
            userId: user._id,
            email: user.email,
            fname: user.fname,
            lname: user.lname,
            address1: user.address1,
            address2: user.address2,
            city: user.city,
            state: user.state,
            zip: user.zip,
            level: user.level,
            status: user.status,
            isAdmin: user.isAdmin || false,
            token: token // Add the token to the response
        });
    } catch (error) {
        console.error('Error generating JWT token:', error);
        return res.status(500).json({ message: 'Server error during login: ' + error.message });
    }
}
/**
 * Handle user registration
 */
async function handleRegister(req, res) {
    // Handle GET request for testing
    if (req.method === 'GET') {
        return res.status(200).json({ message: 'User registration API is available' });
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    console.log("User registration API hit:", req.method);
    console.log("Request body:", req.body);

    try {
        // Connect to MongoDB
        await connect();
        console.log("Connected to MongoDB using Mongoose");

        const userData = req.body;

        // Basic validation
        if (!userData.email || (!userData.password && !userData.psw)) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email: userData.email });
        if (existingUser) {
            return res.status(409).json({ message: 'User with this email already exists' });
        }

        // Add timestamp fields
        userData.created_at = new Date();
        userData.updated_at = new Date();

        // Check if Admin level and set isAdmin flag
        if (userData.level === 'Admin') {
            userData.isAdmin = true;
        }

        // Remove password repeat field before storing
        if (userData.psw_repeat) delete userData.psw_repeat;

        // Rename password field if necessary
        if (userData.psw && !userData.password) {
            userData.password = userData.psw;
            delete userData.psw;
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        userData.password = hashedPassword;

        console.log("Inserting user data...");
        // Insert user data using mongoose
        const newUser = new User(userData);
        const result = await newUser.save();
        console.log("User inserted successfully:", result._id);

        // Return success response
        return res.status(201).json({
            message: 'User registered successfully',
            userId: result._id
        });
    } catch (error) {
        console.error('User creation failed:', error);
        return res.status(500).json({ message: 'Server error during user creation: ' + error.message });
    }
}

/**
 * Handle listing users (admin functionality)
 */
async function handleListUsers(req, res) {
    // First, verify the token and check admin status
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Authorization required' });
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'patriot-thanks-secret-key');

        // Connect to MongoDB
        await connect();

        // Find the admin user
        const adminUser = await User.findById(decoded.userId);

        if (!adminUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (adminUser.level !== 'Admin' && adminUser.isAdmin !== true) {
            return res.status(403).json({ message: 'Admin access required' });
        }

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
            .limit(limit);

        return res.status(200).json({
            users,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error('Error in list-users:', error);

        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Invalid or expired token' });
        }

        return res.status(500).json({ message: 'Server error', error: error.message });
    }
}

/**
 * Handle admin code verification
 */
async function handleVerifyAdmin(req, res) {
    // Handle GET request for testing
    if (req.method === 'GET') {
        return res.status(200).json({ message: 'Admin Verification API is available' });
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    console.log("Admin code verification API hit:", req.method);

    try {
        // Extract verification data from request body
        const { code, userId } = req.body;

        // Basic validation
        if (!code) {
            return res.status(400).json({ message: 'Access code is required' });
        }

        // Connect to MongoDB
        await connect();

        // Find the code in the admin_codes collection
        const adminCode = await AdminCode.findOne({ code: code });

        if (!adminCode) {
            return res.status(401).json({ message: 'Invalid admin access code' });
        }

        // Check if code is expired
        if (adminCode.expiration && new Date() > new Date(adminCode.expiration)) {
            return res.status(401).json({ message: 'Admin access code has expired' });
        }

        // If userId is provided, update the user's status to Admin
        if (userId) {
            await User.updateOne(
                { _id: new ObjectId(userId) },
                { $set: { status: 'AD', isAdmin: true, updated_at: new Date() } }
            );
        }

        // Return success response
        return res.status(200).json({
            message: 'Admin access verified successfully',
            description: adminCode.description,
            access: true
        });
    } catch (error) {
        console.error('Admin verification error:', error);
        return res.status(500).json({ message: 'Server error during admin verification: ' + error.message });
    }
}
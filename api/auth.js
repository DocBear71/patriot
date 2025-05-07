/// auth.js - Modified for case-insensitive email handling
const connect = require('../config/db');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { ObjectId } = mongoose.Types;
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Business = require('../models/Business');
const Incentive = require('../models/Incentive');
const AdminCode = require('../models/AdminCode');
const nodemailer = require('nodemailer');
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
            case 'update-user':
                return await handleUpdateUser(req, res);
            case 'delete-user':
                return await handleDeleteUser(req, res);
            case 'dashboard-stats':
                return await handleDashboardStats(req, res);
            case 'forgot-password':
                return await handleForgotPassword(req, res);
            case 'reset-password':
                return await handleResetPassword(req, res);
            default:
                // If no operation specified, return API info for GET requests
                if (req.method === 'GET') {
                    return res.status(200).json({
                        message: 'Authentication API is available',
                        operations: ['login', 'register', 'verify-admin', 'verify-token', 'list-users',
                            'update-user', 'delete-user', 'dashboard-stats', 'forgot-password', 'reset-password'],
                    });
                }
                return res.status(400).json({ message: 'Invalid operation' });
        }
    } catch (error) {
        console.error(`Error in auth API (${operation || 'unknown'}):`, error);
        return res.status(500).json({ message: 'Server error: ' + error.message });
    }
};

/**
 * Handle user deletion (admin functionality)
 */
async function handleDeleteUser(req, res) {
    // Verify the token and check admin status
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Authorization required' });
    }

    const token = authHeader.split(' ')[1];

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'patriot-thanks-secret-key');

        // Connect to MongoDB
        try {
            await connect;
            console.log("Database connection established");
        } catch (dbError) {
            console.error("Database connection error:", dbError);
            return res.status(500).json({ message: 'Database connection error', error: dbError.message });
        }

        // Find the admin user
        const adminUser = await User.findById(decoded.userId);

        if (!adminUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (adminUser.level !== 'Admin' && adminUser.isAdmin !== true) {
            return res.status(403).json({ message: 'Admin access required' });
        }

        // Get user ID from request body
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ message: 'User ID is required' });
        }

        // Delete the user
        const result = await User.findByIdAndDelete(userId);

        if (!result) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Return success response
        return res.status(200).json({
            message: 'User deleted successfully',
            userId: userId
        });
    } catch (error) {
        console.error('Error deleting user:', error);

        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Invalid or expired token' });
        }

        return res.status(500).json({ message: 'Server error', error: error.message });
    }
}

/**
 * Handle dashboard statistics (admin functionality)
 */
async function handleDashboardStats(req, res) {
    console.log("Dashboard stats handler called");

    // Make sure all collections are properly defined
    console.log("Available collections check:");

    // Verify the token and check admin status
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Authorization required' });
    }

    const token = authHeader.split(' ')[1];

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'patriot-thanks-secret-key');

        // Connect to MongoDB
        try {
            await connect;
            console.log("Database connection established");
        } catch (dbError) {
            console.error("Database connection error:", dbError);
            return res.status(500).json({ message: 'Database connection error', error: dbError.message });
        }

        // Find the admin user
        const adminUser = await User.findById(decoded.userId);

        if (!adminUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (adminUser.level !== 'Admin' && adminUser.isAdmin !== true) {
            return res.status(403).json({ message: 'Admin access required' });
        }

        // Get user counts
        const totalUsers = await User.countDocuments();

        // Count users created this month
        const thisMonth = new Date();
        thisMonth.setDate(1); // Set to first day of current month
        thisMonth.setHours(0, 0, 0, 0); // Set to beginning of the day

        const newUsersThisMonth = await User.countDocuments({
            created_at: { $gte: thisMonth }
        });

        // Calculate users from previous month for percentage change
        const pastMonthDate = new Date();
        pastMonthDate.setMonth(pastMonthDate.getMonth() - 1);

        const usersPastMonth = await User.countDocuments({
            created_at: { $lt: pastMonthDate }
        });

        const userChange = usersPastMonth > 0
            ? Math.round(((totalUsers - usersPastMonth) / usersPastMonth) * 100)
            : 100;
        // Get business counts - with error handling
        let totalBusiness = 0;
        let businessesPastMonth = 0;
        let newBusinessesThisMonth = 0;
        let businessChange = 0;


        try {
            totalBusiness = await Business.countDocuments();
            businessesPastMonth = await Business.countDocuments({
                created_at: { $lt: pastMonthDate }
            });
            newBusinessesThisMonth = totalBusiness - businessesPastMonth;
            businessChange = businessesPastMonth > 0
                ? Math.round(((totalBusiness - businessesPastMonth) / businessesPastMonth) * 100)
                : 100;
            console.log('Business counts retrieved successfully');
        } catch (error) {
            console.error('Error getting business counts:', error);
        }

        // Get incentive counts - with error handling
        let totalIncentives = 0;
        let incentivesPastMonth = 0;
        let newIncentivesThisMonth = 0;
        let incentiveChange = 0;

        try {
            // Check if Incentive model is available
            if (Incentive && typeof Incentive.countDocuments === 'function') {
                totalIncentives = await Incentive.countDocuments();

                newIncentivesThisMonth = await Incentive.countDocuments({
                    created_at: { $gte: thisMonth }
                });

                // Calculate incentives from previous month for percentage change
                incentivesPastMonth = await Incentive.countDocuments({
                    created_at: { $lt: pastMonthDate }
                });

                // Calculate percentage change
                const incentiveChange = incentivesPastMonth > 0
                    ? Math.round(((totalIncentives - incentivesPastMonth) / incentivesPastMonth) * 100)
                    : 100;

                console.log('Incentive counts retrieved successfully');
            } else {
                console.error('Incentive model not available or countDocuments not a function');
            }
        } catch (error) {
            console.error('Error getting incentive counts:', error);
        }

        // Return dashboard statistics
        return res.status(200).json({
            userCount: totalUsers,
            userChange: userChange,
            newUsersThisMonth: newUsersThisMonth,
            businessCount: totalBusiness,
            businessChange: businessChange,
            newBusinessesThisMonth: newBusinessesThisMonth,
            incentiveCount: totalIncentives,
            incentiveChange: incentiveChange,
            newIncentivesThisMonth: newIncentivesThisMonth, // Add this line
            timestamp: new Date()
        });
    } catch (error) {
        console.error('Error generating dashboard stats:', error);

        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Invalid or expired token' });
        }

        return res.status(500).json({ message: 'Server error', error: error.message });
    }
}

function handleVerifyToken(req, res) {
    console.log("Verify token handler called");
    res.setHeader('Access-Control-Allow-Origin', 'https://www.patriotthanks.com');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS, PATCH, DELETE, POST, PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Authorization required' });
    }

    const token = authHeader.split(' ')[1];

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'patriot-thanks-secret-key');

        // Connect to MongoDB
        connect.then(async () => {
            console.log("Database connection established");

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
        }).catch(error => {
            console.error("Database connection error:", error);
            return res.status(500).json({ message: 'Database connection error', error: error.message });
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
        // Connect to MongoDB - fix the connection call
        try {
            await connect;  // Since connect is already a Promise, just await it
            console.log("Database connection established");
        } catch (dbError) {
            console.error("Database connection error:", dbError);
            return res.status(500).json({ message: 'Database connection error', error: dbError.message });
        }

        // Extract login credentials from request body
        const { email, password } = req.body;

        // Basic validation
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        // Convert email to lowercase for case-insensitive comparison
        const normalizedEmail = email.toLowerCase();
        console.log("Normalized email for login:", normalizedEmail);

        // Find user by email - use case-insensitive search
        const user = await User.findOne({ email: { $regex: new RegExp(`^${normalizedEmail}$`, 'i') } });

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
        // Connect to MongoDB - fix the connection call
        try {
            await connect;  // Since connect is already a Promise, just await it
            console.log("Database connection established");
        } catch (dbError) {
            console.error("Database connection error:", dbError);
            return res.status(500).json({ message: 'Database connection error', error: dbError.message });
        }

        const userData = req.body;

        // Basic validation
        if (!userData.email || (!userData.password && !userData.psw)) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        // Normalize email to lowercase for case-insensitive matching
        userData.email = userData.email.toLowerCase();
        console.log("Normalized email for registration:", userData.email);

        // Check if user already exists - use case-insensitive search
        const existingUser = await User.findOne({ email: { $regex: new RegExp(`^${userData.email}$`, 'i') } });
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
 * Handle user updates (admin functionality)
 */
async function handleUpdateUser(req, res) {
    // Verify the token and check admin status
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Authorization required' });
    }

    const token = authHeader.split(' ')[1];

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'patriot-thanks-secret-key');

        // Connect to MongoDB
        try {
            await connect;
            console.log("Database connection established");
        } catch (dbError) {
            console.error("Database connection error:", dbError);
            return res.status(500).json({ message: 'Database connection error', error: dbError.message });
        }

        // Find the admin user
        const adminUser = await User.findById(decoded.userId);

        if (!adminUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (adminUser.level !== 'Admin' && adminUser.isAdmin !== true) {
            return res.status(403).json({ message: 'Admin access required' });
        }

        // Get user data from request body
        const userData = req.body;
        const userId = userData.userId;

        if (!userId) {
            return res.status(400).json({ message: 'User ID is required' });
        }

        // Remove userId from update data
        delete userData.userId;

        // Add timestamp
        userData.updated_at = new Date();

        // Hash password if provided
        if (userData.password) {
            userData.password = await bcrypt.hash(userData.password, 10);
        } else {
            // Don't update password if not provided
            delete userData.password;
        }

        // Update the user
        const result = await User.findByIdAndUpdate(
            userId,
            { $set: userData },
            { new: true }
        );

        if (!result) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Return success response
        return res.status(200).json({
            message: 'User updated successfully',
            userId: result._id
        });
    } catch (error) {
        console.error('Error updating user:', error);

        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Invalid or expired token' });
        }

        return res.status(500).json({ message: 'Server error', error: error.message });
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
        try {
            await connect;  // Since connect is already a Promise, just await it
            console.log("Database connection established");
        } catch (dbError) {
            console.error("Database connection error:", dbError);
            return res.status(500).json({ message: 'Database connection error', error: dbError.message });
        }

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

        // Connect to MongoDB - fix the connection call
        try {
            await connect;  // Since connect is already a Promise, just await it
            console.log("Database connection established");
        } catch (dbError) {
            console.error("Database connection error:", dbError);
            return res.status(500).json({ message: 'Database connection error', error: dbError.message });
        }

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

// Create a transporter for email sending with Bluehost SMTP settings
const transporter = nodemailer.createTransport({
    host: 'mail.patriotthanks.com',
    port: 465,  // Outgoing SMTP port as specified by Bluehost
    secure: true, // true for port 465 (SSL/TLS)
    auth: {
        user: process.env.EMAIL_USER || 'forgotpassword@patriotthanks.com', // Full email address
        pass: process.env.EMAIL_PASS || '1369Bkcsdp55chtdp81??'
    },
    tls: {
        // Do not fail on invalid certs
        rejectUnauthorized: false
    }
});

// Verify the connection configuration
transporter.verify(function(error, success) {
    if (error) {
        console.error('SMTP connection error:', error);
    } else {
        console.log('SMTP server is ready to send emails');
    }
});

/**
 * Handle forgot password request
 * Generates a reset token and (in production) would send an email
 */
async function handleForgotPassword(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    console.log("Forgot password API hit:", req.method);

    try {
        // Connect to MongoDB
        try {
            await connect;
            console.log("Database connection established");
        } catch (dbError) {
            console.error("Database connection error:", dbError);
            return res.status(500).json({ message: 'Database connection error', error: dbError.message });
        }

        // Extract email from request body
        const { email } = req.body;

        // Basic validation
        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        // Normalize email to lowercase for case-insensitive comparison
        const normalizedEmail = email.toLowerCase();
        console.log("Normalized email for password reset:", normalizedEmail);

        // Find user by email - use case-insensitive search
        const user = await User.findOne({ email: { $regex: new RegExp(`^${normalizedEmail}$`, 'i') } });

        // Don't reveal if user exists for security
        if (!user) {
            console.log(`No user found with email: ${normalizedEmail}`);
            return res.status(200).json({
                message: 'If this email is registered, a reset link has been sent.'
            });
        }

        // Generate a secure reset token
        const resetToken = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET || 'patriot-thanks-secret-key',
            { expiresIn: '1h' } // Token expires in 1 hour
        );

        // Store the reset token and expiration in the user document
        user.resetToken = resetToken;
        user.resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour from now
        await user.save();

        // Email sending logic remains the same...
        // Rest of the function remains unchanged

        // Get base URL for reset link
        const baseURL = process.env.BASE_URL || 'https://patriotthanks.vercel.app';
        const resetLink = `${baseURL}/reset-password.html?token=${resetToken}`;

        try {
            // Set up email data
            const mailOptions = {
                from: {
                    name: 'Patriot Thanks Support',
                    address: process.env.EMAIL_USER || 'forgotpassword@patriotthanks.com'
                },
                to: email,
                subject: 'Patriot Thanks - Password Reset Request',
                // Email template remains the same...
                html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
                <img src="${baseURL}/images/docbearlogov4.png" alt="Patriot Thanks Logo" style="max-width: 100px;">
                <h1 style="color: #333;">Password Reset Request</h1>
            </div>
            <div style="padding: 20px;">
                <p>Hello,</p>
                <p>We received a request to reset your password for your Patriot Thanks account. To reset your password, please click the button below:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${resetLink}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Reset Password</a>
                </div>
                <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
                <p style="word-break: break-all;">${resetLink}</p>
                <p>This link will expire in 1 hour for security reasons.</p>
                <p>If you did not request a password reset, please ignore this email or contact support if you have any concerns.</p>
                <p>Please do not respond to this email, as this mailbox is not monitored.</p>
                <p>Thank you,<br>The Patriot Thanks Team</p>
            </div>
            <div style="background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #666;">
                <p>&copy; ${new Date().getFullYear()} Patriot Thanks. All rights reserved.</p>
            </div>
        </div>
        `,
                text: `
        Password Reset Request

        Hello,

        We received a request to reset your password for your Patriot Thanks account. To reset your password, please visit the link below:

        ${resetLink}

        This link will expire in 1 hour for security reasons.

        If you did not request a password reset, please ignore this email or contact support if you have any concerns.
        
        Please do not respond to this email, as this mailbox is not monitored.

        Thank you,
        The Patriot Thanks Team
        `
            };

            // Send the email
            const info = await transporter.sendMail(mailOptions);
            console.log("Password reset email sent:", info.messageId);

            // In development, log the test URL (if using Ethereal)
            if (info.messageUrl) {
                console.log("Preview URL: %s", info.messageUrl);
            }

            // Return success response (same message regardless of whether user was found)
            return res.status(200).json({
                message: 'If this email is registered, a reset link has been sent.'
            });
        } catch (emailError) {
            // Log the error but don't expose it to the user for security
            console.error('Error sending password reset email:', emailError);

            // For development, include the reset link in the response
            const isDev = process.env.NODE_ENV === 'development' ||
                !process.env.NODE_ENV ||
                process.env.VERCEL_ENV === 'development' ||
                process.env.VERCEL_ENV === 'preview';

            return res.status(200).json({
                message: 'If this email is registered, a reset link has been sent.',
                ...(isDev && { resetLink, emailError: emailError.message }) // Only in development
            });
        }
    } catch (error) {
        console.error('Error in forgot password:', error);
        return res.status(500).json({ message: 'Server error: ' + error.message });
    }
}

/**
 * Handle password reset
 * Verifies the reset token and updates the password
 */
async function handleResetPassword(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    console.log("Reset password API hit:", req.method);

    try {
        // Connect to MongoDB
        try {
            await connect;
            console.log("Database connection established");
        } catch (dbError) {
            console.error("Database connection error:", dbError);
            return res.status(500).json({ message: 'Database connection error', error: dbError.message });
        }

        // Extract token and new password from request body
        const { token, password } = req.body;

        // Basic validation
        if (!token || !password) {
            return res.status(400).json({ message: 'Token and new password are required' });
        }

        // Find user with this reset token and check if it's still valid
        const user = await User.findOne({
            resetToken: token,
            resetTokenExpires: { $gt: new Date() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired reset token' });
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Update the user's password and clear the reset token
        user.password = hashedPassword;
        user.resetToken = undefined;
        user.resetTokenExpires = undefined;
        user.updated_at = new Date();
        await user.save();

        return res.status(200).json({
            message: 'Password has been reset successfully'
        });
    } catch (error) {
        console.error('Error in reset password:', error);
        return res.status(500).json({ message: 'Server error: ' + error.message });
    }
}


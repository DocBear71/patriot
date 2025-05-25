// api/auth.js - Consolidated authentication API with all features
const connect = require('../config/db');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const {ObjectId} = mongoose.Types;
const User = require('../models/User');
const AdminCode = require('../models/AdminCode');
const Business = require('../models/Business');
const Incentive = require('../models/Incentive');

// Create email transporter for password reset
const transporter = nodemailer.createTransport({
    host: 'mail.patriotthanks.com',
    port: 465,  // Outgoing SMTP port
    secure: true, // true for port 465 (SSL/TLS)
    auth: {
        user: process.env.EMAIL_USER || 'forgotpassword@patriotthanks.com',
        pass: process.env.EMAIL_PASS || '1369Bkcsdp55chtdp81??'
    },
    tls: {
        // Do not fail on invalid certs
        rejectUnauthorized: false
    }
});

// Verify email configuration
transporter.verify(function (error, success) {
    if (error) {
        console.error('SMTP connection error:', error);
    } else {
        console.log('SMTP server is ready to send emails');
    }
});

/**
 * HELPER FUNCTIONS
 */

// Helper to establish DB connection
async function connectDB() {
    try {
        await connect;
        console.log("Database connection established");
        return {success: true};
    } catch (dbError) {
        console.error("Database connection error:", dbError);
        return {
            success: false,
            error: dbError,
            message: 'Database connection error'
        };
    }
}

// Helper to verify admin access
async function verifyAdminAccess(req) {
    // Get session token from request headers
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return {success: false, status: 401, message: 'Authorization required'};
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
        return {success: false, status: 401, message: 'Invalid or expired token'};
    }

    // Connect to MongoDB if not already connected
    const dbConnection = await connectDB();
    if (!dbConnection.success) {
        return {
            success: false,
            status: 500,
            message: 'Database connection error',
            error: dbConnection.error.message
        };
    }

    // Check if user exists and is admin
    const user = await User.findById(userId);

    if (!user) {
        return {success: false, status: 404, message: 'User not found'};
    }

    if (user.level !== 'Admin' && user.isAdmin !== true) {
        return {success: false, status: 403, message: 'Admin access required'};
    }

    return {success: true, userId, user};
}

/**
 * Main API handler - routes all authentication requests
 */
module.exports = async (req, res) => {
    // Handle OPTIONS request for CORS
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Route based on operation parameter
    const {operation} = req.query;
    console.log(`Auth API called with operation: ${operation || 'none'}, method: ${req.method}`);

    try {
        // Route to appropriate handler based on operation
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
            case 'update-terms-acceptance':
                return await handleUpdateTermsAcceptance(req, res);
            default:
                // Legacy path handling for direct URL access
                const path = req.url.split('?')[0];
                if (path.endsWith('/login')) {
                    return await handleLogin(req, res);
                } else if (path.endsWith('/register')) {
                    return await handleRegister(req, res);
                } else if (path.endsWith('/verify-admin-code')) {
                    return await handleVerifyAdmin(req, res);
                }

                // Default information response for GET requests
                if (req.method === 'GET') {
                    return res.status(200).json({
                        message: 'Authentication API is available',
                        operations: [
                            'login',
                            'register',
                            'verify-admin',
                            'verify-token',
                            'list-users',
                            'update-user',
                            'delete-user',
                            'dashboard-stats',
                            'forgot-password',
                            'reset-password',
                            'update_terms_acceptance'
                        ]
                    });
                }
                return res.status(400).json({message: 'Invalid operation'});
        }
    } catch (error) {
        console.error(`Error in auth API (${operation || 'unknown'}):`, error);
        return res.status(500).json({message: 'Server error: ' + error.message});
    }
};

/**
 * Handle user login
 */
async function handleLogin(req, res) {
    // Handle GET request for testing
    if (req.method === 'GET') {
        return res.status(200).json({message: 'Login API is available'});
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({message: 'Method not allowed'});
    }

    console.log("Login API hit:", req.method);

    try {
        // Connect to database
        const dbConnection = await connectDB();
        if (!dbConnection.success) {
            return res.status(500).json({
                message: dbConnection.message,
                error: dbConnection.error.message
            });
        }

        // Extract login credentials from request body
        const {email, password} = req.body;

        // Basic validation
        if (!email || !password) {
            return res.status(400).json({message: 'Email and password are required'});
        }

        // Convert email to lowercase for case-insensitive comparison
        const normalizedEmail = email.toLowerCase();
        console.log("Normalized email for login:", normalizedEmail);

        // Find user by email - use case-insensitive search
        const user = await User.findOne({email: {$regex: new RegExp(`^${normalizedEmail}$`, 'i')}});

        if (!user) {
            return res.status(401).json({message: 'Invalid email or password'});
        }

        // Compare passwords
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({message: 'Invalid email or password'});
        }

        // Generate JWT token
        const token = jwt.sign(
            {
                userId: user._id,
                isAdmin: user.isAdmin || user.level === 'Admin'
            },
            process.env.JWT_SECRET || 'patriot-thanks-secret-key',
            {expiresIn: process.env.JWT_EXPIRY || '7d'}
        );
        console.log('JWT Token generated successfully');

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
            token: token
        });
    } catch (error) {
        console.error('Error generating JWT token:', error);
        return res.status(500).json({message: 'Server error during login: ' + error.message});
    }
}

/**
 * Handle user registration
 */
async function handleRegister(req, res) {
    // Handle GET request for testing
    if (req.method === 'GET') {
        return res.status(200).json({message: 'User registration API is available'});
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({message: 'Method not allowed'});
    }

    console.log("User registration API hit:", req.method);
    console.log("Request body:", req.body);

    try {
        // Connect to database
        const dbConnection = await connectDB();
        if (!dbConnection.success) {
            return res.status(500).json({
                message: dbConnection.message,
                error: dbConnection.error.message
            });
        }

        const userData = req.body;

        // Basic validation
        if (!userData.email || (!userData.password && !userData.psw)) {
            return res.status(400).json({message: 'Email and password are required'});
        }

        if (userData.termsAccepted !== true) {
            return res.status(400).json({ message: 'You must accept the Terms of Use to register' });
        }

        // Normalize email to lowercase for case-insensitive matching
        userData.email = userData.email.toLowerCase();
        console.log("Normalized email for registration:", userData.email);

        // Check if user already exists - use case-insensitive search
        const existingUser = await User.findOne({email: {$regex: new RegExp(`^${userData.email}$`, 'i')}});
        if (existingUser) {
            return res.status(409).json({message: 'User with this email already exists'});
        }

        // Add timestamp fields
        userData.created_at = new Date();
        userData.updated_at = new Date();
        userData.termsAccepted = true;
        userData.termsAcceptedDate = new Date();
        userData.termsVersion = userData.termsVersion || "May 14, 2025";

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
        return res.status(500).json({message: 'Server error during user creation: ' + error.message});
    }
}

/**
 * Handle updating terms acceptance
 */
async function handleUpdateTermsAcceptance(req, res) {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Authorization required' });
    }

    try {
        // Extract data from request body
        const { userId, termsAccepted, termsAcceptedDate, termsVersion } = req.body;

        // Basic validation
        if (!userId || termsAccepted === undefined) {
            return res.status(400).json({ message: 'User ID and terms acceptance are required' });
        }

        // Connect to database
        const dbConnection = await connectDB();
        if (!dbConnection.success) {
            return res.status(500).json({
                message: dbConnection.message,
                error: dbConnection.error.message
            });
        }

        // Update the user
        const result = await User.updateOne(
            { _id: new ObjectId(userId) },
            {
                $set: {
                    termsAccepted: termsAccepted,
                    termsAcceptedDate: termsAcceptedDate,
                    termsVersion: termsVersion,
                    updated_at: new Date()
                }
            }
        );

        if (result.modifiedCount === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Return success response
        return res.status(200).json({
            message: 'Terms acceptance updated successfully',
            success: true
        });
    } catch (error) {
        console.error('Error updating terms acceptance:', error);
        return res.status(500).json({ message: 'Server error: ' + error.message });
    }
}

/**
 * Handle token verification
 */
async function handleVerifyToken(req, res) {
    console.log("Verify token handler called");

    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({message: 'Authorization required'});
    }

    const token = authHeader.split(' ')[1];

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'patriot-thanks-secret-key');

        // Connect to database
        const dbConnection = await connectDB();
        if (!dbConnection.success) {
            return res.status(500).json({
                message: dbConnection.message,
                error: dbConnection.error.message
            });
        }

        // Find the user
        const user = await User.findById(decoded.userId);

        if (!user) {
            return res.status(404).json({message: 'User not found'});
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
            return res.status(401).json({message: 'Invalid or expired token'});
        }

        return res.status(500).json({message: 'Server error', error: error.message});
    }
}

/**
 * Handle admin code verification
 */
async function handleVerifyAdmin(req, res) {
    // Handle GET request for testing
    if (req.method === 'GET') {
        return res.status(200).json({message: 'Admin Verification API is available'});
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({message: 'Method not allowed'});
    }

    console.log("Admin code verification API hit:", req.method);

    try {
        // Extract verification data from request body
        const {code, userId} = req.body;

        // Basic validation
        if (!code) {
            return res.status(400).json({message: 'Access code is required'});
        }

        // Connect to database
        const dbConnection = await connectDB();
        if (!dbConnection.success) {
            return res.status(500).json({
                message: dbConnection.message,
                error: dbConnection.error.message
            });
        }

        // Find the code in the admin_codes collection
        const adminCode = await AdminCode.findOne({code: code});

        if (!adminCode) {
            return res.status(401).json({message: 'Invalid admin access code'});
        }

        // Check if code is expired
        if (adminCode.expiration && new Date() > new Date(adminCode.expiration)) {
            return res.status(401).json({message: 'Admin access code has expired'});
        }

        // If userId is provided, update the user's status to Admin
        if (userId) {
            await User.updateOne(
                {_id: new ObjectId(userId)},
                {$set: {status: 'AD', isAdmin: true, updated_at: new Date()}}
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
        return res.status(500).json({message: 'Server error during admin verification: ' + error.message});
    }
}

/**
 * Handle listing users for the admin dashboard
 */
async function handleListUsers(req, res) {
    try {
        console.log("Admin list users API hit");

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

        console.log(`Found ${users.length} users (total: ${total})`);

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
 * Handle user updates (admin functionality)
 */
async function handleUpdateUser(req, res) {
    // Verify admin access
    const adminCheck = await verifyAdminAccess(req);
    if (!adminCheck.success) {
        return res.status(adminCheck.status).json({message: adminCheck.message});
    }

    try {
        // Get user data from request body
        const userData = req.body;
        const userId = userData.userId;

        if (!userId) {
            return res.status(400).json({message: 'User ID is required'});
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
            {$set: userData},
            {new: true}
        );

        if (!result) {
            return res.status(404).json({message: 'User not found'});
        }

        // Return success response
        return res.status(200).json({
            message: 'User updated successfully',
            userId: result._id
        });
    } catch (error) {
        console.error('Error updating user:', error);
        return res.status(500).json({message: 'Server error', error: error.message});
    }
}

/**
 * Handle user deletion (admin functionality)
 */
async function handleDeleteUser(req, res) {
    // Verify admin access
    const adminCheck = await verifyAdminAccess(req);
    if (!adminCheck.success) {
        return res.status(adminCheck.status).json({message: adminCheck.message});
    }

    try {
        // Get user ID from request body
        const {userId} = req.body;

        if (!userId) {
            return res.status(400).json({message: 'User ID is required'});
        }

        // Prevent deleting self
        if (userId === adminCheck.userId) {
            return res.status(403).json({message: 'You cannot delete your own account'});
        }

        // Delete the user
        const result = await User.findByIdAndDelete(userId);

        if (!result) {
            return res.status(404).json({message: 'User not found'});
        }

        // Return success response
        return res.status(200).json({
            message: 'User deleted successfully',
            userId: userId
        });
    } catch (error) {
        console.error('Error deleting user:', error);
        return res.status(500).json({message: 'Server error', error: error.message});
    }
}



/**
 * Handle forgot password request
 */
async function handleForgotPassword(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({message: 'Method not allowed'});
    }

    console.log("Forgot password API hit:", req.method);

    try {
        // Connect to database
        const dbConnection = await connectDB();
        if (!dbConnection.success) {
            return res.status(500).json({
                message: dbConnection.message,
                error: dbConnection.error.message
            });
        }

        // Extract email from request body
        const {email} = req.body;

        // Basic validation
        if (!email) {
            return res.status(400).json({message: 'Email is required'});
        }

        // Normalize email to lowercase for case-insensitive comparison
        const normalizedEmail = email.toLowerCase();
        console.log("Normalized email for password reset:", normalizedEmail);

        // Find user by email - use case-insensitive search
        const user = await User.findOne({email: {$regex: new RegExp(`^${normalizedEmail}$`, 'i')}});

        // Don't reveal if user exists for security
        if (!user) {
            console.log(`No user found with email: ${normalizedEmail}`);
            return res.status(200).json({
                message: 'If this email is registered, a reset link has been sent.'
            });
        }

        // Generate a secure reset token
        const resetToken = jwt.sign(
            {userId: user._id},
            process.env.JWT_SECRET || 'patriot-thanks-secret-key',
            {expiresIn: '1h'} // Token expires in 1 hour
        );

        // Store the reset token and expiration in the user document
        user.resetToken = resetToken;
        user.resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour from now
        await user.save();

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
                ...(isDev && {resetLink, emailError: emailError.message}) // Only in development
            });
        }
    } catch (error) {
        console.error('Error in forgot password:', error);
        return res.status(500).json({message: 'Server error: ' + error.message});
    }
}

/**
 * Handle dashboard statistics for admin dashboard
 */
async function handleDashboardStats(req, res) {
    try {
        // Connect to MongoDB
        await connect;

        // Important: Explicitly import models from their respective files
        // These should be at the top of your file, but in case they're missing:
        try {
            // Try to use existing models first
            if (!User) User = mongoose.model('User');
            if (!Business) Business = mongoose.model('Business');
            if (!Incentive) Incentive = mongoose.model('Incentive');
            if (!AdminCode) AdminCode = mongoose.model('AdminCode');
        } catch (modelError) {
            console.log('Some models need to be imported:', modelError.message);

            // Import models directly from their files
            try {
                if (!User) User = require('../models/User');
                if (!Business) Business = require('../models/Business');
                if (!Incentive) Incentive = require('../models/Incentive');
                if (!AdminCode) AdminCode = require('../models/AdminCode');

                // Log success
                console.log('Models imported successfully');
            } catch (importError) {
                console.error('Error importing model files:', importError);
                // Try to continue with whatever models are available
            }
        }

        // Calculate date ranges for this month and last month
        const now = new Date();
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonthEnd = new Date(thisMonthStart);
        lastMonthEnd.setDate(lastMonthEnd.getDate() - 1);
        const lastMonthStart = new Date(lastMonthEnd.getFullYear(), lastMonthEnd.getMonth(), 1);

        // Initialize stats objects with default values
        let stats = {
            userCount: 0,
            userChange: 0,
            newUsersThisMonth: 0,
            businessCount: 0,
            businessChange: 0,
            newBusinessesThisMonth: 0,
            incentiveCount: 0,
            incentiveChange: 0,
            newIncentivesThisMonth: 0,
            availableIncentiveCount: 0
        };

        // Add debug info about model availability
        console.log('Model availability check:',
            'User:', !!User,
            'Business:', !!Business,
            'Incentive:', !!Incentive
        );

        // Get user stats if User model is available
        if (User) {
            try {
                console.log('Fetching user stats...');
                // Get user count and growth
                stats.userCount = await User.countDocuments();
                console.log(`Found ${stats.userCount} users`);

                // Get count of users created last month
                const lastMonthUsers = await User.countDocuments({
                    created_at: {
                        $gte: lastMonthStart,
                        $lte: lastMonthEnd
                    }
                });
                console.log(`Found ${lastMonthUsers} users from last month`);

                stats.newUsersThisMonth = await User.countDocuments({
                    created_at: {
                        $gte: thisMonthStart
                    }
                });
                console.log(`Found ${stats.newUsersThisMonth} new users this month`);

                // Calculate User change percentage
                if (stats.userCount > 0 && lastMonthUsers > 0) {
                    stats.userChange = Math.round(((stats.userCount - lastMonthUsers) / lastMonthUsers) * 100);
                } else if (stats.newUsersThisMonth > 0 && stats.userCount > 0) {
                    stats.userChange = Math.round((stats.newUsersThisMonth / stats.userCount) * 100);
                }
            } catch (userError) {
                console.error('Error getting user stats:', userError);
                // Continue with default values
            }
        }

        // Get business stats if Business model is available
        if (Business) {
            try {
                console.log('Fetching business stats...');
                // Get business count and growth
                stats.businessCount = await Business.countDocuments();
                console.log(`Found ${stats.businessCount} businesses`);

                // Get count of businesses created last month
                const lastMonthBusinesses = await Business.countDocuments({
                    created_at: {
                        $gte: lastMonthStart,
                        $lte: lastMonthEnd
                    }
                });
                console.log(`Found ${lastMonthBusinesses} businesses from last month`);

                // Get count of businesses created this month
                stats.newBusinessesThisMonth = await Business.countDocuments({
                    created_at: {
                        $gte: thisMonthStart
                    }
                });
                console.log(`Found ${stats.newBusinessesThisMonth} new businesses this month`);

                // Calculate business change percentage
                if (stats.businessCount > 0 && lastMonthBusinesses > 0) {
                    stats.businessChange = Math.round(((stats.businessCount - lastMonthBusinesses) / lastMonthBusinesses) * 100);
                } else if (stats.newBusinessesThisMonth > 0 && stats.businessCount > 0) {
                    // If we can't calculate properly, use new businesses as an estimate
                    stats.businessChange = Math.round((stats.newBusinessesThisMonth / stats.businessCount) * 100);
                }
            } catch (businessError) {
                console.error('Error getting business stats:', businessError);
                // Continue with default values
            }
        }

        // Get incentive stats if Incentive model is available
        if (Incentive) {
            try {
                console.log('Fetching incentive stats...');
                // Get incentive count and growth
                stats.incentiveCount = await Incentive.countDocuments();
                console.log(`Found ${stats.incentiveCount} incentives`);

                // Get count of incentives created last month
                const lastMonthIncentives = await Incentive.countDocuments({
                    created_at: {
                        $gte: lastMonthStart,
                        $lte: lastMonthEnd
                    }
                });
                console.log(`Found ${lastMonthIncentives} incentives from last month`);

                // Get count of incentives created this month
                stats.newIncentivesThisMonth = await Incentive.countDocuments({
                    created_at: {
                        $gte: thisMonthStart
                    }
                });
                console.log(`Found ${stats.newIncentivesThisMonth} new incentives this month`);

                // Calculate incentive change percentage
                if (stats.incentiveCount > 0 && lastMonthIncentives > 0) {
                    stats.incentiveChange = Math.round(((stats.incentiveCount - lastMonthIncentives) / lastMonthIncentives) * 100);
                } else if (stats.newIncentivesThisMonth > 0 && stats.incentiveCount > 0) {
                    // If we can't calculate properly, use new incentives as an estimate
                    stats.incentiveChange = Math.round((stats.newIncentivesThisMonth / stats.incentiveCount) * 100);
                }

                // Get count of available incentives
                stats.availableIncentiveCount = await Incentive.countDocuments({
                    is_available: true
                });
                console.log(`Found ${stats.availableIncentiveCount} available incentives`);
            } catch (incentiveError) {
                console.error('Error getting incentive stats:', incentiveError);
                // Continue with default values
            }
        }

        console.log('Final stats:', stats);

        // Return the stats data
        return res.status(200).json(stats);

    } catch (error) {
        console.error('Error fetching dashboard stats:', error);

        // Try to return some stats if possible
        if (stats && Object.keys(stats).length > 0) {
            console.log('Returning partial stats despite error');
            return res.status(200).json(stats);
        }

        return res.status(500).json({
            message: 'Error retrieving dashboard statistics',
            error: error.message
        });
    }
}

/**
 * Handle password reset
 * Verifies the reset token and updates the password
 */
async function handleResetPassword(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({message: 'Method not allowed'});
    }

    console.log("Reset password API hit:", req.method);

    try {
        // Connect to database
        const dbConnection = await connectDB();
        if (!dbConnection.success) {
            return res.status(500).json({
                message: dbConnection.message,
                error: dbConnection.error.message
            });
        }

        // Extract token and new password from request body
        const {token, password} = req.body;

        // Basic validation
        if (!token || !password) {
            return res.status(400).json({message: 'Token and new password are required'});
        }

        // Find user with this reset token and check if it's still valid
        const user = await User.findOne({
            resetToken: token,
            resetTokenExpires: {$gt: new Date()}
        });

        if (!user) {
            return res.status(400).json({message: 'Invalid or expired reset token'});
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
        return res.status(500).json({message: 'Server error: ' + error.message});
    }
}
// api/user-donations.js - PART 1: Initialization and helpers

const connect = require('../config/db');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { ObjectId } = mongoose.Types;

// Initialize models
let User, Donation;

try {
    // Try to get existing models
    User = mongoose.model('User');
    Donation = mongoose.model('Donation');
} catch (error) {
    // Define schemas if models aren't registered yet

    // User schema
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
        email: { type: String, required: true, unique: true },
        password: { type: String, required: true },
        isAdmin: Boolean,
        created_at: { type: Date, default: Date.now },
        updated_at: { type: Date, default: Date.now },
        termsAccepted: { type: Boolean, default: false },
        termsAcceptedDate: { type: Date },
        termsVersion: { type: String, default: "May 14, 2025" },
        resetToken: String,
        resetTokenExpires: Date
    });

    // Donation schema
    const donationSchema = new mongoose.Schema({
        amount: { type: Number, required: true },
        name: { type: String, required: true },
        email: { type: String, required: true },
        anonymous: { type: Boolean, default: false },
        recurring: { type: Boolean, default: false },
        message: String,
        paymentMethod: { type: String, required: true },
        paymentId: String,
        transactionId: String,
        status: { type: String, default: 'pending' },
        cancelledAt: Date,
        userId: mongoose.Schema.Types.ObjectId, // If the donor is a registered user
        created_at: { type: Date, default: Date.now }
    });

    // Register models
    User = mongoose.model('User', userSchema, 'users');
    Donation = mongoose.model('Donation', donationSchema, 'donations');
}

// Create email transporter for donation confirmations
const transporter = nodemailer.createTransport({
    host: 'mail.patriotthanks.com',
    port: 465,
    secure: true,
    auth: {
        user: process.env.EMAIL_USER || 'donations@patriotthanks.com',
        pass: process.env.EMAIL_PASS || '1369Bkcsdp55chtdp81??'
    },
    tls: {
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
 * Helper to verify admin access
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
        // Using JWT
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
 * Helper to establish DB connection
 */
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
 * Main API handler - route to either user or donation endpoints
 */
module.exports = async (req, res) => {
    // Handle OPTIONS request for CORS
    if (req.method === 'OPTIONS') {
        res.setHeader('Allow', 'GET, POST, PUT, DELETE, OPTIONS');
        return res.status(200).end();
    }

    console.log("User-Donations API hit:", req.method, req.url);

    // Extract path components
    const url = req.url || '';
    const pathParts = url.split('?')[0].split('/').filter(Boolean);

    // Extract operation from query params
    const { operation } = req.query;

    try {
        // Route based on the first path part
        const mainPath = pathParts[0]?.toLowerCase();

        switch (mainPath) {
            case 'user':
                return await handleUserRequests(req, res, operation);
            case 'donations':
                return await handleDonationRequests(req, res, operation);
            default:
                // If no specific path, use operation to determine
                if (operation && operation.startsWith('don')) {
                    // If operation starts with 'don', assume it's donation-related
                    return await handleDonationRequests(req, res, operation);
                } else {
                    // Default to user operations
                    return await handleUserRequests(req, res, operation);
                }
        }
    } catch (error) {
        console.error(`Error in user-donations API:`, error);
        return res.status(500).json({ message: 'Server error: ' + error.message });
    }
};

// api/user-donations.js - PART 2: User management functions

/**
 * Handle user-related requests
 */
async function handleUserRequests(req, res, operation) {
    // Connect to database
    const dbConnection = await connectDB();
    if (!dbConnection.success) {
        return res.status(500).json({
            message: dbConnection.message,
            error: dbConnection.error.message
        });
    }

    // Route based on operation
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
}

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
 * Handle donation-related requests
 */
async function handleDonationRequests(req, res, operation) {
    // Connect to database
    const dbConnection = await connectDB();
    if (!dbConnection.success) {
        return res.status(500).json({
            message: dbConnection.message,
            error: dbConnection.error.message
        });
    }

    // Route based on operation
    switch (operation) {
        case 'create':
            return await handleCreateDonation(req, res);
        case 'confirm':
            return await handleConfirmDonation(req, res);
        case 'list':
            return await handleListDonations(req, res);
        case 'stats':
            return await handleDonationStats(req, res);
        case 'cancel-recurring':
            return await handleCancelRecurring(req, res);
        case 'get':
            return await handleGetDonation(req, res);
        case 'send-receipt':
            return await handleSendReceipt(req, res);
        case 'export':
            return await handleExportDonations(req, res);
        default:
            // Default information response for GET requests
            if (req.method === 'GET') {
                return res.status(200).json({
                    message: 'Donations API is available',
                    operations: [
                        'create',
                        'confirm',
                        'list',
                        'stats',
                        'cancel-recurring',
                        'get',
                        'send-receipt',
                        'export'
                    ]
                });
            }
            return res.status(400).json({ message: 'Invalid operation' });
    }
}

// api/user-donations.js - PART 3: Donation functions

/**
 * Handle creating a new donation
 */
async function handleCreateDonation(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        // Extract donation data from request body
        const donationData = req.body;

        // Basic validation
        if (!donationData.amount || donationData.amount <= 0) {
            return res.status(400).json({ message: 'Valid donation amount is required' });
        }

        if (!donationData.name || !donationData.email) {
            return res.status(400).json({ message: 'Name and email are required' });
        }

        if (!donationData.paymentMethod) {
            return res.status(400).json({ message: 'Payment method is required' });
        }

        // Process payment based on payment method
        let paymentResult;

        if (donationData.paymentMethod === 'paypal') {
            // In a real implementation, you would:
            // 1. Create a PayPal order
            // 2. Return the order ID to the client for approval
            paymentResult = {
                success: true,
                paymentId: 'PAYPAL-' + Date.now(),
                status: 'pending' // PayPal requires user approval
            };
        } else if (donationData.paymentMethod === 'card') {
            // In a real implementation, you would:
            // 1. Use a payment processor like Stripe to process the card
            // 2. Handle the result and update the donation status

            // For now, simulate a successful payment
            paymentResult = {
                success: true,
                paymentId: 'CARD-' + Date.now(),
                transactionId: 'TXN-' + Math.floor(Math.random() * 1000000),
                status: 'completed'
            };
        } else {
            return res.status(400).json({ message: 'Unsupported payment method' });
        }

        // Create donation record
        const donation = new Donation({
            amount: donationData.amount,
            name: donationData.name,
            email: donationData.email,
            anonymous: donationData.anonymous || false,
            recurring: donationData.recurring || false,
            message: donationData.message || '',
            paymentMethod: donationData.paymentMethod,
            paymentId: paymentResult.paymentId,
            transactionId: paymentResult.transactionId || null,
            status: paymentResult.status,
            userId: donationData.userId || null,
            created_at: new Date()
        });

        // Save donation to database
        const savedDonation = await donation.save();

        // For completed donations, send confirmation email
        if (paymentResult.status === 'completed') {
            await sendDonationConfirmationEmail(savedDonation);
        }

        // Return response based on payment method
        if (donationData.paymentMethod === 'paypal') {
            // For PayPal, return info needed for approval
            return res.status(200).json({
                message: 'Donation created, awaiting payment approval',
                donationId: savedDonation._id,
                paymentId: paymentResult.paymentId,
                status: 'pending',
                requiresApproval: true
            });
        } else {
            // For card payments, return success
            return res.status(200).json({
                message: 'Donation processed successfully',
                donationId: savedDonation._id,
                transactionId: paymentResult.transactionId,
                status: 'completed'
            });
        }
    } catch (error) {
        console.error('Error processing donation:', error);
        return res.status(500).json({ message: 'Server error processing donation: ' + error.message });
    }
}

/**
 * Handle confirming a donation (after PayPal approval)
 */
async function handleConfirmDonation(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        // Extract confirmation data from request body
        const { donationId, paymentId, paypalOrderId } = req.body;

        // Basic validation
        if (!donationId || !paymentId) {
            return res.status(400).json({ message: 'Donation ID and payment ID are required' });
        }

        // Find the donation
        const donation = await Donation.findOne({
            _id: new ObjectId(donationId),
            paymentId: paymentId,
            status: 'pending'
        });

        if (!donation) {
            return res.status(404).json({ message: 'Donation not found or already processed' });
        }

        // In a real implementation, you would:
        // 1. Capture the PayPal payment using paypalOrderId
        // 2. Handle success/failure of the capture

        // Update donation status
        donation.status = 'completed';
        donation.transactionId = paypalOrderId || ('PP-' + Math.floor(Math.random() * 1000000));
        await donation.save();

        // Send confirmation email
        await sendDonationConfirmationEmail(donation);

        // Return success response
        return res.status(200).json({
            message: 'Donation confirmed successfully',
            donationId: donation._id,
            status: 'completed'
        });
    } catch (error) {
        console.error('Error confirming donation:', error);
        return res.status(500).json({ message: 'Server error: ' + error.message });
    }
}

/**
 * Handle listing donations (admin feature)
 */
async function handleListDonations(req, res) {
    // Verify admin access
    const adminCheck = await verifyAdminAccess(req);
    if (!adminCheck.success) {
        return res.status(adminCheck.status).json({ message: adminCheck.message });
    }

    try {
        // Parse query parameters
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Build filter object
        const filter = {};

        // Status filter
        if (req.query.status) {
            filter.status = req.query.status;
        }

        // Date range filter
        if (req.query.startDate) {
            if (!filter.created_at) filter.created_at = {};
            filter.created_at.$gte = new Date(req.query.startDate);
        }

        if (req.query.endDate) {
            if (!filter.created_at) filter.created_at = {};
            const endDate = new Date(req.query.endDate);
            endDate.setDate(endDate.getDate() + 1); // Include the end date
            filter.created_at.$lt = endDate;
        }

        // Minimum amount filter
        if (req.query.minAmount) {
            filter.amount = { $gte: parseFloat(req.query.minAmount) };
        }

        // Recurring filter
        if (req.query.recurring === 'true') {
            filter.recurring = true;
        } else if (req.query.recurring === 'false') {
            filter.recurring = false;
        }

        // Search by name or email
        if (req.query.search) {
            const searchRegex = new RegExp(req.query.search, 'i');
            filter.$or = [
                { name: searchRegex },
                { email: searchRegex }
            ];
        }

        // Get total count
        const total = await Donation.countDocuments(filter);

        // Get donations
        const donations = await Donation.find(filter)
            .sort({ created_at: -1 })
            .skip(skip)
            .limit(limit);

        // Return response
        return res.status(200).json({
            donations,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error('Error listing donations:', error);
        return res.status(500).json({ message: 'Server error: ' + error.message });
    }
}

// api/user-donations.js - PART 4: Donation functions continued

/**
 * Handle donation statistics
 */
async function handleDonationStats(req, res) {
    try {
        // Calculate date ranges
        const now = new Date();
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);

        // Get completed donations only
        const filter = { status: 'completed' };

        // Total all-time donations
        const totalDonations = await Donation.countDocuments(filter);

        // Total amount raised
        const totalAmountResult = await Donation.aggregate([
            { $match: filter },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const totalAmount = totalAmountResult.length > 0 ? totalAmountResult[0].total : 0;

        // This month's donations
        const thisMonthDonations = await Donation.countDocuments({
            ...filter,
            created_at: { $gte: thisMonth }
        });

        // This month's amount
        const thisMonthAmountResult = await Donation.aggregate([
            {
                $match: {
                    ...filter,
                    created_at: { $gte: thisMonth }
                }
            },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const thisMonthAmount = thisMonthAmountResult.length > 0 ? thisMonthAmountResult[0].total : 0;

        // Last month's amount
        const lastMonthAmountResult = await Donation.aggregate([
            {
                $match: {
                    ...filter,
                    created_at: { $gte: lastMonth, $lt: thisMonth }
                }
            },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const lastMonthAmount = lastMonthAmountResult.length > 0 ? lastMonthAmountResult[0].total : 0;

        // Calculate growth percentage
        let growthPercentage = 0;
        if (lastMonthAmount > 0) {
            growthPercentage = ((thisMonthAmount - lastMonthAmount) / lastMonthAmount) * 100;
        }

        // Count recurring donations
        const recurringDonations = await Donation.countDocuments({
            ...filter,
            recurring: true
        });

        // Monthly data for chart (last 6 months)
        const monthlyData = [];
        for (let i = 5; i >= 0; i--) {
            const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

            const monthResult = await Donation.aggregate([
                {
                    $match: {
                        ...filter,
                        created_at: { $gte: monthStart, $lte: monthEnd }
                    }
                },
                { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
            ]);

            const monthName = monthStart.toLocaleString('default', { month: 'short' });
            monthlyData.push({
                month: monthName,
                year: monthStart.getFullYear(),
                amount: monthResult.length > 0 ? monthResult[0].total : 0,
                count: monthResult.length > 0 ? monthResult[0].count : 0
            });
        }

        // Return the stats
        return res.status(200).json({
            totalDonations,
            totalAmount,
            thisMonthDonations,
            thisMonthAmount,
            growthPercentage,
            recurringDonations,
            monthlyData
        });
    } catch (error) {
        console.error('Error getting donation stats:', error);
        return res.status(500).json({ message: 'Server error: ' + error.message });
    }
}

/**
 * Handle canceling a recurring donation
 */
async function handleCancelRecurring(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        // Extract data from request body
        const { donationId, email } = req.body;

        // Basic validation
        if (!donationId || !email) {
            return res.status(400).json({ message: 'Donation ID and email are required' });
        }

        // Find the donation
        const donation = await Donation.findOne({
            _id: new ObjectId(donationId),
            email: email,
            recurring: true
        });

        if (!donation) {
            return res.status(404).json({ message: 'Recurring donation not found' });
        }

        // Update donation
        donation.recurring = false;
        donation.cancelledAt = new Date();
        await donation.save();

        // In a real implementation, you would also:
        // 1. Cancel the recurring subscription with the payment processor
        // 2. Send a confirmation email

        // Return success response
        return res.status(200).json({
            message: 'Recurring donation canceled successfully',
            donationId: donation._id
        });
    } catch (error) {
        console.error('Error canceling recurring donation:', error);
        return res.status(500).json({ message: 'Server error: ' + error.message });
    }
}

/**
 * Get a single donation by ID
 */
async function handleGetDonation(req, res) {
    try {
        const { id } = req.query;

        if (!id) {
            return res.status(400).json({ message: 'Donation ID is required' });
        }

        // Find the donation
        const donation = await Donation.findById(new ObjectId(id));

        if (!donation) {
            return res.status(404).json({ message: 'Donation not found' });
        }

        // Return the donation
        return res.status(200).json({ donation });
    } catch (error) {
        console.error('Error getting donation:', error);
        return res.status(500).json({ message: 'Server error: ' + error.message });
    }
}

/**
 * Send a receipt for a donation
 */
async function handleSendReceipt(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        // Extract data from request body
        const { donationId } = req.body;

        // Basic validation
        if (!donationId) {
            return res.status(400).json({ message: 'Donation ID is required' });
        }

        // Find the donation
        const donation = await Donation.findById(new ObjectId(donationId));

        if (!donation) {
            return res.status(404).json({ message: 'Donation not found' });
        }

        // Send the receipt
        const result = await sendDonationConfirmationEmail(donation);

        if (result) {
            return res.status(200).json({
                message: 'Receipt sent successfully',
                success: true
            });
        } else {
            return res.status(500).json({
                message: 'Failed to send receipt',
                success: false
            });
        }
    } catch (error) {
        console.error('Error sending receipt:', error);
        return res.status(500).json({ message: 'Server error: ' + error.message });
    }
}

/**
 * Export donations to CSV
 */
async function handleExportDonations(req, res) {
    try {
        // Verify admin access
        const adminCheck = await verifyAdminAccess(req);
        if (!adminCheck.success) {
            return res.status(adminCheck.status).json({ message: adminCheck.message });
        }

        // Build filter object (similar to handleListDonations)
        const filter = {};

        // Status filter
        if (req.query.status) {
            filter.status = req.query.status;
        }

        // Date range filter
        if (req.query.startDate) {
            if (!filter.created_at) filter.created_at = {};
            filter.created_at.$gte = new Date(req.query.startDate);
        }

        if (req.query.endDate) {
            if (!filter.created_at) filter.created_at = {};
            const endDate = new Date(req.query.endDate);
            endDate.setDate(endDate.getDate() + 1); // Include the end date
            filter.created_at.$lt = endDate;
        }

        // Search by name or email
        if (req.query.search) {
            const searchRegex = new RegExp(req.query.search, 'i');
            filter.$or = [
                { name: searchRegex },
                { email: searchRegex }
            ];
        }

        // Get donations
        const donations = await Donation.find(filter).sort({ created_at: -1 });

        // Convert to CSV
        const csvHeader = 'Date,Name,Email,Amount,Payment Method,Status,Recurring,Transaction ID\n';
        const csvRows = donations.map(donation => {
            const date = new Date(donation.created_at).toISOString().split('T')[0];
            const name = donation.anonymous ? 'Anonymous' : donation.name.replace(/,/g, ' ');
            const email = donation.email;
            const amount = donation.amount.toFixed(2);
            const paymentMethod = donation.paymentMethod;
            const status = donation.status;
            const recurring = donation.recurring ? 'Yes' : 'No';
            const transactionId = donation.transactionId || 'N/A';

            return `${date},"${name}","${email}",${amount},${paymentMethod},${status},${recurring},${transactionId}`;
        }).join('\n');

        const csv = csvHeader + csvRows;

        // Set headers for CSV download
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=donations-export-${new Date().toISOString().slice(0, 10)}.csv`);

        // Send the CSV
        return res.status(200).send(csv);
    } catch (error) {
        console.error('Error exporting donations:', error);
        return res.status(500).json({ message: 'Server error: ' + error.message });
    }
}

// api/user-donations.js - PART 5: Email function

/**
 * Send confirmation email for donation
 */
async function sendDonationConfirmationEmail(donation) {
    try {
        // Get base URL for links
        const baseURL = process.env.BASE_URL || 'https://patriotthanks.vercel.app';

        // Set up email data
        const mailOptions = {
            from: {
                name: 'Patriot Thanks',
                address: process.env.EMAIL_USER || 'donations@patriotthanks.com'
            },
            to: donation.email,
            subject: 'Thank You for Your Donation to Patriot Thanks',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
                        <img src="${baseURL}/images/docbearlogov4.png" alt="Patriot Thanks Logo" style="max-width: 100px;">
                        <h1 style="color: #333;">Thank You for Your Support!</h1>
                    </div>
                    <div style="padding: 20px;">
                        <p>Dear ${donation.anonymous ? 'Supporter' : donation.name},</p>
                        <p>Thank you for your generous donation of <strong>$${donation.amount.toFixed(2)}</strong> to Patriot Thanks. Your support helps us continue connecting veterans, active duty military, first responders, and their spouses with businesses that appreciate their service.</p>
                        
                        <div style="background-color: #f9f9f9; border: 1px solid #ddd; padding: 15px; margin: 20px 0; border-radius: 5px;">
                            <h3 style="margin-top: 0;">Donation Details:</h3>
                            <p><strong>Amount:</strong> $${donation.amount.toFixed(2)}</p>
                            <p><strong>Date:</strong> ${new Date(donation.created_at).toLocaleDateString()}</p>
                            <p><strong>Transaction ID:</strong> ${donation.transactionId || 'Processing'}</p>
                            ${donation.recurring ? '<p><strong>Recurring:</strong> Monthly donation</p>' : ''}
                        </div>
                        
                        ${donation.recurring ? `
                        <p><strong>About your recurring donation:</strong> Your card will be charged automatically each month. If you need to cancel or modify your recurring donation, please contact us or visit <a href="${baseURL}/account.html">your account</a>.</p>
                        ` : ''}
                        
                        <p>Your contribution is making a real difference in helping us maintain and improve our platform. We're committed to providing the best service possible to our community.</p>
                        
                        ${donation.message ? `
                        <div style="background-color: #f9f9f9; border: 1px solid #ddd; padding: 15px; margin: 20px 0; border-radius: 5px;">
                            <h3 style="margin-top: 0;">Your Message:</h3>
                            <p style="font-style: italic;">"${donation.message}"</p>
                        </div>
                        ` : ''}
                        
                        <p>If you have any questions about your donation, please don't hesitate to <a href="${baseURL}/contact.html">contact us</a>.</p>
                        
                        <p>With gratitude,<br>The Patriot Thanks Team</p>
                    </div>
                    <div style="background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #666;">
                        <p>This is a transaction receipt for your donation to Patriot Thanks. Donations are not tax-deductible as charitable contributions.</p>
                        <p>&copy; ${new Date().getFullYear()} Patriot Thanks. All rights reserved.</p>
                    </div>
                </div>
            `,
            text: `
                Thank You for Your Support!
                
                Dear ${donation.anonymous ? 'Supporter' : donation.name},
                
                Thank you for your generous donation of $${donation.amount.toFixed(2)} to Patriot Thanks. Your support helps us continue connecting veterans, active duty military, first responders, and their spouses with businesses that appreciate their service.
                
                Donation Details:
                Amount: $${donation.amount.toFixed(2)}
                Date: ${new Date(donation.created_at).toLocaleDateString()}
                Transaction ID: ${donation.transactionId || 'Processing'}
                ${donation.recurring ? 'Recurring: Monthly donation' : ''}
                
                ${donation.recurring ? `About your recurring donation: Your card will be charged automatically each month. If you need to cancel or modify your recurring donation, please contact us or visit your account page.` : ''}
                
                Your contribution is making a real difference in helping us maintain and improve our platform. We're committed to providing the best service possible to our community.
                
                ${donation.message ? `Your Message: "${donation.message}"` : ''}
                
                If you have any questions about your donation, please don't hesitate to contact us.
                
                With gratitude,
                The Patriot Thanks Team
                
                This is a transaction receipt for your donation to Patriot Thanks. Donations are not tax-deductible as charitable contributions.
            `
        };

        // Send the email
        const info = await transporter.sendMail(mailOptions);
        console.log('Donation confirmation email sent:', info.messageId);

        return true;
    } catch (error) {
        console.error('Error sending donation confirmation email:', error);
        // Don't throw error, just log it
        return false;
    }
}
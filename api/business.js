// api/business.js - Enhanced with admin operations
const connect = require('../config/db');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
let Business = require('../models/index');
let User = require('../models/Users');

// Define business schema once
const businessSchema = new mongoose.Schema({
    bname: String,
    address1: String,
    address2: String,
    city: String,
    state: String,
    zip: String,
    phone: String,
    type: String,
    status: { type: String, default: 'active' },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
});

// Initialize model once
try {
    Business = mongoose.model('Business');
} catch (error) {
    Business = mongoose.model('Business', businessSchema, 'business');
}

/**
 * Consolidated business API handler
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
            // Public operations
            case 'search':
                return await handleBusinessSearch(req, res);
            case 'register':
                return await handleBusinessRegister(req, res);

            // Admin operations
            case 'admin-list-businesses':
                return await handleAdminListBusinesses(req, res);
            case 'admin-get-business':
                return await handleAdminGetBusiness(req, res);
            case 'admin-create-business':
                return await handleAdminCreateBusiness(req, res);
            case 'admin-update-business':
                return await handleAdminUpdateBusiness(req, res);
            case 'admin-delete-business':
                return await handleAdminDeleteBusiness(req, res);

            default:
                if (req.method === 'GET') {
                    return res.status(200).json({
                        message: 'Business API is available',
                        operations: [
                            // Public operations
                            'register', 'search',
                            // Admin operations
                            'admin-list-businesses', 'admin-get-business',
                            'admin-create-business', 'admin-update-business',
                            'admin-delete-business'
                        ]
                    });
                }
                return res.status(400).json({ message: 'Invalid operation' });
        }
    } catch (error) {
        console.error(`Error in business API (${operation || 'unknown'}):`, error);
        return res.status(500).json({ message: 'Server error: ' + error.message });
    }
};

/**
 * Verify admin token
 */
async function verifyAdminToken(req) {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { authorized: false, message: 'Authorization required' };
    }

    const token = authHeader.split(' ')[1];
    console.log("Verifying admin token in business.js:", token.substring(0, 20) + "...");

    try {
        // Use the same secret as in auth.js
        const JWT_SECRET = process.env.JWT_SECRET || 'patriot-thanks-secret-key';
        console.log("Using JWT_SECRET:", JWT_SECRET === 'patriot-thanks-secret-key' ? 'Using fallback secret' : 'Using env variable');

        // Verify token
        const decoded = jwt.verify(token, JWT_SECRET);
        console.log("Token decoded successfully:", decoded.userId, "isAdmin:", decoded.isAdmin);

        // Connect to MongoDB
        await connect;

        // Find the user
        const user = await User.findById(decoded.userId);

        if (!user) {
            console.log("User not found in database");
            return { authorized: false, message: 'User not found' };
        }

        // Check admin rights
        if (user.level !== 'Admin' && user.isAdmin !== true) {
            console.log("User is not an admin. Level:", user.level, "isAdmin:", user.isAdmin);
            return { authorized: false, message: 'Admin access required' };
        }

        console.log("User verified as admin:", user.level, user.isAdmin);
        return { authorized: true, user };
    } catch (error) {
        console.error('Token verification error:', error);
        return { authorized: false, message: 'Invalid or expired token' };
    }
}

/**
 * Handle business registration
 */
async function handleBusinessRegister(req, res) {
    // For GET requests with register operation, provide API info
    if (req.method === 'GET' && req.query.operation === 'register') {
        return res.status(200).json({ message: 'Business registration API is available' });
    }

    // Only allow POST requests for actual business registration
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    console.log("Business registration API hit:", req.method);

    try {
        // Get business data from request
        const businessData = req.body;
        console.log("Business Data:", businessData);

        // Connect to MongoDB - fix the connection call
        try {
            await connect;  // Since connect is already a Promise, just await it
            console.log("Database connection established");
        } catch (dbError) {
            console.error("Database connection error:", dbError);
            return res.status(500).json({ message: 'Database connection error', error: dbError.message });
        }

        // Check if business already exists
        const existingBusiness = await Business.findOne({
            address1: businessData.address1,
            address2: businessData.address2,
            city: businessData.city,
            state: businessData.state,
            zip: businessData.zip,
        });

        if (existingBusiness) {
            return res.status(409).json({ message: 'Business with this address already exists' });
        }

        // Add timestamps
        businessData.created_at = new Date();
        businessData.updated_at = new Date();

        // Insert business data
        console.log("Inserting business data");
        const newBusiness = new Business(businessData);
        const result = await newBusiness.save();
        console.log("Business registered successfully:", result._id);

        // Return success response
        return res.status(201).json({
            message: 'Business registered successfully',
            businessId: result._id
        });
    } catch (error) {
        console.error('Business submission error:', error);
        return res.status(500).json({ message: 'Server error during business submission: ' + error.message });
    }
}

/**
 * Handle business search
 */
async function handleBusinessSearch(req, res) {
    console.log("Business search API hit:", req.method);
    console.log("Query parameters:", req.query);

    try {
        // Connect to MongoDB - fix the connection call
        try {
            await connect;  // Since connect is already a Promise, just await it
            console.log("Database connection established");
        } catch (dbError) {
            console.error("Database connection error:", dbError);
            return res.status(500).json({ message: 'Database connection error', error: dbError.message });
        }

        // Check if business_name or businessName is present
        const businessNameValue = req.query.business_name || req.query.businessName || '';
        const addressValue = req.query.address || '';

        console.log("Business name value:", businessNameValue);
        console.log("Address value:", addressValue);

        // Build the query based on provided parameters
        let query = {};

        // Only use business name if a value is provided
        if (businessNameValue && businessNameValue.trim() !== '') {
            query.bname = { $regex: businessNameValue.trim(), $options: 'i' };
        }

        if (addressValue && addressValue.trim() !== '') {
            const addressRegex = { $regex: addressValue.trim(), $options: 'i' };
            query.$or = [
                { address1: addressRegex },
                { address2: addressRegex },
                { city: addressRegex },
                { state: addressRegex },
                { zip: addressRegex }
            ];
        }

        console.log("MongoDB Query:", JSON.stringify(query, null, 2));

        // Find businesses matching the query
        const businesses = await Business.find(query).lean();
        console.log("Found", businesses.length, "matching businesses");

        return res.status(200).json({
            message: 'Search successful',
            results: businesses
        });
    } catch (error) {
        console.error('Search error:', error);
        return res.status(500).json({ message: 'Server error during search: ' + error.message });
    }
}

/**
 * Handle admin listing of businesses
 */
async function handleAdminListBusinesses(req, res) {
    // Verify admin token
    const auth = await verifyAdminToken(req);
    if (!auth.authorized) {
        return res.status(401).json({ message: auth.message });
    }

    try {
        // Connect to MongoDB
        await connect;
        console.log("Database connection established");

        // Parse query parameters
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Build query based on filters
        const query = {};

        // Search filter
        if (req.query.search) {
            const searchRegex = new RegExp(req.query.search, 'i');
            query.$or = [
                { bname: searchRegex },
                { address1: searchRegex },
                { city: searchRegex },
                { state: searchRegex },
                { zip: searchRegex },
                { phone: searchRegex }
            ];
        }

        // Category filter
        if (req.query.category) {
            query.type = req.query.category;
        }

        // Status filter
        if (req.query.status) {
            query.status = req.query.status;
        }

        // Count total businesses matching query
        const total = await Business.countDocuments(query);

        // Find businesses with pagination
        const businesses = await Business.find(query)
            .sort({ created_at: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        // Calculate total pages
        const totalPages = Math.ceil(total / limit);

        return res.status(200).json({
            businesses,
            total,
            page,
            limit,
            totalPages
        });
    } catch (error) {
        console.error('Error listing businesses:', error);
        return res.status(500).json({ message: 'Server error during business listing: ' + error.message });
    }
}

/**
 * Handle admin get business details
 */
async function handleAdminGetBusiness(req, res) {
    // Verify admin token
    const auth = await verifyAdminToken(req);
    if (!auth.authorized) {
        return res.status(401).json({ message: auth.message });
    }

    // Get business ID from query
    const { businessId } = req.query;

    if (!businessId) {
        return res.status(400).json({ message: 'Business ID is required' });
    }

    try {
        // Connect to MongoDB
        await connect;

        // Find business by ID
        const business = await Business.findById(businessId).lean();

        if (!business) {
            return res.status(404).json({ message: 'Business not found' });
        }

        return res.status(200).json({
            business
        });
    } catch (error) {
        console.error('Error getting business details:', error);
        return res.status(500).json({ message: 'Server error getting business details: ' + error.message });
    }
}

/**
 * Handle admin create business
 */
async function handleAdminCreateBusiness(req, res) {
    // Verify admin token
    const auth = await verifyAdminToken(req);
    if (!auth.authorized) {
        return res.status(401).json({ message: auth.message });
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        // Get business data from request
        const businessData = req.body;

        // Validate required fields
        const requiredFields = ['bname', 'address1', 'city', 'state', 'zip', 'phone', 'type'];
        const missingFields = requiredFields.filter(field => !businessData[field]);

        if (missingFields.length > 0) {
            return res.status(400).json({
                message: `Missing required fields: ${missingFields.join(', ')}`
            });
        }

        // Connect to MongoDB
        await connect;

        // Check if business already exists
        const existingBusiness = await Business.findOne({
            bname: businessData.bname,
            address1: businessData.address1,
            city: businessData.city,
            state: businessData.state,
            zip: businessData.zip
        });

        if (existingBusiness) {
            return res.status(409).json({ message: 'Business with this name and address already exists' });
        }

        // Add timestamps and default status if not provided
        businessData.created_at = new Date();
        businessData.updated_at = new Date();

        if (!businessData.status) {
            businessData.status = 'active';
        }

        // Insert business data
        const newBusiness = new Business(businessData);
        const result = await newBusiness.save();

        return res.status(201).json({
            message: 'Business created successfully',
            businessId: result._id
        });
    } catch (error) {
        console.error('Error creating business:', error);
        return res.status(500).json({ message: 'Server error creating business: ' + error.message });
    }
}

/**
 * Handle admin update business
 */
async function handleAdminUpdateBusiness(req, res) {
    // Verify admin token
    const auth = await verifyAdminToken(req);
    if (!auth.authorized) {
        return res.status(401).json({ message: auth.message });
    }

    // Only allow PUT requests
    if (req.method !== 'PUT') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        // Get business data from request
        const businessData = req.body;
        const businessId = businessData.businessId;

        // Validate business ID
        if (!businessId) {
            return res.status(400).json({ message: 'Business ID is required' });
        }

        // Remove businessId from update data
        delete businessData.businessId;

        // Validate required fields
        const requiredFields = ['bname', 'address1', 'city', 'state', 'zip', 'phone', 'type'];
        const missingFields = requiredFields.filter(field => !businessData[field]);

        if (missingFields.length > 0) {
            return res.status(400).json({
                message: `Missing required fields: ${missingFields.join(', ')}`
            });
        }

        // Connect to MongoDB
        await connect;

        // Check if business exists
        const existingBusiness = await Business.findById(businessId);

        if (!existingBusiness) {
            return res.status(404).json({ message: 'Business not found' });
        }

        // Check if another business has the same name and address
        const duplicateBusiness = await Business.findOne({
            _id: { $ne: businessId },
            bname: businessData.bname,
            address1: businessData.address1,
            city: businessData.city,
            state: businessData.state,
            zip: businessData.zip
        });

        if (duplicateBusiness) {
            return res.status(409).json({ message: 'Another business with this name and address already exists' });
        }

        // Update timestamp
        businessData.updated_at = new Date();

        // Update business
        const result = await Business.findByIdAndUpdate(
            businessId,
            { $set: businessData },
            { new: true }
        );

        return res.status(200).json({
            message: 'Business updated successfully',
            businessId: result._id
        });
    } catch (error) {
        console.error('Error updating business:', error);
        return res.status(500).json({ message: 'Server error updating business: ' + error.message });
    }
}

/**
 * Handle admin delete business
 */
async function handleAdminDeleteBusiness(req, res) {
    // Verify admin token
    const auth = await verifyAdminToken(req);
    if (!auth.authorized) {
        return res.status(401).json({ message: auth.message });
    }

    // Only allow DELETE requests
    if (req.method !== 'DELETE') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        // Get business ID from request body
        const { businessId } = req.body;

        if (!businessId) {
            return res.status(400).json({ message: 'Business ID is required' });
        }

        // Connect to MongoDB
        await connect;

        // Check if business exists
        const existingBusiness = await Business.findById(businessId);

        if (!existingBusiness) {
            return res.status(404).json({ message: 'Business not found' });
        }

        // Delete business
        const result = await Business.findByIdAndDelete(businessId);

        return res.status(200).json({
            message: 'Business deleted successfully',
            businessId: businessId
        });
    } catch (error) {
        console.error('Error deleting business:', error);
        return res.status(500).json({ message: 'Server error deleting business: ' + error.message });
    }
}
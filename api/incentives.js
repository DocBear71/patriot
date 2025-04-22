// api/incentives.js - Combined incentives endpoint handlers
const connect = require('../config/db');
const mongoose = require('mongoose');

// Define schemas once
const businessSchema = new mongoose.Schema({
    bname: String,
    address1: String,
    address2: String,
    city: String,
    state: String,
    zip: String,
    phone: String,
    type: String,
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
});

const incentiveSchema = new mongoose.Schema({
    business_id: String,
    is_available: Boolean,
    type: String,
    amount: Number,
    information: String,
    other_description: String,
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
});

// Initialize models once
let Business, Incentive;
try {
    // Try to fetch the existing models
    Business = mongoose.model('Business');
    Incentive = mongoose.model('Incentive');
} catch (error) {
    // Define the models if they do not exist
    Business = mongoose.model('Business', businessSchema, 'business');
    Incentive = mongoose.model('Incentive', incentiveSchema, 'incentives');
}

/**
 * Combined API handler for all incentive operations
 */
module.exports = async (req, res) => {
    // Handle CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Route based on HTTP method and operation query parameter
    try {
        const { operation } = req.query;

        // If it's a POST request, assume it's an add operation
        if (req.method === 'POST') {
            return await handleAddIncentive(req, res);
        }
        // If it's a GET request with operation=add, it's just checking availability
        else if (req.method === 'GET' && operation === 'add') {
            return res.status(200).json({ message: 'Incentives Add API is available' });
        }
        // If it's a GET request (with or without operation=get), retrieve incentives
        else if (req.method === 'GET') {
            return await handleGetIncentives(req, res);
        }
        else {
            return res.status(405).json({ message: 'Method not allowed' });
        }
    } catch (error) {
        console.error(`Error in incentives API:`, error);
        return res.status(500).json({ message: 'Server error: ' + error.message });
    }
};

/**
 * Handle GET request for retrieving incentives for a business
 */
async function handleGetIncentives(req, res) {
    console.log("Get Incentives API hit:", req.method);
    console.log("Full URL:", req.url);
    console.log("Query parameters:", req.query);

    // Get the business ID from the query parameters
    const businessId = req.query.business_id;

    if (!businessId) {
        return res.status(400).json({ message: 'Business ID is required as a query parameter' });
    }

    console.log("Business ID from query:", businessId);

    // Connect to MongoDB - fix the connection call
    try {
        await connect;  // Since connect is already a Promise, just await it
        console.log("Database connection established");
    } catch (dbError) {
        console.error("Database connection error:", dbError);
        return res.status(500).json({ message: 'Database connection error', error: dbError.message });
    }

    // Find incentives for the business
    console.log("Query being executed:", { business_id: businessId });
    const incentives = await Incentive.find({ business_id: businessId }).exec();
    console.log(`Found ${incentives.length} incentives for business ${businessId}`);

    return res.status(200).json({
        message: 'Incentives retrieved successfully.',
        results: incentives
    });
}

/**
 * Handle POST request for adding a new incentive
 */
async function handleAddIncentive(req, res) {
    console.log("Incentives add API hit:", req.method);
    console.log("Request body:", req.body);

    // Extract incentive data from request body
    const incentiveData = req.body;

    // Basic validation
    if (!incentiveData.business_id) {
        return res.status(400).json({ message: 'Business ID is required' });
    }

    // Connect to MongoDB - fix the connection call
    try {
        await connect;  // Since connect is already a Promise, just await it
        console.log("Database connection established");
    } catch (dbError) {
        console.error("Database connection error:", dbError);
        return res.status(500).json({ message: 'Database connection error', error: dbError.message });
    }

    // Check if the business exists
    const businessExists = await Business.findById(incentiveData.business_id).exec();
    if (!businessExists) {
        return res.status(404).json({ message: 'Business not found' });
    }

    // Prepare incentive data for insertion
    const newIncentive = new Incentive({
        business_id: incentiveData.business_id,
        is_available: incentiveData.is_available,
        type: incentiveData.type || '',
        amount: parseFloat(incentiveData.amount) || 0,
        information: incentiveData.information || '',
        created_at: new Date(),
        updated_at: new Date()
    });

    // Add the other_description field if provided
    if (incentiveData.type === 'OT' && incentiveData.other_description) {
        newIncentive.other_description = incentiveData.other_description;
    }

    // Insert incentive data
    const savedIncentive = await newIncentive.save();
    console.log("Saved incentive:", savedIncentive._id);

    // Return success response
    return res.status(201).json({
        message: 'Incentive added successfully',
        incentiveId: savedIncentive._id
    });
}
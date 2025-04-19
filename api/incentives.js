// api/incentives.js - Get incentives for a business
const connect = require('../config/db');
const mongoose = require('mongoose');

// define the schema for incentives to add
const incentiveSchema = new mongoose.Schema({
    business_id: String,
    is_available: Boolean,
    type: String,
    amount: Number,
    information: String,
    other_description: String,
    created_at: Date,
    updated_at: Date,
});

// create the model if it doesn't already exist
let incentive;
try {
    // try to fetch the model if exists
    incentive = mongoose.model('Incentive');
} catch (error) {
    incentive = mongoose.model('Incentive', incentiveSchema, 'incentives');
}

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // handle the OPTIONS request
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // only allow GET requests
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        console.log("Get Incentives API hit:", req.method);
        console.log("Full URL:", req.url);
        console.log("Query parameters:", req.query);

        // Get the business ID from the query parameters
        const businessId = req.query.business_id;

        if (!businessId) {
            return res.status(400).json({ message: 'Business ID is required as a query parameter' });
        }

        console.log("Business ID from query:", businessId);

        // Connect to MongoDB
        await connect();
        console.log("Connected to MongoDB using Mongoose")

        // Find incentives for the business
        console.log("Query being exicuted:", { business_id: businessId });
        const incentives = await incentive.find({ business_id: businessId }).exec();
        console.log(`Found ${incentives.length} incentives for business ${businessId}`);

        return res.status(200).json({
            message: 'Incentives retrieved successfully.',
            results: incentives
        });
    } catch (error) {
        console.error("Get incentives error:", error);
        return res.status(500).json({message: 'Server error while retrieving incentives: ' + error.message});
    }
};
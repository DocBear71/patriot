// api/incentives/add.js - Add incentives to a business
const connect = require('../../config/db');
const mongoose = require('mongoose');

// define the schemas for business and incentives
const businessSchema = new mongoose.Schema({
    bname: String,
    address1: String,
    address2: String,
    city: String,
    state: String,
    zip: String,
    phone: String,
    type: String
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

// create the models if they don't already exist
let Business, Incentive;
try {
    // try to fetch the existing models
    Business = mongoose.model('Business');
    Incentive = mongoose.model('Incentive');
} catch (error) {
    // lets define the models if they do not exist
    Business = mongoose.model('Business', businessSchema, 'business');
    Incentive = mongoose.model('Incentive', incentiveSchema, 'incentives');
}

module.exports = async (req, res) => {
    // Enable CORS
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

    // Handle GET request for testing
    if (req.method === 'GET') {
        return res.status(200).json({ message: 'Incentives Add API is available' });
    }

    // Only allow POST requests for actual operations
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        console.log("Incentives add API hit:", req.method);
        console.log("Request body:", req.body);

        // Extract incentive data from request body
        const incentiveData = req.body;

        // Basic validation
        if (!incentiveData.business_id) {
            return res.status(400).json({ message: 'Business ID is required' });
        }

        // Connect to MongoDB using Mongoose
        await connect();
        console.log("Connected to MongoDB using Mongoose");

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
            incentive.other_description = incentiveData.other_description;
        }

        // Insert incentive data
        const savedIncentive = await newIncentive.save();
        console.log("Saved incentive:", savedIncentive._id);

        // Return success response
        return res.status(201).json({
            message: 'Incentive added successfully',
            incentiveId: savedIncentive._id
        });

    } catch (error) {
        console.error('Incentive submission error:', error);
        return res.status(500).json({ message: 'Server error during incentive submission: ' + error.message });
    }
};
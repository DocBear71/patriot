// api/incentives/add.js - Add incentives to a business
const { connectToDatabase } = require('../../lib/mongodb');
const { ObjectId } = require('mongodb');

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

        // Connect to MongoDB
        const { db } = await connectToDatabase();
        const incentivesCollection = db.collection('incentives');
        const businessCollection = db.collection('business');

        // Check if the business exists
        const businessExists = await businessCollection.findOne({
            _id: new ObjectId(incentiveData.business_id)
        });

        if (!businessExists) {
            return res.status(404).json({ message: 'Business not found' });
        }

        // Prepare incentive data for insertion
        const incentive = {
            business_id: incentiveData.business_id,
            is_available: incentiveData.is_available,
            type: incentiveData.type || '',
            amount: parseFloat(incentiveData.amount) || 0,
            information: incentiveData.information || '',
            created_at: new Date(),
            updated_at: new Date()
        };

        // Add the other_description field if provided
        if (incentiveData.type === 'OT' && incentiveData.other_description) {
            incentive.other_description = incentiveData.other_description;
        }

        // Insert incentive data
        const result = await incentivesCollection.insertOne(incentive);

        // Return success response
        return res.status(201).json({
            message: 'Incentive added successfully',
            incentiveId: result.insertedId
        });

    } catch (error) {
        console.error('Incentive submission error:', error);
        return res.status(500).json({ message: 'Server error during incentive submission: ' + error.message });
    }
};
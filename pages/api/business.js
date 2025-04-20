// api/business.js - Business registration endpoint
const connect = require('../config/db');
const mongoose = require('mongoose');

module.exports = async (req,res) => {
    // CORS is handled by next.config.js

    // handle the Options request if not properly handled in next.config.js
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Onlyu allo0w Post requests
    if (req.method !== 'POST') {
        // For Get requests, use the API info
        if (req.method === 'GET') {
            return res.status(200).json({message: 'Business API is available'});
        }
        return res.status(405).json({message: 'Method Not Allowed'});
    }

    try {
        console.log("Business API hit: ", req.method );

        // get the business data from the request
        const businessData = req.body;
        console.log("Business Data: ", businessData);

        // Connect to the MongoDB
        await connect();

        // now use the connection
        const collection = mongoose.connection.db.collection('business');

        // does the business already exist in the database?
        const existingBusiness = await collection.findOne({
            address1: businessData.address1,
            address2: businessData.address2,
            city: businessData.city,
            state: businessData.state,
            zip: businessData.zip,
        });

        if (existingBusiness) {
            return res.status(409).json({ message: 'Business with this address already exists'});
        }
        // lets insert the data
        console.log("Inserting business data");
        const result = await collection.insertOne(businessData);
        console.log("Business registered successfully: ", result.insertedId);

        // return a success response
        return res.status(200).json({
            message: 'Business registered successfully',
            businessId: result.insertedId
        });
    } catch (error) {
        console.error('Business submission error: ', error);
        return res.status(500).json({ message: 'Server error during business submission: ' + error.message });
    }
};

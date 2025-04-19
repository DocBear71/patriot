// api/business.js - Business registration endpoint
const { connectToDatabase } = require('../lib/mongodb');

module.exports = async (req,res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // handle the Options request
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
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
        const { db } = await connectToDatabase();
        const collection = db.collection('business');

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

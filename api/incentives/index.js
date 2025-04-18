// api/incentives/[businessId].js - Get incentives for a business
const { connectToDatabase } = require('../../lib/mongodb');

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

        // get the business ID from the URL
        const businessId = req.query.businessId || req.url.split('/').pop();
        console.log("Business ID:", businessId);

        // conect to the MongoDB
        const { db } = await connectToDatabase();
        const incentivesCollection = db.collection('incentives');

        // find the incentives for the selected business ID
        const incentives = await incentivesCollection.find({
            business_id: businessId
        }).toArray();

        return res.status(200).json({
            message: 'Incentives retrieved successfully.',
            results: incentives
        });
    } catch (error) {
        console.error("get incentives error", error);
        return res.status(500).json({message: 'Server error while retrieving incentives: ' + error.message});
    }
};
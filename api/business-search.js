// api/business-search.js - Business search endpoint
const { connectToDatabase } = require('../lib/mongodb');

module.exports = async (req,res) => {
    // enable CORS
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
        console.log("Business search API hit:", req.method);
        console.log("Query parameters:", req.query);

        // Conect tot the MongoDB
        const { db } = await connectToDatabase();
        const collection = db.collection('business');

        // buidl the query based on the provided parameters
        const query = {};
        const searchConditions = [];

        if (businessName && businessName.trim() !== '') {
            // then search by business name
            searchConditions.push({ bname: { $regex: businessName, $options: 'i' } });
        }

        if (address && address.trim() !== '') {
            // search using multiple field options
            searchConditions.push({ address1: { $regex: address1, $options: 'i' } });
            searchConditions.push({ address2: { $regex: address2, $options: 'i' } });
            searchConditions.push({ city: { $regex: city, $options: 'i' } });
            searchConditions.push({ state: { $regex: state, $options: 'i' } });
            searchConditions.push({ zip: { $regex: zip, $options: 'i' } });
        }

        if (searchConditions.length > 0) {
            query.$or = searchConditions;
        }

        console.log("MongoDB Query: ", JSON.stringify(query, null, 2));

        // now find a business matching the query
        const businesses = await collection.find(query).toArray();

        return res.status(200).json({
            message: 'Search successful',
            results: businesses
        });
    } catch (error) {
        console.error('Search error:', error);
        return res.status(500).json({ message: 'Server error during search: ' + error.message });
    }
};

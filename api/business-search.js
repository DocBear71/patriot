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

        console.log("All query parameters:", req.query);

        // check if business_name or businessName are present
        const businessNameValue = req.query.business_Name || req.query.businessName || '';
        const addressValue = req.query.address || '';

        if (businessNameValue && String(businessNameValue).trim() !== '') {
            // then search by business name, ensure it is a string
            searchConditions.push({ bname: { $regex: String(businessNameValue).trim(), $options: 'i' } });
        }

        if (addressValue && String(addressValue).trim() !== '') {
            const addressString = String(addressValue.trim());
            // search using multiple field options
            searchConditions.push({ address1: { $regex: addressString, $options: 'i' } });
            searchConditions.push({ address2: { $regex: addressString, $options: 'i' } });
            searchConditions.push({ city: { $regex: addressString, $options: 'i' } });
            searchConditions.push({ state: { $regex: addressString, $options: 'i' } });
            searchConditions.push({ zip: { $regex: addressString, $options: 'i' } });
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

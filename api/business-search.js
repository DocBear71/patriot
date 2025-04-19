// api/business-search.js - Business search endpoint
const mongoose = require('mongoose');
const connect = require('../config/db');


module.exports = async (req,res) => {
    // CORS handled by next.config.js

    // handle the OPTIONS request, if next.config.js doesn't handle it properly
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // handle only specific https methods
    if (req.method !== 'POST' && req.method !== 'GET') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    let client = null;

    try {
        console.log("Business search API hit:", req.method);
        console.log("Query parameters:", req.query);

        // Conect tot the MongoDB using mongoose
        await connect();
        // console.log("Connected to MongoDB using Mongoose");

        // now use the connection
        const collection = mongoose.connection.db.collection('business');

        // Check if business_name or businessName is present
        const businessNameValue = req.query.business_name || req.query.businessName || '';
        const addressValue = req.query.address || '';

        console.log("Business name value:", businessNameValue);
        console.log("Address value:", addressValue);

        // buidl the query based on the provided parameters
        let query = {};

        // only use business name if a value is provided
        if (businessNameValue && businessNameValue.trim() !== '') {
            query.bname = {$regex: businessNameValue.trim(), $options: 'i'}
            }

        if (addressValue && addressValue.trim() !== '') {
            const addressRegex = { $regex: addressValue.trim(), $options: 'i'};
            query.$or = [
                    {address1: addressRegex},
                    {address2: addressRegex},
                    {city: addressRegex},
                    {state: addressRegex},
                    {zip: addressRegex}
            ];
        }

        console.log("MongoDB Query: ", JSON.stringify(query, null, 2));

        // now find a business matching the query
        const businesses = await collection.find(query).toArray();
        console.log("Found", businesses.length, "matching businesses");

        return res.status(200).json({
            message: 'Search successful',
            results: businesses
        });
    } catch (error) {
        console.error('Search error:', error);
        return res.status(500).json({ message: 'Server error during search: ' + error.message });
    }
};

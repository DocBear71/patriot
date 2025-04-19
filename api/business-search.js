// api/business-search.js - Business search endpoint
const mongoose = require('mongoose');
const connect = require('../config/db');

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

        // Conect tot the MongoDB using mongoose
        await connect();
        console.log("Connected to MongoDB using Mongoose");

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

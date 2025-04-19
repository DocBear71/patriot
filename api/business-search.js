// api/business-search.js - Business search endpoint
const connect = require('../config/db');
const mongoose = require('mongoose');

// define the schema for business
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

// create a model if it doesn't already exist
let Business;
try {
    // lets try and fetch an existing model
    Business = mongoose.model('Business');
} catch(error) {
    Business = mongoose.model('Business', businessSchema, 'business');
}

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
        let queryConditions = [];

        // only use business name if a value is provided
        if (businessNameValue && businessNameValue.trim() !== '') {
            queryConditions.push({
                bname: {$regex: businessNameValue, $options: 'i'}
            });
        }

        if (addressValue && addressValue.trim() !== '') {
            const addressString = addressValue.trim();
            queryConditions.push({
                $or: [
                    {address1: addressString},
                    {address2: addressString},
                    {city: addressString},
                    {state: addressString},
                    {zip: addressString},
                ]
            });
        }

        // construct the final query
        let finalQuery = {};
        if (queryConditions.length > 0) {
            finalQuery = { $and: queryConditions };
        }

        console.log("MongoDB Query: ", JSON.stringify(finalQuery, null, 2));

        // now find a business matching the query
        const businesses = await Business.find(finalQuery).lean.exec();
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

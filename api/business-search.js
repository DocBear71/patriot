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
        let query;

        if (businessNameValue && businessNameValue.trim() !== '') {
            // then search by business name
            const nameValue = businessNameValue.trim();
            query.bname = { $regex: nameValue, $options: 'i' };
        }

        if (addressValue && addressValue.trim() !== '') {
            const addressRegex = {$regex: addressValue.trim(), $options: 'i'};

            if (query.bname) {
                // create an $or query for address fields, combined with existing bname query
                query = {
                    $and: [
                        {bname: query.bname},
                        {
                            $or: [
                                {address1: addressRegex},
                                {address2: addressRegex},
                                {city: addressRegex},
                                {state: addressRegex},
                                {zip: addressRegex},
                            ]
                        }
                    ]
                };
            } else {
                // or else just query by address fields
                query = {
                    $or: [
                        {address1: addressRegex},
                        {address2: addressRegex},
                        {city: addressRegex},
                        {state: addressRegex},
                        {zip: addressRegex},
                    ]
                };
            }
        }

        console.log("MongoDB Query: ", JSON.stringify(query, null, 2));

        // now find a business matching the query
        const businesses = await Business.find(query).exec();
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

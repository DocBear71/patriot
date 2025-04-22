// api/business.js - Consolidated business API (register and search)
const connect = require('../config/db');
const mongoose = require('mongoose');
let Business = require('../models/index');


// Define business schema once
const businessSchema = new mongoose.Schema({
    bname: String,
    address1: String,
    address2: String,
    city: String,
    state: String,
    zip: String,
    phone: String,
    type: String,
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
});

// Initialize model once

try {
    Business = mongoose.model('Business');
} catch (error) {
    Business = mongoose.model('Business', businessSchema, 'business');
}

/**
 * Consolidated business API handler
 */
module.exports = async (req, res) => {
    // Handle OPTIONS request
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Route based on operation parameter
    const { operation } = req.query;

    try {
        switch (operation) {
            case 'search':
                return await handleBusinessSearch(req, res);
            case 'register':
                return await handleBusinessRegister(req, res);
            default:
                if (req.method === 'GET') {
                    return res.status(200).json({
                        message: 'Business API is available',
                        operations: ['register', 'search']
                    });
        }
            return res.status(400).json({ message: 'Invalid operation' });
        }
    } catch (error) {
        console.error(`Error in business API (${operation || 'unknown'}):`, error);
        return res.status(500).json({ message: 'Server error: ' + error.message });
    }
};

/**
 * Handle business registration
 */
async function handleBusinessRegister(req, res) {
    // For GET requests with register operation, provide API info
    if (req.method === 'GET' && req.query.operation === 'register') {
        return res.status(200).json({ message: 'Business registration API is available' });
    }

    // Only allow POST requests for actual business registration
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    console.log("Business registration API hit:", req.method);

    try {
        // Get business data from request
        const businessData = req.body;
        console.log("Business Data:", businessData);

        // Connect to MongoDB
        await connect();

        // Check if business already exists
        const existingBusiness = await Business.findOne({
            address1: businessData.address1,
            address2: businessData.address2,
            city: businessData.city,
            state: businessData.state,
            zip: businessData.zip,
        });

        if (existingBusiness) {
            return res.status(409).json({ message: 'Business with this address already exists' });
        }

        // Add timestamps
        businessData.created_at = new Date();
        businessData.updated_at = new Date();

        // Insert business data
        console.log("Inserting business data");
        const newBusiness = new Business(businessData);
        const result = await newBusiness.save();
        console.log("Business registered successfully:", result._id);

        // Return success response
        return res.status(201).json({
            message: 'Business registered successfully',
            businessId: result._id
        });
    } catch (error) {
        console.error('Business submission error:', error);
        return res.status(500).json({ message: 'Server error during business submission: ' + error.message });
    }
}

/**
 * Handle business search
 */
async function handleBusinessSearch(req, res) {
    console.log("Business search API hit:", req.method);
    console.log("Query parameters:", req.query);

    try {
        // Connect to MongoDB
        await connect();
        console.log("Connected to MongoDB using Mongoose");

        // Check if business_name or businessName is present
        const businessNameValue = req.query.business_name || req.query.businessName || '';
        const addressValue = req.query.address || '';

        console.log("Business name value:", businessNameValue);
        console.log("Address value:", addressValue);

        // Build the query based on provided parameters
        let query = {};

        // Only use business name if a value is provided
        if (businessNameValue && businessNameValue.trim() !== '') {
            query.bname = { $regex: businessNameValue.trim(), $options: 'i' };
        }

        if (addressValue && addressValue.trim() !== '') {
            const addressRegex = { $regex: addressValue.trim(), $options: 'i' };
            query.$or = [
                { address1: addressRegex },
                { address2: addressRegex },
                { city: addressRegex },
                { state: addressRegex },
                { zip: addressRegex }
            ];
        }

        console.log("MongoDB Query:", JSON.stringify(query, null, 2));

        // Find businesses matching the query
        const businesses = await Business.find(query).lean();
        console.log("Found", businesses.length, "matching businesses");

        return res.status(200).json({
            message: 'Search successful',
            results: businesses
        });
    } catch (error) {
        console.error('Search error:', error);
        return res.status(500).json({ message: 'Server error during search: ' + error.message });
    }
}
// api/business.js - Modified to include user information
const connect = require('../config/db');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
let Business = require('../models/Business');
let User = require('../models/User'); // Make sure this matches your actual User model name

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
            // Public operations
            case 'search':
                return await handleBusinessSearch(req, res);
            case 'register':
                return await handleBusinessRegister(req, res);

            // Admin operations
            case 'admin-list-businesses':
                return await handleAdminListBusinesses(req, res);
            case 'admin-get-business':
                return await handleAdminGetBusiness(req, res);
            case 'admin-create-business':
                return await handleAdminCreateBusiness(req, res);
            case 'admin-update-business':
                return await handleAdminUpdateBusiness(req, res);
            case 'admin-delete-business':
                return await handleAdminDeleteBusiness(req, res);

            default:
                if (req.method === 'GET') {
                    return res.status(200).json({
                        message: 'Business API is available',
                        operations: [
                            // Public operations
                            'register', 'search',
                            // Admin operations
                            'admin-list-businesses', 'admin-get-business',
                            'admin-create-business', 'admin-update-business',
                            'admin-delete-business'
                        ]
                    });
                }
                return res.status(400).json({ message: 'Invalid operation' });
        }
    } catch (error) {
        console.error(`Error in business API (${operation || 'unknown'}):`, error);
        return res.status(500).json({ message: 'Server error: ' + error.message });
    }
};

// [Keep all the other functions the same]

/**
 * Handle admin listing of businesses
 */
async function handleAdminListBusinesses(req, res) {
    // Verify admin token
    const auth = await verifyAdminToken(req);
    if (!auth.authorized) {
        return res.status(401).json({ message: auth.message });
    }

    try {
        // Connect to MongoDB
        await connect;
        console.log("Database connection established");

        // Parse query parameters
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Build query based on filters
        const query = {};

        // Search filter
        if (req.query.search) {
            const searchRegex = new RegExp(req.query.search, 'i');
            query.$or = [
                { bname: searchRegex },
                { address1: searchRegex },
                { city: searchRegex },
                { state: searchRegex },
                { zip: searchRegex },
                { phone: searchRegex }
            ];
        }

        // Category filter
        if (req.query.category) {
            query.type = req.query.category;
        }

        // Status filter
        if (req.query.status) {
            query.status = req.query.status;
        }

        // Count total businesses matching query
        const total = await Business.countDocuments(query);

        // Find businesses with pagination
        let businesses = await Business.find(query)
            .sort({ created_at: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        // Get user information for each business
        // We do this in a separate step to keep the code clean
        const userIds = businesses.map(business => business.created_by).filter(id => id);
        let users = [];

        if (userIds.length > 0) {
            users = await User.find({
                _id: { $in: userIds }
            }).select('_id fname lname email').lean();
        }

        // Create a map of user IDs to user details for quick lookup
        const userMap = {};
        users.forEach(user => {
            userMap[user._id.toString()] = {
                name: `${user.fname} ${user.lname}`,
                email: user.email
            };
        });

        // Add user details to each business
        businesses = businesses.map(business => {
            if (business.created_by && userMap[business.created_by.toString()]) {
                business.createdByUser = userMap[business.created_by.toString()];
            }
            return business;
        });

        // Calculate total pages
        const totalPages = Math.ceil(total / limit);

        return res.status(200).json({
            businesses,
            total,
            page,
            limit,
            totalPages
        });
    } catch (error) {
        console.error('Error listing businesses:', error);
        return res.status(500).json({ message: 'Server error during business listing: ' + error.message });
    }
}

// [Keep all the other functions the same]
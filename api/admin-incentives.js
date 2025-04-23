// api/admin-incentives.js - Admin-specific incentives endpoint handlers
const connect = require('../config/db');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

// Share the same schemas as incentives.js
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

const incentiveSchema = new mongoose.Schema({
    business_id: String,
    is_available: Boolean,
    type: String,
    amount: Number,
    information: String,
    other_description: String,
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
});

// Initialize models once
let Business, Incentive, User;
try {
    // Try to fetch the existing models
    Business = mongoose.model('Business');
    Incentive = mongoose.model('Incentive');
    User = mongoose.model('User');
} catch (error) {
    // Define the models if they do not exist
    Business = mongoose.model('Business', businessSchema, 'business');
    Incentive = mongoose.model('Incentive', incentiveSchema, 'incentives');

    // Define User model if needed for admin validation
    const userSchema = new mongoose.Schema({
        email: String,
        password: String,
        fname: String,
        lname: String,
        address1: String,
        address2: String,
        city: String,
        state: String,
        zip: String,
        status: String,
        level: String,
        created_at: { type: Date, default: Date.now },
        updated_at: { type: Date, default: Date.now }
    });
    User = mongoose.model('User', userSchema, 'user');
}

/**
 * Main API handler for admin incentive operations
 */
module.exports = async (req, res) => {
    // Handle CORS through next.config.js


    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Verify admin status for all requests
    try {
        const isAdmin = await verifyAdminAccess(req);
        if (!isAdmin) {
            return res.status(403).json({ message: 'Admin access required' });
        }
    } catch (authError) {
        console.error('Admin authentication error:', authError);
        return res.status(401).json({ message: 'Authentication required' });
    }

    // Connect to MongoDB
    try {
        await connect;
        console.log("Database connection established");
    } catch (dbError) {
        console.error("Database connection error:", dbError);
        return res.status(500).json({ message: 'Database connection error', error: dbError.message });
    }

    // Route based on operation parameter and HTTP method
    try {
        const { operation } = req.query;

        console.log(`Processing admin incentive operation: ${operation || 'no operation specified'}`);
        console.log("Method:", req.method);
        console.log("Query:", req.query);

        if (req.method === 'GET') {
            // Handle various GET operations
            if (operation === 'admin-list-incentives') {
                return await handleListIncentives(req, res);
            } else if (operation === 'get') {
                return await handleGetIncentive(req, res);
            } else {
                // Default GET operation: list all incentives
                return await handleListIncentives(req, res);
            }
        } else if (req.method === 'POST') {
            // Handle new incentive creation through regular incentives API
            return res.status(200).json({
                message: 'Use the regular incentives API endpoint for creating new incentives',
                endpoint: '/api/incentives.js'
            });
        } else if (req.method === 'PUT' && operation === 'update') {
            // Handle incentive update
            return await handleUpdateIncentive(req, res);
        } else if (req.method === 'DELETE' && operation === 'delete') {
            // Handle incentive deletion
            return await handleDeleteIncentive(req, res);
        } else {
            return res.status(400).json({ message: 'Invalid operation or HTTP method' });
        }
    } catch (error) {
        console.error(`Error in admin-incentives API:`, error);
        return res.status(500).json({ message: 'Server error: ' + error.message });
    }
};

/**
 * Verify that the request is coming from an admin user
 */
async function verifyAdminAccess(req) {
    try {
        // Get the Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new Error('No valid authorization header found');
        }

        // Extract the token
        const token = authHeader.split(' ')[1];
        if (!token) {
            throw new Error('No token provided');
        }

        // Verify the token
        const secret = process.env.JWT_SECRET || 'patriot-thanks-secret-key';
        const decoded = jwt.verify(token, secret);

        // Check if user exists and is an admin
        const user = await User.findById(decoded.userId);
        if (!user) {
            throw new Error('User not found');
        }

        // Check if user is an admin
        return user.level === 'Admin' || user.isAdmin === true;
    } catch (error) {
        console.error('Admin verification error:', error);
        throw error;
    }
}

/**
 * Handle listing all incentives for admin dashboard
 */
async function handleListIncentives(req, res) {
    console.log("Admin list incentives API hit");
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
                { is_available: searchRegex },
                { type: searchRegex },
                { amount: searchRegex },
                { information: searchRegex },
                { other_description: searchRegex }
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
        const total = await Incentive.countDocuments(query);

        // Find businesses with pagination
        const incentives = await Incentive.find(query)
            .sort({ created_at: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        // Calculate total pages
        const totalPages = Math.ceil(total / limit);

        return res.status(200).json({
            incentives,
            total,
            page,
            limit,
            totalPages
        });
    } catch (error) {
        console.error('Error listing incentives:', error);
        return res.status(500).json({ message: 'Server error during incentive listing: ' + error.message });
    }
    // try {
    //     // Parse pagination parameters
    //     const page = parseInt(req.query.page) || 1;
    //     const limit = parseInt(req.query.limit) || 10;
    //     const skip = (page - 1) * limit;
    //
    //     // Build filter object
    //     const filter = {};
    //
    //     // Add business filter if provided
    //     if (req.query.business_id) {
    //         filter.business_id = req.query.business_id;
    //     }
    //
    //     // Add type filter if provided
    //     if (req.query.type) {
    //         filter.type = req.query.type;
    //     }
    //
    //     // Add availability filter if provided
    //     if (req.query.is_available !== undefined) {
    //         filter.is_available = req.query.is_available === 'true';
    //     }
    //
    //     // Add search filter if provided
    //     if (req.query.search) {
    //         const searchRegex = new RegExp(req.query.search, 'i');
    //         filter.$or = [
    //             { information: searchRegex },
    //             { other_description: searchRegex }
    //         ];
    //     }
    //
    //     // Count total incentives matching the filter
    //     const total = await Incentive.countDocuments(filter);
    //
    //     // Execute the query with pagination
    //     const incentives = await Incentive.find(filter)
    //         .sort({ created_at: -1 })
    //         .skip(skip)
    //         .limit(limit)
    //         .exec();
    //
    //     // Get business information for each incentive
    //     const enrichedIncentives = await Promise.all(incentives.map(async (incentive) => {
    //         const incentiveObj = incentive.toObject();
    //
    //         // Look up business name if business_id is present
    //         if (incentive.business_id) {
    //             try {
    //                 const business = await Business.findById(incentive.business_id);
    //                 if (business) {
    //                     incentiveObj.businessName = business.bname;
    //                 }
    //             } catch (error) {
    //                 console.error(`Error fetching business data for incentive ${incentive._id}:`, error);
    //             }
    //         }
    //
    //         return incentiveObj;
    //     }));
    //
    //     // Return the results
    //     return res.status(200).json({
    //         message: 'Incentives retrieved successfully',
    //         incentives: enrichedIncentives,
    //         total,
    //         page,
    //         limit,
    //         totalPages: Math.ceil(total / limit)
    //     });
    // } catch (error) {
    //     console.error('Error in handleListIncentives:', error);
    //     return res.status(500).json({ message: 'Error retrieving incentives', error: error.message });
    // }
}

/**
 * Handle getting a single incentive by ID
 */
async function handleGetIncentive(req, res) {
    console.log("Admin get incentive API hit");

    try {
        const { incentiveId } = req.query;

        if (!incentiveId) {
            return res.status(400).json({ message: 'Incentive ID is required' });
        }

        // Find the incentive
        const incentive = await Incentive.findById(incentiveId).exec();

        if (!incentive) {
            return res.status(404).json({ message: 'Incentive not found' });
        }

        // Convert to plain object for modification
        const incentiveObj = incentive.toObject();

        // Look up business name
        if (incentive.business_id) {
            try {
                const business = await Business.findById(incentive.business_id);
                if (business) {
                    incentiveObj.businessName = business.bname;
                }
            } catch (error) {
                console.error(`Error fetching business data for incentive ${incentiveId}:`, error);
            }
        }

        return res.status(200).json({
            message: 'Incentive retrieved successfully',
            incentive: incentiveObj
        });
    } catch (error) {
        console.error('Error in handleGetIncentive:', error);
        return res.status(500).json({ message: 'Error retrieving incentive', error: error.message });
    }
}

/**
 * Handle updating an existing incentive
 */
async function handleUpdateIncentive(req, res) {
    console.log("Admin update incentive API hit");

    try {
        const { incentiveId, business_id, is_available, type, amount, information, other_description } = req.body;

        if (!incentiveId) {
            return res.status(400).json({ message: 'Incentive ID is required' });
        }

        // Find the incentive
        const incentive = await Incentive.findById(incentiveId).exec();

        if (!incentive) {
            return res.status(404).json({ message: 'Incentive not found' });
        }

        // Update the incentive fields
        if (business_id !== undefined) incentive.business_id = business_id;
        if (is_available !== undefined) incentive.is_available = is_available;
        if (type !== undefined) incentive.type = type;
        if (amount !== undefined) incentive.amount = parseFloat(amount) || 0;
        if (information !== undefined) incentive.information = information;

        // Handle other_description field
        if (type === 'OT') {
            incentive.other_description = other_description || '';
        } else {
            // Clear other_description if type is not 'OT'
            incentive.other_description = '';
        }

        // Update timestamps
        incentive.updated_at = new Date();

        // Save the updated incentive
        await incentive.save();

        return res.status(200).json({
            message: 'Incentive updated successfully',
            incentiveId
        });
    } catch (error) {
        console.error('Error in handleUpdateIncentive:', error);
        return res.status(500).json({ message: 'Error updating incentive', error: error.message });
    }
}

/**
 * Handle deleting an incentive
 */
async function handleDeleteIncentive(req, res) {
    console.log("Admin delete incentive API hit");

    try {
        const { incentiveId } = req.body;

        if (!incentiveId) {
            return res.status(400).json({ message: 'Incentive ID is required' });
        }

        // Find and delete the incentive
        const result = await Incentive.findByIdAndDelete(incentiveId).exec();

        if (!result) {
            return res.status(404).json({ message: 'Incentive not found' });
        }

        return res.status(200).json({
            message: 'Incentive deleted successfully',
            incentiveId
        });
    } catch (error) {
        console.error('Error in handleDeleteIncentive:', error);
        return res.status(500).json({ message: 'Error deleting incentive', error: error.message });
    }
}
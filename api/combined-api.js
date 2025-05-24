// api/combined-api.js - Combined API endpoints for admin operations
// This file combines admin-codes.js, admin-incentives.js, and incentives.js

const connect = require('../config/db');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { ObjectId } = mongoose.Types;

// Initialize models with error handling
let User, AdminCode, Business, Incentive;

try {
    User = mongoose.model('User');
    AdminCode = mongoose.model('AdminCode');
    Business = mongoose.model('Business');
    Incentive = mongoose.model('Incentive');
} catch (error) {
    // Define schemas if models aren't registered yet

    // AdminCode schema
    const adminCodeSchema = new mongoose.Schema({
        code: String,
        description: String,
        expiration: Date,
        created_at: { type: Date, default: Date.now }
    });

    // User schema (simplified version)
    const userSchema = new mongoose.Schema({
        fname: String,
        lname: String,
        email: String,
        password: String,
        isAdmin: Boolean,
        level: String
    });

    // Initialize models that aren't already registered
    if (!AdminCode) {
        try {
            AdminCode = mongoose.model('AdminCode');
        } catch (error) {
            AdminCode = mongoose.model('AdminCode', adminCodeSchema, 'admin_codes');
        }
    }

    if (!User) {
        try {
            User = mongoose.model('User');
        } catch (error) {
            User = mongoose.model('User', userSchema, 'users');
        }
    }

    // Try to import models for Business and Incentive
    try {
        if (!Business) Business = require('../models/Business');
        if (!Incentive) Incentive = require('../models/Incentive');
    } catch (importError) {
        console.error('Error importing Business or Incentive models:', importError);
    }
}

/**
 * Helper to verify admin access
 */
async function verifyAdminAccess(req) {
    // Get token from request headers
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { success: false, status: 401, message: 'Authorization required' };
    }

    const token = authHeader.split(' ')[1];

    // Verify token and check admin status
    let userId;
    try {
        // Using JWT from auth.js
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'patriot-thanks-secret-key');
        userId = decoded.userId;
    } catch (error) {
        console.error("Token verification error:", error);
        return { success: false, status: 401, message: 'Invalid or expired token' };
    }

    // Connect to MongoDB
    try {
        await connect;
    } catch (dbError) {
        console.error("Database connection error:", dbError);
        return {
            success: false,
            status: 500,
            message: 'Database connection error',
            error: dbError.message
        };
    }

    // Check if user exists and is admin
    const user = await User.findById(userId);

    if (!user) {
        return { success: false, status: 404, message: 'User not found' };
    }

    if (user.level !== 'Admin' && user.isAdmin !== true) {
        return { success: false, status: 403, message: 'Admin access required' };
    }

    return { success: true, userId, user };
}

/**
 * Main API handler
 */
module.exports = async (req, res) => {
    // Handle OPTIONS request for CORS
    if (req.method === 'OPTIONS') {
        res.setHeader('Allow', 'GET, POST, PUT, DELETE, OPTIONS');
        return res.status(200).end();
    }

    // Parse the path to determine the endpoint
    const url = req.url || '';
    const pathParts = url.split('?')[0].split('/').filter(Boolean);

    // Extract operation from query params
    const { operation } = req.query;

    console.log(`Combined API hit: path=${pathParts.join('/')}, operation=${operation || 'none'}, method=${req.method}`);

    try {
        // Branch based on the operation if specified
        if (operation) {
            switch (operation.toLowerCase()) {
                case 'admin-codes':
                    return await handleAdminCodes(req, res, req.query.action || 'list');
                case 'admin-incentives':
                    return await handleAdminIncentives(req, res, req.query.action);
                case 'incentives':
                    // UPDATED: Use the enhanced incentive handler
                    return await handleGetUserIncentives(req, res);
                case 'get_chain_incentives':
                case 'chain_incentives':
                    // UPDATED: Use the enhanced chain incentive handler
                    return await handleGetChainIncentives(req, res);
                // Other operations as needed
            }
        }

        // If no operation or unrecognized, try to determine from the path
        const mainPath = pathParts[0]?.toLowerCase();
        switch (mainPath) {
            case 'admin-codes':
                return await handleAdminCodes(req, res, operation);
            case 'admin-incentives':
                return await handleAdminIncentives(req, res, operation);
            case 'incentives':
                // UPDATED: Use the enhanced incentive handler
                return await handleGetUserIncentives(req, res);
            case 'chains':
                // UPDATED: Use the enhanced chain incentive handler
                return await handleGetChainIncentives(req, res);
            default:
                return res.status(404).json({ message: 'Endpoint not found' });
        }
    } catch (error) {
        console.error(`Error in combined API:`, error);
        return res.status(500).json({ message: 'Server error: ' + error.message });
    }
};


/***************************
 * CHAIN INCENTIVES HANDLERS - FIXED FOR DEDICATED CHAINS API
 ***************************/

/**
 * Handle chain incentives operations - Now delegates to dedicated chains API
 */
async function handleChainIncentives(req, res) {
    console.log("Chain incentives API hit (delegating to chains.js):", req.method);
    console.log("Query parameters:", req.query);

    try {
        // Import the dedicated chains API handler
        const chainsHandler = require('./chains.js');

        // Delegate to the dedicated chains API
        return await chainsHandler(req, res);

    } catch (error) {
        console.error('Error delegating to chains API:', error);

        // Fallback: Try to handle chain incentives directly if chains.js is not available
        try {
            await connect;

            const { chain_id } = req.query;
            if (!chain_id) {
                return res.status(400).json({
                    message: 'Chain ID is required',
                    error: 'Missing chain_id parameter'
                });
            }

            console.log(`Fallback: Fetching chain incentives for chain_id: ${chain_id}`);

            // Try to use Chain model if available
            let Chain;
            try {
                Chain = mongoose.model('Chain');
            } catch (modelError) {
                // If Chain model doesn't exist, try to find incentives by business_id
                const chainIncentives = await Incentive.find({
                    business_id: chain_id,
                    is_available: true
                }).lean();

                const formattedIncentives = chainIncentives.map(incentive => ({
                    _id: incentive._id,
                    is_active: incentive.is_available,
                    type: incentive.type,
                    amount: incentive.amount,
                    information: incentive.information,
                    other_description: incentive.other_description,
                    created_at: incentive.created_at,
                    discount_type: incentive.discount_type || 'percentage'
                }));

                return res.status(200).json({
                    success: true,
                    incentives: formattedIncentives,
                    chain_id: chain_id
                });
            }

            // Use the Chain model to get embedded incentives
            const chain = await Chain.findById(chain_id).select('incentives chain_name').lean();
            if (!chain) {
                return res.status(404).json({ message: 'Chain not found' });
            }

            // Filter for active incentives only
            const activeIncentives = chain.incentives ?
                chain.incentives.filter(incentive => incentive.is_active !== false) : [];

            console.log(`Fallback: Found ${activeIncentives.length} active incentives for chain: ${chain.chain_name}`);

            return res.status(200).json({
                success: true,
                incentives: activeIncentives,
                chain_name: chain.chain_name
            });

        } catch (fallbackError) {
            console.error('Fallback chain incentives handler failed:', fallbackError);
            return res.status(500).json({
                message: 'Error retrieving chain incentives',
                error: fallbackError.message
            });
        }
    }
}

/***************************
 * ADMIN CODES HANDLERS
 ***************************/

/**
 * Handle admin codes operations
 */
async function handleAdminCodes(req, res, operation) {
    try {
        // First verify admin access for all operations
        const adminCheck = await verifyAdminAccess(req);
        if (!adminCheck.success) {
            return res.status(adminCheck.status).json({ message: adminCheck.message });
        }

        // Route to appropriate handler based on operation
        switch (operation) {
            case 'list':
                return await handleListCodes(req, res);
            case 'create':
                return await handleCreateCode(req, res);
            case 'delete':
                return await handleDeleteCode(req, res);
            default:
                return res.status(400).json({ message: 'Invalid operation for admin-codes' });
        }
    } catch (error) {
        console.error(`Error in admin codes:`, error);
        return res.status(500).json({ message: 'Server error: ' + error.message });
    }
}

/**
 * Handle listing all admin codes
 */
async function handleListCodes(req, res) {
    try {
        // Connect to MongoDB
        await connect;

        // Get all codes, sorted by creation date (newest first)
        const codes = await AdminCode.find({})
            .sort({ created_at: -1 })
            .lean();

        return res.status(200).json({ codes });
    } catch (error) {
        console.error("Error listing admin codes:", error);
        return res.status(500).json({ message: 'Error retrieving admin codes: ' + error.message });
    }
}

/**
 * Handle creating a new admin code
 */
async function handleCreateCode(req, res) {
    try {
        // Extract code data from request body
        const { code, description, expiration } = req.body;

        // Basic validation
        if (!code || !description) {
            return res.status(400).json({ message: 'Code and description are required' });
        }

        // Connect to MongoDB
        await connect;

        // Check if code already exists
        const existingCode = await AdminCode.findOne({ code });
        if (existingCode) {
            return res.status(409).json({ message: 'An access code with this value already exists' });
        }

        // Prepare new code document
        const newCode = new AdminCode({
            code,
            description,
            expiration: expiration ? new Date(expiration) : null,
            created_at: new Date()
        });

        // Save to database
        await newCode.save();

        return res.status(201).json({
            message: 'Admin access code created successfully',
            code: newCode
        });
    } catch (error) {
        console.error("Error creating admin code:", error);
        return res.status(500).json({ message: 'Error creating admin code: ' + error.message });
    }
}

/**
 * Handle deleting an admin code
 */
async function handleDeleteCode(req, res) {
    try {
        // Extract code ID from request body
        const { codeId } = req.body;

        // Basic validation
        if (!codeId) {
            return res.status(400).json({ message: 'Code ID is required' });
        }

        // Connect to MongoDB
        await connect;

        // Delete the code
        const result = await AdminCode.findByIdAndDelete(codeId);

        if (!result) {
            return res.status(404).json({ message: 'Admin code not found' });
        }

        return res.status(200).json({
            message: 'Admin access code deleted successfully',
            codeId
        });
    } catch (error) {
        console.error("Error deleting admin code:", error);
        return res.status(500).json({ message: 'Error deleting admin code: ' + error.message });
    }
}

/***************************
 * ADMIN INCENTIVES HANDLERS
 ***************************/

/**
 * Handle admin incentives operations
 */
async function handleAdminIncentives(req, res, operation) {
    try {
        // Special case for incentive updates - allow without admin check
        if (req.method === 'PUT' && operation === 'update') {
            // Handle incentive update without requiring admin status
            return await handleUpdateIncentive(req, res);
        }

        // For all other operations, verify admin status
        try {
            const adminCheck = await verifyAdminAccess(req);
            if (!adminCheck.success) {
                return res.status(adminCheck.status).json({ message: adminCheck.message });
            }
        } catch (authError) {
            console.error('Admin authentication error:', authError);
            return res.status(401).json({ message: 'Authentication required' });
        }

        // Continue with admin-only operations
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
            // Handle new incentive creation
            return await handleCreateIncentive(req, res);
        } else if (req.method === 'DELETE' && operation === 'delete') {
            // Handle incentive deletion
            return await handleDeleteIncentive(req, res);
        } else {
            return res.status(400).json({ message: 'Invalid operation or HTTP method for admin-incentives' });
        }
    } catch (error) {
        console.error(`Error in admin incentives:`, error);
        return res.status(500).json({ message: 'Server error: ' + error.message });
    }
}

/**
 * Handle listing all incentives for admin dashboard
 */
async function handleListIncentives(req, res) {
    console.log("Admin list incentives API hit");
    try {
        // Parse pagination parameters
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Build filter object
        const filter = {};

        // Add business filter if provided
        if (req.query.business_id) {
            filter.business_id = req.query.business_id;
        }

        // Add type filter if provided
        if (req.query.type) {
            filter.type = req.query.type;
        }

        // Add availability filter if provided
        if (req.query.is_available !== undefined) {
            filter.is_available = req.query.is_available === 'true';
        }

        // Add date filter if provided
        if (req.query.created_after) {
            filter.created_at = { $gte: new Date(req.query.created_after) };
        }

        // Add search filter if provided
        if (req.query.search) {
            const searchRegex = new RegExp(req.query.search, 'i');
            filter.$or = [
                { information: searchRegex },
                { other_description: searchRegex }
            ];
        }

        // Count total incentives matching the filter
        const total = await Incentive.countDocuments(filter);

        // Execute the query with pagination
        const incentives = await Incentive.find(filter)
            .sort({ created_at: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        // Get business information for each incentive
        const enrichedIncentives = await Promise.all(incentives.map(async (incentive) => {
            const incentiveObj = incentive;

            // Look up business name if business_id is present
            if (incentive.business_id) {
                try {
                    const business = await Business.findById(incentive.business_id);
                    if (business) {
                        incentiveObj.businessName = business.bname;
                    }
                } catch (error) {
                    console.error(`Error fetching business data for incentive ${incentive._id}:`, error);
                }
            }

            return incentiveObj;
        }));

        // Return the results
        return res.status(200).json({
            incentives: enrichedIncentives,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error('Error in handleListIncentives:', error);
        return res.status(500).json({ message: 'Error retrieving incentives', error: error.message });
    }
}

/**
 * Handle creating a new incentive
 */
async function handleCreateIncentive(req, res) {
    console.log("Admin create incentive API hit");

    try {
        const { business_id, is_available, type, amount, information, other_description } = req.body;

        // Validate required fields
        if (!business_id) {
            return res.status(400).json({ message: 'Business ID is required' });
        }

        if (!type) {
            return res.status(400).json({ message: 'Incentive type is required' });
        }

        // Create the new incentive
        const newIncentive = new Incentive({
            business_id,
            is_available: is_available !== undefined ? is_available : true,
            type,
            amount: parseFloat(amount) || 0,
            information: information || '',
            other_description: type === 'OT' ? (other_description || '') : '',
            created_at: new Date(),
            updated_at: new Date()
        });

        // Save to database
        const result = await newIncentive.save();

        return res.status(201).json({
            message: 'Incentive created successfully',
            incentiveId: result._id
        });
    } catch (error) {
        console.error('Error in handleCreateIncentive:', error);
        return res.status(500).json({ message: 'Error creating incentive', error: error.message });
    }
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
        const incentive = await Incentive.findById(incentiveId).lean();

        if (!incentive) {
            return res.status(404).json({ message: 'Incentive not found' });
        }

        // Look up business name
        if (incentive.business_id) {
            try {
                const business = await Business.findById(incentive.business_id);
                if (business) {
                    incentive.businessName = business.bname;
                }
            } catch (error) {
                console.error(`Error fetching business data for incentive ${incentiveId}:`, error);
            }
        }

        return res.status(200).json({
            incentive
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
    console.log("Update incentive API hit");

    try {
        const { incentiveId, business_id, is_available, type, amount, information, other_description, updated_by, discount_type } = req.body;

        if (!incentiveId) {
            return res.status(400).json({ message: 'Incentive ID is required' });
        }

        // Create update object
        const updateData = {};

        if (business_id !== undefined) updateData.business_id = business_id;
        if (is_available !== undefined) updateData.is_available = is_available;
        if (type !== undefined) updateData.type = type;
        if (amount !== undefined) updateData.amount = parseFloat(amount) || 0;
        if (information !== undefined) updateData.information = information;
        if (updated_by !== undefined) updateData.updated_by = updated_by;
        if (discount_type !== undefined) updateData.discount_type = discount_type;

        // Handle other_description field
        if (type === 'OT') {
            updateData.other_description = other_description || '';
        } else if (type !== undefined) {
            // Clear other_description if type is not 'OT'
            updateData.other_description = '';
        }

        // Update timestamps
        updateData.updated_at = new Date();

        // Update the incentive
        const result = await Incentive.findByIdAndUpdate(
            incentiveId,
            { $set: updateData },
            { new: true }
        );

        if (!result) {
            return res.status(404).json({ message: 'Incentive not found' });
        }

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
        const result = await Incentive.findByIdAndDelete(incentiveId);

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

/***************************
 * REGULAR INCENTIVES HANDLERS - ENHANCED WITH CHAIN SUPPORT
 ***************************/

/**
 * Handle regular incentives operations
 */
async function handleIncentives(req, res, operation) {
    console.log("Incentives API hit:", req.method);
    console.log("Full URL:", req.url);
    console.log("Query parameters:", req.query);

    try {
        // Connect to MongoDB
        try {
            await connect;
            console.log("Database connection established");
        } catch (dbError) {
            console.error("Database connection error:", dbError);
            return res.status(500).json({ message: 'Database connection error', error: dbError.message });
        }

        // If it's a POST request, assume it's an add operation
        if (req.method === 'POST') {
            return await handleAddIncentive(req, res);
        }
        // If it's a GET request with operation=add, it's just checking availability
        else if (req.method === 'GET' && operation === 'add') {
            return res.status(200).json({ message: 'Incentives Add API is available' });
        }
        // If it's a DELETE request or operation=delete
        else if (req.method === 'DELETE' || operation === 'delete') {
            return await handleDeleteUserIncentive(req, res);
        }
        // If it's a GET request (with or without operation=get), retrieve incentives
        else if (req.method === 'GET') {
            return await handleGetUserIncentives(req, res);
        }
        else {
            return res.status(405).json({ message: 'Method not allowed' });
        }
    } catch (error) {
        console.error(`Error in incentives API:`, error);
        return res.status(500).json({ message: 'Server error: ' + error.message });
    }
}

/**
 * ENHANCED: Handle GET request for retrieving incentives for a business with proper chain support
 */
async function handleGetUserIncentives(req, res) {
    console.log("🎁 ENHANCED INCENTIVES: Getting user incentives with chain inheritance");
    console.log("Query parameters:", req.query);

    // Get the business ID from the query parameters
    const businessId = req.query.business_id;
    const chainId = req.query.chain_id;

    if (!businessId && !chainId) {
        return res.status(400).json({ message: 'Business ID or Chain ID is required as a query parameter' });
    }

    let incentives = [];
    let chainInfo = null;

    // Check if this is a Google Places result (not in our database)
    if (businessId && (businessId.startsWith('google_') || businessId.startsWith('place_'))) {
        console.log("📍 GOOGLE PLACES: Handling Google Places result");
        // For Places API results, we need chain ID to get incentives
        if (chainId) {
            // Get chain-wide incentives using chains API
            try {
                const Chain = mongoose.model('Chain');
                const chainDetails = await Chain.findById(chainId);

                if (chainDetails && chainDetails.incentives) {
                    const chainIncentives = chainDetails.incentives
                        .filter(incentive => incentive.is_active)
                        .map(incentive => ({
                            _id: incentive._id,
                            is_available: incentive.is_active,
                            type: incentive.type,
                            amount: incentive.amount,
                            information: incentive.information,
                            other_description: incentive.other_description,
                            created_at: incentive.created_date,
                            discount_type: 'percentage',
                            is_chain_wide: true
                        }));

                    incentives = [...chainIncentives];
                    console.log(`🔗 Found ${incentives.length} chain incentives for Google Places result`);
                }
            } catch (error) {
                console.error("❌ Error getting chain incentives for Google Places:", error);
            }
        }

        return res.status(200).json({
            message: 'Chain incentives retrieved for Google Places result',
            results: incentives
        });
    }

    // For businesses in our database:
    console.log(`🏢 DATABASE BUSINESS: Getting incentives for business ${businessId}`);

    try {
        // Get the business details first
        const business = await Business.findById(businessId).lean();

        if (!business) {
            return res.status(404).json({ message: 'Business not found' });
        }

        console.log(`📊 Business details for incentives:`);
        console.log(`   - Name: ${business.bname}`);
        console.log(`   - Chain ID: ${business.chain_id || 'None'}`);
        console.log(`   - Universal Incentives: ${business.universal_incentives}`);
        console.log(`   - Is Chain Location: ${business.is_chain_location || false}`);

        // ENHANCED LOGIC: Check for chain incentives if universal_incentives is enabled
        if (business.chain_id && business.universal_incentives) {
            console.log(`🔗 CHAIN INHERITANCE: Loading chain incentives for ${business.bname}`);

            try {
                // Get chain details and incentives
                const Chain = mongoose.model('Chain');
                const chainDetails = await Chain.findById(business.chain_id);

                if (chainDetails) {
                    chainInfo = {
                        id: chainDetails._id,
                        name: chainDetails.chain_name,
                        universal_incentives: chainDetails.universal_incentives
                    };

                    console.log(`   - Chain: ${chainDetails.chain_name}`);
                    console.log(`   - Chain Universal Incentives: ${chainDetails.universal_incentives}`);
                    console.log(`   - Chain Incentives Count: ${chainDetails.incentives ? chainDetails.incentives.length : 0}`);

                    if (chainDetails.incentives && chainDetails.incentives.length > 0) {
                        // Convert chain incentives to standard format
                        const chainIncentives = chainDetails.incentives
                            .filter(incentive => incentive.is_active)
                            .map(incentive => ({
                                _id: incentive._id,
                                business_id: businessId, // Associate with this location
                                is_available: incentive.is_active,
                                type: incentive.type,
                                amount: incentive.amount,
                                information: incentive.information,
                                other_description: incentive.other_description,
                                created_at: incentive.created_date,
                                discount_type: 'percentage',
                                is_chain_wide: true // Mark as chain-wide
                            }));

                        incentives = [...chainIncentives];
                        console.log(`✅ CHAIN INCENTIVES: Found ${incentives.length} active chain incentives`);
                    } else {
                        console.log(`❌ No active chain incentives found in chain`);
                    }
                } else {
                    console.log(`❌ Chain details not found for ID: ${business.chain_id}`);
                }
            } catch (chainError) {
                console.error("❌ Error loading chain incentives:", chainError);
            }
        }

        // ALSO check for location-specific incentives (they can coexist with chain incentives)
        try {
            const locationIncentives = await Incentive.find({
                business_id: businessId,
                is_available: true
            }).lean();

            if (locationIncentives.length > 0) {
                console.log(`📍 Found ${locationIncentives.length} location-specific incentives`);

                // Mark location incentives and add them
                const markedLocationIncentives = locationIncentives.map(incentive => ({
                    ...incentive,
                    is_chain_wide: false // Mark as location-specific
                }));

                incentives = [...incentives, ...markedLocationIncentives];
            }

        } catch (locationError) {
            console.error("❌ Error loading location-specific incentives:", locationError);
        }

        // If no incentives found, try fallback methods
        if (incentives.length === 0) {
            console.log(`⚠️ No incentives found for business ${business.bname}`);

            // If business has chain_id but universal_incentives is false, flag this as a potential issue
            if (business.chain_id && !business.universal_incentives) {
                console.log(`🔧 POTENTIAL FIX NEEDED: Business has chain_id but universal_incentives is false`);
                console.log(`   - Business: ${business.bname}`);
                console.log(`   - Chain ID: ${business.chain_id}`);
                console.log(`   - Consider running the database fix script to correct this`);
            }
        }

        // Return the incentives
        return res.status(200).json({
            message: incentives.length > 0 ? 'Incentives retrieved successfully' : 'No incentives found for this business',
            results: incentives,
            chain_info: chainInfo,
            business_info: {
                name: business.bname,
                has_chain: !!business.chain_id,
                universal_incentives: business.universal_incentives,
                chain_name: business.chain_name
            }
        });

    } catch (error) {
        console.error("❌ Error in enhanced getUserIncentives:", error);
        return res.status(500).json({
            success: false,
            message: 'Error retrieving incentives: ' + error.message
        });
    }
}

async function handleGetChainIncentives(req, res) {
    console.log("🔗 CHAIN INCENTIVES: Getting incentives by chain ID");

    const chainId = req.query.chain_id;

    if (!chainId) {
        return res.status(400).json({ message: 'Chain ID is required as a query parameter' });
    }

    try {
        const Chain = mongoose.model('Chain');
        const chainDetails = await Chain.findById(chainId);

        if (!chainDetails) {
            return res.status(404).json({ message: 'Chain not found' });
        }

        console.log(`📊 Chain: ${chainDetails.chain_name}`);
        console.log(`   - Universal Incentives: ${chainDetails.universal_incentives}`);
        console.log(`   - Total Incentives: ${chainDetails.incentives ? chainDetails.incentives.length : 0}`);

        if (!chainDetails.incentives || chainDetails.incentives.length === 0) {
            return res.status(200).json({
                message: 'No incentives found for this chain',
                results: [],
                chain_info: {
                    name: chainDetails.chain_name,
                    universal_incentives: chainDetails.universal_incentives
                }
            });
        }

        // Convert chain incentives to standard format
        const chainIncentives = chainDetails.incentives
            .filter(incentive => incentive.is_active)
            .map(incentive => ({
                _id: incentive._id,
                is_available: incentive.is_active,
                type: incentive.type,
                amount: incentive.amount,
                information: incentive.information,
                other_description: incentive.other_description,
                created_at: incentive.created_date,
                discount_type: 'percentage',
                is_chain_wide: true
            }));

        return res.status(200).json({
            message: 'Chain incentives retrieved successfully',
            results: chainIncentives,
            chain_info: {
                name: chainDetails.chain_name,
                universal_incentives: chainDetails.universal_incentives
            }
        });

    } catch (error) {
        console.error("❌ Error getting chain incentives:", error);
        return res.status(500).json({
            success: false,
            message: 'Error retrieving chain incentives: ' + error.message
        });
    }
}

/**
 * Handle POST request for adding a new incentive
 */
async function handleAddIncentive(req, res) {
    console.log("Incentives add API hit:", req.method);
    console.log("Request body:", req.body);

    // Extract incentive data from request body
    const incentiveData = req.body;

    // Basic validation
    if (!incentiveData.business_id) {
        return res.status(400).json({ message: 'Business ID is required' });
    }

    // Check if the business exists
    const business = await Business.findById(incentiveData.business_id).exec();
    if (!business) {
        return res.status(404).json({ message: 'Business not found' });
    }

    // Prepare incentive data for insertion
    const newIncentive = new Incentive({
        business_id: incentiveData.business_id,
        is_available: incentiveData.is_available,
        type: incentiveData.type || '',
        amount: parseFloat(incentiveData.amount) || 0,
        information: incentiveData.information || '',
        created_by: incentiveData.created_by || null,
        created_at: new Date(),
        updated_at: new Date()
    });

    // Add the other_description field if provided
    if (incentiveData.type === 'OT' && incentiveData.other_description) {
        newIncentive.other_description = incentiveData.other_description;
    }

    // Insert incentive data
    const savedIncentive = await newIncentive.save();
    console.log("Saved incentive:", savedIncentive._id);

    // Return success response
    return res.status(201).json({
        message: 'Incentive added successfully',
        incentiveId: savedIncentive._id
    });
}

/**
 * Handle DELETE request for removing an incentive
 */
async function handleDeleteUserIncentive(req, res) {
    console.log("Delete Incentive API hit:", req.method);
    console.log("Query parameters:", req.query);
    console.log("Request body:", req.body);

    // Get incentive ID from query params or body
    const incentiveId = req.query.id || (req.body && req.body.incentive_id);

    if (!incentiveId) {
        return res.status(400).json({ message: 'Incentive ID is required' });
    }

    // Check if incentive exists
    const existingIncentive = await Incentive.findById(incentiveId);
    if (!existingIncentive) {
        return res.status(404).json({ message: 'Incentive not found' });
    }

    // Delete the incentive
    await Incentive.findByIdAndDelete(incentiveId);
    console.log(`Deleted incentive ${incentiveId}`);

    // Return success response
    return res.status(200).json({
        message: 'Incentive deleted successfully',
        incentiveId: incentiveId
    });
}
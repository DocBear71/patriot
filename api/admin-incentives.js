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
    status: { type: String, default: 'active' },
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
    isAdmin: Boolean,
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
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
    User = mongoose.model('User', userSchema, 'users');
}

/**
 * Main API handler for admin incentive operations
 */
module.exports = async (req, res) => {
    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Connect to MongoDB
    try {
        await connect;
        console.log("Database connection established");
    } catch (dbError) {
        console.error("Database connection error:", dbError);
        return res.status(500).json({ message: 'Database connection error', error: dbError.message });
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
            // Handle new incentive creation
            return await handleCreateIncentive(req, res);
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
    console.log("Admin update incentive API hit");

    try {
        const { incentiveId, business_id, is_available, type, amount, information, other_description, updated_by } = req.body;

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
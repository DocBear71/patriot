// api/chains.js - New dedicated chains API
const connect = require('../config/db');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { ObjectId } = mongoose.Types;

// Import existing models
let User, Business, Incentive;

try {
    User = require('../models/User');
    Business = require('../models/Business');
    Incentive = require('../models/Incentive');
} catch (error) {
    console.warn('Error importing models:', error.message);
    // Models will be initialized later if not available
}

// NEW: Chain model for separate collection
let Chain;

const chainSchema = new mongoose.Schema({
    chain_name: { type: String, required: true, trim: true },
    business_type: { type: String, required: true },
    universal_incentives: { type: Boolean, default: true },
    status: { type: String, default: 'active', enum: ['active', 'inactive'] },

    // Corporate information (optional)
    corporate_info: {
        headquarters: String,
        website: String,
        phone: String,
        description: String
    },

    // Chain-wide incentives stored directly in the chain document
    incentives: [{
        type: { type: String, required: true, enum: ['VT', 'AD', 'FR', 'SP', 'OT'] },
        amount: { type: Number, required: true, min: 0, max: 100 },
        description: String,
        other_description: String, // For "OT" type
        information: String,
        is_active: { type: Boolean, default: true },
        created_date: { type: Date, default: Date.now },
        created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    }],

    // Metadata
    created_date: { type: Date, default: Date.now },
    updated_date: { type: Date, default: Date.now },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

// Create indexes for better performance
chainSchema.index({ chain_name: 1 });
chainSchema.index({ business_type: 1 });
chainSchema.index({ status: 1 });
chainSchema.index({ 'incentives.type': 1 });

// Initialize Chain model
try {
    Chain = mongoose.model('Chain');
} catch (error) {
    Chain = mongoose.model('Chain', chainSchema, 'patriot_thanks_chains');
}

/**
 * Helper to verify admin access
 */
async function verifyAdminAccess(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { success: false, status: 401, message: 'Authorization required' };
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'patriot-thanks-secret-key');
        await connect;

        const user = await User.findById(decoded.userId);
        if (!user || (user.level !== 'Admin' && user.isAdmin !== true)) {
            return { success: false, status: 403, message: 'Admin access required' };
        }

        return { success: true, userId: decoded.userId, user };
    } catch (error) {
        return { success: false, status: 401, message: 'Invalid or expired token' };
    }
}

/**
 * Main API handler
 */
module.exports = async (req, res) => {
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const { operation } = req.query;
    console.log(`Chains API called with operation: ${operation || 'none'}, method: ${req.method}`);

    try {
        await connect;

        switch (operation) {
            case 'list':
                return await handleListChains(req, res);
            case 'get':
                return await handleGetChain(req, res);
            case 'create':
                return await handleCreateChain(req, res);
            case 'update':
                return await handleUpdateChain(req, res);
            case 'delete':
                return await handleDeleteChain(req, res);
            case 'add_incentive':
                return await handleAddChainIncentive(req, res);
            case 'remove_incentive':
                return await handleRemoveChainIncentive(req, res);
            case 'get_incentives':
                return await handleGetChainIncentives(req, res);
            case 'add_location':
                return await handleAddLocationToChain(req, res);
            case 'remove_location':
                return await handleRemoveLocationFromChain(req, res);
            case 'get_locations':
                return await handleGetChainLocations(req, res);
            case 'search':
                return await handleSearchChains(req, res);
            case 'find_match':
                return await handleFindChainMatch(req, res);
            default:
                if (req.method === 'GET') {
                    return res.status(200).json({
                        message: 'Chains API is available',
                        operations: [
                            'list', 'get', 'create', 'update', 'delete',
                            'add_incentive', 'remove_incentive', 'get_incentives',
                            'search', 'add_location', 'remove_location', 'get_locations'
                        ]
                    });
                }
                return res.status(400).json({ message: 'Invalid operation' });
        }
    } catch (error) {
        console.error(`Error in chains API (${operation || 'unknown'}):`, error);
        return res.status(500).json({ message: 'Server error: ' + error.message });
    }
};

/**
 * List all chains with location counts
 */
async function handleListChains(req, res) {
    try {
        const chains = await Chain.find({ status: 'active' })
            .sort({ chain_name: 1 })
            .lean();

        // Get location counts for each chain
        const chainsWithCounts = await Promise.all(
            chains.map(async (chain) => {
                const locationCount = await Business.countDocuments({ chain_id: chain._id });
                return {
                    ...chain,
                    location_count: locationCount,
                    incentive_count: chain.incentives ? chain.incentives.filter(i => i.is_active).length : 0
                };
            })
        );

        return res.status(200).json({
            success: true,
            chains: chainsWithCounts
        });
    } catch (error) {
        console.error('Error listing chains:', error);
        return res.status(500).json({ message: 'Error retrieving chains: ' + error.message });
    }
}

/**
 * Get specific chain details with locations
 */
async function handleGetChain(req, res) {
    try {
        const { id } = req.query;
        if (!id) {
            return res.status(400).json({ message: 'Chain ID is required' });
        }

        const chain = await Chain.findById(id).lean();
        if (!chain) {
            return res.status(404).json({ message: 'Chain not found' });
        }

        // Get all locations for this chain
        const locations = await Business.find({ chain_id: id })
            .select('bname address1 address2 city state zip phone')
            .lean();

        return res.status(200).json({
            success: true,
            chain: {
                ...chain,
                locations: locations
            }
        });
    } catch (error) {
        console.error('Error getting chain:', error);
        return res.status(500).json({ message: 'Error retrieving chain: ' + error.message });
    }
}

/**
 * Create new chain
 */
async function handleCreateChain(req, res) {
    const adminCheck = await verifyAdminAccess(req);
    if (!adminCheck.success) {
        return res.status(adminCheck.status).json({ message: adminCheck.message });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { chain_name, business_type, universal_incentives, corporate_info } = req.body;

        if (!chain_name || !business_type) {
            return res.status(400).json({ message: 'Chain name and business type are required' });
        }

        // Check if chain already exists
        const existingChain = await Chain.findOne({
            chain_name: { $regex: new RegExp(`^${chain_name}$`, 'i') }
        });

        if (existingChain) {
            return res.status(409).json({ message: 'Chain with this name already exists' });
        }

        const newChain = new Chain({
            chain_name: chain_name.trim(),
            business_type,
            universal_incentives: universal_incentives !== undefined ? universal_incentives : true,
            corporate_info: corporate_info || {},
            incentives: [],
            created_by: adminCheck.userId,
            updated_by: adminCheck.userId
        });

        const result = await newChain.save();

        return res.status(201).json({
            success: true,
            message: 'Chain created successfully',
            chain: result
        });
    } catch (error) {
        console.error('Error creating chain:', error);
        return res.status(500).json({ message: 'Error creating chain: ' + error.message });
    }
}

/**
 * Update chain
 */
async function handleUpdateChain(req, res) {
    const adminCheck = await verifyAdminAccess(req);
    if (!adminCheck.success) {
        return res.status(adminCheck.status).json({ message: adminCheck.message });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { _id, chain_name, business_type, universal_incentives, corporate_info } = req.body;

        if (!_id) {
            return res.status(400).json({ message: 'Chain ID is required' });
        }

        const updateData = {
            updated_date: new Date(),
            updated_by: adminCheck.userId
        };

        if (chain_name) updateData.chain_name = chain_name.trim();
        if (business_type) updateData.business_type = business_type;
        if (universal_incentives !== undefined) updateData.universal_incentives = universal_incentives;
        if (corporate_info) updateData.corporate_info = corporate_info;

        const result = await Chain.findByIdAndUpdate(_id, updateData, { new: true });

        if (!result) {
            return res.status(404).json({ message: 'Chain not found' });
        }

        return res.status(200).json({
            success: true,
            message: 'Chain updated successfully',
            chain: result
        });
    } catch (error) {
        console.error('Error updating chain:', error);
        return res.status(500).json({ message: 'Error updating chain: ' + error.message });
    }
}

/**
 * Delete chain (removes chain references from businesses)
 */
async function handleDeleteChain(req, res) {
    const adminCheck = await verifyAdminAccess(req);
    if (!adminCheck.success) {
        return res.status(adminCheck.status).json({ message: adminCheck.message });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { _id } = req.body;
        if (!_id) {
            return res.status(400).json({ message: 'Chain ID is required' });
        }

        // Remove chain references from all businesses
        await Business.updateMany(
            { chain_id: _id },
            {
                $unset: {
                    chain_id: 1,
                    chain_name: 1
                }
            }
        );

        // Delete the chain
        const result = await Chain.findByIdAndDelete(_id);

        if (!result) {
            return res.status(404).json({ message: 'Chain not found' });
        }

        return res.status(200).json({
            success: true,
            message: 'Chain deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting chain:', error);
        return res.status(500).json({ message: 'Error deleting chain: ' + error.message });
    }
}

/**
 * Add incentive to chain
 */
async function handleAddChainIncentive(req, res) {
    const adminCheck = await verifyAdminAccess(req);
    if (!adminCheck.success) {
        return res.status(adminCheck.status).json({ message: adminCheck.message });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { chain_id, type, amount, description, other_description, information } = req.body;

        if (!chain_id || !type || amount === undefined) {
            return res.status(400).json({ message: 'Chain ID, type, and amount are required' });
        }

        const newIncentive = {
            _id: new ObjectId(),
            type,
            amount: parseFloat(amount),
            description: description || '',
            other_description: type === 'OT' ? (other_description || '') : '',
            information: information || '',
            is_active: true,
            created_date: new Date(),
            created_by: adminCheck.userId
        };

        const result = await Chain.findByIdAndUpdate(
            chain_id,
            {
                $push: { incentives: newIncentive },
                $set: {
                    updated_date: new Date(),
                    updated_by: adminCheck.userId
                }
            },
            { new: true }
        );

        if (!result) {
            return res.status(404).json({ message: 'Chain not found' });
        }

        return res.status(201).json({
            success: true,
            message: 'Incentive added to chain successfully',
            incentive: newIncentive
        });
    } catch (error) {
        console.error('Error adding chain incentive:', error);
        return res.status(500).json({ message: 'Error adding incentive: ' + error.message });
    }
}

/**
 * Remove incentive from chain
 */
async function handleRemoveChainIncentive(req, res) {
    const adminCheck = await verifyAdminAccess(req);
    if (!adminCheck.success) {
        return res.status(adminCheck.status).json({ message: adminCheck.message });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { chain_id, incentive_id } = req.body;

        if (!chain_id || !incentive_id) {
            return res.status(400).json({ message: 'Chain ID and incentive ID are required' });
        }

        const result = await Chain.findByIdAndUpdate(
            chain_id,
            {
                $pull: { incentives: { _id: incentive_id } },
                $set: {
                    updated_date: new Date(),
                    updated_by: adminCheck.userId
                }
            },
            { new: true }
        );

        if (!result) {
            return res.status(404).json({ message: 'Chain not found' });
        }

        return res.status(200).json({
            success: true,
            message: 'Incentive removed from chain successfully'
        });
    } catch (error) {
        console.error('Error removing chain incentive:', error);
        return res.status(500).json({ message: 'Error removing incentive: ' + error.message });
    }
}

/**
 * UPDATED: Get chain incentives operation to return embedded incentives
 * This should replace or update your existing get_incentives operation
 */
async function handleGetChainIncentives(req, res) {
    try {
        const { chain_id } = req.query;
        if (!chain_id) {
            return res.status(400).json({ message: 'Chain ID is required' });
        }

        const chain = await Chain.findById(chain_id).select('incentives chain_name').lean();
        if (!chain) {
            return res.status(404).json({ message: 'Chain not found' });
        }

        // Filter for active incentives only
        const activeIncentives = chain.incentives ?
            chain.incentives.filter(incentive => incentive.is_active !== false) : [];

        console.log(`Found ${activeIncentives.length} active incentives for chain: ${chain.chain_name}`);

        return res.status(200).json({
            success: true,
            incentives: activeIncentives,
            chain_name: chain.chain_name
        });
    } catch (error) {
        console.error('Error getting chain incentives:', error);
        return res.status(500).json({ message: 'Error retrieving chain incentives: ' + error.message });
    }
}

/**
 * Search chains by name (for getChainFromDatabase function)
 */
async function handleSearchChains(req, res) {
    try {
        const { chain_name } = req.query;
        if (!chain_name) {
            return res.status(400).json({ message: 'Chain name is required for search' });
        }

        // Find chains with names that match (case-insensitive)
        const chains = await Chain.find({
            chain_name: { $regex: new RegExp(chain_name, 'i') },
            status: 'active'
        }).lean();

        return res.status(200).json({
            success: true,
            chains: chains
        });
    } catch (error) {
        console.error('Error searching chains:', error);
        return res.status(500).json({ message: 'Error searching chains: ' + error.message });
    }
}

/**
 * Find chain match for Google Places name matching
 */
async function handleFindChainMatch(req, res) {
    try {
        const { place_name } = req.query;
        if (!place_name) {
            return res.status(400).json({ message: 'Place name is required for matching' });
        }

        console.log(`Looking for chain match for: ${place_name}`);

        // Try exact match first
        let chain = await Chain.findOne({
            chain_name: { $regex: new RegExp(`^${place_name}$`, 'i') },
            status: 'active'
        }).lean();

        if (chain) {
            console.log(`Exact match found: ${chain.chain_name}`);
            return res.status(200).json({
                success: true,
                chain: chain
            });
        }

        // Try partial matches
        const partialMatches = await Chain.find({
            chain_name: { $regex: new RegExp(place_name, 'i') },
            status: 'active'
        }).lean();

        if (partialMatches.length > 0) {
            console.log(`Partial match found: ${partialMatches[0].chain_name}`);
            return res.status(200).json({
                success: true,
                chain: partialMatches[0]
            });
        }

        // Try reverse matching (chain name contains place name)
        const reverseMatches = await Chain.find({
            status: 'active'
        }).lean();

        for (const chainData of reverseMatches) {
            if (place_name.toLowerCase().includes(chainData.chain_name.toLowerCase()) ||
                chainData.chain_name.toLowerCase().includes(place_name.toLowerCase())) {
                console.log(`Reverse match found: ${chainData.chain_name}`);
                return res.status(200).json({
                    success: true,
                    chain: chainData
                });
            }
        }

        // No match found
        console.log(`No chain match found for: ${place_name}`);
        return res.status(200).json({
            success: false,
            chain: null
        });

    } catch (error) {
        console.error('Error finding chain match:', error);
        return res.status(500).json({ message: 'Error finding chain match: ' + error.message });
    }
}

/**
 * Add location to chain
 */
async function handleAddLocationToChain(req, res) {
    const adminCheck = await verifyAdminAccess(req);
    if (!adminCheck.success) {
        return res.status(adminCheck.status).json({ message: adminCheck.message });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { business_id, chain_id } = req.body;

        if (!business_id || !chain_id) {
            return res.status(400).json({ message: 'Business ID and Chain ID are required' });
        }

        // Get the chain to retrieve its name
        const chain = await Chain.findById(chain_id);
        if (!chain) {
            return res.status(404).json({ message: 'Chain not found' });
        }

        // Update the business to link it to the chain
        const updatedBusiness = await Business.findByIdAndUpdate(
            business_id,
            {
                chain_id: chain_id,
                chain_name: chain.chain_name,
                is_chain_location: true
            },
            { new: true }
        );

        if (!updatedBusiness) {
            return res.status(404).json({ message: 'Business not found' });
        }

        return res.status(200).json({
            success: true,
            message: 'Business added to chain successfully',
            business: updatedBusiness
        });
    } catch (error) {
        console.error('Error adding location to chain:', error);
        return res.status(500).json({ message: 'Error adding location to chain: ' + error.message });
    }
}

/**
 * Remove location from chain
 */
async function handleRemoveLocationFromChain(req, res) {
    const adminCheck = await verifyAdminAccess(req);
    if (!adminCheck.success) {
        return res.status(adminCheck.status).json({ message: adminCheck.message });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { business_id } = req.body;

        if (!business_id) {
            return res.status(400).json({ message: 'Business ID is required' });
        }

        const updatedBusiness = await Business.findByIdAndUpdate(
            business_id,
            {
                $unset: {
                    chain_id: 1,
                    chain_name: 1,
                    is_chain_location: 1
                }
            },
            { new: true }
        );

        if (!updatedBusiness) {
            return res.status(404).json({ message: 'Business not found' });
        }

        return res.status(200).json({
            success: true,
            message: 'Business removed from chain successfully',
            business: updatedBusiness
        });
    } catch (error) {
        console.error('Error removing location from chain:', error);
        return res.status(500).json({ message: 'Error removing location from chain: ' + error.message });
    }
}

/**
 * Get chain locations
 */
async function handleGetChainLocations(req, res) {
    try {
        const { chain_id } = req.query;
        if (!chain_id) {
            return res.status(400).json({ message: 'Chain ID is required' });
        }

        const locations = await Business.find({ chain_id: chain_id })
            .select('bname address1 address2 city state zip phone created_at')
            .sort({ bname: 1 })
            .lean();

        return res.status(200).json({
            success: true,
            locations: locations
        });
    } catch (error) {
        console.error('Error getting chain locations:', error);
        return res.status(500).json({ message: 'Error retrieving chain locations: ' + error.message });
    }
}
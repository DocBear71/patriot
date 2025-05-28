// api/chains.js - Enhanced dedicated chains API with better inheritance support
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

const Chain = require('../models/Chain');

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
    console.log(`🔗 CHAINS API: ${operation || 'none'} (${req.method})`);

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
            case 'update_incentive':
                return await handleUpdateChainIncentive(req, res);
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
            case 'sync_locations':
                return await handleSyncChainLocations(req, res);
            case 'bulk_update_universal_incentives':
                return await handleBulkUpdateUniversalIncentives(req, res);
            case 'summary':
                return await handleChainSummary(req, res);
            default:
                if (req.method === 'GET') {
                    return res.status(200).json({
                        message: 'Chains API is available',
                        operations: [
                            'list', 'get', 'create', 'update', 'delete',
                            'add_incentive', 'remove_incentive', 'update_incentive', 'get_incentives',
                            'search', 'add_location', 'remove_location', 'get_locations',
                            'sync_locations', 'bulk_update_universal_incentives'
                        ]
                    });
                }
                return res.status(400).json({ message: 'Invalid operation' });
        }
    } catch (error) {
        console.error(`❌ Error in chains API (${operation || 'unknown'}):`, error);
        return res.status(500).json({ message: 'Server error: ' + error.message });
    }
};

/**
 * ENHANCED: List all chains with location counts and better stats
 */
async function handleListChains(req, res) {
    console.log("📋 CHAINS: Listing all chains with enhanced stats");

    try {
        // Build query
        const query = { status: 'active' };

        // Add search filter if provided
        if (req.query.search) {
            const searchRegex = new RegExp(req.query.search, 'i');
            query.$or = [
                { chain_name: searchRegex },
                { business_type: searchRegex }
            ];
        }

        // Add type filter if provided
        if (req.query.business_type) {
            query.business_type = req.query.business_type;
        }

        console.log("🔍 Chain query:", JSON.stringify(query, null, 2));

        const chains = await Chain.find(query)
            .sort({ chain_name: 1 })
            .lean();

        console.log(`📊 Found ${chains.length} chains in database`);

        // Get enhanced stats for each chain
        const chainsWithStats = await Promise.all(
            chains.map(async (chain) => {
                try {
                    // Count total locations
                    const locationCount = await Business.countDocuments({ chain_id: chain._id });

                    // Count locations with universal incentives enabled
                    const universalEnabledCount = await Business.countDocuments({
                        chain_id: chain._id,
                        universal_incentives: true
                    });

                    // Count active chain incentives
                    const activeIncentiveCount = chain.incentives ?
                        chain.incentives.filter(i => i.is_active !== false).length : 0;

                    console.log(`   - ${chain.chain_name}: ${locationCount} locations, ${universalEnabledCount} with universal incentives, ${activeIncentiveCount} chain incentives`);

                    return {
                        ...chain,
                        location_count: locationCount,
                        universal_enabled_count: universalEnabledCount,
                        incentive_count: activeIncentiveCount,
                        // Flag if there are locations without universal incentives enabled
                        needs_sync: locationCount > 0 && universalEnabledCount < locationCount
                    };
                } catch (statsError) {
                    console.error(`❌ Error getting stats for chain ${chain.chain_name}:`, statsError);
                    return {
                        ...chain,
                        location_count: 0,
                        universal_enabled_count: 0,
                        incentive_count: 0,
                        needs_sync: false
                    };
                }
            })
        );

        console.log(`✅ CHAINS: Returning ${chainsWithStats.length} chains with enhanced stats`);

        return res.status(200).json({
            success: true,
            chains: chainsWithStats
        });
    } catch (error) {
        console.error('❌ Error listing chains:', error);
        return res.status(500).json({ message: 'Error retrieving chains: ' + error.message });
    }
}

/**
 * NEW: Get chain summary statistics
 */
async function handleChainSummary(req, res) {
    console.log("📊 CHAINS: Getting summary statistics with monthly growth calculation");

    try {
        // Count total active chains
        const totalChains = await Chain.countDocuments({ status: 'active' });
        console.log(`📈 Total chains: ${totalChains}`);

        // Calculate monthly growth - chains created this month
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

        console.log(`📅 This month: ${startOfMonth.toISOString().split('T')[0]} to ${now.toISOString().split('T')[0]}`);
        console.log(`📅 Last month: ${startOfLastMonth.toISOString().split('T')[0]} to ${endOfLastMonth.toISOString().split('T')[0]}`);

        // Count chains created this month
        const chainsThisMonth = await Chain.countDocuments({
            status: 'active',
            created_date: {
                $gte: startOfMonth,
                $lte: now
            }
        });

        // Count chains that existed at the start of this month
        const chainsAtStartOfMonth = await Chain.countDocuments({
            status: 'active',
            created_date: {
                $lt: startOfMonth
            }
        });

        // Calculate growth percentage
        let chainGrowthPercentage = 0;
        if (chainsAtStartOfMonth > 0) {
            chainGrowthPercentage = Math.round((chainsThisMonth / chainsAtStartOfMonth) * 100);
        } else if (chainsThisMonth > 0) {
            // If we had no chains at start of month but have some now, that's infinite growth
            // Cap it at a reasonable number like 1000%
            chainGrowthPercentage = 1000;
        }

        console.log(`🔢 Chains at start of month: ${chainsAtStartOfMonth}`);
        console.log(`🔢 New chains this month: ${chainsThisMonth}`);
        console.log(`📊 Chain growth percentage: ${chainGrowthPercentage}%`);

        // Count total locations that belong to chains
        const totalLocations = await Business.countDocuments({
            chain_id: { $exists: true, $ne: null }
        });
        console.log(`📍 Total chain locations: ${totalLocations}`);

        // Get all chains and count their incentives
        const chainsWithIncentives = await Chain.find(
            { status: 'active' },
            { incentives: 1, chain_name: 1 }
        ).lean();

        let totalIncentives = 0;
        let activeChainsWithIncentives = 0;

        chainsWithIncentives.forEach(chain => {
            if (chain.incentives && chain.incentives.length > 0) {
                // Count active incentives only
                const activeIncentives = chain.incentives.filter(
                    incentive => incentive.is_active !== false
                );

                if (activeIncentives.length > 0) {
                    totalIncentives += activeIncentives.length;
                    activeChainsWithIncentives++;
                }
            }
        });

        console.log(`🎁 Total incentives: ${totalIncentives}`);
        console.log(`✅ Chains with incentives: ${activeChainsWithIncentives}`);

        // Additional useful stats
        const chainsWithUniversalIncentives = await Chain.countDocuments({
            status: 'active',
            universal_incentives: true
        });

        const locationsWithUniversalEnabled = await Business.countDocuments({
            chain_id: { $exists: true, $ne: null },
            universal_incentives: true
        });

        console.log(`🌐 Chains with universal incentives enabled: ${chainsWithUniversalIncentives}`);
        console.log(`🏢 Locations with universal incentives enabled: ${locationsWithUniversalEnabled}`);

        const summaryData = {
            total_chains: totalChains,
            total_locations: totalLocations,
            total_incentives: totalIncentives,
            active_chains_with_incentives: activeChainsWithIncentives,
            // Enhanced growth tracking
            chains_this_month: chainsThisMonth,
            chains_at_start_of_month: chainsAtStartOfMonth,
            chain_growth_percentage: chainGrowthPercentage,
            // Bonus stats
            chains_with_universal_incentives: chainsWithUniversalIncentives,
            locations_with_universal_enabled: locationsWithUniversalEnabled,
            average_locations_per_chain: totalChains > 0 ? Math.round(totalLocations / totalChains * 10) / 10 : 0,
            average_incentives_per_active_chain: activeChainsWithIncentives > 0 ?
                Math.round(totalIncentives / activeChainsWithIncentives * 10) / 10 : 0
        };

        console.log("📊 Summary statistics compiled successfully with monthly growth");

        return res.status(200).json({
            success: true,
            ...summaryData,
            generated_at: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error getting chain summary:', error);
        return res.status(500).json({
            message: 'Error retrieving chain summary: ' + error.message
        });
    }
}

/**
 * ENHANCED: Get specific chain details with locations and inheritance status
 */
async function handleGetChain(req, res) {
    console.log("🔍 CHAINS: Getting specific chain details");

    try {
        const { id } = req.query;
        if (!id) {
            return res.status(400).json({ message: 'Chain ID is required' });
        }

        const chain = await Chain.findById(id).lean();
        if (!chain) {
            return res.status(404).json({ message: 'Chain not found' });
        }

        console.log(`📊 Chain found: ${chain.chain_name}`);

        // Get all locations for this chain with inheritance status
        const locations = await Business.find({ chain_id: id })
            .select('bname address1 address2 city state zip phone universal_incentives created_at')
            .lean();

        console.log(`📍 Found ${locations.length} locations for chain ${chain.chain_name}`);

        // Analyze inheritance status
        const inheritanceStats = {
            total_locations: locations.length,
            universal_enabled: locations.filter(loc => loc.universal_incentives === true).length,
            universal_disabled: locations.filter(loc => loc.universal_incentives === false).length,
            universal_undefined: locations.filter(loc => loc.universal_incentives === undefined).length
        };

        console.log("🔗 Inheritance stats:", inheritanceStats);

        return res.status(200).json({
            success: true,
            chain: {
                ...chain,
                locations: locations,
                inheritance_stats: inheritanceStats
            }
        });
    } catch (error) {
        console.error('❌ Error getting chain:', error);
        return res.status(500).json({ message: 'Error retrieving chain: ' + error.message });
    }
}

/**
 * Create new chain
 */
async function handleCreateChain(req, res) {
    console.log("➕ CHAINS: Creating new chain");

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

        console.log(`✅ Chain created: ${result.chain_name} (ID: ${result._id})`);

        return res.status(201).json({
            success: true,
            message: 'Chain created successfully',
            chain: result
        });
    } catch (error) {
        console.error('❌ Error creating chain:', error);
        return res.status(500).json({ message: 'Error creating chain: ' + error.message });
    }
}

/**
 * ENHANCED: Update chain with location sync option
 */
async function handleUpdateChain(req, res) {
    console.log("✏️ CHAINS: Updating chain");

    const adminCheck = await verifyAdminAccess(req);
    if (!adminCheck.success) {
        return res.status(adminCheck.status).json({ message: adminCheck.message });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { _id, chain_name, business_type, universal_incentives, corporate_info, sync_locations } = req.body;

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

        console.log(`✅ Chain updated: ${result.chain_name}`);

        // ENHANCED: Optionally sync universal_incentives to all locations
        if (sync_locations && universal_incentives !== undefined) {
            console.log(`🔄 Syncing universal_incentives=${universal_incentives} to all locations`);

            const syncResult = await Business.updateMany(
                { chain_id: _id },
                {
                    $set: {
                        universal_incentives: universal_incentives,
                        updated_at: new Date()
                    }
                }
            );

            console.log(`✅ Synced universal_incentives to ${syncResult.modifiedCount} locations`);
        }

        return res.status(200).json({
            success: true,
            message: 'Chain updated successfully',
            chain: result,
            locations_synced: sync_locations ? true : false
        });
    } catch (error) {
        console.error('❌ Error updating chain:', error);
        return res.status(500).json({ message: 'Error updating chain: ' + error.message });
    }
}

/**
 * Delete chain (removes chain references from businesses)
 */
async function handleDeleteChain(req, res) {
    console.log("🗑️ CHAINS: Deleting chain");

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

        // Get chain details before deletion
        const chain = await Chain.findById(_id);
        if (!chain) {
            return res.status(404).json({ message: 'Chain not found' });
        }

        // Remove chain references from all businesses
        const updateResult = await Business.updateMany(
            { chain_id: _id },
            {
                $unset: {
                    chain_id: 1,
                    chain_name: 1,
                    universal_incentives: 1
                }
            }
        );

        console.log(`🔄 Removed chain references from ${updateResult.modifiedCount} locations`);

        // Delete the chain
        const result = await Chain.findByIdAndDelete(_id);

        console.log(`✅ Chain deleted: ${chain.chain_name}`);

        return res.status(200).json({
            success: true,
            message: 'Chain deleted successfully',
            locations_updated: updateResult.modifiedCount
        });
    } catch (error) {
        console.error('❌ Error deleting chain:', error);
        return res.status(500).json({ message: 'Error deleting chain: ' + error.message });
    }
}

/**
 * Add incentive to chain
 */
async function handleAddChainIncentive(req, res) {
    console.log("🎁 CHAINS: Adding incentive to chain");

    const adminCheck = await verifyAdminAccess(req);
    if (!adminCheck.success) {
        return res.status(adminCheck.status).json({ message: adminCheck.message });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { chain_id, type, amount, description, other_description, information, discount_type } = req.body;

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
            discount_type: discount_type || 'percentage',
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

        console.log(`✅ Incentive added to chain ${result.chain_name}: ${type} ${amount}%`);

        return res.status(201).json({
            success: true,
            message: 'Incentive added to chain successfully',
            incentive: newIncentive
        });
    } catch (error) {
        console.error('❌ Error adding chain incentive:', error);
        return res.status(500).json({ message: 'Error adding incentive: ' + error.message });
    }
}

/**
 * NEW: Update chain incentive
 */
async function handleUpdateChainIncentive(req, res) {
    console.log("✏️ CHAINS: Updating chain incentive");

    const adminCheck = await verifyAdminAccess(req);
    if (!adminCheck.success) {
        return res.status(adminCheck.status).json({ message: adminCheck.message });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { chain_id, incentive_id, type, amount, description, other_description, information, discount_type, is_active } = req.body;

        if (!chain_id || !incentive_id) {
            return res.status(400).json({ message: 'Chain ID and incentive ID are required' });
        }

        // Build update object for the specific incentive
        const incentiveUpdate = {};
        if (type !== undefined) incentiveUpdate['incentives.$.type'] = type;
        if (amount !== undefined) incentiveUpdate['incentives.$.amount'] = parseFloat(amount);
        if (description !== undefined) incentiveUpdate['incentives.$.description'] = description;
        if (information !== undefined) incentiveUpdate['incentives.$.information'] = information;
        if (discount_type !== undefined) incentiveUpdate['incentives.$.discount_type'] = discount_type;
        if (is_active !== undefined) incentiveUpdate['incentives.$.is_active'] = is_active;
        if (type === 'OT' && other_description !== undefined) {
            incentiveUpdate['incentives.$.other_description'] = other_description;
        }

        // Add metadata
        incentiveUpdate['updated_date'] = new Date();
        incentiveUpdate['updated_by'] = adminCheck.userId;

        const result = await Chain.findOneAndUpdate(
            { _id: chain_id, 'incentives._id': incentive_id },
            { $set: incentiveUpdate },
            { new: true }
        );

        if (!result) {
            return res.status(404).json({ message: 'Chain or incentive not found' });
        }

        console.log(`✅ Chain incentive updated in ${result.chain_name}`);

        return res.status(200).json({
            success: true,
            message: 'Chain incentive updated successfully'
        });
    } catch (error) {
        console.error('❌ Error updating chain incentive:', error);
        return res.status(500).json({ message: 'Error updating incentive: ' + error.message });
    }
}

/**
 * Remove incentive from chain
 */
async function handleRemoveChainIncentive(req, res) {
    console.log("🗑️ CHAINS: Removing incentive from chain");

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

        console.log(`✅ Incentive removed from chain ${result.chain_name}`);

        return res.status(200).json({
            success: true,
            message: 'Incentive removed from chain successfully'
        });
    } catch (error) {
        console.error('❌ Error removing chain incentive:', error);
        return res.status(500).json({ message: 'Error removing incentive: ' + error.message });
    }
}

/**
 * ENHANCED: Get chain incentives with detailed logging
 */
async function handleGetChainIncentives(req, res) {
    try {
        const { chain_id } = req.query;
        if (!chain_id) {
            return res.status(400).json({ message: 'Chain ID is required' });
        }

        console.log(`🎁 CHAINS: Getting incentives for chain ${chain_id}`);

        const chain = await Chain.findById(chain_id).select('incentives chain_name universal_incentives').lean();
        if (!chain) {
            console.log(`❌ Chain not found: ${chain_id}`);
            return res.status(404).json({ message: 'Chain not found' });
        }

        // Filter for active incentives only
        const activeIncentives = chain.incentives ?
            chain.incentives.filter(incentive => incentive.is_active !== false) : [];

        console.log(`📊 Chain ${chain.chain_name}:`);
        console.log(`   - Universal incentives: ${chain.universal_incentives}`);
        console.log(`   - Total incentives: ${chain.incentives ? chain.incentives.length : 0}`);
        console.log(`   - Active incentives: ${activeIncentives.length}`);

        return res.status(200).json({
            success: true,
            incentives: activeIncentives,
            chain_name: chain.chain_name,
            universal_incentives: chain.universal_incentives
        });
    } catch (error) {
        console.error('❌ Error getting chain incentives:', error);
        return res.status(500).json({ message: 'Error retrieving chain incentives: ' + error.message });
    }
}

/**
 * Search chains by name
 */
async function handleSearchChains(req, res) {
    try {
        const { chain_name } = req.query;
        if (!chain_name) {
            return res.status(400).json({ message: 'Chain name is required for search' });
        }

        console.log(`🔍 CHAINS: Searching for "${chain_name}"`);

        // Find chains with names that match (case-insensitive)
        const chains = await Chain.find({
            chain_name: { $regex: new RegExp(chain_name, 'i') },
            status: 'active'
        }).lean();

        console.log(`📊 Found ${chains.length} matching chains`);

        return res.status(200).json({
            success: true,
            chains: chains
        });
    } catch (error) {
        console.error('❌ Error searching chains:', error);
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

        console.log(`🎯 CHAINS: Looking for chain match for "${place_name}"`);

        // Try exact match first
        let chain = await Chain.findOne({
            chain_name: { $regex: new RegExp(`^${place_name}$`, 'i') },
            status: 'active'
        }).lean();

        if (chain) {
            console.log(`✅ Exact match found: ${chain.chain_name}`);
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
            console.log(`✅ Partial match found: ${partialMatches[0].chain_name}`);
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
                console.log(`✅ Reverse match found: ${chainData.chain_name}`);
                return res.status(200).json({
                    success: true,
                    chain: chainData
                });
            }
        }

        // No match found
        console.log(`❌ No chain match found for: ${place_name}`);
        return res.status(200).json({
            success: false,
            chain: null
        });

    } catch (error) {
        console.error('❌ Error finding chain match:', error);
        return res.status(500).json({ message: 'Error finding chain match: ' + error.message });
    }
}

/**
 * ENHANCED: Add location to chain with inheritance setup
 */
async function handleAddLocationToChain(req, res) {
    console.log("🏢 CHAINS: Adding location to chain");

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

        // Get the chain to retrieve its properties
        const chain = await Chain.findById(chain_id);
        if (!chain) {
            return res.status(404).json({ message: 'Chain not found' });
        }

        console.log(`🔗 Adding business to chain: ${chain.chain_name}`);
        console.log(`   - Chain universal_incentives: ${chain.universal_incentives}`);

        // ENHANCED: Update the business with full chain inheritance
        const updateData = {
            chain_id: chain_id,
            chain_name: chain.chain_name,
            is_chain_location: true,
            // CRITICAL: Inherit universal_incentives from chain
            universal_incentives: chain.universal_incentives,
            updated_at: new Date()
        };

        const updatedBusiness = await Business.findByIdAndUpdate(
            business_id,
            updateData,
            { new: true }
        );

        if (!updatedBusiness) {
            return res.status(404).json({ message: 'Business not found' });
        }

        console.log(`✅ Business added to chain successfully:`);
        console.log(`   - Business: ${updatedBusiness.bname}`);
        console.log(`   - Chain: ${updatedBusiness.chain_name}`);
        console.log(`   - Universal incentives: ${updatedBusiness.universal_incentives}`);

        return res.status(200).json({
            success: true,
            message: 'Business added to chain successfully',
            business: updatedBusiness
        });
    } catch (error) {
        console.error('❌ Error adding location to chain:', error);
        return res.status(500).json({ message: 'Error adding location to chain: ' + error.message });
    }
}

/**
 * ENHANCED: Remove location from chain with cleanup
 */
async function handleRemoveLocationFromChain(req, res) {
    console.log("🏢 CHAINS: Removing location from chain");

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

        // Get business details before removal
        const business = await Business.findById(business_id);
        if (!business) {
            return res.status(404).json({ message: 'Business not found' });
        }

        console.log(`🔄 Removing ${business.bname} from chain ${business.chain_name || 'unknown'}`);

        const updatedBusiness = await Business.findByIdAndUpdate(
            business_id,
            {
                $unset: {
                    chain_id: 1,
                    chain_name: 1,
                    is_chain_location: 1,
                    universal_incentives: 1
                },
                $set: {
                    updated_at: new Date()
                }
            },
            { new: true }
        );

        console.log(`✅ Business removed from chain successfully`);

        return res.status(200).json({
            success: true,
            message: 'Business removed from chain successfully',
            business: updatedBusiness
        });
    } catch (error) {
        console.error('❌ Error removing location from chain:', error);
        return res.status(500).json({ message: 'Error removing location from chain: ' + error.message });
    }
}

/**
 * Get chain locations with inheritance status
 */
async function handleGetChainLocations(req, res) {
    try {
        const { chain_id } = req.query;
        if (!chain_id) {
            return res.status(400).json({ message: 'Chain ID is required' });
        }

        console.log(`📍 CHAINS: Getting locations for chain ${chain_id}`);

        const locations = await Business.find({ chain_id: chain_id })
            .select('bname address1 address2 city state zip phone universal_incentives created_at')
            .sort({ bname: 1 })
            .lean();

        console.log(`📊 Found ${locations.length} locations`);

        // Add inheritance status analysis
        const locationsWithStatus = locations.map(location => ({
            ...location,
            inheritance_status: location.universal_incentives === true ? 'enabled' :
                location.universal_incentives === false ? 'disabled' : 'undefined'
        }));

        return res.status(200).json({
            success: true,
            locations: locationsWithStatus
        });
    } catch (error) {
        console.error('❌ Error getting chain locations:', error);
        return res.status(500).json({ message: 'Error retrieving chain locations: ' + error.message });
    }
}

/**
 * NEW: Sync chain locations - ensures all locations have proper inheritance settings
 */
async function handleSyncChainLocations(req, res) {
    console.log("🔄 CHAINS: Syncing chain locations");

    const adminCheck = await verifyAdminAccess(req);
    if (!adminCheck.success) {
        return res.status(adminCheck.status).json({ message: adminCheck.message });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { chain_id } = req.body;

        if (!chain_id) {
            return res.status(400).json({ message: 'Chain ID is required' });
        }

        // Get chain details
        const chain = await Chain.findById(chain_id);
        if (!chain) {
            return res.status(404).json({ message: 'Chain not found' });
        }

        console.log(`🔄 Syncing locations for chain: ${chain.chain_name}`);
        console.log(`   - Target universal_incentives: ${chain.universal_incentives}`);

        // Update all locations to match chain settings
        const syncResult = await Business.updateMany(
            { chain_id: chain_id },
            {
                $set: {
                    chain_name: chain.chain_name, // Ensure chain name is current
                    universal_incentives: chain.universal_incentives,
                    is_chain_location: true,
                    updated_at: new Date()
                }
            }
        );

        console.log(`✅ Synced ${syncResult.modifiedCount} locations`);

        // Get updated stats
        const totalLocations = await Business.countDocuments({ chain_id: chain_id });
        const enabledLocations = await Business.countDocuments({
            chain_id: chain_id,
            universal_incentives: true
        });

        return res.status(200).json({
            success: true,
            message: 'Chain locations synced successfully',
            chain_name: chain.chain_name,
            total_locations: totalLocations,
            synced_count: syncResult.modifiedCount,
            enabled_count: enabledLocations
        });
    } catch (error) {
        console.error('❌ Error syncing chain locations:', error);
        return res.status(500).json({ message: 'Error syncing chain locations: ' + error.message });
    }
}

/**
 * NEW: Bulk update universal incentives for multiple chains
 */
async function handleBulkUpdateUniversalIncentives(req, res) {
    console.log("🔄 CHAINS: Bulk updating universal incentives");

    const adminCheck = await verifyAdminAccess(req);
    if (!adminCheck.success) {
        return res.status(adminCheck.status).json({ message: adminCheck.message });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { chain_ids, universal_incentives, sync_locations } = req.body;

        if (!chain_ids || !Array.isArray(chain_ids) || chain_ids.length === 0) {
            return res.status(400).json({ message: 'Chain IDs array is required' });
        }

        if (universal_incentives === undefined) {
            return res.status(400).json({ message: 'universal_incentives value is required' });
        }

        console.log(`🔄 Bulk updating ${chain_ids.length} chains to universal_incentives=${universal_incentives}`);

        // Update chains
        const chainUpdateResult = await Chain.updateMany(
            { _id: { $in: chain_ids } },
            {
                $set: {
                    universal_incentives: universal_incentives,
                    updated_date: new Date(),
                    updated_by: adminCheck.userId
                }
            }
        );

        console.log(`✅ Updated ${chainUpdateResult.modifiedCount} chains`);

        let locationUpdateCount = 0;

        // Optionally sync locations
        if (sync_locations) {
            console.log(`🔄 Syncing locations for updated chains`);

            const locationUpdateResult = await Business.updateMany(
                { chain_id: { $in: chain_ids } },
                {
                    $set: {
                        universal_incentives: universal_incentives,
                        updated_at: new Date()
                    }
                }
            );

            locationUpdateCount = locationUpdateResult.modifiedCount;
            console.log(`✅ Synced ${locationUpdateCount} locations`);
        }

        return res.status(200).json({
            success: true,
            message: 'Bulk update completed successfully',
            chains_updated: chainUpdateResult.modifiedCount,
            locations_updated: locationUpdateCount
        });
    } catch (error) {
        console.error('❌ Error in bulk update:', error);
        return res.status(500).json({ message: 'Error in bulk update: ' + error.message });
    }
}
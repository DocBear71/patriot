// api/incentives.js - Combined incentives endpoint handlers with chain support
const connect = require('../config/db');
const mongoose = require('mongoose');
const Business = require('../models/Business');
const Incentive = require('../models/Incentive');

/**
 * Combined API handler for all incentive operations
 */
module.exports = async (req, res) => {
    // CORS handled by next.config.js

    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Route based on HTTP method and operation query parameter
    try {
        const { operation } = req.query;

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
            return await handleDeleteIncentive(req, res);
        }
        // If it's a GET request (with or without operation=get), retrieve incentives
        else if (req.method === 'GET') {
            return await handleGetIncentives(req, res);
        }
        else {
            return res.status(405).json({ message: 'Method not allowed' });
        }
    } catch (error) {
        console.error(`Error in incentives API:`, error);
        return res.status(500).json({ message: 'Server error: ' + error.message });
    }
};

/**
 * Handle GET request for retrieving incentives for a business with chain support
 */
async function handleGetIncentives(req, res) {
    console.log("Get Incentives API hit:", req.method);
    console.log("Full URL:", req.url);
    console.log("Query parameters:", req.query);

    // Get the business ID from the query parameters
    const businessId = req.query.business_id;

    if (!businessId) {
        return res.status(400).json({ message: 'Business ID is required as a query parameter' });
    }

    console.log("Business ID from query:", businessId);

    // Connect to MongoDB - fix the connection call
    try {
        await connect;  // Since connect is already a Promise, just await it
        console.log("Database connection established");
    } catch (dbError) {
        console.error("Database connection error:", dbError);
        return res.status(500).json({ message: 'Database connection error', error: dbError.message });
    }

    let incentives = [];

    // Check if this is a Google Places result (not in our database)
    if (businessId.startsWith('place_')) {
        // For Places API results, we need to check for chain incentives
        // Extract chain_id if it was included in the request
        const chainId = req.query.chain_id;

        if (chainId) {
            // Get chain-wide incentives
            const chainIncentives = await Incentive.find({
                business_id: chainId,
                is_available: true
            }).lean();

            if (chainIncentives.length > 0) {
                // Mark as chain-wide incentives
                chainIncentives.forEach(incentive => {
                    incentive.is_chain_wide = true;
                });

                incentives = [...chainIncentives];
            }
        }

        return res.status(200).json({
            message: 'Chain incentives retrieved for Google Places result',
            results: incentives
        });
    }

    // First get incentives directly associated with this business
    incentives = await Incentive.find({ business_id: businessId }).lean();
    console.log(`Found ${incentives.length} incentives for business ${businessId}`);

    // For businesses in our database:
    // Check if this is a chain location
    const business = await Business.findById(businessId).lean();

    if (business && business.chain_id) {
        // Check if the chain has universal incentives enabled
        const chainBusiness = await Business.findById(business.chain_id).lean();

        if (chainBusiness && chainBusiness.universal_incentives) {
            console.log(`Business ${businessId} is part of chain ${business.chain_id}, fetching chain incentives`);

            const chainIncentives = await Incentive.find({
                business_id: business.chain_id,
                is_available: true
            }).lean();

            console.log(`Found ${chainIncentives.length} chain incentives for chain ${business.chain_id}`);

            // Add chain incentives that don't conflict with location-specific ones
            if (chainIncentives.length > 0) {
                chainIncentives.forEach(chainIncentive => {
                    const hasLocationOverride = incentives.some(
                        li => li.type === chainIncentive.type
                    );

                    if (!hasLocationOverride) {
                        // Mark as chain-wide incentive
                        chainIncentive.is_chain_wide = true;
                        incentives.push(chainIncentive);
                    }
                });
            }
        }
    }

    // Return all incentives (location-specific + chain-wide)
    return res.status(200).json({
        message: 'Incentives retrieved successfully.',
        results: incentives,
        chain_info: business && business.chain_id ? {
            id: business.chain_id,
            name: business.chain_name
        } : null
    });
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

    // Connect to MongoDB - fix the connection call
    try {
        await connect;  // Since connect is already a Promise, just await it
        console.log("Database connection established");
    } catch (dbError) {
        console.error("Database connection error:", dbError);
        return res.status(500).json({ message: 'Database connection error', error: dbError.message });
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
async function handleDeleteIncentive(req, res) {
    console.log("Delete Incentive API hit:", req.method);
    console.log("Query parameters:", req.query);
    console.log("Request body:", req.body);

    // Get incentive ID from query params or body
    const incentiveId = req.query.id || (req.body && req.body.incentive_id);

    if (!incentiveId) {
        return res.status(400).json({ message: 'Incentive ID is required' });
    }

    // Connect to MongoDB
    try {
        await connect;
        console.log("Database connection established");
    } catch (dbError) {
        console.error("Database connection error:", dbError);
        return res.status(500).json({ message: 'Database connection error', error: dbError.message });
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
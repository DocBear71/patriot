// api/business.js - Enhanced with separated chain business system
const connect = require('../config/db');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
let Business = require('../models/Business');
let User = require('../models/User');
let Chain = require('../models/Chain');

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
            case 'update-business':
                return await handleUpdateBusinessNoAdmin(req, res);

            // Chain operations
            case 'get_chains':
                return await handleGetChains(req, res);
            case 'get_chain_locations':
                return await handleGetChainLocations(req, res);
            case 'add_to_chain':
                return await handleAddToChain(req, res);
            case 'remove_from_chain':
                return await handleRemoveFromChain(req, res);
            case 'delete_chain':
                return await handleDeleteChain(req, res);
            case 'get':
                return await handleGetBusiness(req, res);
            case 'find_matching_chain':
                return await handleFindMatchingChain(req, res);
            case 'check_place_exists':
                return await handleCheckPlaceExists(req, res);

            // FIXED: Admin operations with separated chains support
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

            // Create and update operations for both regular and chain businesses
            case 'create':
                return await handleCreateBusiness(req, res);
            case 'update':
                return await handleUpdateBusiness(req, res);

            default:
                if (req.method === 'GET') {
                    return res.status(200).json({
                        message: 'Business API is available',
                        operations: [
                            // Public operations
                            'register', 'search', 'get',
                            // Chain operations
                            'get_chains', 'get_chain_locations', 'add_to_chain',
                            'remove_from_chain', 'delete_chain', 'create', 'update',
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

/**
 * Verify admin token
 */
async function verifyAdminToken(req) {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { authorized: false, message: 'Authorization required' };
    }

    const token = authHeader.split(' ')[1];
    console.log("Verifying admin token in business.js:", token.substring(0, 20) + "...");

    try {
        // Use the same secret as in auth.js
        const JWT_SECRET = process.env.JWT_SECRET || 'patriot-thanks-secret-key';
        console.log("Using JWT_SECRET:", JWT_SECRET === 'patriot-thanks-secret-key' ? 'Using fallback secret' : 'Using env variable');

        // Verify token
        const decoded = jwt.verify(token, JWT_SECRET);
        console.log("Token decoded successfully:", decoded.userId, "isAdmin:", decoded.isAdmin);

        // Connect to MongoDB
        await connect;

        // Find the user
        const user = await User.findById(decoded.userId);

        if (!user) {
            console.log("User not found in database");
            return { authorized: false, message: 'User not found' };
        }

        // Check admin rights
        if (user.level !== 'Admin' && user.isAdmin !== true) {
            console.log("User is not an admin. Level:", user.level, "isAdmin:", user.isAdmin);
            return { authorized: false, message: 'Admin access required' };
        }

        console.log("User verified as admin:", user.level, user.isAdmin);
        return { authorized: true, user };
    } catch (error) {
        console.error('Token verification error:', error);
        return { authorized: false, message: 'Invalid or expired token' };
    }
}

/**
 * FINAL FIX: Handle admin listing of businesses with separated chains support
 * Replace your existing handleAdminListBusinesses function with this one
 */
async function handleAdminListBusinesses(req, res) {
    console.log("🏢 ADMIN LIST BUSINESSES: Using dedicated Chain model");

    // Verify admin token
    const auth = await verifyAdminToken(req);
    if (!auth.authorized) {
        return res.status(401).json({ message: auth.message });
    }

    try {
        // Connect to MongoDB
        await connect;
        console.log("✅ Database connection established");

        // Parse query parameters
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const includeChains = req.query.include_chains === 'true';

        // Build query for regular businesses (exclude chain parents)
        const businessQuery = {
            $or: [
                { is_chain: { $exists: false } },
                { is_chain: false },
                { is_chain: null }
            ]
        };

        // Add search filters
        if (req.query.search) {
            const searchRegex = new RegExp(req.query.search, 'i');
            businessQuery.$and = [
                businessQuery.$or ? { $or: businessQuery.$or } : {},
                {
                    $or: [
                        { bname: searchRegex },
                        { address1: searchRegex },
                        { city: searchRegex },
                        { state: searchRegex },
                        { zip: searchRegex },
                        { phone: searchRegex }
                    ]
                }
            ];
            delete businessQuery.$or;
        }

        if (req.query.category) businessQuery.type = req.query.category;
        if (req.query.status) businessQuery.status = req.query.status;

        // Get businesses
        const businessTotal = await Business.countDocuments(businessQuery);
        const businessLimit = includeChains ? Math.floor(limit * 0.7) : limit;

        let businesses = await Business.find(businessQuery)
            .sort({ created_at: -1 })
            .skip(skip)
            .limit(businessLimit)
            .lean();

        let chains = [];
        let chainTotal = 0;

        // ✅ Get chains using the dedicated model - much simpler!
        if (includeChains) {
            console.log("🔗 CHAINS: Using dedicated Chain model");

            try {
                const chainQuery = { status: 'active' };
                if (req.query.search) {
                    chainQuery.chain_name = new RegExp(req.query.search, 'i');
                }

                // Use the static method from the Chain model
                const chainsWithCounts = await Chain.getWithLocationCounts(chainQuery);

                chainTotal = chainsWithCounts.length;

                // Convert to business-like format
                chains = chainsWithCounts.slice(0, limit - businesses.length).map(chain => ({
                    _id: chain._id,
                    bname: chain.chain_name,
                    address1: 'Chain Headquarters',
                    city: chain.corporate_info?.headquarters || 'N/A',
                    type: chain.business_type,
                    status: chain.status,
                    created_at: chain.created_date,
                    created_by: chain.created_by,
                    is_chain: true,
                    chain_name: chain.chain_name,
                    location_count: chain.location_count
                }));

                console.log(`✅ Retrieved ${chains.length} chains`);
            } catch (chainError) {
                console.error("❌ Error fetching chains:", chainError);
                chains = [];
                chainTotal = 0;
            }
        }

        // Combine and return results
        const allBusinesses = [...businesses, ...chains];
        const total = businessTotal + chainTotal;

        // Get user information
        const userIds = allBusinesses.map(item => item.created_by).filter(id => id);
        let users = [];

        if (userIds.length > 0) {
            try {
                users = await User.find({ _id: { $in: userIds } })
                    .select('_id fname lname email').lean();
            } catch (userError) {
                console.error("❌ Error fetching users:", userError);
            }
        }

        // Map user data
        const userMap = {};
        users.forEach(user => {
            userMap[user._id.toString()] = {
                name: `${user.fname} ${user.lname}`,
                email: user.email
            };
        });

        // Add user details
        const enrichedBusinesses = allBusinesses.map(item => {
            if (item.created_by && userMap[item.created_by.toString()]) {
                item.createdByUser = userMap[item.created_by.toString()];
            }
            return item;
        });

        const totalPages = Math.ceil(total / limit);

        console.log(`✅ SUCCESS: Returning ${enrichedBusinesses.length} items`);

        return res.status(200).json({
            businesses: enrichedBusinesses,
            total,
            page,
            limit,
            totalPages,
            breakdown: {
                businesses: businessTotal,
                chains: chainTotal
            }
        });

    } catch (error) {
        console.error('❌ Error listing businesses:', error);
        return res.status(500).json({
            message: 'Server error during business listing: ' + error.message
        });
    }
}

/**
 * FIXED: Handle getting chains from separate collection
 */
async function handleGetChains(req, res) {
    console.log("🔗 GET CHAINS: From separated collection");

    try {
        // Connect to MongoDB
        await connect;

        // Find all chains from separate collection
        const chains = await Chain.find({ status: 'active' })
            .sort({ chain_name: 1 })
            .lean();

        console.log(`📊 Found ${chains.length} chains in separate collection`);

        // For each chain, count the number of locations
        for (let i = 0; i < chains.length; i++) {
            const locationCount = await Business.countDocuments({
                chain_id: chains[i]._id
            });
            chains[i].location_count = locationCount;
            console.log(`   - ${chains[i].chain_name}: ${locationCount} locations`);
        }

        return res.status(200).json({
            message: 'Chains retrieved successfully',
            results: chains
        });

    } catch (error) {
        console.error('❌ Error retrieving chains:', error);
        return res.status(500).json({
            message: 'Error retrieving chains',
            error: error.message
        });
    }
}

// ... [Keep all other existing functions unchanged] ...

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

        // Connect to MongoDB - fix the connection call
        try {
            await connect;  // Since connect is already a Promise, just await it
            console.log("Database connection established");
        } catch (dbError) {
            console.error("Database connection error:", dbError);
            return res.status(500).json({ message: 'Database connection error', error: dbError.message });
        }

        // Add geospatial data if coordinates are provided
        if (businessData.lat && businessData.lng) {
            businessData.location = {
                type: 'Point',
                coordinates: [
                    parseFloat(businessData.lng),  // GeoJSON uses [longitude, latitude]
                    parseFloat(businessData.lat)
                ]
            };
        } else if (businessData.address1 && businessData.city && businessData.state) {
            // If coordinates weren't provided, geocode the address
            try {
                // Import the geocoding function
                const { geocodeAddress } = require('../utils/geocoding');

                const address = `${businessData.address1}, ${businessData.city}, ${businessData.state} ${businessData.zip}`;
                const coordinates = await geocodeAddress(address);

                if (coordinates) {
                    businessData.location = {
                        type: 'Point',
                        coordinates: [coordinates.lng, coordinates.lat]
                    };
                    console.log("Geocoded coordinates:", coordinates);
                } else {
                    console.warn("Could not geocode address:", address);
                }
            } catch (geocodeError) {
                console.error("Error geocoding address:", geocodeError);
            }
        }

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
 * Handle business search with chain support
 */
async function handleBusinessSearch(req, res) {
    console.log("Business search API hit:", req.method);
    console.log("Query parameters:", req.query);

    try {
        // Connect to MongoDB - fix the connection call
        try {
            await connect;  // Since connect is already a Promise, just await it
            console.log("Database connection established");
        } catch (dbError) {
            console.error("Database connection error:", dbError);
            return res.status(500).json({ message: 'Database connection error', error: dbError.message });
        }

        // Original search query parameters
        const query = {};

        // Check if business_name or businessName is present
        const businessNameValue = req.query.business_name || req.query.businessName || '';
        const addressValue = req.query.address || '';

        console.log("Business name value:", businessNameValue);
        console.log("Address value:", addressValue);

        // Only use business name if a value is provided
        if (businessNameValue && businessNameValue.trim() !== '') {
            // Use case-insensitive regex search with more flexible matching
            query.bname = new RegExp(businessNameValue.trim().replace(/\s+/g, '.*'), 'i');
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

        if (req.query.lat && req.query.lng) {
            const lat = parseFloat(req.query.lat);
            const lng = parseFloat(req.query.lng);
            const radius = parseInt(req.query.radius) || 25; // Default 25 miles

            // Convert miles to meters for MongoDB geospatial query
            const radiusInMeters = radius * 1609.34;

            query.location = {
                $near: {
                    $geometry: {
                        type: "Point",
                        coordinates: [lng, lat]  // GeoJSON uses [longitude, latitude]
                    },
                    $maxDistance: radiusInMeters
                }
            };

            console.log(`Performing location-based search at [${lat},${lng}] with radius ${radius} miles`);
        }

        console.log("MongoDB Query:", JSON.stringify(query, null, 2));

        // Initial search for exact matches in your database
        let results = await Business.find(query).lean();
        console.log("Found", results.length, "matching businesses");

        // If few or no results found when searching by name, check for chains
        if (businessNameValue && businessNameValue.trim() !== '' && results.length < 2) {
            const chainNameSearch = new RegExp(businessNameValue.trim(), 'i');

            // FIXED: Find chains from separate collection
            const chainBusinesses = await Chain.find({
                status: 'active',
                chain_name: chainNameSearch
            }).lean();

            console.log(`Found ${chainBusinesses.length} chain businesses matching "${businessNameValue}"`);

            // If chain businesses found, we may need to look for related locations
            if (chainBusinesses.length > 0) {
                for (const chainBusiness of chainBusinesses) {
                    // Get existing locations for this chain
                    const chainLocations = await Business.find({
                        chain_id: chainBusiness._id
                    }).lean();

                    console.log(`Found ${chainLocations.length} locations for chain ${chainBusiness.chain_name}`);

                    // Add chain locations to results if they're not already included
                    for (const location of chainLocations) {
                        // Check if this location is already in results
                        const isDuplicate = results.some(business =>
                            business._id.toString() === location._id.toString()
                        );

                        if (!isDuplicate) {
                            // Add chain info to the location
                            location.chain_info = {
                                name: chainBusiness.chain_name,
                                id: chainBusiness._id
                            };
                            results.push(location);
                        }
                    }

                    // If we have an address query, we should also try to find nearby chain locations
                    // that might not be in our database yet
                    if (addressValue && addressValue.trim() !== '') {
                        try {
                            // Geocode the address
                            const { geocodeAddress } = require('../utils/geocoding');
                            const geocodedAddress = await geocodeAddress(addressValue);

                            if (geocodedAddress) {
                                console.log("Geocoded address:", geocodedAddress);

                                // You would use Places API here to find nearby locations
                                // For now, we'll just add a placeholder for any nearby
                                // chain locations we might find via the Places API

                                // If we still have no locations but found a chain,
                                // add the chain parent as a result with a flag
                                if (results.length === 0) {
                                    const chainAsResult = {
                                        _id: chainBusiness._id,
                                        bname: chainBusiness.chain_name,
                                        type: chainBusiness.business_type,
                                        is_parent_chain: true,
                                        address1: 'Chain Business - Multiple Locations',
                                        city: chainBusiness.corporate_info?.headquarters || '',
                                        status: chainBusiness.status
                                    };
                                    results.push(chainAsResult);
                                }
                            }
                        } catch (error) {
                            console.error("Error finding nearby chain locations:", error);
                        }
                    }
                }
            }
        }

        return res.status(200).json({
            message: 'Search successful',
            results: results
        });
    } catch (error) {
        console.error('Search error:', error);
        return res.status(500).json({ message: 'Server error during search: ' + error.message });
    }
}

/**
 * Handle getting a specific business
 */
async function handleGetBusiness(req, res) {
    try {
        // Connect to MongoDB
        await connect;

        // Get business ID from query
        const { id } = req.query;

        if (!id) {
            return res.status(400).json({ message: 'Business ID is required' });
        }

        // Find business by ID
        const business = await Business.findById(id).lean();

        if (!business) {
            return res.status(404).json({ message: 'Business not found' });
        }

        return res.status(200).json({
            message: 'Business retrieved successfully',
            result: business
        });
    } catch (error) {
        console.error('Error getting business:', error);
        return res.status(500).json({ message: 'Server error getting business: ' + error.message });
    }
}

// ... [Continue with all other existing functions unchanged] ...
// [I'm truncating here due to length, but include all your other existing functions]

/**
 * Handle get chain locations
 */
async function handleGetChainLocations(req, res) {
    try {
        // Connect to MongoDB
        await connect;

        const { chain_id } = req.query;

        if (!chain_id) {
            return res.status(400).json({ message: 'Chain ID is required' });
        }

        // Find all businesses that belong to this chain
        const locations = await Business.find({ chain_id: chain_id }).lean();

        return res.status(200).json({
            message: 'Chain locations retrieved successfully',
            results: locations
        });
    } catch (error) {
        console.error('Error retrieving chain locations:', error);
        return res.status(500).json({ message: 'Error retrieving chain locations', error: error.message });
    }
}

/**
 * Handle adding a business to a chain
 */
async function handleAddToChain(req, res) {
    try {
        // Ensure this is a POST request
        if (req.method !== 'POST') {
            return res.status(405).json({ message: 'Method Not Allowed' });
        }

        // Connect to MongoDB
        await connect;

        const { business_id, chain_id } = req.body;

        if (!business_id || !chain_id) {
            return res.status(400).json({ message: 'Business ID and Chain ID are required' });
        }

        // Get the chain to retrieve its name
        const chain = await Business.findById(chain_id);
        if (!chain || !chain.is_chain) {
            return res.status(404).json({ message: 'Chain not found' });
        }

        // Update the business to link it to the chain
        const updatedBusiness = await Business.findByIdAndUpdate(
            business_id,
            {
                chain_id: chain_id,
                chain_name: chain.bname
            },
            { new: true }
        );

        // Add the business to the chain's locations array if it exists
        if (chain.locations) {
            // Check if the business is already in the locations array
            if (!chain.locations.includes(business_id)) {
                chain.locations.push(business_id);
                await chain.save();
            }
        } else {
            // Initialize the locations array if it doesn't exist
            chain.locations = [business_id];
            await chain.save();
        }

        return res.status(200).json({
            message: 'Business added to chain successfully',
            result: updatedBusiness
        });
    } catch (error) {
        console.error('Error adding business to chain:', error);
        return res.status(500).json({ message: 'Error adding business to chain', error: error.message });
    }
}

/**
 * Handle removing a business from a chain
 */
async function handleRemoveFromChain(req, res) {
    try {
        // Ensure this is a POST request
        if (req.method !== 'POST') {
            return res.status(405).json({ message: 'Method Not Allowed' });
        }

        // Connect to MongoDB
        await connect;

        const { business_id } = req.body;

        if (!business_id) {
            return res.status(400).json({ message: 'Business ID is required' });
        }

        // Get the business to find its chain
        const business = await Business.findById(business_id);
        if (!business) {
            return res.status(404).json({ message: 'Business not found' });
        }

        const chainId = business.chain_id;

        // Update the business to remove the chain association
        const updatedBusiness = await Business.findByIdAndUpdate(
            business_id,
            {
                $unset: {
                    chain_id: 1,
                    chain_name: 1
                }
            },
            { new: true }
        );

        // Remove the business from the chain's locations array if needed
        if (chainId) {
            await Business.findByIdAndUpdate(
                chainId,
                {
                    $pull: { locations: business_id }
                }
            );
        }

        return res.status(200).json({
            message: 'Business removed from chain successfully',
            result: updatedBusiness
        });
    } catch (error) {
        console.error('Error removing business from chain:', error);
        return res.status(500).json({ message: 'Error removing business from chain', error: error.message });
    }
}

/**
 * Handle deleting a chain
 */
async function handleDeleteChain(req, res) {
    try {
        // Ensure this is a POST request
        if (req.method !== 'POST') {
            return res.status(405).json({ message: 'Method Not Allowed' });
        }

        // Connect to MongoDB
        await connect;

        const { id } = req.query;

        if (!id) {
            return res.status(400).json({ message: 'Chain ID is required' });
        }

        // Find all businesses that belong to this chain
        const locations = await Business.find({ chain_id: id });

        // Update all locations to remove the chain association
        for (const location of locations) {
            await Business.findByIdAndUpdate(
                location._id,
                {
                    $unset: {
                        chain_id: 1,
                        chain_name: 1
                    }
                }
            );
        }

        // Delete the chain
        await Business.findByIdAndDelete(id);

        return res.status(200).json({
            message: 'Chain deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting chain:', error);
        return res.status(500).json({ message: 'Error deleting chain', error: error.message });
    }
}

/**
 * Handle creating a business (regular or chain)
 */
async function handleCreateBusiness(req, res) {
    try {
        // Ensure this is a POST request
        if (req.method !== 'POST') {
            return res.status(405).json({ message: 'Method Not Allowed' });
        }

        // Connect to MongoDB
        await connect;

        // Get business data from request
        const businessData = req.body;

        // Validate required fields
        const requiredFields = ['bname', 'type'];

        // If not a chain, also require address fields
        if (!businessData.is_chain) {
            requiredFields.push('address1', 'city', 'state', 'zip');
        }

        const missingFields = requiredFields.filter(field => !businessData[field]);

        if (missingFields.length > 0) {
            return res.status(400).json({
                message: `Missing required fields: ${missingFields.join(', ')}`
            });
        }

        // Add geospatial data if coordinates are provided and it's not a chain
        if (!businessData.is_chain && businessData.lat && businessData.lng) {
            businessData.location = {
                type: 'Point',
                coordinates: [
                    parseFloat(businessData.lng),
                    parseFloat(businessData.lat)
                ]
            };
        } else if (!businessData.is_chain && businessData.address1 && businessData.city && businessData.state) {
            // If coordinates weren't provided, geocode the address
            try {
                // Import the geocoding function
                const { geocodeAddress } = require('../utils/geocoding');

                const address = `${businessData.address1}, ${businessData.city}, ${businessData.state} ${businessData.zip}`;
                const coordinates = await geocodeAddress(address);

                if (coordinates) {
                    businessData.location = {
                        type: 'Point',
                        coordinates: [coordinates.lng, coordinates.lat]
                    };
                    console.log("Geocoded coordinates:", coordinates);
                } else {
                    console.warn("Could not geocode address:", address);
                }
            } catch (geocodeError) {
                console.error("Error geocoding address:", geocodeError);
            }
        }

        // If it's a chain, initialize the locations array
        if (businessData.is_chain && !businessData.locations) {
            businessData.locations = [];
        }

        // Add timestamps
        businessData.created_at = new Date();
        businessData.updated_at = new Date();

        // Insert business data
        const newBusiness = new Business(businessData);
        const result = await newBusiness.save();

        return res.status(201).json({
            message: businessData.is_chain ? 'Chain created successfully' : 'Business created successfully',
            result: result
        });
    } catch (error) {
        console.error('Error creating business:', error);
        return res.status(500).json({ message: 'Error creating business', error: error.message });
    }
}

/**
 * Handle updating a business (regular or chain)
 */
async function handleUpdateBusiness(req, res) {
    try {
        // Ensure this is a POST request
        if (req.method !== 'POST') {
            return res.status(405).json({ message: 'Method Not Allowed' });
        }

        // Connect to MongoDB
        await connect;

        // Get business data from request
        const businessData = req.body;

        if (!businessData._id) {
            return res.status(400).json({ message: 'Business ID is required' });
        }

        // Find the business to check if it exists
        const existingBusiness = await Business.findById(businessData._id);

        if (!existingBusiness) {
            return res.status(404).json({ message: 'Business not found' });
        }

        // Update geospatial data if coordinates are provided and it's not a chain
        if (!businessData.is_chain && businessData.lat && businessData.lng) {
            businessData.location = {
                type: 'Point',
                coordinates: [
                    parseFloat(businessData.lng),
                    parseFloat(businessData.lat)
                ]
            };
        } else if (!businessData.is_chain && businessData.address1 && businessData.city && businessData.state) {
            // If coordinates weren't provided, geocode the address
            try {
                // Import the geocoding function
                const { geocodeAddress } = require('../utils/geocoding');

                const address = `${businessData.address1}, ${businessData.city}, ${businessData.state} ${businessData.zip}`;
                const coordinates = await geocodeAddress(address);

                if (coordinates) {
                    businessData.location = {
                        type: 'Point',
                        coordinates: [coordinates.lng, coordinates.lat]
                    };
                    console.log("Geocoded coordinates:", coordinates);
                } else {
                    console.warn("Could not geocode address:", address);
                }
            } catch (geocodeError) {
                console.error("Error geocoding address:", geocodeError);
            }
        }

        // Update timestamp
        businessData.updated_at = new Date();

        // Update business
        const result = await Business.findByIdAndUpdate(
            businessData._id,
            businessData,
            { new: true }
        );

        return res.status(200).json({
            message: businessData.is_chain ? 'Chain updated successfully' : 'Business updated successfully',
            result: result
        });
    } catch (error) {
        console.error('Error updating business:', error);
        return res.status(500).json({ message: 'Error updating business', error: error.message });
    }
}

/**
 * Handle business updates without requiring admin privileges
 */
async function handleUpdateBusinessNoAdmin(req, res) {
    // Only allow PUT requests
    if (req.method !== 'PUT') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        // Get business data from request
        const businessData = req.body;
        const businessId = businessData.businessId;

        // Validate business ID
        if (!businessId) {
            return res.status(400).json({ message: 'Business ID is required' });
        }

        // Remove businessId from update data
        delete businessData.businessId;

        // Connect to MongoDB
        await connect;

        // Check if business exists
        const existingBusiness = await Business.findById(businessId);

        if (!existingBusiness) {
            return res.status(404).json({ message: 'Business not found' });
        }

        // Handle chain-specific updates
        if (existingBusiness.is_chain || businessData.is_chain) {
            // Ensure locations array exists
            if (!businessData.locations && existingBusiness.locations) {
                businessData.locations = existingBusiness.locations;
            } else if (!businessData.locations) {
                businessData.locations = [];
            }
        }
        // Handle regular business updates (not a chain)
        else {
            // Add geospatial data if coordinates are provided
            if (businessData.lat && businessData.lng) {
                businessData.location = {
                    type: 'Point',
                    coordinates: [
                        parseFloat(businessData.lng),
                        parseFloat(businessData.lat)
                    ]
                };
            } else if (businessData.address1 && businessData.city && businessData.state) {
                // If coordinates weren't provided, geocode the address
                try {
                    // Import the geocoding function
                    const { geocodeAddress } = require('../utils/geocoding');

                    const address = `${businessData.address1}, ${businessData.city}, ${businessData.state} ${businessData.zip}`;
                    const coordinates = await geocodeAddress(address);

                    if (coordinates) {
                        businessData.location = {
                            type: 'Point',
                            coordinates: [coordinates.lng, coordinates.lat]
                        };
                        console.log("Geocoded coordinates:", coordinates);
                    } else {
                        console.warn("Could not geocode address:", address);
                    }
                } catch (geocodeError) {
                    console.error("Error geocoding address:", geocodeError);
                }
            }

            // Check if another business has the same name and address
            const duplicateBusiness = await Business.findOne({
                _id: { $ne: businessId },
                bname: businessData.bname,
                address1: businessData.address1,
                city: businessData.city,
                state: businessData.state,
                zip: businessData.zip
            });

            if (duplicateBusiness) {
                return res.status(409).json({ message: 'Another business with this name and address already exists' });
            }
        }

        // Update timestamp
        businessData.updated_at = new Date();

        // Update business
        const result = await Business.findByIdAndUpdate(
            businessId,
            { $set: businessData },
            { new: true }
        );

        // If this is a chain business and the name was updated, also update all locations
        if (existingBusiness.is_chain && businessData.bname && businessData.bname !== existingBusiness.bname) {
            // Update chain_name for all locations
            await Business.updateMany(
                { chain_id: businessId },
                { $set: { chain_name: businessData.bname } }
            );
        }

        return res.status(200).json({
            message: existingBusiness.is_chain ? 'Chain updated successfully' : 'Business updated successfully',
            businessId: result._id
        });
    } catch (error) {
        console.error('Error updating business:', error);
        return res.status(500).json({ message: 'Server error updating business: ' + error.message });
    }
}

/**
 * Handle admin get business details
 */
async function handleAdminGetBusiness(req, res) {
    // Verify admin token
    const auth = await verifyAdminToken(req);
    if (!auth.authorized) {
        return res.status(401).json({ message: auth.message });
    }

    // Get business ID from query
    const { businessId } = req.query;

    if (!businessId) {
        return res.status(400).json({ message: 'Business ID is required' });
    }

    try {
        // Connect to MongoDB
        await connect;

        // Find business by ID
        const business = await Business.findById(businessId).lean();

        if (!business) {
            return res.status(404).json({ message: 'Business not found' });
        }

        return res.status(200).json({
            business
        });
    } catch (error) {
        console.error('Error getting business details:', error);
        return res.status(500).json({ message: 'Server error getting business details: ' + error.message });
    }
}

/**
 * Handle admin create business
 */
async function handleAdminCreateBusiness(req, res) {
    // Verify admin token
    const auth = await verifyAdminToken(req);
    if (!auth.authorized) {
        return res.status(401).json({ message: auth.message });
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        // Get business data from request
        const businessData = req.body;

        // Validate required fields
        let requiredFields = ['bname', 'type'];

        // If it's not a chain, also require address fields
        if (!businessData.is_chain) {
            requiredFields = [...requiredFields, 'address1', 'city', 'state', 'zip', 'phone'];
        }

        const missingFields = requiredFields.filter(field => !businessData[field]);

        if (missingFields.length > 0) {
            return res.status(400).json({
                message: `Missing required fields: ${missingFields.join(', ')}`
            });
        }

        // Connect to MongoDB
        await connect;

        // Handle chain-specific setup
        if (businessData.is_chain) {
            // Initialize locations array if not provided
            if (!businessData.locations) {
                businessData.locations = [];
            }

            // Set default value for universal_incentives if not provided
            if (businessData.universal_incentives === undefined) {
                businessData.universal_incentives = true; // Default to true for chains
            }
        }
        // Handle regular business setup (not a chain)
        else {
            // Add geospatial data if coordinates are provided
            if (businessData.lat && businessData.lng) {
                businessData.location = {
                    type: 'Point',
                    coordinates: [
                        parseFloat(businessData.lng),
                        parseFloat(businessData.lat)
                    ]
                };
            } else if (businessData.address1 && businessData.city && businessData.state) {
                // If coordinates weren't provided, geocode the address
                try {
                    // Import the geocoding function
                    const { geocodeAddress } = require('../utils/geocoding');

                    const address = `${businessData.address1}, ${businessData.city}, ${businessData.state} ${businessData.zip}`;
                    const coordinates = await geocodeAddress(address);

                    if (coordinates) {
                        businessData.location = {
                            type: 'Point',
                            coordinates: [coordinates.lng, coordinates.lat]
                        };
                        console.log("Geocoded coordinates:", coordinates);
                    } else {
                        console.warn("Could not geocode address:", address);
                    }
                } catch (geocodeError) {
                    console.error("Error geocoding address:", geocodeError);
                }
            }

            // Check if regular business already exists
            const existingBusiness = await Business.findOne({
                bname: businessData.bname,
                address1: businessData.address1,
                city: businessData.city,
                state: businessData.state,
                zip: businessData.zip
            });

            if (existingBusiness) {
                return res.status(409).json({ message: 'Business with this name and address already exists' });
            }
        }

        // Add timestamps and default status if not provided
        businessData.created_at = new Date();
        businessData.updated_at = new Date();

        if (!businessData.status) {
            businessData.status = 'active';
        }

        // Insert business data
        const newBusiness = new Business(businessData);
        const result = await newBusiness.save();

        return res.status(201).json({
            message: businessData.is_chain ? 'Chain created successfully' : 'Business created successfully',
            businessId: result._id
        });
    } catch (error) {
        console.error('Error creating business:', error);
        return res.status(500).json({ message: 'Server error creating business: ' + error.message });
    }
}

/**
 * Handle admin update business
 */
async function handleAdminUpdateBusiness(req, res) {
    // Verify admin token
    const auth = await verifyAdminToken(req);
    if (!auth.authorized) {
        return res.status(401).json({ message: auth.message });
    }

    // Only allow PUT requests
    if (req.method !== 'PUT') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        // Get business data from request
        const businessData = req.body;
        const businessId = businessData.businessId;

        // Validate business ID
        if (!businessId) {
            return res.status(400).json({ message: 'Business ID is required' });
        }

        // Remove businessId from update data
        delete businessData.businessId;

        // Connect to MongoDB
        await connect;

        // Check if business exists
        const existingBusiness = await Business.findById(businessId);

        if (!existingBusiness) {
            return res.status(404).json({ message: 'Business not found' });
        }

        // Handle chain-specific updates
        if (existingBusiness.is_chain || businessData.is_chain) {
            // Ensure locations array exists
            if (!businessData.locations && existingBusiness.locations) {
                businessData.locations = existingBusiness.locations;
            } else if (!businessData.locations) {
                businessData.locations = [];
            }
        }
        // Handle regular business updates (not a chain)
        else {
            // Add geospatial data if coordinates are provided
            if (businessData.lat && businessData.lng) {
                businessData.location = {
                    type: 'Point',
                    coordinates: [
                        parseFloat(businessData.lng),
                        parseFloat(businessData.lat)
                    ]
                };
            } else if (businessData.address1 && businessData.city && businessData.state) {
                // If coordinates weren't provided, geocode the address
                try {
                    // Import the geocoding function
                    const { geocodeAddress } = require('../utils/geocoding');

                    const address = `${businessData.address1}, ${businessData.city}, ${businessData.state} ${businessData.zip}`;
                    const coordinates = await geocodeAddress(address);

                    if (coordinates) {
                        businessData.location = {
                            type: 'Point',
                            coordinates: [coordinates.lng, coordinates.lat]
                        };
                        console.log("Geocoded coordinates:", coordinates);
                    } else {
                        console.warn("Could not geocode address:", address);
                    }
                } catch (geocodeError) {
                    console.error("Error geocoding address:", geocodeError);
                }
            }

            // Check if another business has the same name and address
            const duplicateBusiness = await Business.findOne({
                _id: { $ne: businessId },
                bname: businessData.bname,
                address1: businessData.address1,
                city: businessData.city,
                state: businessData.state,
                zip: businessData.zip
            });

            if (duplicateBusiness) {
                return res.status(409).json({ message: 'Another business with this name and address already exists' });
            }
        }

        // Update timestamp
        businessData.updated_at = new Date();

        // Update business
        const result = await Business.findByIdAndUpdate(
            businessId,
            { $set: businessData },
            { new: true }
        );

        // If this is a chain business and the name was updated, also update all locations
        if (existingBusiness.is_chain && businessData.bname && businessData.bname !== existingBusiness.bname) {
            // Update chain_name for all locations
            await Business.updateMany(
                { chain_id: businessId },
                { $set: { chain_name: businessData.bname } }
            );
        }

        return res.status(200).json({
            message: existingBusiness.is_chain ? 'Chain updated successfully' : 'Business updated successfully',
            businessId: result._id
        });
    } catch (error) {
        console.error('Error updating business:', error);
        return res.status(500).json({ message: 'Server error updating business: ' + error.message });
    }
}

async function handleCheckPlaceExists(req, res) {
    try {
        const { place_id } = req.query;

        if (!place_id) {
            return res.status(400).json({
                success: false,
                message: 'Place ID is required'
            });
        }

        // Connect to MongoDB
        await connect;

        // Check if a business with this place ID exists
        const business = await Business.findOne({ placeId: place_id }).lean();

        return res.status(200).json({
            success: true,
            exists: !!business
        });
    } catch (error) {
        console.error('Error checking if place exists:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error: ' + error.message
        });
    }
}

/**
 * Find matching chains for a place name
 * Add this to your api/business.js file as a new operation handler
 */
async function handleFindMatchingChain(req, res) {
    try {
        const { place_name } = req.query;

        if (!place_name) {
            return res.status(400).json({
                success: false,
                message: 'Place name is required'
            });
        }

        // Connect to MongoDB
        await connect;

        // Search for chains with similar names
        const chains = await Business.find({
            is_chain: true,
            $or: [
                // Exact match
                { bname: new RegExp(`^${place_name}$`, 'i') },
                // Partial match
                { bname: new RegExp(`${place_name}`, 'i') },
                // Chain name contains place name
                { bname: new RegExp(`.*${place_name}.*`, 'i') }
            ]
        }).lean();

        // If there are multiple matches, find the best one
        if (chains.length > 0) {
            // Sort by name similarity (closest match first)
            chains.sort((a, b) => {
                const aSimilarity = calculateNameSimilarity(a.bname.toLowerCase(), place_name.toLowerCase());
                const bSimilarity = calculateNameSimilarity(b.bname.toLowerCase(), place_name.toLowerCase());
                return bSimilarity - aSimilarity; // Higher similarity first
            });

            // Return the best match
            return res.status(200).json({
                success: true,
                chain: chains[0]
            });
        }

        // No matches found
        return res.status(404).json({
            success: false,
            message: 'No matching chain found'
        });
    } catch (error) {
        console.error('Error finding matching chain:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error: ' + error.message
        });
    }
}

function calculateNameSimilarity(chainName, placeName) {
    // Clean and normalize names for better matching
    chainName = chainName.toLowerCase()
        .replace(/^the\s+/, '') // Remove leading "The "
        .replace(/\s+inc\.?$/, '') // Remove trailing Inc/Inc.
        .replace(/\s+corp\.?$/, '') // Remove trailing Corp/Corp.
        .replace(/\s+corporation$/, '') // Remove trailing Corporation
        .replace(/[^\w\s]/g, '') // Remove punctuation
        .trim();

    placeName = placeName.toLowerCase()
        .replace(/^the\s+/, '')
        .replace(/\s+inc\.?$/, '')
        .replace(/\s+corp\.?$/, '')
        .replace(/\s+corporation$/, '')
        .replace(/[^\w\s]/g, '')
        .trim();

    // Check for exact match after normalization
    if (chainName === placeName) return 1.0;

    // Check if one contains the other
    if (chainName.includes(placeName) || placeName.includes(chainName)) return 0.9;

    // Calculate word similarity
    const chainWords = chainName.split(/\s+/);
    const placeWords = placeName.split(/\s+/);

    let matchingWords = 0;
    for (const word of chainWords) {
        if (word.length > 2 && placeWords.includes(word)) {
            matchingWords++;
        }
    }

    // Consider it a match if at least 50% of words match
    return matchingWords / Math.max(chainWords.length, placeWords.length);
}

/**
 * Handle admin delete business
 */
async function handleAdminDeleteBusiness(req, res) {
    // Verify admin token
    const auth = await verifyAdminToken(req);
    if (!auth.authorized) {
        return res.status(401).json({ message: auth.message });
    }

    // Only allow DELETE requests
    if (req.method !== 'DELETE') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        // Get business ID from request body
        const { businessId } = req.body;

        if (!businessId) {
            return res.status(400).json({ message: 'Business ID is required' });
        }

        // Connect to MongoDB
        await connect;

        // Check if business exists
        const existingBusiness = await Business.findById(businessId);

        if (!existingBusiness) {
            return res.status(404).json({ message: 'Business not found' });
        }

        // If this is a chain, handle chain deletion
        if (existingBusiness.is_chain) {
            // Remove chain association from all locations
            await Business.updateMany(
                { chain_id: businessId },
                {
                    $unset: {
                        chain_id: 1,
                        chain_name: 1
                    }
                }
            );
        }
        // If this is a location in a chain, remove it from the chain's locations array
        else if (existingBusiness.chain_id) {
            await Business.findByIdAndUpdate(
                existingBusiness.chain_id,
                { $pull: { locations: businessId } }
            );
        }

        // Delete business
        const result = await Business.findByIdAndDelete(businessId);

        return res.status(200).json({
            message: existingBusiness.is_chain ? 'Chain deleted successfully' : 'Business deleted successfully',
            businessId: businessId
        });
    } catch (error) {
        console.error('Error deleting business:', error);
        return res.status(500).json({ message: 'Server error deleting business: ' + error.message });
    }
}

/**
 * UPDATED: Enhanced business add operation with proper chain inheritance
 * Add this to your business API's add operation handler
 */

// In your business.js API file, update the add operation handler:
async function handleAddBusiness(req, res) {
    console.log("🏢 BUSINESS ADD: Enhanced add with chain inheritance");

    try {
        const businessData = req.body;
        console.log("📝 Business data received:", businessData);

        // Validate required fields
        if (!businessData.name || !businessData.address1) {
            return res.status(400).json({ message: 'Business name and address are required' });
        }

        // ENHANCED: Handle chain inheritance
        let chainInheritanceData = {};

        if (businessData.chain_id) {
            console.log(`🔗 CHAIN INHERITANCE: Processing chain ID ${businessData.chain_id}`);

            try {
                // Get chain details from chains collection
                const Chain = mongoose.model('Chain'); // Your chains model
                const chainDetails = await Chain.findById(businessData.chain_id);

                if (chainDetails) {
                    console.log(`✅ Chain found: ${chainDetails.chain_name}`);
                    console.log(`   - Universal Incentives: ${chainDetails.universal_incentives}`);

                    // CRITICAL FIX: Inherit chain properties
                    chainInheritanceData = {
                        chain_id: businessData.chain_id,
                        chain_name: chainDetails.chain_name,
                        is_chain_location: true,
                        // CRITICAL: Inherit universal_incentives from parent chain
                        universal_incentives: chainDetails.universal_incentives
                    };

                    console.log(`🔗 Chain inheritance data:`, chainInheritanceData);
                } else {
                    console.warn(`⚠️ Chain not found for ID: ${businessData.chain_id}`);
                }
            } catch (chainError) {
                console.error("❌ Error getting chain details for inheritance:", chainError);
            }
        }

        // Create the business document with inherited chain properties
        const newBusiness = {
            bname: businessData.name,
            address1: businessData.address1,
            address2: businessData.address2 || '',
            city: businessData.city || '',
            state: businessData.state || '',
            zip: businessData.zip || '',
            phone: businessData.phone || '',
            type: businessData.type || 'OTHER',
            status: 'active',

            // Location data
            location: businessData.location || {
                type: 'Point',
                coordinates: [
                    parseFloat(businessData.lng) || 0,
                    parseFloat(businessData.lat) || 0
                ]
            },

            // ENHANCED: Include all chain inheritance data
            ...chainInheritanceData,

            // Set universal_incentives from chain or default to false
            universal_incentives: chainInheritanceData.universal_incentives || false,

            // Metadata
            created_by: req.user?.id || 'system',
            created_at: new Date(),
            updated_at: new Date()
        };

        console.log("💾 Final business document to save:", newBusiness);

        // Save the business
        const Business = mongoose.model('Business'); // Your business model
        const savedBusiness = await Business.create(newBusiness);

        console.log(`✅ Business saved successfully: ${savedBusiness._id}`);
        console.log(`   - Chain ID: ${savedBusiness.chain_id || 'None'}`);
        console.log(`   - Universal Incentives: ${savedBusiness.universal_incentives}`);

        return res.status(201).json({
            success: true,
            message: 'Business added successfully',
            businessId: savedBusiness._id,
            chainInfo: chainInheritanceData.chain_id ? {
                chainId: chainInheritanceData.chain_id,
                chainName: chainInheritanceData.chain_name,
                universalIncentives: chainInheritanceData.universal_incentives
            } : null
        });

    } catch (error) {
        console.error("❌ Error in enhanced business add:", error);
        return res.status(500).json({
            success: false,
            message: 'Error adding business: ' + error.message
        });
    }
}

/**
 * UPDATED: Enhanced incentive retrieval with proper chain inheritance handling
 * This should replace your existing incentive retrieval logic
 */
async function getBusinessIncentivesWithChainInheritance(businessId) {
    console.log(`🎁 ENHANCED INCENTIVES: Getting incentives for business ${businessId}`);

    try {
        const Business = mongoose.model('Business');
        const business = await Business.findById(businessId);

        if (!business) {
            console.error(`❌ Business not found: ${businessId}`);
            return [];
        }

        console.log(`📊 Business details for incentives:`);
        console.log(`   - Name: ${business.bname}`);
        console.log(`   - Chain ID: ${business.chain_id || 'None'}`);
        console.log(`   - Universal Incentives: ${business.universal_incentives}`);
        console.log(`   - Is Chain Location: ${business.is_chain_location || false}`);

        // If this is a chain location with universal incentives enabled
        if (business.chain_id && business.universal_incentives) {
            console.log(`🔗 CHAIN INCENTIVES: Loading chain incentives for ${business.bname}`);

            try {
                const Chain = mongoose.model('Chain');
                const chainDetails = await Chain.findById(business.chain_id);

                if (chainDetails && chainDetails.incentives && chainDetails.incentives.length > 0) {
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
                            is_chain_wide: true // Mark as chain-wide
                        }));

                    console.log(`✅ Found ${chainIncentives.length} chain incentives for ${business.bname}`);
                    return chainIncentives;
                } else {
                    console.log(`❌ No active chain incentives found for chain ${business.chain_id}`);
                    return [];
                }
            } catch (chainError) {
                console.error("❌ Error loading chain incentives:", chainError);
                return [];
            }
        } else {
            // Check for location-specific incentives
            const Incentive = mongoose.model('Incentive');
            const locationIncentives = await Incentive.find({
                business_id: businessId,
                is_available: true
            });

            console.log(`📍 Found ${locationIncentives.length} location-specific incentives`);
            return locationIncentives;
        }

    } catch (error) {
        console.error("❌ Error in getBusinessIncentivesWithChainInheritance:", error);
        return [];
    }
}
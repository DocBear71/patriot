// server.js
const express = require('express');
const path = require('path');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');
const bcrypt = require('bcryptjs');

// Create Express app
const app = express();

// Enable JSON parsing and CORS
app.use(express.json());
app.use(cors());

// MongoDB connection details
console.log("Environment variable available:", !!process.env.MONGODB_URI_PATRIOT);
const MONGODB_URI = process.env.MONGODB_URI_PATRIOT;

// If environment variable is missing, log an error
if (!MONGODB_URI) {
    console.error("ERROR: MONGODB_URI_PATRIOT environment variable is not set!");
    // Don't use a fallback in production - it won't work on Vercel
}

const MONGODB_DB = 'patriot';
const USERS_COLLECTION = 'users';
const BUSINESS_COLLECTION = 'business';
const INCENTIVES_COLLECTION = 'incentives';

// Add a debug middleware to log all requests
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Simplified registration endpoint for serverless
app.post(['/api/register', '/api/registration'], async (req, res) => {
    console.log("Registration API hit:", req.method);

    let client = null;

    try {
        // Connect to MongoDB
        client = await MongoClient.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 10000,
            socketTimeoutMS: 15000,
        });

        const db = client.db(MONGODB_DB);
        const collection = db.collection(USERS_COLLECTION);

        // Extract user data from request body
        const userData = req.body;

        // Basic validation
        if (!userData.email || (!userData.password && !userData.psw)) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        // Check if user already exists
        const existingUser = await collection.findOne({ email: userData.email });

        if (existingUser) {
            return res.status(409).json({ message: 'User with this email already exists' });
        }

        // Prepare data for insertion
        if (userData.psw_repeat) delete userData.psw_repeat;
        if (userData.psw && !userData.password) {
            userData.password = userData.psw;
            delete userData.psw;
        }

        // Hash the password - THIS LINE IS CRITICAL
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        userData.password = hashedPassword;

        // Insert user data
        const result = await collection.insertOne(userData);

        // Return success response
        return res.status(201).json({
            message: 'User registered successfully',
            userId: result.insertedId
        });

    } catch (error) {
        console.error('Registration error:', error);
        return res.status(500).json({ message: 'Server error during registration: ' + error.message });
    } finally {
        // Close the connection
        if (client) await client.close();
    }
});

// Business registration endpoint
app.post(['/api/business', '/api/businesses'], async (req, res) => {
    console.log("Business API hit:", req.method);

    let client = null;

    try {
        // Connect to MongoDB
        client = await MongoClient.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 10000,
            socketTimeoutMS: 15000,
        });

        const db = client.db(MONGODB_DB);
        const collection = db.collection(BUSINESS_COLLECTION);

        // Extract business data from request body
        const businessData = req.body;

        // Check if business already exists
        const existingBusiness = await db.collection('business').findOne({
            address1: businessData.address1,
            address2: businessData.address2,
            city: businessData.city,
            state: businessData.state,
            zip: businessData.zip
        });
        if (existingBusiness) {
            return res.status(409).json({ message: 'Business with this address already exists' });
        }

        // Insert business data
        const result = await collection.insertOne(businessData);

        // Return success response
        return res.status(201).json({
            message: 'business registered successfully',
            businessId: result.insertedId
        });

    } catch (error) {
        console.error('Submission error:', error);
        return res.status(500).json({ message: 'Server error during Submission: ' + error.message });
    } finally {
        // Close the connection
        if (client) await client.close();
    }
});

// Business search endpoint
app.get(['/api/business', '/api/business-search'], async (req, res) => {
    console.log("Business search API hit:", req.method);
    console.log("Query parameters:", req.query);

    let client = null;

    try {
        // Connect to MongoDB
        client = await MongoClient.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 10000,
            socketTimeoutMS: 15000,
        });

        const db = client.db(MONGODB_DB);
        const collection = db.collection(BUSINESS_COLLECTION);

        // Build query based on provided parameters
        const query = {};
        const searchConditions = [];

        if (req.query.businessName && req.query.businessName.trim() !== '') {
            // Search by business name
            searchConditions.push({ bname: { $regex: req.query.businessName, $options: 'i' } });
        }

        if (req.query.address && req.query.address.trim() !== '') {
            // Search in multiple address fields
            searchConditions.push({ address1: { $regex: req.query.address, $options: 'i' } });
            searchConditions.push({ address2: { $regex: req.query.address, $options: 'i' } });
            searchConditions.push({ city: { $regex: req.query.address, $options: 'i' } });
            searchConditions.push({ zip: { $regex: req.query.address, $options: 'i' } });
        }

        // If we have search conditions, use $or to match any of them
        if (searchConditions.length > 0) {
            query.$or = searchConditions;
        }

        console.log("MongoDB Query:", JSON.stringify(query, null, 2));

        // Find businesses matching the query
        const businesses = await collection.find(query).toArray();

        return res.status(200).json({
            message: 'Search successful',
            results: businesses
        });

    } catch (error) {
        console.error('Search error:', error);
        return res.status(500).json({ message: 'Server error during search: ' + error.message });
    } finally {
        // Close the connection
        if (client) await client.close();
    }
});

// Add this to your server.js
app.post('/api/test-incentive-path', (req, res) => {
    console.log("Test incentive path hit:", req.body);
    res.status(200).json({
        message: 'Test incentive path is working!',
        receivedData: req.body
    });
});

// NEW API: Add incentives to a business
app.post('/api/incentives/add', async (req, res) => {
    console.log("Incentives API hit:", req.method);
    console.log("Request body:", req.body);

    let client = null;

    try {
        // Connect to MongoDB
        client = await MongoClient.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 10000,
            socketTimeoutMS: 15000,
        });

        const db = client.db(MONGODB_DB);
        const incentivesCollection = db.collection(INCENTIVES_COLLECTION);
        const businessCollection = db.collection(BUSINESS_COLLECTION);

        // Extract incentive data from request body
        const incentiveData = req.body;

        // Basic validation
        if (!incentiveData.business_id) {
            return res.status(400).json({ message: 'Business ID is required' });
        }

        // Check if the business exists
        const businessExists = await businessCollection.findOne({
            _id: new ObjectId(incentiveData.business_id)
        });

        if (!businessExists) {
            return res.status(404).json({ message: 'Business not found' });
        }

        // Prepare incentive data for insertion
        const incentive = {
            business_id: incentiveData.business_id,
            is_available: incentiveData.is_available,
            type: incentiveData.type || '',
            amount: parseFloat(incentiveData.amount) || 0,
            information: incentiveData.information || '',
            created_at: new Date(),
            updated_at: new Date()
        };

        // Add the other_description field if provided
        if (incentiveData.type === 'OT' && incentiveData.other_description) {
            incentive.other_description = incentiveData.other_description;
        }

        // Insert incentive data
        const result = await incentivesCollection.insertOne(incentive);

        // Return success response
        return res.status(201).json({
            message: 'Incentive added successfully',
            incentiveId: result.insertedId
        });

    } catch (error) {
        console.error('Incentive submission error:', error);
        return res.status(500).json({ message: 'Server error during incentive submission: ' + error.message });
    } finally {
        // Close the connection
        if (client) await client.close();
    }
});

// NEW API: Get incentives for a business
app.get('/api/incentives/:businessId', async (req, res) => {
    console.log("Get incentives API hit:", req.method);
    console.log("Business ID:", req.params.businessId);

    let client = null;

    try {
        // Connect to MongoDB
        client = await MongoClient.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 10000,
            socketTimeoutMS: 15000,
        });

        const db = client.db(MONGODB_DB);
        const incentivesCollection = db.collection(INCENTIVES_COLLECTION);

        // Get business ID from path parameter
        const businessId = req.params.businessId;

        // Find incentives for the business
        const incentives = await incentivesCollection.find({
            business_id: businessId
        }).toArray();

        return res.status(200).json({
            message: 'Incentives retrieved successfully',
            results: incentives
        });

    } catch (error) {
        console.error('Get incentives error:', error);
        return res.status(500).json({ message: 'Server error while retrieving incentives: ' + error.message });
    } finally {
        // Close the connection
        if (client) await client.close();
    }
});

// Admin code verification endpoint
app.post('/api/verify-admin-code', async (req, res) => {
    console.log("Admin code verification API hit:", req.method);

    let client = null;

    try {
        // Extract verification data from request body
        const { code, userId } = req.body;

        // Basic validation
        if (!code) {
            return res.status(400).json({ message: 'Access code is required' });
        }

        // Connect to MongoDB
        client = await MongoClient.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 10000,
            socketTimeoutMS: 15000,
        });

        const db = client.db(MONGODB_DB);
        const adminCodesCollection = db.collection('admin_codes');
        const usersCollection = db.collection(USERS_COLLECTION);

        // Find the code in the admin_codes collection
        const adminCode = await adminCodesCollection.findOne({ code: code });

        if (!adminCode) {
            return res.status(401).json({ message: 'Invalid admin access code' });
        }

        // Check if code is expired
        if (adminCode.expiration && new Date() > new Date(adminCode.expiration)) {
            return res.status(401).json({ message: 'Admin access code has expired' });
        }

        // If userId is provided, update the user's status to Admin
        if (userId) {
            await usersCollection.updateOne(
                { _id: new ObjectId(userId) },
                { $set: { status: 'AD', isAdmin: true } }
            );
        }

        // Return success response
        return res.status(200).json({
            message: 'Admin access verified successfully',
            description: adminCode.description,
            access: true
        });

    } catch (error) {
        console.error('Admin verification error:', error);
        return res.status(500).json({ message: 'Server error during admin verification: ' + error.message });
    } finally {
        // Close the connection
        if (client) await client.close();
    }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
    console.log("Login API hit:", req.method);

    let client = null;

    try {
        // Connect to MongoDB
        client = await MongoClient.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 10000,
            socketTimeoutMS: 15000,
        });

        const db = client.db(MONGODB_DB);
        const collection = db.collection(USERS_COLLECTION);

        // Extract login credentials from request body
        const { email, password } = req.body;

        // Basic validation
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        // Find user by email
        const user = await collection.findOne({ email });

        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Compare passwords
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Return success response with user info (excluding password)
        const userInfo = { ...user };
        delete userInfo.password;

        return res.status(200).json({
            message: 'Login successful',
            userId: user._id,
            email: user.email,
            status: user.status || 'US',
            // Add any other fields you want to return
        });

    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ message: 'Server error during login: ' + error.message });
    } finally {
        // Close the connection
        if (client) await client.close();
    }
});

// Test API endpoint
app.get('/api/test', (req, res) => {
    res.status(200).json({
        message: 'API is working!',
        timestamp: new Date().toISOString()
    });
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Route definitions for HTML pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

// For any other route
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server for local development
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

// Export the Express app for serverless environments
module.exports = app;
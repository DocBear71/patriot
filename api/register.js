// api/register.js - User registration endpoint
const express = require('express');
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const cors = require('cors');

// Create an Express server instance
const app = express();

// Enable JSON body parsing
app.use(express.json());

// Enable CORS for all routes
app.use(cors());

// MongoDB connection details
const MONGODB_URI = process.env.MONGODB_URI_PATRIOT || 'mongodb://localhost:27017/patriot-thanks';
const MONGODB_DB = process.env.MONGODB_DB_PATRIOT || 'patriot-thanks';

// Handle OPTIONS preflight requests
app.options('*', cors());

// POST endpoint for user registration
app.post('/', async (req, res) => {
    console.log("Registration API hit:", req.method);

    let client = null;

    try {
        console.log("Connecting to MongoDB...");

        // Connect to MongoDB
        client = await MongoClient.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 10000,
            socketTimeoutMS: 15000,
        });
        console.log("Connected to MongoDB");

        const db = client.db(MONGODB_DB);

        // Extract user data from request body
        const userData = req.body;
        console.log("Received user data:", userData);

        // Basic validation
        if (!userData.email || (!userData.password && !userData.psw)) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        // Check if user already exists
        const existingUser = await db.collection('users').findOne({ email: userData.email });
        if (existingUser) {
            return res.status(409).json({ message: 'User with this email already exists' });
        }

        // add timestamp fields
        userData.created_at = new Date();
        userData.updated_at = new Date();

        // check if Admin level and set isAdmin flag
        if (userData.level === 'Admin') {
            userData.isAdmin = true;
        }

        // Remove password repeat field before storing
        if (userData.psw_repeat) delete userData.psw_repeat;

        // Rename password field if necessary
        if (userData.psw && !userData.password) {
            userData.password = userData.psw;
            delete userData.psw;
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        userData.password = hashedPassword;

        console.log("Inserting user data...");
        // Insert user data
        const result = await db.collection('users').insertOne(userData);
        console.log("User inserted successfully:", result.insertedId);

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

// GET endpoint for testing
app.get('/', (req, res) => {
    res.status(200).json({ message: 'Register API is available' });
});

// Export the Express API
module.exports = app;
// server.js - Updated for serverless compatibility
const express = require('express');
const path = require('path');
const { MongoClient } = require('mongodb');
const cors = require('cors');

// Create Express app
const app = express();

// Enable JSON parsing and CORS
app.use(express.json());
app.use(cors());

// MongoDB connection details
const MONGODB_URI = process.env.MONGODB_URI_PATRIOT || 'mongodb://localhost:27017/patriot';
const MONGODB_DB = 'patriot';
const USERS_COLLECTION = 'users';

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
// server.js
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
const MONGODB_URI = process.env.MONGODB_URI_PATRIOT || 'mongodb://localhost:27017/patriot-thanks';
const MONGODB_DB = process.env.MONGODB_DB_PATRIOT || 'patriot-thanks';

// Serve static files from the client directory
app.use(express.static(path.join(__dirname, 'client')));

// API endpoint for registration
app.post('/api/register', async (req, res) => {
    console.log("Registration API hit:", req.method);

    try {
        console.log("Connecting to MongoDB...");

        // Connect to MongoDB
        const client = await MongoClient.connect(MONGODB_URI);
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

        // Remove password repeat field before storing
        if (userData.psw_repeat) delete userData.psw_repeat;

        // Rename password field if necessary
        if (userData.psw && !userData.password) {
            userData.password = userData.psw;
            delete userData.psw;
        }

        console.log("Inserting user data...");
        // Insert user data
        const result = await db.collection('users').insertOne(userData);
        console.log("User inserted successfully:", result.insertedId);

        // Close connection
        await client.close();

        // Return success response
        return res.status(201).json({
            message: 'User registered successfully',
            userId: result.insertedId
        });

    } catch (error) {
        console.error('Registration error:', error);
        return res.status(500).json({ message: 'Server error during registration: ' + error.message });
    }
});

// Test API endpoint
app.get('/api/test', (req, res) => {
    res.status(200).json({
        message: 'API is working!',
        timestamp: new Date().toISOString()
    });
});

// For any other GET request, serve the index.html file
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client', 'index.html'));
});

// Set port
const PORT = process.env.PORT || 3000;

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Export for Vercel
module.exports = app;
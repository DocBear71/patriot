const express = require("express");
const cors = require("cors");
const path = require("node:path");
const app = express();


app.use(cors());
app.get('/path-join', (req, res) => {
    const joinedPath = path.join(__dirname, "api", "index.js");
    res.json({result: joinedPath});
})



const { MongoClient } = require('mongodb');

module.exports = async function handler(req, res) {
    // CORS headers to allow requests from your domain
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Handle POST requests (registration)
    if (req.method === 'POST') {
        try {
            // Get form data from request body
            const data = req.body;

            // Log received data for debugging
            console.log('Received registration data:', data);

            // Validate required fields
            if (!data.fname || !data.lname || !data.address1 || !data.city ||
                !data.state || !data.zip || !data.email || !data.password) {
                return res.status(400).json({ message: 'Missing required fields' });
            }

            // Connect to MongoDB
            const client = await MongoClient.connect(process.env.MONGODB_URI_PATRIOT);
            const db = client.db(process.env.MONGODB_DB || 'patriot.users');

            // Check if email already exists
            const existingUser = await db.collection('users').findOne({ email: data.email });
            if (existingUser) {
                await client.close();
                return res.status(400).json({ message: 'Email already registered' });
            }

            // Insert the user
            const result = await db.collection('users').insertOne(data);

            await client.close();

            // Return success response
            return res.status(201).json({
                message: 'User registered successfully',
                userId: result.insertedId.toString()
            });

        } catch (error) {
            console.error('API error:', error);
            return res.status(500).json({
                message: 'Server error',
                error: error.message
            });
        }
    }
    // Handle GET requests - useful for checking if API is working
    else if (req.method === 'GET') {
        return res.status(200).json({ message: 'API is running' });
    }
    // Handle unsupported methods
    else {
        return res.status(405).json({ message: 'Method not allowed' });
    }
};
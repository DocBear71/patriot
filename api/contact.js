// api/contact.js - Contact form submission endpoint
const express = require('express');
const { MongoClient } = require('mongodb');
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

// POST endpoint for contact form submission
app.post('/', async (req, res) => {
    console.log("Contact API route hit:", req.method);

    try {
        console.log("Connecting to MongoDB...");

        // Connect to MongoDB
        const client = await MongoClient.connect(MONGODB_URI);
        console.log("Connected to MongoDB");

        const db = client.db(MONGODB_DB);

        // Extract contact data from request body
        const contactData = req.body;
        console.log("Received contact data:", contactData);

        // Basic validation
        if (!contactData.email || !contactData.firstname || !contactData.lastname || !contactData.subject) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // Add timestamp
        contactData.created_at = new Date();

        console.log("Inserting contact submission...");
        // Insert contact data
        const result = await db.collection('contacts').insertOne(contactData);
        console.log("Contact submitted successfully:", result.insertedId);

        // Close connection
        await client.close();

        // Return success response
        return res.status(201).json({
            message: 'Message sent successfully',
            contactId: result.insertedId
        });

    } catch (error) {
        console.error('Contact submission error:', error);
        return res.status(500).json({ message: 'Server error during contact submission: ' + error.message });
    }
});

// GET endpoint for testing
app.get('/', (req, res) => {
    res.status(200).json({ message: 'Contact API is available' });
});

// Export the Express API
module.exports = app;
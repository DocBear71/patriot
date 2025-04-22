// api/contact.js - Contact form submission endpoint
const connect = require('../config/db');
const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
    firstname: String,
    lastname: String,
    email: String,
    subject: String,
    message: String,
    created_at: { type: Date, default: Date.now },
});

// create the model if they don't already exist
let Contact;
try {
    // try to fetch the existing model
    Contact = mongoose.model('Contact');
} catch (error) {
    // define the model if it doesn't exist
    Contact = mongoose.model('Contact', contactSchema, 'contact');
}

module.exports = async (req, res) => {
    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Handle GET request for testing
    if (req.method === 'GET') {
        return res.status(200).json({ message: 'Contact API is available' });
    }

    // Only allow POST requests for actual operations
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        console.log("Contact API route hit:", req.method);
        console.log("Connecting to MongoDB...");

        // Connect to MongoDB - fix the connection call
        try {
            await connect;  // Since connect is already a Promise, just await it
            console.log("Database connection established");
        } catch (dbError) {
            console.error("Database connection error:", dbError);
            return res.status(500).json({ message: 'Database connection error', error: dbError.message });
        }

        // Extract contact data from request body
        const contactData = req.body;
        console.log("Received contact data:", contactData);

        // Basic validation
        if (!contactData.email || !contactData.firstname || !contactData.lastname || !contactData.subject || !contactData.message) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // Add timestamp
        contactData.created_at = new Date();

        console.log("Inserting contact submission...");
        // Insert contact data using mongoose
        const newContact = new Contact(contactData);
        const result = await newContact.save();
        console.log("Contact submitted successfully:", result._id);

        // Return success response
        return res.status(201).json({
            message: 'Message sent successfully',
            contactId: result._id
        });

    } catch (error) {
        console.error('Contact submission error:', error);
        return res.status(500).json({ message: 'Server error during contact submission: ' + error.message })
    }
}

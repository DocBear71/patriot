const { MongoClient } = require('mongodb');

module.exports = async function handler(req, res) {
    // Log request details for debugging
    console.log('API request received:', req.method);

    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        // Log request body
        console.log('Request body:', req.body);

        // Get form data from request body
        const data = req.body;

        // Validate required fields
        if (!data.fname || !data.lname || !data.address1 || !data.city ||
            !data.state || !data.zip || !data.email || !data.password) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // Log MongoDB connection attempt
        console.log('Attempting to connect to MongoDB...');

        // Check if env vars are available
        if (!process.env.MONGODB_URI) {
            console.error('MONGODB_URI environment variable is not set');
            return res.status(500).json({ message: 'Database configuration error' });
        }

        // Connect to MongoDB
        const client = await MongoClient.connect(process.env.MONGODB_URI);

        // Log successful connection
        console.log('MongoDB connected');

        const db = client.db(process.env.MONGODB_DB || 'patriot');

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
        console.error('Registration error:', error);
        return res.status(500).json({
            message: 'Server error',
            error: error.message,
            stack: error.stack
        });
    }
};
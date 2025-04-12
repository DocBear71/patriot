// api/index.js
const { MongoClient } = require('mongodb');

module.exports = async function handler(req, res) {
    // Handle API requests
    if (req.method === 'POST') {
        try {
            // Get form data from request body
            const data = req.body;

            // Log received data for debugging
            console.log('Received data:', data);

            // Validate required fields
            if (!data.fname || !data.lname || !data.address1 || !data.city ||
                !data.state || !data.zip || !data.email || !data.password) {
                return res.status(400).json({ message: 'Missing required fields' });
            }

            // Connect to MongoDB
            const client = await MongoClient.connect(process.env.MONGODB_URI);
            const db = client.db(process.env.MONGODB_DB);

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
    } else {
        // Handle GET requests - useful for checking if API is working
        return res.status(200).json({ message: 'API is running' });
    }
};
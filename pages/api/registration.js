import { MongoClient } from 'mongodb';

export default async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        // Get form data from request body
        const data = req.body;

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
            client.close();
            return res.status(400).json({ message: 'Email already registered' });
        }

        // Insert the user
        const result = await db.collection('users').insertOne(data);

        client.close();

        // Return success response
        return res.status(201).json({
            message: 'User registered successfully',
            userId: result.insertedId
        });

    } catch (error) {
        console.error('Registration error:', error);
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
}
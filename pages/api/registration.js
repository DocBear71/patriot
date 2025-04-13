// pages/api/register.js
import { MongoClient } from 'mongodb';

// Replace with your MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI_PATRIOT || 'mongodb://localhost:27017/patriot-thanks';
const MONGODB_DB = process.env.MONGODB_DB || 'patriot-thanks';

export default async function handler(req, res) {
    // Only allow POST method
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        // Connect to MongoDB
        const client = await MongoClient.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        const db = client.db(MONGODB_DB);

        // Extract user data from request body
        const userData = req.body;

        // Basic validation
        if (!userData.email || !userData.password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        // Check if user already exists
        const existingUser = await db.collection('users').findOne({ email: userData.email });
        if (existingUser) {
            return res.status(409).json({ message: 'User with this email already exists' });
        }

        // Remove password repeat field before storing
        delete userData.psw_repeat;

        // Rename password field to match your schema
        userData.password = userData.password;
        delete userData.psw;

        // Insert user data
        const result = await db.collection('users').insertOne(userData);

        // Close connection
        client.close();

        // Return success response
        return res.status(201).json({
            message: 'User registered successfully',
            userId: result.insertedId
        });

    } catch (error) {
        console.error('Registration error:', error);
        return res.status(500).json({ message: 'Server error during registration' });
    }
}
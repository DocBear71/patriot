// api/users/update.js - Vercel serverless function for updating user profile
const { MongoClient, ObjectId } = require('mongodb');

// MongoDB connection details
const MONGODB_URI = process.env.MONGODB_URI_PATRIOT;
const MONGODB_DB = 'patriot';
const USERS_COLLECTION = 'users';

export default async function handler(req, res) {
    // Only allow PUT requests
    if (req.method !== 'PUT') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    let client = null;

    try {
        // Extract user data from request body
        const userData = req.body;

        // Basic validation
        if (!userData._id) {
            return res.status(400).json({ message: 'User ID is required' });
        }

        // Connect to MongoDB
        client = await MongoClient.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 10000,
            socketTimeoutMS: 15000,
        });

        const db = client.db(MONGODB_DB);
        const collection = db.collection(USERS_COLLECTION);

        // Prepare data for update (exclude _id field)
        const { _id, ...updateData } = userData;

        // Update user profile
        const result = await collection.updateOne(
            { _id: new ObjectId(_id) },
            { $set: updateData }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Return success response
        return res.status(200).json({
            message: 'User profile updated successfully',
            modifiedCount: result.modifiedCount
        });

    } catch (error) {
        console.error('Profile update error:', error);
        return res.status(500).json({ message: 'Server error during profile update: ' + error.message });
    } finally {
        // Close the connection
        if (client) await client.close();
    }
}
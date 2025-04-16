// api/users/password.js - Vercel serverless function for changing user password
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');

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
        // Extract password data from request body
        const { userId, email, currentPassword, newPassword } = req.body;

        // Basic validation
        if (!userId || !email || !currentPassword || !newPassword) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // Connect to MongoDB
        client = await MongoClient.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 10000,
            socketTimeoutMS: 15000,
        });

        const db = client.db(MONGODB_DB);
        const collection = db.collection(USERS_COLLECTION);

        // Find user by ID and email
        const user = await collection.findOne({
            _id: new ObjectId(userId),
            email: email
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Verify current password
        let isCurrentPasswordValid = false;

        if (user.password === currentPassword) {
            // Plain text comparison (for users registered before password hashing was implemented)
            isCurrentPasswordValid = true;
        } else if (await bcrypt.compare(currentPassword, user.password)) {
            // Compare with hashed password
            isCurrentPasswordValid = true;
        }

        if (!isCurrentPasswordValid) {
            return res.status(401).json({ message: 'Current password is incorrect' });
        }

        // Hash the new password
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);

        // Update the password
        const result = await collection.updateOne(
            { _id: new ObjectId(userId) },
            { $set: { password: hashedNewPassword } }
        );

        // Return success response
        return res.status(200).json({
            message: 'Password changed successfully'
        });

    } catch (error) {
        console.error('Password change error:', error);
        return res.status(500).json({ message: 'Server error during password change: ' + error.message });
    } finally {
        // Close the connection
        if (client) await client.close();
    }
}
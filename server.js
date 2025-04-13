// MongoDB connection configuration - add this at the top of your server.js
const { MongoClient } = require('mongodb');

// MongoDB connection details - update these constants
const MONGODB_URI = process.env.MONGODB_URI_PATRIOT || 'mongodb://localhost:27017/patriot';
const MONGODB_DB = 'patriot'; // Your database name
const USERS_COLLECTION = 'users'; // Your collection name

// The registration endpoint with updated MongoDB references
app.post(['/api/register', '/api/registration'], async (req, res) => {
    console.log("Registration API hit:", req.method);
    console.log("Request body:", req.body);

    let client = null;

    try {
        console.log("Connecting to MongoDB...");
        console.log("Database:", MONGODB_DB);
        console.log("Collection:", USERS_COLLECTION);

        // Connect to MongoDB with timeout options
        client = await MongoClient.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 5000, // 5 seconds
            connectTimeoutMS: 10000, // 10 seconds
            socketTimeoutMS: 15000, // 15 seconds
        });

        console.log("Connected to MongoDB");

        // Get reference to the database and collection
        const db = client.db(MONGODB_DB);
        const collection = db.collection(USERS_COLLECTION);

        // Extract user data from request body
        const userData = req.body;
        console.log("Received user data:", userData);

        // Basic validation
        if (!userData.email || (!userData.password && !userData.psw)) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        // Check if user already exists - with timeout
        let existingUser = null;
        try {
            existingUser = await Promise.race([
                collection.findOne({ email: userData.email }),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Database query timeout')), 5000)
                )
            ]);
        } catch (err) {
            console.error("Error checking for existing user:", err);
            // Continue even if this check times out
        }

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
        // Insert user data with timeout
        let result;
        try {
            result = await Promise.race([
                collection.insertOne(userData),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Database insert timeout')), 5000)
                )
            ]);

            console.log("User inserted successfully:", result.insertedId);

            // Return success response
            return res.status(201).json({
                message: 'User registered successfully',
                userId: result.insertedId
            });
        } catch (err) {
            console.error("Error inserting user:", err);
            throw err; // Re-throw to be caught by the outer catch block
        }

    } catch (error) {
        console.error('Registration error:', error);
        return res.status(500).json({ message: 'Server error during registration: ' + error.message });
    } finally {
        // Make sure to close the connection even if there's an error
        if (client) {
            try {
                await client.close();
                console.log("MongoDB connection closed");
            } catch (err) {
                console.error("Error closing MongoDB connection:", err);
            }
        }
    }
});
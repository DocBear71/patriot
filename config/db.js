const mongoose = require('mongoose');

// Connection options to optimize performance and prevent timeouts in serverless environment
const options = {
    serverSelectionTimeoutMS: 5000,  // Reduce server selection timeout from default 30s
    socketTimeoutMS: 10000,          // Reduce socket timeout
    connectTimeoutMS: 10000,         // Reduce connection timeout
    maxPoolSize: 10,                 // Limit connection pool size
    maxIdleTimeMS: 10000,            // Close inactive connections quickly
};

// Cache the mongoose connection for serverless environment
let cached = global.mongoose;

if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

// Connection function with improved error handling
const connect = async () => {
    if (cached.conn) {
        console.log('Using existing MongoDB connection');
        return cached.conn;
    }

    if (!cached.promise) {
        const MONGODB_URI = process.env.MONGODB_URI_PATRIOT;

        if (!MONGODB_URI) {
            throw new Error('MONGODB_URI_PATRIOT is not defined in environment variables');
        }

        console.log('Creating new MongoDB connection...');

        cached.promise = mongoose.connect(MONGODB_URI, options)
            .then(mongoose => {
                console.log(`Connected to MongoDB: ${mongoose.connection.host}`);
                return mongoose;
            })
            .catch(err => {
                console.error('MongoDB connection error:', err);
                cached.promise = null;
                throw err;
            });
    }

    try {
        cached.conn = await cached.promise;
        return cached.conn;
    } catch (error) {
        console.error('Error establishing MongoDB connection:', error);
        throw error;
    }
};

module.exports = connect();
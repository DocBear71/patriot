// lib/mongodb.js - MongoDB connection helper
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI_PATRIOT;
const MONGODB_DB = process.env.MONGODB_DB_PATRIOT || 'patriot';

// Cache the MongoDB connection to reuse it across function invocations
let cachedClient = null;
let cachedDb = null;

if (!MONGODB_URI) {
    throw new Error(
        'Please define the MONGODB_URI_PATRIOT environment variable inside .env.local'
    );
}

async function connectToDatabase() {
    // If we have cached connection, use it
    if (cachedClient && cachedDb) {
        return { client: cachedClient, db: cachedDb };
    }

    // Otherwise create a new connection
    const client = await MongoClient.connect(MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 10000,
        socketTimeoutMS: 45000,
    });

    const db = client.db(MONGODB_DB);

    // Cache the connection
    cachedClient = client;
    cachedDb = db;

    return { client, db };
}

module.exports = { connectToDatabase };
// models/index.js - Centralized model definitions for Mongoose
const mongoose = require('mongoose');

// Define schemas
const businessSchema = new mongoose.Schema({
    bname: String,
    address1: String,
    address2: String,
    city: String,
    state: String,
    zip: String,
    phone: String,
    type: String
});

const incentiveSchema = new mongoose.Schema({
    business_id: String,
    is_available: Boolean,
    type: String,
    amount: Number,
    information: String,
    other_description: String,
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    firstname: String,
    lastname: String,
    status: { type: String, default: 'US' }, // US = User, AD = Admin
    isAdmin: { type: Boolean, default: false },
    created_at: { type: Date, default: Date.now }
});

// Get or create models
function getModel(modelName, schema, collectionName) {
    try {
        // Try to get the existing model
        return mongoose.model(modelName);
    } catch (error) {
        // Define the model if it doesn't exist
        return mongoose.model(modelName, schema, collectionName);
    }
}

// Export models
module.exports = {
    Business: () => getModel('Business', businessSchema, 'business'),
    Incentive: () => getModel('Incentive', incentiveSchema, 'incentives'),
    User: () => getModel('User', userSchema, 'users')
};
// models/User.js
const mongoose = require('mongoose');

// Define user schema
const userSchema = new mongoose.Schema({
    fname: String,
    lname: String,
    address1: String,
    address2: String,
    city: String,
    state: String,
    zip: String,
    status: String,
    level: String,
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    isAdmin: Boolean,
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },

    // New fields for password reset
    resetToken: String,
    resetTokenExpires: Date
});

// Export the model - use the 'users' collection
module.exports = mongoose.model('User', userSchema);
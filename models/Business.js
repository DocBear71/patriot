// models/Business.js
const mongoose = require('mongoose');

// Define business schema
const businessSchema = new mongoose.Schema({
    bname: String,
    address1: String,
    address2: String,
    city: String,
    state: String,
    zip: String,
    phone: String,
    type: String,
    status: { type: String, default: 'active' },
    created_by: String,
    updated_by: String,
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
});

// Export the model - use the 'business' collection
module.exports = mongoose.model('Business', businessSchema, 'business');
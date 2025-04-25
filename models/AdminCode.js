// models/AdminCode.js
const mongoose = require('mongoose');

// Define admin code schema
const adminCodeSchema = new mongoose.Schema({
    code: String,
    description: String,
    expiration: Date,
    created_at: { type: Date, default: Date.now }
});

// Export the model - use the 'admin_codes' collection
module.exports = mongoose.model('AdminCode', adminCodeSchema, 'admin_codes');
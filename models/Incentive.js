// models/Incentive.js
const mongoose = require('mongoose');

// Define incentive schema
const incentiveSchema = new mongoose.Schema({
    business_id: String,
    is_available: Boolean,
    type: String,
    amount: Number,
    information: String,
    other_description: String,
    created_by: String,
    updated_by: String,
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
});

// Export the model - use the 'incentives' collection
module.exports = mongoose.model('Incentive', incentiveSchema, 'incentives');
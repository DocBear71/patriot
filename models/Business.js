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
    updated_at: { type: Date, default: Date.now },

    // Add geospatial location field
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number],  // [longitude, latitude]
            default: undefined
        }
    },

    // Chain-related fields
    is_chain: {
        type: Boolean,
        default: false
    },
    chain_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Business',
        default: null
    },
    chain_name: String,
    universal_incentives: {
        type: Boolean,
        default: false
    },
    locations: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Business'
    }],
});

// Create a 2dsphere index for geospatial queries
businessSchema.index({ location: '2dsphere' });

// Export the model - use the 'business' collection
module.exports = mongoose.model('Business', businessSchema, 'business');
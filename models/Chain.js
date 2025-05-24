// models/Chain.js - Chain model for patriot_thanks_chains collection
const mongoose = require('mongoose');

const chainSchema = new mongoose.Schema({
    chain_name: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    business_type: {
        type: String,
        required: true,
        index: true
    },
    universal_incentives: {
        type: Boolean,
        default: true
    },
    status: {
        type: String,
        default: 'active',
        enum: ['active', 'inactive'],
        index: true
    },

    // Corporate information (optional)
    corporate_info: {
        headquarters: String,
        website: String,
        phone: String,
        description: String
    },

    // Chain-wide incentives stored directly in the chain document
    incentives: [{
        type: {
            type: String,
            required: true,
            enum: ['VT', 'AD', 'FR', 'SP', 'OT']
        },
        amount: {
            type: Number,
            required: true,
            min: 0,
            max: 100
        },
        description: String,
        other_description: String, // For "OT" type
        information: String,
        discount_type: {
            type: String,
            default: 'percentage',
            enum: ['percentage', 'dollar']
        },
        is_active: {
            type: Boolean,
            default: true,
            index: true
        },
        created_date: {
            type: Date,
            default: Date.now
        },
        created_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    }],

    // Metadata
    created_date: {
        type: Date,
        default: Date.now,
        index: true
    },
    updated_date: {
        type: Date,
        default: Date.now
    },
    created_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    updated_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
});

// Create indexes for better performance
chainSchema.index({ chain_name: 1, status: 1 });
chainSchema.index({ business_type: 1, status: 1 });
chainSchema.index({ 'incentives.type': 1, 'incentives.is_active': 1 });

// Add virtual for location count (if needed)
chainSchema.virtual('location_count', {
    ref: 'Business',
    localField: '_id',
    foreignField: 'chain_id',
    count: true
});

// Ensure virtual fields are serialized
chainSchema.set('toJSON', { virtuals: true });
chainSchema.set('toObject', { virtuals: true });

// Instance methods
chainSchema.methods.getActiveIncentives = function() {
    return this.incentives.filter(incentive => incentive.is_active !== false);
};

chainSchema.methods.addIncentive = function(incentiveData) {
    this.incentives.push({
        ...incentiveData,
        created_date: new Date(),
        is_active: true
    });
    this.updated_date = new Date();
    return this.save();
};

chainSchema.methods.removeIncentive = function(incentiveId) {
    this.incentives.id(incentiveId).remove();
    this.updated_date = new Date();
    return this.save();
};

// Static methods
chainSchema.statics.findByName = function(name) {
    return this.findOne({
        chain_name: { $regex: new RegExp(`^${name}$`, 'i') },
        status: 'active'
    });
};

chainSchema.statics.searchByName = function(name) {
    return this.find({
        chain_name: { $regex: new RegExp(name, 'i') },
        status: 'active'
    }).sort({ chain_name: 1 });
};

chainSchema.statics.getWithLocationCounts = async function(query = {}) {
    const chains = await this.find({ ...query, status: 'active' })
        .sort({ chain_name: 1 })
        .lean();

    // Get location counts for each chain
    const Business = mongoose.model('Business');

    return await Promise.all(
        chains.map(async (chain) => {
            const locationCount = await Business.countDocuments({chain_id: chain._id});
            const universalEnabledCount = await Business.countDocuments({
                chain_id: chain._id,
                universal_incentives: true
            });

            return {
                ...chain,
                location_count: locationCount,
                universal_enabled_count: universalEnabledCount,
                incentive_count: chain.incentives ?
                    chain.incentives.filter(i => i.is_active !== false).length : 0,
                needs_sync: locationCount > 0 && universalEnabledCount < locationCount
            };
        })
    );
};

// Pre-save middleware
chainSchema.pre('save', function() {
    this.updated_date = new Date();
});

// Export the model - specify the collection name explicitly
module.exports = mongoose.model('Chain', chainSchema, 'patriot_thanks_chains');
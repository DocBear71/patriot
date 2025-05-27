// models/Donation.js
const mongoose = require('mongoose');

// Define user schema
const donationSchema = new mongoose.Schema({
    amount: { type: Number, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    anonymous: { type: Boolean, default: false },
    recurring: { type: Boolean, default: false },
    message: String,
    paymentMethod: { type: String, required: true },
    paymentId: String,
    transactionId: String,
    status: { type: String, default: 'pending' },
    cancelledAt: Date,
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // If the donor is a registered user
    created_at: { type: Date, default: Date.now }
});

// Export the model - use the 'donations' collection
module.exports = mongoose.model('Donation', donationSchema, 'donations');
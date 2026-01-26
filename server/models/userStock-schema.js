const mongoose = require('mongoose');

const UserStockSchema = new mongoose.Schema({
    // Links this stock entry to a specific User
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    // The Stock Symbol (e.g., RELIANCE.NS)
    ticker: {
        type: String,
        required: true,
        uppercase: true
    },

    // Differentiates between what they own and what they watch
    category: {
        type: String,
        enum: ['holding', 'wishlist'],
        default: 'wishlist'
    },

    // Financial details (only for 'holdings')
    quantity: { type: Number, default: 0 },
    avgPrice: { type: Number, default: 0 },

    // The AI's latest analysis "Snapshot"
    aiReport: {
        recommendation: { type: String, enum: ['BUY', 'SELL', 'HOLD', 'NEUTRAL'] },
        summary: String,
        lastUpdated: { type: Date, default: Date.now }
    }

});

module.exports = mongoose.model('UserStock', UserStockSchema);
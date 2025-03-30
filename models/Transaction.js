const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    productName: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true
    },
    currency: {
        type: String,
        enum: ['USD', 'LRD'],
        required: true
    },
    quantityBought: {
        type: Number,
        required: true,
        min: 1
    },
    priceAtSale: {
        USD: {
            type: Number,
            required: true,
            min: 0
        },
        LRD: {
            type: Number,
            required: true,
            min: 0
        }
    },
    totalBoughtUSD: {
        type: Number,
        required: true,
        min: 0
    },
    totalBoughtLRD: {
        type: Number,
        required: true,
        min: 0
    },
    buyerName: {
        type: String,
        required: true
    },
    buyerContact: {
        type: String
    },
    buyerEmail: {
        type: String
    },
    transactionDate: {
        type: Date,
        default: Date.now
    },
    paymentMethod: {
        type: String,
        enum: ['cash', 'card', 'mobile_money', 'bank_transfer', 'other'],
        default: 'cash'
    },
    transactionStatus: {
        type: String,
        enum: ['pending', 'completed', 'cancelled', 'refunded'],
        default: 'completed'
    },
    notes: {
        type: String
    },
    processedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Pre-save middleware to calculate total values if not provided
transactionSchema.pre('save', function(next) {
    if (this.currency === 'USD') {
        this.totalBoughtUSD = this.priceAtSale.USD * this.quantityBought;
        this.totalBoughtLRD = this.priceAtSale.LRD * this.quantityBought;
    } else {
        this.totalBoughtUSD = this.priceAtSale.USD * this.quantityBought;
        this.totalBoughtLRD = this.priceAtSale.LRD * this.quantityBought;
    }
    next();
});

module.exports = mongoose.model('Transaction', transactionSchema);

const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    productName: {
        type: String,
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    priceUSD: {
        type: Number,
        required: true,
        min: 0
    },
    priceLRD: {
        type: Number,
        required: true,
        min: 0
    },
    totalUSD: {
        type: Number,
        required: true,
        min: 0
    },
    totalLRD: {
        type: Number,
        required: true,
        min: 0
    },
    category: {
        type: String,
        required: true
    },
    image: {
        type: String
    },
    addedAt: {
        type: Date,
        default: Date.now
    }
});

const cartSchema = new mongoose.Schema({
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    customerName: {
        type: String,
        required: true
    },
    customerPhone: {
        type: String,
        required: true
    },
    items: [cartItemSchema],
    totalAmountUSD: {
        type: Number,
        default: 0
    },
    totalAmountLRD: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'],
        default: 'pending'
    },
    paymentMethod: {
        type: String,
        enum: ['cash', 'bank_transfer', 'mobile_money', 'other'],
        default: 'cash'
    },
    paymentStatus: {
        type: String,
        enum: ['unpaid', 'partially_paid', 'paid'],
        default: 'unpaid'
    },
    shippingAddress: {
        street: String,
        city: String,
        state: String,
        country: String,
        zipCode: String
    },
    notes: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Pre-save middleware to calculate total amounts
cartSchema.pre('save', function(next) {
    if (this.items && this.items.length > 0) {
        this.totalAmountUSD = this.items.reduce((total, item) => total + item.totalUSD, 0);
        this.totalAmountLRD = this.items.reduce((total, item) => total + item.totalLRD, 0);
    } else {
        this.totalAmountUSD = 0;
        this.totalAmountLRD = 0;
    }
    next();
});

module.exports = mongoose.model('Cart', cartSchema);

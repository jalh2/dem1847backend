const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    items: [
        {
            product: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Product',
                required: true
            },
            quantity: {
                type: Number,
                required: true,
                min: 1
            },
            priceUSD: {
                type: Number,
                required: true
            },
            priceLRD: {
                type: Number,
                required: true
            }
        }
    ],
    totalUSD: {
        type: Number,
        required: true
    },
    totalLRD: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'cancelled'],
        default: 'pending'
    },
    paymentMethod: {
        type: String,
        enum: ['bank_transfer', 'mobile_money', 'cash_on_delivery'],
        required: true
    },
    paymentProofImage: {
        type: String,
        default: null
    },
    paymentProofImageData: {
        type: String, // Base64 encoded image data
        default: null
    },
    paymentProofImageMimeType: {
        type: String, // MIME type of the image (e.g., 'image/jpeg', 'image/png')
        default: null
    },
    shippingAddress: {
        street: String,
        city: String,
        state: String,
        country: String,
        zipCode: String
    },
    orderNotes: {
        type: String,
        default: ''
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update the updatedAt timestamp before saving
orderSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Order', orderSchema);

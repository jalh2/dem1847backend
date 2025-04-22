const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    text: {
        type: String,
        required: true
    },
    topic: {
        type: String,
        enum: ['Order Issue', 'Product Inquiry', 'Payment Problem', 'Shipping Question', 'Return/Refund', 'Password Reset', 'Other'],
        required: true
    },
    conversationId: {
        type: String,
        required: true
    },
    isFromUser: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    read: {
        type: Boolean,
        default: false
    },
    meta: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
});

module.exports = mongoose.model('Message', messageSchema);

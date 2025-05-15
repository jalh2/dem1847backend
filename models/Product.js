const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    images: [{
        filename: String,
        path: String,
        imageData: {
            type: String, // Base64 encoded image data
            default: null
        },
        mimeType: {
            type: String, // MIME type of the image
            default: null
        },
        uploadDate: {
            type: Date,
            default: Date.now
        }
    }],
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
    quantityInStock: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    },
    category: {
        type: String,
        required: true,
        trim: true
    },
    totalValueUSD: {
        type: Number,
        required: true,
        default: function() {
            return this.priceUSD * this.quantityInStock;
        }
    },
    totalValueLRD: {
        type: Number,
        required: true,
        default: function() {
            return this.priceLRD * this.quantityInStock;
        }
    },
    description: {
        type: String,
        trim: true
    },
    features: [String],
    specifications: {
        type: Map,
        of: String
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

// Pre-save middleware to update totalValue fields
productSchema.pre('save', function(next) {
    this.totalValueUSD = this.priceUSD * this.quantityInStock;
    this.totalValueLRD = this.priceLRD * this.quantityInStock;
    next();
});

// Pre-update middleware to update totalValue fields
productSchema.pre('findOneAndUpdate', async function() {
    const update = this.getUpdate();
    const priceUSD = update.priceUSD || update['$set']?.priceUSD;
    const priceLRD = update.priceLRD || update['$set']?.priceLRD;
    const quantityInStock = update.quantityInStock || update['$set']?.quantityInStock;
    
    update['$set'] = update['$set'] || {};
    
    // If we have both price and quantity in the update
    if ((priceUSD || priceLRD) && quantityInStock) {
        if (priceUSD) {
            update['$set'].totalValueUSD = priceUSD * quantityInStock;
        }
        if (priceLRD) {
            update['$set'].totalValueLRD = priceLRD * quantityInStock;
        }
        return;
    }
    
    // If we need the current document to calculate totals
    if (priceUSD || priceLRD || quantityInStock) {
        const doc = await this.model.findOne(this.getQuery()).exec();
        if (!doc) return;
        
        if (priceUSD && !quantityInStock) {
            update['$set'].totalValueUSD = priceUSD * doc.quantityInStock;
        }
        if (priceLRD && !quantityInStock) {
            update['$set'].totalValueLRD = priceLRD * doc.quantityInStock;
        }
        if (quantityInStock && !priceUSD && !priceLRD) {
            update['$set'].totalValueUSD = doc.priceUSD * quantityInStock;
            update['$set'].totalValueLRD = doc.priceLRD * quantityInStock;
        }
    }
});

module.exports = mongoose.model('Product', productSchema);

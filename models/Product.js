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
productSchema.pre('findOneAndUpdate', function(next) {
    const update = this.getUpdate();
    const priceUSD = update.priceUSD || update['$set']?.priceUSD;
    const priceLRD = update.priceLRD || update['$set']?.priceLRD;
    const quantityInStock = update.quantityInStock || update['$set']?.quantityInStock;
    
    if ((priceUSD || priceLRD) && quantityInStock) {
        if (priceUSD) {
            update['$set'] = update['$set'] || {};
            update['$set'].totalValueUSD = priceUSD * quantityInStock;
        }
        if (priceLRD) {
            update['$set'] = update['$set'] || {};
            update['$set'].totalValueLRD = priceLRD * quantityInStock;
        }
    } else if (priceUSD && !quantityInStock) {
        // We need to get the current document to calculate the new total value
        this.findOne().then(doc => {
            if (doc) {
                update['$set'] = update['$set'] || {};
                update['$set'].totalValueUSD = priceUSD * doc.quantityInStock;
            }
        });
    } else if (priceLRD && !quantityInStock) {
        this.findOne().then(doc => {
            if (doc) {
                update['$set'] = update['$set'] || {};
                update['$set'].totalValueLRD = priceLRD * doc.quantityInStock;
            }
        });
    } else if (quantityInStock && !priceUSD && !priceLRD) {
        this.findOne().then(doc => {
            if (doc) {
                update['$set'] = update['$set'] || {};
                update['$set'].totalValueUSD = doc.priceUSD * quantityInStock;
                update['$set'].totalValueLRD = doc.priceLRD * quantityInStock;
            }
        });
    }
    
    next();
});

module.exports = mongoose.model('Product', productSchema);

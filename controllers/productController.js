const Product = require('../models/Product');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer storage
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function(req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

// Initialize upload
const upload = multer({
    storage: storage,
    limits: { fileSize: 10000000 }, // 10MB limit
    fileFilter: function(req, file, cb) {
        checkFileType(file, cb);
    }
}).array('images', 5); // Allow up to 5 images

// Check file type
function checkFileType(file, cb) {
    // Allowed extensions
    const filetypes = /jpeg|jpg|png|gif/;
    // Check extension
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    // Check mime type
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb('Error: Images Only!');
    }
}

// Upload product images
exports.uploadImages = (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ message: err });
        }
        
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: 'No files uploaded' });
        }
        
        try {
            const images = await Promise.all(req.files.map(async file => {
                // Read the file as binary data
                const imageBuffer = fs.readFileSync(file.path);
                // Convert to base64
                const base64Image = imageBuffer.toString('base64');
                
                return {
                    filename: file.filename,
                    path: `/uploads/${file.filename}`,
                    imageData: base64Image,
                    mimeType: file.mimetype,
                    uploadDate: Date.now()
                };
            }));
            
            res.status(200).json({ 
                message: 'Images uploaded successfully',
                images 
            });
        } catch (error) {
            console.error('Error processing images:', error);
            return res.status(500).json({ message: 'Error processing images', error: error.message });
        }
    });
};

// Get all products
exports.getAllProducts = async (req, res) => {
    try {
        const products = await Product.find().sort({ createdAt: -1 });
        res.status(200).json(products);
    } catch (error) {
        console.error('Error getting products:', error);
        res.status(500).json({ message: 'Error getting products', error: error.message });
    }
};

// Get product by ID
exports.getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        
        res.status(200).json(product);
    } catch (error) {
        console.error('Error getting product:', error);
        res.status(500).json({ message: 'Error getting product', error: error.message });
    }
};

// Create new product
exports.createProduct = async (req, res) => {
    try {
        const { 
            name, 
            priceUSD, 
            priceLRD, 
            quantityInStock, 
            category, 
            description, 
            features, 
            specifications,
            images 
        } = req.body;
        
        // Create product
        const product = new Product({
            name,
            priceUSD: parseFloat(priceUSD),
            priceLRD: parseFloat(priceLRD),
            quantityInStock: parseInt(quantityInStock),
            category,
            description,
            features,
            specifications,
            images
        });
        
        // Save product
        await product.save();
        
        res.status(201).json({ 
            message: 'Product created successfully',
            product 
        });
    } catch (error) {
        console.error('Error creating product:', error);
        res.status(500).json({ message: 'Error creating product', error: error.message });
    }
};

// Update product
exports.updateProduct = async (req, res) => {
    try {
        const { 
            name, 
            priceUSD, 
            priceLRD, 
            quantityInStock, 
            category, 
            description, 
            features, 
            specifications,
            images 
        } = req.body;
        
        // Find product
        const product = await Product.findById(req.params.id);
        
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        
        // Update fields
        if (name) product.name = name;
        if (priceUSD) product.priceUSD = parseFloat(priceUSD);
        if (priceLRD) product.priceLRD = parseFloat(priceLRD);
        if (quantityInStock !== undefined) product.quantityInStock = parseInt(quantityInStock);
        if (category) product.category = category;
        if (description) product.description = description;
        if (features) product.features = features;
        if (specifications) product.specifications = specifications;
        if (images) product.images = images;
        
        // Save updated product
        await product.save();
        
        res.status(200).json({ 
            message: 'Product updated successfully',
            product 
        });
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ message: 'Error updating product', error: error.message });
    }
};

// Delete product
exports.deleteProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        
        // Delete product images from filesystem
        if (product.images && product.images.length > 0) {
            product.images.forEach(image => {
                const imagePath = path.join(__dirname, '..', image.path);
                if (fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath);
                }
            });
        }
        
        // Delete product from database
        await Product.findByIdAndDelete(req.params.id);
        
        res.status(200).json({ message: 'Product deleted successfully' });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ message: 'Error deleting product', error: error.message });
    }
};

// Get products by category
exports.getProductsByCategory = async (req, res) => {
    try {
        const { category } = req.params;
        
        const products = await Product.find({ category }).sort({ createdAt: -1 });
        
        res.status(200).json(products);
    } catch (error) {
        console.error('Error getting products by category:', error);
        res.status(500).json({ message: 'Error getting products by category', error: error.message });
    }
};

// Search products
exports.searchProducts = async (req, res) => {
    try {
        const { query } = req.query;
        
        if (!query) {
            return res.status(400).json({ message: 'Search query is required' });
        }
        
        const products = await Product.find({
            $or: [
                { name: { $regex: query, $options: 'i' } },
                { category: { $regex: query, $options: 'i' } },
                { description: { $regex: query, $options: 'i' } }
            ]
        }).sort({ createdAt: -1 });
        
        res.status(200).json(products);
    } catch (error) {
        console.error('Error searching products:', error);
        res.status(500).json({ message: 'Error searching products', error: error.message });
    }
};

const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

// Get all products
router.get('/', productController.getAllProducts);

// Get product by ID
router.get('/:id', productController.getProductById);

// Create new product
router.post('/', productController.createProduct);

// Update product
router.put('/:id', productController.updateProduct);

// Delete product
router.delete('/:id', productController.deleteProduct);

// Upload product images
router.post('/upload', productController.uploadImages);

// Get products by category
router.get('/category/:category', productController.getProductsByCategory);

// Search products
router.get('/search', productController.searchProducts);

module.exports = router;

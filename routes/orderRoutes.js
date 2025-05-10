const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Set up storage for payment proof images
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        const uploadDir = 'uploads/payments';
        
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        cb(null, uploadDir);
    },
    filename: function(req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'payment-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: function(req, file, cb) {
        // Accept images only
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
    }
});

// Create a new order
router.post('/', orderController.createOrder);

// Get orders for a user
router.get('/user/:userId', orderController.getUserOrders);

// Get order details
router.get('/:orderId', orderController.getOrderDetails);

// Upload payment proof - handle both file uploads and direct base64 data
router.post('/:orderId/payment-proof', (req, res, next) => {
    console.log('Payment proof upload request received');
    console.log('Content-Type:', req.headers['content-type']);
    
    // Check if this is a multipart/form-data request (file upload from mobile app or web)
    if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
        console.log('Multipart form data detected, using multer');
        upload.single('paymentProof')(req, res, (err) => {
            if (err) {
                console.error('Multer error:', err);
                return res.status(400).json({ message: err.message });
            }
            console.log('File processed by multer:', req.file ? 'Yes' : 'No');
            orderController.uploadPaymentProof(req, res, next);
        });
    }
    // Check if this is a JSON request with base64 data
    else if (req.headers['content-type'] && req.headers['content-type'].includes('application/json')) {
        console.log('JSON request detected, checking for base64 data');
        // Let the controller handle the JSON data
        orderController.uploadPaymentProof(req, res, next);
    }
    // Unknown content type
    else {
        console.error('Unknown content type for payment proof upload');
        res.status(400).json({ 
            message: 'Unsupported content type. Please use multipart/form-data for file uploads or application/json for base64 data.' 
        });
    }
});

// Update order status (admin only)
router.put('/:orderId/status', orderController.updateOrderStatus);

// Get all orders (admin only)
router.get('/', orderController.getAllOrders);

// Cancel order
router.put('/:orderId/cancel', orderController.cancelOrder);

module.exports = router;

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
// The upload.single middleware will only run if a file is being uploaded
router.post('/:orderId/payment-proof', (req, res, next) => {
    // If the request has paymentProofImageData in the body, skip multer and go straight to the controller
    if (req.body && req.body.paymentProofImageData) {
        console.log('Direct base64 upload detected, bypassing multer');
        return orderController.uploadPaymentProof(req, res, next);
    }
    // Otherwise, use multer to handle the file upload
    console.log('File upload detected, using multer');
    upload.single('paymentProof')(req, res, (err) => {
        if (err) {
            console.error('Multer error:', err);
            return res.status(400).json({ message: err.message });
        }
        orderController.uploadPaymentProof(req, res, next);
    });
});

// Update order status (admin only)
router.put('/:orderId/status', orderController.updateOrderStatus);

// Get all orders (admin only)
router.get('/', orderController.getAllOrders);

// Cancel order
router.put('/:orderId/cancel', orderController.cancelOrder);

module.exports = router;

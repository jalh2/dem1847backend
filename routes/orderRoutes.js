const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Set up storage for payment proof images
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        const uploadDir = path.join(__dirname, '../public/uploads/payments');
        
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
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
            return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
    }
});

// Create a new order
router.post('/', orderController.createOrder);

// Upload payment proof
router.post('/:orderId/payment-proof', upload.single('paymentProof'), orderController.uploadPaymentProof);

// Get orders for a user
router.get('/user/:userId', orderController.getUserOrders);

// Get order details
router.get('/:orderId', orderController.getOrderDetails);

// Update order status (admin only)
router.put('/:orderId/status', orderController.updateOrderStatus);

// Get all orders (admin only)
router.get('/', orderController.getAllOrders);

// Cancel order
router.put('/:orderId/cancel', orderController.cancelOrder);

module.exports = router;

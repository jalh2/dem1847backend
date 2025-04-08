const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Register a new user
router.post('/register', userController.register);

// Login user
router.post('/login', userController.login);

// Get user profile
router.get('/profile/:id', userController.getProfile);

// Update user profile
router.put('/profile/:id', userController.updateProfile);

// Change password
router.put('/change-password/:id', userController.changePassword);

// Get user address
router.get('/address/:id', userController.getAddress);

// Update user address
router.put('/address/:id', userController.updateAddress);

// Wishlist routes
router.post('/wishlist/:id', userController.addToWishlist);
router.delete('/wishlist/:id/:productId', userController.removeFromWishlist);
router.get('/wishlist/:id', userController.getWishlist);

// Create admin account (for initial setup)
router.post('/create-admin', userController.createAdmin);

// Get all users (admin only)
router.get('/', userController.getAllUsers);

// Delete user (admin only)
router.delete('/:id', userController.deleteUser);

module.exports = router;

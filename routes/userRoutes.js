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

// Create admin account (for initial setup)
router.post('/create-admin', userController.createAdmin);

module.exports = router;

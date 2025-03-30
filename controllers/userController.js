const User = require('../models/User');
const crypto = require('crypto');

// Register a new user
exports.register = async (req, res) => {
    try {
        const { username, phoneNumber, password, role } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: 'Username already exists' });
        }

        // Create new user
        const user = new User({
            username,
            phoneNumber,
            role: role || 'user' // Default to 'user' if role not provided
        });

        // Set password (this will hash it)
        user.setPassword(password);

        // Save user
        await user.save();

        // Return success without sending back password or salt
        res.status(201).json({
            message: 'User registered successfully',
            user: {
                id: user._id,
                username: user.username,
                phoneNumber: user.phoneNumber,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ message: 'Error registering user', error: error.message });
    }
};

// Login user
exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;

        // Find user
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }

        // Verify password
        if (!user.verifyPassword(password)) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        // Return success with user info (no password or salt)
        res.status(200).json({
            message: 'Login successful',
            user: {
                id: user._id,
                username: user.username,
                phoneNumber: user.phoneNumber,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Error logging in:', error);
        res.status(500).json({ message: 'Error logging in', error: error.message });
    }
};

// Get user profile
exports.getProfile = async (req, res) => {
    try {
        const userId = req.params.id;
        
        const user = await User.findById(userId).select('-password -salt');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        res.status(200).json({ user });
    } catch (error) {
        console.error('Error getting user profile:', error);
        res.status(500).json({ message: 'Error getting user profile', error: error.message });
    }
};

// Update user profile
exports.updateProfile = async (req, res) => {
    try {
        const userId = req.params.id;
        const { username, phoneNumber } = req.body;
        
        // Find user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        // Update fields
        if (username) user.username = username;
        if (phoneNumber) user.phoneNumber = phoneNumber;
        
        // Save updated user
        await user.save();
        
        res.status(200).json({
            message: 'Profile updated successfully',
            user: {
                id: user._id,
                username: user.username,
                phoneNumber: user.phoneNumber,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ message: 'Error updating profile', error: error.message });
    }
};

// Change password
exports.changePassword = async (req, res) => {
    try {
        const userId = req.params.id;
        const { currentPassword, newPassword } = req.body;
        
        // Find user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        // Verify current password
        if (!user.verifyPassword(currentPassword)) {
            return res.status(401).json({ message: 'Current password is incorrect' });
        }
        
        // Set new password
        user.setPassword(newPassword);
        
        // Save user
        await user.save();
        
        res.status(200).json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({ message: 'Error changing password', error: error.message });
    }
};

// Create admin account (for initial setup)
exports.createAdmin = async (req, res) => {
    try {
        // Check if admin already exists
        const adminExists = await User.findOne({ role: 'admin' });
        if (adminExists) {
            return res.status(400).json({ message: 'Admin account already exists' });
        }
        
        const { username, phoneNumber, password } = req.body;
        
        // Create admin user
        const admin = new User({
            username,
            phoneNumber,
            role: 'admin'
        });
        
        // Set password
        admin.setPassword(password);
        
        // Save admin
        await admin.save();
        
        res.status(201).json({
            message: 'Admin account created successfully',
            user: {
                id: admin._id,
                username: admin.username,
                role: admin.role
            }
        });
    } catch (error) {
        console.error('Error creating admin:', error);
        res.status(500).json({ message: 'Error creating admin', error: error.message });
    }
};

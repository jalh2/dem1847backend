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

// Get user address
exports.getAddress = async (req, res) => {
    try {
        const userId = req.params.id;
        
        // Find user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Return address
        res.status(200).json({
            address: user.address || {}
        });
    } catch (error) {
        console.error('Error getting user address:', error);
        res.status(500).json({ message: 'Error getting user address', error: error.message });
    }
};

// Update user address
exports.updateAddress = async (req, res) => {
    try {
        const userId = req.params.id;
        const { street, city, state, zipCode, country } = req.body;
        
        // Find user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Update address
        user.address = {
            street: street || (user.address ? user.address.street : ''),
            city: city || (user.address ? user.address.city : ''),
            state: state || (user.address ? user.address.state : ''),
            zipCode: zipCode || (user.address ? user.address.zipCode : ''),
            country: country || (user.address ? user.address.country : 'Liberia')
        };

        // Save user
        await user.save();

        // Return success
        res.status(200).json({
            message: 'Address updated successfully',
            address: user.address
        });
    } catch (error) {
        console.error('Error updating user address:', error);
        res.status(500).json({ message: 'Error updating user address', error: error.message });
    }
};

// Create admin account (for initial setup)
exports.createAdmin = async (req, res) => {
    try {
        const { username, phoneNumber, password, secretKey } = req.body;
        
        // Validate secret key (simple implementation)
        if (secretKey !== 'dem1847-admin-secret') {
            return res.status(401).json({ message: 'Invalid secret key' });
        }
        
        // Check if username already exists
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: 'Username already exists' });
        }
        
        // Create new admin user
        const user = new User({
            username,
            phoneNumber,
            role: 'admin'
        });
        
        // Set password
        user.setPassword(password);
        
        // Save user
        await user.save();
        
        res.status(201).json({
            message: 'Admin account created successfully',
            user: {
                id: user._id,
                username: user.username,
                phoneNumber: user.phoneNumber,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Error creating admin account:', error);
        res.status(500).json({ message: 'Error creating admin account', error: error.message });
    }
};

// Delete user (admin only can delete regular users)
exports.deleteUser = async (req, res) => {
    try {
        const userId = req.params.id;
        
        // Find user to delete
        const userToDelete = await User.findById(userId);
        if (!userToDelete) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        // Check if trying to delete an admin
        if (userToDelete.role === 'admin') {
            return res.status(403).json({ message: 'Cannot delete admin accounts' });
        }
        
        // Delete the user
        await User.findByIdAndDelete(userId);
        
        res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ message: 'Error deleting user', error: error.message });
    }
};

// Get all users (admin only)
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find({ role: 'customer' }).select('-password -salt');
        res.status(200).json({ users });
    } catch (error) {
        console.error('Error getting all users:', error);
        res.status(500).json({ message: 'Error getting all users', error: error.message });
    }
};

// Add product to wishlist
exports.addToWishlist = async (req, res) => {
    try {
        const userId = req.params.id;
        const { productId } = req.body;
        
        if (!productId) {
            return res.status(400).json({ message: 'Product ID is required' });
        }

        // Find user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        // Check if product already in wishlist
        if (user.wishlist.includes(productId)) {
            return res.status(400).json({ message: 'Product already in wishlist' });
        }
        
        // Add to wishlist
        user.wishlist.push(productId);
        await user.save();
        
        res.status(200).json({ 
            message: 'Product added to wishlist',
            wishlist: user.wishlist
        });
    } catch (error) {
        console.error('Error adding to wishlist:', error);
        res.status(500).json({ message: 'Error adding to wishlist', error: error.message });
    }
};

// Remove product from wishlist
exports.removeFromWishlist = async (req, res) => {
    try {
        const userId = req.params.id;
        const productId = req.params.productId;
        
        // Find user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        // Remove from wishlist
        user.wishlist = user.wishlist.filter(id => id.toString() !== productId);
        await user.save();
        
        res.status(200).json({ 
            message: 'Product removed from wishlist',
            wishlist: user.wishlist
        });
    } catch (error) {
        console.error('Error removing from wishlist:', error);
        res.status(500).json({ message: 'Error removing from wishlist', error: error.message });
    }
};

// Get user's wishlist
exports.getWishlist = async (req, res) => {
    try {
        const userId = req.params.id;
        
        // Find user with populated wishlist
        const user = await User.findById(userId).populate('wishlist');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        res.status(200).json({ wishlist: user.wishlist });
    } catch (error) {
        console.error('Error getting wishlist:', error);
        res.status(500).json({ message: 'Error getting wishlist', error: error.message });
    }
};

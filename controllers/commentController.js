const Comment = require('../models/Comment');
const Product = require('../models/Product');
const User = require('../models/User');
const mongoose = require('mongoose');

// Get all comments for a product
exports.getProductComments = async (req, res) => {
    try {
        const { productId } = req.params;
        
        const comments = await Comment.find({ productId })
            .sort({ createdAt: -1 })
            .populate('userId', 'username');
        
        res.status(200).json({ comments });
    } catch (error) {
        console.error('Error getting product comments:', error);
        res.status(500).json({ message: 'Error getting product comments', error: error.message });
    }
};

// Add a new comment to a product
exports.addComment = async (req, res) => {
    try {
        const { productId } = req.params;
        const { userId, text, rating } = req.body;
        
        // Validate required fields
        if (!userId || !text) {
            return res.status(400).json({ message: 'User ID and comment text are required' });
        }
        
        // Check if product exists
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        
        // Check if user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        // Create new comment
        const newComment = new Comment({
            productId,
            userId,
            text,
            rating: rating || 5
        });
        
        await newComment.save();
        
        // Return the new comment with user info
        const populatedComment = await Comment.findById(newComment._id)
            .populate('userId', 'username');
        
        res.status(201).json({ 
            message: 'Comment added successfully',
            comment: populatedComment
        });
    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json({ message: 'Error adding comment', error: error.message });
    }
};

// Update a comment
exports.updateComment = async (req, res) => {
    try {
        const { commentId } = req.params;
        const { text, rating } = req.body;
        
        // Find comment
        const comment = await Comment.findById(commentId);
        if (!comment) {
            return res.status(404).json({ message: 'Comment not found' });
        }
        
        // Update fields
        if (text) comment.text = text;
        if (rating) comment.rating = rating;
        comment.updatedAt = Date.now();
        
        await comment.save();
        
        // Return updated comment with user info
        const updatedComment = await Comment.findById(commentId)
            .populate('userId', 'username');
        
        res.status(200).json({ 
            message: 'Comment updated successfully',
            comment: updatedComment
        });
    } catch (error) {
        console.error('Error updating comment:', error);
        res.status(500).json({ message: 'Error updating comment', error: error.message });
    }
};

// Delete a comment
exports.deleteComment = async (req, res) => {
    try {
        const { commentId } = req.params;
        
        // Find and delete comment
        const comment = await Comment.findByIdAndDelete(commentId);
        if (!comment) {
            return res.status(404).json({ message: 'Comment not found' });
        }
        
        res.status(200).json({ message: 'Comment deleted successfully' });
    } catch (error) {
        console.error('Error deleting comment:', error);
        res.status(500).json({ message: 'Error deleting comment', error: error.message });
    }
};

// Get comment statistics for a product (average rating, count)
exports.getCommentStats = async (req, res) => {
    try {
        const { productId } = req.params;
        
        const stats = await Comment.aggregate([
            { $match: { productId: mongoose.Types.ObjectId(productId) } },
            { 
                $group: {
                    _id: null,
                    avgRating: { $avg: '$rating' },
                    count: { $sum: 1 }
                }
            }
        ]);
        
        const result = stats.length > 0 ? {
            avgRating: parseFloat(stats[0].avgRating.toFixed(1)),
            count: stats[0].count
        } : {
            avgRating: 0,
            count: 0
        };
        
        res.status(200).json(result);
    } catch (error) {
        console.error('Error getting comment stats:', error);
        res.status(500).json({ message: 'Error getting comment stats', error: error.message });
    }
};

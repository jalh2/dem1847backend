const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');

// Get all comments for a product
router.get('/product/:productId', commentController.getProductComments);

// Add a new comment to a product
router.post('/product/:productId', commentController.addComment);

// Update a comment
router.put('/:commentId', commentController.updateComment);

// Delete a comment
router.delete('/:commentId', commentController.deleteComment);

// Get comment statistics for a product
router.get('/stats/product/:productId', commentController.getCommentStats);

module.exports = router;

const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');

// Get all conversations (for admin)
router.get('/conversations', messageController.getAllConversations);

// Get messages for a specific conversation
router.get('/conversations/:conversationId', messageController.getConversationMessages);

// Get all conversations for a specific user
router.get('/user/:userId', messageController.getUserConversations);

// Send a new message
router.post('/send', messageController.sendMessage);

// Mark messages as read
router.put('/read', messageController.markAsRead);

module.exports = router;

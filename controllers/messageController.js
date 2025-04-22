const mongoose = require('mongoose');
const Message = require('../models/Message');
const User = require('../models/User');

// Get all conversations for admin
exports.getAllConversations = async (req, res) => {
    try {
        // Get unique conversations with the latest message and user info
        const conversations = await Message.aggregate([
            {
                $sort: { createdAt: -1 }
            },
            {
                $group: {
                    _id: "$conversationId",
                    userId: { $first: "$userId" },
                    lastMessage: { $first: "$text" },
                    topic: { $first: "$topic" },
                    createdAt: { $first: "$createdAt" },
                    unreadCount: {
                        $sum: {
                            $cond: [
                                { $and: [{ $eq: ["$isFromUser", true] }, { $eq: ["$read", false] }] },
                                1,
                                0
                            ]
                        }
                    }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'userId',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            {
                $unwind: '$user'
            },
            {
                $project: {
                    _id: 0,
                    conversationId: "$_id",
                    userId: 1,
                    username: "$user.username",
                    lastMessage: 1,
                    topic: 1,
                    createdAt: 1,
                    unreadCount: 1
                }
            },
            {
                $sort: { createdAt: -1 }
            }
        ]);

        res.status(200).json(conversations);
    } catch (error) {
        console.error('Error getting conversations:', error);
        res.status(500).json({ message: 'Error getting conversations', error: error.message });
    }
};

// Get messages for a specific conversation
exports.getConversationMessages = async (req, res) => {
    try {
        const { conversationId } = req.params;
        
        const messages = await Message.find({ conversationId })
            .sort({ createdAt: 1 })
            .populate('userId', 'username');
        
        res.status(200).json(messages);
    } catch (error) {
        console.error('Error getting conversation messages:', error);
        res.status(500).json({ message: 'Error getting conversation messages', error: error.message });
    }
};

// Get all conversations for a specific user
exports.getUserConversations = async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Get unique conversations with the latest message
        const conversations = await Message.aggregate([
            {
                $match: { userId: new mongoose.Types.ObjectId(userId) }
            },
            {
                $sort: { createdAt: -1 }
            },
            {
                $group: {
                    _id: "$conversationId",
                    lastMessage: { $first: "$text" },
                    topic: { $first: "$topic" },
                    createdAt: { $first: "$createdAt" },
                    unreadCount: {
                        $sum: {
                            $cond: [
                                { $and: [{ $eq: ["$isFromUser", false] }, { $eq: ["$read", false] }] },
                                1,
                                0
                            ]
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    conversationId: "$_id",
                    lastMessage: 1,
                    topic: 1,
                    createdAt: 1,
                    unreadCount: 1
                }
            },
            {
                $sort: { createdAt: -1 }
            }
        ]);

        res.status(200).json(conversations);
    } catch (error) {
        console.error('Error getting user conversations:', error);
        res.status(500).json({ message: 'Error getting user conversations', error: error.message });
    }
};

// Send a new message
exports.sendMessage = async (req, res) => {
    try {
        const { userId, text, topic, conversationId, isFromUser, meta } = req.body;
        
        // Special handling for password reset requests
        if (topic === 'Password Reset' && meta && meta.type === 'password_reset') {
            // Find user by phone number
            const user = await User.findOne({ phoneNumber: meta.phoneNumber });
            
            if (!user) {
                return res.status(404).json({ 
                    message: 'No user found with this phone number',
                    success: false
                });
            }
            
            // Create new message with the actual user ID
            const message = new Message({
                userId: user._id,
                text,
                topic,
                conversationId,
                isFromUser: isFromUser !== undefined ? isFromUser : true,
                meta
            });
            
            await message.save();
            
            return res.status(201).json({
                message: 'Password reset request sent successfully',
                success: true,
                data: message
            });
        }
        
        // Regular message handling
        const message = new Message({
            userId,
            text,
            topic,
            conversationId,
            isFromUser: isFromUser !== undefined ? isFromUser : true,
            meta
        });
        
        await message.save();
        
        res.status(201).json({
            message: 'Message sent successfully',
            data: message
        });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ message: 'Error sending message', error: error.message });
    }
};

// Mark messages as read
exports.markAsRead = async (req, res) => {
    try {
        const { conversationId, isAdmin } = req.body;
        
        // Update messages based on who is marking them as read
        await Message.updateMany(
            { 
                conversationId,
                isFromUser: isAdmin, // If admin is reading, mark user messages as read
                read: false
            },
            { $set: { read: true } }
        );
        
        res.status(200).json({ message: 'Messages marked as read' });
    } catch (error) {
        console.error('Error marking messages as read:', error);
        res.status(500).json({ message: 'Error marking messages as read', error: error.message });
    }
};

const Order = require('../models/Order');
const Product = require('../models/Product');
const fs = require('fs');
const path = require('path');

// Create a new order
exports.createOrder = async (req, res) => {
    try {
        const { 
            items, 
            totalUSD, 
            totalLRD, 
            paymentMethod, 
            shippingAddress,
            orderNotes 
        } = req.body;
        
        const userId = req.body.userId;

        // Validate items
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ message: 'Order must contain at least one item' });
        }

        // Create new order
        const order = new Order({
            user: userId,
            items,
            totalUSD,
            totalLRD,
            paymentMethod,
            shippingAddress: shippingAddress || {},
            orderNotes: orderNotes || '',
            status: 'pending'
        });

        // Save order
        await order.save();

        // Return success
        res.status(201).json({
            message: 'Order created successfully',
            order: {
                id: order._id,
                totalUSD: order.totalUSD,
                totalLRD: order.totalLRD,
                status: order.status,
                createdAt: order.createdAt
            }
        });
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ message: 'Error creating order', error: error.message });
    }
};

// Upload payment proof image
exports.uploadPaymentProof = async (req, res) => {
    try {
        const { orderId } = req.params;
        
        // Check if order exists
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        
        // Check if file was uploaded
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }
        
        // Update order with payment proof image path
        order.paymentProofImage = `/uploads/payments/${req.file.filename}`;
        order.status = 'processing'; // Update status to processing after payment proof
        
        await order.save();
        
        res.status(200).json({
            message: 'Payment proof uploaded successfully',
            order: {
                id: order._id,
                status: order.status,
                paymentProofImage: order.paymentProofImage
            }
        });
    } catch (error) {
        console.error('Error uploading payment proof:', error);
        res.status(500).json({ message: 'Error uploading payment proof', error: error.message });
    }
};

// Get orders for a user
exports.getUserOrders = async (req, res) => {
    try {
        const { userId } = req.params;
        
        const orders = await Order.find({ user: userId })
            .populate('items.product')
            .sort({ createdAt: -1 });
        
        res.status(200).json(orders);
    } catch (error) {
        console.error('Error fetching user orders:', error);
        res.status(500).json({ message: 'Error fetching user orders', error: error.message });
    }
};

// Get order details
exports.getOrderDetails = async (req, res) => {
    try {
        const { orderId } = req.params;
        
        const order = await Order.findById(orderId)
            .populate('items.product')
            .populate('user', 'username phoneNumber');
        
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        
        res.status(200).json(order);
    } catch (error) {
        console.error('Error fetching order details:', error);
        res.status(500).json({ message: 'Error fetching order details', error: error.message });
    }
};

// Update order status (admin only)
exports.updateOrderStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status } = req.body;
        
        // Validate status
        const validStatuses = ['pending', 'processing', 'completed', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Invalid status value' });
        }
        
        // Update order status
        const order = await Order.findByIdAndUpdate(
            orderId,
            { status },
            { new: true }
        );
        
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        
        res.status(200).json({
            message: 'Order status updated successfully',
            order: {
                id: order._id,
                status: order.status,
                updatedAt: order.updatedAt
            }
        });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ message: 'Error updating order status', error: error.message });
    }
};

// Get all orders (admin only)
exports.getAllOrders = async (req, res) => {
    try {
        const orders = await Order.find()
            .populate('user', 'username phoneNumber')
            .populate('items.product', 'name priceUSD priceLRD')
            .sort({ createdAt: -1 });
        
        res.status(200).json(orders);
    } catch (error) {
        console.error('Error fetching all orders:', error);
        res.status(500).json({ message: 'Error fetching all orders', error: error.message });
    }
};

// Cancel order
exports.cancelOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        
        // Find order
        const order = await Order.findById(orderId);
        
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        
        // Only allow cancellation if order is pending or processing
        if (order.status !== 'pending' && order.status !== 'processing') {
            return res.status(400).json({ 
                message: 'Cannot cancel order that is already completed or cancelled' 
            });
        }
        
        // Update order status
        order.status = 'cancelled';
        await order.save();
        
        res.status(200).json({
            message: 'Order cancelled successfully',
            order: {
                id: order._id,
                status: order.status,
                updatedAt: order.updatedAt
            }
        });
    } catch (error) {
        console.error('Error cancelling order:', error);
        res.status(500).json({ message: 'Error cancelling order', error: error.message });
    }
};

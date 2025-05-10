const Order = require('../models/Order');
const Product = require('../models/Product');
const fs = require('fs');
const path = require('path');

// Create a new order
exports.createOrder = async (req, res) => {
    try {
        console.log('Received order creation request');
        console.log('Request content type:', req.headers['content-type']);
        
        const { 
            items, 
            totalUSD, 
            totalLRD, 
            paymentMethod, 
            shippingAddress,
            orderNotes,
            paymentProofImageData,
            paymentProofImageMimeType 
        } = req.body;
        
        // Check for userId in different possible formats
        const userId = req.body.userId || req.body.user_id || req.body.user;
        console.log('User ID extracted from request:', userId);

        // Validate user ID
        if (!userId) {
            return res.status(400).json({ message: 'User ID is required' });
        }

        // Validate items
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ message: 'Order must contain at least one item' });
        }

        // Create new order object
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

        // If payment proof was included, add it to the order
        if (paymentMethod === 'mobile_money' && paymentProofImageData) {
            console.log('Payment proof image data included in order creation');
            console.log('Payment proof image data length:', paymentProofImageData.length);
            
            // Process the base64 data if needed
            let processedBase64 = paymentProofImageData;
            if (processedBase64.startsWith('data:')) {
                console.log('Removing data URI prefix from base64 data');
                const base64Parts = processedBase64.split(',');
                if (base64Parts.length > 1) {
                    processedBase64 = base64Parts[1];
                }
            }
            
            // Add payment proof data to the order
            order.paymentProofImageData = processedBase64;
            order.paymentProofImageMimeType = paymentProofImageMimeType || 'image/jpeg';
            order.paymentProofImage = `uploads/payments/direct-${Date.now()}.jpg`; // Virtual path for compatibility
            
            // Update status to processing since payment proof was provided
            order.status = 'processing';
            
            console.log('Payment proof data added to order, final length:', processedBase64.length);
        } else if (paymentMethod === 'mobile_money') {
            console.log('Mobile money payment selected but no payment proof provided');
        }

        // Save order
        console.log('Saving order to database');
        await order.save();
        console.log('Order saved successfully with ID:', order._id);
        
        // Verify payment proof data was saved if it was provided
        if (paymentProofImageData) {
            const savedOrder = await Order.findById(order._id);
            console.log('Verification - Payment proof data exists:', !!savedOrder.paymentProofImageData);
            console.log('Verification - Payment proof data length:', savedOrder.paymentProofImageData ? savedOrder.paymentProofImageData.length : 0);
        }

        // Return success
        res.status(201).json({
            message: 'Order created successfully',
            order: {
                id: order._id,
                totalUSD: order.totalUSD,
                totalLRD: order.totalLRD,
                status: order.status,
                createdAt: order.createdAt,
                hasPaymentProof: !!order.paymentProofImageData
            }
        });
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ message: 'Error creating order', error: error.message });
    }
};

// Get orders for a user
exports.getUserOrders = async (req, res) => {
    try {
        const { userId } = req.params;
        console.log('Fetching orders for user:', userId);
        
        if (!userId) {
            return res.status(400).json({ message: 'User ID is required' });
        }

        const orders = await Order.find({ user: userId })
            .populate('items.product')
            .sort({ createdAt: -1 });
        
        console.log(`Found ${orders.length} orders for user ${userId}`);
        
        res.status(200).json(orders);
    } catch (error) {
        console.error('Error fetching user orders:', error);
        res.status(500).json({ 
            message: 'Error fetching user orders', 
            error: error.message 
        });
    }
};

// Get order details
exports.getOrderDetails = async (req, res) => {
    try {
        const { orderId } = req.params;
        
        const order = await Order.findById(orderId)
            .populate({
                path: 'items.product',
                select: 'name priceUSD priceLRD images category description'
            })
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
            .populate('items.product', 'name priceUSD priceLRD images')
            .sort({ createdAt: -1 });
        
        res.status(200).json(orders);
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ message: 'Error fetching orders', error: error.message });
    }
};

// Get order by ID
exports.getOrderById = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('user', 'username phoneNumber')
            .populate('items.product', 'name priceUSD priceLRD images');
        
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        
        res.status(200).json(order);
    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).json({ message: 'Error fetching order', error: error.message });
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

// Upload payment proof for an order
exports.uploadPaymentProof = async (req, res) => {
    try {
        console.log('Payment proof upload request received for order ID:', req.params.orderId);
        console.log('Request content type:', req.headers['content-type']);
        console.log('Request has file:', req.file ? 'Yes' : 'No');
        console.log('Request body keys:', req.body ? Object.keys(req.body) : 'null');
        
        // Find order by ID
        const order = await Order.findById(req.params.orderId);
        
        if (!order) {
            // Clean up uploaded file if order not found
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(404).json({ message: 'Order not found' });
        }
        
        let base64Image = null;
        let mimeType = null;
        let imagePath = null;
        
        // Handle file upload via multer
        if (req.file) {
            console.log('Processing file upload via multer');
            console.log('File details:', req.file);
            
            try {
                // Read the file as binary data
                const imageBuffer = fs.readFileSync(req.file.path);
                
                // Convert to base64 for storage in MongoDB
                base64Image = imageBuffer.toString('base64');
                mimeType = req.file.mimetype;
                
                // Store path for backward compatibility
                imagePath = req.file.path.replace(/\\/g, '/');
                console.log('Saving payment proof image path:', imagePath);
                
                // Clean up the file from the filesystem since we've stored it in MongoDB
                fs.unlinkSync(req.file.path);
                
                console.log('Successfully processed file upload, base64 length:', base64Image.length);
            } catch (fileError) {
                console.error('Error processing uploaded file:', fileError);
                return res.status(400).json({ message: 'Error processing uploaded file' });
            }
        } 
        // Handle direct base64 data from mobile app
        else if (req.body && req.body.paymentProofImageData) {
            console.log('Processing direct base64 image data');
            base64Image = req.body.paymentProofImageData;
            mimeType = req.body.paymentProofImageMimeType || 'image/jpeg';
            imagePath = `uploads/payments/direct-${Date.now()}.jpg`; // Virtual path for compatibility
            
            // Log the base64 data length for debugging
            if (base64Image) {
                console.log('Base64 data received, length:', base64Image.length);
                // Check if the base64 data starts with a data URI prefix and remove it if needed
                if (base64Image.startsWith('data:')) {
                    console.log('Removing data URI prefix from base64 data');
                    const base64Parts = base64Image.split(',');
                    if (base64Parts.length > 1) {
                        base64Image = base64Parts[1];
                    }
                }
                console.log('Final base64 data length:', base64Image.length);
            } else {
                console.error('Base64 image data is null or undefined');
            }
        } 
        // No image data found
        else {
            console.error('No payment proof image found in request');
            console.log('Request body:', JSON.stringify(req.body));
            return res.status(400).json({ 
                message: 'No payment proof image provided. Please provide either a file upload or base64 image data.' 
            });
        }
        
        if (!base64Image) {
            console.error('Base64 image data is null or empty');
            return res.status(400).json({ message: 'Image data is empty or invalid' });
        }
        
        // Update order with payment proof image information
        order.paymentProofImage = imagePath;
        order.paymentProofImageData = base64Image;
        order.paymentProofImageMimeType = mimeType;
        order.status = 'processing'; // Update status to processing after payment proof
        
        console.log('Saving order with payment proof data');
        console.log('Base64 data length being saved:', base64Image.length);
        
        // Save the order with the payment proof data
        await order.save();
        console.log('Order saved successfully with payment proof');
        
        // Verify the data was saved correctly by retrieving it from the database
        const savedOrder = await Order.findById(req.params.orderId);
        console.log('Verification - Payment proof data exists:', !!savedOrder.paymentProofImageData);
        console.log('Verification - Payment proof data length:', savedOrder.paymentProofImageData ? savedOrder.paymentProofImageData.length : 0);
        
        // Return success response with order details
        res.status(200).json({
            message: 'Payment proof uploaded successfully',
            order: {
                id: order._id,
                status: order.status,
                paymentProofImage: order.paymentProofImage,
                hasPaymentProofData: !!order.paymentProofImageData,
                dataLength: order.paymentProofImageData ? order.paymentProofImageData.length : 0
            }
        });
    } catch (error) {
        console.error('Error uploading payment proof:', error);
        // Clean up uploaded file if there's an error
        if (req.file) {
            try {
                fs.unlinkSync(req.file.path);
            } catch (unlinkError) {
                console.error('Error deleting file:', unlinkError);
            }
        }
        res.status(500).json({ message: 'Error uploading payment proof', error: error.message });
    }
};

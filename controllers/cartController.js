const Cart = require('../models/Cart');
const Product = require('../models/Product');
const User = require('../models/User');

// Get cart by customer ID
exports.getCartByCustomer = async (req, res) => {
    try {
        const customerId = req.params.customerId;
        
        // Find cart for this customer
        const cart = await Cart.findOne({ 
            customer: customerId,
            status: 'pending' // Only get active cart
        }).populate('items.product');
        
        if (!cart) {
            return res.status(404).json({ message: 'No active cart found for this customer' });
        }
        
        res.status(200).json({ cart });
    } catch (error) {
        console.error('Error getting cart:', error);
        res.status(500).json({ message: 'Error getting cart', error: error.message });
    }
};

// Create a new cart or get existing cart
exports.createOrGetCart = async (req, res) => {
    try {
        const { customerId } = req.body;
        
        // Find customer
        const customer = await User.findById(customerId);
        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }
        
        // Check if customer already has an active cart
        let cart = await Cart.findOne({ 
            customer: customerId,
            status: 'pending'
        });
        
        // If no active cart exists, create a new one
        if (!cart) {
            cart = new Cart({
                customer: customerId,
                customerName: customer.username,
                customerPhone: customer.phoneNumber,
                items: []
            });
            
            await cart.save();
        }
        
        res.status(200).json({ 
            message: cart.items.length > 0 ? 'Existing cart retrieved' : 'New cart created',
            cart 
        });
    } catch (error) {
        console.error('Error creating/getting cart:', error);
        res.status(500).json({ message: 'Error creating/getting cart', error: error.message });
    }
};

// Add item to cart
exports.addItemToCart = async (req, res) => {
    try {
        const { cartId, productId, quantity } = req.body;
        
        // Find cart
        const cart = await Cart.findById(cartId);
        if (!cart) {
            return res.status(404).json({ message: 'Cart not found' });
        }
        
        // Check if cart is still pending
        if (cart.status !== 'pending') {
            return res.status(400).json({ message: 'Cannot add items to a cart that is not pending' });
        }
        
        // Find product
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        
        // Check if product is in stock
        if (product.quantityInStock < quantity) {
            return res.status(400).json({ 
                message: 'Not enough items in stock', 
                available: product.quantityInStock 
            });
        }
        
        // Check if product already exists in cart
        const existingItemIndex = cart.items.findIndex(
            item => item.product.toString() === productId
        );
        
        if (existingItemIndex > -1) {
            // Update existing item
            cart.items[existingItemIndex].quantity += quantity;
            cart.items[existingItemIndex].totalUSD = cart.items[existingItemIndex].quantity * product.priceUSD;
            cart.items[existingItemIndex].totalLRD = cart.items[existingItemIndex].quantity * product.priceLRD;
        } else {
            // Add new item
            cart.items.push({
                product: productId,
                productName: product.name,
                quantity: quantity,
                priceUSD: product.priceUSD,
                priceLRD: product.priceLRD,
                totalUSD: product.priceUSD * quantity,
                totalLRD: product.priceLRD * quantity,
                category: product.category,
                image: product.images && product.images.length > 0 ? product.images[0].path : null
            });
        }
        
        // Save updated cart (pre-save middleware will update totals)
        await cart.save();
        
        res.status(200).json({ 
            message: 'Item added to cart successfully',
            cart 
        });
    } catch (error) {
        console.error('Error adding item to cart:', error);
        res.status(500).json({ message: 'Error adding item to cart', error: error.message });
    }
};

// Update cart item quantity
exports.updateCartItem = async (req, res) => {
    try {
        const { cartId, itemId, quantity } = req.body;
        
        // Find cart
        const cart = await Cart.findById(cartId);
        if (!cart) {
            return res.status(404).json({ message: 'Cart not found' });
        }
        
        // Check if cart is still pending
        if (cart.status !== 'pending') {
            return res.status(400).json({ message: 'Cannot update items in a cart that is not pending' });
        }
        
        // Find the item in the cart
        const itemIndex = cart.items.findIndex(item => item._id.toString() === itemId);
        
        if (itemIndex === -1) {
            return res.status(404).json({ message: 'Item not found in cart' });
        }
        
        // If quantity is 0, remove the item
        if (quantity === 0) {
            cart.items.splice(itemIndex, 1);
        } else {
            // Find product to check stock
            const product = await Product.findById(cart.items[itemIndex].product);
            if (!product) {
                return res.status(404).json({ message: 'Product not found' });
            }
            
            // Check if product is in stock
            if (product.quantityInStock < quantity) {
                return res.status(400).json({ 
                    message: 'Not enough items in stock', 
                    available: product.quantityInStock 
                });
            }
            
            // Update quantity and totals
            cart.items[itemIndex].quantity = quantity;
            cart.items[itemIndex].totalUSD = quantity * cart.items[itemIndex].priceUSD;
            cart.items[itemIndex].totalLRD = quantity * cart.items[itemIndex].priceLRD;
        }
        
        // Save updated cart
        await cart.save();
        
        res.status(200).json({ 
            message: 'Cart updated successfully',
            cart 
        });
    } catch (error) {
        console.error('Error updating cart item:', error);
        res.status(500).json({ message: 'Error updating cart item', error: error.message });
    }
};

// Remove item from cart
exports.removeCartItem = async (req, res) => {
    try {
        const { cartId, itemId } = req.params;
        
        // Find cart
        const cart = await Cart.findById(cartId);
        if (!cart) {
            return res.status(404).json({ message: 'Cart not found' });
        }
        
        // Check if cart is still pending
        if (cart.status !== 'pending') {
            return res.status(400).json({ message: 'Cannot remove items from a cart that is not pending' });
        }
        
        // Find the item index
        const itemIndex = cart.items.findIndex(item => item._id.toString() === itemId);
        
        if (itemIndex === -1) {
            return res.status(404).json({ message: 'Item not found in cart' });
        }
        
        // Remove the item
        cart.items.splice(itemIndex, 1);
        
        // Save updated cart
        await cart.save();
        
        res.status(200).json({ 
            message: 'Item removed from cart successfully',
            cart 
        });
    } catch (error) {
        console.error('Error removing cart item:', error);
        res.status(500).json({ message: 'Error removing cart item', error: error.message });
    }
};

// Clear cart
exports.clearCart = async (req, res) => {
    try {
        const { cartId } = req.params;
        
        // Find cart
        const cart = await Cart.findById(cartId);
        if (!cart) {
            return res.status(404).json({ message: 'Cart not found' });
        }
        
        // Check if cart is still pending
        if (cart.status !== 'pending') {
            return res.status(400).json({ message: 'Cannot clear a cart that is not pending' });
        }
        
        // Clear items
        cart.items = [];
        
        // Save updated cart
        await cart.save();
        
        res.status(200).json({ 
            message: 'Cart cleared successfully',
            cart 
        });
    } catch (error) {
        console.error('Error clearing cart:', error);
        res.status(500).json({ message: 'Error clearing cart', error: error.message });
    }
};

// Update cart status (for admin)
exports.updateCartStatus = async (req, res) => {
    try {
        const { cartId } = req.params;
        const { status, paymentStatus, paymentMethod, notes } = req.body;
        
        // Find cart
        const cart = await Cart.findById(cartId);
        if (!cart) {
            return res.status(404).json({ message: 'Cart not found' });
        }
        
        // Update cart fields
        if (status) cart.status = status;
        if (paymentStatus) cart.paymentStatus = paymentStatus;
        if (paymentMethod) cart.paymentMethod = paymentMethod;
        if (notes) cart.notes = notes;
        
        // Update timestamp
        cart.updatedAt = Date.now();
        
        // Save updated cart
        await cart.save();
        
        res.status(200).json({ 
            message: 'Cart status updated successfully',
            cart 
        });
    } catch (error) {
        console.error('Error updating cart status:', error);
        res.status(500).json({ message: 'Error updating cart status', error: error.message });
    }
};

// Get all carts (for admin dashboard)
exports.getAllCarts = async (req, res) => {
    try {
        // Get query parameters for filtering
        const { status, paymentStatus, customerId } = req.query;
        
        // Build filter object
        const filter = {};
        if (status) filter.status = status;
        if (paymentStatus) filter.paymentStatus = paymentStatus;
        if (customerId) filter.customer = customerId;
        
        // Find carts with filters
        const carts = await Cart.find(filter)
            .populate('customer', 'username phoneNumber')
            .sort({ createdAt: -1 });
        
        res.status(200).json({ carts });
    } catch (error) {
        console.error('Error getting all carts:', error);
        res.status(500).json({ message: 'Error getting all carts', error: error.message });
    }
};

// Get cart details by ID
exports.getCartById = async (req, res) => {
    try {
        const { cartId } = req.params;
        
        // Find cart with populated product details
        const cart = await Cart.findById(cartId)
            .populate('customer', 'username phoneNumber')
            .populate('items.product');
        
        if (!cart) {
            return res.status(404).json({ message: 'Cart not found' });
        }
        
        res.status(200).json({ cart });
    } catch (error) {
        console.error('Error getting cart details:', error);
        res.status(500).json({ message: 'Error getting cart details', error: error.message });
    }
};

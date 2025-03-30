const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');

// Customer cart operations
router.get('/customer/:customerId', cartController.getCartByCustomer);
router.post('/create', cartController.createOrGetCart);
router.post('/add-item', cartController.addItemToCart);
router.put('/update-item', cartController.updateCartItem);
router.delete('/:cartId/item/:itemId', cartController.removeCartItem);
router.delete('/:cartId/clear', cartController.clearCart);

// Admin cart operations
router.get('/', cartController.getAllCarts);
router.get('/:cartId', cartController.getCartById);
router.put('/:cartId/status', cartController.updateCartStatus);

module.exports = router;

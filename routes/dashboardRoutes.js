const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

// Get dashboard data
router.get('/', dashboardController.getDashboardData);

// Force update dashboard data
router.post('/update', dashboardController.updateDashboardData);

// Get sales data for a specific time period
router.get('/sales/:period', dashboardController.getSalesByPeriod);

// Get top products
router.get('/top-products', dashboardController.getTopProducts);

// Get sales by category
router.get('/sales-by-category', dashboardController.getSalesByCategory);

// Get low stock products
router.get('/low-stock', dashboardController.getLowStockProducts);

// Get payment method statistics
router.get('/payment-methods', dashboardController.getPaymentMethodStats);

// Get recent sales
router.get('/recent-sales', dashboardController.getRecentSales);

// Get summary statistics
router.get('/summary', dashboardController.getSummaryStats);

// Get custom date range sales data
router.post('/custom-range', dashboardController.getCustomRangeSales);

// Get currency conversion rate
router.get('/currency-rate', dashboardController.getCurrencyRate);

// Update currency conversion rate
router.put('/currency-rate', dashboardController.updateCurrencyRate);

module.exports = router;

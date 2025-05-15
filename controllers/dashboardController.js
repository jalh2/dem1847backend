const Dashboard = require('../models/Dashboard');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

/**
 * Get dashboard data
 * @route GET /api/dashboard
 * @access Public
 */
exports.getDashboardData = async (req, res) => {
    try {
        // Find existing dashboard data or create a new one if it doesn't exist
        let dashboardData = await Dashboard.findOne();
        
        // If no dashboard data exists or it's older than 1 hour, update it
        if (!dashboardData || 
            (Date.now() - new Date(dashboardData.lastUpdated).getTime() > 3600000)) {
            console.log('Updating dashboard data...');
            dashboardData = await Dashboard.updateDashboardData();
        }
        
        res.json(dashboardData);
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Force update dashboard data
 * @route POST /api/dashboard/update
 * @access Public
 */
exports.updateDashboardData = async (req, res) => {
    try {
        const dashboardData = await Dashboard.updateDashboardData();
        res.json(dashboardData);
    } catch (error) {
        console.error('Error updating dashboard data:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Get sales data for a specific time period
 * @route GET /api/dashboard/sales/:period
 * @access Public
 */
exports.getSalesByPeriod = async (req, res) => {
    try {
        const { period } = req.params;
        
        if (!['daily', 'weekly', 'monthly'].includes(period)) {
            return res.status(400).json({ message: 'Invalid period. Use daily, weekly, or monthly.' });
        }
        
        const dashboard = await Dashboard.findOne();
        
        if (!dashboard) {
            return res.status(404).json({ message: 'Dashboard data not found' });
        }
        
        res.json(dashboard.salesByPeriod[period]);
    } catch (error) {
        console.error(`Error fetching ${req.params.period} sales data:`, error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Get top products
 * @route GET /api/dashboard/top-products
 * @access Public
 */
exports.getTopProducts = async (req, res) => {
    try {
        const dashboard = await Dashboard.findOne();
        
        if (!dashboard) {
            return res.status(404).json({ message: 'Dashboard data not found' });
        }
        
        res.json(dashboard.topProducts);
    } catch (error) {
        console.error('Error fetching top products:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Get sales by category
 * @route GET /api/dashboard/sales-by-category
 * @access Public
 */
exports.getSalesByCategory = async (req, res) => {
    try {
        const dashboard = await Dashboard.findOne();
        
        if (!dashboard) {
            return res.status(404).json({ message: 'Dashboard data not found' });
        }
        
        res.json(dashboard.salesByCategory);
    } catch (error) {
        console.error('Error fetching sales by category:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Get low stock products
 * @route GET /api/dashboard/low-stock
 * @access Public
 */
exports.getLowStockProducts = async (req, res) => {
    try {
        const dashboard = await Dashboard.findOne();
        
        if (!dashboard) {
            return res.status(404).json({ message: 'Dashboard data not found' });
        }
        
        res.json(dashboard.lowStockProducts);
    } catch (error) {
        console.error('Error fetching low stock products:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Get payment method statistics
 * @route GET /api/dashboard/payment-methods
 * @access Public
 */
exports.getPaymentMethodStats = async (req, res) => {
    try {
        const dashboard = await Dashboard.findOne();
        
        if (!dashboard) {
            return res.status(404).json({ message: 'Dashboard data not found' });
        }
        
        res.json(dashboard.paymentMethodStats);
    } catch (error) {
        console.error('Error fetching payment method statistics:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Get recent sales
 * @route GET /api/dashboard/recent-sales
 * @access Public
 */
exports.getRecentSales = async (req, res) => {
    try {
        const dashboard = await Dashboard.findOne();
        
        if (!dashboard) {
            return res.status(404).json({ message: 'Dashboard data not found' });
        }
        
        res.json(dashboard.recentSales);
    } catch (error) {
        console.error('Error fetching recent sales:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Get summary statistics
 * @route GET /api/dashboard/summary
 * @access Public
 */
exports.getSummaryStats = async (req, res) => {
    try {
        const dashboard = await Dashboard.findOne();
        
        if (!dashboard) {
            return res.status(404).json({ message: 'Dashboard data not found' });
        }
        
        const summary = {
            totalRevenue: dashboard.totalRevenue,
            totalOrders: dashboard.totalOrders,
            totalProducts: dashboard.totalProducts,
            totalCustomers: dashboard.totalCustomers,
            inventoryValue: dashboard.inventoryValue,
            ordersByStatus: dashboard.ordersByStatus,
            lastUpdated: dashboard.lastUpdated
        };
        
        res.json(summary);
    } catch (error) {
        console.error('Error fetching summary statistics:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Get custom date range sales data
 * @route POST /api/dashboard/custom-range
 * @access Public
 */
exports.getCustomRangeSales = async (req, res) => {
    try {
        const { startDate, endDate } = req.body;
        
        if (!startDate || !endDate) {
            return res.status(400).json({ message: 'Start date and end date are required' });
        }
        
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({ message: 'Invalid date format' });
        }
        
        // Set end date to end of day
        end.setHours(23, 59, 59, 999);
        
        const salesData = await Transaction.aggregate([
            { 
                $match: { 
                    transactionStatus: 'completed',
                    transactionDate: { $gte: start, $lte: end }
                } 
            },
            {
                $group: {
                    _id: { 
                        $dateToString: { format: "%Y-%m-%d", date: "$transactionDate" } 
                    },
                    amountUSD: { $sum: '$totalBoughtUSD' },
                    amountLRD: { $sum: '$totalBoughtLRD' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);
        
        const formattedSales = salesData.map(day => ({
            date: day._id,
            amount: {
                USD: day.amountUSD,
                LRD: day.amountLRD
            },
            count: day.count
        }));
        
        res.json(formattedSales);
    } catch (error) {
        console.error('Error fetching custom range sales data:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Get currency conversion rate (USD to LRD)
 * @route GET /api/dashboard/currency-rate
 * @access Public
 */
exports.getCurrencyRate = async (req, res) => {
    try {
        const dashboard = await Dashboard.findOne();
        
        if (!dashboard) {
            return res.status(404).json({ message: 'Dashboard data not found' });
        }
        
        res.json({ rate: dashboard.currencyConversionRate });
    } catch (error) {
        console.error('Error fetching currency conversion rate:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Update currency conversion rate (USD to LRD)
 * @route PUT /api/dashboard/currency-rate
 * @access Admin only
 */
exports.updateCurrencyRate = async (req, res) => {
    try {
        console.log('Starting currency rate update process...');
        const { rate } = req.body;
        console.log('Received new rate:', rate);
        
        if (!rate || isNaN(rate) || rate <= 0) {
            console.log('Invalid rate provided:', rate);
            return res.status(400).json({ message: 'A valid positive number is required for the conversion rate' });
        }
        
        console.log('Finding dashboard document...');
        let dashboard = await Dashboard.findOne();
        
        if (!dashboard) {
            console.log('No dashboard found, creating new one...');
            dashboard = new Dashboard();
        }
        
        const oldRate = dashboard.currencyConversionRate;
        console.log('Old rate:', oldRate, 'New rate:', rate);
        
        dashboard.currencyConversionRate = rate;
        dashboard.lastUpdated = new Date();
        
        console.log('Saving dashboard with new rate...');
        await dashboard.save();
        console.log('Dashboard saved successfully');
        
        // Update all product LRD prices with the new rate
        console.log('Fetching all products...');
        const products = await Product.find({});
        console.log(`Found ${products.length} products to update`);
        
        let updatedCount = 0;
        console.log('Updating products individually...');
        
        for (const product of products) {
            const newLRDPrice = product.priceUSD * rate;
            const newTotalValueLRD = newLRDPrice * product.quantityInStock;
            
            console.log(`Updating product ${product._id}:`);
            console.log(`- Name: ${product.name}`);
            console.log(`- USD Price: ${product.priceUSD}`);
            console.log(`- Old LRD Price: ${product.priceLRD}`);
            console.log(`- New LRD Price: ${newLRDPrice}`);
            console.log(`- Quantity: ${product.quantityInStock}`);
            console.log(`- Old Total Value LRD: ${product.totalValueLRD}`);
            console.log(`- New Total Value LRD: ${newTotalValueLRD}`);
            
            try {
                const updatedProduct = await Product.findOneAndUpdate(
                    { _id: product._id },
                    { 
                        $set: { 
                            priceLRD: newLRDPrice,
                            totalValueLRD: newTotalValueLRD
                        } 
                    },
                    { new: true }
                );
                
                if (updatedProduct) {
                    updatedCount++;
                    console.log(`✓ Successfully updated product ${product._id}`);
                    console.log(`  New values: LRD ${updatedProduct.priceLRD}, Total: ${updatedProduct.totalValueLRD}`);
                } else {
                    console.log(`✗ Failed to update product ${product._id}`);
                }
            } catch (error) {
                console.error(`Error updating product ${product._id}:`, error);
            }
        }
        
        console.log('Currency rate update completed successfully');
        res.json({ 
            rate: dashboard.currencyConversionRate, 
            message: 'Currency conversion rate and product prices updated successfully',
            productsUpdated: updatedCount
        });
    } catch (error) {
        console.error('Error updating currency conversion rate:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

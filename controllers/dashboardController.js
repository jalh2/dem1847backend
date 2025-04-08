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

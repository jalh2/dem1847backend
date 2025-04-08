const mongoose = require('mongoose');

const dashboardSchema = new mongoose.Schema({
    // Summary statistics
    totalRevenue: {
        USD: {
            type: Number,
            default: 0
        },
        LRD: {
            type: Number,
            default: 0
        }
    },
    totalOrders: {
        type: Number,
        default: 0
    },
    totalProducts: {
        type: Number,
        default: 0
    },
    totalCustomers: {
        type: Number,
        default: 0
    },
    
    // Inventory value
    inventoryValue: {
        USD: {
            type: Number,
            default: 0
        },
        LRD: {
            type: Number,
            default: 0
        }
    },
    
    // Order statistics
    ordersByStatus: {
        pending: {
            type: Number,
            default: 0
        },
        processing: {
            type: Number,
            default: 0
        },
        completed: {
            type: Number,
            default: 0
        },
        cancelled: {
            type: Number,
            default: 0
        }
    },
    
    // Sales statistics
    recentSales: [{
        date: Date,
        amount: {
            USD: Number,
            LRD: Number
        },
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product'
        },
        productName: String
    }],
    
    // Time-based statistics
    salesByPeriod: {
        daily: [{
            date: Date,
            amount: {
                USD: Number,
                LRD: Number
            },
            count: Number
        }],
        weekly: [{
            week: String, // Format: YYYY-WW
            amount: {
                USD: Number,
                LRD: Number
            },
            count: Number
        }],
        monthly: [{
            month: String, // Format: YYYY-MM
            amount: {
                USD: Number,
                LRD: Number
            },
            count: Number
        }]
    },
    
    // Product statistics
    topProducts: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product'
        },
        productName: String,
        quantitySold: Number,
        revenue: {
            USD: Number,
            LRD: Number
        }
    }],
    
    // Category statistics
    salesByCategory: [{
        category: String,
        quantitySold: Number,
        revenue: {
            USD: Number,
            LRD: Number
        }
    }],
    
    // Low stock alerts
    lowStockProducts: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product'
        },
        productName: String,
        currentStock: Number,
        threshold: Number
    }],
    
    // Payment method statistics
    paymentMethodStats: {
        cash: {
            count: {
                type: Number,
                default: 0
            },
            amount: {
                USD: {
                    type: Number,
                    default: 0
                },
                LRD: {
                    type: Number,
                    default: 0
                }
            }
        },
        card: {
            count: {
                type: Number,
                default: 0
            },
            amount: {
                USD: {
                    type: Number,
                    default: 0
                },
                LRD: {
                    type: Number,
                    default: 0
                }
            }
        },
        mobile_money: {
            count: {
                type: Number,
                default: 0
            },
            amount: {
                USD: {
                    type: Number,
                    default: 0
                },
                LRD: {
                    type: Number,
                    default: 0
                }
            }
        },
        bank_transfer: {
            count: {
                type: Number,
                default: 0
            },
            amount: {
                USD: {
                    type: Number,
                    default: 0
                },
                LRD: {
                    type: Number,
                    default: 0
                }
            }
        },
        other: {
            count: {
                type: Number,
                default: 0
            },
            amount: {
                USD: {
                    type: Number,
                    default: 0
                },
                LRD: {
                    type: Number,
                    default: 0
                }
            }
        }
    },
    
    // Last updated timestamp
    lastUpdated: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Method to update dashboard data
dashboardSchema.statics.updateDashboardData = async function() {
    const Dashboard = this;
    const Order = mongoose.model('Order');
    const Product = mongoose.model('Product');
    const User = mongoose.model('User');
    const Transaction = mongoose.model('Transaction');
    
    // Create a new dashboard document or find the existing one
    let dashboard = await Dashboard.findOne() || new Dashboard();
    
    try {
        // Update total counts
        dashboard.totalProducts = await Product.countDocuments();
        dashboard.totalOrders = await Order.countDocuments();
        dashboard.totalCustomers = await User.countDocuments({ role: 'customer' });
        
        // Update order status counts
        dashboard.ordersByStatus.pending = await Order.countDocuments({ status: 'pending' });
        dashboard.ordersByStatus.processing = await Order.countDocuments({ status: 'processing' });
        dashboard.ordersByStatus.completed = await Order.countDocuments({ status: 'completed' });
        dashboard.ordersByStatus.cancelled = await Order.countDocuments({ status: 'cancelled' });
        
        // Update total revenue
        const transactions = await Transaction.find({ transactionStatus: 'completed' });
        let totalRevenueUSD = 0;
        let totalRevenueLRD = 0;
        
        transactions.forEach(transaction => {
            totalRevenueUSD += transaction.totalBoughtUSD;
            totalRevenueLRD += transaction.totalBoughtLRD;
        });
        
        dashboard.totalRevenue.USD = totalRevenueUSD;
        dashboard.totalRevenue.LRD = totalRevenueLRD;
        
        // Update inventory value
        const products = await Product.find();
        let inventoryValueUSD = 0;
        let inventoryValueLRD = 0;
        
        products.forEach(product => {
            inventoryValueUSD += product.totalValueUSD;
            inventoryValueLRD += product.totalValueLRD;
        });
        
        dashboard.inventoryValue.USD = inventoryValueUSD;
        dashboard.inventoryValue.LRD = inventoryValueLRD;
        
        // Update top products
        const topProductsAggregation = await Transaction.aggregate([
            { $match: { transactionStatus: 'completed' } },
            { $group: {
                _id: '$productId',
                productName: { $first: '$productName' },
                quantitySold: { $sum: '$quantityBought' },
                revenueUSD: { $sum: '$totalBoughtUSD' },
                revenueLRD: { $sum: '$totalBoughtLRD' }
            }},
            { $sort: { revenueUSD: -1 } },
            { $limit: 5 }
        ]);
        
        dashboard.topProducts = topProductsAggregation.map(item => ({
            productId: item._id,
            productName: item.productName,
            quantitySold: item.quantitySold,
            revenue: {
                USD: item.revenueUSD,
                LRD: item.revenueLRD
            }
        }));
        
        // Update sales by category
        const salesByCategoryAggregation = await Transaction.aggregate([
            { $match: { transactionStatus: 'completed' } },
            { $group: {
                _id: '$category',
                quantitySold: { $sum: '$quantityBought' },
                revenueUSD: { $sum: '$totalBoughtUSD' },
                revenueLRD: { $sum: '$totalBoughtLRD' }
            }},
            { $sort: { revenueUSD: -1 } }
        ]);
        
        dashboard.salesByCategory = salesByCategoryAggregation.map(item => ({
            category: item._id,
            quantitySold: item.quantitySold,
            revenue: {
                USD: item.revenueUSD,
                LRD: item.revenueLRD
            }
        }));
        
        // Update low stock products
        const lowStockThreshold = 5; // Define your threshold
        const lowStockProductsData = await Product.find({ quantityInStock: { $lte: lowStockThreshold } })
            .select('_id name quantityInStock')
            .limit(10);
            
        dashboard.lowStockProducts = lowStockProductsData.map(product => ({
            productId: product._id,
            productName: product.name,
            currentStock: product.quantityInStock,
            threshold: lowStockThreshold
        }));
        
        // Update payment method statistics
        const paymentMethodsAggregation = await Transaction.aggregate([
            { $match: { transactionStatus: 'completed' } },
            { $group: {
                _id: '$paymentMethod',
                count: { $sum: 1 },
                amountUSD: { $sum: '$totalBoughtUSD' },
                amountLRD: { $sum: '$totalBoughtLRD' }
            }}
        ]);
        
        // Reset payment method stats
        dashboard.paymentMethodStats = {
            cash: { count: 0, amount: { USD: 0, LRD: 0 } },
            card: { count: 0, amount: { USD: 0, LRD: 0 } },
            mobile_money: { count: 0, amount: { USD: 0, LRD: 0 } },
            bank_transfer: { count: 0, amount: { USD: 0, LRD: 0 } },
            other: { count: 0, amount: { USD: 0, LRD: 0 } }
        };
        
        // Update with aggregated data
        paymentMethodsAggregation.forEach(method => {
            if (dashboard.paymentMethodStats[method._id]) {
                dashboard.paymentMethodStats[method._id].count = method.count;
                dashboard.paymentMethodStats[method._id].amount.USD = method.amountUSD;
                dashboard.paymentMethodStats[method._id].amount.LRD = method.amountLRD;
            }
        });
        
        // Update recent sales
        const recentSalesData = await Transaction.find({ transactionStatus: 'completed' })
            .sort({ transactionDate: -1 })
            .limit(10)
            .select('transactionDate totalBoughtUSD totalBoughtLRD productId productName');
            
        dashboard.recentSales = recentSalesData.map(sale => ({
            date: sale.transactionDate,
            amount: {
                USD: sale.totalBoughtUSD,
                LRD: sale.totalBoughtLRD
            },
            productId: sale.productId,
            productName: sale.productName
        }));
        
        // Update time-based statistics (daily, weekly, monthly)
        // This is a simplified version - you might want to expand this based on your needs
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
        
        const dailySalesAggregation = await Transaction.aggregate([
            { 
                $match: { 
                    transactionStatus: 'completed',
                    transactionDate: { $gte: thirtyDaysAgo }
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
        
        dashboard.salesByPeriod.daily = dailySalesAggregation.map(day => ({
            date: new Date(day._id),
            amount: {
                USD: day.amountUSD,
                LRD: day.amountLRD
            },
            count: day.count
        }));
        
        // Update last updated timestamp
        dashboard.lastUpdated = new Date();
        
        // Save the dashboard
        await dashboard.save();
        
        return dashboard;
    } catch (error) {
        console.error('Error updating dashboard data:', error);
        throw error;
    }
};

module.exports = mongoose.model('Dashboard', dashboardSchema);

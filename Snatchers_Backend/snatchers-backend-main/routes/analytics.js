import express from 'express';
import Analytics from '../models/Analytics.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import Product from '../models/Product.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// Middleware to check admin role
const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Track search analytics
router.post('/search', async (req, res) => {
  try {
    const {
      query,
      resultsCount,
      filters,
      sortBy,
      timestamp
    } = req.body;

    const analyticsData = {
      type: 'search',
      userId: req.session?.userInfo?.sub || null,
      sessionId: req.sessionID,
      data: {
        query,
        resultsCount,
        filters,
        sortBy,
        timestamp
      },
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip || req.connection.remoteAddress,
      referrer: req.get('Referer')
    };

    const analytics = new Analytics(analyticsData);
    await analytics.save();

    res.json({
      success: true,
      message: 'Search analytics tracked successfully'
    });
  } catch (error) {
    console.error('Error tracking search analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track search analytics',
      details: error.message
    });
  }
});

// Track product view analytics
router.post('/product-view', async (req, res) => {
  try {
    const {
      productId,
      searchQuery,
      filters,
      sortBy,
      position,
      page,
      timestamp
    } = req.body;

    const analyticsData = {
      type: 'product_view',
      userId: req.session?.userInfo?.sub || null,
      sessionId: req.sessionID,
      data: {
        productId,
        searchQuery,
        filters,
        sortBy,
        position,
        page,
        timestamp
      },
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip || req.connection.remoteAddress,
      referrer: req.get('Referer')
    };

    const analytics = new Analytics(analyticsData);
    await analytics.save();

    res.json({
      success: true,
      message: 'Product view analytics tracked successfully'
    });
  } catch (error) {
    console.error('Error tracking product view analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track product view analytics',
      details: error.message
    });
  }
});

// Track page view analytics
router.post('/page-view', async (req, res) => {
  try {
    const {
      page,
      timestamp,
      loadTime
    } = req.body;

    const analyticsData = {
      type: 'page_view',
      userId: req.session?.userInfo?.sub || null,
      sessionId: req.sessionID,
      data: {
        page,
        timestamp,
        loadTime
      },
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip || req.connection.remoteAddress,
      referrer: req.get('Referer')
    };

    const analytics = new Analytics(analyticsData);
    await analytics.save();

    res.json({
      success: true,
      message: 'Page view analytics tracked successfully'
    });
  } catch (error) {
    console.error('Error tracking page view analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track page view analytics',
      details: error.message
    });
  }
});

// Get search analytics (admin only)
router.get('/search-stats', async (req, res) => {
  try {
    // TODO: Add admin authentication middleware
    
    const {
      startDate,
      endDate,
      limit = 100
    } = req.query;

    const matchQuery = { type: 'search' };
    
    if (startDate || endDate) {
      matchQuery.timestamp = {};
      if (startDate) matchQuery.timestamp.$gte = new Date(startDate);
      if (endDate) matchQuery.timestamp.$lte = new Date(endDate);
    }

    const [
      topSearches,
      searchVolume,
      noResultsSearches
    ] = await Promise.all([
      // Top search queries
      Analytics.aggregate([
        { $match: matchQuery },
        { $group: {
          _id: '$data.query',
          count: { $sum: 1 },
          avgResults: { $avg: '$data.resultsCount' }
        }},
        { $sort: { count: -1 } },
        { $limit: parseInt(limit) }
      ]),

      // Search volume over time
      Analytics.aggregate([
        { $match: matchQuery },
        { $group: {
          _id: {
            year: { $year: '$timestamp' },
            month: { $month: '$timestamp' },
            day: { $dayOfMonth: '$timestamp' }
          },
          count: { $sum: 1 }
        }},
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
      ]),

      // Searches with no results
      Analytics.aggregate([
        { 
          $match: { 
            ...matchQuery,
            'data.resultsCount': 0
          }
        },
        { $group: {
          _id: '$data.query',
          count: { $sum: 1 }
        }},
        { $sort: { count: -1 } },
        { $limit: 50 }
      ])
    ]);

    res.json({
      success: true,
      data: {
        topSearches,
        searchVolume,
        noResultsSearches
      }
    });
  } catch (error) {
    console.error('Error fetching search analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch search analytics',
      details: error.message
    });
  }
});

// Get product view analytics (admin only)
router.get('/product-stats', async (req, res) => {
  try {
    // TODO: Add admin authentication middleware
    
    const {
      startDate,
      endDate,
      limit = 100
    } = req.query;

    const matchQuery = { type: 'product_view' };
    
    if (startDate || endDate) {
      matchQuery.timestamp = {};
      if (startDate) matchQuery.timestamp.$gte = new Date(startDate);
      if (endDate) matchQuery.timestamp.$lte = new Date(endDate);
    }

    const [
      topViewedProducts,
      viewsByPosition
    ] = await Promise.all([
      // Most viewed products
      Analytics.aggregate([
        { $match: matchQuery },
        { $group: {
          _id: '$data.productId',
          views: { $sum: 1 },
          avgPosition: { $avg: '$data.position' }
        }},
        { $sort: { views: -1 } },
        { $limit: parseInt(limit) }
      ]),

      // Views by search result position
      Analytics.aggregate([
        { $match: matchQuery },
        { $group: {
          _id: '$data.position',
          views: { $sum: 1 }
        }},
        { $sort: { '_id': 1 } }
      ])
    ]);

    res.json({
      success: true,
      data: {
        topViewedProducts,
        viewsByPosition
      }
    });
  } catch (error) {
    console.error('Error fetching product analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch product analytics',
      details: error.message
    });
  }
});

// ============ COMPREHENSIVE ANALYTICS ENDPOINTS ============

// Get dashboard overview stats
router.get('/dashboard-stats', auth, requireAdmin, async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }

    const [
      totalUsers,
      activeUsers,
      totalOrders,
      totalRevenue,
      totalProducts,
      pageViews,
      conversionRate,
      avgOrderValue
    ] = await Promise.all([
      User.countDocuments({ isActive: true }),
      User.countDocuments({ 
        lastLogin: { $gte: startDate },
        isActive: true 
      }),
      Order.countDocuments({ 
        createdAt: { $gte: startDate, $lte: endDate } 
      }),
      Order.aggregate([
        { 
          $match: { 
            createdAt: { $gte: startDate, $lte: endDate },
            status: { $nin: ['Cancelled', 'Refunded'] }
          } 
        },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]).then(result => result[0]?.total || 0),
      Product.countDocuments({ status: 'active' }),
      Analytics.countDocuments({
        type: 'page_view',
        timestamp: { $gte: startDate, $lte: endDate }
      }),
      Analytics.getConversionRates(startDate, endDate),
      Order.aggregate([
        { 
          $match: { 
            createdAt: { $gte: startDate, $lte: endDate },
            status: { $nin: ['Cancelled', 'Refunded'] }
          } 
        },
        { $group: { _id: null, avg: { $avg: '$totalAmount' } } }
      ]).then(result => result[0]?.avg || 0)
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          totalUsers,
          activeUsers,
          totalOrders,
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          totalProducts,
          pageViews,
          conversionRate: parseFloat(conversionRate.conversionRate),
          avgOrderValue: Math.round(avgOrderValue * 100) / 100
        },
        period,
        dateRange: { startDate, endDate }
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard statistics',
      details: error.message
    });
  }
});

// Get sales analytics
router.get('/sales', auth, requireAdmin, async (req, res) => {
  try {
    const { 
      startDate, 
      endDate, 
      groupBy = 'day',
      status = 'all'
    } = req.query;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const matchQuery = {
      createdAt: { $gte: start, $lte: end }
    };

    if (status !== 'all') {
      matchQuery.status = status;
    } else {
      matchQuery.status = { $nin: ['Cancelled', 'Refunded'] };
    }

    // Group format based on period
    const groupFormats = {
      hour: {
        $dateToString: { format: '%Y-%m-%d %H:00', date: '$createdAt' }
      },
      day: {
        $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
      },
      week: {
        $dateToString: { format: '%Y-W%U', date: '$createdAt' }
      },
      month: {
        $dateToString: { format: '%Y-%m', date: '$createdAt' }
      }
    };

    const [salesOverTime, topProducts, salesByStatus] = await Promise.all([
      // Sales over time
      Order.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: groupFormats[groupBy],
            totalSales: { $sum: '$totalAmount' },
            orderCount: { $sum: 1 },
            avgOrderValue: { $avg: '$totalAmount' }
          }
        },
        { $sort: { _id: 1 } }
      ]),

      // Top selling products
      Order.aggregate([
        { $match: matchQuery },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.product',
            totalQuantity: { $sum: '$items.quantity' },
            totalRevenue: { $sum: '$items.totalPrice' },
            orderCount: { $sum: 1 }
          }
        },
        {
          $lookup: {
            from: 'products',
            localField: '_id',
            foreignField: '_id',
            as: 'product'
          }
        },
        { $unwind: '$product' },
        {
          $project: {
            productId: '$_id',
            productTitle: '$product.title',
            productImage: { $arrayElemAt: ['$product.images', 0] },
            totalQuantity: 1,
            totalRevenue: { $round: ['$totalRevenue', 2] },
            orderCount: 1
          }
        },
        { $sort: { totalRevenue: -1 } },
        { $limit: 10 }
      ]),

      // Sales by status
      Order.aggregate([
        { 
          $match: { 
            createdAt: { $gte: start, $lte: end } 
          } 
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalValue: { $sum: '$totalAmount' }
          }
        },
        { $sort: { count: -1 } }
      ])
    ]);

    res.json({
      success: true,
      data: {
        salesOverTime,
        topProducts,
        salesByStatus,
        dateRange: { startDate: start, endDate: end },
        groupBy
      }
    });
  } catch (error) {
    console.error('Error fetching sales analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sales analytics',
      details: error.message
    });
  }
});

// Get user analytics
router.get('/users', auth, requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const groupFormats = {
      day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
      week: { $dateToString: { format: '%Y-W%U', date: '$createdAt' } },
      month: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }
    };

    const [
      userRegistrations,
      userActivity,
      userSegments,
      topCustomers
    ] = await Promise.all([
      // User registrations over time
      User.aggregate([
        {
          $match: {
            createdAt: { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: groupFormats[groupBy],
            newUsers: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),

      // User activity (based on last login)
      User.aggregate([
        {
          $match: {
            lastLogin: { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: groupFormats[groupBy],
            activeUsers: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),

      // User segments
      User.aggregate([
        {
          $group: {
            _id: '$role',
            count: { $sum: 1 },
            totalSpent: { $sum: '$totalSpent' },
            avgSpent: { $avg: '$totalSpent' }
          }
        }
      ]),

      // Top customers by spending
      User.aggregate([
        {
          $match: {
            totalSpent: { $gt: 0 }
          }
        },
        {
          $project: {
            name: { $ifNull: ['$name', '$email'] },
            email: 1,
            totalSpent: 1,
            loyaltyPoints: 1,
            lastLogin: 1
          }
        },
        { $sort: { totalSpent: -1 } },
        { $limit: 10 }
      ])
    ]);

    res.json({
      success: true,
      data: {
        userRegistrations,
        userActivity,
        userSegments,
        topCustomers,
        dateRange: { startDate: start, endDate: end }
      }
    });
  } catch (error) {
    console.error('Error fetching user analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user analytics',
      details: error.message
    });
  }
});

// Get product analytics
router.get('/products', auth, requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate, limit = 20 } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const [
      mostViewedProducts,
      bestSellingProducts,
      categoryPerformance,
      inventoryStatus
    ] = await Promise.all([
      // Most viewed products
      Analytics.getMostViewedProducts(parseInt(limit), start, end),

      // Best selling products
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: start, $lte: end },
            status: { $nin: ['Cancelled', 'Refunded'] }
          }
        },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.product',
            totalQuantity: { $sum: '$items.quantity' },
            totalRevenue: { $sum: '$items.totalPrice' },
            orderCount: { $sum: 1 }
          }
        },
        {
          $lookup: {
            from: 'products',
            localField: '_id',
            foreignField: '_id',
            as: 'product'
          }
        },
        { $unwind: '$product' },
        {
          $project: {
            productTitle: '$product.title',
            productImage: { $arrayElemAt: ['$product.images', 0] },
            category: '$product.category',
            brand: '$product.brand',
            totalQuantity: 1,
            totalRevenue: { $round: ['$totalRevenue', 2] },
            orderCount: 1
          }
        },
        { $sort: { totalQuantity: -1 } },
        { $limit: parseInt(limit) }
      ]),

      // Category performance
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: start, $lte: end },
            status: { $nin: ['Cancelled', 'Refunded'] }
          }
        },
        { $unwind: '$items' },
        {
          $lookup: {
            from: 'products',
            localField: 'items.product',
            foreignField: '_id',
            as: 'product'
          }
        },
        { $unwind: '$product' },
        {
          $group: {
            _id: '$product.category',
            totalSales: { $sum: '$items.totalPrice' },
            totalQuantity: { $sum: '$items.quantity' },
            orderCount: { $sum: 1 }
          }
        },
        { $sort: { totalSales: -1 } }
      ]),

      // Inventory status
      Product.aggregate([
        {
          $group: {
            _id: null,
            totalProducts: { $sum: 1 },
            activeProducts: {
              $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
            },
            lowStockProducts: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $lt: ['$inventory.quantity', '$inventory.lowStockThreshold'] },
                      { $eq: ['$inventory.trackInventory', true] }
                    ]
                  },
                  1,
                  0
                ]
              }
            },
            outOfStockProducts: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ['$inventory.quantity', 0] },
                      { $eq: ['$inventory.trackInventory', true] }
                    ]
                  },
                  1,
                  0
                ]
              }
            }
          }
        }
      ])
    ]);

    res.json({
      success: true,
      data: {
        mostViewedProducts,
        bestSellingProducts,
        categoryPerformance,
        inventoryStatus: inventoryStatus[0] || {
          totalProducts: 0,
          activeProducts: 0,
          lowStockProducts: 0,
          outOfStockProducts: 0
        },
        dateRange: { startDate: start, endDate: end }
      }
    });
  } catch (error) {
    console.error('Error fetching product analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch product analytics',
      details: error.message
    });
  }
});

// Get real-time analytics
router.get('/realtime', auth, requireAdmin, async (req, res) => {
  try {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const lastHour = new Date(now.getTime() - 60 * 60 * 1000);

    const [
      activeUsers,
      recentOrders,
      hourlyPageViews,
      liveStats
    ] = await Promise.all([
      // Active users in last hour
      Analytics.aggregate([
        {
          $match: {
            type: 'page_view',
            timestamp: { $gte: lastHour }
          }
        },
        {
          $group: {
            _id: '$userId',
            lastActivity: { $max: '$timestamp' }
          }
        },
        { $count: 'activeUsers' }
      ]).then(result => result[0]?.activeUsers || 0),

      // Recent orders (last 24 hours)
      Order.find({
        createdAt: { $gte: last24Hours }
      })
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(10)
      .select('orderId totalAmount status createdAt user'),

      // Hourly page views for last 24 hours
      Analytics.aggregate([
        {
          $match: {
            type: 'page_view',
            timestamp: { $gte: last24Hours }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d %H:00', date: '$timestamp' }
            },
            views: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),

      // Live statistics
      Promise.all([
        Order.countDocuments({ createdAt: { $gte: last24Hours } }),
        Analytics.countDocuments({ 
          type: 'page_view', 
          timestamp: { $gte: last24Hours } 
        }),
        Analytics.countDocuments({ 
          type: 'product_view', 
          timestamp: { $gte: last24Hours } 
        }),
        Order.aggregate([
          { 
            $match: { 
              createdAt: { $gte: last24Hours },
              status: { $nin: ['Cancelled', 'Refunded'] }
            } 
          },
          { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ]).then(result => result[0]?.total || 0)
      ]).then(([orders, pageViews, productViews, revenue]) => ({
        ordersLast24h: orders,
        pageViewsLast24h: pageViews,
        productViewsLast24h: productViews,
        revenueLast24h: Math.round(revenue * 100) / 100
      }))
    ]);

    res.json({
      success: true,
      data: {
        activeUsers,
        recentOrders,
        hourlyPageViews,
        liveStats,
        timestamp: now
      }
    });
  } catch (error) {
    console.error('Error fetching real-time analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch real-time analytics',
      details: error.message
    });
  }
});

// Get performance metrics
router.get('/performance', auth, requireAdmin, async (req, res) => {
  try {
    const { period = '24h' } = req.query;
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case '1h':
        startDate.setHours(endDate.getHours() - 1);
        break;
      case '24h':
        startDate.setDate(endDate.getDate() - 1);
        break;
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      default:
        startDate.setDate(endDate.getDate() - 1);
    }

    const [
      avgPageLoadTime,
      errorRate,
      apiResponseTimes,
      systemHealth
    ] = await Promise.all([
      // Average page load time
      Analytics.aggregate([
        {
          $match: {
            type: 'page_view',
            timestamp: { $gte: startDate, $lte: endDate },
            'data.duration': { $exists: true, $gt: 0 }
          }
        },
        {
          $group: {
            _id: null,
            avgLoadTime: { $avg: '$data.duration' },
            count: { $sum: 1 }
          }
        }
      ]).then(result => result[0] || { avgLoadTime: 0, count: 0 }),

      // Error rate calculation
      Analytics.aggregate([
        {
          $match: {
            type: { $in: ['payment_failed', 'checkout_error', 'api_error'] },
            timestamp: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 }
          }
        }
      ]),

      // API response times (mock data for now)
      Promise.resolve([
        { endpoint: '/api/products', avgResponseTime: 120, requestCount: 1500 },
        { endpoint: '/api/orders', avgResponseTime: 85, requestCount: 800 },
        { endpoint: '/api/users', avgResponseTime: 95, requestCount: 600 },
        { endpoint: '/api/analytics', avgResponseTime: 200, requestCount: 300 }
      ]),

      // System health metrics
      Promise.resolve({
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
        nodeVersion: process.version
      })
    ]);

    res.json({
      success: true,
      data: {
        avgPageLoadTime: Math.round(avgPageLoadTime.avgLoadTime * 100) / 100,
        pageViewCount: avgPageLoadTime.count,
        errorRate,
        apiResponseTimes,
        systemHealth: {
          uptime: Math.round(systemHealth.uptime),
          memoryUsage: {
            used: Math.round(systemHealth.memoryUsage.heapUsed / 1024 / 1024),
            total: Math.round(systemHealth.memoryUsage.heapTotal / 1024 / 1024)
          },
          nodeVersion: systemHealth.nodeVersion
        },
        period,
        dateRange: { startDate, endDate }
      }
    });
  } catch (error) {
    console.error('Error fetching performance metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch performance metrics',
      details: error.message
    });
  }
});

// Get advanced analytics insights
router.get('/insights', auth, requireAdmin, async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }

    const [
      conversionFunnel,
      userRetention,
      revenueGrowth,
      topPerformingPages,
      searchInsights
    ] = await Promise.all([
      // Conversion funnel analysis
      Analytics.getUserFunnel(startDate, endDate),

      // User retention analysis
      User.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
            },
            newUsers: { $sum: 1 },
            returningUsers: {
              $sum: {
                $cond: [
                  { $gt: ['$lastLogin', '$createdAt'] },
                  1,
                  0
                ]
              }
            }
          }
        },
        { $sort: { _id: 1 } }
      ]),

      // Revenue growth analysis
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
            status: { $nin: ['Cancelled', 'Refunded'] }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
            },
            revenue: { $sum: '$totalAmount' },
            orderCount: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),

      // Top performing pages
      Analytics.aggregate([
        {
          $match: {
            type: 'page_view',
            timestamp: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: '$data.pageUrl',
            views: { $sum: 1 },
            uniqueUsers: { $addToSet: '$userId' },
            avgDuration: { $avg: '$data.duration' }
          }
        },
        {
          $addFields: {
            uniqueUserCount: { $size: '$uniqueUsers' }
          }
        },
        {
          $project: {
            pageUrl: '$_id',
            views: 1,
            uniqueUserCount: 1,
            avgDuration: { $round: ['$avgDuration', 2] }
          }
        },
        { $sort: { views: -1 } },
        { $limit: 10 }
      ]),

      // Search insights
      Analytics.getSearchAnalytics(startDate, endDate)
    ]);

    res.json({
      success: true,
      data: {
        conversionFunnel,
        userRetention,
        revenueGrowth,
        topPerformingPages,
        searchInsights,
        period,
        dateRange: { startDate, endDate }
      }
    });
  } catch (error) {
    console.error('Error fetching analytics insights:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics insights',
      details: error.message
    });
  }
});

// Export analytics data
router.get('/export', auth, requireAdmin, async (req, res) => {
  try {
    const { 
      type, 
      startDate, 
      endDate, 
      format = 'json' 
    } = req.query;

    if (!type) {
      return res.status(400).json({
        success: false,
        error: 'Export type is required (sales, users, products, analytics)'
      });
    }

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    let data = [];
    let filename = '';

    switch (type) {
      case 'sales':
        data = await Order.find({
          createdAt: { $gte: start, $lte: end }
        })
        .populate('user', 'name email')
        .select('orderId user totalAmount status createdAt items shippingAddress payment')
        .lean();
        filename = `sales_report_${start.toISOString().split('T')[0]}_to_${end.toISOString().split('T')[0]}`;
        break;

      case 'users':
        data = await User.find({
          createdAt: { $gte: start, $lte: end }
        })
        .select('name email role totalSpent loyaltyPoints createdAt lastLogin isActive')
        .lean();
        filename = `users_report_${start.toISOString().split('T')[0]}_to_${end.toISOString().split('T')[0]}`;
        break;

      case 'products':
        data = await Product.find()
        .select('title category brand price offerPrice rating reviewCount salesCount inventory status createdAt')
        .lean();
        filename = `products_report_${new Date().toISOString().split('T')[0]}`;
        break;

      case 'analytics':
        data = await Analytics.find({
          timestamp: { $gte: start, $lte: end }
        })
        .select('type userId sessionId data timestamp userAgent')
        .lean();
        filename = `analytics_report_${start.toISOString().split('T')[0]}_to_${end.toISOString().split('T')[0]}`;
        break;

      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid export type'
        });
    }

    if (format === 'csv') {
      // Convert to CSV format
      if (data.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'No data found for the specified criteria'
        });
      }

      const headers = Object.keys(data[0]);
      const csvContent = [
        headers.join(','),
        ...data.map(row => 
          headers.map(header => {
            const value = row[header];
            if (typeof value === 'object' && value !== null) {
              return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
            }
            return `"${String(value || '').replace(/"/g, '""')}"`;
          }).join(',')
        )
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      res.send(csvContent);
    } else {
      // JSON format
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
      res.json({
        success: true,
        data,
        metadata: {
          type,
          dateRange: { startDate: start, endDate: end },
          recordCount: data.length,
          exportedAt: new Date()
        }
      });
    }
  } catch (error) {
    console.error('Error exporting analytics data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export analytics data',
      details: error.message
    });
  }
});

export default router;
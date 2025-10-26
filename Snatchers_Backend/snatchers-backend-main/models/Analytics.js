import mongoose from 'mongoose';

const analyticsSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      'page_view', 
      'product_view', 
      'search', 
      'purchase', 
      'cart_add', 
      'cart_remove',
      'wishlist_add',
      'wishlist_remove',
      'user_registration',
      'user_login',
      'checkout_start',
      'checkout_complete',
      'payment_success',
      'payment_failed',
      'review_submit',
      'filter_apply',
      'category_browse'
    ],
    required: true
  },
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  sessionId: {
    type: String,
    required: true
  },
  data: {
    // Flexible schema for different event types
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    categoryId: String,
    searchQuery: String,
    searchResults: Number,
    filterCriteria: mongoose.Schema.Types.Mixed,
    pageUrl: String,
    referrerUrl: String,
    purchaseAmount: Number,
    paymentMethod: String,
    deviceType: String,
    browserName: String,
    osName: String,
    country: String,
    city: String,
    duration: Number, // Time spent on page/action in seconds
    customData: mongoose.Schema.Types.Mixed // For additional event-specific data
  },
  timestamp: { 
    type: Date, 
    default: Date.now 
  },
  userAgent: String,
  ipAddress: String,
  referrer: String,
  deviceInfo: {
    type: String,
    isMobile: Boolean,
    isTablet: Boolean,
    isDesktop: Boolean,
    browser: String,
    os: String,
    screenResolution: String
  }
}, { 
  timestamps: true 
});

// Indexes for optimized analytics queries
analyticsSchema.index({ type: 1, timestamp: -1 });
analyticsSchema.index({ userId: 1, timestamp: -1 });
analyticsSchema.index({ sessionId: 1 });
analyticsSchema.index({ 'data.productId': 1, type: 1 });
analyticsSchema.index({ 'data.categoryId': 1, type: 1 });
analyticsSchema.index({ timestamp: -1 });

// Compound indexes for common analytics queries
analyticsSchema.index({ type: 1, userId: 1, timestamp: -1 });
analyticsSchema.index({ type: 1, 'data.productId': 1, timestamp: -1 });

// TTL index to automatically delete old analytics data (keep for 2 years)
analyticsSchema.index({ timestamp: 1 }, { expireAfterSeconds: 63072000 }); // 2 years

// Static methods for analytics aggregation

// Get page views for a specific time period
analyticsSchema.statics.getPageViews = async function(startDate, endDate, groupBy = 'day') {
  const groupFormat = {
    day: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
    hour: { $dateToString: { format: '%Y-%m-%d %H:00', date: '$timestamp' } },
    month: { $dateToString: { format: '%Y-%m', date: '$timestamp' } }
  };

  return await this.aggregate([
    {
      $match: {
        type: 'page_view',
        timestamp: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: groupFormat[groupBy],
        count: { $sum: 1 },
        uniqueUsers: { $addToSet: '$userId' }
      }
    },
    {
      $addFields: {
        uniqueUserCount: { $size: '$uniqueUsers' }
      }
    },
    {
      $project: {
        uniqueUsers: 0
      }
    },
    { $sort: { _id: 1 } }
  ]);
};

// Get most viewed products
analyticsSchema.statics.getMostViewedProducts = async function(limit = 10, startDate, endDate) {
  const matchConditions = {
    type: 'product_view',
    'data.productId': { $exists: true }
  };

  if (startDate && endDate) {
    matchConditions.timestamp = { $gte: startDate, $lte: endDate };
  }

  return await this.aggregate([
    { $match: matchConditions },
    {
      $group: {
        _id: '$data.productId',
        viewCount: { $sum: 1 },
        uniqueViewers: { $addToSet: '$userId' }
      }
    },
    {
      $addFields: {
        uniqueViewerCount: { $size: '$uniqueViewers' }
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
        viewCount: 1,
        uniqueViewerCount: 1
      }
    },
    { $sort: { viewCount: -1 } },
    { $limit: limit }
  ]);
};

// Get search analytics
analyticsSchema.statics.getSearchAnalytics = async function(startDate, endDate) {
  return await this.aggregate([
    {
      $match: {
        type: 'search',
        timestamp: { $gte: startDate, $lte: endDate },
        'data.searchQuery': { $exists: true, $ne: '' }
      }
    },
    {
      $group: {
        _id: '$data.searchQuery',
        searchCount: { $sum: 1 },
        avgResults: { $avg: '$data.searchResults' },
        uniqueUsers: { $addToSet: '$userId' }
      }
    },
    {
      $addFields: {
        uniqueUserCount: { $size: '$uniqueUsers' }
      }
    },
    {
      $project: {
        searchQuery: '$_id',
        searchCount: 1,
        avgResults: { $round: ['$avgResults', 2] },
        uniqueUserCount: 1
      }
    },
    { $sort: { searchCount: -1 } },
    { $limit: 50 }
  ]);
};

// Get user behavior funnel
analyticsSchema.statics.getUserFunnel = async function(startDate, endDate) {
  const funnelSteps = [
    'page_view',
    'product_view',
    'cart_add',
    'checkout_start',
    'checkout_complete'
  ];

  const results = {};
  
  for (const step of funnelSteps) {
    const count = await this.countDocuments({
      type: step,
      timestamp: { $gte: startDate, $lte: endDate }
    });
    results[step] = count;
  }
  
  return results;
};

// Get conversion rates
analyticsSchema.statics.getConversionRates = async function(startDate, endDate) {
  const [views, purchases] = await Promise.all([
    this.countDocuments({
      type: 'product_view',
      timestamp: { $gte: startDate, $lte: endDate }
    }),
    this.countDocuments({
      type: 'purchase',
      timestamp: { $gte: startDate, $lte: endDate }
    })
  ]);

  return {
    productViews: views,
    purchases: purchases,
    conversionRate: views > 0 ? ((purchases / views) * 100).toFixed(2) : 0
  };
};

const Analytics = mongoose.model('Analytics', analyticsSchema);

export default Analytics;
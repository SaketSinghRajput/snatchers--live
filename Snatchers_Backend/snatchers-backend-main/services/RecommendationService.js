import Product from '../models/Product.js';
import User from '../models/User.js';
import Analytics from '../models/Analytics.js';
import Order from '../models/Order.js';

class RecommendationService {
  /**
   * Get personalized recommendations for a user
   * @param {string} userId - User ID
   * @param {number} limit - Number of recommendations to return
   * @returns {Array} Array of recommended products
   */
  async getPersonalizedRecommendations(userId, limit = 10) {
    try {
      const user = await User.findById(userId).populate('recentlyViewed.product');
      
      if (!user) {
        return await this.getFallbackRecommendations(limit);
      }

      // Get user's preferences and behavior
      const userPreferences = user.preferences || {};
      const recentlyViewed = user.recentlyViewed || [];
      
      // Get user's purchase history
      const purchaseHistory = await Order.find({ 
        user: userId, 
        status: 'delivered' 
      }).populate('items.product');

      // Get user's analytics data for behavior analysis
      const userAnalytics = await Analytics.find({
        userId: userId,
        type: { $in: ['product_view', 'cart_add', 'purchase'] }
      }).sort({ timestamp: -1 }).limit(100);

      // Calculate recommendation scores
      const recommendations = await this._calculateRecommendationScores(
        user,
        recentlyViewed,
        purchaseHistory,
        userAnalytics,
        limit
      );

      return recommendations;
    } catch (error) {
      console.error('Error getting personalized recommendations:', error);
      return await this.getFallbackRecommendations(limit);
    }
  }

  /**
   * Get product-based recommendations (similar products)
   * @param {string} productId - Product ID
   * @param {number} limit - Number of recommendations to return
   * @returns {Array} Array of similar products
   */
  async getProductRecommendations(productId, limit = 6) {
    try {
      const product = await Product.findById(productId);
      
      if (!product) {
        return [];
      }

      // Find similar products based on category, brand, and price range
      const priceRange = {
        min: product.price * 0.7,
        max: product.price * 1.3
      };

      const similarProducts = await Product.find({
        _id: { $ne: productId },
        status: 'active',
        $or: [
          { category: product.category },
          { brand: product.brand },
          { tags: { $in: product.tags || [] } }
        ],
        price: { $gte: priceRange.min, $lte: priceRange.max }
      })
      .sort({ 
        averageRating: -1, 
        salesCount: -1,
        viewCount: -1 
      })
      .limit(limit)
      .populate('vendor', 'name vendorProfile.businessName');

      return similarProducts;
    } catch (error) {
      console.error('Error getting product recommendations:', error);
      return [];
    }
  }

  /**
   * Get trending products based on recent activity
   * @param {number} limit - Number of trending products to return
   * @param {number} days - Number of days to look back for trending data
   * @returns {Array} Array of trending products
   */
  async getTrendingProducts(limit = 10, days = 7) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get products with high recent activity
      const trendingData = await Analytics.aggregate([
        {
          $match: {
            type: { $in: ['product_view', 'cart_add', 'purchase'] },
            timestamp: { $gte: startDate },
            'data.productId': { $exists: true }
          }
        },
        {
          $group: {
            _id: '$data.productId',
            viewCount: {
              $sum: { $cond: [{ $eq: ['$type', 'product_view'] }, 1, 0] }
            },
            cartAddCount: {
              $sum: { $cond: [{ $eq: ['$type', 'cart_add'] }, 1, 0] }
            },
            purchaseCount: {
              $sum: { $cond: [{ $eq: ['$type', 'purchase'] }, 1, 0] }
            }
          }
        },
        {
          $addFields: {
            trendingScore: {
              $add: [
                '$viewCount',
                { $multiply: ['$cartAddCount', 3] },
                { $multiply: ['$purchaseCount', 5] }
              ]
            }
          }
        },
        { $sort: { trendingScore: -1 } },
        { $limit: limit * 2 } // Get more to filter out inactive products
      ]);

      const productIds = trendingData.map(item => item._id);
      
      const trendingProducts = await Product.find({
        _id: { $in: productIds },
        status: 'active'
      })
      .populate('vendor', 'name vendorProfile.businessName')
      .limit(limit);

      // Sort by trending score
      const sortedProducts = trendingProducts.sort((a, b) => {
        const aData = trendingData.find(item => item._id.equals(a._id));
        const bData = trendingData.find(item => item._id.equals(b._id));
        return (bData?.trendingScore || 0) - (aData?.trendingScore || 0);
      });

      return sortedProducts;
    } catch (error) {
      console.error('Error getting trending products:', error);
      return await this.getFallbackRecommendations(limit);
    }
  }

  /**
   * Get popular products in a specific category
   * @param {string} category - Product category
   * @param {number} limit - Number of products to return
   * @returns {Array} Array of popular products in category
   */
  async getPopularInCategory(category, limit = 8) {
    try {
      const popularProducts = await Product.find({
        category: category,
        status: 'active'
      })
      .sort({ 
        salesCount: -1, 
        averageRating: -1, 
        viewCount: -1 
      })
      .limit(limit)
      .populate('vendor', 'name vendorProfile.businessName');

      return popularProducts;
    } catch (error) {
      console.error('Error getting popular products in category:', error);
      return [];
    }
  }

  /**
   * Track user behavior for recommendation engine
   * @param {string} userId - User ID
   * @param {string} action - Action type
   * @param {Object} data - Action data
   */
  async trackUserBehavior(userId, action, data) {
    try {
      const analyticsData = {
        type: action,
        userId: userId,
        sessionId: data.sessionId || 'unknown',
        data: data,
        timestamp: new Date(),
        userAgent: data.userAgent,
        ipAddress: data.ipAddress
      };

      await Analytics.create(analyticsData);

      // Update product view count if it's a product view
      if (action === 'product_view' && data.productId) {
        await Product.findByIdAndUpdate(
          data.productId,
          { $inc: { viewCount: 1 } }
        );

        // Add to user's recently viewed
        const user = await User.findById(userId);
        if (user) {
          await user.addToRecentlyViewed(data.productId);
        }
      }
    } catch (error) {
      console.error('Error tracking user behavior:', error);
    }
  }

  /**
   * Get fallback recommendations when personalized recommendations fail
   * @param {number} limit - Number of recommendations to return
   * @returns {Array} Array of fallback products
   */
  async getFallbackRecommendations(limit = 10) {
    try {
      // Return best-selling and highly-rated products
      const fallbackProducts = await Product.find({
        status: 'active'
      })
      .sort({ 
        salesCount: -1, 
        averageRating: -1, 
        viewCount: -1 
      })
      .limit(limit)
      .populate('vendor', 'name vendorProfile.businessName');

      return fallbackProducts;
    } catch (error) {
      console.error('Error getting fallback recommendations:', error);
      return [];
    }
  }

  /**
   * Calculate recommendation scores based on user data
   * @private
   */
  async _calculateRecommendationScores(user, recentlyViewed, purchaseHistory, analytics, limit) {
    const scores = new Map();
    
    // Get all potential products
    const allProducts = await Product.find({ status: 'active' })
      .populate('vendor', 'name vendorProfile.businessName');

    // Score based on user preferences
    for (const product of allProducts) {
      let score = 0;

      // Category preference
      if (user.preferences.categories?.includes(product.category)) {
        score += 10;
      }

      // Brand preference
      if (user.preferences.brands?.includes(product.brand)) {
        score += 8;
      }

      // Price range preference
      const userPriceRange = user.preferences.priceRange || { min: 0, max: 100000 };
      if (product.price >= userPriceRange.min && product.price <= userPriceRange.max) {
        score += 5;
      }

      // Recently viewed similarity
      for (const viewed of recentlyViewed) {
        if (viewed.product && viewed.product._id) {
          if (viewed.product.category === product.category) score += 3;
          if (viewed.product.brand === product.brand) score += 2;
          if (viewed.product.tags?.some(tag => product.tags?.includes(tag))) score += 1;
        }
      }

      // Purchase history similarity
      for (const order of purchaseHistory) {
        for (const item of order.items) {
          if (item.product) {
            if (item.product.category === product.category) score += 4;
            if (item.product.brand === product.brand) score += 3;
          }
        }
      }

      // Product quality metrics
      score += product.averageRating || 0;
      score += Math.log(product.salesCount + 1) * 0.5;
      score += Math.log(product.viewCount + 1) * 0.2;

      // Avoid recommending products user already owns
      const alreadyOwned = purchaseHistory.some(order =>
        order.items.some(item => item.product && item.product._id.equals(product._id))
      );
      
      if (!alreadyOwned && score > 0) {
        scores.set(product._id.toString(), { product, score });
      }
    }

    // Sort by score and return top recommendations
    const sortedRecommendations = Array.from(scores.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.product);

    return sortedRecommendations;
  }

  /**
   * Get collaborative filtering recommendations
   * @param {string} userId - User ID
   * @param {number} limit - Number of recommendations to return
   * @returns {Array} Array of recommended products
   */
  async getCollaborativeRecommendations(userId, limit = 10) {
    try {
      // Find users with similar behavior
      const userAnalytics = await Analytics.find({
        userId: userId,
        type: { $in: ['product_view', 'purchase'] }
      }).distinct('data.productId');

      if (userAnalytics.length === 0) {
        return await this.getFallbackRecommendations(limit);
      }

      // Find other users who viewed/bought similar products
      const similarUsers = await Analytics.aggregate([
        {
          $match: {
            type: { $in: ['product_view', 'purchase'] },
            'data.productId': { $in: userAnalytics },
            userId: { $ne: userId }
          }
        },
        {
          $group: {
            _id: '$userId',
            commonProducts: { $addToSet: '$data.productId' },
            interactions: { $sum: 1 }
          }
        },
        {
          $addFields: {
            similarity: { $size: '$commonProducts' }
          }
        },
        { $sort: { similarity: -1, interactions: -1 } },
        { $limit: 20 }
      ]);

      if (similarUsers.length === 0) {
        return await this.getFallbackRecommendations(limit);
      }

      const similarUserIds = similarUsers.map(user => user._id);

      // Get products that similar users liked but current user hasn't interacted with
      const recommendations = await Analytics.aggregate([
        {
          $match: {
            userId: { $in: similarUserIds },
            type: { $in: ['product_view', 'purchase'] },
            'data.productId': { $nin: userAnalytics }
          }
        },
        {
          $group: {
            _id: '$data.productId',
            score: { $sum: 1 },
            users: { $addToSet: '$userId' }
          }
        },
        { $sort: { score: -1 } },
        { $limit: limit * 2 }
      ]);

      const productIds = recommendations.map(rec => rec._id);
      
      const products = await Product.find({
        _id: { $in: productIds },
        status: 'active'
      })
      .populate('vendor', 'name vendorProfile.businessName')
      .limit(limit);

      return products;
    } catch (error) {
      console.error('Error getting collaborative recommendations:', error);
      return await this.getFallbackRecommendations(limit);
    }
  }
}

export default RecommendationService;
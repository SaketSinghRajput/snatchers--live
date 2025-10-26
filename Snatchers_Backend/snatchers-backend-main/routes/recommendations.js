import express from 'express';
import RecommendationService from '../services/RecommendationService.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const recommendationService = new RecommendationService();

/**
 * Get personalized recommendations for authenticated user
 */
router.get('/personalized', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const limit = parseInt(req.query.limit) || 10;
    
    const recommendations = await recommendationService.getPersonalizedRecommendations(userId, limit);
    
    res.json({
      success: true,
      data: recommendations,
      count: recommendations.length
    });
  } catch (error) {
    console.error('Error getting personalized recommendations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get personalized recommendations'
    });
  }
});

/**
 * Get product-based recommendations (similar products)
 */
router.get('/product/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const limit = parseInt(req.query.limit) || 6;
    
    const recommendations = await recommendationService.getProductRecommendations(productId, limit);
    
    res.json({
      success: true,
      data: recommendations,
      count: recommendations.length
    });
  } catch (error) {
    console.error('Error getting product recommendations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get product recommendations'
    });
  }
});

/**
 * Get trending products
 */
router.get('/trending', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const days = parseInt(req.query.days) || 7;
    
    const trendingProducts = await recommendationService.getTrendingProducts(limit, days);
    
    res.json({
      success: true,
      data: trendingProducts,
      count: trendingProducts.length
    });
  } catch (error) {
    console.error('Error getting trending products:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get trending products'
    });
  }
});

/**
 * Get popular products in category
 */
router.get('/popular/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const limit = parseInt(req.query.limit) || 8;
    
    const popularProducts = await recommendationService.getPopularInCategory(category, limit);
    
    res.json({
      success: true,
      data: popularProducts,
      count: popularProducts.length
    });
  } catch (error) {
    console.error('Error getting popular products in category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get popular products in category'
    });
  }
});

/**
 * Get collaborative filtering recommendations
 */
router.get('/collaborative', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const limit = parseInt(req.query.limit) || 10;
    
    const recommendations = await recommendationService.getCollaborativeRecommendations(userId, limit);
    
    res.json({
      success: true,
      data: recommendations,
      count: recommendations.length
    });
  } catch (error) {
    console.error('Error getting collaborative recommendations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get collaborative recommendations'
    });
  }
});

/**
 * Track user behavior for recommendations
 */
router.post('/track', async (req, res) => {
  try {
    const { userId, action, data } = req.body;
    
    if (!userId || !action || !data) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: userId, action, data'
      });
    }
    
    await recommendationService.trackUserBehavior(userId, action, {
      ...data,
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip
    });
    
    res.json({
      success: true,
      message: 'User behavior tracked successfully'
    });
  } catch (error) {
    console.error('Error tracking user behavior:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track user behavior'
    });
  }
});

/**
 * Get fallback recommendations (for non-authenticated users)
 */
router.get('/fallback', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    const recommendations = await recommendationService.getFallbackRecommendations(limit);
    
    res.json({
      success: true,
      data: recommendations,
      count: recommendations.length
    });
  } catch (error) {
    console.error('Error getting fallback recommendations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get fallback recommendations'
    });
  }
});

/**
 * Batch track multiple user actions
 */
router.post('/batch-track', async (req, res) => {
  try {
    const { userId, actions } = req.body;
    
    if (!userId || !actions || !Array.isArray(actions)) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: userId, actions (array)'
      });
    }
    
    // Track each action
    for (const action of actions) {
      if (action.action && action.data) {
        await recommendationService.trackUserBehavior(userId, action.action, {
          ...action.data,
          userAgent: req.get('User-Agent'),
          ipAddress: req.ip
        });
      }
    }
    
    res.json({
      success: true,
      message: `${actions.length} actions tracked successfully`
    });
  } catch (error) {
    console.error('Error batch tracking user behavior:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to batch track user behavior'
    });
  }
});

export default router;
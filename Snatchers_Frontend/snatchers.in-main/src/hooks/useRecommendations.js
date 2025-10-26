import { useState, useEffect, useCallback } from 'react';
import api from '../api';

/**
 * Custom hook for managing product recommendations
 * @param {Object} options - Configuration options
 * @param {string} options.type - Type of recommendations (personalized, product, trending, popular, collaborative, fallback)
 * @param {string} options.productId - Product ID for product-based recommendations
 * @param {string} options.category - Category for popular recommendations
 * @param {number} options.limit - Number of recommendations to fetch
 * @param {string} options.userId - User ID for personalized recommendations
 * @param {boolean} options.autoFetch - Whether to automatically fetch on mount
 * @param {number} options.days - Number of days for trending recommendations
 * @returns {Object} Hook state and methods
 */
const useRecommendations = ({
  type = 'fallback',
  productId = null,
  category = null,
  limit = 10,
  userId = null,
  autoFetch = true,
  days = 7
} = {}) => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  /**
   * Fetch recommendations from API
   */
  const fetchRecommendations = useCallback(async (options = {}) => {
    try {
      setLoading(true);
      setError(null);

      const fetchType = options.type || type;
      const fetchLimit = options.limit || limit;
      
      let endpoint = '';
      let params = { limit: fetchLimit };

      switch (fetchType) {
        case 'personalized':
          endpoint = '/api/recommendations/personalized';
          break;
        case 'product':
          if (!productId && !options.productId) {
            throw new Error('Product ID is required for product recommendations');
          }
          endpoint = `/api/recommendations/product/${options.productId || productId}`;
          break;
        case 'trending':
          endpoint = '/api/recommendations/trending';
          params.days = options.days || days;
          break;
        case 'popular':
          if (!category && !options.category) {
            throw new Error('Category is required for popular recommendations');
          }
          endpoint = `/api/recommendations/popular/${encodeURIComponent(options.category || category)}`;
          break;
        case 'collaborative':
          endpoint = '/api/recommendations/collaborative';
          break;
        case 'fallback':
        default:
          endpoint = '/api/recommendations/fallback';
          break;
      }

      const response = await api.get(endpoint, { params });
      
      if (response.data.success) {
        const newRecommendations = response.data.data || [];
        setRecommendations(prev => options.append ? [...prev, ...newRecommendations] : newRecommendations);
        setHasMore(newRecommendations.length === fetchLimit);
        return newRecommendations;
      } else {
        throw new Error(response.data.message || 'Failed to fetch recommendations');
      }
    } catch (err) {
      console.error('Error fetching recommendations:', err);
      setError(err.message);
      
      // Fallback to general recommendations if specific type fails and it's not already fallback
      if (fetchType !== 'fallback' && !options.noFallback) {
        try {
          const fallbackResponse = await api.get('/api/recommendations/fallback', { 
            params: { limit: fetchLimit } 
          });
          if (fallbackResponse.data.success) {
            const fallbackRecommendations = fallbackResponse.data.data || [];
            setRecommendations(prev => options.append ? [...prev, ...fallbackRecommendations] : fallbackRecommendations);
            setError(null);
            return fallbackRecommendations;
          }
        } catch (fallbackErr) {
          console.error('Fallback recommendations also failed:', fallbackErr);
        }
      }
      
      return [];
    } finally {
      setLoading(false);
    }
  }, [type, productId, category, limit, days]);

  /**
   * Load more recommendations (for pagination)
   */
  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    
    await fetchRecommendations({ 
      append: true, 
      limit: limit 
    });
  }, [fetchRecommendations, hasMore, loading, limit]);

  /**
   * Refresh recommendations
   */
  const refresh = useCallback(async () => {
    await fetchRecommendations();
  }, [fetchRecommendations]);

  /**
   * Track user behavior for recommendation engine
   */
  const trackBehavior = useCallback(async (action, data) => {
    try {
      await api.post('/api/recommendations/track', {
        userId: userId || 'anonymous',
        action,
        data: {
          ...data,
          sessionId: sessionStorage.getItem('sessionId') || 'unknown',
          timestamp: new Date().toISOString()
        }
      });
    } catch (err) {
      console.error('Error tracking behavior:', err);
    }
  }, [userId]);

  /**
   * Get recommendations for a specific product
   */
  const getProductRecommendations = useCallback(async (targetProductId, options = {}) => {
    return await fetchRecommendations({
      type: 'product',
      productId: targetProductId,
      ...options
    });
  }, [fetchRecommendations]);

  /**
   * Get personalized recommendations for user
   */
  const getPersonalizedRecommendations = useCallback(async (options = {}) => {
    return await fetchRecommendations({
      type: 'personalized',
      ...options
    });
  }, [fetchRecommendations]);

  /**
   * Get trending products
   */
  const getTrendingProducts = useCallback(async (options = {}) => {
    return await fetchRecommendations({
      type: 'trending',
      ...options
    });
  }, [fetchRecommendations]);

  /**
   * Get popular products in category
   */
  const getPopularInCategory = useCallback(async (targetCategory, options = {}) => {
    return await fetchRecommendations({
      type: 'popular',
      category: targetCategory,
      ...options
    });
  }, [fetchRecommendations]);

  /**
   * Get collaborative filtering recommendations
   */
  const getCollaborativeRecommendations = useCallback(async (options = {}) => {
    return await fetchRecommendations({
      type: 'collaborative',
      ...options
    });
  }, [fetchRecommendations]);

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (autoFetch) {
      fetchRecommendations();
    }
  }, [autoFetch, fetchRecommendations]);

  return {
    // State
    recommendations,
    loading,
    error,
    hasMore,
    
    // Methods
    fetchRecommendations,
    loadMore,
    refresh,
    trackBehavior,
    
    // Specific recommendation getters
    getProductRecommendations,
    getPersonalizedRecommendations,
    getTrendingProducts,
    getPopularInCategory,
    getCollaborativeRecommendations
  };
};

export default useRecommendations;
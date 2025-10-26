import api from '../api';

/**
 * Utility functions for tracking user behavior for personalization
 */

// Track product view
export const trackProductView = async (productId, userId = null) => {
  try {
    // For authenticated users, track via API
    if (userId) {
      await Promise.all([
        // Track for analytics
        api.post('/api/recommendations/track', {
          userId,
          action: 'product_view',
          data: {
            productId,
            timestamp: new Date().toISOString(),
            sessionId: getSessionId()
          }
        }),
        // Add to recently viewed
        api.post('/api/user/recently-viewed', { productId })
      ]);
    } else {
      // For guest users, store in localStorage
      trackProductViewLocally(productId);
    }
  } catch (error) {
    console.error('Error tracking product view:', error);
    // Fallback to localStorage if API fails
    trackProductViewLocally(productId);
  }
};

// Track product view locally (for guest users or API fallback)
const trackProductViewLocally = (productId) => {
  try {
    const recentlyViewed = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
    
    // Remove if already exists
    const filtered = recentlyViewed.filter(item => item.productId !== productId);
    
    // Add to beginning
    filtered.unshift({
      productId,
      viewedAt: new Date().toISOString()
    });
    
    // Keep only last 20 items
    const limited = filtered.slice(0, 20);
    
    localStorage.setItem('recentlyViewed', JSON.stringify(limited));
  } catch (error) {
    console.error('Error tracking product view locally:', error);
  }
};

// Track cart addition
export const trackCartAdd = async (productId, userId = null, quantity = 1) => {
  try {
    if (userId) {
      await api.post('/api/recommendations/track', {
        userId,
        action: 'cart_add',
        data: {
          productId,
          quantity,
          timestamp: new Date().toISOString(),
          sessionId: getSessionId()
        }
      });
    }
  } catch (error) {
    console.error('Error tracking cart add:', error);
  }
};

// Track purchase
export const trackPurchase = async (orderData, userId = null) => {
  try {
    if (userId && orderData.items) {
      // Track each product purchase
      for (const item of orderData.items) {
        await api.post('/api/recommendations/track', {
          userId,
          action: 'purchase',
          data: {
            productId: item.product,
            quantity: item.quantity,
            price: item.price,
            orderId: orderData._id,
            timestamp: new Date().toISOString(),
            sessionId: getSessionId()
          }
        });
      }
    }
  } catch (error) {
    console.error('Error tracking purchase:', error);
  }
};

// Track search
export const trackSearch = async (query, results = [], userId = null) => {
  try {
    if (userId) {
      await api.post('/api/recommendations/track', {
        userId,
        action: 'search',
        data: {
          query,
          resultCount: results.length,
          resultIds: results.slice(0, 10).map(p => p._id), // First 10 results
          timestamp: new Date().toISOString(),
          sessionId: getSessionId()
        }
      });
    }
  } catch (error) {
    console.error('Error tracking search:', error);
  }
};

// Get or create session ID
const getSessionId = () => {
  let sessionId = sessionStorage.getItem('sessionId');
  if (!sessionId) {
    sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    sessionStorage.setItem('sessionId', sessionId);
  }
  return sessionId;
};

// Get recently viewed products from localStorage (for guest users)
export const getLocalRecentlyViewed = () => {
  try {
    return JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
  } catch (error) {
    console.error('Error getting local recently viewed:', error);
    return [];
  }
};

// Clear recently viewed from localStorage
export const clearLocalRecentlyViewed = () => {
  try {
    localStorage.removeItem('recentlyViewed');
  } catch (error) {
    console.error('Error clearing local recently viewed:', error);
  }
};

// Track page view
export const trackPageView = async (page, userId = null) => {
  try {
    if (userId) {
      await api.post('/api/recommendations/track', {
        userId,
        action: 'page_view',
        data: {
          page,
          timestamp: new Date().toISOString(),
          sessionId: getSessionId(),
          referrer: document.referrer,
          userAgent: navigator.userAgent
        }
      });
    }
  } catch (error) {
    console.error('Error tracking page view:', error);
  }
};

// Batch track multiple actions (for performance)
export const batchTrackActions = async (actions, userId = null) => {
  try {
    if (userId && actions.length > 0) {
      await api.post('/api/recommendations/batch-track', {
        userId,
        actions: actions.map(action => ({
          ...action,
          data: {
            ...action.data,
            timestamp: new Date().toISOString(),
            sessionId: getSessionId()
          }
        }))
      });
    }
  } catch (error) {
    console.error('Error batch tracking actions:', error);
  }
};
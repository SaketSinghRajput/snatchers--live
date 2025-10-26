import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import api from '../api';

// Action types
const RECOMMENDATION_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  SET_RECOMMENDATIONS: 'SET_RECOMMENDATIONS',
  ADD_RECOMMENDATIONS: 'ADD_RECOMMENDATIONS',
  CLEAR_RECOMMENDATIONS: 'CLEAR_RECOMMENDATIONS',
  SET_USER_PREFERENCES: 'SET_USER_PREFERENCES',
  TRACK_BEHAVIOR: 'TRACK_BEHAVIOR',
  UPDATE_PRODUCT_INTERACTION: 'UPDATE_PRODUCT_INTERACTION'
};

// Initial state
const initialState = {
  personalized: [],
  trending: [],
  popular: {},
  collaborative: [],
  productBased: {},
  loading: {
    personalized: false,
    trending: false,
    popular: false,
    collaborative: false,
    productBased: false
  },
  error: {
    personalized: null,
    trending: null,
    popular: null,
    collaborative: null,
    productBased: null
  },
  userPreferences: {
    categories: [],
    brands: [],
    priceRange: { min: 0, max: 100000 }
  },
  behaviorQueue: [],
  lastFetch: {
    personalized: null,
    trending: null,
    popular: {},
    collaborative: null,
    productBased: {}
  }
};

// Reducer
const recommendationReducer = (state, action) => {
  switch (action.type) {
    case RECOMMENDATION_ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: {
          ...state.loading,
          [action.payload.type]: action.payload.loading
        }
      };

    case RECOMMENDATION_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: {
          ...state.error,
          [action.payload.type]: action.payload.error
        }
      };

    case RECOMMENDATION_ACTIONS.SET_RECOMMENDATIONS:
      const { type, data, key } = action.payload;
      const updateKey = key || type;
      
      return {
        ...state,
        [type]: key ? { ...state[type], [key]: data } : data,
        lastFetch: {
          ...state.lastFetch,
          [type]: key ? { ...state.lastFetch[type], [key]: Date.now() } : Date.now()
        }
      };

    case RECOMMENDATION_ACTIONS.ADD_RECOMMENDATIONS:
      const { type: addType, data: addData, key: addKey } = action.payload;
      const currentData = addKey ? state[addType][addKey] || [] : state[addType];
      const newData = [...currentData, ...addData];
      
      return {
        ...state,
        [addType]: addKey ? { ...state[addType], [addKey]: newData } : newData
      };

    case RECOMMENDATION_ACTIONS.CLEAR_RECOMMENDATIONS:
      return {
        ...state,
        [action.payload.type]: action.payload.key ? 
          { ...state[action.payload.type], [action.payload.key]: [] } : 
          []
      };

    case RECOMMENDATION_ACTIONS.SET_USER_PREFERENCES:
      return {
        ...state,
        userPreferences: { ...state.userPreferences, ...action.payload }
      };

    case RECOMMENDATION_ACTIONS.TRACK_BEHAVIOR:
      return {
        ...state,
        behaviorQueue: [...state.behaviorQueue, action.payload]
      };

    case RECOMMENDATION_ACTIONS.UPDATE_PRODUCT_INTERACTION:
      const { productId, interaction } = action.payload;
      // Update product interaction across all recommendation types
      const updateProductInArray = (products) => 
        products.map(product => 
          product._id === productId 
            ? { ...product, ...interaction }
            : product
        );

      return {
        ...state,
        personalized: updateProductInArray(state.personalized),
        trending: updateProductInArray(state.trending),
        collaborative: updateProductInArray(state.collaborative),
        popular: Object.keys(state.popular).reduce((acc, key) => ({
          ...acc,
          [key]: updateProductInArray(state.popular[key])
        }), {}),
        productBased: Object.keys(state.productBased).reduce((acc, key) => ({
          ...acc,
          [key]: updateProductInArray(state.productBased[key])
        }), {})
      };

    default:
      return state;
  }
};

// Context
const RecommendationContext = createContext();

// Provider component
export const RecommendationProvider = ({ children }) => {
  const [state, dispatch] = useReducer(recommendationReducer, initialState);

  // Helper function to check if data is stale
  const isDataStale = useCallback((type, key = null, maxAge = 5 * 60 * 1000) => {
    const lastFetch = key ? state.lastFetch[type]?.[key] : state.lastFetch[type];
    return !lastFetch || (Date.now() - lastFetch) > maxAge;
  }, [state.lastFetch]);

  // Generic fetch function
  const fetchRecommendations = useCallback(async (type, options = {}) => {
    const { 
      productId, 
      category, 
      limit = 10, 
      days = 7, 
      force = false,
      append = false 
    } = options;

    const key = productId || category;
    
    // Check if we need to fetch (not stale or forced)
    if (!force && !isDataStale(type, key)) {
      return;
    }

    try {
      dispatch({ 
        type: RECOMMENDATION_ACTIONS.SET_LOADING, 
        payload: { type, loading: true } 
      });

      dispatch({ 
        type: RECOMMENDATION_ACTIONS.SET_ERROR, 
        payload: { type, error: null } 
      });

      let endpoint = '';
      let params = { limit };

      switch (type) {
        case 'personalized':
          endpoint = '/api/recommendations/personalized';
          break;
        case 'trending':
          endpoint = '/api/recommendations/trending';
          params.days = days;
          break;
        case 'popular':
          if (!category) throw new Error('Category required for popular recommendations');
          endpoint = `/api/recommendations/popular/${encodeURIComponent(category)}`;
          break;
        case 'collaborative':
          endpoint = '/api/recommendations/collaborative';
          break;
        case 'productBased':
          if (!productId) throw new Error('Product ID required for product-based recommendations');
          endpoint = `/api/recommendations/product/${productId}`;
          break;
        default:
          endpoint = '/api/recommendations/fallback';
      }

      const response = await api.get(endpoint, { params });

      if (response.data.success) {
        const data = response.data.data || [];
        
        if (append) {
          dispatch({
            type: RECOMMENDATION_ACTIONS.ADD_RECOMMENDATIONS,
            payload: { type, data, key }
          });
        } else {
          dispatch({
            type: RECOMMENDATION_ACTIONS.SET_RECOMMENDATIONS,
            payload: { type, data, key }
          });
        }
      } else {
        throw new Error(response.data.message || 'Failed to fetch recommendations');
      }
    } catch (error) {
      console.error(`Error fetching ${type} recommendations:`, error);
      dispatch({ 
        type: RECOMMENDATION_ACTIONS.SET_ERROR, 
        payload: { type, error: error.message } 
      });

      // Fallback to general recommendations if specific type fails
      if (type !== 'fallback') {
        try {
          const fallbackResponse = await api.get('/api/recommendations/fallback', { 
            params: { limit } 
          });
          if (fallbackResponse.data.success) {
            dispatch({
              type: RECOMMENDATION_ACTIONS.SET_RECOMMENDATIONS,
              payload: { type, data: fallbackResponse.data.data || [], key }
            });
          }
        } catch (fallbackError) {
          console.error('Fallback recommendations failed:', fallbackError);
        }
      }
    } finally {
      dispatch({ 
        type: RECOMMENDATION_ACTIONS.SET_LOADING, 
        payload: { type, loading: false } 
      });
    }
  }, [isDataStale]);

  // Track user behavior
  const trackBehavior = useCallback(async (action, data) => {
    const behaviorData = {
      userId: data.userId || 'anonymous',
      action,
      data: {
        ...data,
        sessionId: sessionStorage.getItem('sessionId') || 'unknown',
        timestamp: new Date().toISOString()
      }
    };

    // Add to queue for batch processing
    dispatch({
      type: RECOMMENDATION_ACTIONS.TRACK_BEHAVIOR,
      payload: behaviorData
    });

    try {
      await api.post('/api/recommendations/track', behaviorData);
    } catch (error) {
      console.error('Error tracking behavior:', error);
    }
  }, []);

  // Update product interaction (wishlist, cart, etc.)
  const updateProductInteraction = useCallback((productId, interaction) => {
    dispatch({
      type: RECOMMENDATION_ACTIONS.UPDATE_PRODUCT_INTERACTION,
      payload: { productId, interaction }
    });
  }, []);

  // Set user preferences
  const setUserPreferences = useCallback((preferences) => {
    dispatch({
      type: RECOMMENDATION_ACTIONS.SET_USER_PREFERENCES,
      payload: preferences
    });
  }, []);

  // Specific recommendation fetchers
  const getPersonalizedRecommendations = useCallback((options = {}) => {
    return fetchRecommendations('personalized', options);
  }, [fetchRecommendations]);

  const getTrendingProducts = useCallback((options = {}) => {
    return fetchRecommendations('trending', options);
  }, [fetchRecommendations]);

  const getPopularInCategory = useCallback((category, options = {}) => {
    return fetchRecommendations('popular', { ...options, category });
  }, [fetchRecommendations]);

  const getCollaborativeRecommendations = useCallback((options = {}) => {
    return fetchRecommendations('collaborative', options);
  }, [fetchRecommendations]);

  const getProductRecommendations = useCallback((productId, options = {}) => {
    return fetchRecommendations('productBased', { ...options, productId });
  }, [fetchRecommendations]);

  // Clear specific recommendations
  const clearRecommendations = useCallback((type, key = null) => {
    dispatch({
      type: RECOMMENDATION_ACTIONS.CLEAR_RECOMMENDATIONS,
      payload: { type, key }
    });
  }, []);

  // Refresh all recommendations
  const refreshAllRecommendations = useCallback(() => {
    fetchRecommendations('personalized', { force: true });
    fetchRecommendations('trending', { force: true });
    fetchRecommendations('collaborative', { force: true });
  }, [fetchRecommendations]);

  // Process behavior queue periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (state.behaviorQueue.length > 0) {
        // Clear the queue after processing
        dispatch({
          type: RECOMMENDATION_ACTIONS.TRACK_BEHAVIOR,
          payload: { clear: true }
        });
      }
    }, 30000); // Process every 30 seconds

    return () => clearInterval(interval);
  }, [state.behaviorQueue]);

  const value = {
    // State
    ...state,
    
    // Actions
    fetchRecommendations,
    trackBehavior,
    updateProductInteraction,
    setUserPreferences,
    clearRecommendations,
    refreshAllRecommendations,
    
    // Specific getters
    getPersonalizedRecommendations,
    getTrendingProducts,
    getPopularInCategory,
    getCollaborativeRecommendations,
    getProductRecommendations,
    
    // Utilities
    isDataStale
  };

  return (
    <RecommendationContext.Provider value={value}>
      {children}
    </RecommendationContext.Provider>
  );
};

// Hook to use the context
export const useRecommendationContext = () => {
  const context = useContext(RecommendationContext);
  if (!context) {
    throw new Error('useRecommendationContext must be used within a RecommendationProvider');
  }
  return context;
};

export default RecommendationContext;
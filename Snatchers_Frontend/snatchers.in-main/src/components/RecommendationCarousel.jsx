import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaChevronLeft, FaChevronRight, FaSpinner } from 'react-icons/fa';
import EnhancedProductCard from './EnhancedProductCard';
import api from '../api';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

const RecommendationCarousel = ({
  title = "Recommended for You",
  type = "personalized", // personalized, product, trending, popular, collaborative
  productId = null,
  category = null,
  limit = 10,
  userId = null,
  showTitle = true,
  className = "",
  cardProps = {},
  autoScroll = false,
  autoScrollInterval = 5000
}) => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const scrollContainerRef = useRef(null);
  const autoScrollRef = useRef(null);

  // Fetch recommendations based on type
  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let endpoint = '';
      let params = { limit };

      switch (type) {
        case 'personalized':
          endpoint = '/api/recommendations/personalized';
          break;
        case 'product':
          if (!productId) {
            throw new Error('Product ID is required for product recommendations');
          }
          endpoint = `/api/recommendations/product/${productId}`;
          break;
        case 'trending':
          endpoint = '/api/recommendations/trending';
          params.days = 7;
          break;
        case 'popular':
          if (!category) {
            throw new Error('Category is required for popular recommendations');
          }
          endpoint = `/api/recommendations/popular/${encodeURIComponent(category)}`;
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
        setProducts(response.data.data || []);
      } else {
        throw new Error(response.data.message || 'Failed to fetch recommendations');
      }
    } catch (err) {
      console.error('Error fetching recommendations:', err);
      setError(err.message);
      
      // Fallback to general recommendations if specific type fails
      if (type !== 'fallback') {
        try {
          const fallbackResponse = await api.get('/api/recommendations/fallback', { params: { limit } });
          if (fallbackResponse.data.success) {
            setProducts(fallbackResponse.data.data || []);
            setError(null);
          }
        } catch (fallbackErr) {
          console.error('Fallback recommendations also failed:', fallbackErr);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // Track user behavior for recommendations
  const trackBehavior = async (action, data) => {
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
  };

  // Initialize component
  useEffect(() => {
    fetchRecommendations();
  }, [type, productId, category, limit]);

  // Auto-scroll functionality
  useEffect(() => {
    if (autoScroll && products.length > 0) {
      autoScrollRef.current = setInterval(() => {
        scrollToNext();
      }, autoScrollInterval);

      return () => {
        if (autoScrollRef.current) {
          clearInterval(autoScrollRef.current);
        }
      };
    }
  }, [autoScroll, products.length, autoScrollInterval]);

  // Update scroll buttons state
  const updateScrollButtons = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  // Scroll functions
  const scrollToNext = () => {
    if (scrollContainerRef.current && canScrollRight) {
      const cardWidth = 280; // Approximate card width including gap
      scrollContainerRef.current.scrollBy({ left: cardWidth * 2, behavior: 'smooth' });
      setTimeout(updateScrollButtons, 300);
    }
  };

  const scrollToPrev = () => {
    if (scrollContainerRef.current && canScrollLeft) {
      const cardWidth = 280;
      scrollContainerRef.current.scrollBy({ left: -cardWidth * 2, behavior: 'smooth' });
      setTimeout(updateScrollButtons, 300);
    }
  };

  // Handle product interactions
  const handleProductClick = (product) => {
    trackBehavior('product_view', {
      productId: product._id,
      source: 'recommendation_carousel',
      recommendationType: type
    });
    
    // Navigate to product page
    navigate(`/product/${product._id}`);
  };

  const handleAddToCart = (product) => {
    trackBehavior('cart_add', {
      productId: product._id,
      source: 'recommendation_carousel',
      recommendationType: type
    });
  };

  const handleWishlistToggle = (product) => {
    trackBehavior('wishlist_add', {
      productId: product._id,
      source: 'recommendation_carousel',
      recommendationType: type
    });
  };

  // Loading state
  if (loading) {
    return (
      <div className={`py-8 ${className}`}>
        {showTitle && (
          <h2 className="text-2xl font-bold text-center mb-6 font-montserrat">
            {title}
          </h2>
        )}
        <div className="flex justify-center items-center py-12">
          <FaSpinner className="animate-spin text-3xl text-gray-400" />
          <span className="ml-3 text-gray-600">Loading recommendations...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error && products.length === 0) {
    return (
      <div className={`py-8 ${className}`}>
        {showTitle && (
          <h2 className="text-2xl font-bold text-center mb-6 font-montserrat">
            {title}
          </h2>
        )}
        <div className="text-center py-12">
          <p className="text-gray-600 mb-4">Unable to load recommendations</p>
          <button
            onClick={fetchRecommendations}
            className="bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // No products state
  if (products.length === 0) {
    return null;
  }

  return (
    <div className={`py-8 ${className}`}>
      {showTitle && (
        <div className="flex items-center justify-between mb-6 px-4">
          <h2 className="text-2xl font-bold font-montserrat">
            {title}
          </h2>
          
          {/* Navigation buttons */}
          <div className="flex gap-2">
            <button
              onClick={scrollToPrev}
              disabled={!canScrollLeft}
              className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                canScrollLeft
                  ? 'border-black text-black hover:bg-black hover:text-white'
                  : 'border-gray-300 text-gray-300 cursor-not-allowed'
              }`}
              aria-label="Previous products"
            >
              <FaChevronLeft size={14} />
            </button>
            <button
              onClick={scrollToNext}
              disabled={!canScrollRight}
              className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                canScrollRight
                  ? 'border-black text-black hover:bg-black hover:text-white'
                  : 'border-gray-300 text-gray-300 cursor-not-allowed'
              }`}
              aria-label="Next products"
            >
              <FaChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Products carousel */}
      <div className="relative">
        <div
          ref={scrollContainerRef}
          className="flex gap-6 overflow-x-auto scrollbar-hide px-4 pb-4"
          onScroll={updateScrollButtons}
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <AnimatePresence>
            {products.map((product, index) => (
              <motion.div
                key={product._id || index}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="flex-shrink-0 w-64"
              >
                <EnhancedProductCard
                  {...product}
                  image={product.images?.[0] || product.image}
                  images={product.images || [product.image]}
                  onClick={() => handleProductClick(product)}
                  onAddToCart={() => handleAddToCart(product)}
                  onToggleWishlist={() => handleWishlistToggle(product)}
                  showQuickActions={true}
                  showHoverEffects={true}
                  badgeText={
                    type === 'trending' ? 'Trending' :
                    type === 'popular' ? 'Popular' :
                    product.offerPrice ? 'Sale' : null
                  }
                  badgeClass={
                    type === 'trending' ? 'bg-orange-500' :
                    type === 'popular' ? 'bg-blue-500' :
                    'bg-red-500'
                  }
                  {...cardProps}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Gradient overlays for scroll indication */}
        {canScrollLeft && (
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent pointer-events-none z-10" />
        )}
        {canScrollRight && (
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none z-10" />
        )}
      </div>

      {/* View all button */}
      {products.length >= limit && (
        <div className="text-center mt-6">
          <button
            onClick={() => {
              trackBehavior('view_all_click', {
                source: 'recommendation_carousel',
                recommendationType: type
              });
              // Navigate to appropriate listing page
              navigate(category ? `/category-shop?category=${encodeURIComponent(category)}` : '/shop');
            }}
            className="border-2 border-black text-black px-8 py-3 rounded-lg hover:bg-black hover:text-white transition-all duration-300 font-semibold"
          >
            View All Products
          </button>
        </div>
      )}
    </div>
  );
};

export default RecommendationCarousel;
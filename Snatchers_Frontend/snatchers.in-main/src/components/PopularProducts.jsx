import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaStar, FaHeart, FaChevronLeft, FaChevronRight, FaCrown } from 'react-icons/fa';
import EnhancedProductCard from './EnhancedProductCard';
import api from '../api';

const PopularProducts = ({
  title = "Popular Products",
  category = null,
  limit = 8,
  showTitle = true,
  className = "",
  cardProps = {},
  layout = "carousel", // carousel or grid
  autoScroll = false,
  autoScrollInterval = 5000
}) => {
  const [popularProducts, setPopularProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Fetch popular products
  const fetchPopularProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      const endpoint = category 
        ? `/api/recommendations/popular/${encodeURIComponent(category)}`
        : '/api/recommendations/fallback';
      
      const response = await api.get(endpoint, {
        params: { limit }
      });
      
      if (response.data.success) {
        setPopularProducts(response.data.data || []);
      } else {
        setError('Failed to load popular products');
      }
    } catch (error) {
      console.error('Error fetching popular products:', error);
      setError('Failed to load popular products');
    } finally {
      setLoading(false);
    }
  };

  // Navigation for carousel
  const nextSlide = () => {
    const maxIndex = Math.max(0, popularProducts.length - getVisibleCount());
    setCurrentIndex(prev => Math.min(prev + 1, maxIndex));
  };

  const prevSlide = () => {
    setCurrentIndex(prev => Math.max(prev - 1, 0));
  };

  const getVisibleCount = () => {
    if (typeof window === 'undefined') return 4;
    if (window.innerWidth < 640) return 1;
    if (window.innerWidth < 768) return 2;
    if (window.innerWidth < 1024) return 3;
    return 4;
  };

  // Auto scroll functionality
  useEffect(() => {
    if (autoScroll && popularProducts.length > getVisibleCount()) {
      const interval = setInterval(() => {
        setCurrentIndex(prev => {
          const maxIndex = Math.max(0, popularProducts.length - getVisibleCount());
          return prev >= maxIndex ? 0 : prev + 1;
        });
      }, autoScrollInterval);

      return () => clearInterval(interval);
    }
  }, [autoScroll, autoScrollInterval, popularProducts.length]);

  useEffect(() => {
    fetchPopularProducts();
  }, [category, limit]);

  const displayTitle = category ? `Popular in ${category}` : title;

  if (loading) {
    return (
      <div className={`popular-products-section ${className}`}>
        {showTitle && (
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <FaStar className="text-yellow-600" />
              {displayTitle}
            </h2>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="animate-pulse">
              <div className="bg-gray-200 rounded-lg h-64 mb-4"></div>
              <div className="bg-gray-200 rounded h-4 mb-2"></div>
              <div className="bg-gray-200 rounded h-4 w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`popular-products-section ${className}`}>
        {showTitle && (
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <FaStar className="text-yellow-600" />
              {displayTitle}
            </h2>
          </div>
        )}
        <div className="text-center py-8">
          <FaHeart className="text-gray-400 text-4xl mx-auto mb-4" />
          <p className="text-gray-600">{error}</p>
          <button 
            onClick={fetchPopularProducts}
            className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (popularProducts.length === 0) {
    return (
      <div className={`popular-products-section ${className}`}>
        {showTitle && (
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <FaStar className="text-yellow-600" />
              {displayTitle}
            </h2>
          </div>
        )}
        <div className="text-center py-8">
          <FaHeart className="text-gray-400 text-4xl mx-auto mb-4" />
          <p className="text-gray-600">No popular products available</p>
        </div>
      </div>
    );
  }

  const visibleCount = getVisibleCount();
  const canNavigate = popularProducts.length > visibleCount;

  return (
    <div className={`popular-products-section ${className}`}>
      {showTitle && (
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FaStar className="text-yellow-600" />
            {displayTitle}
            <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full ml-2">
              Popular
            </span>
          </h2>
          {canNavigate && layout === 'carousel' && (
            <div className="flex gap-2">
              <button
                onClick={prevSlide}
                disabled={currentIndex === 0}
                className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <FaChevronLeft className="text-gray-600" />
              </button>
              <button
                onClick={nextSlide}
                disabled={currentIndex >= popularProducts.length - visibleCount}
                className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <FaChevronRight className="text-gray-600" />
              </button>
            </div>
          )}
        </div>
      )}

      {layout === 'carousel' ? (
        <div className="relative">
          <div className="overflow-hidden">
            <motion.div
              className="flex gap-6"
              animate={{ x: -currentIndex * (100 / visibleCount) + '%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <AnimatePresence>
                {popularProducts.map((product, index) => (
                  <motion.div
                    key={product._id}
                    className={`flex-shrink-0 w-full sm:w-1/2 lg:w-1/3 xl:w-1/4 relative`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    {/* Popular badge for top 3 */}
                    {index < 3 && (
                      <div className="absolute top-2 left-2 z-10 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                        <FaCrown className="text-xs" />
                        #{index + 1}
                      </div>
                    )}
                    <EnhancedProductCard
                      product={product}
                      showQuickActions={true}
                      showWishlist={true}
                      showCompare={true}
                      {...cardProps}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence>
            {popularProducts.map((product, index) => (
              <motion.div
                key={product._id}
                className="relative"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.1 }}
              >
                {/* Popular badge for top 3 */}
                {index < 3 && (
                  <div className="absolute top-2 left-2 z-10 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                    <FaCrown className="text-xs" />
                    #{index + 1}
                  </div>
                )}
                <EnhancedProductCard
                  product={product}
                  showQuickActions={true}
                  showWishlist={true}
                  showCompare={true}
                  {...cardProps}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default PopularProducts;
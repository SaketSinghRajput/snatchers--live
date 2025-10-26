import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaHistory, FaTrash, FaEye, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import EnhancedProductCard from './EnhancedProductCard';
import api from '../api';
import { toast } from 'react-toastify';

const RecentlyViewed = ({
  title = "Recently Viewed",
  limit = 8,
  showTitle = true,
  showClearButton = true,
  className = "",
  cardProps = {},
  layout = "carousel" // carousel or grid
}) => {
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Fetch recently viewed products
  const fetchRecentlyViewed = async () => {
    try {
      setLoading(true);
      setError(null);

      // Try to get from authenticated user first
      try {
        const response = await api.get('/api/user/recently-viewed', {
          params: { limit }
        });
        
        if (response.data.success) {
          setRecentlyViewed(response.data.data || []);
          return;
        }
      } catch (authError) {
        // If not authenticated, get from localStorage
        console.log('User not authenticated, using localStorage');
      }

      // Fallback to localStorage for guest users
      const localRecentlyViewed = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
      
      if (localRecentlyViewed.length > 0) {
        // Get product details for the IDs stored in localStorage
        const productIds = localRecentlyViewed.slice(0, limit).map(item => item.productId);
        
        try {
          const response = await api.post('/api/products/batch', { productIds });
          if (response.data.success) {
            // Sort products by view order from localStorage
            const sortedProducts = productIds.map(id => 
              response.data.data.find(product => product._id === id)
            ).filter(Boolean);
            
            setRecentlyViewed(sortedProducts);
          }
        } catch (batchError) {
          console.error('Error fetching batch products:', batchError);
          setError('Failed to load recently viewed products');
        }
      }
    } catch (error) {
      console.error('Error fetching recently viewed:', error);
      setError('Failed to load recently viewed products');
    } finally {
      setLoading(false);
    }
  };

  // Clear recently viewed products
  const clearRecentlyViewed = async () => {
    try {
      // Try to clear from authenticated user first
      try {
        await api.delete('/api/user/recently-viewed');
        toast.success('Recently viewed products cleared');
      } catch (authError) {
        // If not authenticated, clear from localStorage
        localStorage.removeItem('recentlyViewed');
        toast.success('Recently viewed products cleared');
      }
      
      setRecentlyViewed([]);
    } catch (error) {
      console.error('Error clearing recently viewed:', error);
      toast.error('Failed to clear recently viewed products');
    }
  };

  // Navigation for carousel
  const nextSlide = () => {
    const maxIndex = Math.max(0, recentlyViewed.length - getVisibleCount());
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

  useEffect(() => {
    fetchRecentlyViewed();
  }, [limit]);

  if (loading) {
    return (
      <div className={`recently-viewed-section ${className}`}>
        {showTitle && (
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <FaHistory className="text-blue-600" />
              {title}
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
      <div className={`recently-viewed-section ${className}`}>
        {showTitle && (
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <FaHistory className="text-blue-600" />
              {title}
            </h2>
          </div>
        )}
        <div className="text-center py-8">
          <FaEye className="text-gray-400 text-4xl mx-auto mb-4" />
          <p className="text-gray-600">{error}</p>
          <button 
            onClick={fetchRecentlyViewed}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (recentlyViewed.length === 0) {
    return (
      <div className={`recently-viewed-section ${className}`}>
        {showTitle && (
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <FaHistory className="text-blue-600" />
              {title}
            </h2>
          </div>
        )}
        <div className="text-center py-8">
          <FaEye className="text-gray-400 text-4xl mx-auto mb-4" />
          <p className="text-gray-600">No recently viewed products</p>
          <p className="text-sm text-gray-500 mt-2">
            Products you view will appear here
          </p>
        </div>
      </div>
    );
  }

  const visibleCount = getVisibleCount();
  const canNavigate = recentlyViewed.length > visibleCount;

  return (
    <div className={`recently-viewed-section ${className}`}>
      {showTitle && (
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FaHistory className="text-blue-600" />
            {title}
          </h2>
          {showClearButton && recentlyViewed.length > 0 && (
            <button
              onClick={clearRecentlyViewed}
              className="flex items-center gap-2 px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
            >
              <FaTrash className="text-sm" />
              Clear All
            </button>
          )}
        </div>
      )}

      {layout === 'carousel' ? (
        <div className="relative">
          {canNavigate && (
            <>
              <button
                onClick={prevSlide}
                disabled={currentIndex === 0}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white shadow-lg rounded-full p-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
              >
                <FaChevronLeft className="text-gray-600" />
              </button>
              <button
                onClick={nextSlide}
                disabled={currentIndex >= recentlyViewed.length - visibleCount}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white shadow-lg rounded-full p-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
              >
                <FaChevronRight className="text-gray-600" />
              </button>
            </>
          )}
          
          <div className="overflow-hidden">
            <motion.div
              className="flex gap-6"
              animate={{ x: -currentIndex * (100 / visibleCount) + '%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <AnimatePresence>
                {recentlyViewed.map((product, index) => (
                  <motion.div
                    key={product._id}
                    className={`flex-shrink-0 w-full sm:w-1/2 lg:w-1/3 xl:w-1/4`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.1 }}
                  >
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
            {recentlyViewed.map((product, index) => (
              <motion.div
                key={product._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.1 }}
              >
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

export default RecentlyViewed;
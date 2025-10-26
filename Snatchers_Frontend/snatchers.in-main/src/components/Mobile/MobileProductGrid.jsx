import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import EnhancedProductCard from '../EnhancedProductCard';
import { ChevronUp } from 'lucide-react';

const MobileProductGrid = ({
  products = [],
  loading = false,
  viewMode = 'grid',
  onProductClick,
  onAddToCart,
  onToggleWishlist,
  wishlist = [],
  cart = [],
  className = ''
}) => {
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Handle scroll to top button visibility
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  const handleProductClick = useCallback((product) => {
    if (onProductClick) {
      onProductClick(product);
    }
  }, [onProductClick]);

  const handleAddToCart = useCallback((product) => {
    if (onAddToCart) {
      onAddToCart(product);
    }
  }, [onAddToCart]);

  const handleToggleWishlist = useCallback((product) => {
    if (onToggleWishlist) {
      onToggleWishlist(product);
    }
  }, [onToggleWishlist]);

  // Loading skeleton
  const LoadingSkeleton = () => (
    <div className="mobile-product-grid">
      {[...Array(6)].map((_, index) => (
        <div key={index} className="mobile-card p-4">
          <div className="aspect-square bg-gray-200 rounded-lg mb-3 mobile-skeleton" />
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded mobile-skeleton" />
            <div className="h-4 bg-gray-200 rounded mobile-skeleton w-2/3" />
            <div className="h-6 bg-gray-200 rounded mobile-skeleton w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );

  // Grid view
  const GridView = () => (
    <div className={`mobile-product-grid ${className}`}>
      <AnimatePresence>
        {products.map((product, index) => (
          <motion.div
            key={product._id || product.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ 
              duration: 0.3, 
              delay: index * 0.05,
              ease: 'easeOut'
            }}
            className="mobile-card"
          >
            <EnhancedProductCard
              {...product}
              compactMode={true}
              showQuickActions={true}
              showHoverEffects={false}
              onClick={() => handleProductClick(product)}
              onAddToCart={() => handleAddToCart(product)}
              onToggleWishlist={() => handleToggleWishlist(product)}
              wishlisted={wishlist.includes(product._id || product.id)}
              isInCart={cart.includes(product._id || product.id)}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );

  // List view
  const ListView = () => (
    <div className={`space-y-4 p-4 ${className}`}>
      <AnimatePresence>
        {products.map((product, index) => (
          <motion.div
            key={product._id || product.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ 
              duration: 0.3, 
              delay: index * 0.03,
              ease: 'easeOut'
            }}
            onClick={() => handleProductClick(product)}
            className="mobile-card p-4 flex space-x-4 cursor-pointer"
          >
            {/* Product Image */}
            <div className="w-20 h-20 flex-shrink-0">
              <img
                src={product.images?.[0] || product.image || '/placeholder.png'}
                alt={product.title}
                className="w-full h-full object-cover rounded-lg"
                loading="lazy"
              />
            </div>

            {/* Product Details */}
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-gray-900 text-sm line-clamp-2 mb-1">
                {product.title}
              </h3>
              
              {product.rating > 0 && (
                <div className="flex items-center mb-2">
                  <div className="flex text-yellow-400 text-xs">
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className={i < product.rating ? 'opacity-100' : 'opacity-30'}>
                        ★
                      </span>
                    ))}
                  </div>
                  <span className="text-xs text-gray-500 ml-1">({product.rating})</span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-baseline space-x-2">
                  {product.offerPrice ? (
                    <>
                      <span className="text-sm font-semibold text-gray-900">
                        ₹{product.offerPrice.toLocaleString()}
                      </span>
                      <span className="text-xs text-gray-500 line-through">
                        ₹{product.price.toLocaleString()}
                      </span>
                    </>
                  ) : (
                    <span className="text-sm font-semibold text-gray-900">
                      ₹{product.price.toLocaleString()}
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleWishlist(product);
                    }}
                    className="tap-target p-1 rounded-full hover:bg-gray-100 transition-colors"
                    aria-label={wishlist.includes(product._id || product.id) ? 'Remove from wishlist' : 'Add to wishlist'}
                  >
                    <svg 
                      className={`w-4 h-4 ${wishlist.includes(product._id || product.id) ? 'text-red-500 fill-current' : 'text-gray-400'}`} 
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddToCart(product);
                    }}
                    className={`tap-target px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      cart.includes(product._id || product.id)
                        ? 'bg-gray-200 text-gray-700'
                        : 'bg-red-600 text-white hover:bg-red-700'
                    }`}
                  >
                    {cart.includes(product._id || product.id) ? 'Added' : 'Add'}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );

  return (
    <div className="relative">
      {loading ? (
        <LoadingSkeleton />
      ) : products.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
          <p className="text-gray-500">Try adjusting your search or filters</p>
        </div>
      ) : (
        viewMode === 'grid' ? <GridView /> : <ListView />
      )}

      {/* Scroll to Top Button */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            onClick={scrollToTop}
            className="fixed bottom-20 right-4 w-12 h-12 bg-white border border-gray-200 rounded-full shadow-lg flex items-center justify-center z-30 lg:hidden"
            aria-label="Scroll to top"
          >
            <ChevronUp size={20} className="text-gray-600" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MobileProductGrid;
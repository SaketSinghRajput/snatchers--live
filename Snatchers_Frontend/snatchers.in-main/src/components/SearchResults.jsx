import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Grid, List, Loader, Search, Eye, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ProductCard from '../UI/ProductCard';
import api from '../api';

const SearchResults = ({
  products = [],
  totalProducts = 0,
  currentPage = 1,
  totalPages = 1,
  isLoading = false,
  viewMode = 'grid',
  onPageChange,
  onViewModeChange,
  searchQuery = '',
  filters = {},
  sortBy = 'relevance',
  wishlist = [],
  cart = [],
  onToggleWishlist,
  onToggleCart,
  className = ''
}) => {
  const [visibleProducts, setVisibleProducts] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchAnalytics, setSearchAnalytics] = useState(null);
  const observerRef = useRef();
  const navigate = useNavigate();

  // Track search analytics
  useEffect(() => {
    if (searchQuery && products.length > 0) {
      trackSearchAnalytics();
    }
  }, [searchQuery, products.length]);

  const trackSearchAnalytics = async () => {
    try {
      const analyticsData = {
        query: searchQuery,
        resultsCount: totalProducts,
        filters: Object.keys(filters).length,
        sortBy,
        timestamp: new Date().toISOString()
      };

      // Track search analytics
      await api.post('/api/analytics/search', analyticsData);
      
      setSearchAnalytics(analyticsData);
    } catch (error) {
      console.error('Error tracking search analytics:', error);
    }
  };

  // Initialize visible products
  useEffect(() => {
    setVisibleProducts(products);
    setHasMore(currentPage < totalPages);
  }, [products, currentPage, totalPages]);

  // Infinite scroll observer
  const lastProductElementRef = useCallback(node => {
    if (isLoading || isLoadingMore) return;
    if (observerRef.current) observerRef.current.disconnect();
    
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadMoreProducts();
      }
    });
    
    if (node) observerRef.current.observe(node);
  }, [isLoading, isLoadingMore, hasMore]);

  const loadMoreProducts = async () => {
    if (isLoadingMore || !hasMore) return;
    
    setIsLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      onPageChange(nextPage);
    } catch (error) {
      console.error('Error loading more products:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Enhanced pagination component
  const EnhancedPagination = () => {
    if (totalPages <= 1) return null;

    const pages = [];
    const maxVisiblePages = 7;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return (
      <div className="flex flex-col items-center space-y-4 mt-8">
        {/* Page info */}
        <div className="text-sm text-gray-600">
          Showing {((currentPage - 1) * 20) + 1} to {Math.min(currentPage * 20, totalProducts)} of {totalProducts} results
        </div>

        {/* Pagination controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            First
          </button>
          
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          
          {startPage > 1 && (
            <>
              <button
                onClick={() => onPageChange(1)}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                1
              </button>
              {startPage > 2 && <span className="text-gray-500">...</span>}
            </>
          )}
          
          {pages.map(page => (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                page === currentPage
                  ? 'text-white bg-red-600 border border-red-600'
                  : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {page}
            </button>
          ))}
          
          {endPage < totalPages && (
            <>
              {endPage < totalPages - 1 && <span className="text-gray-500">...</span>}
              <button
                onClick={() => onPageChange(totalPages)}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                {totalPages}
              </button>
            </>
          )}
          
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
          
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Last
          </button>
        </div>

        {/* Quick page jump */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Go to page:</span>
          <input
            type="number"
            min="1"
            max={totalPages}
            value={currentPage}
            onChange={(e) => {
              const page = parseInt(e.target.value);
              if (page >= 1 && page <= totalPages) {
                onPageChange(page);
              }
            }}
            className="w-16 px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          <span className="text-sm text-gray-600">of {totalPages}</span>
        </div>
      </div>
    );
  };

  // Results header with analytics
  const ResultsHeader = () => (
    <div className="mb-6">
      {searchQuery && (
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Search results for "{searchQuery}"
          </h2>
          {searchAnalytics && (
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center space-x-1">
                <Search size={14} />
                <span>{totalProducts} results found</span>
              </div>
              <div className="flex items-center space-x-1">
                <Eye size={14} />
                <span>Page {currentPage} of {totalPages}</span>
              </div>
              {Object.keys(filters).length > 0 && (
                <div className="flex items-center space-x-1">
                  <TrendingUp size={14} />
                  <span>{Object.keys(filters).length} filters applied</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );

  // Loading state
  if (isLoading && products.length === 0) {
    return (
      <div className={`${className}`}>
        <div className="flex items-center justify-center py-12">
          <Loader className="animate-spin text-red-600" size={32} />
          <span className="ml-2 text-gray-600">Loading products...</span>
        </div>
      </div>
    );
  }

  // No results state
  if (!isLoading && products.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="text-gray-400 mb-4">
          <Search size={48} className="mx-auto" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
        <p className="text-gray-600 mb-4">
          {searchQuery 
            ? `No results found for "${searchQuery}". Try adjusting your search or filter criteria.`
            : 'Try adjusting your filter criteria or browse our categories.'
          }
        </p>
        <div className="space-y-2">
          <p className="text-sm text-gray-500">Suggestions:</p>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Check your spelling</li>
            <li>• Try more general keywords</li>
            <li>• Remove some filters</li>
            <li>• Browse our categories</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <ResultsHeader />

      {/* Products Grid/List */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${viewMode}-${currentPage}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className={`product-grid-container ${viewMode} grid gap-6 ${
            viewMode === 'grid' 
              ? 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4' 
              : 'grid-cols-1'
          }`}
        >
          {visibleProducts.map((product, index) => {
            const isLast = index === visibleProducts.length - 1;
            return (
              <motion.div
                key={product._id}
                ref={isLast ? lastProductElementRef : null}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="product-item product-card"
              >
                <ProductCard
                  product={product}
                  image={product.images?.[0] || "https://redthread.uoregon.edu/files/original/affd16fd5264cab9197da4cd1a996f820e601ee4.png"}
                  title={product.title}
                  price={product.price}
                  offerPrice={product.offerPrice}
                  rating={product.rating}
                  badgeText={product.badgeText}
                  badgeClass={product.badgeClass}
                  wishlisted={wishlist.includes(product._id)}
                  isInCart={cart.includes(product._id)}
                  viewMode={viewMode}
                  onClick={() => {
                    // Track product view
                    trackProductView(product._id);
                    navigate(`/product/${product._id}`);
                  }}
                  onToggleWishlist={(e) => onToggleWishlist && onToggleWishlist(e, product._id)}
                  onAddToCart={(e) => onToggleCart && onToggleCart(e, product._id)}
                  onRemoveFromCart={(e) => onToggleCart && onToggleCart(e, product._id)}
                />
              </motion.div>
            );
          })}
        </motion.div>
      </AnimatePresence>

      {/* Loading more indicator */}
      {isLoadingMore && (
        <div className="flex items-center justify-center py-8">
          <Loader className="animate-spin text-red-600" size={24} />
          <span className="ml-2 text-gray-600">Loading more products...</span>
        </div>
      )}

      {/* Pagination */}
      <EnhancedPagination />

      {/* Search suggestions for no results */}
      {!isLoading && products.length === 0 && searchQuery && (
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Try searching for:</h4>
          <div className="flex flex-wrap gap-2">
            {['electronics', 'clothing', 'accessories', 'home', 'beauty'].map(suggestion => (
              <button
                key={suggestion}
                onClick={() => navigate(`/shop?q=${suggestion}`)}
                className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-full hover:bg-red-50 hover:border-red-300 transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // Helper function to track product views
  function trackProductView(productId) {
    try {
      // Track product view analytics
      const viewData = {
        productId,
        searchQuery,
        filters,
        sortBy,
        position: visibleProducts.findIndex(p => p._id === productId) + 1,
        page: currentPage,
        timestamp: new Date().toISOString()
      };
      
      // Track product view analytics
      api.post('/api/analytics/product-view', viewData);
      
      console.log('Product view tracked:', viewData);
    } catch (error) {
      console.error('Error tracking product view:', error);
    }
  }
};

export default SearchResults;
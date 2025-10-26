import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Clock, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../api';

const MobileSearch = ({ 
  isOpen, 
  onClose, 
  onSearch, 
  placeholder = "Search products...",
  showRecentSearches = true,
  showTrending = true 
}) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [trendingSearches, setTrendingSearches] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current.focus();
      }, 100);
    }
  }, [isOpen]);

  // Load recent and trending searches
  useEffect(() => {
    if (isOpen) {
      loadRecentSearches();
      loadTrendingSearches();
    }
  }, [isOpen]);

  // Debounced search suggestions
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.length > 1) {
      debounceRef.current = setTimeout(() => {
        fetchSuggestions(query);
      }, 300);
    } else {
      setSuggestions([]);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query]);

  const loadRecentSearches = () => {
    try {
      const recent = JSON.parse(localStorage.getItem('recentSearches') || '[]');
      setRecentSearches(recent.slice(0, 5));
    } catch (error) {
      console.error('Error loading recent searches:', error);
      setRecentSearches([]);
    }
  };

  const loadTrendingSearches = async () => {
    try {
      // Mock trending searches - in real app, this would come from analytics
      const trending = [
        'iPhone 15',
        'Samsung Galaxy',
        'Wireless Headphones',
        'Smart Watch',
        'Gaming Laptop'
      ];
      setTrendingSearches(trending);
    } catch (error) {
      console.error('Error loading trending searches:', error);
      setTrendingSearches([]);
    }
  };

  const fetchSuggestions = async (searchQuery) => {
    setIsLoading(true);
    try {
      const response = await api.get('/search', {
        params: { q: searchQuery, limit: 8 }
      });
      setSuggestions(response.data?.data?.products || []);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const saveRecentSearch = (searchQuery) => {
    if (!searchQuery.trim()) return;
    
    try {
      const recent = JSON.parse(localStorage.getItem('recentSearches') || '[]');
      const updated = [
        searchQuery,
        ...recent.filter(item => item !== searchQuery)
      ].slice(0, 10);
      
      localStorage.setItem('recentSearches', JSON.stringify(updated));
      setRecentSearches(updated.slice(0, 5));
    } catch (error) {
      console.error('Error saving recent search:', error);
    }
  };

  const handleSearch = (searchQuery) => {
    const finalQuery = searchQuery || query;
    if (finalQuery.trim()) {
      saveRecentSearch(finalQuery.trim());
      onSearch(finalQuery.trim());
      onClose();
    }
  };

  const handleSuggestionClick = (product) => {
    saveRecentSearch(product.title);
    onSearch(product.title);
    onClose();
  };

  const clearRecentSearches = () => {
    localStorage.removeItem('recentSearches');
    setRecentSearches([]);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-white lg:hidden"
      >
        {/* Header */}
        <div className="safe-area-top">
          <div className="flex items-center px-4 py-3 border-b border-gray-200">
            <div className="flex-1 relative">
              <div className="mobile-search">
                <Search className="mobile-search-icon" size={20} />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={placeholder}
                  className="mobile-search-input"
                />
              </div>
            </div>
            <button
              onClick={onClose}
              className="tap-target ml-3 p-2 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Close search"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto mobile-scroll">
          {/* Search Suggestions */}
          {query.length > 1 && (
            <div className="p-4">
              <h3 className="text-sm font-medium text-gray-500 mb-3 uppercase tracking-wide">
                {isLoading ? 'Searching...' : 'Products'}
              </h3>
              
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gray-200 rounded-lg mobile-skeleton" />
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded mobile-skeleton mb-2" />
                        <div className="h-3 bg-gray-200 rounded mobile-skeleton w-2/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : suggestions.length > 0 ? (
                <div className="space-y-2">
                  {suggestions.map((product) => (
                    <motion.button
                      key={product._id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      onClick={() => handleSuggestionClick(product)}
                      className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
                    >
                      <img
                        src={product.images?.[0] || '/placeholder.png'}
                        alt={product.title}
                        className="w-12 h-12 object-cover rounded-lg"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {product.title}
                        </p>
                        <p className="text-sm text-gray-500">
                          ₹{product.offerPrice || product.price}
                        </p>
                      </div>
                    </motion.button>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  No products found for "{query}"
                </p>
              )}
            </div>
          )}

          {/* Recent Searches */}
          {query.length === 0 && showRecentSearches && recentSearches.length > 0 && (
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                  Recent Searches
                </h3>
                <button
                  onClick={clearRecentSearches}
                  className="text-xs text-red-600 hover:text-red-700 transition-colors"
                >
                  Clear All
                </button>
              </div>
              
              <div className="space-y-2">
                {recentSearches.map((search, index) => (
                  <motion.button
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleSearch(search)}
                    className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
                  >
                    <Clock size={16} className="text-gray-400" />
                    <span className="text-gray-700">{search}</span>
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          {/* Trending Searches */}
          {query.length === 0 && showTrending && trendingSearches.length > 0 && (
            <div className="p-4">
              <h3 className="text-sm font-medium text-gray-500 mb-3 uppercase tracking-wide">
                Trending Searches
              </h3>
              
              <div className="space-y-2">
                {trendingSearches.map((search, index) => (
                  <motion.button
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleSearch(search)}
                    className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
                  >
                    <TrendingUp size={16} className="text-red-500" />
                    <span className="text-gray-700">{search}</span>
                  </motion.button>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default MobileSearch;
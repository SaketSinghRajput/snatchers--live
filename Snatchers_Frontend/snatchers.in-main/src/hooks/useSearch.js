import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api';

const useSearch = (initialQuery = '', initialFilters = {}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchState, setSearchState] = useState({
    query: initialQuery,
    filters: initialFilters,
    sortBy: 'relevance',
    currentPage: 1,
    products: [],
    totalProducts: 0,
    totalPages: 1,
    aggregations: {},
    isLoading: false,
    error: null
  });

  const searchTimeoutRef = useRef(null);
  const abortControllerRef = useRef(null);
  const initialLoadRef = useRef(false);

  // Initialize from URL parameters
  useEffect(() => {
    const query = searchParams.get('q') || '';
    const page = parseInt(searchParams.get('page')) || 1;
    const sort = searchParams.get('sort') || 'relevance';
    
    // Parse filters from URL
    const urlFilters = {};
    if (searchParams.get('brands')) {
      urlFilters.brands = searchParams.get('brands').split(',');
    }
    if (searchParams.get('categories')) {
      urlFilters.categories = searchParams.get('categories').split(',');
    }
    if (searchParams.get('priceMin')) {
      urlFilters.priceMin = parseFloat(searchParams.get('priceMin'));
    }
    if (searchParams.get('priceMax')) {
      urlFilters.priceMax = parseFloat(searchParams.get('priceMax'));
    }
    if (searchParams.get('rating')) {
      urlFilters.rating = parseFloat(searchParams.get('rating'));
    }
    if (searchParams.get('inStock') === 'true') {
      urlFilters.inStock = true;
    }
    
    setSearchState(prev => ({
      ...prev,
      query,
      filters: urlFilters,
      sortBy: sort,
      currentPage: page
    }));

    // Perform initial search after URL params are loaded
    if (!initialLoadRef.current) {
      initialLoadRef.current = true;
      // Use setTimeout to ensure this runs after state is updated
      setTimeout(() => {
        performSearch(query, urlFilters, sort, page, true);
      }, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Update URL when search parameters change
  const updateURL = useCallback((query, filters, sortBy, page) => {
    const params = new URLSearchParams();
    
    if (query) params.set('q', query);
    if (sortBy && sortBy !== 'relevance') params.set('sort', sortBy);
    if (page && page !== 1) params.set('page', page.toString());
    
    // Add filters to URL
    if (filters.brands && filters.brands.length > 0) {
      params.set('brands', filters.brands.join(','));
    }
    if (filters.categories && filters.categories.length > 0) {
      params.set('categories', filters.categories.join(','));
    }
    if (filters.priceMin !== undefined) {
      params.set('priceMin', filters.priceMin.toString());
    }
    if (filters.priceMax !== undefined) {
      params.set('priceMax', filters.priceMax.toString());
    }
    if (filters.rating !== undefined) {
      params.set('rating', filters.rating.toString());
    }
    if (filters.inStock === true) {
      params.set('inStock', 'true');
    }
    
    setSearchParams(params);
  }, [setSearchParams]);

  // Debounced search function
  const performSearch = useCallback(async (query, filters, sortBy, page, immediate = false) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    const executeSearch = async () => {
      setSearchState(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        // Create new abort controller
        abortControllerRef.current = new AbortController();

        const params = {
          q: query,
          page,
          limit: 20,
          sortBy,
          ...filters
        };

        const response = await api.get('/search', { 
          params,
          signal: abortControllerRef.current.signal
        });
        
        if (response.data.success) {
          const data = response.data.data;
          setSearchState(prev => ({
            ...prev,
            products: data.products || [],
            totalPages: data.totalPages || 1,
            totalProducts: data.total || 0,
            aggregations: data.aggregations || {},
            isLoading: false,
            error: null
          }));

          // Track search analytics
          if (query) {
            try {
              await api.post('/api/analytics/search', {
                query,
                resultsCount: data.total || 0,
                filters: Object.keys(filters).length,
                sortBy,
                timestamp: new Date().toISOString()
              });
            } catch (analyticsError) {
              console.warn('Failed to track search analytics:', analyticsError);
            }
          }
        } else {
          throw new Error('Search API returned unsuccessful response');
        }
      } catch (error) {
        if (error.name === 'AbortError') {
          return; // Request was cancelled
        }
        
        console.error('Search error:', error);
        setSearchState(prev => ({
          ...prev,
          isLoading: false,
          error: error.message || 'Search failed'
        }));
      }
    };

    if (immediate) {
      executeSearch();
    } else {
      // Debounce search by 300ms
      searchTimeoutRef.current = setTimeout(executeSearch, 300);
    }
  }, []);

  // Search handlers
  const setQuery = useCallback((query) => {
    setSearchState(prev => ({ ...prev, query, currentPage: 1 }));
    updateURL(query, searchState.filters, searchState.sortBy, 1);
    performSearch(query, searchState.filters, searchState.sortBy, 1);
  }, [searchState.filters, searchState.sortBy, updateURL, performSearch]);

  const setFilters = useCallback((filters) => {
    setSearchState(prev => ({ ...prev, filters, currentPage: 1 }));
    updateURL(searchState.query, filters, searchState.sortBy, 1);
    performSearch(searchState.query, filters, searchState.sortBy, 1, true);
  }, [searchState.query, searchState.sortBy, updateURL, performSearch]);

  const setSortBy = useCallback((sortBy) => {
    setSearchState(prev => ({ ...prev, sortBy, currentPage: 1 }));
    updateURL(searchState.query, searchState.filters, sortBy, 1);
    performSearch(searchState.query, searchState.filters, sortBy, 1, true);
  }, [searchState.query, searchState.filters, updateURL, performSearch]);

  const setPage = useCallback((page) => {
    setSearchState(prev => ({ ...prev, currentPage: page }));
    updateURL(searchState.query, searchState.filters, searchState.sortBy, page);
    performSearch(searchState.query, searchState.filters, searchState.sortBy, page, true);
  }, [searchState.query, searchState.filters, searchState.sortBy, updateURL, performSearch]);

  const clearFilters = useCallback(() => {
    setFilters({});
  }, [setFilters]);

  const removeFilter = useCallback((key, value) => {
    const newFilters = { ...searchState.filters };
    if (value !== undefined) {
      newFilters[key] = value;
    } else {
      delete newFilters[key];
    }
    setFilters(newFilters);
  }, [searchState.filters, setFilters]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    // State
    ...searchState,
    
    // Actions
    setQuery,
    setFilters,
    setSortBy,
    setPage,
    clearFilters,
    removeFilter,
    
    // Utilities
    hasActiveFilters: Object.keys(searchState.filters).some(key => {
      const value = searchState.filters[key];
      return value !== undefined && value !== null && 
             (Array.isArray(value) ? value.length > 0 : true);
    }),
    
    refresh: () => performSearch(
      searchState.query, 
      searchState.filters, 
      searchState.sortBy, 
      searchState.currentPage, 
      true
    )
  };
};

export default useSearch;
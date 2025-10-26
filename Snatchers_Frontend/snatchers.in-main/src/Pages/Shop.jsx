import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from '../api';
import { toast } from 'react-toastify';
// auth handled via API session cookie; no Cognito getSession required here
import { guestCartIncludes, addGuestCartItem, removeGuestCartItem } from '../utils/guestCart';
import { RevealOnScroll, MagneticScroll } from "../components/ScrollAnimations";
import FilterSidebar from '../components/FilterSidebar';
import SortOptions from '../components/SortOptions';
import AdvancedSearch from '../components/AdvancedSearch';
import ActiveFilters from '../components/ActiveFilters';
import SearchResults from '../components/SearchResults';
import useSearch from '../hooks/useSearch';
import { Grid, List } from 'lucide-react';
import MobileNavigation from '../components/Mobile/MobileNavigation';
import MobileFilterDrawer from '../components/Mobile/MobileFilterDrawer';
import MobileProductGrid from '../components/Mobile/MobileProductGrid';
import useMobileViewport from '../hooks/useMobileViewport';

const Shop = () => {
  const [wishlist, setWishlist] = useState([]);
  const [cart, setCart] = useState([]);
  const [token, setToken] = useState(null);
  const [isFilterSidebarOpen, setIsFilterSidebarOpen] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  
  const { isMobile } = useMobileViewport();
  
  const navigate = useNavigate();
  
  // Use the search hook for all search-related state and functionality
  const {
    query: searchQuery,
    filters,
    sortBy,
    currentPage,
    products,
    totalProducts,
    totalPages,
    aggregations,
    isLoading,
    error,
    setQuery: setSearchQuery,
    setFilters: handleFiltersChange,
    setSortBy: handleSortChange,
    setPage: handlePageChange,
    removeFilter: handleRemoveFilter,
    clearFilters: handleClearAllFilters,
    hasActiveFilters
  } = useSearch();

  // Fetch user data (wishlist and cart)
  const fetchUserData = useCallback(async () => {
    try {
      const [wishlistRes, cartRes] = await Promise.all([
        api.get(`/api/wishlist`),
        api.get(`/api/cart`),
      ]);

      const wishlistedIds = wishlistRes.data.map((item) =>
        typeof item === "object" && item.productId
          ? item.productId._id || item.productId
          : item._id || item
      );
      setWishlist(wishlistedIds);

      const cartIds = cartRes.data.map((item) => item.product._id);
      setCart(cartIds);
      setToken(true);
    } catch (userDataErr) {
      console.log("Could not fetch user data. Assuming guest.", userDataErr.message);
      setToken(false);
      setWishlist([]);
      try {
        const guest = (await import('../utils/guestCart')).getGuestCart();
        setCart(guest.map((p) => p._id));
      } catch (e) {
        setCart([]);
      }
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  // Search handler
  const handleSearch = (query) => {
    setSearchQuery(query);
  };

  const toggleWishlist = async (e, productId) => {
    e?.stopPropagation?.();
    if (!token) {
      navigate('/login');
      return;
    }

    const isWishlisted = wishlist.includes(productId);
    try {
      if (isWishlisted) {
        await api.delete(`/api/wishlist/${productId}`);
        setWishlist((prev) => prev.filter((id) => id !== productId));
        window.dispatchEvent(new Event('wishlist:changed'));
        toast.success('Removed from wishlist');
      } else {
        await api.post(`/api/wishlist/add`, { productId });
        setWishlist((prev) => [...prev, productId]);
        window.dispatchEvent(new Event('wishlist:changed'));
        toast.success('Added to wishlist');
      }
    } catch (err) {
      console.error("Error updating wishlist:", err);
      if (err.response?.status === 401) {
        toast.error('Your session expired. Please log in.');
        navigate('/login');
      } else {
        toast.error('Unable to update wishlist');
      }
    }
  };

  const toggleCart = async (e, productId) => {
    e?.stopPropagation?.();
    const isInCart = cart.includes(productId) || guestCartIncludes(productId);

    if (token) {
      const url = `/api/cart/${productId}`;
      try {
        if (isInCart) {
            await api.delete(url);
          setCart((prev) => prev.filter((id) => id !== productId));
        } else {
            await api.post(url);
          setCart((prev) => [...prev, productId]);
        }
      } catch (err) {
        console.error("Error updating cart:", err);
      }
      return;
    }

    // Guest cart toggle
    try {
      if (guestCartIncludes(productId)) {
        removeGuestCartItem(productId);
        setCart((prev) => prev.filter((id) => id !== productId));
      } else {
        const prod = products.find((p) => String(p._id) === String(productId)) || { _id: productId };
        addGuestCartItem(prod);
        setCart((prev) => Array.from(new Set([...prev, productId])));
      }
    } catch (err) {
      console.error('Guest cart update failed', err);
    }
  };

  return (
    <section className="py-16 bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded">
            Search error: {error}
          </div>
        )}

        {/* Header */}
        <RevealOnScroll direction="up" distance={50}>
          <MagneticScroll strength={0.1}>
            <h1 className="text-4xl font-bold mb-8 text-red-600 text-center">
              Explore Our Collection
            </h1>
          </MagneticScroll>
          <div className="w-24 h-1 bg-red-500 mx-auto mb-10 rounded-full" />
        </RevealOnScroll>

        {/* Search Bar */}
        <div className="mb-8">
          <AdvancedSearch
            query={searchQuery}
            onQueryChange={setSearchQuery}
            onSearch={handleSearch}
            placeholder="Search for products, brands, categories..."
            className="max-w-2xl mx-auto"
          />
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Desktop Filter Sidebar */}
          <div className="hidden lg:block lg:w-64 flex-shrink-0">
            <FilterSidebar
              filters={filters}
              onFiltersChange={handleFiltersChange}
              aggregations={aggregations}
              isOpen={isFilterSidebarOpen}
              onToggle={() => setIsFilterSidebarOpen(!isFilterSidebarOpen)}
            />
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* Active Filters */}
            <ActiveFilters
              filters={filters}
              onRemoveFilter={handleRemoveFilter}
              onClearAll={handleClearAllFilters}
              className="mb-6"
            />

            {/* Desktop Toolbar */}
            <div className="hidden lg:flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">
                  {isLoading ? 'Loading...' : `${totalProducts} products found`}
                </span>
                
                {/* View Mode Toggle */}
                <div className="flex items-center space-x-1 border border-gray-300 rounded-md">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 ${viewMode === 'grid' ? 'bg-red-600 text-white' : 'text-gray-600 hover:bg-gray-100'} transition-colors`}
                  >
                    <Grid size={16} />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 ${viewMode === 'list' ? 'bg-red-600 text-white' : 'text-gray-600 hover:bg-gray-100'} transition-colors`}
                  >
                    <List size={16} />
                  </button>
                </div>
              </div>

              <SortOptions
                sortBy={sortBy}
                onSortChange={handleSortChange}
              />
            </div>

            {/* Mobile Toolbar */}
            <div className="lg:hidden flex items-center justify-between mb-4 px-4">
              <span className="text-sm text-gray-600">
                {isLoading ? 'Loading...' : `${totalProducts} products`}
              </span>
              
              <div className="flex items-center space-x-2">
                <SortOptions
                  sortBy={sortBy}
                  onSortChange={handleSortChange}
                  compact={true}
                />
                
                <div className="flex items-center space-x-1 border border-gray-300 rounded-md">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 ${viewMode === 'grid' ? 'bg-red-600 text-white' : 'text-gray-600'} transition-colors`}
                  >
                    <Grid size={14} />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 ${viewMode === 'list' ? 'bg-red-600 text-white' : 'text-gray-600'} transition-colors`}
                  >
                    <List size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Search Results */}
            {isMobile ? (
              <MobileProductGrid
                products={products}
                loading={isLoading}
                viewMode={viewMode}
                onProductClick={(product) => navigate(`/product/${product._id}`)}
                onAddToCart={(product) => toggleCart(null, product._id)}
                onToggleWishlist={(product) => toggleWishlist(null, product._id)}
                wishlist={wishlist}
                cart={cart}
              />
            ) : (
              <SearchResults
                products={products}
                totalProducts={totalProducts}
                currentPage={currentPage}
                totalPages={totalPages}
                isLoading={isLoading}
                viewMode={viewMode}
                onPageChange={handlePageChange}
                onViewModeChange={setViewMode}
                searchQuery={searchQuery}
                filters={filters}
                sortBy={sortBy}
                wishlist={wishlist}
                cart={cart}
                onToggleWishlist={toggleWishlist}
                onToggleCart={toggleCart}
              />
            )}
          </div>
        </div>

        {/* Mobile Filter Drawer */}
        <MobileFilterDrawer
          isOpen={isMobileFilterOpen}
          onClose={() => setIsMobileFilterOpen(false)}
          filters={filters}
          onFiltersChange={handleFiltersChange}
          aggregations={aggregations}
          onApplyFilters={(newFilters) => {
            handleFiltersChange(newFilters);
            setIsMobileFilterOpen(false);
          }}
          onClearFilters={() => {
            handleClearAllFilters();
            setIsMobileFilterOpen(false);
          }}
        />

        {/* Mobile Navigation with Filter Button */}
        <MobileNavigation
          showFilterButton={true}
          onFilterToggle={() => setIsMobileFilterOpen(true)}
        />
      </div>
    </section>
  );
};

export default Shop;

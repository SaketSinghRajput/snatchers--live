import React, { useState, useEffect } from 'react';
import {
  FaSearch,
  FaShoppingBag,
  FaTrashAlt,
  FaUser,
  FaBars,
  FaTimes,
  FaHeart,
} from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext.jsx';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { getGuestCart } from '../utils/guestCart';
import CartIcon from './Cart/CartIcon';
import NotificationBell from './Notifications/NotificationBell';

const Navbar = () => {
  const { currentUser, getSession, logout } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(true);

  const [wishlistCount, setWishlistCount] = useState(0);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleSearchChange = async (e) => {
    const value = e.target.value;
    setSearchQuery(value);

    if (value.length > 0) {
      try {
    const res = await api.get(`/search`, {
            params: { q: value }
          });
        setSearchResults(res.data?.data?.products || []);
        setShowSuggestions(true);
      } catch (err) {
        console.error('Search failed:', err);
        setSearchResults([]);
        setShowSuggestions(false);
      }
    } else {
      setSearchResults([]);
      setShowSuggestions(false);
    }
  };

  // Dismiss dropdown on click outside
  useEffect(() => {
    const handler = (event) => {
      if (
        event.target.closest('.search-suggestions') === null &&
        event.target.closest('.product-search-input') === null
      ) {
        setShowSuggestions(false);
      }
    };
    if (showSuggestions) {
      document.addEventListener('mousedown', handler);
    }
    return () => document.removeEventListener('mousedown', handler);
  }, [showSuggestions]);

  useEffect(() => {
    let lastScrollY = window.scrollY;
    const handleScroll = () => {
      if (window.scrollY < 20) setShowMobileSearch(true);
      else if (window.scrollY > lastScrollY) setShowMobileSearch(false);
      else setShowMobileSearch(true);
      lastScrollY = window.scrollY;
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!currentUser) return;

      try {
        // Resolve token robustly: currentUser may be a local dev object, a Cognito wrapper,
        // or an object containing a `session` field. Fall back to getSession() and localStorage.
        const resolveToken = async () => {
          try {
            // If currentUser itself exposes a helper getIdToken (some mocks may), use it
            if (currentUser && typeof currentUser.getIdToken === 'function') {
              const maybe = await currentUser.getIdToken();
              if (typeof maybe === 'string') return maybe;
              if (maybe && typeof maybe.getJwtToken === 'function') return maybe.getJwtToken();
            }
          } catch (e) {}

          try {
            // If currentUser has a session object (CognitoAuth sets { username, session }), use that
            if (currentUser && currentUser.session) {
              const sess = currentUser.session;
              if (sess && typeof sess.getIdToken === 'function') {
                const id = sess.getIdToken();
                if (id && typeof id.getJwtToken === 'function') return id.getJwtToken();
              }
            }
          } catch (e) {}

          try {
            // Try the provided getSession() helper from the auth context
            if (typeof getSession === 'function') {
              const s = await getSession();
              if (s && typeof s.getIdToken === 'function') {
                const id = s.getIdToken();
                if (id && typeof id.getJwtToken === 'function') return id.getJwtToken();
              }
            }
          } catch (e) {}

          try {
            const stored = localStorage.getItem('token');
            if (stored) return stored;
          } catch (e) {}
          return null;
        };

        const token = await resolveToken();
        if (!token) throw new Error('No auth token available');

        const wishlistRes = await api.get(`/api/wishlist`);
        setWishlistCount(wishlistRes.data.length || 0);
      } catch (err) {
        console.error('Error fetching user data:', err);
      }
    };

    // if not logged in, reset wishlist count
    if (!currentUser) {
      setWishlistCount(0);
      return;
    }

    // Run the user data fetch and provide a fallback that attempts to refresh the session
    (async () => {
      try {
        await fetchUserData();
      } catch (e) {
        console.warn('fetchUserData failed, attempting fallback session check', e);
        // attempt to refresh session and retry
        try {
          const s = await getSession();
          if (!s) {
            setWishlistCount(0);
            return;
          }
          await fetchUserData();
        } catch (innerErr) {
          console.error('Session fallback failed:', innerErr);
        }
      }
    })();
  }, [currentUser]);

  const handleUserClick = (e) => {
    e.preventDefault();
    if (!currentUser) return navigate('/login');
    return navigate('/profile');
  };

  const handleProductClick = (productId) => {
    setShowSuggestions(false);
    navigate(`/product/${productId}`);
  };

  // Search Suggestions Dropdown
  const renderSearchSuggestions = () =>
    (searchQuery && showSuggestions) ? (
      <div className="search-suggestions absolute left-0 right-0 top-full z-50 bg-white border border-gray-200 rounded-b-xl shadow-lg"
        style={{ minWidth: '100%' }}>
        {searchResults.length > 0 ? (
          <ul>
            {searchResults.map((product) => (
              <li
                key={product._id || product.id}
                className="px-4 py-2 hover:bg-gray-100 flex items-center border-b border-gray-100 last:border-b-0"
              >
                <div
                  className="flex items-center w-full cursor-pointer"
                  onClick={() => handleProductClick(product._id || product.id)}
                  tabIndex={0}
                >
                  {product.images && product.images[0] && (
                    <img
                      src={product.images[0]}
                      alt={product.title}
                      className="w-10 h-10 object-cover rounded mr-3 border"
                    />
                  )}
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium text-gray-800 truncate">{product.title}</span>
                    {product.badgeText && (
                      <span
                        className={`mt-0.5 text-xs px-2 py-0.5 rounded ${product.badgeClass || 'bg-red-500 text-white'}`}
                      >
                        {product.badgeText}
                      </span>
                    )}
                  </div>
                  <span className="ml-auto text-sm text-gray-600 font-light whitespace-nowrap">
                    ₹{product.price}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="px-4 py-4 text-center text-gray-600 select-none">
            No products found
          </div>
        )}
      </div>
    ) : null;

  return (
    <>
      {/* Desktop Header */}
      <header className="hidden lg:block fixed top-8 left-0 w-full bg-white shadow-md z-40">
        <div className="flex flex-col items-center justify-center px-4 py-4">
          <div className="flex items-center justify-center w-full max-w-7xl">
            <Link to="/" className="flex items-center">
              <img src="/logo-black.png" alt="Logo" className="h-12 w-auto" />
            </Link>

            {/* Desktop Search Bar */}
            <div className="flex flex-grow justify-center px-4">
              <div className="relative w-[800px] max-w-full">
                <div className="bg-gray-200 rounded-full flex items-center px-4 py-3 shadow-md w-full">
                  <FaSearch className="text-gray-500 mr-2" />
                  <input
                    type="text"
                    placeholder="Search for products..."
                    className="w-full outline-none text-sm bg-transparent placeholder-gray-500 product-search-input"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    onFocus={() => {
                      if (searchResults.length > 0 || searchQuery.length > 0) setShowSuggestions(true);
                    }}
                  />
                </div>
                {renderSearchSuggestions()}
              </div>
            </div>

            <div className="flex items-center space-x-6 ml-auto">
              <Link to="/wishlist" className="relative hover:text-indigo-600 text-2xl">
                <FaHeart />
                {wishlistCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-1 rounded-full">
                    {wishlistCount}
                  </span>
                )}
              </Link>
              <CartIcon className="hover:text-indigo-600" />
              {currentUser && <NotificationBell className="hover:text-indigo-600" />}
              <button
                onClick={handleUserClick}
                className="hover:text-indigo-600 text-2xl"
                aria-label="profile"
                type="button"
              >
                <FaUser />
              </button>
            </div>
          </div>

          <nav className="flex justify-center mt-3 space-x-12 text-gray-700 text-lg font-thin">
            <Link to="/" className="hover:text-indigo-600">
              Home
            </Link>
            <Link to="/shop" className="hover:text-indigo-600">
              Shop
            </Link>
            <Link to="/mens" className="hover:text-indigo-600">
              Men
            </Link>
            <Link to="/womens" className="hover:text-indigo-600">
              Women
            </Link>
            <Link to="/about" className="hover:text-indigo-600">
              About Us
            </Link>
            <Link to="/contact" className="hover:text-indigo-600">
              Contact Us
            </Link>
          </nav>
        </div>
      </header>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 w-full bg-white shadow-md z-40 safe-area-top">
        <div className="flex items-center justify-between px-4 py-3 min-h-[56px]">
          <Link to="/" className="flex items-center">
            <img src="/logo-black.png" alt="Logo" className="h-8 w-auto" />
          </Link>

          <div className="flex items-center space-x-3">
            <Link to="/wishlist" className="relative tap-target p-2">
              <FaHeart className="text-lg" />
              {wishlistCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[18px] h-[18px] flex items-center justify-center">
                  {wishlistCount > 99 ? '99+' : wishlistCount}
                </span>
              )}
            </Link>
            <CartIcon className="tap-target" />
            {currentUser && <NotificationBell className="tap-target" />}
            <button
              onClick={handleUserClick}
              className="tap-target p-2"
              aria-label="profile"
              type="button"
            >
              <FaUser className="text-lg" />
            </button>
            <button
              className="tap-target p-2"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <FaTimes className="text-xl" /> : <FaBars className="text-xl" />}
            </button>
          </div>
        </div>

        {/* Mobile Search Bar */}
        {showMobileSearch && (
          <div className="px-4 pb-3">
            <div className="relative">
              <div className="bg-gray-100 rounded-full flex items-center px-4 py-2.5">
                <FaSearch className="text-gray-500 mr-3" />
                <input
                  id="navbar-mobile-search"
                  name="navbar-mobile-search"
                  type="text"
                  placeholder="Search for products..."
                  className="w-full outline-none text-base bg-transparent placeholder-gray-500 product-search-input"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onFocus={() => {
                    if (searchResults.length > 0 || searchQuery.length > 0) setShowSuggestions(true);
                  }}
                />
              </div>
              {renderSearchSuggestions()}
            </div>
          </div>
        )}
      </header>

      <div
        className={`fixed inset-0 bg-black bg-opacity-50 z-30 transition-opacity duration-300 ${
          isMobileMenuOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsMobileMenuOpen(false)}
      ></div>

      <div
        className={`fixed top-0 right-0 h-full w-64 bg-white shadow-lg z-50 transform transition-transform duration-300 ease-in-out ${
          isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <span className="text-lg font-semibold text-gray-800">Menu</span>
          <button onClick={() => setIsMobileMenuOpen(false)}>
            <FaTimes className="text-gray-700 text-xl hover:rotate-90 transition-transform duration-300" />
          </button>
        </div>
        <nav className="flex flex-col p-4 space-y-4 text-gray-700 text-md font-thin">
          <Link to="/" className="hover:text-indigo-600">Home</Link>
          <Link to="/shop" className="hover:text-indigo-600">Shop</Link>
          <Link to="/mens" className="hover:text-indigo-600">Men</Link>
          <Link to="/womens" className="hover:text-indigo-600">Women</Link>
          <Link to="/about" className="hover:text-indigo-600">About Us</Link>
          <Link to="/contact" className="hover:text-indigo-600">Contact Us</Link>
        </nav>
      </div>
    </>
  );
};

export default Navbar;

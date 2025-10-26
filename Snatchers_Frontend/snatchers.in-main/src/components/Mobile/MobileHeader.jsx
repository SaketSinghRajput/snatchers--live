import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Search, 
  MoreVertical, 
  Share2,
  Heart,
  ShoppingBag
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MobileHeader = ({ 
  title, 
  showBackButton = false, 
  showSearch = false,
  showActions = false,
  onSearchToggle,
  onShare,
  className = ''
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  const getPageTitle = () => {
    if (title) return title;
    
    switch (location.pathname) {
      case '/':
        return 'Snatchers';
      case '/shop':
        return 'Shop';
      case '/cart':
        return 'Shopping Cart';
      case '/wishlist':
        return 'Wishlist';
      case '/profile':
        return 'Profile';
      case '/orders':
        return 'My Orders';
      case '/notifications':
        return 'Notifications';
      default:
        if (location.pathname.startsWith('/product/')) {
          return 'Product Details';
        }
        if (location.pathname.startsWith('/orders/')) {
          return 'Order Details';
        }
        return 'Snatchers';
    }
  };

  const shouldShowBackButton = showBackButton || (
    location.pathname !== '/' && 
    location.pathname !== '/shop' && 
    location.pathname !== '/cart' && 
    location.pathname !== '/profile'
  );

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`fixed top-0 left-0 right-0 z-40 lg:hidden transition-all duration-300 ${
        isScrolled 
          ? 'bg-white/95 backdrop-blur-md shadow-md' 
          : 'bg-white'
      } ${className}`}
    >
      <div className="safe-area-top">
        <div className="flex items-center justify-between px-4 py-3 min-h-[56px]">
          {/* Left Section */}
          <div className="flex items-center">
            {shouldShowBackButton ? (
              <button
                onClick={handleBack}
                className="tap-target mr-2 p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Go back"
              >
                <ArrowLeft size={20} />
              </button>
            ) : (
              <div className="w-8" /> // Spacer for alignment
            )}
          </div>

          {/* Center Section - Title/Logo */}
          <div className="flex-1 flex justify-center">
            {location.pathname === '/' ? (
              <img 
                src="/logo-black.png" 
                alt="Snatchers" 
                className="h-8 w-auto"
              />
            ) : (
              <h1 className="text-lg font-semibold text-gray-900 truncate px-4">
                {getPageTitle()}
              </h1>
            )}
          </div>

          {/* Right Section */}
          <div className="flex items-center space-x-1">
            {showSearch && (
              <button
                onClick={onSearchToggle}
                className="tap-target p-2 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Search"
              >
                <Search size={20} />
              </button>
            )}

            {showActions && (
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="tap-target p-2 rounded-full hover:bg-gray-100 transition-colors"
                  aria-label="More options"
                >
                  <MoreVertical size={20} />
                </button>

                <AnimatePresence>
                  {showMenu && (
                    <>
                      {/* Backdrop */}
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowMenu(false)}
                      />
                      
                      {/* Menu */}
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20"
                      >
                        {onShare && (
                          <button
                            onClick={() => {
                              onShare();
                              setShowMenu(false);
                            }}
                            className="w-full flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <Share2 size={16} className="mr-3" />
                            Share
                          </button>
                        )}
                        
                        <button
                          onClick={() => {
                            navigate('/wishlist');
                            setShowMenu(false);
                          }}
                          className="w-full flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <Heart size={16} className="mr-3" />
                          Wishlist
                        </button>
                        
                        <button
                          onClick={() => {
                            navigate('/cart');
                            setShowMenu(false);
                          }}
                          className="w-full flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <ShoppingBag size={16} className="mr-3" />
                          Cart
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.header>
  );
};

export default MobileHeader;
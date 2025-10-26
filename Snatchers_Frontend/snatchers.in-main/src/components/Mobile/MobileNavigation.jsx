import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, 
  Search, 
  ShoppingBag, 
  Heart, 
  User,
  Grid3X3,
  Filter
} from 'lucide-react';
import { useCart } from '../../contexts/CartContext';
import { motion, AnimatePresence } from 'framer-motion';

const MobileNavigation = ({ onFilterToggle, showFilterButton = false }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { totalItems } = useCart();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Auto-hide navigation on scroll
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY < 100) {
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const navItems = [
    {
      id: 'home',
      label: 'Home',
      icon: Home,
      path: '/',
      isActive: location.pathname === '/'
    },
    {
      id: 'shop',
      label: 'Shop',
      icon: Grid3X3,
      path: '/shop',
      isActive: location.pathname === '/shop'
    },
    {
      id: 'search',
      label: 'Search',
      icon: Search,
      path: '/shop',
      isActive: false,
      onClick: () => {
        navigate('/shop');
        // Focus search input after navigation
        setTimeout(() => {
          const searchInput = document.querySelector('.product-search-input');
          if (searchInput) {
            searchInput.focus();
          }
        }, 100);
      }
    },
    {
      id: 'cart',
      label: 'Cart',
      icon: ShoppingBag,
      path: '/cart',
      isActive: location.pathname === '/cart',
      badge: totalItems > 0 ? totalItems : null
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      path: '/profile',
      isActive: location.pathname.startsWith('/profile') || location.pathname === '/login'
    }
  ];

  const handleNavClick = (item) => {
    if (item.onClick) {
      item.onClick();
    } else {
      navigate(item.path);
    }
  };

  return (
    <>
      {/* Mobile Bottom Navigation */}
      <AnimatePresence>
        {isVisible && (
          <motion.nav
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="mobile-nav lg:hidden"
          >
            <div className="flex justify-around items-center max-w-md mx-auto">
              {navItems.map((item) => {
                const IconComponent = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item)}
                    className={`mobile-nav-item tap-target ${
                      item.isActive ? 'active' : ''
                    }`}
                    aria-label={item.label}
                  >
                    <div className="relative">
                      <IconComponent className="mobile-nav-icon" />
                      {item.badge && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center font-medium"
                        >
                          {item.badge > 99 ? '99+' : item.badge}
                        </motion.span>
                      )}
                    </div>
                    <span className="mobile-nav-label">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>

      {/* Mobile Filter Button (for shop page) */}
      {showFilterButton && (
        <AnimatePresence>
          {isVisible && (
            <motion.button
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onFilterToggle}
              className="mobile-filter-button lg:hidden"
              aria-label="Toggle filters"
            >
              <Filter size={24} />
            </motion.button>
          )}
        </AnimatePresence>
      )}
    </>
  );
};

export default MobileNavigation;
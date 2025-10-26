import React, { useState } from "react";
import PropTypes from 'prop-types';
import { FaHeart, FaRegHeart, FaEye, FaShoppingCart, FaCompressArrowsAlt } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import api from '../api';
import { toast } from 'react-toastify';
import MobileOptimizedImage from './Mobile/MobileOptimizedImage';
import useMobileViewport from '../hooks/useMobileViewport';


// Simple currency formatter (INR). Keeps no fractional digits to match original UI.
const formatCurrency = (value) => {
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
  } catch (e) {
    return `₹${value}`;
  }
};

const EnhancedProductCard = ({
  image,
  images = [],
  title,
  price,
  offerPrice = null,
  rating = 0,
  _id = null,
  id = null,
  product = null,
  onAddToCart,
  onRemoveFromCart,
  isInCart = false,
  badgeText,
  badgeClass = "bg-black",
  onClick,
  onQuickView,
  onCompare,
  wishlisted = false,
  onToggleWishlist,
  showQuickActions = true,
  showHoverEffects = true,
  compactMode = false,
  variants = [],
  stockStatus = 'in_stock'
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showQuickViewModal, setShowQuickViewModal] = useState(false);
  const { isMobile } = useMobileViewport();
  


  // productId fallback
  const productId = _id || id || (product && (product._id || product.id));
  const productImages = images.length > 0 ? images : [image];
  const isOutOfStock = stockStatus === 'out_of_stock';

  const handleWishlistClick = async (e) => {
    e.stopPropagation();
    if (typeof onToggleWishlist === 'function') {
      onToggleWishlist(e);
      return;
    }

    if (!productId) {
      console.warn('ProductCard: no product id provided for wishlist API fallback');
      toast.error('Cannot update wishlist (missing product id)');
      return;
    }

    try {
      if (wishlisted) {
        await api.delete(`/api/wishlist/${productId}`);
        toast.success('Removed from wishlist');
      } else {
        await api.post('/api/wishlist/add', { productId });
        toast.success('Added to wishlist');
      }
      window.dispatchEvent(new Event('wishlist:changed'));
    } catch (err) {
      if (err.response?.status === 401) {
        toast.error('Please log in to add to wishlist.');
      } else {
        toast.error('Could not update wishlist.');
      }
    }
  };

  const handleQuickView = (e) => {
    e.stopPropagation();
    if (onQuickView) {
      onQuickView(product || { _id: productId, title, price, offerPrice, images: productImages });
    } else {
      setShowQuickViewModal(true);
    }
  };

  const handleCompare = (e) => {
    e.stopPropagation();
    
    const productData = product || { 
      _id: productId, 
      title, 
      price, 
      offerPrice, 
      images: productImages,
      rating,
      variants,
      brand: product?.brand,
      category: product?.category,
      specifications: product?.specifications,
      description: product?.description
    };
    
    if (onCompare) {
      onCompare(productData);
    } else {
      toast.success('Added to comparison');
    }
  };

  const handleAddToCart = (e) => {
    e.stopPropagation();
    if (isOutOfStock) return;
    isInCart ? onRemoveFromCart?.() : onAddToCart?.();
  };

  // Handle image cycling on hover
  const handleImageCycle = () => {
    if (productImages.length > 1) {
      setCurrentImageIndex((prev) => (prev + 1) % productImages.length);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={showHoverEffects ? { y: -5 } : {}}
        transition={{ duration: 0.3 }}
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false);
          setCurrentImageIndex(0);
        }}
        className={`relative bg-white rounded-xl overflow-hidden group cursor-pointer transition-all duration-400 ease-in-out shadow-md hover:shadow-xl border border-gray-100 ${
          compactMode ? 'p-2 sm:p-3' : 'p-3 sm:p-4'
        } ${isOutOfStock ? 'opacity-75' : ''} mobile-card`}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter") onClick?.();
        }}
      >
        {/* Hover overlay */}
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10"
          aria-hidden
        />

        {/* Badge */}
        {badgeText && (
          <div
            className={`absolute z-20 top-2 left-2 text-white italic px-2 py-1 text-xs font-serif ${badgeClass} rounded-tr-lg rounded-bl-lg shadow-lg`}
          >
            {badgeText.toUpperCase()}
          </div>
        )}

        {/* Out of stock overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 z-30 bg-white/80 flex items-center justify-center">
            <span className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold text-sm">
              Out of Stock
            </span>
          </div>
        )}

        {/* Quick Actions */}
        {showQuickActions && (
          <AnimatePresence>
            {(isHovered || compactMode) && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                className={`absolute top-2 right-2 z-20 flex flex-col gap-2 ${
                  compactMode ? 'opacity-100' : ''
                }`}
              >
                {/* Wishlist */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleWishlistClick}
                  className={`${compactMode ? 'w-7 h-7' : 'w-8 h-8'} bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-red-500 hover:text-red-700 hover:bg-white transition-all duration-200 shadow-lg tap-target`}
                  aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
                >
                  {wishlisted ? <FaHeart size={compactMode ? 12 : 14} /> : <FaRegHeart size={compactMode ? 12 : 14} />}
                </motion.button>

                {/* Quick View */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleQuickView}
                  className={`${compactMode ? 'w-7 h-7' : 'w-8 h-8'} bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-gray-600 hover:text-gray-800 hover:bg-white transition-all duration-200 shadow-lg tap-target`}
                  aria-label="Quick view"
                >
                  <FaEye size={compactMode ? 12 : 14} />
                </motion.button>

                {/* Compare */}
                {onCompare && (
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handleCompare}
                    className={`${compactMode ? 'w-7 h-7' : 'w-8 h-8'} bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-blue-600 hover:text-blue-800 hover:bg-white transition-all duration-200 shadow-lg tap-target`}
                    aria-label="Add to compare"
                  >
                    <FaCompressArrowsAlt size={compactMode ? 10 : 12} />
                  </motion.button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* Product image */}
        <div 
          className={`mb-3 product-thumb overflow-hidden rounded-lg relative ${
            compactMode ? 'h-32' : 'h-48'
          }`}
          onMouseEnter={!isMobile ? handleImageCycle : undefined}
        >
          {isMobile ? (
            <MobileOptimizedImage
              src={productImages[currentImageIndex]}
              alt={title}
              className="w-full h-full object-cover"
              priority={compactMode ? false : true}
              sizes={compactMode ? '(max-width: 768px) 50vw, 25vw' : '(max-width: 768px) 100vw, 50vw'}
            />
          ) : (
            <motion.img 
              key={currentImageIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              src={productImages[currentImageIndex]} 
              alt={title} 
              className="w-full h-full object-cover transition-transform duration-500 ease-in-out group-hover:scale-110" 
              loading="lazy" 
            />
          )}
          
          {/* Image indicators */}
          {productImages.length > 1 && (
            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1">
              {productImages.map((_, idx) => (
                <div
                  key={idx}
                  className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${
                    idx === currentImageIndex ? 'bg-white' : 'bg-white/50'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Product details */}
        <div className="product-details relative z-10">
          <h2 className={`font-medium uppercase font-montserrat mb-2 group-hover:text-red-600 transition-colors duration-400 ease-in-out line-clamp-2 ${
            compactMode ? 'text-xs' : 'text-sm'
          }`}>
            {title}
          </h2>

          {/* Rating stars */}
          {!compactMode && rating > 0 && (
            <div
              className="text-yellow-400 text-sm mb-2 flex items-center gap-1"
              role="img"
              aria-label={`Rating: ${rating} out of 5 stars`}
            >
              {Array.from({ length: 5 }).map((_, i) => (
                <i key={i} className={`fa fa-star text-xs ${i < rating ? "opacity-100" : "opacity-30"} transition-opacity duration-400 ease-in-out`} />
              ))}
              <span className="text-xs text-gray-500 ml-1">({rating})</span>
            </div>
          )}

          {/* Variants preview */}
          {variants.length > 0 && !compactMode && (
            <div className="mb-2">
              {variants.slice(0, 1).map((variant) => (
                <div key={variant.name} className="flex items-center gap-1">
                  <span className="text-xs text-gray-500">{variant.name}:</span>
                  <div className="flex gap-1">
                    {variant.options.slice(0, 3).map((option, idx) => (
                      <div
                        key={idx}
                        className="w-3 h-3 rounded-full border border-gray-300"
                        style={{ 
                          backgroundColor: variant.type === 'color' ? option.toLowerCase() : '#f3f4f6' 
                        }}
                        title={option}
                      />
                    ))}
                    {variant.options.length > 3 && (
                      <span className="text-xs text-gray-400">+{variant.options.length - 3}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Price */}
          <div className="mb-3">
            {offerPrice ? (
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className={`text-gray-500 line-through ${compactMode ? 'text-xs' : 'text-sm'}`}>
                  {formatCurrency(price)}
                </span>
                <span className={`text-black font-semibold ${compactMode ? 'text-sm' : 'text-base'}`}>
                  {formatCurrency(offerPrice)}
                </span>
                <span className="text-xs text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                  {Math.round(((price - offerPrice) / price) * 100)}% OFF
                </span>
              </div>
            ) : (
              <span className={`block text-black font-semibold ${compactMode ? 'text-sm' : 'text-base'}`}>
                {formatCurrency(price)}
              </span>
            )}
          </div>

          {/* Quick Add to Cart */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            className={`w-full border-2 uppercase font-semibold rounded-lg transition-all duration-300 flex items-center justify-center gap-2 mobile-button ${
              compactMode ? 'text-xs py-2 px-2 min-h-[40px]' : 'text-sm py-2.5 px-4 min-h-[44px]'
            } ${
              isInCart 
                ? "border-gray-600 text-gray-600 hover:bg-gray-600 hover:text-white" 
                : isOutOfStock
                ? "border-gray-300 text-gray-400 cursor-not-allowed"
                : "border-black text-black hover:bg-black hover:text-white"
            }`}
          >
            <FaShoppingCart size={compactMode ? 12 : 14} />
            <span className={compactMode ? 'hidden sm:inline' : ''}>
              {isOutOfStock ? 'Out of Stock' : isInCart ? "Remove" : "Add to Cart"}
            </span>
            {compactMode && (
              <span className="sm:hidden">
                {isOutOfStock ? 'Out' : isInCart ? "Remove" : "Add"}
              </span>
            )}
          </motion.button>
        </div>
      </motion.div>

      {/* Quick View Modal */}
      <AnimatePresence>
        {showQuickViewModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
            onClick={() => setShowQuickViewModal(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-white rounded-xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Quick View</h3>
                <button
                  onClick={() => setShowQuickViewModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <img 
                src={productImages[0]} 
                alt={title} 
                className="w-full h-48 object-cover rounded-lg mb-4" 
              />
              
              <h4 className="font-semibold mb-2">{title}</h4>
              
              <div className="mb-4">
                {offerPrice ? (
                  <div className="flex items-baseline gap-2">
                    <span className="text-gray-500 line-through text-sm">{formatCurrency(price)}</span>
                    <span className="text-black font-semibold text-lg">{formatCurrency(offerPrice)}</span>
                  </div>
                ) : (
                  <span className="text-black font-semibold text-lg">{formatCurrency(price)}</span>
                )}
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    handleAddToCart({ stopPropagation: () => {} });
                    setShowQuickViewModal(false);
                  }}
                  className="flex-1 bg-black text-white py-2 px-4 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Add to Cart
                </button>
                <button
                  onClick={() => {
                    onClick?.();
                    setShowQuickViewModal(false);
                  }}
                  className="flex-1 border border-black text-black py-2 px-4 rounded-lg hover:bg-black hover:text-white transition-colors"
                >
                  View Details
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

EnhancedProductCard.propTypes = {
  image: PropTypes.string.isRequired,
  images: PropTypes.arrayOf(PropTypes.string),
  title: PropTypes.string.isRequired,
  price: PropTypes.number.isRequired,
  offerPrice: PropTypes.number,
  rating: PropTypes.number,
  onAddToCart: PropTypes.func,
  onRemoveFromCart: PropTypes.func,
  isInCart: PropTypes.bool,
  badgeText: PropTypes.string,
  badgeClass: PropTypes.string,
  onClick: PropTypes.func,
  onQuickView: PropTypes.func,
  onCompare: PropTypes.func,
  wishlisted: PropTypes.bool,
  onToggleWishlist: PropTypes.func,
  showQuickActions: PropTypes.bool,
  showHoverEffects: PropTypes.bool,
  compactMode: PropTypes.bool,
  variants: PropTypes.array,
  stockStatus: PropTypes.string,
  _id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  product: PropTypes.object,
};

export default EnhancedProductCard;
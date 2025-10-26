import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../../contexts/CartContext';
import { useNavigate } from 'react-router-dom';
import { X, ShoppingBag, Plus, Minus, Trash2 } from 'lucide-react';

const CartDrawer = () => {
  const { 
    isDrawerOpen, 
    setDrawerOpen, 
    cartItems, 
    totalPrice, 
    totalItems,
    updateQuantity, 
    removeFromCart,
    loading 
  } = useCart();
  const navigate = useNavigate();

  // Close drawer on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setDrawerOpen(false);
      }
    };

    if (isDrawerOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isDrawerOpen, setDrawerOpen]);

  const handleQuantityChange = async (productId, newQuantity, selectedVariant) => {
    if (newQuantity < 1) return;
    
    const result = await updateQuantity(productId, newQuantity, selectedVariant);
    if (!result.success && result.availableQuantity !== undefined) {
      alert(`Only ${result.availableQuantity} items available in stock`);
    }
  };

  const handleRemoveItem = async (productId, selectedVariant) => {
    await removeFromCart(productId, selectedVariant);
  };

  const handleCheckout = () => {
    setDrawerOpen(false);
    navigate('/cart');
  };

  const handleContinueShopping = () => {
    setDrawerOpen(false);
  };

  return (
    <AnimatePresence>
      {isDrawerOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setDrawerOpen(false)}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" />
                <h2 className="text-lg font-semibold">
                  Shopping Cart ({totalItems})
                </h2>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
                </div>
              ) : cartItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                  <ShoppingBag className="w-16 h-16 text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Your cart is empty
                  </h3>
                  <p className="text-gray-500 mb-4">
                    Add some items to get started
                  </p>
                  <button
                    onClick={handleContinueShopping}
                    className="bg-black text-white px-6 py-2 rounded-md hover:bg-gray-800 transition-colors"
                  >
                    Continue Shopping
                  </button>
                </div>
              ) : (
                <div className="p-4 space-y-4">
                  {cartItems.map((item) => {
                    const product = item.product || item;
                    const itemKey = `${product._id}-${JSON.stringify(item.selectedVariant)}`;
                    
                    return (
                      <motion.div
                        key={itemKey}
                        layout
                        className="flex gap-3 p-3 border rounded-lg"
                      >
                        {/* Product Image */}
                        <div className="w-16 h-16 bg-gray-100 rounded-md overflow-hidden flex-shrink-0">
                          <img
                            src={product.images?.[0] || '/placeholder.png'}
                            alt={product.title}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        {/* Product Details */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate">
                            {product.title}
                          </h4>
                          
                          {item.selectedVariant && (
                            <p className="text-xs text-gray-500 mt-1">
                              {Object.entries(item.selectedVariant).map(([key, value]) => 
                                `${key}: ${value}`
                              ).join(', ')}
                            </p>
                          )}

                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleQuantityChange(
                                  product._id, 
                                  (item.quantity || 1) - 1, 
                                  item.selectedVariant
                                )}
                                disabled={loading || (item.quantity || 1) <= 1}
                                className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              
                              <span className="text-sm font-medium min-w-[2rem] text-center">
                                {item.quantity || 1}
                              </span>
                              
                              <button
                                onClick={() => handleQuantityChange(
                                  product._id, 
                                  (item.quantity || 1) + 1, 
                                  item.selectedVariant
                                )}
                                disabled={loading}
                                className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>

                            <button
                              onClick={() => handleRemoveItem(product._id, item.selectedVariant)}
                              disabled={loading}
                              className="p-1 text-red-500 hover:bg-red-50 rounded disabled:opacity-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="mt-2">
                            <span className="font-semibold text-sm">
                              ₹{((product.offerPrice || product.price) * (item.quantity || 1)).toLocaleString()}
                            </span>
                            {product.offerPrice && (
                              <span className="text-xs text-gray-500 line-through ml-2">
                                ₹{(product.price * (item.quantity || 1)).toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            {cartItems.length > 0 && (
              <div className="border-t p-4 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Total:</span>
                  <span className="font-bold text-lg">
                    ₹{totalPrice.toLocaleString()}
                  </span>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={handleCheckout}
                    disabled={loading}
                    className="w-full bg-black text-white py-3 rounded-md hover:bg-gray-800 transition-colors disabled:opacity-50"
                  >
                    View Cart & Checkout
                  </button>
                  
                  <button
                    onClick={handleContinueShopping}
                    className="w-full border border-gray-300 py-2 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Continue Shopping
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CartDrawer;
import React, { useEffect, useState } from 'react';
import { useCart } from '../contexts/CartContext';
import { useNavigate } from 'react-router-dom';
import { Plus, Minus, Trash2, ShoppingBag, AlertCircle } from 'lucide-react';
import AnimatedHeading from '../UI/AnimatedHeading';
import { motion } from 'framer-motion';

const Cart = () => {
  const { 
    cartItems, 
    totalPrice, 
    totalItems,
    loading, 
    error,
    updateQuantity, 
    removeFromCart,
    validateCart,
    validationResults
  } = useCart();
  const navigate = useNavigate();
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    // Validate cart on mount if user is logged in
    const token = localStorage.getItem('token');
    if (token && cartItems.length > 0) {
      handleValidateCart();
    }
  }, [cartItems.length]);

  const handleValidateCart = async () => {
    setValidating(true);
    await validateCart();
    setValidating(false);
  };

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

  const handleProceedToCheckout = () => {
    navigate('/checkout');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-8 py-6 min-h-screen bg-gray-50">
      <AnimatedHeading
        heading="Your Cart"
        subheading="Review your items and proceed to checkout"
      />

      {error && (
        <div className="max-w-4xl mx-auto mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {!localStorage.getItem('token') && (
        <div className="max-w-4xl mx-auto mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
          <p className="mb-3">You're viewing the cart as a guest. To save your cart across devices and proceed to checkout, please login or register.</p>
          <div className="flex gap-4 justify-center">
            <button 
              onClick={() => navigate('/login')} 
              className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition-colors"
            >
              Login
            </button>
            <button 
              onClick={() => navigate('/register')} 
              className="px-4 py-2 border border-black rounded hover:bg-gray-50 transition-colors"
            >
              Register
            </button>
          </div>
        </div>
      )}

      {validationResults && !validationResults.valid && (
        <div className="max-w-4xl mx-auto mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-orange-500" />
            <span className="font-medium text-orange-700">Cart Validation Issues</span>
          </div>
          <ul className="text-sm text-orange-600 space-y-1">
            {validationResults.items.filter(item => !item.valid).map((item, index) => (
              <li key={index}>
                {item.title}: {item.issues.join(', ')}
              </li>
            ))}
          </ul>
        </div>
      )}

      {cartItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <ShoppingBag className="w-24 h-24 text-gray-300 mb-4" />
          <h3 className="text-xl font-medium text-gray-900 mb-2">Your cart is empty</h3>
          <p className="text-gray-500 mb-6">Add some items to get started</p>
          <button
            onClick={() => navigate('/shop')}
            className="bg-black text-white px-6 py-3 rounded-md hover:bg-gray-800 transition-colors"
          >
            Continue Shopping
          </button>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map((item) => {
                const product = item.product || item;
                const itemKey = `${product._id}-${JSON.stringify(item.selectedVariant)}`;
                const validationItem = validationResults?.items.find(v => v.productId === product._id);
                
                return (
                  <motion.div
                    key={itemKey}
                    layout
                    className={`bg-white rounded-lg p-6 shadow-sm border ${
                      validationItem && !validationItem.valid ? 'border-orange-200 bg-orange-50' : ''
                    }`}
                  >
                    <div className="flex gap-4">
                      {/* Product Image */}
                      <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                        <img
                          src={product.images?.[0] || '/placeholder.png'}
                          alt={product.title}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Product Details */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-lg mb-1 truncate">
                          {product.title}
                        </h3>
                        
                        {item.selectedVariant && (
                          <p className="text-sm text-gray-500 mb-2">
                            {Object.entries(item.selectedVariant).map(([key, value]) => 
                              `${key}: ${value}`
                            ).join(', ')}
                          </p>
                        )}

                        {validationItem && !validationItem.valid && (
                          <div className="mb-2 text-sm text-orange-600">
                            {validationItem.issues.join(', ')}
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => handleQuantityChange(
                                product._id, 
                                (item.quantity || 1) - 1, 
                                item.selectedVariant
                              )}
                              disabled={loading || (item.quantity || 1) <= 1}
                              className="p-2 hover:bg-gray-100 rounded-full disabled:opacity-50 transition-colors"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            
                            <span className="font-medium min-w-[3rem] text-center">
                              {item.quantity || 1}
                            </span>
                            
                            <button
                              onClick={() => handleQuantityChange(
                                product._id, 
                                (item.quantity || 1) + 1, 
                                item.selectedVariant
                              )}
                              disabled={loading}
                              className="p-2 hover:bg-gray-100 rounded-full disabled:opacity-50 transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>

                          <button
                            onClick={() => handleRemoveItem(product._id, item.selectedVariant)}
                            disabled={loading}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-full disabled:opacity-50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="mt-3 flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-lg">
                              ₹{((product.offerPrice || product.price) * (item.quantity || 1)).toLocaleString()}
                            </span>
                            {product.offerPrice && (
                              <span className="text-sm text-gray-500 line-through ml-2">
                                ₹{(product.price * (item.quantity || 1)).toLocaleString()}
                              </span>
                            )}
                          </div>
                          
                          <button
                            onClick={() => navigate(`/product/${product._id}`)}
                            className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            View Details
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg p-6 shadow-sm border sticky top-4">
                <h3 className="text-lg font-semibold mb-4">Order Summary</h3>
                
                <div className="space-y-3 mb-4">
                  <div className="flex justify-between">
                    <span>Items ({totalItems}):</span>
                    <span>₹{totalPrice.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipping:</span>
                    <span className="text-green-600">Free</span>
                  </div>
                  <hr />
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total:</span>
                    <span>₹{totalPrice.toLocaleString()}</span>
                  </div>
                </div>

                {localStorage.getItem('token') && (
                  <button
                    onClick={handleValidateCart}
                    disabled={validating}
                    className="w-full mb-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    {validating ? 'Validating...' : 'Validate Cart'}
                  </button>
                )}

                <button
                  onClick={handleProceedToCheckout}
                  disabled={loading || (validationResults && !validationResults.valid)}
                  className="w-full bg-black text-white py-3 rounded-md hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Proceed to Checkout
                </button>

                <button
                  onClick={() => navigate('/shop')}
                  className="w-full mt-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Continue Shopping
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cart;

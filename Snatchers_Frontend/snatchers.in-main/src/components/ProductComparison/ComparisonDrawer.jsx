import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaEye, FaShoppingCart } from 'react-icons/fa';
import { useComparison } from './ComparisonContext';
import { useNavigate } from 'react-router-dom';

const ComparisonDrawer = () => {
  const {
    comparisonList,
    isComparisonOpen,
    closeComparison,
    removeFromComparison,
    clearComparison,
    openComparison
  } = useComparison();
  
  const navigate = useNavigate();

  const formatCurrency = (value) => {
    try {
      return new Intl.NumberFormat('en-IN', { 
        style: 'currency', 
        currency: 'INR', 
        maximumFractionDigits: 0 
      }).format(value);
    } catch (e) {
      return `₹${value}`;
    }
  };

  const handleViewProduct = (productId) => {
    navigate(`/product/${productId}`);
    closeComparison();
  };

  const handleCompareAll = () => {
    navigate('/compare', { state: { products: comparisonList } });
    closeComparison();
  };

  return (
    <>
      {/* Comparison Button - Fixed position */}
      <AnimatePresence>
        {comparisonList.length > 0 && !isComparisonOpen && (
          <motion.button
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            onClick={openComparison}
            className="fixed bottom-6 right-6 z-40 bg-black text-white px-4 py-3 rounded-full shadow-lg hover:bg-gray-800 transition-colors flex items-center gap-2"
          >
            <span className="text-sm font-medium">Compare ({comparisonList.length})</span>
            <div className="w-6 h-6 bg-white text-black rounded-full flex items-center justify-center text-xs font-bold">
              {comparisonList.length}
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Comparison Drawer */}
      <AnimatePresence>
        {isComparisonOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeComparison}
              className="fixed inset-0 bg-black/50 z-50"
            />

            {/* Drawer */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl max-h-[80vh] overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Product Comparison ({comparisonList.length})
                  </h3>
                  <p className="text-sm text-gray-600">
                    Compare up to 4 products side by side
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  {comparisonList.length >= 2 && (
                    <button
                      onClick={handleCompareAll}
                      className="bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
                    >
                      Compare All
                    </button>
                  )}
                  
                  <button
                    onClick={clearComparison}
                    className="text-gray-500 hover:text-red-600 text-sm underline"
                  >
                    Clear All
                  </button>
                  
                  <button
                    onClick={closeComparison}
                    className="text-gray-400 hover:text-gray-600 p-1"
                  >
                    <FaTimes size={20} />
                  </button>
                </div>
              </div>

              {/* Products */}
              <div className="p-4 overflow-y-auto max-h-96">
                {comparisonList.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No products in comparison</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {comparisonList.map((product) => (
                      <motion.div
                        key={product._id}
                        layout
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="bg-gray-50 rounded-lg p-4 relative group"
                      >
                        {/* Remove Button */}
                        <button
                          onClick={() => removeFromComparison(product._id)}
                          className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <FaTimes />
                        </button>

                        {/* Product Image */}
                        <div className="aspect-square mb-3 overflow-hidden rounded-lg bg-white">
                          <img
                            src={product.images?.[0] || '/placeholder-image.jpg'}
                            alt={product.title}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        {/* Product Info */}
                        <div className="space-y-2">
                          <h4 className="font-medium text-sm text-gray-900 line-clamp-2">
                            {product.title}
                          </h4>
                          
                          <div className="flex items-center gap-2">
                            {product.offerPrice ? (
                              <>
                                <span className="text-xs text-gray-500 line-through">
                                  {formatCurrency(product.price)}
                                </span>
                                <span className="text-sm font-semibold text-gray-900">
                                  {formatCurrency(product.offerPrice)}
                                </span>
                              </>
                            ) : (
                              <span className="text-sm font-semibold text-gray-900">
                                {formatCurrency(product.price)}
                              </span>
                            )}
                          </div>

                          {/* Rating */}
                          {product.rating > 0 && (
                            <div className="flex items-center gap-1">
                              <div className="flex">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <span
                                    key={i}
                                    className={`text-xs ${
                                      i < product.rating ? 'text-yellow-400' : 'text-gray-300'
                                    }`}
                                  >
                                    ★
                                  </span>
                                ))}
                              </div>
                              <span className="text-xs text-gray-500">
                                ({product.rating})
                              </span>
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={() => handleViewProduct(product._id)}
                              className="flex-1 flex items-center justify-center gap-1 bg-white border border-gray-300 text-gray-700 py-2 px-3 rounded text-xs font-medium hover:bg-gray-50 transition-colors"
                            >
                              <FaEye size={10} />
                              View
                            </button>
                            
                            <button
                              onClick={() => {
                                // Add to cart logic here
                                console.log('Add to cart:', product._id);
                              }}
                              className="flex-1 flex items-center justify-center gap-1 bg-black text-white py-2 px-3 rounded text-xs font-medium hover:bg-gray-800 transition-colors"
                            >
                              <FaShoppingCart size={10} />
                              Cart
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default ComparisonDrawer;
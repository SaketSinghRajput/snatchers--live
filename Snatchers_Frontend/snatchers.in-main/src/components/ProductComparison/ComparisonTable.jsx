import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FaTimes, FaStar, FaShoppingCart, FaHeart, FaRegHeart } from 'react-icons/fa';
import { useComparison } from './ComparisonContext';
import { useNavigate } from 'react-router-dom';

const ComparisonTable = ({ products = [] }) => {
  const { removeFromComparison, clearComparison, getAllSpecifications, getSpecificationValue } = useComparison();
  const [showDifferencesOnly, setShowDifferencesOnly] = useState(false);
  const navigate = useNavigate();

  // Use products from props if provided, otherwise use comparison context
  const comparisonProducts = products.length > 0 ? products : [];
  const specifications = getAllSpecifications();

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

  const renderStars = (rating) => {
    return Array.from({ length: 5 }).map((_, index) => (
      <FaStar
        key={index}
        className={`text-sm ${
          index < rating ? 'text-yellow-400' : 'text-gray-300'
        }`}
      />
    ));
  };

  // Filter specifications to show only differences if toggle is enabled
  const filteredSpecifications = showDifferencesOnly
    ? specifications.filter(spec => {
        const values = comparisonProducts.map(product => getSpecificationValue(product, spec));
        const uniqueValues = new Set(values.filter(v => v !== '-'));
        return uniqueValues.size > 1;
      })
    : specifications;

  const handleViewProduct = (productId) => {
    navigate(`/product/${productId}`);
  };

  if (comparisonProducts.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">No products to compare</h3>
        <p className="text-gray-600">Add products to your comparison list to see them here.</p>
      </div>
    );
  }

  return (
    <div className="comparison-table">
      {/* Header Controls */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Product Comparison</h2>
          <p className="text-gray-600">Compare {comparisonProducts.length} products side by side</p>
        </div>
        
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showDifferencesOnly}
              onChange={(e) => setShowDifferencesOnly(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-gray-700">Show differences only</span>
          </label>
          
          <button
            onClick={clearComparison}
            className="text-red-600 hover:text-red-700 text-sm underline"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse bg-white rounded-lg shadow-sm overflow-hidden">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left p-4 font-medium text-gray-900 border-b border-gray-200 w-48">
                Product
              </th>
              {comparisonProducts.map((product) => (
                <th key={product._id} className="p-4 border-b border-gray-200 min-w-64">
                  <div className="relative">
                    {/* Remove Button */}
                    <button
                      onClick={() => removeFromComparison(product._id)}
                      className="absolute top-0 right-0 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                    >
                      <FaTimes />
                    </button>
                    
                    {/* Product Image */}
                    <div className="aspect-square mb-3 overflow-hidden rounded-lg bg-gray-100">
                      <img
                        src={product.images?.[0] || '/placeholder-image.jpg'}
                        alt={product.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    
                    {/* Product Title */}
                    <h3 className="font-medium text-gray-900 text-sm mb-2 line-clamp-2">
                      {product.title}
                    </h3>
                    
                    {/* View Product Button */}
                    <button
                      onClick={() => handleViewProduct(product._id)}
                      className="text-blue-600 hover:text-blue-700 text-xs underline"
                    >
                      View Details
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          
          <tbody>
            {/* Price Row */}
            <tr className="border-b border-gray-100">
              <td className="p-4 font-medium text-gray-900 bg-gray-50">Price</td>
              {comparisonProducts.map((product) => (
                <td key={product._id} className="p-4 text-center">
                  <div className="space-y-1">
                    {product.offerPrice ? (
                      <>
                        <div className="text-lg font-bold text-gray-900">
                          {formatCurrency(product.offerPrice)}
                        </div>
                        <div className="text-sm text-gray-500 line-through">
                          {formatCurrency(product.price)}
                        </div>
                        <div className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                          {Math.round(((product.price - product.offerPrice) / product.price) * 100)}% OFF
                        </div>
                      </>
                    ) : (
                      <div className="text-lg font-bold text-gray-900">
                        {formatCurrency(product.price)}
                      </div>
                    )}
                  </div>
                </td>
              ))}
            </tr>

            {/* Rating Row */}
            <tr className="border-b border-gray-100">
              <td className="p-4 font-medium text-gray-900 bg-gray-50">Rating</td>
              {comparisonProducts.map((product) => (
                <td key={product._id} className="p-4 text-center">
                  {product.rating > 0 ? (
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex items-center justify-center gap-1">
                        {renderStars(product.rating)}
                      </div>
                      <span className="text-sm text-gray-600">
                        {product.rating}/5
                      </span>
                    </div>
                  ) : (
                    <span className="text-gray-400">No rating</span>
                  )}
                </td>
              ))}
            </tr>

            {/* Brand Row */}
            <tr className="border-b border-gray-100">
              <td className="p-4 font-medium text-gray-900 bg-gray-50">Brand</td>
              {comparisonProducts.map((product) => (
                <td key={product._id} className="p-4 text-center">
                  {product.brand || '-'}
                </td>
              ))}
            </tr>

            {/* Category Row */}
            <tr className="border-b border-gray-100">
              <td className="p-4 font-medium text-gray-900 bg-gray-50">Category</td>
              {comparisonProducts.map((product) => (
                <td key={product._id} className="p-4 text-center">
                  {product.category || '-'}
                </td>
              ))}
            </tr>

            {/* Specifications */}
            {filteredSpecifications.map((spec) => (
              <tr key={spec} className="border-b border-gray-100">
                <td className="p-4 font-medium text-gray-900 bg-gray-50">{spec}</td>
                {comparisonProducts.map((product) => (
                  <td key={product._id} className="p-4 text-center">
                    {getSpecificationValue(product, spec)}
                  </td>
                ))}
              </tr>
            ))}

            {/* Actions Row */}
            <tr>
              <td className="p-4 font-medium text-gray-900 bg-gray-50">Actions</td>
              {comparisonProducts.map((product) => (
                <td key={product._id} className="p-4">
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => {
                        // Add to cart logic
                        console.log('Add to cart:', product._id);
                      }}
                      className="flex items-center justify-center gap-2 bg-black text-white py-2 px-4 rounded-lg font-medium hover:bg-gray-800 transition-colors"
                    >
                      <FaShoppingCart size={14} />
                      Add to Cart
                    </button>
                    
                    <button
                      onClick={() => {
                        // Add to wishlist logic
                        console.log('Add to wishlist:', product._id);
                      }}
                      className="flex items-center justify-center gap-2 border border-gray-300 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                    >
                      <FaRegHeart size={14} />
                      Wishlist
                    </button>
                  </div>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* No Differences Message */}
      {showDifferencesOnly && filteredSpecifications.length === 0 && (
        <div className="text-center py-8 bg-gray-50 rounded-lg mt-4">
          <p className="text-gray-600">
            All products have similar specifications. 
            <button
              onClick={() => setShowDifferencesOnly(false)}
              className="text-blue-600 hover:text-blue-700 underline ml-1"
            >
              Show all specifications
            </button>
          </p>
        </div>
      )}
    </div>
  );
};

export default ComparisonTable;
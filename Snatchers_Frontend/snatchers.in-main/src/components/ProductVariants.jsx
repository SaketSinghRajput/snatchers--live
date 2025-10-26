import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const ProductVariants = ({ 
  variants = [], 
  onVariantChange, 
  selectedVariants = {},
  className = '' 
}) => {
  const [selections, setSelections] = useState(selectedVariants);

  useEffect(() => {
    setSelections(selectedVariants);
  }, [selectedVariants]);

  const handleVariantSelect = (variantName, option) => {
    const newSelections = {
      ...selections,
      [variantName]: option
    };
    setSelections(newSelections);
    
    if (onVariantChange) {
      // Support both function signatures
      if (typeof onVariantChange === 'function' && onVariantChange.length === 2) {
        onVariantChange(variantName, option);
      } else {
        onVariantChange(newSelections);
      }
    }
  };

  const renderColorVariant = (variant) => (
    <div key={variant.name} className="mb-6">
      <h4 className="text-sm font-semibold text-gray-900 mb-3">
        {variant.name}: {selections[variant.name] && (
          <span className="font-normal text-gray-600">
            {selections[variant.name]}
          </span>
        )}
      </h4>
      <div className="flex flex-wrap gap-3">
        {variant.options.map((option) => {
          const isSelected = selections[variant.name] === option;
          const colorValue = variant.colorValues?.[option] || option.toLowerCase();
          
          return (
            <motion.button
              key={option}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleVariantSelect(variant.name, option)}
              className={`relative w-10 h-10 rounded-full border-2 transition-all duration-200 ${
                isSelected 
                  ? 'border-gray-900 shadow-lg' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              style={{ backgroundColor: colorValue }}
              aria-label={`Select ${option} color`}
              title={option}
            >
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute inset-0 rounded-full border-2 border-white shadow-inner"
                />
              )}
              {/* Checkmark for selected color */}
              {isSelected && (
                <svg 
                  className="absolute inset-0 w-full h-full text-white p-2" 
                  fill="currentColor" 
                  viewBox="0 0 20 20"
                >
                  <path 
                    fillRule="evenodd" 
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" 
                    clipRule="evenodd" 
                  />
                </svg>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );

  const renderSizeVariant = (variant) => (
    <div key={variant.name} className="mb-6">
      <h4 className="text-sm font-semibold text-gray-900 mb-3">
        {variant.name}: {selections[variant.name] && (
          <span className="font-normal text-gray-600">
            {selections[variant.name]}
          </span>
        )}
      </h4>
      <div className="flex flex-wrap gap-2">
        {variant.options.map((option) => {
          const isSelected = selections[variant.name] === option;
          const isOutOfStock = variant.stockStatus?.[option] === 'out_of_stock';
          
          return (
            <motion.button
              key={option}
              whileHover={!isOutOfStock ? { scale: 1.02 } : {}}
              whileTap={!isOutOfStock ? { scale: 0.98 } : {}}
              onClick={() => !isOutOfStock && handleVariantSelect(variant.name, option)}
              disabled={isOutOfStock}
              className={`px-4 py-2 border rounded-lg text-sm font-medium transition-all duration-200 ${
                isSelected
                  ? 'border-gray-900 bg-gray-900 text-white'
                  : isOutOfStock
                  ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed line-through'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50'
              }`}
              aria-label={`Select size ${option}`}
            >
              {option}
            </motion.button>
          );
        })}
      </div>
      {variant.sizeGuide && (
        <button
          onClick={() => window.open(variant.sizeGuide, '_blank')}
          className="mt-2 text-xs text-blue-600 hover:text-blue-700 underline"
        >
          Size Guide
        </button>
      )}
    </div>
  );

  const renderTextVariant = (variant) => (
    <div key={variant.name} className="mb-6">
      <h4 className="text-sm font-semibold text-gray-900 mb-3">
        {variant.name}
      </h4>
      <div className="flex flex-wrap gap-2">
        {variant.options.map((option) => {
          const isSelected = selections[variant.name] === option;
          
          return (
            <motion.button
              key={option}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleVariantSelect(variant.name, option)}
              className={`px-3 py-2 border rounded-md text-sm transition-all duration-200 ${
                isSelected
                  ? 'border-gray-900 bg-gray-900 text-white'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50'
              }`}
              aria-label={`Select ${option}`}
            >
              {option}
            </motion.button>
          );
        })}
      </div>
    </div>
  );

  const renderDropdownVariant = (variant) => (
    <div key={variant.name} className="mb-6">
      <h4 className="text-sm font-semibold text-gray-900 mb-3">
        {variant.name}
      </h4>
      <select
        value={selections[variant.name] || ''}
        onChange={(e) => handleVariantSelect(variant.name, e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
      >
        <option value="">Select {variant.name}</option>
        {variant.options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );

  const renderVariant = (variant) => {
    switch (variant.type) {
      case 'color':
        return renderColorVariant(variant);
      case 'size':
        return renderSizeVariant(variant);
      case 'dropdown':
        return renderDropdownVariant(variant);
      default:
        return renderTextVariant(variant);
    }
  };

  if (!variants || variants.length === 0) {
    return null;
  }

  return (
    <div className={`product-variants ${className}`}>
      {variants.map(renderVariant)}
      
      {/* Selected variants summary */}
      {Object.keys(selections).length > 0 && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <h5 className="text-xs font-semibold text-gray-700 mb-2">Selected Options:</h5>
          <div className="flex flex-wrap gap-2">
            {Object.entries(selections).map(([variantName, option]) => (
              <span
                key={variantName}
                className="inline-flex items-center px-2 py-1 bg-white border border-gray-200 rounded text-xs text-gray-700"
              >
                <span className="font-medium">{variantName}:</span>
                <span className="ml-1">{option}</span>
                <button
                  onClick={() => {
                    const newSelections = { ...selections };
                    delete newSelections[variantName];
                    setSelections(newSelections);
                    if (onVariantChange) {
                      onVariantChange(newSelections);
                    }
                  }}
                  className="ml-2 text-gray-400 hover:text-gray-600"
                  aria-label={`Remove ${variantName} selection`}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductVariants;
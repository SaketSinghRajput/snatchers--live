import React from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ActiveFilters = ({ filters, onRemoveFilter, onClearAll, className = '' }) => {
  const getFilterTags = () => {
    const tags = [];

    // Price range
    if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
      let priceText = 'Price: ';
      if (filters.priceMin !== undefined && filters.priceMax !== undefined) {
        priceText += `₹${filters.priceMin} - ₹${filters.priceMax}`;
      } else if (filters.priceMin !== undefined) {
        priceText += `Above ₹${filters.priceMin}`;
      } else {
        priceText += `Below ₹${filters.priceMax}`;
      }
      tags.push({
        key: 'price',
        label: priceText,
        onRemove: () => {
          onRemoveFilter('priceMin');
          onRemoveFilter('priceMax');
        }
      });
    }

    // Brands
    if (filters.brands && filters.brands.length > 0) {
      filters.brands.forEach(brand => {
        tags.push({
          key: `brand-${brand}`,
          label: `Brand: ${brand}`,
          onRemove: () => {
            const newBrands = filters.brands.filter(b => b !== brand);
            onRemoveFilter('brands', newBrands.length > 0 ? newBrands : undefined);
          }
        });
      });
    }

    // Categories
    if (filters.categories && filters.categories.length > 0) {
      filters.categories.forEach(category => {
        tags.push({
          key: `category-${category}`,
          label: `Category: ${category}`,
          onRemove: () => {
            const newCategories = filters.categories.filter(c => c !== category);
            onRemoveFilter('categories', newCategories.length > 0 ? newCategories : undefined);
          }
        });
      });
    }

    // Rating
    if (filters.rating !== undefined) {
      tags.push({
        key: 'rating',
        label: `Rating: ${filters.rating}★ & Up`,
        onRemove: () => onRemoveFilter('rating')
      });
    }

    // In Stock
    if (filters.inStock === true) {
      tags.push({
        key: 'inStock',
        label: 'In Stock Only',
        onRemove: () => onRemoveFilter('inStock')
      });
    }

    return tags;
  };

  const filterTags = getFilterTags();

  if (filterTags.length === 0) {
    return null;
  }

  return (
    <div className={`${className}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-gray-700">Active Filters:</span>
        
        <AnimatePresence>
          {filterTags.map((tag) => (
            <motion.div
              key={tag.key}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
              className="inline-flex items-center space-x-1 px-3 py-1 bg-red-100 text-red-800 text-sm rounded-full"
            >
              <span>{tag.label}</span>
              <button
                onClick={tag.onRemove}
                className="ml-1 p-0.5 hover:bg-red-200 rounded-full transition-colors"
                aria-label={`Remove ${tag.label} filter`}
              >
                <X size={12} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        {filterTags.length > 1 && (
          <button
            onClick={onClearAll}
            className="text-sm text-red-600 hover:text-red-700 font-medium transition-colors"
          >
            Clear All
          </button>
        )}
      </div>
    </div>
  );
};

export default ActiveFilters;
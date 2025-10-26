import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  ChevronDown, 
  ChevronUp, 
  RotateCcw,
  Check
} from 'lucide-react';

const MobileFilterDrawer = ({
  isOpen,
  onClose,
  filters = {},
  onFiltersChange,
  aggregations = {},
  onApplyFilters,
  onClearFilters
}) => {
  const [localFilters, setLocalFilters] = useState(filters);
  const [expandedSections, setExpandedSections] = useState({
    category: true,
    priceRange: true,
    brand: false,
    rating: false
  });

  // Update local filters when props change
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleFilterChange = (filterType, value, checked) => {
    setLocalFilters(prev => {
      const currentValues = prev[filterType] || [];
      const newFilters = { ...prev };
      
      if (checked) {
        newFilters[filterType] = [...currentValues, value];
      } else {
        const filteredValues = currentValues.filter(v => v !== value);
        if (filteredValues.length === 0) {
          delete newFilters[filterType];
        } else {
          newFilters[filterType] = filteredValues;
        }
      }
      
      return newFilters;
    });
  };

  const handlePriceRangeChange = (min, max) => {
    setLocalFilters(prev => ({
      ...prev,
      priceRange: { min, max }
    }));
  };

  const handleRatingChange = (rating) => {
    setLocalFilters(prev => ({
      ...prev,
      rating: prev.rating === rating ? null : rating
    }));
  };

  const applyFilters = () => {
    onFiltersChange(localFilters);
    if (onApplyFilters) {
      onApplyFilters(localFilters);
    }
    onClose();
  };

  const clearAllFilters = () => {
    const clearedFilters = {};
    setLocalFilters(clearedFilters);
    onFiltersChange(clearedFilters);
    if (onClearFilters) {
      onClearFilters();
    }
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    Object.entries(localFilters).forEach(([key, value]) => {
      if (key === 'priceRange' && value && (value.min || value.max)) {
        count++;
      } else if (key === 'rating' && value) {
        count++;
      } else if (Array.isArray(value) && value.length > 0) {
        count += value.length;
      }
    });
    return count;
  };

  const FilterSection = ({ title, children, sectionKey }) => (
    <div className="border-b border-gray-200 last:border-b-0">
      <button
        onClick={() => toggleSection(sectionKey)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="font-medium text-gray-900">{title}</span>
        {expandedSections[sectionKey] ? (
          <ChevronUp size={20} className="text-gray-500" />
        ) : (
          <ChevronDown size={20} className="text-gray-500" />
        )}
      </button>
      
      <AnimatePresence>
        {expandedSections[sectionKey] && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const CheckboxItem = ({ label, value, checked, onChange, count }) => (
    <label className="flex items-center justify-between py-2 cursor-pointer tap-target">
      <div className="flex items-center">
        <div className="relative">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(value, e.target.checked)}
            className="sr-only"
          />
          <div className={`w-5 h-5 border-2 rounded transition-colors ${
            checked 
              ? 'bg-red-600 border-red-600' 
              : 'border-gray-300 hover:border-gray-400'
          }`}>
            {checked && (
              <Check size={12} className="text-white absolute top-0.5 left-0.5" />
            )}
          </div>
        </div>
        <span className="ml-3 text-sm text-gray-700">{label}</span>
      </div>
      {count && (
        <span className="text-xs text-gray-500">({count})</span>
      )}
    </label>
  );

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 lg:hidden"
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black bg-opacity-50"
          onClick={onClose}
        />

        {/* Drawer */}
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="absolute bottom-0 left-0 right-0 bg-white rounded-t-xl max-h-[85vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center">
              <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
              {getActiveFiltersCount() > 0 && (
                <span className="ml-2 px-2 py-1 bg-red-100 text-red-600 text-xs font-medium rounded-full">
                  {getActiveFiltersCount()}
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={clearAllFilters}
                className="tap-target p-2 text-gray-500 hover:text-gray-700 transition-colors"
                aria-label="Clear all filters"
              >
                <RotateCcw size={18} />
              </button>
              <button
                onClick={onClose}
                className="tap-target p-2 text-gray-500 hover:text-gray-700 transition-colors"
                aria-label="Close filters"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto mobile-scroll">
            {/* Categories */}
            {aggregations.categories && aggregations.categories.length > 0 && (
              <FilterSection title="Categories" sectionKey="category">
                <div className="space-y-1">
                  {aggregations.categories.map((category) => (
                    <CheckboxItem
                      key={category.key}
                      label={category.key}
                      value={category.key}
                      checked={localFilters.categories?.includes(category.key) || false}
                      onChange={(value, checked) => handleFilterChange('categories', value, checked)}
                      count={category.doc_count}
                    />
                  ))}
                </div>
              </FilterSection>
            )}

            {/* Price Range */}
            <FilterSection title="Price Range" sectionKey="priceRange">
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">Min Price</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={localFilters.priceRange?.min || ''}
                      onChange={(e) => handlePriceRangeChange(
                        parseInt(e.target.value) || 0,
                        localFilters.priceRange?.max || null
                      )}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">Max Price</label>
                    <input
                      type="number"
                      placeholder="Any"
                      value={localFilters.priceRange?.max || ''}
                      onChange={(e) => handlePriceRangeChange(
                        localFilters.priceRange?.min || 0,
                        parseInt(e.target.value) || null
                      )}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                </div>

                {/* Quick price ranges */}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Under ₹500', min: 0, max: 500 },
                    { label: '₹500 - ₹1000', min: 500, max: 1000 },
                    { label: '₹1000 - ₹5000', min: 1000, max: 5000 },
                    { label: 'Above ₹5000', min: 5000, max: null }
                  ].map((range) => (
                    <button
                      key={range.label}
                      onClick={() => handlePriceRangeChange(range.min, range.max)}
                      className={`px-3 py-2 text-xs border rounded-md transition-colors ${
                        localFilters.priceRange?.min === range.min && 
                        localFilters.priceRange?.max === range.max
                          ? 'bg-red-600 text-white border-red-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {range.label}
                    </button>
                  ))}
                </div>
              </div>
            </FilterSection>

            {/* Brands */}
            {aggregations.brands && aggregations.brands.length > 0 && (
              <FilterSection title="Brands" sectionKey="brand">
                <div className="space-y-1">
                  {aggregations.brands.slice(0, 10).map((brand) => (
                    <CheckboxItem
                      key={brand.key}
                      label={brand.key}
                      value={brand.key}
                      checked={localFilters.brands?.includes(brand.key) || false}
                      onChange={(value, checked) => handleFilterChange('brands', value, checked)}
                      count={brand.doc_count}
                    />
                  ))}
                </div>
              </FilterSection>
            )}

            {/* Rating */}
            <FilterSection title="Customer Rating" sectionKey="rating">
              <div className="space-y-2">
                {[4, 3, 2, 1].map((rating) => (
                  <button
                    key={rating}
                    onClick={() => handleRatingChange(rating)}
                    className={`w-full flex items-center justify-between p-2 rounded-md transition-colors ${
                      localFilters.rating === rating
                        ? 'bg-red-50 border border-red-200'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center">
                      <div className="flex text-yellow-400 text-sm">
                        {[...Array(5)].map((_, i) => (
                          <span key={i} className={i < rating ? 'opacity-100' : 'opacity-30'}>
                            ★
                          </span>
                        ))}
                      </div>
                      <span className="ml-2 text-sm text-gray-700">& Up</span>
                    </div>
                    {localFilters.rating === rating && (
                      <Check size={16} className="text-red-600" />
                    )}
                  </button>
                ))}
              </div>
            </FilterSection>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 safe-area-bottom">
            <div className="flex space-x-3">
              <button
                onClick={clearAllFilters}
                className="flex-1 py-3 px-4 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Clear All
              </button>
              <button
                onClick={applyFilters}
                className="flex-1 py-3 px-4 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default MobileFilterDrawer;
import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, X, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const FilterSidebar = ({ 
  filters, 
  onFiltersChange, 
  aggregations = {}, 
  isOpen, 
  onToggle,
  className = '' 
}) => {
  // Single-open accordion: null means all closed
  const [openSection, setOpenSection] = useState(null);

  // Debug: log current open section whenever it changes
  useEffect(() => {
    try {
      console.log('Current open section is:', openSection);
    } catch {}
  }, [openSection]);

  const [localFilters, setLocalFilters] = useState(filters);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  // Wrapper to match requested debug signature
  const handleToggleSection = (sectionId) => {
    try {
      console.log('CLICKED HEADER:', sectionId);
    } catch {}
    setOpenSection(currentOpenSection =>
      currentOpenSection === sectionId ? null : sectionId
    );
  };

  const updateFilter = (key, value) => {
    const newFilters = { ...localFilters };
    if (value === undefined || value === null || (Array.isArray(value) && value.length === 0)) {
      delete newFilters[key];
    } else {
      newFilters[key] = value;
    }
    setLocalFilters(newFilters);
    if (onFiltersChange) {
      onFiltersChange(newFilters);
    }
  };

  const toggleArrayFilter = (key, value) => {
    const currentArray = localFilters[key] || [];
    const newArray = currentArray.includes(value)
      ? currentArray.filter(item => item !== value)
      : [...currentArray, value];
    
    const newFilters = { ...localFilters };
    if (newArray.length > 0) {
      newFilters[key] = newArray;
    } else {
      delete newFilters[key];
    }
    setLocalFilters(newFilters);
    if (onFiltersChange) {
      onFiltersChange(newFilters);
    }
  };

  const handleCheckboxChange = (key, value, event) => {
    event.preventDefault();
    event.stopPropagation();
    toggleArrayFilter(key, value);
  };

  const clearAllFilters = () => {
    const clearedFilters = {};
    setLocalFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  const hasActiveFilters = Object.keys(localFilters).some(key => {
    const value = localFilters[key];
    return value !== undefined && value !== null && 
           (Array.isArray(value) ? value.length > 0 : true);
  });

  const FilterSection = ({ sectionId, title, isExpanded, onToggle, children }) => (
    <div className="filter-section border-b border-gray-200 pb-4 mb-4">
      <button
        type="button"
        onClick={onToggle}
        className="filter-header flex items-center justify-between w-full text-left font-medium text-gray-900 hover:text-red-600 transition-colors"
      >
        <span>{title}</span>
        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      <AnimatePresence>
        {isExpanded && (
          (console.log('Rendering content for:', sectionId),
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="filter-content mt-3 overflow-hidden"
          >
            {children}
          </motion.div>)
        )}
      </AnimatePresence>
    </div>
  );

  const PriceRangeFilter = () => (
    <FilterSection
      sectionId="price"
      title="Price Range"
      isExpanded={openSection === 'price'}
      onToggle={() => handleToggleSection('price')}
    >
      <div className="space-y-3">
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Min"
            value={localFilters.priceMin || ''}
            onChange={(e) => updateFilter('priceMin', e.target.value ? parseFloat(e.target.value) : undefined)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
          <input
            type="number"
            placeholder="Max"
            value={localFilters.priceMax || ''}
            onChange={(e) => updateFilter('priceMax', e.target.value ? parseFloat(e.target.value) : undefined)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>
        
        {/* Quick price range buttons */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Under ₹500', min: 0, max: 500 },
            { label: '₹500-₹1000', min: 500, max: 1000 },
            { label: '₹1000-₹2500', min: 1000, max: 2500 },
            { label: 'Above ₹2500', min: 2500, max: undefined }
          ].map((range) => (
            <button
              key={range.label}
              onClick={() => {
                updateFilter('priceMin', range.min);
                updateFilter('priceMax', range.max);
              }}
              className="px-3 py-2 text-xs border border-gray-300 rounded-md hover:bg-red-50 hover:border-red-300 transition-colors"
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>
    </FilterSection>
  );

  const BrandsFilter = () => (
    <FilterSection
      sectionId="brands"
      title="Brands"
      isExpanded={openSection === 'brands'}
      onToggle={() => handleToggleSection('brands')}
    >
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {(aggregations.brands || []).length === 0 ? (
          <p className="text-sm text-gray-500">No brands available</p>
        ) : (
          (aggregations.brands || []).map((brand) => (
            <label key={brand.key} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
              <input
                type="checkbox"
                checked={(localFilters.brands || []).includes(brand.key)}
                onChange={(e) => handleCheckboxChange('brands', brand.key, e)}
                className="rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer"
              />
              <span className="text-sm text-gray-700 flex-1">{brand.key}</span>
              {brand.doc_count > 0 && (
                <span className="text-xs text-gray-500">({brand.doc_count})</span>
              )}
            </label>
          ))
        )}
      </div>
    </FilterSection>
  );

  const CategoriesFilter = () => (
    <FilterSection
      sectionId="categories"
      title="Categories"
      isExpanded={openSection === 'categories'}
      onToggle={() => handleToggleSection('categories')}
    >
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {(aggregations.categories || []).length === 0 ? (
          <p className="text-sm text-gray-500">No categories available</p>
        ) : (
          (aggregations.categories || []).map((category) => (
            <label key={category.key} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
              <input
                type="checkbox"
                checked={(localFilters.categories || []).includes(category.key)}
                onChange={(e) => handleCheckboxChange('categories', category.key, e)}
                className="rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer"
              />
              <span className="text-sm text-gray-700 flex-1">{category.key}</span>
              {category.doc_count > 0 && (
                <span className="text-xs text-gray-500">({category.doc_count})</span>
              )}
            </label>
          ))
        )}
      </div>
    </FilterSection>
  );

  const RatingFilter = () => (
    <FilterSection
      sectionId="rating"
      title="Customer Rating"
      isExpanded={openSection === 'rating'}
      onToggle={() => handleToggleSection('rating')}
    >
      <div className="space-y-2">
        {[4, 3, 2, 1].map((rating) => (
          <label key={rating} className="flex items-center space-x-2 cursor-pointer">
            <input
              type="radio"
              name="rating"
              checked={localFilters.rating === rating}
              onChange={() => updateFilter('rating', rating)}
              className="text-red-600 focus:ring-red-500"
            />
            <div className="flex items-center space-x-1">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <span
                    key={i}
                    className={`text-sm ${i < rating ? 'text-yellow-400' : 'text-gray-300'}`}
                  >
                    ★
                  </span>
                ))}
              </div>
              <span className="text-sm text-gray-700">& Up</span>
            </div>
          </label>
        ))}
      </div>
    </FilterSection>
  );

  const AvailabilityFilter = () => (
    <FilterSection
      sectionId="availability"
      title="Availability"
      isExpanded={openSection === 'availability'}
      onToggle={() => handleToggleSection('availability')}
    >
      <div className="space-y-2">
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={localFilters.inStock === true}
            onChange={(e) => updateFilter('inStock', e.target.checked ? true : undefined)}
            className="rounded border-gray-300 text-red-600 focus:ring-red-500"
          />
          <span className="text-sm text-gray-700">In Stock Only</span>
        </label>
      </div>
    </FilterSection>
  );

  return (
    <>
      {/* Mobile Filter Toggle Button */}
      <div className="lg:hidden mb-4">
        <button
          onClick={onToggle}
          className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 transition-colors"
        >
          <Filter size={16} />
          <span>Filters</span>
          {hasActiveFilters && (
            <span className="bg-red-600 text-white text-xs px-2 py-1 rounded-full">
              {Object.keys(localFilters).filter(key => {
                const value = localFilters[key];
                return value !== undefined && value !== null && 
                       (Array.isArray(value) ? value.length > 0 : true);
              }).length}
            </span>
          )}
        </button>
      </div>

      {/* Filter Sidebar */}
      <AnimatePresence>
        <motion.div
          initial={{ x: -300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -300, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className={`
            filter-sidebar fixed lg:relative top-0 left-0 h-full lg:h-auto w-80 lg:w-full 
            bg-white lg:bg-transparent border-r lg:border-r-0 border-gray-200 
            shadow-lg lg:shadow-none z-50 lg:z-auto overflow-y-auto
            ${className}
          `}
          data-component="FilterSidebar"
        >
            {/* Mobile Header */}
            <div className="lg:hidden flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
              <button
                onClick={onToggle}
                className="p-2 hover:bg-gray-100 rounded-md transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 lg:p-0">
              {/* Desktop Header */}
              <div className="hidden lg:flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
                {hasActiveFilters && (
                  <button
                    onClick={clearAllFilters}
                    className="text-sm text-red-600 hover:text-red-700 transition-colors"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {/* Filter Sections */}
              <div className="space-y-6">
                <PriceRangeFilter />
                <BrandsFilter />
                <CategoriesFilter />
                <RatingFilter />
                <AvailabilityFilter />
              </div>

              {/* Mobile Clear Button */}
              {hasActiveFilters && (
                <div className="lg:hidden mt-6 pt-4 border-t border-gray-200">
                  <button
                    onClick={clearAllFilters}
                    className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                  >
                    Clear All Filters
                  </button>
                </div>
              )}
            </div>
          </motion.div>
      </AnimatePresence>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={onToggle}
        />
      )}
    </>
  );
};

export default FilterSidebar;
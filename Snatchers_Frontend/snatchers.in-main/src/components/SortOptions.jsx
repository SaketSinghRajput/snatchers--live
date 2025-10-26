import React from 'react';
import { ChevronDown } from 'lucide-react';

const SortOptions = ({ sortBy, onSortChange, className = '' }) => {
  const sortOptions = [
    { value: 'relevance', label: 'Relevance' },
    { value: 'price_low_to_high', label: 'Price: Low to High' },
    { value: 'price_high_to_low', label: 'Price: High to Low' },
    { value: 'rating', label: 'Customer Rating' },
    { value: 'popularity', label: 'Popularity' },
    { value: 'newest', label: 'Newest First' }
  ];

  const currentSort = sortOptions.find(option => option.value === sortBy) || sortOptions[0];

  return (
    <div className={`relative ${className}`}>
      <label htmlFor="sort-select" className="sr-only">
        Sort products by
      </label>
      <div className="relative">
        <select
          id="sort-select"
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value)}
          className="appearance-none bg-white border border-gray-300 rounded-md px-4 py-2 pr-8 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent cursor-pointer"
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <ChevronDown size={16} className="text-gray-400" />
        </div>
      </div>
    </div>
  );
};

export default SortOptions;
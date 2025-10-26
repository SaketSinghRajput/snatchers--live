import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'react-toastify';

const ComparisonContext = createContext();

export const useComparison = () => {
  const context = useContext(ComparisonContext);
  if (!context) {
    throw new Error('useComparison must be used within a ComparisonProvider');
  }
  return context;
};

export const ComparisonProvider = ({ children }) => {
  const [comparisonList, setComparisonList] = useState([]);
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);
  const maxComparisonItems = 4;

  // Load comparison list from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('productComparison');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setComparisonList(parsed);
        }
      }
    } catch (error) {
      console.error('Error loading comparison list:', error);
    }
  }, []);

  // Save to localStorage whenever comparison list changes
  useEffect(() => {
    try {
      localStorage.setItem('productComparison', JSON.stringify(comparisonList));
    } catch (error) {
      console.error('Error saving comparison list:', error);
    }
  }, [comparisonList]);

  const addToComparison = (product) => {
    if (!product || !product._id) {
      toast.error('Invalid product');
      return false;
    }

    // Check if product is already in comparison
    if (comparisonList.some(item => item._id === product._id)) {
      toast.info('Product is already in comparison');
      return false;
    }

    // Check if comparison list is full
    if (comparisonList.length >= maxComparisonItems) {
      toast.error(`You can compare maximum ${maxComparisonItems} products`);
      return false;
    }

    // Add product to comparison
    const comparisonProduct = {
      _id: product._id,
      title: product.title,
      price: product.price,
      offerPrice: product.offerPrice,
      images: product.images || [],
      rating: product.rating || 0,
      brand: product.brand,
      category: product.category,
      specifications: product.specifications || [],
      variants: product.variants || [],
      description: product.description,
      addedAt: new Date().toISOString()
    };

    setComparisonList(prev => [...prev, comparisonProduct]);
    toast.success('Added to comparison');
    return true;
  };

  const removeFromComparison = (productId) => {
    setComparisonList(prev => prev.filter(item => item._id !== productId));
    toast.success('Removed from comparison');
  };

  const clearComparison = () => {
    setComparisonList([]);
    setIsComparisonOpen(false);
    toast.success('Comparison cleared');
  };

  const isInComparison = (productId) => {
    return comparisonList.some(item => item._id === productId);
  };

  const toggleComparison = () => {
    if (comparisonList.length === 0) {
      toast.info('Add products to comparison first');
      return;
    }
    setIsComparisonOpen(!isComparisonOpen);
  };

  const openComparison = () => {
    if (comparisonList.length === 0) {
      toast.info('Add products to comparison first');
      return;
    }
    setIsComparisonOpen(true);
  };

  const closeComparison = () => {
    setIsComparisonOpen(false);
  };

  // Get comparison statistics
  const getComparisonStats = () => {
    if (comparisonList.length === 0) {
      return null;
    }

    const prices = comparisonList.map(item => item.offerPrice || item.price);
    const ratings = comparisonList.map(item => item.rating || 0);

    return {
      count: comparisonList.length,
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
      avgRating: ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length,
      categories: [...new Set(comparisonList.map(item => item.category))],
      brands: [...new Set(comparisonList.map(item => item.brand).filter(Boolean))]
    };
  };

  // Get all unique specifications across compared products
  const getAllSpecifications = () => {
    const allSpecs = new Set();
    comparisonList.forEach(product => {
      if (product.specifications) {
        product.specifications.forEach(spec => {
          allSpecs.add(spec.name);
        });
      }
    });
    return Array.from(allSpecs).sort();
  };

  // Get specification value for a product
  const getSpecificationValue = (product, specName) => {
    if (!product.specifications) return '-';
    const spec = product.specifications.find(s => s.name === specName);
    return spec ? spec.value : '-';
  };

  const value = {
    comparisonList,
    isComparisonOpen,
    maxComparisonItems,
    addToComparison,
    removeFromComparison,
    clearComparison,
    isInComparison,
    toggleComparison,
    openComparison,
    closeComparison,
    getComparisonStats,
    getAllSpecifications,
    getSpecificationValue
  };

  return (
    <ComparisonContext.Provider value={value}>
      {children}
    </ComparisonContext.Provider>
  );
};
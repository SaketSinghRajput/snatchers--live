import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaArrowLeft } from 'react-icons/fa';
import ComparisonTable from '../components/ProductComparison/ComparisonTable';
import { useComparison } from '../components/ProductComparison/ComparisonContext';
import SEOHead from '../components/SEO/SEOHead';

const ComparisonPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { comparisonList } = useComparison();
  const [products, setProducts] = useState([]);

  useEffect(() => {
    // Get products from location state or comparison context
    const stateProducts = location.state?.products;
    if (stateProducts && stateProducts.length > 0) {
      setProducts(stateProducts);
    } else if (comparisonList.length > 0) {
      setProducts(comparisonList);
    } else {
      // No products to compare, redirect to shop
      navigate('/shop');
    }
  }, [location.state, comparisonList, navigate]);

  const handleGoBack = () => {
    navigate(-1);
  };

  if (products.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading comparison...</p>
        </div>
      </div>
    );
  }

  // Generate SEO data
  const productTitles = products.map(p => p.title).join(', ');
  const seoTitle = `Compare ${products.length} Products - ${productTitles.substring(0, 50)}${productTitles.length > 50 ? '...' : ''} | Snatchers`;
  const seoDescription = `Compare ${products.length} products side by side. Find the best deals and features for ${productTitles.substring(0, 100)}${productTitles.length > 100 ? '...' : ''}`;

  return (
    <>
      <SEOHead
        title={seoTitle}
        description={seoDescription}
        canonical={`${window.location.origin}/compare`}
        noIndex={true} // Comparison pages are typically not indexed
      />
      
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-8"
          >
            <button
              onClick={handleGoBack}
              className="inline-flex items-center text-gray-600 hover:text-gray-900 font-medium mb-4 transition-colors"
            >
              <FaArrowLeft className="mr-2" />
              Back to Shopping
            </button>
          </motion.div>

          {/* Comparison Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <ComparisonTable products={products} />
          </motion.div>

          {/* Help Text */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4"
          >
            <h3 className="text-sm font-medium text-blue-900 mb-2">
              Comparison Tips
            </h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Use "Show differences only" to highlight unique features</li>
              <li>• Click "View Details" to see the full product page</li>
              <li>• Remove products you don't need by clicking the × button</li>
              <li>• Add products to cart or wishlist directly from the comparison</li>
            </ul>
          </motion.div>

          {/* Recommended Actions */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-6 text-center"
          >
            <p className="text-gray-600 mb-4">
              Need more products to compare?
            </p>
            <button
              onClick={() => navigate('/shop')}
              className="bg-black text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors"
            >
              Browse More Products
            </button>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default ComparisonPage;
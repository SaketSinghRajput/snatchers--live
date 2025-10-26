import React, { useState, useEffect } from 'react';
import { 
  FiPackage, 
  FiEye, 
  FiShoppingCart,
  FiTrendingUp,
  FiBarChart2,
  FiAlertTriangle,
  FiCheckCircle
} from 'react-icons/fi';
import api from '../../api';

const ProductAnalytics = ({ dateRange, refreshTrigger }) => {
  const [productData, setProductData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchProductData();
  }, [dateRange, refreshTrigger]);

  const fetchProductData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      
      switch (dateRange) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
        case '1y':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
      }

      params.append('startDate', startDate.toISOString());
      params.append('endDate', endDate.toISOString());
      params.append('limit', '20');

      const response = await api.get(`/api/analytics/products?${params}`);
      
      if (response.data.success) {
        setProductData(response.data.data);
      } else {
        throw new Error(response.data.error || 'Failed to fetch product data');
      }
    } catch (error) {
      console.error('Error fetching product data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="bg-white rounded-lg shadow p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-24 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-32"></div>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-lg shadow p-6 animate-pulse">
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <div className="text-red-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading product data</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
        <button
          onClick={fetchProductData}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const inventoryStats = productData?.inventoryStatus || {};

  return (
    <div className="space-y-6">
      {/* Inventory Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-blue-100">
              <FiPackage className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Products</p>
              <p className="text-2xl font-bold text-gray-900">
                {inventoryStats.totalProducts || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-green-100">
              <FiCheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Products</p>
              <p className="text-2xl font-bold text-gray-900">
                {inventoryStats.activeProducts || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-yellow-100">
              <FiAlertTriangle className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Low Stock</p>
              <p className="text-2xl font-bold text-gray-900">
                {inventoryStats.lowStockProducts || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-red-100">
              <FiAlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Out of Stock</p>
              <p className="text-2xl font-bold text-gray-900">
                {inventoryStats.outOfStockProducts || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Most Viewed Products */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <FiEye className="w-5 h-5 mr-2" />
          Most Viewed Products
        </h3>
        
        {productData?.mostViewedProducts?.length > 0 ? (
          <div className="space-y-4">
            {productData.mostViewedProducts.slice(0, 10).map((product, index) => (
              <div key={index} className="flex items-center space-x-4 p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                  {product.productImage ? (
                    <img 
                      src={product.productImage} 
                      alt={product.productTitle}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <FiPackage className="w-6 h-6 text-gray-400" />
                  )}
                </div>
                
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 truncate">
                    {product.productTitle}
                  </h4>
                  <p className="text-sm text-gray-500">
                    {product.uniqueViewerCount} unique viewers
                  </p>
                </div>
                
                <div className="text-right">
                  <p className="font-semibold text-gray-900 flex items-center">
                    <FiEye className="w-4 h-4 mr-1" />
                    {product.viewCount}
                  </p>
                  <p className="text-sm text-gray-500">views</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No product view data available
          </div>
        )}
      </div>

      {/* Best Selling Products */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <FiTrendingUp className="w-5 h-5 mr-2" />
          Best Selling Products
        </h3>
        
        {productData?.bestSellingProducts?.length > 0 ? (
          <div className="space-y-4">
            {productData.bestSellingProducts.slice(0, 10).map((product, index) => (
              <div key={index} className="flex items-center space-x-4 p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                  {product.productImage ? (
                    <img 
                      src={product.productImage} 
                      alt={product.productTitle}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <FiPackage className="w-6 h-6 text-gray-400" />
                  )}
                </div>
                
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 truncate">
                    {product.productTitle}
                  </h4>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>{product.category}</span>
                    {product.brand && <span>• {product.brand}</span>}
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="font-semibold text-gray-900">
                    {formatCurrency(product.totalRevenue)}
                  </p>
                  <p className="text-sm text-gray-500">
                    {product.totalQuantity} units • {product.orderCount} orders
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No sales data available
          </div>
        )}
      </div>

      {/* Category Performance */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <FiBarChart2 className="w-5 h-5 mr-2" />
          Category Performance
        </h3>
        
        {productData?.categoryPerformance?.length > 0 ? (
          <div className="space-y-4">
            {productData.categoryPerformance.slice(0, 8).map((category, index) => {
              const maxSales = Math.max(...productData.categoryPerformance.map(c => c.totalSales));
              const width = maxSales > 0 ? (category.totalSales / maxSales) * 100 : 0;
              
              return (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-900">{category._id}</span>
                    <div className="text-right">
                      <span className="font-semibold text-gray-900">
                        {formatCurrency(category.totalSales)}
                      </span>
                      <p className="text-sm text-gray-500">
                        {category.totalQuantity} units • {category.orderCount} orders
                      </p>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${Math.max(width, 2)}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No category performance data available
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductAnalytics;
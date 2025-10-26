import React, { useState, useEffect } from 'react';
import { 
  FiPlus, 
  FiTrash2, 
  FiSearch,
  FiStar,
  FiPackage,
  FiEye
} from 'react-icons/fi';
import api from '../api';
import AdminDashboard from './AdminDashboard';

const FeaturedProductsManager = () => {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    total: 0
  });

  useEffect(() => {
    fetchFeaturedProducts();
  }, [pagination.currentPage]);

  useEffect(() => {
    if (showAddModal) {
      fetchAllProducts();
    }
  }, [showAddModal, searchTerm]);

  const fetchFeaturedProducts = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/admin/featured-products?page=${pagination.currentPage}&limit=20`);
      setFeaturedProducts(response.data.products);
      setPagination({
        currentPage: response.data.currentPage,
        totalPages: response.data.totalPages,
        total: response.data.total
      });
    } catch (err) {
      setError('Failed to fetch featured products');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllProducts = async () => {
    try {
      const params = new URLSearchParams({
        page: 1,
        limit: 50
      });
      
      if (searchTerm) {
        params.append('search', searchTerm);
      }

      const response = await api.get(`/api/products?${params}`);
      // Filter out products that are already featured
      const featuredIds = new Set(featuredProducts.map(p => p._id));
      const nonFeaturedProducts = response.data.filter(product => !featuredIds.has(product._id));
      setAllProducts(nonFeaturedProducts);
    } catch (err) {
      console.error('Failed to fetch products:', err);
    }
  };

  const handleAddToFeatured = async (productIds) => {
    try {
      const promises = productIds.map(productId => 
        api.post(`/api/admin/featured-products/${productId}`)
      );
      
      await Promise.all(promises);
      await fetchFeaturedProducts();
      setShowAddModal(false);
      setSelectedProducts([]);
      setSearchTerm('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add products to featured');
    }
  };

  const handleRemoveFromFeatured = async (productId) => {
    if (!window.confirm('Are you sure you want to remove this product from featured?')) return;
    
    try {
      await api.delete(`/api/admin/featured-products/${productId}`);
      await fetchFeaturedProducts();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to remove product from featured');
    }
  };

  const handleProductSelect = (productId) => {
    setSelectedProducts(prev => {
      if (prev.includes(productId)) {
        return prev.filter(id => id !== productId);
      } else {
        return [...prev, productId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedProducts.length === allProducts.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(allProducts.map(p => p._id));
    }
  };

  if (loading && featuredProducts.length === 0) {
    return (
      <AdminDashboard>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading featured products...</div>
        </div>
      </AdminDashboard>
    );
  }

  return (
    <AdminDashboard>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Featured Products</h1>
            <p className="text-gray-600">Manage products that appear in featured sections</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <FiPlus className="w-4 h-4 mr-2" />
            Add Products
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Add Products Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Add Products to Featured</h2>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setSelectedProducts([]);
                    setSearchTerm('');
                  }}
                  className="p-2 hover:bg-gray-100 rounded"
                >
                  ×
                </button>
              </div>

              {/* Search */}
              <div className="mb-4">
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Select All */}
              {allProducts.length > 0 && (
                <div className="mb-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedProducts.length === allProducts.length}
                      onChange={handleSelectAll}
                      className="mr-2"
                    />
                    Select All ({allProducts.length} products)
                  </label>
                </div>
              )}

              {/* Products List */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {allProducts.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    {searchTerm ? 'No products found matching your search.' : 'All products are already featured.'}
                  </div>
                ) : (
                  allProducts.map((product) => (
                    <div
                      key={product._id}
                      className={`flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                        selectedProducts.includes(product._id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                      }`}
                      onClick={() => handleProductSelect(product._id)}
                    >
                      <input
                        type="checkbox"
                        checked={selectedProducts.includes(product._id)}
                        onChange={() => handleProductSelect(product._id)}
                        className="mr-3"
                      />
                      <img
                        src={product.images?.[0]}
                        alt={product.title}
                        className="w-12 h-12 object-cover rounded"
                      />
                      <div className="ml-3 flex-1">
                        <div className="font-medium text-gray-900">{product.title}</div>
                        <div className="text-sm text-gray-500">
                          ₹{product.offerPrice || product.price}
                          {product.category && ` • ${product.category}`}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-3 mt-6 pt-4 border-t">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setSelectedProducts([]);
                    setSearchTerm('');
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleAddToFeatured(selectedProducts)}
                  disabled={selectedProducts.length === 0}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FiStar className="w-4 h-4 mr-2" />
                  Add {selectedProducts.length} Product{selectedProducts.length !== 1 ? 's' : ''} to Featured
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Featured Products Grid */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">
                Featured Products ({pagination.total})
              </h2>
            </div>
          </div>
          
          {featuredProducts.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <FiPackage className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <div className="text-lg font-medium mb-2">No featured products</div>
              <div className="text-sm">Add products to the featured collection to showcase them on your site.</div>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {featuredProducts.map((product) => (
                <div key={product._id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <img
                        src={product.images?.[0]}
                        alt={product.title}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                      
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="text-lg font-medium text-gray-900">
                            {product.title}
                          </h3>
                          <FiStar className="w-4 h-4 text-yellow-500" />
                        </div>
                        <div className="text-sm text-gray-500">
                          ₹{product.offerPrice || product.price}
                          {product.category && ` • ${product.category}`}
                          {product.brand && ` • ${product.brand}`}
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                          <span className="flex items-center">
                            <FiEye className="w-3 h-3 mr-1" />
                            {product.viewCount || 0} views
                          </span>
                          <span>
                            {product.salesCount || 0} sales
                          </span>
                          <span>
                            ⭐ {product.averageRating || 0} ({product.reviewCount || 0} reviews)
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => window.open(`/product/${product._id}`, '_blank')}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                        title="View Product"
                      >
                        <FiEye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleRemoveFromFeatured(product._id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                        title="Remove from Featured"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing {((pagination.currentPage - 1) * 20) + 1} to{' '}
                  {Math.min(pagination.currentPage * 20, pagination.total)} of{' '}
                  {pagination.total} results
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setPagination({ ...pagination, currentPage: pagination.currentPage - 1 })}
                    disabled={pagination.currentPage === 1}
                    className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1">
                    Page {pagination.currentPage} of {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => setPagination({ ...pagination, currentPage: pagination.currentPage + 1 })}
                    disabled={pagination.currentPage === pagination.totalPages}
                    className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminDashboard>
  );
};

export default FeaturedProductsManager;
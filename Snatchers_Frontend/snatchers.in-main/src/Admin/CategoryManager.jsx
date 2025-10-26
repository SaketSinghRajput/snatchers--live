import React, { useState, useEffect } from 'react';
import { 
  FiPlus, 
  FiEdit2, 
  FiTrash2, 
  FiChevronRight, 
  FiChevronDown,
  FiFolder,
  FiFolderMinus,
  FiSave,
  FiX
} from 'react-icons/fi';
import api from '../api';
import AdminDashboard from './AdminDashboard';

const CategoryManager = () => {
  const [categories, setCategories] = useState([]);
  const [flatCategories, setFlatCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState(new Set());

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    parent: '',
    image: '',
    icon: '',
    isActive: true,
    isFeatured: false,
    sortOrder: 0,
    seo: {
      metaTitle: '',
      metaDescription: '',
      keywords: []
    }
  });

  useEffect(() => {
    fetchCategories();
    fetchFlatCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/admin/categories');
      setCategories(response.data);
    } catch (err) {
      setError('Failed to fetch categories');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFlatCategories = async () => {
    try {
      const response = await api.get('/api/admin/categories?flat=true');
      setFlatCategories(response.data);
    } catch (err) {
      console.error('Failed to fetch flat categories:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await api.put(`/api/admin/categories/${editingCategory._id}`, formData);
      } else {
        await api.post('/api/admin/categories', formData);
      }
      
      await fetchCategories();
      await fetchFlatCategories();
      resetForm();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save category');
    }
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      parent: category.parent?._id || '',
      image: category.image || '',
      icon: category.icon || '',
      isActive: category.isActive,
      isFeatured: category.isFeatured,
      sortOrder: category.sortOrder,
      seo: {
        metaTitle: category.seo?.metaTitle || '',
        metaDescription: category.seo?.metaDescription || '',
        keywords: category.seo?.keywords || []
      }
    });
    setShowForm(true);
  };

  const handleDelete = async (categoryId) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;
    
    try {
      await api.delete(`/api/admin/categories/${categoryId}`);
      await fetchCategories();
      await fetchFlatCategories();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete category');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      parent: '',
      image: '',
      icon: '',
      isActive: true,
      isFeatured: false,
      sortOrder: 0,
      seo: {
        metaTitle: '',
        metaDescription: '',
        keywords: []
      }
    });
    setEditingCategory(null);
    setShowForm(false);
  };

  const toggleExpanded = (categoryId) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const renderCategoryTree = (categories, level = 0) => {
    return categories.map((category) => (
      <div key={category._id} className="border-b border-gray-100">
        <div 
          className={`flex items-center justify-between p-3 hover:bg-gray-50 ${
            level > 0 ? `ml-${level * 6}` : ''
          }`}
          style={{ paddingLeft: `${level * 24 + 12}px` }}
        >
          <div className="flex items-center space-x-3">
            {category.children && category.children.length > 0 ? (
              <button
                onClick={() => toggleExpanded(category._id)}
                className="p-1 hover:bg-gray-200 rounded"
              >
                {expandedCategories.has(category._id) ? (
                  <FiChevronDown className="w-4 h-4" />
                ) : (
                  <FiChevronRight className="w-4 h-4" />
                )}
              </button>
            ) : (
              <div className="w-6"></div>
            )}
            
            {category.children && category.children.length > 0 ? (
              expandedCategories.has(category._id) ? (
                <FiFolderMinus className="w-5 h-5 text-blue-500" />
              ) : (
                <FiFolder className="w-5 h-5 text-blue-500" />
              )
            ) : (
              <div className="w-5 h-5 bg-gray-300 rounded"></div>
            )}
            
            <div>
              <div className="font-medium text-gray-900">{category.name}</div>
              <div className="text-sm text-gray-500">
                {category.productCount} products • Level {category.level}
                {!category.isActive && <span className="text-red-500 ml-2">Inactive</span>}
                {category.isFeatured && <span className="text-green-500 ml-2">Featured</span>}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleEdit(category)}
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
            >
              <FiEdit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDelete(category._id)}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
            >
              <FiTrash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {category.children && 
         category.children.length > 0 && 
         expandedCategories.has(category._id) && (
          <div>
            {renderCategoryTree(category.children, level + 1)}
          </div>
        )}
      </div>
    ));
  };

  if (loading) {
    return (
      <AdminDashboard>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading categories...</div>
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
            <h1 className="text-2xl font-bold text-gray-900">Category Management</h1>
            <p className="text-gray-600">Manage your product categories and hierarchy</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <FiPlus className="w-4 h-4 mr-2" />
            Add Category
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Category Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">
                  {editingCategory ? 'Edit Category' : 'Add New Category'}
                </h2>
                <button
                  onClick={resetForm}
                  className="p-2 hover:bg-gray-100 rounded"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Parent Category
                    </label>
                    <select
                      value={formData.parent}
                      onChange={(e) => setFormData({ ...formData, parent: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">No Parent (Root Category)</option>
                      {flatCategories
                        .filter(cat => cat._id !== editingCategory?._id)
                        .map((category) => (
                        <option key={category._id} value={category._id}>
                          {'  '.repeat(category.level)} {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Image URL
                    </label>
                    <input
                      type="url"
                      value={formData.image}
                      onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sort Order
                    </label>
                    <input
                      type="number"
                      value={formData.sortOrder}
                      onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-6">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="mr-2"
                    />
                    Active
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.isFeatured}
                      onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                      className="mr-2"
                    />
                    Featured
                  </label>
                </div>

                {/* SEO Section */}
                <div className="border-t pt-4">
                  <h3 className="text-lg font-medium mb-3">SEO Settings</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Meta Title
                      </label>
                      <input
                        type="text"
                        value={formData.seo.metaTitle}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          seo: { ...formData.seo, metaTitle: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Meta Description
                      </label>
                      <textarea
                        value={formData.seo.metaDescription}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          seo: { ...formData.seo, metaDescription: e.target.value }
                        })}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <FiSave className="w-4 h-4 mr-2" />
                    {editingCategory ? 'Update' : 'Create'} Category
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Categories Tree */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Categories</h2>
          </div>
          
          {categories.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No categories found. Create your first category to get started.
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {renderCategoryTree(categories)}
            </div>
          )}
        </div>
      </div>
    </AdminDashboard>
  );
};

export default CategoryManager;
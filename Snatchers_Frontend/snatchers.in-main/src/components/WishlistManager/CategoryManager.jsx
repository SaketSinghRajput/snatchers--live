import React, { useState } from 'react';
import { X, Plus, Trash2, Edit3, Save } from 'lucide-react';
import api from '../../api';

const CategoryManager = ({ categories, onClose, onUpdate }) => {
  const [newCategory, setNewCategory] = useState({ name: '', color: '#6B7280' });
  const [editingCategory, setEditingCategory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const defaultCategories = ['general', 'favorites', 'gift-ideas', 'save-for-later'];
  
  const predefinedColors = [
    '#EF4444', '#F97316', '#F59E0B', '#EAB308',
    '#84CC16', '#22C55E', '#10B981', '#14B8A6',
    '#06B6D4', '#0EA5E9', '#3B82F6', '#6366F1',
    '#8B5CF6', '#A855F7', '#D946EF', '#EC4899',
    '#F43F5E', '#6B7280', '#374151', '#111827'
  ];

  const handleAddCategory = async () => {
    if (!newCategory.name.trim()) {
      setMessage({ type: 'error', text: 'Category name is required' });
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/wishlist/categories', newCategory);
      setMessage({ type: 'success', text: 'Category added successfully' });
      setNewCategory({ name: '', color: '#6B7280' });
      onUpdate();
    } catch (error) {
      console.error('Error adding category:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Failed to add category' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (categoryName) => {
    if (defaultCategories.includes(categoryName)) {
      setMessage({ type: 'error', text: 'Cannot delete default category' });
      return;
    }

    if (!window.confirm(`Delete category "${categoryName}"? Items in this category will be moved to "general".`)) {
      return;
    }

    setLoading(true);
    try {
      await api.delete(`/api/wishlist/categories/${categoryName}`);
      setMessage({ type: 'success', text: 'Category deleted successfully' });
      onUpdate();
    } catch (error) {
      console.error('Error deleting category:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Failed to delete category' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Manage Categories</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Message */}
          {message.text && (
            <div className={`p-4 rounded-md mb-6 ${
              message.type === 'success' 
                ? 'bg-green-50 text-green-800 border border-green-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {message.text}
            </div>
          )}

          {/* Add New Category */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Category</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="categoryName" className="block text-sm font-medium text-gray-700 mb-1">
                  Category Name
                </label>
                <input
                  type="text"
                  id="categoryName"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  placeholder="Enter category name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category Color
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {predefinedColors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewCategory(prev => ({ ...prev, color }))}
                      className={`w-8 h-8 rounded-full border-2 transition ${
                        newCategory.color === color ? 'border-gray-900' : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <input
                  type="color"
                  value={newCategory.color}
                  onChange={(e) => setNewCategory(prev => ({ ...prev, color: e.target.value }))}
                  className="w-16 h-8 border border-gray-300 rounded cursor-pointer"
                />
              </div>

              <button
                onClick={handleAddCategory}
                disabled={loading || !newCategory.name.trim()}
                className="flex items-center space-x-2 px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={16} />
                <span>{loading ? 'Adding...' : 'Add Category'}</span>
              </button>
            </div>
          </div>

          {/* Existing Categories */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Existing Categories</h3>
            <div className="space-y-3">
              {categories.map((category) => (
                <div
                  key={category.name}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-6 h-6 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <div>
                      <span className="font-medium text-gray-900">{category.name}</span>
                      {defaultCategories.includes(category.name) && (
                        <span className="ml-2 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          Default
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {!defaultCategories.includes(category.name) && (
                      <button
                        onClick={() => handleDeleteCategory(category.name)}
                        disabled={loading}
                        className="p-2 text-red-600 hover:bg-red-50 rounded transition disabled:opacity-50"
                        title="Delete category"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default CategoryManager;
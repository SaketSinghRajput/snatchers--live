import React, { useState, useEffect } from 'react';
import { 
  Heart, 
  Plus, 
  Filter, 
  Share2, 
  ShoppingCart, 
  Edit3, 
  Trash2,
  Star,
  Bell,
  Grid,
  List,
  Search
} from 'lucide-react';
import api from '../../api';
import WishlistGrid from './WishlistGrid';
import WishlistList from './WishlistList';
import CategoryManager from './CategoryManager';
import ItemEditor from './ItemEditor';
import ShareModal from './ShareModal';

const WishlistManager = () => {
  const [wishlistData, setWishlistData] = useState({ items: [], categories: [] });
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest'); // 'newest', 'oldest', 'price-low', 'price-high', 'priority'
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchWishlist();
  }, []);

  const fetchWishlist = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/wishlist');
      setWishlistData(response.data);
    } catch (error) {
      console.error('Error fetching wishlist:', error);
      setMessage({ type: 'error', text: 'Failed to load wishlist' });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveItem = async (productId) => {
    try {
      await api.delete(`/api/wishlist/${productId}`);
      setMessage({ type: 'success', text: 'Item removed from wishlist' });
      fetchWishlist();
    } catch (error) {
      console.error('Error removing item:', error);
      setMessage({ type: 'error', text: 'Failed to remove item' });
    }
  };

  const handleUpdateItem = async (productId, updateData) => {
    try {
      await api.put(`/api/wishlist/item/${productId}`, updateData);
      setMessage({ type: 'success', text: 'Item updated successfully' });
      fetchWishlist();
      setEditingItem(null);
    } catch (error) {
      console.error('Error updating item:', error);
      setMessage({ type: 'error', text: 'Failed to update item' });
    }
  };

  const handleMoveToCart = async (productIds) => {
    try {
      await api.post('/api/wishlist/move-to-cart', { productIds });
      setMessage({ type: 'success', text: `${productIds.length} items moved to cart` });
      // You might want to integrate with your cart context here
    } catch (error) {
      console.error('Error moving to cart:', error);
      setMessage({ type: 'error', text: 'Failed to move items to cart' });
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedItems.length === 0) {
      setMessage({ type: 'error', text: 'Please select items first' });
      return;
    }

    switch (action) {
      case 'move-to-cart':
        await handleMoveToCart(selectedItems);
        break;
      case 'remove':
        if (window.confirm(`Remove ${selectedItems.length} items from wishlist?`)) {
          for (const productId of selectedItems) {
            await handleRemoveItem(productId);
          }
          setSelectedItems([]);
        }
        break;
      default:
        break;
    }
  };

  const filteredAndSortedItems = () => {
    let items = [...wishlistData.items];

    // Filter by category
    if (selectedCategory !== 'all') {
      items = items.filter(item => item.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery) {
      items = items.filter(item => 
        item.product?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.notes?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort items
    switch (sortBy) {
      case 'oldest':
        items.sort((a, b) => new Date(a.addedAt) - new Date(b.addedAt));
        break;
      case 'price-low':
        items.sort((a, b) => (a.product?.price || 0) - (b.product?.price || 0));
        break;
      case 'price-high':
        items.sort((a, b) => (b.product?.price || 0) - (a.product?.price || 0));
        break;
      case 'priority':
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        items.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
        break;
      case 'newest':
      default:
        items.sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));
        break;
    }

    return items;
  };

  const getCategoryCount = (categoryName) => {
    if (categoryName === 'all') return wishlistData.items.length;
    return wishlistData.items.filter(item => item.category === categoryName).length;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your wishlist...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Heart className="mr-3 text-red-500" size={32} />
                My Wishlist
              </h1>
              <p className="text-gray-600 mt-1">
                {wishlistData.items.length} items saved
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowShareModal(true)}
                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition"
              >
                <Share2 size={16} />
                <span>Share</span>
              </button>
              <button
                onClick={() => setShowCategoryManager(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition"
              >
                <Plus size={16} />
                <span>Manage Categories</span>
              </button>
            </div>
          </div>

          {/* Message */}
          {message.text && (
            <div className={`p-4 rounded-md mb-4 ${
              message.type === 'success' 
                ? 'bg-green-50 text-green-800 border border-green-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {message.text}
            </div>
          )}
        </div>

        {/* Filters and Controls */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search wishlist..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              />
            </div>

            {/* Category Filter */}
            <div className="flex items-center space-x-4">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              >
                <option value="all">All Categories ({getCategoryCount('all')})</option>
                {wishlistData.categories.map((category) => (
                  <option key={category.name} value={category.name}>
                    {category.name} ({getCategoryCount(category.name)})
                  </option>
                ))}
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="priority">Priority</option>
              </select>

              {/* View Mode Toggle */}
              <div className="flex border border-gray-300 rounded-md">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 ${viewMode === 'grid' ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  <Grid size={16} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 ${viewMode === 'list' ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  <List size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedItems.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  {selectedItems.length} items selected
                </span>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleBulkAction('move-to-cart')}
                    className="flex items-center space-x-2 px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition"
                  >
                    <ShoppingCart size={14} />
                    <span>Move to Cart</span>
                  </button>
                  <button
                    onClick={() => handleBulkAction('remove')}
                    className="flex items-center space-x-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition"
                  >
                    <Trash2 size={14} />
                    <span>Remove</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Wishlist Content */}
        {filteredAndSortedItems().length === 0 ? (
          <div className="text-center py-12">
            <Heart className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              {searchQuery || selectedCategory !== 'all' ? 'No items match your filters' : 'Your wishlist is empty'}
            </h3>
            <p className="text-gray-500 mb-6">
              {searchQuery || selectedCategory !== 'all' 
                ? 'Try adjusting your search or category filter' 
                : 'Start adding products you love to your wishlist'
              }
            </p>
            {(!searchQuery && selectedCategory === 'all') && (
              <button
                onClick={() => window.location.href = '/shop'}
                className="inline-flex items-center px-6 py-3 bg-black text-white rounded-md hover:bg-gray-800 transition"
              >
                Start Shopping
              </button>
            )}
          </div>
        ) : (
          <>
            {viewMode === 'grid' ? (
              <WishlistGrid
                items={filteredAndSortedItems()}
                categories={wishlistData.categories}
                selectedItems={selectedItems}
                onSelectItem={setSelectedItems}
                onRemoveItem={handleRemoveItem}
                onEditItem={setEditingItem}
                onMoveToCart={handleMoveToCart}
              />
            ) : (
              <WishlistList
                items={filteredAndSortedItems()}
                categories={wishlistData.categories}
                selectedItems={selectedItems}
                onSelectItem={setSelectedItems}
                onRemoveItem={handleRemoveItem}
                onEditItem={setEditingItem}
                onMoveToCart={handleMoveToCart}
              />
            )}
          </>
        )}

        {/* Modals */}
        {showCategoryManager && (
          <CategoryManager
            categories={wishlistData.categories}
            onClose={() => setShowCategoryManager(false)}
            onUpdate={fetchWishlist}
          />
        )}

        {editingItem && (
          <ItemEditor
            item={editingItem}
            categories={wishlistData.categories}
            onClose={() => setEditingItem(null)}
            onUpdate={handleUpdateItem}
          />
        )}

        {showShareModal && (
          <ShareModal
            onClose={() => setShowShareModal(false)}
          />
        )}
      </div>
    </div>
  );
};

export default WishlistManager;
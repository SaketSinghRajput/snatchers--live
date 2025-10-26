import React from 'react';
import { 
  ShoppingCart, 
  Edit3, 
  Trash2, 
  Star, 
  Bell,
  AlertCircle,
  Calendar
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const WishlistList = ({ 
  items, 
  categories, 
  selectedItems, 
  onSelectItem, 
  onRemoveItem, 
  onEditItem, 
  onMoveToCart 
}) => {
  const navigate = useNavigate();

  const handleSelectItem = (productId) => {
    if (selectedItems.includes(productId)) {
      onSelectItem(selectedItems.filter(id => id !== productId));
    } else {
      onSelectItem([...selectedItems, productId]);
    }
  };

  const getCategoryColor = (categoryName) => {
    const category = categories.find(cat => cat.name === categoryName);
    return category?.color || '#6B7280';
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(price);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
        <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-700">
          <div className="col-span-1">
            <input
              type="checkbox"
              checked={selectedItems.length === items.length && items.length > 0}
              onChange={() => {
                if (selectedItems.length === items.length) {
                  onSelectItem([]);
                } else {
                  onSelectItem(items.map(item => item.product._id));
                }
              }}
              className="h-4 w-4 text-black focus:ring-black border-gray-300 rounded"
            />
          </div>
          <div className="col-span-4">Product</div>
          <div className="col-span-2">Category</div>
          <div className="col-span-1">Price</div>
          <div className="col-span-1">Priority</div>
          <div className="col-span-2">Added</div>
          <div className="col-span-1">Actions</div>
        </div>
      </div>

      {/* Items */}
      <div className="divide-y divide-gray-200">
        {items.map((item) => {
          const product = item.product;
          const isSelected = selectedItems.includes(product._id);
          
          return (
            <div
              key={product._id}
              className={`px-6 py-4 hover:bg-gray-50 transition ${
                isSelected ? 'bg-blue-50' : ''
              }`}
            >
              <div className="grid grid-cols-12 gap-4 items-center">
                {/* Selection */}
                <div className="col-span-1">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleSelectItem(product._id)}
                    className="h-4 w-4 text-black focus:ring-black border-gray-300 rounded"
                  />
                </div>

                {/* Product Info */}
                <div className="col-span-4">
                  <div className="flex items-center space-x-4">
                    <img
                      src={product.images?.[0] || '/placeholder.png'}
                      alt={product.title}
                      className="w-16 h-16 object-cover rounded-lg cursor-pointer"
                      onClick={() => navigate(`/product/${product._id}`)}
                    />
                    <div className="flex-1 min-w-0">
                      <h3 
                        className="font-medium text-gray-900 cursor-pointer hover:text-gray-700 line-clamp-2"
                        onClick={() => navigate(`/product/${product._id}`)}
                      >
                        {product.title}
                      </h3>
                      
                      {/* Rating */}
                      {product.rating > 0 && (
                        <div className="flex items-center space-x-1 mt-1">
                          <Star className="text-yellow-400 fill-current" size={14} />
                          <span className="text-sm text-gray-600">{product.rating}</span>
                        </div>
                      )}

                      {/* Notes */}
                      {item.notes && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-1">
                          {item.notes}
                        </p>
                      )}

                      {/* Price Alert */}
                      {item.priceAlert?.enabled && (
                        <div className="flex items-center space-x-1 text-xs text-blue-600 mt-1">
                          <Bell size={12} />
                          <span>Alert at {formatPrice(item.priceAlert.targetPrice)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Category */}
                <div className="col-span-2">
                  <span 
                    className="inline-block px-2 py-1 rounded-full text-xs font-medium text-white"
                    style={{ backgroundColor: getCategoryColor(item.category) }}
                  >
                    {item.category}
                  </span>
                </div>

                {/* Price */}
                <div className="col-span-1">
                  <div className="text-sm">
                    <div className="font-semibold text-gray-900">
                      {formatPrice(product.offerPrice || product.price)}
                    </div>
                    {product.offerPrice && product.offerPrice < product.price && (
                      <div className="text-gray-500 line-through text-xs">
                        {formatPrice(product.price)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Priority */}
                <div className="col-span-1">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(item.priority)}`}>
                    {item.priority}
                  </span>
                </div>

                {/* Added Date */}
                <div className="col-span-2">
                  <div className="flex items-center space-x-1 text-sm text-gray-600">
                    <Calendar size={14} />
                    <span>{new Date(item.addedAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="col-span-1">
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => onMoveToCart([product._id])}
                      className="p-2 text-green-600 hover:bg-green-50 rounded transition"
                      title="Add to cart"
                    >
                      <ShoppingCart size={16} />
                    </button>
                    <button
                      onClick={() => onEditItem(item)}
                      className="p-2 text-gray-600 hover:bg-gray-50 rounded transition"
                      title="Edit item"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      onClick={() => onRemoveItem(product._id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded transition"
                      title="Remove from wishlist"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WishlistList;
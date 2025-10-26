import React from 'react';
import { 
  Heart, 
  ShoppingCart, 
  Edit3, 
  Trash2, 
  Star, 
  Bell,
  AlertCircle,
  Calendar
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const WishlistGrid = ({ 
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {items.map((item) => {
        const product = item.product;
        const isSelected = selectedItems.includes(product._id);
        
        return (
          <div
            key={product._id}
            className={`bg-white rounded-lg shadow-sm border transition-all duration-200 hover:shadow-md ${
              isSelected ? 'border-black ring-2 ring-black ring-opacity-20' : 'border-gray-200'
            }`}
          >
            {/* Selection Checkbox */}
            <div className="absolute top-3 left-3 z-10">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => handleSelectItem(product._id)}
                className="h-4 w-4 text-black focus:ring-black border-gray-300 rounded"
              />
            </div>

            {/* Priority Badge */}
            {item.priority !== 'medium' && (
              <div className="absolute top-3 right-3 z-10">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(item.priority)}`}>
                  {item.priority}
                </span>
              </div>
            )}

            {/* Product Image */}
            <div 
              className="relative aspect-square cursor-pointer"
              onClick={() => navigate(`/product/${product._id}`)}
            >
              <img
                src={product.images?.[0] || '/placeholder.png'}
                alt={product.title}
                className="w-full h-full object-cover rounded-t-lg"
              />
              
              {/* Price Alert Indicator */}
              {item.priceAlert?.enabled && (
                <div className="absolute bottom-2 left-2">
                  <div className="flex items-center space-x-1 bg-blue-600 text-white px-2 py-1 rounded-full text-xs">
                    <Bell size={12} />
                    <span>Alert</span>
                  </div>
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="p-4">
              {/* Category Tag */}
              <div className="mb-2">
                <span 
                  className="inline-block px-2 py-1 rounded-full text-xs font-medium text-white"
                  style={{ backgroundColor: getCategoryColor(item.category) }}
                >
                  {item.category}
                </span>
              </div>

              {/* Product Title */}
              <h3 
                className="font-medium text-gray-900 mb-2 line-clamp-2 cursor-pointer hover:text-gray-700"
                onClick={() => navigate(`/product/${product._id}`)}
              >
                {product.title}
              </h3>

              {/* Price */}
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-lg font-semibold text-gray-900">
                  {formatPrice(product.offerPrice || product.price)}
                </span>
                {product.offerPrice && product.offerPrice < product.price && (
                  <span className="text-sm text-gray-500 line-through">
                    {formatPrice(product.price)}
                  </span>
                )}
              </div>

              {/* Rating */}
              {product.rating > 0 && (
                <div className="flex items-center space-x-1 mb-2">
                  <Star className="text-yellow-400 fill-current" size={16} />
                  <span className="text-sm text-gray-600">{product.rating}</span>
                </div>
              )}

              {/* Notes */}
              {item.notes && (
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {item.notes}
                </p>
              )}

              {/* Price Alert Info */}
              {item.priceAlert?.enabled && (
                <div className="flex items-center space-x-1 text-xs text-blue-600 mb-3">
                  <AlertCircle size={12} />
                  <span>Alert at {formatPrice(item.priceAlert.targetPrice)}</span>
                </div>
              )}

              {/* Added Date */}
              <div className="flex items-center space-x-1 text-xs text-gray-500 mb-3">
                <Calendar size={12} />
                <span>Added {new Date(item.addedAt).toLocaleDateString()}</span>
              </div>

              {/* Actions */}
              <div className="flex space-x-2">
                <button
                  onClick={() => onMoveToCart([product._id])}
                  className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition text-sm"
                >
                  <ShoppingCart size={14} />
                  <span>Add to Cart</span>
                </button>
                <button
                  onClick={() => onEditItem(item)}
                  className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 transition"
                  title="Edit item"
                >
                  <Edit3 size={14} />
                </button>
                <button
                  onClick={() => onRemoveItem(product._id)}
                  className="p-2 border border-gray-300 text-red-600 rounded-md hover:bg-red-50 transition"
                  title="Remove from wishlist"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default WishlistGrid;
import React, { useState } from 'react';
import { X, Package, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ReturnRequestForm = ({ order, onClose, onSubmit }) => {
  const [selectedItems, setSelectedItems] = useState([]);
  const [reason, setReason] = useState('');
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const returnReasons = [
    'Defective/Damaged product',
    'Wrong item received',
    'Size/fit issues',
    'Quality not as expected',
    'Changed mind',
    'Product not as described',
    'Other'
  ];

  const handleItemToggle = (itemId) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (selectedItems.length === 0) {
      alert('Please select at least one item to return');
      return;
    }
    
    if (!reason) {
      alert('Please select a reason for return');
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit({
        items: selectedItems,
        reason,
        comments
      });
      onClose();
    } catch (error) {
      console.error('Failed to submit return request:', error);
      alert('Failed to submit return request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const orderItems = order.items || [];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Return Request</h2>
              <p className="text-sm text-gray-600">Order #{order.orderId}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Items Selection */}
              <div>
                <h3 className="font-medium text-gray-900 mb-4">Select items to return</h3>
                <div className="space-y-3">
                  {orderItems.map((item, index) => (
                    <div
                      key={item._id || index}
                      className={`flex items-center gap-4 p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedItems.includes(item._id) 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleItemToggle(item._id)}
                    >
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(item._id)}
                        onChange={() => handleItemToggle(item._id)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      
                      <img
                        src={item.productImage || '/product-placeholder.jpg'}
                        alt={item.productTitle}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                      
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{item.productTitle}</h4>
                        <div className="text-sm text-gray-600 mt-1">
                          <span>Qty: {item.quantity}</span>
                          {item.variant && (
                            <span> • {item.variant.name}: {item.variant.value}</span>
                          )}
                          <span> • ₹{item.totalPrice?.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Return Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for return *
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select a reason</option>
                  {returnReasons.map((reasonOption) => (
                    <option key={reasonOption} value={reasonOption}>
                      {reasonOption}
                    </option>
                  ))}
                </select>
              </div>

              {/* Additional Comments */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional comments (optional)
                </label>
                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  rows={4}
                  placeholder="Please provide any additional details about the return..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Return Policy Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <h4 className="font-medium mb-1">Return Policy</h4>
                    <ul className="space-y-1 text-blue-700">
                      <li>• Returns are accepted within 7 days of delivery</li>
                      <li>• Items must be in original condition with tags</li>
                      <li>• Refund will be processed within 5-7 business days</li>
                      <li>• Return shipping charges may apply</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-6 border-t bg-gray-50">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              
              <button
                type="submit"
                disabled={submitting || selectedItems.length === 0 || !reason}
                className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Package className="w-4 h-4" />
                {submitting ? 'Submitting...' : 'Submit Return Request'}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ReturnRequestForm;
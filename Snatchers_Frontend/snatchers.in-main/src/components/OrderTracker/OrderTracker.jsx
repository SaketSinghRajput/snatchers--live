import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Truck, 
  CheckCircle, 
  Clock, 
  MapPin, 
  Phone,
  Mail,
  AlertCircle,
  RefreshCw,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const OrderTracker = ({ orderId, onClose, className = '' }) => {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
    }
  }, [orderId]);

  const fetchOrderDetails = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/orders/${orderId}`, {
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });

      if (response.ok) {
        const data = await response.json();
        setOrder(data.order);
        setError(null);
      } else {
        throw new Error('Failed to fetch order details');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchOrderDetails(true);
  };

  const getStatusSteps = () => {
    const allSteps = [
      { key: 'Pending', label: 'Order Placed', icon: Package },
      { key: 'Confirmed', label: 'Order Confirmed', icon: CheckCircle },
      { key: 'Processing', label: 'Processing', icon: Clock },
      { key: 'Packed', label: 'Packed', icon: Package },
      { key: 'Shipped', label: 'Shipped', icon: Truck },
      { key: 'Out for Delivery', label: 'Out for Delivery', icon: Truck },
      { key: 'Delivered', label: 'Delivered', icon: CheckCircle }
    ];

    const currentStatusIndex = allSteps.findIndex(step => step.key === order?.status);
    
    return allSteps.map((step, index) => ({
      ...step,
      completed: index <= currentStatusIndex,
      current: step.key === order?.status,
      cancelled: order?.status === 'Cancelled'
    }));
  };

  const handleCancelOrder = async () => {
    try {
      setCancelling(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });

      if (response.ok) {
        await fetchOrderDetails();
        setShowCancelModal(false);
      } else {
        const data = await response.json();
        throw new Error(data.message || 'Failed to cancel order');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setCancelling(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEstimatedDelivery = () => {
    if (order?.shipping?.estimatedDelivery) {
      return formatDate(order.shipping.estimatedDelivery);
    }
    if (order?.shipping?.actualDelivery) {
      return formatDate(order.shipping.actualDelivery);
    }
    return 'Not available';
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
          <span className="ml-3 text-gray-600">Loading order details...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Order</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => fetchOrderDetails()}
            className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
        <div className="text-center py-8">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Order Not Found</h3>
          <p className="text-gray-600">Unable to find order details.</p>
        </div>
      </div>
    );
  }

  const statusSteps = getStatusSteps();

  return (
    <>
      <div className={`bg-white rounded-lg shadow-lg ${className}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Order Tracking</h2>
            <p className="text-sm text-gray-600">Order ID: {orderId}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        <div className="p-6">
          {/* Order Status */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Order Status</h3>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                order.status === 'Delivered' ? 'bg-green-100 text-green-800' :
                order.status === 'Cancelled' ? 'bg-red-100 text-red-800' :
                order.status === 'Shipped' || order.status === 'Out for Delivery' ? 'bg-blue-100 text-blue-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {order.status}
              </span>
            </div>

            {/* Status Timeline */}
            <div className="relative">
              {statusSteps.map((step, index) => {
                const Icon = step.icon;
                const isLast = index === statusSteps.length - 1;
                
                return (
                  <div key={step.key} className="relative flex items-center mb-4 last:mb-0">
                    {/* Connector Line */}
                    {!isLast && (
                      <div className={`absolute left-6 top-12 w-0.5 h-8 ${
                        step.completed && !step.cancelled ? 'bg-green-500' : 'bg-gray-200'
                      }`} />
                    )}
                    
                    {/* Status Icon */}
                    <div className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center ${
                      step.cancelled ? 'bg-red-100' :
                      step.completed ? 'bg-green-100' : 
                      step.current ? 'bg-blue-100' : 'bg-gray-100'
                    }`}>
                      <Icon className={`w-6 h-6 ${
                        step.cancelled ? 'text-red-600' :
                        step.completed ? 'text-green-600' : 
                        step.current ? 'text-blue-600' : 'text-gray-400'
                      }`} />
                    </div>
                    
                    {/* Status Info */}
                    <div className="ml-4 flex-1">
                      <h4 className={`font-medium ${
                        step.completed || step.current ? 'text-gray-900' : 'text-gray-500'
                      }`}>
                        {step.label}
                      </h4>
                      {step.current && order.statusHistory && (
                        <p className="text-sm text-gray-600">
                          {formatDate(order.statusHistory[order.statusHistory.length - 1]?.timestamp)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>    
      {/* Order Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Delivery Information */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Delivery Information
              </h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-600">Estimated Delivery:</span>
                  <span className="ml-2 font-medium">{getEstimatedDelivery()}</span>
                </div>
                {order.shipping?.trackingNumber && (
                  <div>
                    <span className="text-gray-600">Tracking Number:</span>
                    <span className="ml-2 font-mono font-medium">{order.shipping.trackingNumber}</span>
                  </div>
                )}
                {order.shipping?.carrier && (
                  <div>
                    <span className="text-gray-600">Carrier:</span>
                    <span className="ml-2 font-medium">{order.shipping.carrier}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Contact Information
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span>{order.customerEmail}</span>
                </div>
                {order.shippingAddress?.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span>{order.shippingAddress.phone}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Order Items */}
          {order.items && order.items.length > 0 && (
            <div className="mb-6">
              <h4 className="font-medium text-gray-900 mb-3">Order Items</h4>
              <div className="space-y-3">
                {order.items.map((item, index) => (
                  <div key={index} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                    <img
                      src={item.productImage}
                      alt={item.productTitle}
                      className="w-12 h-12 object-cover rounded"
                    />
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-900">{item.productTitle}</h5>
                      <p className="text-sm text-gray-600">
                        Quantity: {item.quantity} × ₹{item.unitPrice?.toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">₹{item.totalPrice?.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            {order.canBeCancelled && order.status !== 'Cancelled' && (
              <button
                onClick={() => setShowCancelModal(true)}
                className="px-4 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50 transition-colors"
              >
                Cancel Order
              </button>
            )}
            
            {order.status === 'Delivered' && (
              <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors">
                Return/Exchange
              </button>
            )}
            
            <button
              onClick={() => window.open(`/orders/${orderId}/invoice`, '_blank')}
              className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors"
            >
              Download Invoice
            </button>
          </div>
        </div>
      </div>

      {/* Cancel Order Modal */}
      <AnimatePresence>
        {showCancelModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowCancelModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Cancel Order</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to cancel this order? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelModal(false)}
                  disabled={cancelling}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Keep Order
                </button>
                <button
                  onClick={handleCancelOrder}
                  disabled={cancelling}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {cancelling ? 'Cancelling...' : 'Cancel Order'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default OrderTracker;
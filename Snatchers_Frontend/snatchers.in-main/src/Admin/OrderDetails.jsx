import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  FiArrowLeft, 
  FiEdit, 
  FiTruck, 
  FiPackage, 
  FiUser, 
  FiMapPin, 
  FiCreditCard,
  FiClock,
  FiCheck,
  FiX,
  FiAlertCircle,
  FiMessageSquare,
  FiPhone,
  FiMail
} from 'react-icons/fi';
import AdminDashboard from './AdminDashboard';
import api from '../api';

const OrderDetails = () => {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [statusUpdate, setStatusUpdate] = useState({
    status: '',
    note: '',
    trackingNumber: '',
    carrier: ''
  });
  const [returnAction, setReturnAction] = useState({
    action: 'approve',
    refundAmount: 0,
    note: ''
  });

  useEffect(() => {
    fetchOrderDetails();
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/admin/orders/${orderId}`);
      setOrder(response.data.order);
      setDisputes(response.data.disputes || []);
      
      // Initialize status update with current values
      setStatusUpdate({
        status: response.data.order.status,
        note: '',
        trackingNumber: response.data.order.shipping?.trackingNumber || '',
        carrier: response.data.order.shipping?.carrier || ''
      });
    } catch (error) {
      console.error('Failed to fetch order details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async () => {
    try {
      await api.put(`/api/admin/orders/${orderId}/status`, statusUpdate);
      setShowStatusModal(false);
      fetchOrderDetails();
      alert('Order status updated successfully');
    } catch (error) {
      console.error('Failed to update order status:', error);
      alert('Failed to update order status');
    }
  };

  const handleReturnProcess = async () => {
    try {
      await api.post(`/api/admin/orders/${orderId}/process-return`, returnAction);
      setShowReturnModal(false);
      fetchOrderDetails();
      alert(`Return request ${returnAction.action}d successfully`);
    } catch (error) {
      console.error('Failed to process return:', error);
      alert('Failed to process return request');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'Pending': 'bg-yellow-100 text-yellow-800',
      'Confirmed': 'bg-blue-100 text-blue-800',
      'Processing': 'bg-purple-100 text-purple-800',
      'Packed': 'bg-indigo-100 text-indigo-800',
      'Shipped': 'bg-orange-100 text-orange-800',
      'Out for Delivery': 'bg-cyan-100 text-cyan-800',
      'Delivered': 'bg-green-100 text-green-800',
      'Cancelled': 'bg-red-100 text-red-800',
      'Return Requested': 'bg-amber-100 text-amber-800',
      'Return Approved': 'bg-lime-100 text-lime-800',
      'Return Rejected': 'bg-rose-100 text-rose-800',
      'Returned': 'bg-gray-100 text-gray-800',
      'Refunded': 'bg-emerald-100 text-emerald-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <AdminDashboard>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading order details...</p>
          </div>
        </div>
      </AdminDashboard>
    );
  }

  if (!order) {
    return (
      <AdminDashboard>
        <div className="text-center py-12">
          <FiPackage className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Order Not Found</h2>
          <p className="text-gray-600 mb-6">The order you're looking for doesn't exist.</p>
          <Link
            to="/admin/orders"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <FiArrowLeft className="w-4 h-4" />
            Back to Orders
          </Link>
        </div>
      </AdminDashboard>
    );
  }

  return (
    <AdminDashboard>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/admin/orders"
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
            >
              <FiArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Order #{order.orderId}</h1>
              <p className="text-gray-600">
                Placed on {formatDate(order.createdAt)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
              <FiClock className="w-4 h-4" />
              {order.status}
            </span>
            <button
              onClick={() => setShowStatusModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <FiEdit className="w-4 h-4" />
              Update Status
            </button>
            {order.status === 'Return Requested' && (
              <button
                onClick={() => setShowReturnModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
              >
                <FiPackage className="w-4 h-4" />
                Process Return
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Items */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Order Items</h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {(order.items || []).map((item, index) => (
                    <div key={item._id || index} className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg">
                      <img
                        src={item.productImage || '/product-placeholder.jpg'}
                        alt={item.productTitle}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{item.productTitle}</h3>
                        <div className="text-sm text-gray-600 mt-1">
                          <span>SKU: {item.sku}</span>
                          {item.variant && (
                            <span> • {item.variant.name}: {item.variant.value}</span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600">
                          Qty: {item.quantity} × {formatCurrency(item.unitPrice)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-gray-900">
                          {formatCurrency(item.totalPrice)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Order Summary */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal</span>
                      <span className="text-gray-900">{formatCurrency(order.subtotal)}</span>
                    </div>
                    {order.shippingCost > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Shipping</span>
                        <span className="text-gray-900">{formatCurrency(order.shippingCost)}</span>
                      </div>
                    )}
                    {order.taxAmount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Tax</span>
                        <span className="text-gray-900">{formatCurrency(order.taxAmount)}</span>
                      </div>
                    )}
                    {order.discountAmount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Discount</span>
                        <span className="text-green-600">-{formatCurrency(order.discountAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-medium pt-2 border-t border-gray-200">
                      <span className="text-gray-900">Total</span>
                      <span className="text-gray-900">{formatCurrency(order.totalAmount)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Status History */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Status History</h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {order.statusHistory?.map((history, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <FiClock className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{history.status}</span>
                          <span className="text-sm text-gray-500">
                            {formatDate(history.timestamp)}
                          </span>
                        </div>
                        {history.note && (
                          <p className="text-sm text-gray-600 mt-1">{history.note}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Disputes */}
            {disputes.length > 0 && (
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-medium text-gray-900">Related Disputes</h2>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {disputes.map((dispute) => (
                      <div key={dispute._id} className="p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-gray-900">
                            Dispute #{dispute.disputeId}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(dispute.status)}`}>
                            {dispute.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{dispute.subject}</p>
                        <div className="text-xs text-gray-500">
                          Created: {formatDate(dispute.createdAt)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Customer Information */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                  <FiUser className="w-5 h-5" />
                  Customer Information
                </h2>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Name</label>
                  <p className="text-gray-900">{order.customerName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Email</label>
                  <div className="flex items-center gap-2">
                    <p className="text-gray-900">{order.customerEmail}</p>
                    <a
                      href={`mailto:${order.customerEmail}`}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <FiMail className="w-4 h-4" />
                    </a>
                  </div>
                </div>
                {order.user?.phone && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Phone</label>
                    <div className="flex items-center gap-2">
                      <p className="text-gray-900">{order.user.phone}</p>
                      <a
                        href={`tel:${order.user.phone}`}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <FiPhone className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Shipping Address */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                  <FiMapPin className="w-5 h-5" />
                  Shipping Address
                </h2>
              </div>
              <div className="p-6">
                {order.shippingAddress ? (
                  <div className="space-y-1">
                    <p className="text-gray-900">{order.shippingAddress.street}</p>
                    <p className="text-gray-900">
                      {order.shippingAddress.city}, {order.shippingAddress.state}
                    </p>
                    <p className="text-gray-900">
                      {order.shippingAddress.zipCode}, {order.shippingAddress.country}
                    </p>
                    {order.shippingAddress.phone && (
                      <p className="text-gray-600 text-sm">
                        Phone: {order.shippingAddress.phone}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-gray-900">{order.address}</p>
                    <p className="text-gray-900">{order.city}, {order.state}</p>
                    <p className="text-gray-900">{order.pincode}</p>
                    {order.phone && (
                      <p className="text-gray-600 text-sm">Phone: {order.phone}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Payment Information */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                  <FiCreditCard className="w-5 h-5" />
                  Payment Information
                </h2>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Method</label>
                  <p className="text-gray-900 capitalize">
                    {order.payment?.method || 'Not specified'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Payment ID</label>
                  <p className="text-gray-900 font-mono text-sm">
                    {order.payment?.paymentId || order.paymentId}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                    order.payment?.status === 'completed' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {order.payment?.status || 'pending'}
                  </span>
                </div>
              </div>
            </div>

            {/* Shipping Information */}
            {order.shipping && (
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                    <FiTruck className="w-5 h-5" />
                    Shipping Information
                  </h2>
                </div>
                <div className="p-6 space-y-4">
                  {order.shipping.trackingNumber && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Tracking Number</label>
                      <p className="text-gray-900 font-mono text-sm">
                        {order.shipping.trackingNumber}
                      </p>
                    </div>
                  )}
                  {order.shipping.carrier && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Carrier</label>
                      <p className="text-gray-900">{order.shipping.carrier}</p>
                    </div>
                  )}
                  {order.shipping.estimatedDelivery && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Estimated Delivery</label>
                      <p className="text-gray-900">
                        {formatDate(order.shipping.estimatedDelivery)}
                      </p>
                    </div>
                  )}
                  {order.shipping.actualDelivery && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Actual Delivery</label>
                      <p className="text-gray-900">
                        {formatDate(order.shipping.actualDelivery)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Status Update Modal */}
        {showStatusModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Update Order Status</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={statusUpdate.status}
                    onChange={(e) => setStatusUpdate(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Processing">Processing</option>
                    <option value="Packed">Packed</option>
                    <option value="Shipped">Shipped</option>
                    <option value="Out for Delivery">Out for Delivery</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tracking Number (optional)
                  </label>
                  <input
                    type="text"
                    value={statusUpdate.trackingNumber}
                    onChange={(e) => setStatusUpdate(prev => ({ ...prev, trackingNumber: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter tracking number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Carrier (optional)
                  </label>
                  <input
                    type="text"
                    value={statusUpdate.carrier}
                    onChange={(e) => setStatusUpdate(prev => ({ ...prev, carrier: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter carrier name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Note (optional)
                  </label>
                  <textarea
                    value={statusUpdate.note}
                    onChange={(e) => setStatusUpdate(prev => ({ ...prev, note: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Add a note about this status update"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowStatusModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStatusUpdate}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Update Status
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Return Process Modal */}
        {showReturnModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Process Return Request</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Action
                  </label>
                  <select
                    value={returnAction.action}
                    onChange={(e) => setReturnAction(prev => ({ ...prev, action: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="approve">Approve Return</option>
                    <option value="reject">Reject Return</option>
                  </select>
                </div>

                {returnAction.action === 'approve' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Refund Amount
                    </label>
                    <input
                      type="number"
                      value={returnAction.refundAmount}
                      onChange={(e) => setReturnAction(prev => ({ ...prev, refundAmount: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter refund amount"
                      max={order.totalAmount}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Maximum: {formatCurrency(order.totalAmount)}
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Note
                  </label>
                  <textarea
                    value={returnAction.note}
                    onChange={(e) => setReturnAction(prev => ({ ...prev, note: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Add a note about this decision"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowReturnModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReturnProcess}
                  className={`px-4 py-2 text-white rounded-lg ${
                    returnAction.action === 'approve' 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {returnAction.action === 'approve' ? 'Approve Return' : 'Reject Return'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminDashboard>
  );
};

export default OrderDetails;
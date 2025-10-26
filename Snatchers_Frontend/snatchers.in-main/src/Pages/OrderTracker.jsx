import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import OrderTracker from '../components/OrderTracker/OrderTracker';

const OrderTrackerPage = () => {
  const { orderId } = useParams();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <Link 
            to="/orders" 
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Orders
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Track Your Order</h1>
        </div>

        {/* Order Tracker Component */}
        <OrderTracker orderId={orderId} />
      </div>
    </div>
  );
};

export default OrderTrackerPage;
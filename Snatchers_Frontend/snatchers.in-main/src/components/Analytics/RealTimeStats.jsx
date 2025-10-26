import React, { useState, useEffect } from 'react';
import { 
  FiActivity, 
  FiUsers, 
  FiShoppingCart,
  FiDollarSign,
  FiEye,
  FiClock,
  FiRefreshCw,
  FiTrendingUp
} from 'react-icons/fi';
import api from '../../api';

const RealTimeStats = ({ refreshTrigger }) => {
  const [realTimeData, setRealTimeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    fetchRealTimeData();
  }, [refreshTrigger]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    let interval;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchRealTimeData();
      }, 30000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const fetchRealTimeData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get('/api/analytics/realtime');
      
      if (response.data.success) {
        setRealTimeData(response.data.data);
        setLastUpdate(new Date());
      } else {
        throw new Error(response.data.error || 'Failed to fetch real-time data');
      }
    } catch (error) {
      console.error('Error fetching real-time data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString();
  };

  const getStatusColor = (status) => {
    const colors = {
      'Delivered': 'bg-green-100 text-green-800',
      'Shipped': 'bg-blue-100 text-blue-800',
      'Processing': 'bg-yellow-100 text-yellow-800',
      'Cancelled': 'bg-red-100 text-red-800',
      'Pending': 'bg-gray-100 text-gray-800',
      'Confirmed': 'bg-indigo-100 text-indigo-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading && !realTimeData) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="bg-white rounded-lg shadow p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-24 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-32"></div>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-lg shadow p-6 animate-pulse">
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <div className="text-red-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading real-time data</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
        <button
          onClick={fetchRealTimeData}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const liveStats = realTimeData?.liveStats || {};

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white rounded-lg shadow p-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <FiActivity className="w-5 h-5 mr-2" />
            Real-time Analytics
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Last updated: {formatTime(lastUpdate)}
          </p>
        </div>
        
        <div className="flex items-center space-x-4 mt-4 sm:mt-0">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600">Auto-refresh</span>
          </label>
          
          <button
            onClick={fetchRealTimeData}
            disabled={loading}
            className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="text-sm">Refresh</span>
          </button>
        </div>
      </div>

      {/* Live Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-green-100">
              <FiUsers className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Users</p>
              <p className="text-2xl font-bold text-gray-900">
                {realTimeData?.activeUsers || 0}
              </p>
              <p className="text-xs text-gray-500">Last hour</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-blue-100">
              <FiShoppingCart className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Orders (24h)</p>
              <p className="text-2xl font-bold text-gray-900">
                {liveStats.ordersLast24h || 0}
              </p>
              <p className="text-xs text-gray-500">Last 24 hours</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-purple-100">
              <FiDollarSign className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Revenue (24h)</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(liveStats.revenueLast24h || 0)}
              </p>
              <p className="text-xs text-gray-500">Last 24 hours</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-indigo-100">
              <FiEye className="w-6 h-6 text-indigo-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Page Views (24h)</p>
              <p className="text-2xl font-bold text-gray-900">
                {liveStats.pageViewsLast24h || 0}
              </p>
              <p className="text-xs text-gray-500">Last 24 hours</p>
            </div>
          </div>
        </div>
      </div>

      {/* Hourly Page Views Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <FiTrendingUp className="w-5 h-5 mr-2" />
          Hourly Page Views (Last 24 Hours)
        </h3>
        
        {realTimeData?.hourlyPageViews?.length > 0 ? (
          <div className="space-y-2">
            {realTimeData.hourlyPageViews.slice(-12).map((item, index) => {
              const maxViews = Math.max(...realTimeData.hourlyPageViews.map(d => d.views));
              const width = maxViews > 0 ? (item.views / maxViews) * 100 : 0;
              
              return (
                <div key={index} className="flex items-center space-x-4">
                  <div className="w-16 text-sm text-gray-600 text-right">
                    {item._id.split(' ')[1]}
                  </div>
                  <div className="flex-1 bg-gray-200 rounded-full h-4 relative">
                    <div 
                      className="bg-indigo-600 h-4 rounded-full flex items-center justify-end pr-2"
                      style={{ width: `${Math.max(width, 5)}%` }}
                    >
                      <span className="text-xs text-white font-medium">
                        {item.views}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No hourly data available
          </div>
        )}
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <FiClock className="w-5 h-5 mr-2" />
          Recent Orders (Last 24 Hours)
        </h3>
        
        {realTimeData?.recentOrders?.length > 0 ? (
          <div className="space-y-4">
            {realTimeData.recentOrders.slice(0, 10).map((order, index) => (
              <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <FiShoppingCart className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      Order #{order.orderId}
                    </p>
                    <p className="text-sm text-gray-500">
                      {order.user?.name || order.user?.email || 'Guest User'}
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="font-semibold text-gray-900">
                    {formatCurrency(order.totalAmount)}
                  </p>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatTime(order.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No recent orders
          </div>
        )}
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Product Views (24h)</h3>
          <div className="text-center">
            <p className="text-3xl font-bold text-gray-900">
              {liveStats.productViewsLast24h || 0}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Product page visits in the last 24 hours
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">System Status</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">API Status</span>
              <span className="flex items-center text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                Online
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Database</span>
              <span className="flex items-center text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                Connected
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Last Update</span>
              <span className="text-gray-900 text-sm">
                {formatTime(lastUpdate)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RealTimeStats;
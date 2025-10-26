import React, { useState, useEffect } from 'react';
import { 
  FiUsers, 
  FiUserPlus, 
  FiActivity,
  FiStar,
  FiDollarSign,
  FiMail,
  FiClock
} from 'react-icons/fi';
import api from '../../api';

const UserAnalytics = ({ dateRange, refreshTrigger }) => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [groupBy, setGroupBy] = useState('day');

  useEffect(() => {
    fetchUserData();
  }, [dateRange, refreshTrigger, groupBy]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        groupBy
      });

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      
      switch (dateRange) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
        case '1y':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
      }

      params.append('startDate', startDate.toISOString());
      params.append('endDate', endDate.toISOString());

      const response = await api.get(`/api/analytics/users?${params}`);
      
      if (response.data.success) {
        setUserData(response.data.data);
      } else {
        throw new Error(response.data.error || 'Failed to fetch user data');
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
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

  const getRoleColor = (role) => {
    const colors = {
      'admin': 'bg-red-100 text-red-800',
      'vendor': 'bg-blue-100 text-blue-800',
      'user': 'bg-green-100 text-green-800',
      'customer': 'bg-green-100 text-green-800'
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, index) => (
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
            <h3 className="text-sm font-medium text-red-800">Error loading user data</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
        <button
          onClick={fetchUserData}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const totalRegistrations = userData?.userRegistrations?.reduce((sum, item) => sum + item.newUsers, 0) || 0;
  const totalActiveUsers = userData?.userActivity?.reduce((sum, item) => sum + item.activeUsers, 0) || 0;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 sm:mb-0">User Analytics</h2>
        
        <div className="flex items-center space-x-4">
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="day">Daily</option>
            <option value="week">Weekly</option>
            <option value="month">Monthly</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-blue-100">
              <FiUserPlus className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">New Registrations</p>
              <p className="text-2xl font-bold text-gray-900">{totalRegistrations}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-green-100">
              <FiActivity className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Users</p>
              <p className="text-2xl font-bold text-gray-900">{totalActiveUsers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-purple-100">
              <FiUsers className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">User Segments</p>
              <p className="text-2xl font-bold text-gray-900">
                {userData?.userSegments?.length || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* User Registrations Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">User Registrations Over Time</h3>
        
        {userData?.userRegistrations?.length > 0 ? (
          <div className="space-y-2">
            {userData.userRegistrations.slice(-10).map((item, index) => {
              const maxUsers = Math.max(...userData.userRegistrations.map(d => d.newUsers));
              const width = maxUsers > 0 ? (item.newUsers / maxUsers) * 100 : 0;
              
              return (
                <div key={index} className="flex items-center space-x-4">
                  <div className="w-20 text-sm text-gray-600 text-right">
                    {item._id}
                  </div>
                  <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                    <div 
                      className="bg-blue-600 h-6 rounded-full flex items-center justify-end pr-2"
                      style={{ width: `${Math.max(width, 5)}%` }}
                    >
                      <span className="text-xs text-white font-medium">
                        {item.newUsers}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No registration data available for the selected period
          </div>
        )}
      </div>

      {/* User Activity Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">User Activity Over Time</h3>
        
        {userData?.userActivity?.length > 0 ? (
          <div className="space-y-2">
            {userData.userActivity.slice(-10).map((item, index) => {
              const maxUsers = Math.max(...userData.userActivity.map(d => d.activeUsers));
              const width = maxUsers > 0 ? (item.activeUsers / maxUsers) * 100 : 0;
              
              return (
                <div key={index} className="flex items-center space-x-4">
                  <div className="w-20 text-sm text-gray-600 text-right">
                    {item._id}
                  </div>
                  <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                    <div 
                      className="bg-green-600 h-6 rounded-full flex items-center justify-end pr-2"
                      style={{ width: `${Math.max(width, 5)}%` }}
                    >
                      <span className="text-xs text-white font-medium">
                        {item.activeUsers}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No activity data available for the selected period
          </div>
        )}
      </div>

      {/* User Segments */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">User Segments</h3>
        
        {userData?.userSegments?.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {userData.userSegments.map((segment, index) => (
              <div key={index} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(segment._id)}`}>
                    {segment._id}
                  </span>
                  <span className="text-lg font-bold text-gray-900">
                    {segment.count}
                  </span>
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>Total Spent: {formatCurrency(segment.totalSpent || 0)}</p>
                  <p>Avg Spent: {formatCurrency(segment.avgSpent || 0)}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No user segment data available
          </div>
        )}
      </div>

      {/* Top Customers */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <FiStar className="w-5 h-5 mr-2" />
          Top Customers
        </h3>
        
        {userData?.topCustomers?.length > 0 ? (
          <div className="space-y-4">
            {userData.topCustomers.slice(0, 10).map((customer, index) => (
              <div key={index} className="flex items-center space-x-4 p-3 border border-gray-200 rounded-lg">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <FiUsers className="w-5 h-5 text-blue-600" />
                </div>
                
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">
                    {customer.name}
                  </h4>
                  <p className="text-sm text-gray-500">
                    {customer.email}
                  </p>
                  {customer.lastLogin && (
                    <p className="text-xs text-gray-400">
                      Last login: {new Date(customer.lastLogin).toLocaleDateString()}
                    </p>
                  )}
                </div>
                
                <div className="text-right">
                  <p className="font-semibold text-gray-900">
                    {formatCurrency(customer.totalSpent)}
                  </p>
                  <p className="text-sm text-gray-500">
                    {customer.loyaltyPoints || 0} points
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No customer data available
          </div>
        )}
      </div>
    </div>
  );
};

export default UserAnalytics;
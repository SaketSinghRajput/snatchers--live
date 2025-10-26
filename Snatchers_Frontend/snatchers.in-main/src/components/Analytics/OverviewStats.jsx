import React, { useState, useEffect } from 'react';
import { 
  FiUsers, 
  FiShoppingCart, 
  FiDollarSign, 
  FiPackage,
  FiEye,
  FiTrendingUp,
  FiTrendingDown,
  FiMinus
} from 'react-icons/fi';
import api from '../../api';

const OverviewStats = ({ dateRange, refreshTrigger }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchOverviewStats();
  }, [dateRange, refreshTrigger]);

  const fetchOverviewStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get(`/api/analytics/dashboard-stats?period=${dateRange}`);
      
      if (response.data.success) {
        setStats(response.data.data.overview);
      } else {
        throw new Error(response.data.error || 'Failed to fetch stats');
      }
    } catch (error) {
      console.error('Error fetching overview stats:', error);
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

  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const statCards = [
    {
      title: 'Total Users',
      value: stats?.totalUsers || 0,
      icon: FiUsers,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      change: null // We could calculate this with previous period data
    },
    {
      title: 'Active Users',
      value: stats?.activeUsers || 0,
      icon: FiUsers,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      change: null
    },
    {
      title: 'Total Orders',
      value: stats?.totalOrders || 0,
      icon: FiShoppingCart,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      change: null
    },
    {
      title: 'Revenue',
      value: formatCurrency(stats?.totalRevenue || 0),
      icon: FiDollarSign,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
      change: null
    },
    {
      title: 'Products',
      value: stats?.totalProducts || 0,
      icon: FiPackage,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      change: null
    },
    {
      title: 'Page Views',
      value: formatNumber(stats?.pageViews || 0),
      icon: FiEye,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100',
      change: null
    },
    {
      title: 'Conversion Rate',
      value: `${stats?.conversionRate || 0}%`,
      icon: FiTrendingUp,
      color: 'text-pink-600',
      bgColor: 'bg-pink-100',
      change: null
    },
    {
      title: 'Avg Order Value',
      value: formatCurrency(stats?.avgOrderValue || 0),
      icon: FiDollarSign,
      color: 'text-teal-600',
      bgColor: 'bg-teal-100',
      change: null
    }
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
              <div className="ml-4 flex-1">
                <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                <div className="h-6 bg-gray-200 rounded w-16"></div>
              </div>
            </div>
          </div>
        ))}
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
            <h3 className="text-sm font-medium text-red-800">Error loading analytics</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
        <button
          onClick={fetchOverviewStats}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center">
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <div className="flex items-center">
                    <p className="text-2xl font-bold text-gray-900">
                      {stat.value}
                    </p>
                    {stat.change && (
                      <div className={`ml-2 flex items-center text-sm ${
                        stat.change > 0 ? 'text-green-600' : 
                        stat.change < 0 ? 'text-red-600' : 'text-gray-500'
                      }`}>
                        {stat.change > 0 ? (
                          <FiTrendingUp className="w-4 h-4 mr-1" />
                        ) : stat.change < 0 ? (
                          <FiTrendingDown className="w-4 h-4 mr-1" />
                        ) : (
                          <FiMinus className="w-4 h-4 mr-1" />
                        )}
                        <span>{Math.abs(stat.change)}%</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Summary */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Summary</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">User Engagement</span>
              <div className="flex items-center">
                <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${Math.min((stats?.activeUsers / stats?.totalUsers) * 100, 100)}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium">
                  {stats?.totalUsers > 0 ? Math.round((stats.activeUsers / stats.totalUsers) * 100) : 0}%
                </span>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Conversion Rate</span>
              <div className="flex items-center">
                <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                  <div 
                    className="bg-green-600 h-2 rounded-full" 
                    style={{ width: `${Math.min(stats?.conversionRate * 10, 100)}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium">{stats?.conversionRate}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Insights */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Insights</h3>
          <div className="space-y-3">
            <div className="flex items-start">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3"></div>
              <div>
                <p className="text-sm text-gray-900 font-medium">
                  {formatNumber(stats?.pageViews || 0)} page views in the last {dateRange.replace('d', ' days').replace('y', ' year')}
                </p>
                <p className="text-xs text-gray-500">
                  Average of {Math.round((stats?.pageViews || 0) / parseInt(dateRange))} views per day
                </p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3"></div>
              <div>
                <p className="text-sm text-gray-900 font-medium">
                  {formatCurrency(stats?.avgOrderValue || 0)} average order value
                </p>
                <p className="text-xs text-gray-500">
                  Total revenue of {formatCurrency(stats?.totalRevenue || 0)} from {stats?.totalOrders || 0} orders
                </p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 mr-3"></div>
              <div>
                <p className="text-sm text-gray-900 font-medium">
                  {stats?.activeUsers || 0} active users out of {stats?.totalUsers || 0} total
                </p>
                <p className="text-xs text-gray-500">
                  {stats?.totalUsers > 0 ? Math.round((stats.activeUsers / stats.totalUsers) * 100) : 0}% user engagement rate
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverviewStats;
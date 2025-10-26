import React, { useState, useEffect } from 'react';
import { 
  FiCpu, 
  FiHardDrive, 
  FiClock,
  FiZap,
  FiServer,
  FiActivity,
  FiAlertTriangle,
  FiCheckCircle,
  FiTrendingUp,
  FiTrendingDown
} from 'react-icons/fi';
import api from '../../api';

const PerformanceMonitor = ({ refreshTrigger }) => {
  const [performanceData, setPerformanceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState('24h');

  useEffect(() => {
    fetchPerformanceData();
  }, [refreshTrigger, period]);

  const fetchPerformanceData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get(`/api/analytics/performance?period=${period}`);
      
      if (response.data.success) {
        setPerformanceData(response.data.data);
      } else {
        throw new Error(response.data.error || 'Failed to fetch performance data');
      }
    } catch (error) {
      console.error('Error fetching performance data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const getHealthStatus = (value, thresholds) => {
    if (value <= thresholds.good) {
      return { status: 'good', color: 'text-green-600', bgColor: 'bg-green-100', icon: FiCheckCircle };
    } else if (value <= thresholds.warning) {
      return { status: 'warning', color: 'text-yellow-600', bgColor: 'bg-yellow-100', icon: FiAlertTriangle };
    } else {
      return { status: 'critical', color: 'text-red-600', bgColor: 'bg-red-100', icon: FiAlertTriangle };
    }
  };

  const formatUptime = (seconds) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  if (loading) {
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
            <h3 className="text-sm font-medium text-red-800">Error loading performance data</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
        <button
          onClick={fetchPerformanceData}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const loadTimeHealth = getHealthStatus(performanceData?.avgPageLoadTime || 0, { good: 2, warning: 5 });
  const memoryUsage = performanceData?.systemHealth?.memoryUsage || { used: 0, total: 0 };
  const memoryPercent = memoryUsage.total > 0 ? (memoryUsage.used / memoryUsage.total) * 100 : 0;
  const memoryHealth = getHealthStatus(memoryPercent, { good: 70, warning: 85 });

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 sm:mb-0 flex items-center">
          <FiActivity className="w-5 h-5 mr-2" />
          Performance Monitor
        </h2>
        
        <div className="flex items-center space-x-4">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
          </select>
        </div>
      </div>

      {/* Key Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className={`p-3 rounded-lg ${loadTimeHealth.bgColor}`}>
              <FiClock className={`w-6 h-6 ${loadTimeHealth.color}`} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Page Load</p>
              <p className="text-2xl font-bold text-gray-900">
                {performanceData?.avgPageLoadTime?.toFixed(2) || 0}s
              </p>
              <p className="text-xs text-gray-500">
                {performanceData?.pageViewCount || 0} page views
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className={`p-3 rounded-lg ${memoryHealth.bgColor}`}>
              <FiHardDrive className={`w-6 h-6 ${memoryHealth.color}`} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Memory Usage</p>
              <p className="text-2xl font-bold text-gray-900">
                {memoryPercent.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500">
                {memoryUsage.used}MB / {memoryUsage.total}MB
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-blue-100">
              <FiServer className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">System Uptime</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatUptime(performanceData?.systemHealth?.uptime || 0)}
              </p>
              <p className="text-xs text-gray-500">
                Node.js {performanceData?.systemHealth?.nodeVersion || 'N/A'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-purple-100">
              <FiZap className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Error Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {performanceData?.errorRate?.length || 0}
              </p>
              <p className="text-xs text-gray-500">errors detected</p>
            </div>
          </div>
        </div>
      </div>

      {/* API Response Times */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <FiCpu className="w-5 h-5 mr-2" />
          API Response Times
        </h3>
        
        {performanceData?.apiResponseTimes?.length > 0 ? (
          <div className="space-y-4">
            {performanceData.apiResponseTimes.map((api, index) => {
              const responseTimeHealth = getHealthStatus(api.avgResponseTime, { good: 100, warning: 300 });
              const HealthIcon = responseTimeHealth.icon;
              
              return (
                <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <HealthIcon className={`w-5 h-5 ${responseTimeHealth.color}`} />
                    <div>
                      <h4 className="font-medium text-gray-900">{api.endpoint}</h4>
                      <p className="text-sm text-gray-500">
                        {api.requestCount} requests
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className={`font-semibold ${responseTimeHealth.color}`}>
                      {api.avgResponseTime}ms
                    </p>
                    <div className="flex items-center text-sm text-gray-500">
                      {api.avgResponseTime < 150 ? (
                        <FiTrendingDown className="w-4 h-4 text-green-500 mr-1" />
                      ) : (
                        <FiTrendingUp className="w-4 h-4 text-red-500 mr-1" />
                      )}
                      <span>avg response</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No API response time data available
          </div>
        )}
      </div>

      {/* Error Analysis */}
      {performanceData?.errorRate?.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <FiAlertTriangle className="w-5 h-5 mr-2 text-red-600" />
            Error Analysis
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {performanceData.errorRate.map((error, index) => (
              <div key={index} className="p-4 border border-red-200 rounded-lg bg-red-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-red-800">
                    {error._id.replace('_', ' ').toUpperCase()}
                  </span>
                  <span className="text-lg font-bold text-red-900">
                    {error.count}
                  </span>
                </div>
                <p className="text-sm text-red-600">
                  Error occurrences in the selected period
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Performance Recommendations */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Recommendations</h3>
        
        <div className="space-y-3">
          {performanceData?.avgPageLoadTime > 3 && (
            <div className="flex items-start space-x-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <FiAlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-800">Slow Page Load Times</h4>
                <p className="text-sm text-yellow-700">
                  Average page load time is {performanceData.avgPageLoadTime.toFixed(2)}s. Consider optimizing images, enabling compression, or implementing caching.
                </p>
              </div>
            </div>
          )}
          
          {memoryPercent > 80 && (
            <div className="flex items-start space-x-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <FiAlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-red-800">High Memory Usage</h4>
                <p className="text-sm text-red-700">
                  Memory usage is at {memoryPercent.toFixed(1)}%. Consider optimizing memory usage or scaling your infrastructure.
                </p>
              </div>
            </div>
          )}
          
          {performanceData?.errorRate?.length === 0 && performanceData?.avgPageLoadTime <= 2 && memoryPercent <= 70 && (
            <div className="flex items-start space-x-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <FiCheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-green-800">System Performance is Optimal</h4>
                <p className="text-sm text-green-700">
                  All performance metrics are within acceptable ranges. Your system is running smoothly.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PerformanceMonitor;
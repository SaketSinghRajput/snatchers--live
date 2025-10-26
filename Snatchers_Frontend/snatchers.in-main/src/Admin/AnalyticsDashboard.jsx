import React, { useState } from 'react';
import { 
  FiUsers, 
  FiDollarSign,
  FiPackage,
  FiDownload,
  FiRefreshCw,
  FiCalendar,
  FiBarChart2,
  FiActivity,
  FiCpu
} from 'react-icons/fi';
import AdminDashboard from './AdminDashboard';
import OverviewStats from '../components/Analytics/OverviewStats';
import SalesChart from '../components/Analytics/SalesChart';
import UserAnalytics from '../components/Analytics/UserAnalytics';
import ProductAnalytics from '../components/Analytics/ProductAnalytics';
import RealTimeStats from '../components/Analytics/RealTimeStats';
import PerformanceMonitor from '../components/Analytics/PerformanceMonitor';
import ExportModal from '../components/Analytics/ExportModal';

const AnalyticsDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState('30d');

  const [showExportModal, setShowExportModal] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const tabs = [
    { id: 'overview', name: 'Overview', icon: FiBarChart2 },
    { id: 'sales', name: 'Sales', icon: FiDollarSign },
    { id: 'users', name: 'Users', icon: FiUsers },
    { id: 'products', name: 'Products', icon: FiPackage },
    { id: 'realtime', name: 'Real-time', icon: FiActivity },
    { id: 'performance', name: 'Performance', icon: FiCpu }
  ];

  const dateRangeOptions = [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 90 days' },
    { value: '1y', label: 'Last year' }
  ];

  const refreshData = () => {
    setLastUpdated(new Date());
    // This will trigger re-fetch in child components
  };

  const handleExport = () => {
    setShowExportModal(true);
  };

  return (
    <AdminDashboard>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Comprehensive insights into your platform performance
            </p>
          </div>
          
          <div className="flex items-center space-x-3 mt-4 sm:mt-0">
            {/* Date Range Selector */}
            <div className="flex items-center space-x-2">
              <FiCalendar className="w-4 h-4 text-gray-500" />
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {dateRangeOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Action Buttons */}
            <button
              onClick={refreshData}
              className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <FiRefreshCw className="w-4 h-4" />
              <span className="text-sm">Refresh</span>
            </button>

            <button
              onClick={handleExport}
              className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FiDownload className="w-4 h-4" />
              <span className="text-sm">Export</span>
            </button>
          </div>
        </div>

        {/* Last Updated */}
        <div className="text-sm text-gray-500">
          Last updated: {lastUpdated.toLocaleString()}
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="min-h-96">
          {activeTab === 'overview' && (
            <OverviewStats 
              dateRange={dateRange} 
              refreshTrigger={lastUpdated}
            />
          )}
          
          {activeTab === 'sales' && (
            <SalesChart 
              dateRange={dateRange} 
              refreshTrigger={lastUpdated}
            />
          )}
          
          {activeTab === 'users' && (
            <UserAnalytics 
              dateRange={dateRange} 
              refreshTrigger={lastUpdated}
            />
          )}
          
          {activeTab === 'products' && (
            <ProductAnalytics 
              dateRange={dateRange} 
              refreshTrigger={lastUpdated}
            />
          )}
          
          {activeTab === 'realtime' && (
            <RealTimeStats refreshTrigger={lastUpdated} />
          )}
          
          {activeTab === 'performance' && (
            <PerformanceMonitor refreshTrigger={lastUpdated} />
          )}
        </div>

        {/* Export Modal */}
        {showExportModal && (
          <ExportModal
            isOpen={showExportModal}
            onClose={() => setShowExportModal(false)}
            dateRange={dateRange}
          />
        )}
      </div>
    </AdminDashboard>
  );
};

export default AnalyticsDashboard;
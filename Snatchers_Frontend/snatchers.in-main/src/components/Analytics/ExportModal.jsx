import React, { useState } from 'react';
import { 
  FiDownload, 
  FiX, 
  FiCalendar,
  FiFileText,
  FiDatabase,
  FiLoader
} from 'react-icons/fi';
import api from '../../api';

const ExportModal = ({ isOpen, onClose, dateRange }) => {
  const [exportType, setExportType] = useState('sales');
  const [exportFormat, setExportFormat] = useState('json');
  const [customDateRange, setCustomDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [useCustomDate, setUseCustomDate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const exportTypes = [
    {
      id: 'sales',
      name: 'Sales Report',
      description: 'Order data, revenue, and sales metrics',
      icon: FiDatabase
    },
    {
      id: 'users',
      name: 'User Report',
      description: 'User registrations, activity, and profiles',
      icon: FiDatabase
    },
    {
      id: 'products',
      name: 'Product Report',
      description: 'Product catalog, inventory, and performance',
      icon: FiDatabase
    },
    {
      id: 'analytics',
      name: 'Analytics Data',
      description: 'Raw analytics events and user behavior',
      icon: FiDatabase
    }
  ];

  const formatOptions = [
    { id: 'json', name: 'JSON', description: 'Structured data format' },
    { id: 'csv', name: 'CSV', description: 'Spreadsheet compatible format' }
  ];

  const handleExport = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        type: exportType,
        format: exportFormat
      });

      // Use custom date range if specified, otherwise use the current dateRange
      if (useCustomDate && customDateRange.startDate && customDateRange.endDate) {
        params.append('startDate', customDateRange.startDate);
        params.append('endDate', customDateRange.endDate);
      } else {
        // Calculate date range based on current selection
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
      }

      const response = await api.get(`/api/analytics/export?${params}`, {
        responseType: exportFormat === 'csv' ? 'blob' : 'json'
      });

      if (exportFormat === 'csv') {
        // Handle CSV download
        const blob = new Blob([response.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        const filename = `${exportType}_report_${new Date().toISOString().split('T')[0]}.csv`;
        link.setAttribute('download', filename);
        
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      } else {
        // Handle JSON download
        const dataStr = JSON.stringify(response.data, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        const filename = `${exportType}_report_${new Date().toISOString().split('T')[0]}.json`;
        link.setAttribute('download', filename);
        
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      }

      // Close modal after successful export
      onClose();
    } catch (error) {
      console.error('Export error:', error);
      setError(error.response?.data?.error || error.message || 'Export failed');
    } finally {
      setLoading(false);
    }
  };

  const getDateRangeLabel = () => {
    switch (dateRange) {
      case '7d': return 'Last 7 days';
      case '30d': return 'Last 30 days';
      case '90d': return 'Last 90 days';
      case '1y': return 'Last year';
      default: return 'Current period';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <FiDownload className="w-5 h-5 mr-2" />
            Export Analytics Data
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FiX className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Export Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select Data Type
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {exportTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.id}
                    onClick={() => setExportType(type.id)}
                    className={`p-4 border rounded-lg text-left transition-colors ${
                      exportType === type.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <Icon className={`w-5 h-5 mt-0.5 ${
                        exportType === type.id ? 'text-blue-600' : 'text-gray-400'
                      }`} />
                      <div>
                        <h3 className={`font-medium ${
                          exportType === type.id ? 'text-blue-900' : 'text-gray-900'
                        }`}>
                          {type.name}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {type.description}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Format Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Export Format
            </label>
            <div className="grid grid-cols-2 gap-3">
              {formatOptions.map((format) => (
                <button
                  key={format.id}
                  onClick={() => setExportFormat(format.id)}
                  className={`p-3 border rounded-lg text-left transition-colors ${
                    exportFormat === format.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <FiFileText className={`w-4 h-4 ${
                      exportFormat === format.id ? 'text-blue-600' : 'text-gray-400'
                    }`} />
                    <div>
                      <h4 className={`font-medium ${
                        exportFormat === format.id ? 'text-blue-900' : 'text-gray-900'
                      }`}>
                        {format.name}
                      </h4>
                      <p className="text-xs text-gray-500">
                        {format.description}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Date Range Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Date Range
            </label>
            
            <div className="space-y-3">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="dateRange"
                  checked={!useCustomDate}
                  onChange={() => setUseCustomDate(false)}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                  Use current selection: {getDateRangeLabel()}
                </span>
              </label>
              
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="dateRange"
                  checked={useCustomDate}
                  onChange={() => setUseCustomDate(true)}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Custom date range</span>
              </label>
            </div>

            {useCustomDate && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Start Date
                  </label>
                  <div className="relative">
                    <FiCalendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="date"
                      value={customDateRange.startDate}
                      onChange={(e) => setCustomDateRange(prev => ({
                        ...prev,
                        startDate: e.target.value
                      }))}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    End Date
                  </label>
                  <div className="relative">
                    <FiCalendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="date"
                      value={customDateRange.endDate}
                      onChange={(e) => setCustomDateRange(prev => ({
                        ...prev,
                        endDate: e.target.value
                      }))}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="text-red-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Export Error</h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={loading || (useCustomDate && (!customDateRange.startDate || !customDateRange.endDate))}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {loading ? (
              <FiLoader className="w-4 h-4 animate-spin" />
            ) : (
              <FiDownload className="w-4 h-4" />
            )}
            <span>{loading ? 'Exporting...' : 'Export Data'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
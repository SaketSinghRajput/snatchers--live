import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FiServer,
  FiActivity,
  FiAlertTriangle,
  FiCheckCircle,
  FiXCircle,
  FiCpu,
  FiHardDrive,
  FiDatabase,
  FiGlobe,
  FiRefreshCw,
  FiDownload,
  FiPlay,
  FiStop,
  FiRotateCcw
} from 'react-icons/fi';

const ProductionMonitoring = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [deploymentHistory, setDeploymentHistory] = useState([]);
  const [systemResources, setSystemResources] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      setRefreshing(true);
      const [dashboardRes, historyRes, resourcesRes, alertsRes] = await Promise.all([
        fetch('/api/deployment/dashboard', { credentials: 'include' }),
        fetch('/api/deployment/history', { credentials: 'include' }),
        fetch('/api/deployment/resources', { credentials: 'include' }),
        fetch('/api/monitoring/alerts?limit=20', { credentials: 'include' })
      ]);

      if (dashboardRes.ok) {
        const data = await dashboardRes.json();
        setDashboardData(data.dashboard);
      }

      if (historyRes.ok) {
        const data = await historyRes.json();
        setDeploymentHistory(data.history || []);
      }

      if (resourcesRes.ok) {
        const data = await resourcesRes.json();
        setSystemResources(data.resources);
      }

      if (alertsRes.ok) {
        const data = await alertsRes.json();
        setAlerts(data.alerts || []);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleDeploy = async (environment = 'production') => {
    try {
      const response = await fetch('/api/deployment/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ environment })
      });

      if (response.ok) {
        alert('Deployment started successfully');
        fetchDashboardData();
      } else {
        const error = await response.json();
        alert(`Deployment failed: ${error.error}`);
      }
    } catch (error) {
      alert(`Deployment failed: ${error.message}`);
    }
  };

  const handleRollback = async (deploymentId) => {
    if (!confirm('Are you sure you want to rollback this deployment?')) return;

    try {
      const response = await fetch('/api/deployment/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ deploymentId, reason: 'Manual rollback from dashboard' })
      });

      if (response.ok) {
        alert('Rollback initiated successfully');
        fetchDashboardData();
      } else {
        const error = await response.json();
        alert(`Rollback failed: ${error.error}`);
      }
    } catch (error) {
      alert(`Rollback failed: ${error.message}`);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'degraded': return 'text-yellow-600';
      case 'unhealthy': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy': return <FiCheckCircle className="text-green-600" />;
      case 'degraded': return <FiAlertTriangle className="text-yellow-600" />;
      case 'unhealthy': return <FiXCircle className="text-red-600" />;
      default: return <FiActivity className="text-gray-600" />;
    }
  };

  const formatUptime = (seconds) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Production Monitoring</h1>
        <div className="flex space-x-3">
          <button
            onClick={fetchDashboardData}
            disabled={refreshing}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <FiRefreshCw className={`mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => handleDeploy('production')}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <FiPlay className="mr-2" />
            Deploy
          </button>
        </div>
      </div>

      {/* Status Overview */}
      {dashboardData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-lg shadow-md"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">System Status</p>
                <p className={`text-2xl font-bold ${getStatusColor(dashboardData.overview.status)}`}>
                  {dashboardData.overview.status.toUpperCase()}
                </p>
              </div>
              {getStatusIcon(dashboardData.overview.status)}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-6 rounded-lg shadow-md"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Uptime</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatUptime(dashboardData.overview.uptime)}
                </p>
              </div>
              <FiActivity className="text-blue-600" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white p-6 rounded-lg shadow-md"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Requests</p>
                <p className="text-2xl font-bold text-gray-900">
                  {dashboardData.performance.requests.total.toLocaleString()}
                </p>
              </div>
              <FiGlobe className="text-green-600" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white p-6 rounded-lg shadow-md"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Error Rate</p>
                <p className={`text-2xl font-bold ${
                  dashboardData.performance.requests.errorRate > 0.05 ? 'text-red-600' : 'text-green-600'
                }`}>
                  {(dashboardData.performance.requests.errorRate * 100).toFixed(2)}%
                </p>
              </div>
              <FiAlertTriangle className={
                dashboardData.performance.requests.errorRate > 0.05 ? 'text-red-600' : 'text-green-600'
              } />
            </div>
          </motion.div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', name: 'Overview', icon: FiServer },
            { id: 'performance', name: 'Performance', icon: FiActivity },
            { id: 'deployments', name: 'Deployments', icon: FiPlay },
            { id: 'alerts', name: 'Alerts', icon: FiAlertTriangle }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="mr-2" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && dashboardData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* System Resources */}
          {systemResources && (
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <FiCpu className="mr-2" />
                System Resources
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm">
                    <span>CPU Usage</span>
                    <span>{systemResources.cpu.loadAverage[0].toFixed(2)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${Math.min(systemResources.cpu.loadAverage[0] * 10, 100)}%` }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm">
                    <span>Memory Usage</span>
                    <span>{formatBytes(systemResources.memory.used)} / {formatBytes(systemResources.memory.total)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{ width: `${(systemResources.memory.used / systemResources.memory.total) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Services Status */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <FiDatabase className="mr-2" />
              Services Status
            </h3>
            <div className="space-y-3">
              {Object.entries(dashboardData.services).map(([service, status]) => (
                <div key={service} className="flex items-center justify-between">
                  <span className="capitalize">{service.replace('_', ' ')}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    status === 'healthy' || status === 'configured' 
                      ? 'bg-green-100 text-green-800'
                      : status === 'degraded'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {typeof status === 'string' ? status : 'Unknown'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'performance' && dashboardData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-4">Performance Metrics</h3>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span>Average Response Time</span>
                <span className="font-medium">{dashboardData.performance.responseTime.avgResponseTime?.toFixed(2) || 0}ms</span>
              </div>
              <div className="flex justify-between">
                <span>Total Requests</span>
                <span className="font-medium">{dashboardData.performance.requests.total.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Error Count</span>
                <span className="font-medium">{dashboardData.performance.requests.errors}</span>
              </div>
              <div className="flex justify-between">
                <span>Error Rate</span>
                <span className="font-medium">{(dashboardData.performance.requests.errorRate * 100).toFixed(2)}%</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-4">Error Summary</h3>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span>Total Errors</span>
                <span className="font-medium">{dashboardData.errors.total}</span>
              </div>
              {Object.entries(dashboardData.errors.bySeverity).map(([severity, count]) => (
                <div key={severity} className="flex justify-between">
                  <span className="capitalize">{severity}</span>
                  <span className={`font-medium ${
                    severity === 'critical' ? 'text-red-600' :
                    severity === 'high' ? 'text-orange-600' :
                    severity === 'medium' ? 'text-yellow-600' : 'text-green-600'
                  }`}>
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'deployments' && (
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold">Deployment History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Version
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Environment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Deployed By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {deploymentHistory.slice(0, 10).map((deployment) => (
                  <tr key={deployment.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {deployment.version || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {deployment.environment}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        deployment.status === 'success' 
                          ? 'bg-green-100 text-green-800'
                          : deployment.status === 'failed'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {deployment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {deployment.deployedBy}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(deployment.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {deployment.status === 'success' && (
                        <button
                          onClick={() => handleRollback(deployment.id)}
                          className="text-red-600 hover:text-red-900 flex items-center"
                        >
                          <FiRotateCcw className="mr-1" />
                          Rollback
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'alerts' && (
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold">Recent Alerts</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {alerts.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No alerts found
              </div>
            ) : (
              alerts.map((alert) => (
                <div key={alert.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start">
                      <div className={`flex-shrink-0 ${
                        alert.severity === 'critical' ? 'text-red-600' :
                        alert.severity === 'warning' ? 'text-yellow-600' :
                        alert.severity === 'error' ? 'text-orange-600' : 'text-blue-600'
                      }`}>
                        <FiAlertTriangle />
                      </div>
                      <div className="ml-3">
                        <h4 className="text-sm font-medium text-gray-900">
                          {alert.type.replace(/_/g, ' ').toUpperCase()}
                        </h4>
                        <p className="text-sm text-gray-500 mt-1">
                          {JSON.stringify(alert.data)}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(alert.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      alert.severity === 'critical' ? 'bg-red-100 text-red-800' :
                      alert.severity === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                      alert.severity === 'error' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {alert.severity}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductionMonitoring;
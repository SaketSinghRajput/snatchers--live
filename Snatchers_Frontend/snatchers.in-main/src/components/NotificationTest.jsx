import React, { useState } from 'react';
import { Bell, Send, Settings, TestTube } from 'lucide-react';
import { 
  requestNotificationPermission, 
  showTestNotification, 
  subscribeToWebPush,
  sendTestNotification 
} from '../utils/notificationUtils';

const NotificationTest = () => {
  const [permission, setPermission] = useState(Notification.permission);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleRequestPermission = async () => {
    setLoading(true);
    const result = await requestNotificationPermission();
    setPermission(result);
    setLoading(false);
    
    if (result === 'granted') {
      setMessage('✅ Notification permission granted!');
    } else if (result === 'denied') {
      setMessage('❌ Notification permission denied');
    } else {
      setMessage('⚠️ Notification permission not supported');
    }
  };

  const handleShowTestNotification = () => {
    const notification = showTestNotification('Test Notification', {
      body: 'This is a browser notification test',
      icon: '/favicon.ico'
    });
    
    if (notification) {
      setMessage('📱 Browser notification shown');
    } else {
      setMessage('❌ Could not show browser notification');
    }
  };

  const handleSubscribePush = async () => {
    setLoading(true);
    const subscription = await subscribeToWebPush();
    setLoading(false);
    
    if (subscription) {
      setMessage('🔔 Successfully subscribed to push notifications');
    } else {
      setMessage('❌ Failed to subscribe to push notifications');
    }
  };

  const handleSendServerNotification = async () => {
    setLoading(true);
    try {
      await sendTestNotification('system', 'Server Test', 'This is a test notification from the server');
      setMessage('🚀 Server notification sent successfully');
    } catch (error) {
      setMessage(`❌ Failed to send server notification: ${error.message}`);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6 m-4">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-100 rounded-lg">
          <TestTube className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Notification Test</h2>
          <p className="text-sm text-gray-600">Test notification functionality</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Permission Status */}
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Permission Status:</span>
            <span className={`text-sm font-medium ${
              permission === 'granted' ? 'text-green-600' : 
              permission === 'denied' ? 'text-red-600' : 'text-yellow-600'
            }`}>
              {permission}
            </span>
          </div>
        </div>

        {/* Request Permission */}
        {permission !== 'granted' && (
          <button
            onClick={handleRequestPermission}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <Bell className="w-4 h-4" />
            Request Permission
          </button>
        )}

        {/* Test Browser Notification */}
        {permission === 'granted' && (
          <button
            onClick={handleShowTestNotification}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Bell className="w-4 h-4" />
            Show Browser Notification
          </button>
        )}

        {/* Subscribe to Push */}
        {permission === 'granted' && (
          <button
            onClick={handleSubscribePush}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            <Settings className="w-4 h-4" />
            Subscribe to Push
          </button>
        )}

        {/* Send Server Notification */}
        <button
          onClick={handleSendServerNotification}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
          Send Server Notification
        </button>

        {/* Message Display */}
        {message && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">{message}</p>
          </div>
        )}

        {/* Loading Indicator */}
        {loading && (
          <div className="flex items-center justify-center py-2">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationTest;
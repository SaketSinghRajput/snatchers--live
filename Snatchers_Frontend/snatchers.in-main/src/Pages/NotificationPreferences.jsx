import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Mail, 
  Smartphone, 
  Settings, 
  Save, 
  ArrowLeft,
  Check,
  X,
  Info,
  Shield,
  Volume2,
  VolumeX
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const NotificationPreferences = () => {
  const [preferences, setPreferences] = useState({
    email: {
      orderUpdates: true,
      promotions: true,
      priceDrops: true,
      backInStock: true,
      abandonedCart: true,
      newsletter: false
    },
    push: {
      enabled: false,
      orderUpdates: true,
      promotions: false,
      priceDrops: true,
      backInStock: true,
      deals: true,
      system: true
    },
    inApp: {
      orderUpdates: true,
      promotions: true,
      priceDrops: true,
      backInStock: true,
      deals: true,
      system: true,
      sound: true
    },
    frequency: {
      promotional: 'daily', // daily, weekly, monthly
      priceDrops: 'immediate', // immediate, daily, weekly
      deals: 'immediate'
    }
  });

  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushPermission, setPushPermission] = useState('default');

  useEffect(() => {
    loadPreferences();
    checkPushSupport();
  }, []);

  const loadPreferences = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/user/notification-preferences', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.preferences) {
          setPreferences(prev => ({
            ...prev,
            ...data.preferences
          }));
        }
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
    }
  };

  const checkPushSupport = () => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window;
    setPushSupported(supported);
    
    if (supported && Notification.permission) {
      setPushPermission(Notification.permission);
    }
  };

  const savePreferences = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/user/notification-preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ preferences })
      });

      if (response.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (error) {
      console.error('Failed to save preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const requestPushPermission = async () => {
    if (!pushSupported) return;

    try {
      const permission = await Notification.requestPermission();
      setPushPermission(permission);
      
      if (permission === 'granted') {
        // Subscribe to push notifications
        const registration = await navigator.serviceWorker.ready;
        const response = await fetch('/api/notifications/vapid-public-key');
        const { publicKey } = await response.json();
        
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: publicKey
        });

        await fetch('/api/notifications/subscribe-push', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ subscription })
        });

        // Update preferences
        setPreferences(prev => ({
          ...prev,
          push: { ...prev.push, enabled: true }
        }));
      }
    } catch (error) {
      console.error('Push permission request failed:', error);
    }
  };

  const disablePushNotifications = async () => {
    try {
      await fetch('/api/notifications/unsubscribe-push', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      setPreferences(prev => ({
        ...prev,
        push: { ...prev.push, enabled: false }
      }));
    } catch (error) {
      console.error('Failed to disable push notifications:', error);
    }
  };

  const updatePreference = (category, key, value) => {
    setPreferences(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
  };

  const PreferenceToggle = ({ label, description, checked, onChange, disabled = false }) => (
    <div className="flex items-center justify-between py-3">
      <div className="flex-1">
        <h4 className="text-sm font-medium text-gray-900">{label}</h4>
        {description && (
          <p className="text-sm text-gray-600 mt-1">{description}</p>
        )}
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="sr-only peer"
        />
        <div className={`relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}></div>
      </label>
    </div>
  );

  const PreferenceSelect = ({ label, value, onChange, options }) => (
    <div className="py-3">
      <label className="block text-sm font-medium text-gray-900 mb-2">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-4">
              <Link
                to="/notifications"
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Settings className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Notification Preferences</h1>
                  <p className="text-gray-600">Customize how you receive notifications</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Email Notifications */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Mail className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Email Notifications</h2>
                  <p className="text-sm text-gray-600">Receive updates via email</p>
                </div>
              </div>
            </div>
            
            <div className="p-6 space-y-1">
              <PreferenceToggle
                label="Order Updates"
                description="Confirmations, shipping, and delivery updates"
                checked={preferences.email.orderUpdates}
                onChange={(value) => updatePreference('email', 'orderUpdates', value)}
              />
              
              <PreferenceToggle
                label="Promotions & Deals"
                description="Special offers and promotional campaigns"
                checked={preferences.email.promotions}
                onChange={(value) => updatePreference('email', 'promotions', value)}
              />
              
              <PreferenceToggle
                label="Price Drop Alerts"
                description="When items in your wishlist go on sale"
                checked={preferences.email.priceDrops}
                onChange={(value) => updatePreference('email', 'priceDrops', value)}
              />
              
              <PreferenceToggle
                label="Back in Stock"
                description="When out-of-stock items become available"
                checked={preferences.email.backInStock}
                onChange={(value) => updatePreference('email', 'backInStock', value)}
              />
              
              <PreferenceToggle
                label="Abandoned Cart"
                description="Reminders about items left in your cart"
                checked={preferences.email.abandonedCart}
                onChange={(value) => updatePreference('email', 'abandonedCart', value)}
              />
              
              <PreferenceToggle
                label="Newsletter"
                description="Weekly newsletter with trends and tips"
                checked={preferences.email.newsletter}
                onChange={(value) => updatePreference('email', 'newsletter', value)}
              />
            </div>
          </div>

          {/* Push Notifications */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Smartphone className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Push Notifications</h2>
                  <p className="text-sm text-gray-600">Real-time browser notifications</p>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              {!pushSupported ? (
                <div className="text-center py-8">
                  <X className="w-12 h-12 text-red-300 mx-auto mb-4" />
                  <p className="text-gray-600">Push notifications are not supported in your browser</p>
                </div>
              ) : pushPermission === 'denied' ? (
                <div className="text-center py-8">
                  <Shield className="w-12 h-12 text-red-300 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">Push notifications are blocked</p>
                  <p className="text-sm text-gray-500">Please enable notifications in your browser settings</p>
                </div>
              ) : pushPermission === 'default' ? (
                <div className="text-center py-8">
                  <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">Enable push notifications to get real-time updates</p>
                  <button
                    onClick={requestPushPermission}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Enable Push Notifications
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex items-center justify-between py-3 border-b border-gray-100">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Push Notifications</h4>
                      <p className="text-sm text-gray-600">Enable or disable all push notifications</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {preferences.push.enabled && (
                        <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                          Active
                        </span>
                      )}
                      <button
                        onClick={preferences.push.enabled ? disablePushNotifications : requestPushPermission}
                        className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                          preferences.push.enabled
                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        }`}
                      >
                        {preferences.push.enabled ? 'Disable' : 'Enable'}
                      </button>
                    </div>
                  </div>
                  
                  <PreferenceToggle
                    label="Order Updates"
                    description="Important order status changes"
                    checked={preferences.push.orderUpdates}
                    onChange={(value) => updatePreference('push', 'orderUpdates', value)}
                    disabled={!preferences.push.enabled}
                  />
                  
                  <PreferenceToggle
                    label="Price Drop Alerts"
                    description="Instant alerts for price drops"
                    checked={preferences.push.priceDrops}
                    onChange={(value) => updatePreference('push', 'priceDrops', value)}
                    disabled={!preferences.push.enabled}
                  />
                  
                  <PreferenceToggle
                    label="Back in Stock"
                    description="When items become available again"
                    checked={preferences.push.backInStock}
                    onChange={(value) => updatePreference('push', 'backInStock', value)}
                    disabled={!preferences.push.enabled}
                  />
                  
                  <PreferenceToggle
                    label="Deal Alerts"
                    description="Flash sales and limited-time offers"
                    checked={preferences.push.deals}
                    onChange={(value) => updatePreference('push', 'deals', value)}
                    disabled={!preferences.push.enabled}
                  />
                  
                  <PreferenceToggle
                    label="System Notifications"
                    description="Important system updates and maintenance"
                    checked={preferences.push.system}
                    onChange={(value) => updatePreference('push', 'system', value)}
                    disabled={!preferences.push.enabled}
                  />
                </div>
              )}
            </div>
          </div>

          {/* In-App Notifications */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Bell className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">In-App Notifications</h2>
                  <p className="text-sm text-gray-600">Notifications within the app</p>
                </div>
              </div>
            </div>
            
            <div className="p-6 space-y-1">
              <PreferenceToggle
                label="Sound Effects"
                description="Play sound when receiving notifications"
                checked={preferences.inApp.sound}
                onChange={(value) => updatePreference('inApp', 'sound', value)}
              />
              
              <PreferenceToggle
                label="Order Updates"
                description="Order confirmations and status changes"
                checked={preferences.inApp.orderUpdates}
                onChange={(value) => updatePreference('inApp', 'orderUpdates', value)}
              />
              
              <PreferenceToggle
                label="Promotions"
                description="Special offers and deals"
                checked={preferences.inApp.promotions}
                onChange={(value) => updatePreference('inApp', 'promotions', value)}
              />
              
              <PreferenceToggle
                label="Price Drops"
                description="Price alerts for wishlist items"
                checked={preferences.inApp.priceDrops}
                onChange={(value) => updatePreference('inApp', 'priceDrops', value)}
              />
              
              <PreferenceToggle
                label="Back in Stock"
                description="Availability notifications"
                checked={preferences.inApp.backInStock}
                onChange={(value) => updatePreference('inApp', 'backInStock', value)}
              />
              
              <PreferenceToggle
                label="Deal Alerts"
                description="Flash sales and time-sensitive offers"
                checked={preferences.inApp.deals}
                onChange={(value) => updatePreference('inApp', 'deals', value)}
              />
              
              <PreferenceToggle
                label="System Messages"
                description="Important system announcements"
                checked={preferences.inApp.system}
                onChange={(value) => updatePreference('inApp', 'system', value)}
              />
            </div>
          </div>
        </div>

        {/* Frequency Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mt-6">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Info className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Frequency Settings</h2>
                <p className="text-sm text-gray-600">Control how often you receive certain types of notifications</p>
              </div>
            </div>
          </div>
          
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <PreferenceSelect
              label="Promotional Emails"
              value={preferences.frequency.promotional}
              onChange={(value) => updatePreference('frequency', 'promotional', value)}
              options={[
                { value: 'immediate', label: 'Immediate' },
                { value: 'daily', label: 'Daily Digest' },
                { value: 'weekly', label: 'Weekly Summary' },
                { value: 'monthly', label: 'Monthly Newsletter' }
              ]}
            />
            
            <PreferenceSelect
              label="Price Drop Alerts"
              value={preferences.frequency.priceDrops}
              onChange={(value) => updatePreference('frequency', 'priceDrops', value)}
              options={[
                { value: 'immediate', label: 'Immediate' },
                { value: 'daily', label: 'Daily Summary' },
                { value: 'weekly', label: 'Weekly Summary' }
              ]}
            />
            
            <PreferenceSelect
              label="Deal Notifications"
              value={preferences.frequency.deals}
              onChange={(value) => updatePreference('frequency', 'deals', value)}
              options={[
                { value: 'immediate', label: 'Immediate' },
                { value: 'daily', label: 'Daily Summary' },
                { value: 'weekly', label: 'Weekly Summary' }
              ]}
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-6 flex justify-end">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={savePreferences}
            disabled={loading}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
              saved
                ? 'bg-green-600 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Saving...
              </>
            ) : saved ? (
              <>
                <Check className="w-4 h-4" />
                Saved!
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Preferences
              </>
            )}
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default NotificationPreferences;
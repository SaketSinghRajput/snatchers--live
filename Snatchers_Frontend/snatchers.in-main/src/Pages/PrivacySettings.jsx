import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, 
  Download, 
  Trash2, 
  Eye, 
  EyeOff, 
  AlertTriangle,
  CheckCircle,
  Info,
  Settings,
  Lock,
  UserX
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const PrivacySettings = () => {
  const [consent, setConsent] = useState({
    marketing: false,
    analytics: false,
    functional: true
  });
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAnonymizeConfirm, setShowAnonymizeConfirm] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState('');
  const [deleteReason, setDeleteReason] = useState('');

  useEffect(() => {
    fetchConsentSettings();
  }, []);

  const fetchConsentSettings = async () => {
    try {
      const response = await fetch('/api/privacy/consent', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setConsent(data);
      }
    } catch (error) {
      console.error('Failed to fetch consent settings:', error);
      toast.error('Failed to load privacy settings');
    }
  };

  const updateConsent = async (newConsent) => {
    try {
      setLoading(true);
      const response = await fetch('/api/privacy/consent', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(newConsent)
      });

      if (response.ok) {
        const data = await response.json();
        setConsent(data.consent);
        toast.success('Privacy preferences updated successfully');
      } else {
        throw new Error('Failed to update consent');
      }
    } catch (error) {
      console.error('Failed to update consent:', error);
      toast.error('Failed to update privacy preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleConsentChange = (type, value) => {
    const newConsent = { ...consent, [type]: value };
    setConsent(newConsent);
    updateConsent(newConsent);
  };

  const exportData = async (format = 'json') => {
    try {
      setLoading(true);
      const response = await fetch(`/api/privacy/export-data?format=${format}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `user_data_${new Date().toISOString().split('T')[0]}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        toast.success('Data export started successfully');
      } else {
        throw new Error('Failed to export data');
      }
    } catch (error) {
      console.error('Failed to export data:', error);
      toast.error('Failed to export your data');
    } finally {
      setLoading(false);
    }
  };

  const deleteData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/privacy/delete-data', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          confirmEmail,
          reason: deleteReason
        })
      });

      if (response.ok) {
        toast.success('Your data has been successfully deleted');
        // Redirect to home page or logout
        window.location.href = '/';
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete data');
      }
    } catch (error) {
      console.error('Failed to delete data:', error);
      toast.error(error.message || 'Failed to delete your data');
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const anonymizeData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/privacy/anonymize-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          confirmEmail,
          reason: deleteReason
        })
      });

      if (response.ok) {
        toast.success('Your data has been successfully anonymized');
        // Redirect to home page or logout
        window.location.href = '/';
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to anonymize data');
      }
    } catch (error) {
      console.error('Failed to anonymize data:', error);
      toast.error(error.message || 'Failed to anonymize your data');
    } finally {
      setLoading(false);
      setShowAnonymizeConfirm(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-lg overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-8">
            <div className="flex items-center space-x-3">
              <Shield className="h-8 w-8 text-white" />
              <div>
                <h1 className="text-2xl font-bold text-white">Privacy Settings</h1>
                <p className="text-blue-100 mt-1">
                  Manage your data and privacy preferences
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-8">
            {/* Consent Management */}
            <section>
              <div className="flex items-center space-x-2 mb-4">
                <Settings className="h-5 w-5 text-gray-600" />
                <h2 className="text-xl font-semibold text-gray-900">
                  Consent Preferences
                </h2>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">Functional Cookies</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Essential for the website to function properly. Cannot be disabled.
                    </p>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="ml-2 text-sm text-green-600 font-medium">Required</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">Analytics Cookies</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Help us understand how you use our website to improve your experience.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={consent.analytics}
                      onChange={(e) => handleConsentChange('analytics', e.target.checked)}
                      className="sr-only peer"
                      disabled={loading}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">Marketing Cookies</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Used to show you personalized ads and promotional content.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={consent.marketing}
                      onChange={(e) => handleConsentChange('marketing', e.target.checked)}
                      className="sr-only peer"
                      disabled={loading}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </section>

            {/* Data Export */}
            <section>
              <div className="flex items-center space-x-2 mb-4">
                <Download className="h-5 w-5 text-gray-600" />
                <h2 className="text-xl font-semibold text-gray-900">
                  Data Export
                </h2>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-start space-x-3">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-blue-900">Your Right to Data Portability</h3>
                    <p className="text-sm text-blue-700 mt-1">
                      You can download all your personal data in a structured format.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={() => exportData('json')}
                  disabled={loading}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="h-4 w-4" />
                  <span>Export as JSON</span>
                </button>
                
                <button
                  onClick={() => exportData('csv')}
                  disabled={loading}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="h-4 w-4" />
                  <span>Export as CSV</span>
                </button>
              </div>
            </section>

            {/* Data Management */}
            <section>
              <div className="flex items-center space-x-2 mb-4">
                <Lock className="h-5 w-5 text-gray-600" />
                <h2 className="text-xl font-semibold text-gray-900">
                  Data Management
                </h2>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-yellow-900">Important Notice</h3>
                    <p className="text-sm text-yellow-700 mt-1">
                      These actions are permanent and cannot be undone. Please consider carefully.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => setShowAnonymizeConfirm(true)}
                  className="flex items-center space-x-3 p-4 border border-orange-200 rounded-lg hover:bg-orange-50 transition-colors"
                >
                  <EyeOff className="h-5 w-5 text-orange-600" />
                  <div className="text-left">
                    <h3 className="font-medium text-gray-900">Anonymize Data</h3>
                    <p className="text-sm text-gray-600">
                      Remove personal identifiers while keeping order history
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center space-x-3 p-4 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="h-5 w-5 text-red-600" />
                  <div className="text-left">
                    <h3 className="font-medium text-gray-900">Delete All Data</h3>
                    <p className="text-sm text-gray-600">
                      Permanently delete your account and all associated data
                    </p>
                  </div>
                </button>
              </div>
            </section>
          </div>
        </motion.div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-lg max-w-md w-full p-6"
            >
              <div className="flex items-center space-x-3 mb-4">
                <UserX className="h-6 w-6 text-red-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Delete All Data
                </h3>
              </div>
              
              <p className="text-gray-600 mb-4">
                This will permanently delete your account and all associated data. 
                This action cannot be undone.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm your email address
                  </label>
                  <input
                    type="email"
                    value={confirmEmail}
                    onChange={(e) => setConfirmEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="Enter your email"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason (optional)
                  </label>
                  <textarea
                    value={deleteReason}
                    onChange={(e) => setDeleteReason(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    rows="3"
                    placeholder="Why are you deleting your account?"
                  />
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={deleteData}
                  disabled={!confirmEmail || loading}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Deleting...' : 'Delete Data'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Anonymize Confirmation Modal */}
        {showAnonymizeConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-lg max-w-md w-full p-6"
            >
              <div className="flex items-center space-x-3 mb-4">
                <EyeOff className="h-6 w-6 text-orange-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Anonymize Data
                </h3>
              </div>
              
              <p className="text-gray-600 mb-4">
                This will remove your personal identifiers while keeping your order 
                history for business records. This action cannot be undone.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm your email address
                  </label>
                  <input
                    type="email"
                    value={confirmEmail}
                    onChange={(e) => setConfirmEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="Enter your email"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason (optional)
                  </label>
                  <textarea
                    value={deleteReason}
                    onChange={(e) => setDeleteReason(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    rows="3"
                    placeholder="Why are you anonymizing your data?"
                  />
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => setShowAnonymizeConfirm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={anonymizeData}
                  disabled={!confirmEmail || loading}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Processing...' : 'Anonymize Data'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PrivacySettings;
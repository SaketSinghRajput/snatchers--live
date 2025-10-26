import React, { useState, useEffect } from 'react';
import { 
  User, 
  Settings, 
  MapPin, 
  Heart, 
  Package, 
  Star,
  Edit3,
  Plus
} from 'lucide-react';
import api from '../../api';
import ProfileSection from './ProfileSection';
import AddressSection from './AddressSection';
import PreferencesSection from './PreferencesSection';
import DashboardStats from './DashboardStats';

const UserDashboard = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/user/dashboard');
      setDashboardData(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (profileData) => {
    try {
      await api.put('/api/user/profile', profileData);
      await fetchDashboardData(); // Refresh data
      return { success: true };
    } catch (err) {
      console.error('Error updating profile:', err);
      return { success: false, error: err.response?.data?.error || 'Update failed' };
    }
  };

  const handlePreferencesUpdate = async (preferencesData) => {
    try {
      await api.put('/api/user/preferences', preferencesData);
      await fetchDashboardData(); // Refresh data
      return { success: true };
    } catch (err) {
      console.error('Error updating preferences:', err);
      return { success: false, error: err.response?.data?.error || 'Update failed' };
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'addresses', label: 'Addresses', icon: MapPin },
    { id: 'preferences', label: 'Preferences', icon: Settings }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={fetchDashboardData}
            className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Account</h1>
          <p className="text-gray-600">Manage your profile, addresses, and preferences</p>
        </div>

        {/* Dashboard Stats */}
        <DashboardStats data={dashboardData} />

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition ${
                      activeTab === tab.id
                        ? 'border-black text-black'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon size={18} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'profile' && (
              <ProfileSection 
                profile={dashboardData.profile || {}}
                onUpdate={handleProfileUpdate}
              />
            )}
            {activeTab === 'addresses' && (
              <AddressSection 
                addresses={dashboardData.addresses || []}
                onRefresh={fetchDashboardData}
              />
            )}
            {activeTab === 'preferences' && (
              <PreferencesSection 
                preferences={dashboardData.preferences || {}}
                onUpdate={handlePreferencesUpdate}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
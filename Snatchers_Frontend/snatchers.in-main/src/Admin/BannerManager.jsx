import React, { useState, useEffect } from 'react';
import { 
  FiPlus, 
  FiEdit2, 
  FiTrash2, 
  FiImage,
  FiSave,
  FiX,
  FiEye,
  FiEyeOff,
  FiExternalLink,
  FiCalendar
} from 'react-icons/fi';
import api from '../api';
import AdminDashboard from './AdminDashboard';

const BannerManager = () => {
  const [banners, setBanners] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [filterPosition, setFilterPosition] = useState('');
  const [filterPlacement, setFilterPlacement] = useState('');
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    total: 0
  });

  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    description: '',
    image: '',
    mobileImage: '',
    link: {
      url: '',
      text: 'Learn More',
      openInNewTab: false
    },
    position: 'hero',
    placement: 'home',
    isActive: true,
    sortOrder: 0,
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    targetAudience: {
      userType: 'all',
      categories: [],
      gender: 'all'
    }
  });

  const positions = [
    { value: 'hero', label: 'Hero Banner' },
    { value: 'category', label: 'Category Banner' },
    { value: 'product', label: 'Product Banner' },
    { value: 'footer', label: 'Footer Banner' },
    { value: 'sidebar', label: 'Sidebar Banner' }
  ];

  const placements = [
    { value: 'home', label: 'Home Page' },
    { value: 'shop', label: 'Shop Page' },
    { value: 'category', label: 'Category Pages' },
    { value: 'product', label: 'Product Pages' },
    { value: 'global', label: 'Global (All Pages)' }
  ];

  const userTypes = [
    { value: 'all', label: 'All Users' },
    { value: 'new', label: 'New Users' },
    { value: 'returning', label: 'Returning Users' },
    { value: 'premium', label: 'Premium Users' }
  ];

  useEffect(() => {
    fetchBanners();
    fetchCategories();
  }, [filterPosition, filterPlacement, pagination.currentPage]);

  const fetchBanners = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.currentPage,
        limit: 20
      });
      
      if (filterPosition) params.append('position', filterPosition);
      if (filterPlacement) params.append('placement', filterPlacement);

      const response = await api.get(`/api/admin/banners?${params}`);
      setBanners(response.data.banners);
      setPagination({
        currentPage: response.data.currentPage,
        totalPages: response.data.totalPages,
        total: response.data.total
      });
    } catch (err) {
      setError('Failed to fetch banners');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get('/api/admin/categories?flat=true');
      setCategories(response.data);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = {
        ...formData,
        startDate: formData.startDate ? new Date(formData.startDate) : new Date(),
        endDate: formData.endDate ? new Date(formData.endDate) : null
      };

      if (editingBanner) {
        await api.put(`/api/admin/banners/${editingBanner._id}`, submitData);
      } else {
        await api.post('/api/admin/banners', submitData);
      }
      
      await fetchBanners();
      resetForm();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save banner');
    }
  };

  const handleEdit = (banner) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title,
      subtitle: banner.subtitle || '',
      description: banner.description || '',
      image: banner.image,
      mobileImage: banner.mobileImage || '',
      link: {
        url: banner.link?.url || '',
        text: banner.link?.text || 'Learn More',
        openInNewTab: banner.link?.openInNewTab || false
      },
      position: banner.position,
      placement: banner.placement,
      isActive: banner.isActive,
      sortOrder: banner.sortOrder,
      startDate: banner.startDate ? new Date(banner.startDate).toISOString().split('T')[0] : '',
      endDate: banner.endDate ? new Date(banner.endDate).toISOString().split('T')[0] : '',
      targetAudience: {
        userType: banner.targetAudience?.userType || 'all',
        categories: banner.targetAudience?.categories?.map(cat => cat._id) || [],
        gender: banner.targetAudience?.gender || 'all'
      }
    });
    setShowForm(true);
  };

  const handleDelete = async (bannerId) => {
    if (!window.confirm('Are you sure you want to delete this banner?')) return;
    
    try {
      await api.delete(`/api/admin/banners/${bannerId}`);
      await fetchBanners();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete banner');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      subtitle: '',
      description: '',
      image: '',
      mobileImage: '',
      link: {
        url: '',
        text: 'Learn More',
        openInNewTab: false
      },
      position: 'hero',
      placement: 'home',
      isActive: true,
      sortOrder: 0,
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      targetAudience: {
        userType: 'all',
        categories: [],
        gender: 'all'
      }
    });
    setEditingBanner(null);
    setShowForm(false);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No end date';
    return new Date(dateString).toLocaleDateString();
  };

  const isCurrentlyActive = (banner) => {
    const now = new Date();
    const startDate = new Date(banner.startDate);
    const endDate = banner.endDate ? new Date(banner.endDate) : null;
    
    return banner.isActive && 
           startDate <= now && 
           (!endDate || endDate >= now);
  };

  if (loading && banners.length === 0) {
    return (
      <AdminDashboard>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading banners...</div>
        </div>
      </AdminDashboard>
    );
  }

  return (
    <AdminDashboard>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Banner Management</h1>
            <p className="text-gray-600">Manage promotional banners and content</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <FiPlus className="w-4 h-4 mr-2" />
            Add Banner
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex flex-col sm:flex-row gap-4">
            <div>
              <select
                value={filterPosition}
                onChange={(e) => {
                  setFilterPosition(e.target.value);
                  setPagination({ ...pagination, currentPage: 1 });
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Positions</option>
                {positions.map(pos => (
                  <option key={pos.value} value={pos.value}>{pos.label}</option>
                ))}
              </select>
            </div>
            <div>
              <select
                value={filterPlacement}
                onChange={(e) => {
                  setFilterPlacement(e.target.value);
                  setPagination({ ...pagination, currentPage: 1 });
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Placements</option>
                {placements.map(place => (
                  <option key={place.value} value={place.value}>{place.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Banner Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">
                  {editingBanner ? 'Edit Banner' : 'Add New Banner'}
                </h2>
                <button
                  onClick={resetForm}
                  className="p-2 hover:bg-gray-100 rounded"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Banner Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Subtitle
                    </label>
                    <input
                      type="text"
                      value={formData.subtitle}
                      onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Images */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Desktop Image URL *
                    </label>
                    <input
                      type="url"
                      required
                      value={formData.image}
                      onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mobile Image URL
                    </label>
                    <input
                      type="url"
                      value={formData.mobileImage}
                      onChange={(e) => setFormData({ ...formData, mobileImage: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Link Settings */}
                <div className="border-t pt-4">
                  <h3 className="text-lg font-medium mb-3">Link Settings</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Link URL
                      </label>
                      <input
                        type="url"
                        value={formData.link.url}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          link: { ...formData.link, url: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Link Text
                      </label>
                      <input
                        type="text"
                        value={formData.link.text}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          link: { ...formData.link, text: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="mt-3">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.link.openInNewTab}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          link: { ...formData.link, openInNewTab: e.target.checked }
                        })}
                        className="mr-2"
                      />
                      Open in new tab
                    </label>
                  </div>
                </div>

                {/* Position and Placement */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Position
                    </label>
                    <select
                      value={formData.position}
                      onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {positions.map(pos => (
                        <option key={pos.value} value={pos.value}>{pos.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Placement
                    </label>
                    <select
                      value={formData.placement}
                      onChange={(e) => setFormData({ ...formData, placement: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {placements.map(place => (
                        <option key={place.value} value={place.value}>{place.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sort Order
                    </label>
                    <input
                      type="number"
                      value={formData.sortOrder}
                      onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Schedule */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date (Optional)
                    </label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Target Audience */}
                <div className="border-t pt-4">
                  <h3 className="text-lg font-medium mb-3">Target Audience</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        User Type
                      </label>
                      <select
                        value={formData.targetAudience.userType}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          targetAudience: { ...formData.targetAudience, userType: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        {userTypes.map(type => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Gender
                      </label>
                      <select
                        value={formData.targetAudience.gender}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          targetAudience: { ...formData.targetAudience, gender: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="all">All Genders</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex items-center">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="mr-2"
                    />
                    Active
                  </label>
                </div>

                <div className="flex items-center justify-end space-x-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <FiSave className="w-4 h-4 mr-2" />
                    {editingBanner ? 'Update' : 'Create'} Banner
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Banners Grid */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">
                Banners ({pagination.total})
              </h2>
            </div>
          </div>
          
          {banners.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No banners found. Create your first banner to get started.
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {banners.map((banner) => (
                <div key={banner._id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <img
                        src={banner.image}
                        alt={banner.title}
                        className="w-24 h-16 object-cover rounded-lg border"
                      />
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="text-lg font-medium text-gray-900">
                            {banner.title}
                          </h3>
                          {isCurrentlyActive(banner) ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <FiEye className="w-3 h-3 mr-1" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              <FiEyeOff className="w-3 h-3 mr-1" />
                              Inactive
                            </span>
                          )}
                        </div>
                        
                        {banner.subtitle && (
                          <p className="text-sm text-gray-600 mb-1">{banner.subtitle}</p>
                        )}
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span className="capitalize">{banner.position}</span>
                          <span>•</span>
                          <span className="capitalize">{banner.placement}</span>
                          <span>•</span>
                          <span className="flex items-center">
                            <FiCalendar className="w-3 h-3 mr-1" />
                            {formatDate(banner.startDate)} - {formatDate(banner.endDate)}
                          </span>
                          {banner.clickCount > 0 && (
                            <>
                              <span>•</span>
                              <span>{banner.clickCount} clicks</span>
                            </>
                          )}
                        </div>
                        
                        {banner.link?.url && (
                          <div className="mt-2">
                            <a
                              href={banner.link.url}
                              target={banner.link.openInNewTab ? '_blank' : '_self'}
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-sm text-blue-600 hover:underline"
                            >
                              {banner.link.text}
                              {banner.link.openInNewTab && (
                                <FiExternalLink className="w-3 h-3 ml-1" />
                              )}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEdit(banner)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                      >
                        <FiEdit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(banner._id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing {((pagination.currentPage - 1) * 20) + 1} to{' '}
                  {Math.min(pagination.currentPage * 20, pagination.total)} of{' '}
                  {pagination.total} results
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setPagination({ ...pagination, currentPage: pagination.currentPage - 1 })}
                    disabled={pagination.currentPage === 1}
                    className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1">
                    Page {pagination.currentPage} of {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => setPagination({ ...pagination, currentPage: pagination.currentPage + 1 })}
                    disabled={pagination.currentPage === pagination.totalPages}
                    className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminDashboard>
  );
};

export default BannerManager;
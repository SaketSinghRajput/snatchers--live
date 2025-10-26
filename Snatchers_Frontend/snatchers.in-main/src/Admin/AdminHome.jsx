import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FiGrid, 
  FiTag, 
  FiImage, 
  FiStar,
  FiPackage,
  FiTrendingUp,
  FiUsers,
  FiShoppingCart
} from 'react-icons/fi';
import api from '../api';
import AdminDashboard from './AdminDashboard';

const AdminHome = () => {
  const [stats, setStats] = useState({
    categories: 0,
    brands: 0,
    banners: 0,
    featuredProducts: 0,
    totalProducts: 0,
    activeUsers: 0,
    totalOrders: 0,
    revenue: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      
      // Fetch basic stats from different endpoints
      const [categoriesRes, brandsRes, bannersRes, featuredRes] = await Promise.all([
        api.get('/api/admin/categories?flat=true').catch(() => ({ data: [] })),
        api.get('/api/admin/brands?limit=1').catch(() => ({ data: { total: 0 } })),
        api.get('/api/admin/banners?limit=1').catch(() => ({ data: { total: 0 } })),
        api.get('/api/admin/featured-products?limit=1').catch(() => ({ data: { total: 0 } }))
      ]);

      setStats({
        categories: categoriesRes.data.length || 0,
        brands: brandsRes.data.total || 0,
        banners: bannersRes.data.total || 0,
        featuredProducts: featuredRes.data.total || 0,
        totalProducts: 0, // Would need products endpoint
        activeUsers: 0,   // Would need users endpoint
        totalOrders: 0,   // Would need orders endpoint
        revenue: 0        // Would need analytics endpoint
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    {
      title: 'Manage Categories',
      description: 'Organize products with hierarchical categories',
      icon: FiGrid,
      link: '/admin/categories',
      color: 'bg-blue-500'
    },
    {
      title: 'Manage Brands',
      description: 'Add and organize product brands',
      icon: FiTag,
      link: '/admin/brands',
      color: 'bg-green-500'
    },
    {
      title: 'Manage Banners',
      description: 'Create promotional banners and content',
      icon: FiImage,
      link: '/admin/banners',
      color: 'bg-purple-500'
    },
    {
      title: 'Featured Products',
      description: 'Highlight products in featured sections',
      icon: FiStar,
      link: '/admin/featured',
      color: 'bg-yellow-500'
    }
  ];

  const statCards = [
    {
      title: 'Categories',
      value: stats.categories,
      icon: FiGrid,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Brands',
      value: stats.brands,
      icon: FiTag,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Banners',
      value: stats.banners,
      icon: FiImage,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      title: 'Featured Products',
      value: stats.featuredProducts,
      icon: FiStar,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100'
    }
  ];

  return (
    <AdminDashboard>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg p-6 text-white">
          <h1 className="text-3xl font-bold mb-2">Welcome to Admin Dashboard</h1>
          <p className="text-blue-100">
            Manage your e-commerce platform content, categories, and promotional materials
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                    <Icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {loading ? '...' : stat.value}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Content Management</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <Link
                  key={index}
                  to={action.link}
                  className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start">
                    <div className={`p-3 rounded-lg ${action.color} text-white`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {action.title}
                      </h3>
                      <p className="text-gray-600 text-sm">
                        {action.description}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Recent Activity Placeholder */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Recent Activity</h2>
          </div>
          <div className="p-6">
            <div className="text-center text-gray-500 py-8">
              <FiTrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <div className="text-lg font-medium mb-2">Activity tracking coming soon</div>
              <div className="text-sm">
                Recent changes to categories, brands, and banners will appear here.
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminDashboard>
  );
};

export default AdminHome;
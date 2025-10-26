import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaUser, FaHeart, FaShoppingBag, FaEye } from 'react-icons/fa';
import RecentlyViewed from './RecentlyViewed';
import TrendingProducts from './TrendingProducts';
import PopularProducts from './PopularProducts';
import RecommendationCarousel from './RecommendationCarousel';
import { useAuth } from '../contexts/AuthContext';
import api from '../api';

const PersonalizedHomepage = ({ className = "" }) => {
  const { user } = useAuth();
  const [userPreferences, setUserPreferences] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch user dashboard data and preferences
  const fetchUserData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const response = await api.get('/api/user/dashboard');
      if (response.data) {
        setDashboardData(response.data);
        setUserPreferences(response.data.preferences);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, [user]);

  // Get personalized greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    const name = dashboardData?.profile?.firstName || user?.name || 'there';
    
    if (hour < 12) return `Good morning, ${name}!`;
    if (hour < 17) return `Good afternoon, ${name}!`;
    return `Good evening, ${name}!`;
  };

  // Get user's preferred categories for popular products
  const getPreferredCategories = () => {
    return userPreferences?.categories || ['Rings', 'Necklace', 'Earrings'];
  };

  if (loading) {
    return (
      <div className={`personalized-homepage ${className}`}>
        <div className="animate-pulse space-y-8">
          <div className="bg-gray-200 rounded-lg h-32"></div>
          <div className="bg-gray-200 rounded-lg h-64"></div>
          <div className="bg-gray-200 rounded-lg h-64"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`personalized-homepage space-y-12 ${className}`}>
      {/* Personalized Welcome Section */}
      {user && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-8 border border-blue-100"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                {getGreeting()}
              </h1>
              <p className="text-gray-600 mb-4">
                Welcome back! Here's what's new for you.
              </p>
              
              {dashboardData && (
                <div className="flex items-center gap-6 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <FaHeart className="text-red-500" />
                    <span>{dashboardData.wishlistCount || 0} items in wishlist</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FaShoppingBag className="text-green-500" />
                    <span>₹{dashboardData.totalSpent || 0} total spent</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FaEye className="text-blue-500" />
                    <span>{dashboardData.recentlyViewed?.length || 0} recently viewed</span>
                  </div>
                </div>
              )}
            </div>
            
            <div className="hidden md:block">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                <FaUser className="text-white text-2xl" />
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Recently Viewed Products */}
      {user && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <RecentlyViewed
            title="Continue Where You Left Off"
            limit={8}
            layout="carousel"
            className="bg-white rounded-xl p-6 shadow-sm border"
          />
        </motion.div>
      )}

      {/* Personalized Recommendations */}
      {user && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <RecommendationCarousel
            title="Recommended Just for You"
            type="personalized"
            limit={10}
            autoScroll={true}
            autoScrollInterval={6000}
            className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-100"
          />
        </motion.div>
      )}

      {/* Trending Products */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <TrendingProducts
          title="What's Trending"
          limit={8}
          layout="carousel"
          autoScroll={true}
          autoScrollInterval={7000}
          className="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl p-6 border border-orange-100"
        />
      </motion.div>

      {/* Popular Products in User's Preferred Categories */}
      {getPreferredCategories().slice(0, 2).map((category, index) => (
        <motion.div
          key={category}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 + index * 0.1 }}
        >
          <PopularProducts
            title={`Popular in ${category}`}
            category={category}
            limit={8}
            layout="carousel"
            className={`${
              index % 2 === 0 
                ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-100' 
                : 'bg-white border-gray-200'
            } rounded-xl p-6 border`}
          />
        </motion.div>
      ))}

      {/* Collaborative Recommendations */}
      {user && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <RecommendationCarousel
            title="People Also Liked"
            type="collaborative"
            limit={8}
            className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6 border border-green-100"
          />
        </motion.div>
      )}

      {/* Fallback Popular Products for Non-authenticated Users */}
      {!user && (
        <>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <TrendingProducts
              title="Trending Now"
              limit={8}
              layout="carousel"
              autoScroll={true}
              className="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl p-6 border border-orange-100"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <PopularProducts
              title="Popular Products"
              limit={8}
              layout="carousel"
              className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-6 border border-yellow-100"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <PopularProducts
              title="Popular in Rings"
              category="Rings"
              limit={8}
              layout="carousel"
              className="bg-white rounded-xl p-6 shadow-sm border"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <PopularProducts
              title="Popular in Necklaces"
              category="Necklace"
              limit={8}
              layout="carousel"
              className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-100"
            />
          </motion.div>
        </>
      )}
    </div>
  );
};

export default PersonalizedHomepage;
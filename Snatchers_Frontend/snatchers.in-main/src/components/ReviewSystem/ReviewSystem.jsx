import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../api';
import { toast } from 'react-toastify';
import ReviewSummary from './ReviewSummary';
import ReviewList from './ReviewList';
import ReviewForm from './ReviewForm';
import { useNavigate } from 'react-router-dom';

const ReviewSystem = ({ 
  productId, 
  initialReviews = [],
  showReviewForm = true,
  maxDisplayReviews = null 
}) => {
  const navigate = useNavigate();
  const [reviews, setReviews] = useState(initialReviews);
  const [loading, setLoading] = useState(false);
  const [showWriteForm, setShowWriteForm] = useState(false);
  const [userReview, setUserReview] = useState(null);
  const [editingReview, setEditingReview] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Calculate review statistics
  const totalReviews = reviews.length;
  const averageRating = totalReviews > 0 
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews 
    : 0;

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      try {
        await api.get('/api/auth/check');
        setIsAuthenticated(true);
      } catch (error) {
        setIsAuthenticated(false);
      }
    };
    checkAuth();
  }, []);

  // Fetch reviews
  useEffect(() => {
    if (productId && initialReviews.length === 0) {
      fetchReviews();
    }
  }, [productId, initialReviews.length]);

  // Check if user has already reviewed this product
  useEffect(() => {
    if (isAuthenticated && reviews.length > 0) {
      checkUserReview();
    }
  }, [isAuthenticated, reviews]);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/api/products/${productId}/reviews`);
      setReviews(response.data);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const checkUserReview = async () => {
    try {
      const response = await api.get(`/api/products/${productId}/reviews/user`);
      setUserReview(response.data);
    } catch (error) {
      // User hasn't reviewed this product yet
      setUserReview(null);
    }
  };

  const handleWriteReviewClick = () => {
    if (!isAuthenticated) {
      toast.error('Please log in to write a review');
      // Redirect to login or show login modal
      navigate('/login');
      return;
    }

    if (userReview) {
      setEditingReview(userReview);
    }
    
    setShowWriteForm(true);
  };

  const handleReviewSubmitted = (newReview) => {
    if (editingReview) {
      // Update existing review
      setReviews(prev => prev.map(review => 
        review._id === editingReview._id ? newReview : review
      ));
      setUserReview(newReview);
      setEditingReview(null);
    } else {
      // Add new review
      setReviews(prev => [newReview, ...prev]);
      setUserReview(newReview);
    }
    
    setShowWriteForm(false);
  };

  const handleCancelReview = () => {
    setShowWriteForm(false);
    setEditingReview(null);
  };

  const handleReviewsUpdate = (updatedReviews) => {
    setReviews(updatedReviews);
  };

  const handleEditReview = () => {
    if (userReview) {
      setEditingReview(userReview);
      setShowWriteForm(true);
    }
  };

  const handleDeleteReview = async () => {
    if (!userReview) return;

    if (window.confirm('Are you sure you want to delete your review?')) {
      try {
        await api.delete(`/api/reviews/${userReview._id}`);
        setReviews(prev => prev.filter(review => review._id !== userReview._id));
        setUserReview(null);
        toast.success('Review deleted successfully');
      } catch (error) {
        console.error('Error deleting review:', error);
        toast.error('Failed to delete review');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="review-system space-y-6">
      {/* Review Summary */}
      <ReviewSummary
        reviews={reviews}
        averageRating={averageRating}
        totalReviews={totalReviews}
        showWriteReview={showReviewForm && isAuthenticated && !showWriteForm}
        onWriteReviewClick={handleWriteReviewClick}
      />

      {/* User's Existing Review */}
      {userReview && !showWriteForm && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-50 border border-blue-200 rounded-lg p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-blue-900">Your Review</h4>
              <p className="text-sm text-blue-700">
                You reviewed this product on {new Date(userReview.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleEditReview}
                className="text-sm text-blue-600 hover:text-blue-700 underline"
              >
                Edit
              </button>
              <button
                onClick={handleDeleteReview}
                className="text-sm text-red-600 hover:text-red-700 underline"
              >
                Delete
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Review Form */}
      <AnimatePresence>
        {showWriteForm && (
          <ReviewForm
            productId={productId}
            existingReview={editingReview}
            onReviewSubmitted={handleReviewSubmitted}
            onCancel={handleCancelReview}
          />
        )}
      </AnimatePresence>

      {/* Reviews List */}
      <ReviewList
        productId={productId}
        reviews={reviews}
        onReviewsUpdate={handleReviewsUpdate}
        maxReviews={maxDisplayReviews}
      />

      {/* Load More Reviews */}
      {maxDisplayReviews && reviews.length > maxDisplayReviews && (
        <div className="text-center">
          <button
            onClick={() => {
              // Navigate to full reviews page or expand the list
              navigate(`/product/${productId}/reviews`);
            }}
            className="text-blue-600 hover:text-blue-700 font-medium underline"
          >
            View All {totalReviews} Reviews
          </button>
        </div>
      )}
    </div>
  );
};

export default ReviewSystem;
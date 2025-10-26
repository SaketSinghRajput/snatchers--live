import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaStar, FaThumbsUp, FaFlag, FaCheckCircle } from 'react-icons/fa';
import api from '../../api';
import { toast } from 'react-toastify';

const ReviewList = ({ 
  productId, 
  reviews = [], 
  onReviewsUpdate,
  showFilters = true,
  maxReviews = null 
}) => {
  // Ensure reviews is always an array - wrapped in useMemo to prevent re-creation
  const reviewsArray = useMemo(() => Array.isArray(reviews) ? reviews : [], [reviews]);
  
  const [filteredReviews, setFilteredReviews] = useState(reviewsArray);
  const [sortBy, setSortBy] = useState('newest');
  const [filterRating, setFilterRating] = useState('all');
  const [showVerifiedOnly, setShowVerifiedOnly] = useState(false);
  const [helpfulVotes, setHelpfulVotes] = useState({});

  useEffect(() => {
    let filtered = [...reviewsArray];

    // Filter by rating
    if (filterRating !== 'all') {
      filtered = filtered.filter(review => review.rating === parseInt(filterRating));
    }

    // Filter by verified purchases
    if (showVerifiedOnly) {
      filtered = filtered.filter(review => review.isVerifiedPurchase);
    }

    // Sort reviews
    switch (sortBy) {
      case 'newest':
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      case 'oldest':
        filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        break;
      case 'highest':
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      case 'lowest':
        filtered.sort((a, b) => a.rating - b.rating);
        break;
      case 'helpful':
        filtered.sort((a, b) => b.helpfulVotes - a.helpfulVotes);
        break;
      default:
        break;
    }

    // Limit reviews if maxReviews is specified
    if (maxReviews) {
      filtered = filtered.slice(0, maxReviews);
    }

    setFilteredReviews(filtered);
  }, [reviewsArray, sortBy, filterRating, showVerifiedOnly, maxReviews]);

  const handleHelpfulVote = async (reviewId, isHelpful) => {
    try {
      await api.post(`/api/reviews/${reviewId}/helpful`, { isHelpful });
      
      setHelpfulVotes(prev => ({
        ...prev,
        [reviewId]: isHelpful
      }));

      // Update the review in the list
      if (onReviewsUpdate) {
        const updatedReviews = reviewsArray.map(review => {
          if (review._id === reviewId) {
            return {
              ...review,
              helpfulVotes: isHelpful 
                ? review.helpfulVotes + 1 
                : Math.max(0, review.helpfulVotes - 1)
            };
          }
          return review;
        });
        onReviewsUpdate(updatedReviews);
      }

      toast.success(isHelpful ? 'Marked as helpful' : 'Removed helpful vote');
    } catch (error) {
      console.error('Error voting on review:', error);
      toast.error('Failed to vote on review');
    }
  };

  const handleReportReview = async (reviewId) => {
    try {
      await api.post(`/api/reviews/${reviewId}/report`);
      toast.success('Review reported successfully');
    } catch (error) {
      console.error('Error reporting review:', error);
      toast.error('Failed to report review');
    }
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }).map((_, index) => (
      <FaStar
        key={index}
        className={`text-sm ${
          index < rating ? 'text-yellow-400' : 'text-gray-300'
        }`}
      />
    ));
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="review-list">
      {/* Filters and Sorting */}
      {showFilters && reviewsArray.length > 0 && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex flex-wrap gap-4 items-center">
            {/* Sort By */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Sort by:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="highest">Highest Rating</option>
                <option value="lowest">Lowest Rating</option>
                <option value="helpful">Most Helpful</option>
              </select>
            </div>

            {/* Filter by Rating */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Rating:</label>
              <select
                value={filterRating}
                onChange={(e) => setFilterRating(e.target.value)}
                className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Ratings</option>
                <option value="5">5 Stars</option>
                <option value="4">4 Stars</option>
                <option value="3">3 Stars</option>
                <option value="2">2 Stars</option>
                <option value="1">1 Star</option>
              </select>
            </div>

            {/* Verified Only */}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showVerifiedOnly}
                onChange={(e) => setShowVerifiedOnly(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-gray-700">Verified purchases only</span>
            </label>
          </div>

          <div className="mt-2 text-sm text-gray-600">
            Showing {filteredReviews.length} of {reviewsArray.length} reviews
          </div>
        </div>
      )}

      {/* Reviews */}
      <div className="space-y-6">
        <AnimatePresence>
          {filteredReviews.map((review, index) => (
            <motion.div
              key={review._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm"
            >
              {/* Review Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {/* User Avatar */}
                  <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-600">
                      {review.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-900">
                        {review.user?.name || 'Anonymous User'}
                      </h4>
                      {review.isVerifiedPurchase && (
                        <div className="flex items-center gap-1 text-green-600">
                          <FaCheckCircle className="text-xs" />
                          <span className="text-xs font-medium">Verified Purchase</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex items-center gap-1">
                        {renderStars(review.rating)}
                      </div>
                      <span className="text-sm text-gray-500">
                        {formatDate(review.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Report Button */}
                <button
                  onClick={() => handleReportReview(review._id)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                  title="Report review"
                >
                  <FaFlag className="text-sm" />
                </button>
              </div>

              {/* Review Title */}
              {review.title && (
                <h5 className="font-semibold text-gray-900 mb-2">
                  {review.title}
                </h5>
              )}

              {/* Review Content */}
              <p className="text-gray-700 leading-relaxed mb-4">
                {review.comment}
              </p>

              {/* Review Images */}
              {review.images && review.images.length > 0 && (
                <div className="flex gap-2 mb-4 overflow-x-auto">
                  {review.images.map((image, imgIndex) => (
                    <img
                      key={imgIndex}
                      src={image}
                      alt={`Review ${imgIndex + 1}`}
                      className="w-20 h-20 object-cover rounded-lg border border-gray-200 flex-shrink-0"
                    />
                  ))}
                </div>
              )}

              {/* Review Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div className="flex items-center gap-4">
                  {/* Helpful Vote */}
                  <button
                    onClick={() => handleHelpfulVote(review._id, !helpfulVotes[review._id])}
                    className={`flex items-center gap-2 text-sm transition-colors ${
                      helpfulVotes[review._id]
                        ? 'text-blue-600'
                        : 'text-gray-500 hover:text-blue-600'
                    }`}
                  >
                    <FaThumbsUp className="text-xs" />
                    <span>Helpful ({review.helpfulVotes || 0})</span>
                  </button>
                </div>

                {/* Review Status */}
                {review.status === 'pending' && (
                  <span className="text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded">
                    Pending Approval
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* No Reviews Message */}
      {filteredReviews.length === 0 && reviewsArray.length > 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">No reviews match your current filters.</p>
          <button
            onClick={() => {
              setSortBy('newest');
              setFilterRating('all');
              setShowVerifiedOnly(false);
            }}
            className="mt-2 text-blue-600 hover:text-blue-700 text-sm underline"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* No Reviews at All */}
      {reviewsArray.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <FaStar className="text-4xl mx-auto mb-2" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No reviews yet</h3>
          <p className="text-gray-500">Be the first to review this product!</p>
        </div>
      )}
    </div>
  );
};

export default ReviewList;
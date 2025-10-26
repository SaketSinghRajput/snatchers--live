import React from 'react';
import { FaStar } from 'react-icons/fa';

const ReviewSummary = ({ 
  reviews = [], 
  averageRating = 0, 
  totalReviews = 0,
  showWriteReview = true,
  onWriteReviewClick 
}) => {
  // Ensure reviews is always an array
  const reviewsArray = Array.isArray(reviews) ? reviews : [];
  const safeAverageRating = typeof averageRating === 'number' && !isNaN(averageRating) ? averageRating : 0;
  const safeTotalReviews = typeof totalReviews === 'number' && !isNaN(totalReviews) ? totalReviews : reviewsArray.length;

  // Calculate rating distribution
  const ratingDistribution = [5, 4, 3, 2, 1].map(rating => {
    const count = reviewsArray.filter(review => review.rating === rating).length;
    const percentage = safeTotalReviews > 0 ? (count / safeTotalReviews) * 100 : 0;
    return { rating, count, percentage };
  });

  const renderStars = (rating, size = 'text-sm') => {
    return Array.from({ length: 5 }).map((_, index) => (
      <FaStar
        key={index}
        className={`${size} ${
          index < rating ? 'text-yellow-400' : 'text-gray-300'
        }`}
      />
    ));
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Customer Reviews
          </h3>
          
          {totalReviews > 0 ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="flex items-center">
                  {renderStars(Math.round(safeAverageRating))}
                </div>
                <span className="text-2xl font-bold text-gray-900">
                  {safeAverageRating.toFixed(1)}
                </span>
              </div>
              <div className="text-sm text-gray-600">
                Based on {safeTotalReviews} review{safeTotalReviews !== 1 ? 's' : ''}
              </div>
            </div>
          ) : (
            <div className="text-gray-500">
              No reviews yet
            </div>
          )}
        </div>

        {showWriteReview && (
          <button
            onClick={onWriteReviewClick}
            className="bg-black text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-800 transition-colors text-sm"
          >
            Write Review
          </button>
        )}
      </div>

      {/* Rating Distribution */}
      {safeTotalReviews > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            Rating Breakdown
          </h4>
          
          {ratingDistribution.map(({ rating, count, percentage }) => (
            <div key={rating} className="flex items-center gap-3">
              <div className="flex items-center gap-1 w-16">
                <span className="text-sm text-gray-600">{rating}</span>
                <FaStar className="text-xs text-yellow-400" />
              </div>
              
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              
              <div className="text-sm text-gray-600 w-12 text-right">
                {count}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review Stats */}
      {safeTotalReviews > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-100">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-600">
                {Math.round((reviewsArray.filter(r => r.rating >= 4).length / safeTotalReviews) * 100)}%
              </div>
              <div className="text-xs text-gray-600">Positive Reviews</div>
            </div>
            
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {reviewsArray.filter(r => r.isVerifiedPurchase).length}
              </div>
              <div className="text-xs text-gray-600">Verified Purchases</div>
            </div>
          </div>
        </div>
      )}

      {/* No Reviews State */}
      {safeTotalReviews === 0 && (
        <div className="text-center py-8">
          <div className="text-gray-400 mb-4">
            <FaStar className="text-3xl mx-auto mb-2" />
          </div>
          <p className="text-gray-600 mb-4">
            Be the first to share your thoughts about this product
          </p>
          {showWriteReview && (
            <button
              onClick={onWriteReviewClick}
              className="bg-black text-white px-6 py-2 rounded-lg font-medium hover:bg-gray-800 transition-colors"
            >
              Write the First Review
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ReviewSummary;
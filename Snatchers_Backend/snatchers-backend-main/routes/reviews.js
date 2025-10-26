import express from 'express';
import Review from '../models/Review.js';
import Product from '../models/Product.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get all reviews for a product
router.get('/products/:productId/reviews', async (req, res) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 10, sort = 'newest', rating, verified } = req.query;

    const query = { product: productId, status: 'approved' };
    
    // Filter by rating
    if (rating && rating !== 'all') {
      query.rating = parseInt(rating);
    }
    
    // Filter by verified purchases
    if (verified === 'true') {
      query.isVerifiedPurchase = true;
    }

    // Sort options
    let sortOption = {};
    switch (sort) {
      case 'newest':
        sortOption = { createdAt: -1 };
        break;
      case 'oldest':
        sortOption = { createdAt: 1 };
        break;
      case 'highest':
        sortOption = { rating: -1 };
        break;
      case 'lowest':
        sortOption = { rating: 1 };
        break;
      case 'helpful':
        sortOption = { helpfulVotes: -1 };
        break;
      default:
        sortOption = { createdAt: -1 };
    }

    const reviews = await Review.find(query)
      .populate('user', 'name')
      .sort(sortOption)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Review.countDocuments(query);

    res.json({
      reviews,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ message: 'Failed to fetch reviews' });
  }
});

// Get user's review for a product
router.get('/products/:productId/reviews/user', authenticateToken, async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user.id;

    const review = await Review.findOne({
      product: productId,
      user: userId
    }).populate('user', 'name');

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    res.json(review);
  } catch (error) {
    console.error('Error fetching user review:', error);
    res.status(500).json({ message: 'Failed to fetch review' });
  }
});

// Create a new review
router.post('/reviews', authenticateToken, async (req, res) => {
  try {
    const { productId, rating, title, comment, images = [] } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!productId || !rating || !comment) {
      return res.status(400).json({ 
        message: 'Product ID, rating, and comment are required' 
      });
    }

    // Check if user has already reviewed this product
    const existingReview = await Review.findOne({
      product: productId,
      user: userId
    });

    if (existingReview) {
      return res.status(409).json({ 
        message: 'You have already reviewed this product' 
      });
    }

    // Verify product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // TODO: Check if user has purchased this product (for verified purchase badge)
    // This would require checking order history
    const isVerifiedPurchase = false; // Placeholder

    // Create review
    const review = new Review({
      product: productId,
      user: userId,
      rating: parseInt(rating),
      title: title?.trim(),
      comment: comment.trim(),
      images,
      isVerifiedPurchase,
      status: 'approved' // Auto-approve for now, could add moderation
    });

    await review.save();

    // Update product rating statistics
    await updateProductRating(productId);

    // Populate user data for response
    await review.populate('user', 'name');

    res.status(201).json(review);
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({ message: 'Failed to create review' });
  }
});

// Update a review
router.put('/reviews/:reviewId', authenticateToken, async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { rating, title, comment, images } = req.body;
    const userId = req.user.id;

    const review = await Review.findOne({
      _id: reviewId,
      user: userId
    });

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Update review fields
    if (rating !== undefined) review.rating = parseInt(rating);
    if (title !== undefined) review.title = title.trim();
    if (comment !== undefined) review.comment = comment.trim();
    if (images !== undefined) review.images = images;

    review.updatedAt = new Date();

    await review.save();

    // Update product rating statistics
    await updateProductRating(review.product);

    // Populate user data for response
    await review.populate('user', 'name');

    res.json(review);
  } catch (error) {
    console.error('Error updating review:', error);
    res.status(500).json({ message: 'Failed to update review' });
  }
});

// Delete a review
router.delete('/reviews/:reviewId', authenticateToken, async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user.id;

    const review = await Review.findOne({
      _id: reviewId,
      user: userId
    });

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    const productId = review.product;
    await Review.findByIdAndDelete(reviewId);

    // Update product rating statistics
    await updateProductRating(productId);

    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ message: 'Failed to delete review' });
  }
});

// Vote on review helpfulness
router.post('/reviews/:reviewId/helpful', authenticateToken, async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { isHelpful } = req.body;
    const userId = req.user.id;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // For simplicity, just increment/decrement the helpful votes
    // In a more complex system, you'd track individual user votes
    if (isHelpful) {
      review.helpfulVotes = (review.helpfulVotes || 0) + 1;
    } else {
      review.helpfulVotes = Math.max(0, (review.helpfulVotes || 0) - 1);
    }

    await review.save();

    res.json({ helpfulVotes: review.helpfulVotes });
  } catch (error) {
    console.error('Error voting on review:', error);
    res.status(500).json({ message: 'Failed to vote on review' });
  }
});

// Report a review
router.post('/reviews/:reviewId/report', authenticateToken, async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user.id;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Increment report count
    review.reportCount = (review.reportCount || 0) + 1;

    // Auto-hide review if it gets too many reports
    if (review.reportCount >= 5) {
      review.status = 'rejected';
    }

    await review.save();

    res.json({ message: 'Review reported successfully' });
  } catch (error) {
    console.error('Error reporting review:', error);
    res.status(500).json({ message: 'Failed to report review' });
  }
});

// Helper function to update product rating statistics
async function updateProductRating(productId) {
  try {
    const reviews = await Review.find({ 
      product: productId, 
      status: 'approved' 
    });

    const reviewCount = reviews.length;
    const averageRating = reviewCount > 0 
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount 
      : 0;

    await Product.findByIdAndUpdate(productId, {
      reviewCount,
      averageRating: Math.round(averageRating * 10) / 10 // Round to 1 decimal
    });
  } catch (error) {
    console.error('Error updating product rating:', error);
  }
}

export default router;
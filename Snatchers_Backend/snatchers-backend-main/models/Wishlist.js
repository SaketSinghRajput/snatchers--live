// models/Wishlist.js
import mongoose from "mongoose";

const WishlistItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true
  },
  category: {
    type: String,
    default: 'general'
  },
  notes: {
    type: String,
    maxlength: 500
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  priceAlert: {
    enabled: { type: Boolean, default: false },
    targetPrice: { type: Number, min: 0 }
  },
  addedAt: {
    type: Date,
    default: Date.now
  }
});

const WishlistSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  items: [WishlistItemSchema],
  categories: [{
    name: { type: String, required: true },
    color: { type: String, default: '#000000' },
    createdAt: { type: Date, default: Date.now }
  }],
  isPublic: {
    type: Boolean,
    default: false
  },
  shareToken: {
    type: String,
    unique: true,
    sparse: true
  }
}, { timestamps: true });

// Index for efficient queries
WishlistSchema.index({ userId: 1 });
WishlistSchema.index({ 'items.product': 1 });

// Method to add default categories
WishlistSchema.methods.addDefaultCategories = function() {
  if (this.categories.length === 0) {
    this.categories = [
      { name: 'general', color: '#6B7280' },
      { name: 'favorites', color: '#EF4444' },
      { name: 'gift-ideas', color: '#10B981' },
      { name: 'save-for-later', color: '#F59E0B' }
    ];
  }
};

// Method to generate share token
WishlistSchema.methods.generateShareToken = function() {
  if (!this.shareToken) {
    this.shareToken = Math.random().toString(36).substring(2, 15) + 
                     Math.random().toString(36).substring(2, 15);
  }
  return this.shareToken;
};

// Virtual for getting products (backward compatibility)
WishlistSchema.virtual('products').get(function() {
  return this.items.map(item => item.product);
});

export default mongoose.model("Wishlist", WishlistSchema);

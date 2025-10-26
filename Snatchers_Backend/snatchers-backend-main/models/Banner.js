import mongoose from 'mongoose';

const bannerSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true,
    trim: true
  },
  subtitle: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  image: {
    type: String,
    required: true
  },
  mobileImage: {
    type: String,
    default: ''
  },
  link: {
    url: {
      type: String,
      default: ''
    },
    text: {
      type: String,
      default: 'Learn More'
    },
    openInNewTab: {
      type: Boolean,
      default: false
    }
  },
  position: {
    type: String,
    enum: ['hero', 'category', 'product', 'footer', 'sidebar'],
    default: 'hero'
  },
  placement: {
    type: String,
    enum: ['home', 'shop', 'category', 'product', 'global'],
    default: 'home'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date,
    default: null
  },
  clickCount: {
    type: Number,
    default: 0
  },
  impressionCount: {
    type: Number,
    default: 0
  },
  targetAudience: {
    userType: {
      type: String,
      enum: ['all', 'new', 'returning', 'premium'],
      default: 'all'
    },
    categories: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category'
    }],
    minAge: Number,
    maxAge: Number,
    gender: {
      type: String,
      enum: ['all', 'male', 'female', 'other'],
      default: 'all'
    }
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
bannerSchema.index({ position: 1, placement: 1 });
bannerSchema.index({ isActive: 1 });
bannerSchema.index({ startDate: 1, endDate: 1 });
bannerSchema.index({ sortOrder: 1 });

// Virtual for checking if banner is currently active
bannerSchema.virtual('isCurrentlyActive').get(function() {
  const now = new Date();
  const isWithinDateRange = this.startDate <= now && (!this.endDate || this.endDate >= now);
  return this.isActive && isWithinDateRange;
});

// Method to increment click count
bannerSchema.methods.incrementClick = function() {
  this.clickCount += 1;
  return this.save();
};

// Method to increment impression count
bannerSchema.methods.incrementImpression = function() {
  this.impressionCount += 1;
  return this.save();
};

// Static method to get active banners for a specific position and placement
bannerSchema.statics.getActiveBanners = function(position, placement = 'global') {
  const now = new Date();
  return this.find({
    isActive: true,
    position: position,
    $or: [
      { placement: placement },
      { placement: 'global' }
    ],
    startDate: { $lte: now },
    $or: [
      { endDate: null },
      { endDate: { $gte: now } }
    ]
  }).sort({ sortOrder: 1, createdAt: -1 });
};

const Banner = mongoose.model('Banner', bannerSchema);

export default Banner;
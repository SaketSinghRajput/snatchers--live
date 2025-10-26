import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  // Existing fields
  uid: { type: String, required: true }, // Firebase user ID
  email: { type: String, required: true },
  password: String,
  name: String,
  photoURL: String,
  role: { type: String, default: 'user' },
  createdAt: { type: Date, default: () => new Date() },
  
  // Enhanced fields
  profile: {
    firstName: String,
    lastName: String,
    phone: String,
    dateOfBirth: Date,
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer_not_to_say']
    },
    avatar: String
  },
  addresses: [{
    type: {
      type: String,
      enum: ['home', 'work', 'other'],
      default: 'home'
    },
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: { type: String, default: 'India' },
    isDefault: { type: Boolean, default: false }
  }],
  preferences: {
    categories: [String],
    brands: [String],
    priceRange: {
      min: { type: Number, default: 0 },
      max: { type: Number, default: 100000 }
    },
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      push: { type: Boolean, default: true },
      promotional: { type: Boolean, default: true },
      orderUpdates: { type: Boolean, default: true },
      priceAlerts: { type: Boolean, default: true },
      stockAlerts: { type: Boolean, default: true }
    }
  },
  vendorProfile: {
    businessName: String,
    businessType: String,
    taxId: String,
    bankDetails: {
      accountNumber: String,
      routingNumber: String,
      accountHolderName: String
    },
    isVerified: { type: Boolean, default: false },
    verificationDocuments: [String], // URLs to uploaded documents
    businessAddress: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String
    }
  },
  loyaltyPoints: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  lastLogin: Date,
  isActive: { type: Boolean, default: true },
  
  // GDPR and Privacy fields
  consent: {
    marketing: { type: Boolean, default: false },
    analytics: { type: Boolean, default: false },
    functional: { type: Boolean, default: true },
    lastUpdated: { type: Date, default: Date.now }
  },
  
  privacySettings: {
    dataRetention: { type: Boolean, default: true },
    profileVisibility: {
      type: String,
      enum: ['public', 'private', 'friends'],
      default: 'private'
    },
    allowDataExport: { type: Boolean, default: true },
    allowDataDeletion: { type: Boolean, default: true }
  },
  
  termsAcceptance: {
    privacyPolicyVersion: String,
    termsVersion: String,
    acceptedAt: Date,
    ipAddress: String
  },
  
  // Data protection flags
  anonymized: { type: Boolean, default: false },
  anonymizedAt: Date,
  originalUid: String, // Store original UID if anonymized
  
  // Account security
  accountLocked: { type: Boolean, default: false },
  lockReason: String,
  lockedAt: Date,
  failedLoginAttempts: { type: Number, default: 0 },
  lastFailedLogin: Date,
  wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  recentlyViewed: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    viewedAt: { type: Date, default: Date.now }
  }],
  pushSubscription: {
    endpoint: String,
    keys: {
      p256dh: String,
      auth: String
    }
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for optimized queries
UserSchema.index({ email: 1 });
UserSchema.index({ uid: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ 'vendorProfile.isVerified': 1 });
UserSchema.index({ isActive: 1 });
UserSchema.index({ lastLogin: -1 });

// Virtual for full name
UserSchema.virtual('fullName').get(function() {
  if (this.profile.firstName && this.profile.lastName) {
    return `${this.profile.firstName} ${this.profile.lastName}`;
  }
  return this.name || this.email;
});

// Virtual for checking if user is vendor
UserSchema.virtual('isVendor').get(function() {
  return this.role === 'vendor' || this.role === 'admin';
});

// Virtual for checking if vendor is verified
UserSchema.virtual('isVerifiedVendor').get(function() {
  return this.isVendor && this.vendorProfile && this.vendorProfile.isVerified;
});

// Method to get default address
UserSchema.methods.getDefaultAddress = function() {
  return this.addresses.find(addr => addr.isDefault) || this.addresses[0];
};

// Method to add to recently viewed (limit to 20 items)
UserSchema.methods.addToRecentlyViewed = function(productId) {
  // Remove if already exists
  this.recentlyViewed = this.recentlyViewed.filter(
    item => !item.product.equals(productId)
  );
  
  // Add to beginning
  this.recentlyViewed.unshift({
    product: productId,
    viewedAt: new Date()
  });
  
  // Keep only last 20 items
  if (this.recentlyViewed.length > 20) {
    this.recentlyViewed = this.recentlyViewed.slice(0, 20);
  }
  
  return this.save();
};

const User = mongoose.model('User', UserSchema);

export default User;

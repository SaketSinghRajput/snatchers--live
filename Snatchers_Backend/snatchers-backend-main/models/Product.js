import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  // Existing fields
  images: [String],
  title: { type: String, required: true },
  price: { type: Number, required: true },
  offerPrice: { type: Number, default: null },
  rating: { type: Number, default: 0 },
  badgeText: { type: String, default: '' },
  badgeClass: { type: String, default: '' },
  description: String,
  category: { type: String, required: true },
  occasion: [String],
  
  // New enhanced fields
  sku: { type: String, unique: true, required: true },
  brand: { type: String, required: true },
  shortDescription: String,
  specifications: [{
    name: String,
    value: String
  }],
  variants: [{
    name: String, // size, color, etc.
    options: [String],
    priceModifier: { type: Number, default: 0 }
  }],
  inventory: {
    quantity: { type: Number, default: 0 },
    lowStockThreshold: { type: Number, default: 10 },
    trackInventory: { type: Boolean, default: true }
  },
  seo: {
    metaTitle: String,
    metaDescription: String,
    slug: String,
    keywords: [String]
  },
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'out_of_stock'],
    default: 'active'
  },
  tags: [String],
  weight: Number,
  dimensions: {
    length: Number,
    width: Number,
    height: Number
  },
  shippingClass: String,
  reviewCount: { type: Number, default: 0 },
  averageRating: { type: Number, default: 0 },
  viewCount: { type: Number, default: 0 },
  salesCount: { type: Number, default: 0 }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for optimized search and filtering
productSchema.index({ title: 'text', description: 'text', brand: 'text' });
productSchema.index({ category: 1, brand: 1 });
productSchema.index({ price: 1 });
productSchema.index({ averageRating: -1 });
productSchema.index({ salesCount: -1 });
productSchema.index({ viewCount: -1 });
productSchema.index({ 'seo.slug': 1 });
productSchema.index({ vendor: 1 });
productSchema.index({ status: 1 });
productSchema.index({ tags: 1 });

// Virtual for calculating discount percentage
productSchema.virtual('discountPercentage').get(function() {
  if (this.offerPrice && this.offerPrice < this.price) {
    return Math.round(((this.price - this.offerPrice) / this.price) * 100);
  }
  return 0;
});

// Virtual for checking if product is in stock
productSchema.virtual('inStock').get(function() {
  return this.inventory.trackInventory ? this.inventory.quantity > 0 : true;
});

// Virtual for checking if product is low stock
productSchema.virtual('isLowStock').get(function() {
  return this.inventory.trackInventory && this.inventory.quantity <= this.inventory.lowStockThreshold;
});

const Product = mongoose.model('Product', productSchema);

export default Product;

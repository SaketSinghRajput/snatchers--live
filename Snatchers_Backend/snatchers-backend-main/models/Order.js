// models/Order.js
import mongoose from "mongoose";

const OrderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  productTitle: {
    type: String,
    required: true,
  },
  productImage: {
    type: String,
    default: "/product-placeholder.jpg",
  },
  sku: String,
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  unitPrice: {
    type: Number,
    required: true,
  },
  totalPrice: {
    type: Number,
    required: true,
  },
  variant: {
    name: String,
    value: String
  },
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
});

const OrderSchema = new mongoose.Schema({
  // Enhanced order identification
  orderId: {
    type: String,
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  
  // Legacy fields for backward compatibility
  userId: {
    type: String,
    required: true,
  },
  customerEmail: {
    type: String,
    required: true,
  },
  customerName: {
    type: String,
    required: true,
  },
  
  // Enhanced order items (supports multiple products)
  items: [OrderItemSchema],
  
  // Legacy single product fields (for backward compatibility)
  productId: {
    type: String,
  },
  productTitle: {
    type: String,
  },
  productImage: {
    type: String,
    default: "/product-placeholder.jpg",
  },
  price: {
    type: Number,
  },
  
  // Enhanced pricing
  subtotal: {
    type: Number,
    required: true,
  },
  shippingCost: {
    type: Number,
    default: 0,
  },
  taxAmount: {
    type: Number,
    default: 0,
  },
  discountAmount: {
    type: Number,
    default: 0,
  },
  totalAmount: {
    type: Number,
    required: true,
  },
  
  // Enhanced status tracking
  status: {
    type: String,
    default: "Ordered",
    enum: [
      "Pending", 
      "Confirmed", 
      "Processing", 
      "Packed", 
      "Shipped", 
      "Out for Delivery", 
      "Delivered", 
      "Cancelled", 
      "Return Requested",
      "Return Approved",
      "Return Rejected", 
      "Returned", 
      "Refunded"
    ],
  },
  statusHistory: [{
    status: String,
    timestamp: { type: Date, default: Date.now },
    note: String,
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  
  // Enhanced address information
  shippingAddress: {
    street: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: true,
    },
    state: {
      type: String,
      required: true,
    },
    zipCode: {
      type: String,
      required: true,
    },
    country: {
      type: String,
      default: 'India'
    },
    phone: {
      type: String,
      required: true,
    }
  },
  
  // Legacy address fields (for backward compatibility)
  address: {
    type: String,
  },
  city: {
    type: String,
  },
  state: {
    type: String,
  },
  pincode: {
    type: String,
  },
  phone: {
    type: String,
  },
  
  // Enhanced payment information
  payment: {
    method: {
      type: String,
      enum: ['card', 'upi', 'netbanking', 'wallet', 'cod'],
      required: true
    },
    paymentId: {
      type: String,
      required: true,
    },
    transactionId: String,
    gateway: String,
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending'
    }
  },
  
  // Legacy payment field (for backward compatibility)
  paymentId: {
    type: String,
  },
  
  // Enhanced shipping information
  shipping: {
    method: String,
    trackingNumber: String,
    estimatedDelivery: Date,
    actualDelivery: Date,
    shiprocketOrderId: String,
    carrier: String
  },
  
  // Legacy shipping field (for backward compatibility)
  shiprocketOrderId: {
    type: String,
  },
  
  // Enhanced order metadata
  orderDate: {
    type: String,
  },
  notes: String,
  cancellationReason: String,
  returnReason: String,
  returnComments: String,
  returnRequestedAt: Date,
  returnItems: [mongoose.Schema.Types.ObjectId],
  refundAmount: Number,
  
  // Vendor information for multi-vendor support
  vendors: [{
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    items: [mongoose.Schema.Types.ObjectId], // References to items in this order
    status: String,
    trackingNumber: String
  }],
  
  // Analytics and tracking
  source: String, // web, mobile, api
  utm: {
    source: String,
    medium: String,
    campaign: String
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for optimized queries
OrderSchema.index({ orderId: 1 });
OrderSchema.index({ user: 1, createdAt: -1 });
OrderSchema.index({ userId: 1, createdAt: -1 }); // Legacy support
OrderSchema.index({ status: 1 });
OrderSchema.index({ 'payment.status': 1 });
OrderSchema.index({ 'shipping.trackingNumber': 1 });
OrderSchema.index({ createdAt: -1 });

// Compound indexes
OrderSchema.index({ user: 1, status: 1 });
OrderSchema.index({ 'vendors.vendor': 1, status: 1 });

// Virtual for checking if order can be cancelled
OrderSchema.virtual('canBeCancelled').get(function() {
  const cancellableStatuses = ['Pending', 'Confirmed', 'Processing'];
  const timeLimitHours = 24;
  const timeDiff = (new Date() - this.createdAt) / (1000 * 60 * 60);
  
  return cancellableStatuses.includes(this.status) && timeDiff <= timeLimitHours;
});

// Virtual for checking if order can be returned
OrderSchema.virtual('canBeReturned').get(function() {
  const returnableStatuses = ['Delivered'];
  const returnWindowDays = 7;
  const timeDiff = (new Date() - this.createdAt) / (1000 * 60 * 60 * 24);
  
  return returnableStatuses.includes(this.status) && timeDiff <= returnWindowDays;
});

// Method to add status update
OrderSchema.methods.updateStatus = function(newStatus, note, updatedBy) {
  this.status = newStatus;
  this.statusHistory.push({
    status: newStatus,
    timestamp: new Date(),
    note: note,
    updatedBy: updatedBy
  });
  return this.save();
};

// Method to calculate total from items
OrderSchema.methods.calculateTotal = function() {
  if (this.items && this.items.length > 0) {
    this.subtotal = this.items.reduce((sum, item) => sum + item.totalPrice, 0);
    this.totalAmount = this.subtotal + this.shippingCost + this.taxAmount - this.discountAmount;
  }
  return this.totalAmount;
};

// Static method to get order statistics
OrderSchema.statics.getOrderStats = async function(startDate, endDate) {
  return await this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalRevenue: { $sum: '$totalAmount' },
        avgOrderValue: { $avg: '$totalAmount' },
        statusBreakdown: {
          $push: '$status'
        }
      }
    },
    {
      $project: {
        totalOrders: 1,
        totalRevenue: { $round: ['$totalRevenue', 2] },
        avgOrderValue: { $round: ['$avgOrderValue', 2] },
        statusBreakdown: 1
      }
    }
  ]);
};

export default mongoose.model("Order", OrderSchema);

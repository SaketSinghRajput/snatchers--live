// models/Dispute.js
import mongoose from "mongoose";

const DisputeSchema = new mongoose.Schema({
  disputeId: {
    type: String,
    required: true,
    unique: true
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  type: {
    type: String,
    enum: [
      'return_request',
      'refund_request', 
      'product_quality',
      'delivery_issue',
      'payment_issue',
      'service_complaint',
      'other'
    ],
    required: true
  },
  status: {
    type: String,
    enum: [
      'pending',
      'under_review',
      'investigating',
      'resolved',
      'rejected',
      'escalated',
      'closed'
    ],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  subject: {
    type: String,
    required: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    maxlength: 2000
  },
  attachments: [{
    url: String,
    type: String, // image, document, etc.
    filename: String
  }],
  resolution: {
    action: {
      type: String,
      enum: [
        'refund_full',
        'refund_partial',
        'replacement',
        'store_credit',
        'no_action',
        'other'
      ]
    },
    amount: Number,
    description: String,
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    resolvedAt: Date
  },
  communication: [{
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    fromType: {
      type: String,
      enum: ['customer', 'admin', 'vendor'],
      required: true
    },
    message: {
      type: String,
      required: true,
      maxlength: 1000
    },
    attachments: [{
      url: String,
      filename: String
    }],
    timestamp: {
      type: Date,
      default: Date.now
    },
    isInternal: {
      type: Boolean,
      default: false
    }
  }],
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  tags: [String],
  metadata: {
    source: String, // web, mobile, email, phone
    customerSatisfaction: {
      rating: Number,
      feedback: String
    },
    escalationLevel: {
      type: Number,
      default: 0
    }
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
  dueDate: Date,
  closedAt: Date
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for optimized queries
DisputeSchema.index({ order: 1 });
DisputeSchema.index({ customer: 1, createdAt: -1 });
DisputeSchema.index({ status: 1, priority: 1 });
DisputeSchema.index({ assignedTo: 1, status: 1 });
DisputeSchema.index({ type: 1, status: 1 });
DisputeSchema.index({ createdAt: -1 });

// Compound indexes
DisputeSchema.index({ status: 1, createdAt: -1 });
DisputeSchema.index({ priority: 1, createdAt: -1 });

// Virtual for checking if dispute is overdue
DisputeSchema.virtual('isOverdue').get(function() {
  if (!this.dueDate || this.status === 'resolved' || this.status === 'closed') {
    return false;
  }
  return new Date() > this.dueDate;
});

// Virtual for response time
DisputeSchema.virtual('responseTime').get(function() {
  if (this.communication.length === 0) return null;
  
  const firstResponse = this.communication.find(comm => 
    comm.fromType === 'admin' || comm.fromType === 'vendor'
  );
  
  if (!firstResponse) return null;
  
  return firstResponse.timestamp - this.createdAt;
});

// Method to add communication
DisputeSchema.methods.addCommunication = function(from, fromType, message, attachments = [], isInternal = false) {
  this.communication.push({
    from,
    fromType,
    message,
    attachments,
    isInternal,
    timestamp: new Date()
  });
  return this.save();
};

// Method to update status
DisputeSchema.methods.updateStatus = function(newStatus, note, updatedBy) {
  const previousStatus = this.status;
  this.status = newStatus;
  
  this.statusHistory.push({
    status: newStatus,
    timestamp: new Date(),
    note: note,
    updatedBy: updatedBy
  });

  // Set closed date if dispute is being closed
  if (newStatus === 'resolved' || newStatus === 'closed') {
    this.closedAt = new Date();
  }

  return this.save();
};

// Method to resolve dispute
DisputeSchema.methods.resolve = function(resolution, resolvedBy) {
  this.resolution = {
    ...resolution,
    resolvedBy,
    resolvedAt: new Date()
  };
  this.status = 'resolved';
  this.closedAt = new Date();
  
  this.statusHistory.push({
    status: 'resolved',
    timestamp: new Date(),
    note: `Resolved with action: ${resolution.action}`,
    updatedBy: resolvedBy
  });

  return this.save();
};

// Static method to get dispute statistics
DisputeSchema.statics.getDisputeStats = async function(startDate, endDate) {
  return await this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        totalDisputes: { $sum: 1 },
        pendingDisputes: {
          $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
        },
        resolvedDisputes: {
          $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] }
        },
        avgResolutionTime: {
          $avg: {
            $cond: [
              { $eq: ['$status', 'resolved'] },
              { $subtract: ['$closedAt', '$createdAt'] },
              null
            ]
          }
        },
        typeBreakdown: { $push: '$type' },
        priorityBreakdown: { $push: '$priority' }
      }
    }
  ]);
};

// Generate unique dispute ID
DisputeSchema.statics.generateDisputeId = function() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `DSP-${timestamp}-${random}`.toUpperCase();
};

export default mongoose.model("Dispute", DisputeSchema);
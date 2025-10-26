import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: [
      'order_confirmation',
      'order_status_update', 
      'order_shipped',
      'order_delivered',
      'order_cancelled',
      'payment_success',
      'payment_failed',
      'promotion',
      'price_drop',
      'back_in_stock',
      'wishlist_item_sale',
      'abandoned_cart',
      'welcome',
      'account_update',
      'system',
      'deal_alert',
      'review_reminder'
    ],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  data: {
    orderId: String,
    productId: String,
    url: String,
    imageUrl: String,
    actionText: String,
    actionUrl: String,
    metadata: mongoose.Schema.Types.Mixed
  },
  pushNotification: {
    sent: { type: Boolean, default: false },
    sentAt: Date,
    endpoint: String,
    failureReason: String
  },
  read: {
    type: Boolean,
    default: false
  },
  readAt: Date,
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  expiresAt: Date
}, {
  timestamps: true
});

// Indexes for efficient queries
NotificationSchema.index({ user: 1, createdAt: -1 });
NotificationSchema.index({ user: 1, read: 1 });
NotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Static method to create order notification
NotificationSchema.statics.createOrderNotification = async function(userId, type, order, additionalData = {}) {
  const notificationData = {
    user: userId,
    type,
    data: {
      orderId: order.orderId,
      url: `/orders/${order.orderId}`,
      ...additionalData
    }
  };

  switch (type) {
    case 'order_confirmation':
      notificationData.title = 'Order Confirmed';
      notificationData.message = `Your order ${order.orderId} has been confirmed and is being processed.`;
      notificationData.priority = 'high';
      break;
    
    case 'order_status_update':
      notificationData.title = 'Order Status Updated';
      notificationData.message = `Your order ${order.orderId} status has been updated to ${order.status}.`;
      break;
    
    case 'order_shipped':
      notificationData.title = 'Order Shipped';
      notificationData.message = `Great news! Your order ${order.orderId} has been shipped.`;
      notificationData.priority = 'high';
      if (order.shipping?.trackingNumber) {
        notificationData.message += ` Tracking: ${order.shipping.trackingNumber}`;
      }
      break;
    
    case 'order_delivered':
      notificationData.title = 'Order Delivered';
      notificationData.message = `Your order ${order.orderId} has been delivered successfully!`;
      notificationData.priority = 'high';
      break;
    
    case 'order_cancelled':
      notificationData.title = 'Order Cancelled';
      notificationData.message = `Your order ${order.orderId} has been cancelled. Refund will be processed soon.`;
      notificationData.priority = 'high';
      break;
    
    default:
      notificationData.title = 'Order Update';
      notificationData.message = `Your order ${order.orderId} has been updated.`;
  }

  return await this.create(notificationData);
};

// Method to mark as read
NotificationSchema.methods.markAsRead = function() {
  this.read = true;
  this.readAt = new Date();
  return this.save();
};

export default mongoose.model('Notification', NotificationSchema);
import { Server } from 'socket.io';
import webpush from 'web-push';
import Notification from '../models/Notification.js';
import User from '../models/User.js';

class RealTimeNotificationService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // userId -> socketId mapping
    this.initializeWebPush();
  }

  // Initialize Socket.IO
  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      }
    });

    this.io.on('connection', (socket) => {
      console.log('User connected:', socket.id);

      // Handle user authentication and registration
      socket.on('authenticate', (data) => {
        const { userId } = data;
        if (userId) {
          this.connectedUsers.set(userId, socket.id);
          socket.userId = userId;
          socket.join(`user_${userId}`);
          console.log(`User ${userId} authenticated and joined room`);
          
          // Send connection confirmation
          socket.emit('authenticated', { 
            success: true, 
            userId,
            connectedAt: new Date().toISOString()
          });
        }
      });

      // Handle push notification subscription
      socket.on('subscribe_push', async (data) => {
        try {
          const { userId, subscription } = data;
          if (userId && subscription) {
            await User.findByIdAndUpdate(userId, {
              'pushSubscription': subscription
            });
            console.log(`Push subscription saved for user ${userId}`);
          }
        } catch (error) {
          console.error('Error saving push subscription:', error);
        }
      });

      // Handle notification preferences update
      socket.on('update_preferences', async (data) => {
        try {
          const { userId, preferences } = data;
          if (userId && preferences) {
            await User.findByIdAndUpdate(userId, {
              'preferences.notifications': preferences
            });
            console.log(`Notification preferences updated for user ${userId}`);
          }
        } catch (error) {
          console.error('Error updating notification preferences:', error);
        }
      });

      socket.on('disconnect', () => {
        if (socket.userId) {
          this.connectedUsers.delete(socket.userId);
          console.log(`User ${socket.userId} disconnected`);
        }
      });
    });

    return this.io;
  }

  // Initialize Web Push
  initializeWebPush() {
    if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
      webpush.setVapidDetails(
        process.env.VAPID_SUBJECT || 'mailto:support@snatchers.in',
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
      );
    }
  }

  // Send real-time notification to user
  async sendRealTimeNotification(userId, notification) {
    try {
      // Send via Socket.IO if user is connected
      if (this.io) {
        this.io.to(`user_${userId}`).emit('new_notification', {
          id: notification._id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data,
          priority: notification.priority,
          createdAt: notification.createdAt
        });
        console.log(`Real-time notification sent to user ${userId}`);
      }

      // Send push notification if user has subscription
      await this.sendPushNotification(userId, notification);

    } catch (error) {
      console.error('Error sending real-time notification:', error);
    }
  }

  // Send push notification
  async sendPushNotification(userId, notification) {
    try {
      const user = await User.findById(userId);
      if (!user || !user.pushSubscription || !user.preferences?.notifications?.push) {
        return;
      }

      const payload = JSON.stringify({
        title: notification.title,
        body: notification.message,
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        data: {
          notificationId: notification._id,
          type: notification.type,
          url: notification.data?.url || '/',
          ...notification.data
        },
        actions: notification.data?.actionText ? [{
          action: 'view',
          title: notification.data.actionText
        }] : [],
        requireInteraction: notification.priority === 'high',
        silent: notification.priority === 'low'
      });

      await webpush.sendNotification(user.pushSubscription, payload);
      
      // Update notification record
      await Notification.findByIdAndUpdate(notification._id, {
        'pushNotification.sent': true,
        'pushNotification.sentAt': new Date()
      });

      console.log(`Push notification sent to user ${userId}`);
    } catch (error) {
      console.error('Error sending push notification:', error);
      
      // Update notification record with failure
      await Notification.findByIdAndUpdate(notification._id, {
        'pushNotification.sent': false,
        'pushNotification.failureReason': error.message
      });
    }
  }

  // Create and send notification
  async createAndSendNotification(userId, notificationData) {
    try {
      // Create notification in database
      const notification = await Notification.create({
        user: userId,
        ...notificationData
      });

      // Send real-time notification
      await this.sendRealTimeNotification(userId, notification);

      return notification;
    } catch (error) {
      console.error('Error creating and sending notification:', error);
      throw error;
    }
  }

  // Send notification to multiple users
  async sendBulkNotifications(userIds, notificationData) {
    try {
      const notifications = [];
      
      for (const userId of userIds) {
        const notification = await this.createAndSendNotification(userId, notificationData);
        notifications.push(notification);
      }

      return notifications;
    } catch (error) {
      console.error('Error sending bulk notifications:', error);
      throw error;
    }
  }

  // Send promotional notification
  async sendPromotionalNotification(userIds, promotion) {
    const notificationData = {
      type: 'promotion',
      title: promotion.title,
      message: promotion.message,
      data: {
        url: promotion.url || '/',
        imageUrl: promotion.imageUrl,
        actionText: promotion.actionText || 'View Deal',
        actionUrl: promotion.actionUrl || promotion.url,
        metadata: {
          promotionId: promotion.id,
          discount: promotion.discount,
          validUntil: promotion.validUntil
        }
      },
      priority: promotion.priority || 'medium',
      expiresAt: promotion.validUntil ? new Date(promotion.validUntil) : undefined
    };

    return await this.sendBulkNotifications(userIds, notificationData);
  }

  // Send price drop notification
  async sendPriceDropNotification(userId, product, oldPrice, newPrice) {
    const discount = Math.round(((oldPrice - newPrice) / oldPrice) * 100);
    
    const notificationData = {
      type: 'price_drop',
      title: '🔥 Price Drop Alert!',
      message: `${product.title} is now ${discount}% off! Was ₹${oldPrice}, now ₹${newPrice}`,
      data: {
        productId: product._id,
        url: `/product/${product.seo?.slug || product._id}`,
        imageUrl: product.images?.[0],
        actionText: 'Buy Now',
        actionUrl: `/product/${product.seo?.slug || product._id}`,
        metadata: {
          oldPrice,
          newPrice,
          discount
        }
      },
      priority: 'high'
    };

    return await this.createAndSendNotification(userId, notificationData);
  }

  // Send back in stock notification
  async sendBackInStockNotification(userId, product) {
    const notificationData = {
      type: 'back_in_stock',
      title: '📦 Back in Stock!',
      message: `${product.title} is available again! Don't miss out this time.`,
      data: {
        productId: product._id,
        url: `/product/${product.seo?.slug || product._id}`,
        imageUrl: product.images?.[0],
        actionText: 'Buy Now',
        actionUrl: `/product/${product.seo?.slug || product._id}`
      },
      priority: 'high'
    };

    return await this.createAndSendNotification(userId, notificationData);
  }

  // Send abandoned cart notification
  async sendAbandonedCartNotification(userId, cartItems) {
    const itemCount = cartItems.length;
    const firstItem = cartItems[0];
    
    const notificationData = {
      type: 'abandoned_cart',
      title: 'Don\'t forget your items!',
      message: `You have ${itemCount} item${itemCount > 1 ? 's' : ''} waiting in your cart${firstItem ? `, including ${firstItem.product?.title}` : ''}.`,
      data: {
        url: '/cart',
        imageUrl: firstItem?.product?.images?.[0],
        actionText: 'Complete Purchase',
        actionUrl: '/cart',
        metadata: {
          itemCount,
          items: cartItems.slice(0, 3).map(item => ({
            productId: item.product?._id,
            title: item.product?.title,
            quantity: item.quantity
          }))
        }
      },
      priority: 'medium'
    };

    return await this.createAndSendNotification(userId, notificationData);
  }

  // Send deal alert notification
  async sendDealAlertNotification(userIds, deal) {
    const notificationData = {
      type: 'deal_alert',
      title: '🎉 Special Deal Alert!',
      message: deal.message || `Amazing deals are now live! Don't miss out.`,
      data: {
        url: deal.url || '/deals',
        imageUrl: deal.imageUrl,
        actionText: 'Shop Now',
        actionUrl: deal.url || '/deals',
        metadata: {
          dealId: deal.id,
          discount: deal.discount,
          validUntil: deal.validUntil
        }
      },
      priority: 'medium',
      expiresAt: deal.validUntil ? new Date(deal.validUntil) : undefined
    };

    return await this.sendBulkNotifications(userIds, notificationData);
  }

  // Get connected users count
  getConnectedUsersCount() {
    return this.connectedUsers.size;
  }

  // Get connected users
  getConnectedUsers() {
    return Array.from(this.connectedUsers.keys());
  }

  // Send system notification to all connected users
  async sendSystemNotification(title, message, data = {}) {
    if (!this.io) return;

    const notification = {
      type: 'system',
      title,
      message,
      data,
      priority: 'high',
      createdAt: new Date()
    };

    this.io.emit('system_notification', notification);
    console.log('System notification sent to all connected users');
  }
}

export default new RealTimeNotificationService();
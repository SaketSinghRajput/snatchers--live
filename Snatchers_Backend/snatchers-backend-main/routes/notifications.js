import express from 'express';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import verifyToken from '../middleware/auth.js';
import RealTimeNotificationService from '../services/RealTimeNotificationService.js';

const router = express.Router();

// GET: Fetch user notifications with enhanced filtering
router.get('/', verifyToken, async (req, res) => {
  try {
    const userId = req.user?.sub || req.user?.uid || req.user?.['cognito:username'];
    const { 
      page = 1, 
      limit = 20, 
      unreadOnly = false, 
      typeFilter = 'all',
      sortBy = 'newest'
    } = req.query;
    
    const query = { user: userId };
    
    // Apply read filter
    if (unreadOnly === 'true') {
      query.read = false;
    }
    
    // Apply type filter
    if (typeFilter !== 'all') {
      if (typeFilter === 'order_confirmation') {
        query.type = { $in: ['order_confirmation', 'order_status_update', 'order_shipped', 'order_delivered', 'order_cancelled'] };
      } else if (typeFilter === 'promotion') {
        query.type = { $in: ['promotion', 'deal_alert'] };
      } else {
        query.type = typeFilter;
      }
    }

    // Determine sort order
    let sortOptions = { createdAt: -1 }; // Default: newest first
    if (sortBy === 'oldest') {
      sortOptions = { createdAt: 1 };
    } else if (sortBy === 'unread') {
      sortOptions = { read: 1, createdAt: -1 }; // Unread first, then by date
    }

    const notifications = await Notification.find(query)
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const totalCount = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ user: userId, read: false });

    res.json({
      notifications,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        hasMore: page * limit < totalCount
      },
      unreadCount
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Error fetching notifications', error: error.message });
  }
});

// PUT: Mark notification as read
router.put('/:notificationId/read', verifyToken, async (req, res) => {
  try {
    const userId = req.user?.sub || req.user?.uid || req.user?.['cognito:username'];
    const { notificationId } = req.params;

    const notification = await Notification.findOne({
      _id: notificationId,
      user: userId
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    await notification.markAsRead();

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Error updating notification', error: error.message });
  }
});

// PUT: Mark all notifications as read
router.put('/mark-all-read', verifyToken, async (req, res) => {
  try {
    const userId = req.user?.sub || req.user?.uid || req.user?.['cognito:username'];

    await Notification.updateMany(
      { user: userId, read: false },
      { read: true, readAt: new Date() }
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ message: 'Error updating notifications', error: error.message });
  }
});

// DELETE: Delete notification
router.delete('/:notificationId', verifyToken, async (req, res) => {
  try {
    const userId = req.user?.sub || req.user?.uid || req.user?.['cognito:username'];
    const { notificationId } = req.params;

    const result = await Notification.deleteOne({
      _id: notificationId,
      user: userId
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ message: 'Error deleting notification', error: error.message });
  }
});

// GET: Get unread count
router.get('/unread-count', verifyToken, async (req, res) => {
  try {
    const userId = req.user?.sub || req.user?.uid || req.user?.['cognito:username'];
    
    const unreadCount = await Notification.countDocuments({ 
      user: userId, 
      read: false 
    });

    res.json({ unreadCount });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ message: 'Error fetching unread count', error: error.message });
  }
});

// POST: Subscribe to push notifications
router.post('/subscribe-push', verifyToken, async (req, res) => {
  try {
    const userId = req.user?.sub || req.user?.uid || req.user?.['cognito:username'];
    const { subscription } = req.body;

    if (!subscription) {
      return res.status(400).json({ message: 'Push subscription data is required' });
    }

    await User.findByIdAndUpdate(userId, {
      pushSubscription: subscription,
      'preferences.notifications.push': true
    });

    res.json({ message: 'Push notification subscription saved successfully' });
  } catch (error) {
    console.error('Error saving push subscription:', error);
    res.status(500).json({ message: 'Error saving push subscription', error: error.message });
  }
});

// DELETE: Unsubscribe from push notifications
router.delete('/unsubscribe-push', verifyToken, async (req, res) => {
  try {
    const userId = req.user?.sub || req.user?.uid || req.user?.['cognito:username'];

    await User.findByIdAndUpdate(userId, {
      $unset: { pushSubscription: 1 },
      'preferences.notifications.push': false
    });

    res.json({ message: 'Push notification subscription removed successfully' });
  } catch (error) {
    console.error('Error removing push subscription:', error);
    res.status(500).json({ message: 'Error removing push subscription', error: error.message });
  }
});

// POST: Send test notification (admin only)
router.post('/test', verifyToken, async (req, res) => {
  try {
    const userId = req.user?.sub || req.user?.uid || req.user?.['cognito:username'];
    const user = await User.findById(userId);
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { targetUserId, title, message, type = 'system' } = req.body;
    const testUserId = targetUserId || userId;

    const notification = await RealTimeNotificationService.createAndSendNotification(testUserId, {
      type,
      title: title || 'Test Notification',
      message: message || 'This is a test notification from the admin panel.',
      data: {
        url: '/notifications',
        actionText: 'View',
        actionUrl: '/notifications'
      },
      priority: 'medium'
    });

    res.json({ 
      message: 'Test notification sent successfully',
      notification: {
        id: notification._id,
        title: notification.title,
        message: notification.message
      }
    });
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({ message: 'Error sending test notification', error: error.message });
  }
});

// POST: Send promotional notification to multiple users (admin only)
router.post('/promotional', verifyToken, async (req, res) => {
  try {
    const userId = req.user?.sub || req.user?.uid || req.user?.['cognito:username'];
    const user = await User.findById(userId);
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { userIds, promotion } = req.body;

    if (!promotion || !promotion.title || !promotion.message) {
      return res.status(400).json({ message: 'Promotion title and message are required' });
    }

    let targetUserIds;
    if (userIds && userIds.length > 0) {
      targetUserIds = userIds;
    } else {
      // Send to all users who opted in for promotional notifications
      const users = await User.find({ 
        'preferences.notifications.push': true,
        role: 'customer'
      }).select('_id');
      targetUserIds = users.map(u => u._id.toString());
    }

    const notifications = await RealTimeNotificationService.sendPromotionalNotification(targetUserIds, promotion);

    res.json({ 
      message: 'Promotional notifications sent successfully',
      recipientCount: notifications.length
    });
  } catch (error) {
    console.error('Error sending promotional notifications:', error);
    res.status(500).json({ message: 'Error sending promotional notifications', error: error.message });
  }
});

// GET: Get VAPID public key for push notifications
router.get('/vapid-public-key', (req, res) => {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  if (!publicKey) {
    return res.status(500).json({ message: 'VAPID public key not configured' });
  }
  res.json({ publicKey });
});

// GET: Get notification statistics (admin only)
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const userId = req.user?.sub || req.user?.uid || req.user?.['cognito:username'];
    const user = await User.findById(userId);
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const stats = await Notification.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          unreadCount: {
            $sum: { $cond: [{ $eq: ['$read', false] }, 1, 0] }
          },
          pushSentCount: {
            $sum: { $cond: [{ $eq: ['$pushNotification.sent', true] }, 1, 0] }
          }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    const totalNotifications = await Notification.countDocuments();
    const totalUnread = await Notification.countDocuments({ read: false });
    const connectedUsers = RealTimeNotificationService.getConnectedUsersCount();

    res.json({
      totalNotifications,
      totalUnread,
      connectedUsers,
      byType: stats
    });
  } catch (error) {
    console.error('Error fetching notification stats:', error);
    res.status(500).json({ message: 'Error fetching notification stats', error: error.message });
  }
});

// POST: Send system notification to all users (admin only)
router.post('/system-broadcast', verifyToken, async (req, res) => {
  try {
    const userId = req.user?.sub || req.user?.uid || req.user?.['cognito:username'];
    const user = await User.findById(userId);
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { title, message, data = {} } = req.body;

    if (!title || !message) {
      return res.status(400).json({ message: 'Title and message are required' });
    }

    // Send to all connected users via Socket.IO
    await RealTimeNotificationService.sendSystemNotification(title, message, data);

    // Also create persistent notifications for all users
    const users = await User.find({ role: 'customer' }).select('_id');
    const userIds = users.map(u => u._id.toString());

    const notifications = await RealTimeNotificationService.sendBulkNotifications(userIds, {
      type: 'system',
      title,
      message,
      data,
      priority: 'high'
    });

    res.json({ 
      message: 'System notification broadcast successfully',
      recipientCount: notifications.length,
      connectedUsers: RealTimeNotificationService.getConnectedUsersCount()
    });
  } catch (error) {
    console.error('Error broadcasting system notification:', error);
    res.status(500).json({ message: 'Error broadcasting system notification', error: error.message });
  }
});

export default router;
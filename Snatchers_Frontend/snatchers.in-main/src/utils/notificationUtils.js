// Notification utility functions for testing and managing notifications

export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications');
    return 'unsupported';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    return 'denied';
  }

  const permission = await Notification.requestPermission();
  return permission;
};

export const showTestNotification = (title = 'Test Notification', options = {}) => {
  if (Notification.permission === 'granted') {
    const notification = new Notification(title, {
      body: 'This is a test notification from Snatchers',
      icon: '/favicon.ico',
      tag: 'test-notification',
      ...options
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    // Auto close after 5 seconds
    setTimeout(() => {
      notification.close();
    }, 5000);

    return notification;
  }
  return null;
};

export const subscribeToWebPush = async () => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push messaging is not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    
    // Get VAPID public key from server
    const response = await fetch('/api/notifications/vapid-public-key');
    if (!response.ok) {
      throw new Error('Failed to get VAPID public key');
    }
    
    const { publicKey } = await response.json();
    
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: publicKey
    });

    // Send subscription to server
    const token = localStorage.getItem('token');
    if (token) {
      const subscribeResponse = await fetch('/api/notifications/subscribe-push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ subscription })
      });

      if (subscribeResponse.ok) {
        console.log('Successfully subscribed to push notifications');
        return subscription;
      }
    }
  } catch (error) {
    console.error('Failed to subscribe to push notifications:', error);
    return null;
  }
};

export const unsubscribeFromWebPush = async () => {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      await subscription.unsubscribe();
      
      // Notify server
      const token = localStorage.getItem('token');
      if (token) {
        await fetch('/api/notifications/unsubscribe-push', {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      }
      
      console.log('Successfully unsubscribed from push notifications');
      return true;
    }
  } catch (error) {
    console.error('Failed to unsubscribe from push notifications:', error);
    return false;
  }
  
  return false;
};

export const sendTestNotification = async (type = 'system', title, message) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch('/api/user/test-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        type,
        title: title || 'Test Notification',
        message: message || 'This is a test notification to verify your notification settings.'
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('Test notification sent:', data);
      return data;
    } else {
      throw new Error('Failed to send test notification');
    }
  } catch (error) {
    console.error('Error sending test notification:', error);
    throw error;
  }
};

export const formatNotificationTime = (dateString) => {
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  
  return date.toLocaleDateString();
};

export const getNotificationTypeIcon = (type) => {
  const iconMap = {
    order_confirmation: '📦',
    order_status_update: '📋',
    order_shipped: '🚚',
    order_delivered: '✅',
    order_cancelled: '❌',
    payment_success: '💳',
    payment_failed: '⚠️',
    promotion: '🎁',
    price_drop: '📉',
    back_in_stock: '📦',
    wishlist_item_sale: '❤️',
    abandoned_cart: '🛒',
    deal_alert: '🔥',
    review_reminder: '⭐',
    system: 'ℹ️',
    welcome: '👋'
  };
  
  return iconMap[type] || '🔔';
};

export const getNotificationPriorityColor = (priority) => {
  const colorMap = {
    low: '#6B7280',
    medium: '#3B82F6',
    high: '#EF4444'
  };
  
  return colorMap[priority] || colorMap.medium;
};
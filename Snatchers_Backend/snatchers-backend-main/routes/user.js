import express from 'express';
import User from '../models/User.js';
import verifyToken from '../middleware/auth.js';

const router = express.Router();

// ✅ Save or get user
router.post('/', async (req, res) => {
  const { uid, name, email, photoURL } = req.body;

  try {
    let user = await User.findOne({ uid });

    if (!user) {
      user = new User({ uid, name, email, photoURL });
      await user.save();
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Protected route to get user info from token
router.get('/me', verifyToken, async (req, res) => {
  try {
    const uid = req.user.sub || req.user.uid || req.user['cognito:username'];
    let user = await User.findOne({ uid });

    // 🔧 Auto-create user if not found using Cognito claims
    if (!user) {
      user = new User({
        uid,
        name: req.user.name || req.user['cognito:username'] || "Unknown",
        email: req.user.email || "unknown@example.com",
        photoURL: req.user.picture || ""
      });
      await user.save();
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Address management routes

// Get user addresses
router.get('/addresses', verifyToken, async (req, res) => {
  try {
    const uid = req.user.sub || req.user.uid || req.user['cognito:username'];
    const user = await User.findOne({ uid });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user.addresses || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add new address
router.post('/addresses', verifyToken, async (req, res) => {
  try {
    const uid = req.user.sub || req.user.uid || req.user['cognito:username'];
    const user = await User.findOne({ uid });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const newAddress = {
      ...req.body,
      id: new Date().getTime().toString() // Simple ID generation
    };

    // If this is set as default, unset other defaults
    if (newAddress.isDefault) {
      user.addresses.forEach(addr => addr.isDefault = false);
    }

    // If this is the first address, make it default
    if (user.addresses.length === 0) {
      newAddress.isDefault = true;
    }

    user.addresses.push(newAddress);
    await user.save();

    res.status(201).json(newAddress);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update address
router.put('/addresses/:addressId', verifyToken, async (req, res) => {
  try {
    const uid = req.user.sub || req.user.uid || req.user['cognito:username'];
    const { addressId } = req.params;
    const user = await User.findOne({ uid });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const addressIndex = user.addresses.findIndex(addr => addr.id === addressId);
    if (addressIndex === -1) {
      return res.status(404).json({ error: 'Address not found' });
    }

    // If setting as default, unset other defaults
    if (req.body.isDefault) {
      user.addresses.forEach(addr => addr.isDefault = false);
    }

    // Update the address
    user.addresses[addressIndex] = { ...user.addresses[addressIndex].toObject(), ...req.body };
    await user.save();

    res.json(user.addresses[addressIndex]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete address
router.delete('/addresses/:addressId', verifyToken, async (req, res) => {
  try {
    const uid = req.user.sub || req.user.uid || req.user['cognito:username'];
    const { addressId } = req.params;
    const user = await User.findOne({ uid });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const addressIndex = user.addresses.findIndex(addr => addr.id === addressId);
    if (addressIndex === -1) {
      return res.status(404).json({ error: 'Address not found' });
    }

    const wasDefault = user.addresses[addressIndex].isDefault;
    user.addresses.splice(addressIndex, 1);

    // If deleted address was default and there are other addresses, make the first one default
    if (wasDefault && user.addresses.length > 0) {
      user.addresses[0].isDefault = true;
    }

    await user.save();
    res.json({ message: 'Address deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/user/profile - Update user profile information
router.put('/profile', verifyToken, async (req, res) => {
  try {
    const uid = req.user.sub || req.user.uid || req.user['cognito:username'];
    const { firstName, lastName, phone, dateOfBirth, gender, avatar } = req.body;
    
    const user = await User.findOne({ uid });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Update profile information
    if (!user.profile) user.profile = {};
    
    if (firstName !== undefined) user.profile.firstName = firstName;
    if (lastName !== undefined) user.profile.lastName = lastName;
    if (phone !== undefined) user.profile.phone = phone;
    if (dateOfBirth !== undefined) user.profile.dateOfBirth = dateOfBirth;
    if (gender !== undefined) user.profile.gender = gender;
    if (avatar !== undefined) user.profile.avatar = avatar;
    
    await user.save();
    
    res.json({ 
      message: 'Profile updated successfully',
      profile: user.profile 
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/user/preferences - Update user preferences
router.put('/preferences', verifyToken, async (req, res) => {
  try {
    const uid = req.user.sub || req.user.uid || req.user['cognito:username'];
    const { notifications, categories, brands, priceRange } = req.body;
    
    const user = await User.findOne({ uid });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Update preferences
    if (!user.preferences) user.preferences = {};
    
    if (notifications) {
      user.preferences.notifications = {
        ...user.preferences.notifications,
        ...notifications
      };
    }
    
    if (categories) user.preferences.categories = categories;
    if (brands) user.preferences.brands = brands;
    if (priceRange) user.preferences.priceRange = priceRange;
    
    await user.save();
    
    res.json({ 
      message: 'Preferences updated successfully',
      preferences: user.preferences 
    });
  } catch (error) {
    console.error('Error updating user preferences:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/user/dashboard - Get user dashboard data
router.get('/dashboard', verifyToken, async (req, res) => {
  try {
    const uid = req.user.sub || req.user.uid || req.user['cognito:username'];
    const user = await User.findOne({ uid }).populate('wishlist', 'title images price offerPrice rating');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get recent orders count (you might want to implement this based on your Order model)
    // For now, we'll return basic dashboard data
    const dashboardData = {
      profile: user.profile,
      preferences: user.preferences,
      addresses: user.addresses,
      wishlistCount: user.wishlist ? user.wishlist.length : 0,
      loyaltyPoints: user.loyaltyPoints,
      totalSpent: user.totalSpent,
      recentlyViewed: user.recentlyViewed.slice(0, 5) // Last 5 viewed items
    };
    
    res.json(dashboardData);
  } catch (error) {
    console.error('Error fetching user dashboard:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/user/recently-viewed - Get user's recently viewed products
router.get('/recently-viewed', verifyToken, async (req, res) => {
  try {
    const uid = req.user.sub || req.user.uid || req.user['cognito:username'];
    const limit = parseInt(req.query.limit) || 10;
    
    const user = await User.findOne({ uid })
      .populate({
        path: 'recentlyViewed.product',
        select: 'title images price offerPrice rating category brand status averageRating salesCount',
        match: { status: 'active' }
      });
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    // Filter out null products (inactive/deleted) and limit results
    const recentlyViewed = user.recentlyViewed
      .filter(item => item.product)
      .slice(0, limit)
      .map(item => ({
        ...item.product.toObject(),
        viewedAt: item.viewedAt
      }));
    
    res.json({
      success: true,
      data: recentlyViewed,
      count: recentlyViewed.length
    });
  } catch (error) {
    console.error('Error fetching recently viewed products:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// POST /api/user/recently-viewed - Add product to recently viewed
router.post('/recently-viewed', verifyToken, async (req, res) => {
  try {
    const uid = req.user.sub || req.user.uid || req.user['cognito:username'];
    const { productId } = req.body;
    
    if (!productId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Product ID is required' 
      });
    }
    
    const user = await User.findOne({ uid });
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    await user.addToRecentlyViewed(productId);
    
    res.json({
      success: true,
      message: 'Product added to recently viewed'
    });
  } catch (error) {
    console.error('Error adding to recently viewed:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// DELETE /api/user/recently-viewed - Clear recently viewed products
router.delete('/recently-viewed', verifyToken, async (req, res) => {
  try {
    const uid = req.user.sub || req.user.uid || req.user['cognito:username'];
    
    const user = await User.findOne({ uid });
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    user.recentlyViewed = [];
    await user.save();
    
    res.json({
      success: true,
      message: 'Recently viewed products cleared'
    });
  } catch (error) {
    console.error('Error clearing recently viewed:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

export default router;
// GET: Get user notification preferences
router.get('/notification-preferences', verifyToken, async (req, res) => {
  try {
    const userId = req.user?.sub || req.user?.uid || req.user?.['cognito:username'];
    const user = await User.findOne({ uid: userId });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Return preferences with defaults if not set
    const defaultPreferences = {
      email: {
        orderUpdates: true,
        promotions: true,
        priceDrops: true,
        backInStock: true,
        abandonedCart: true,
        newsletter: false
      },
      push: {
        enabled: false,
        orderUpdates: true,
        promotions: false,
        priceDrops: true,
        backInStock: true,
        deals: true,
        system: true
      },
      inApp: {
        orderUpdates: true,
        promotions: true,
        priceDrops: true,
        backInStock: true,
        deals: true,
        system: true,
        sound: true
      },
      frequency: {
        promotional: 'daily',
        priceDrops: 'immediate',
        deals: 'immediate'
      }
    };

    const preferences = user.preferences?.notifications || defaultPreferences;

    res.json({ preferences });
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    res.status(500).json({ message: 'Error fetching preferences', error: error.message });
  }
});

// PUT: Update user notification preferences
router.put('/notification-preferences', verifyToken, async (req, res) => {
  try {
    const userId = req.user?.sub || req.user?.uid || req.user?.['cognito:username'];
    const { preferences } = req.body;

    if (!preferences) {
      return res.status(400).json({ message: 'Preferences data is required' });
    }

    const user = await User.findOneAndUpdate(
      { uid: userId },
      { 
        $set: { 
          'preferences.notifications': preferences 
        }
      },
      { new: true, upsert: true }
    );

    res.json({ 
      message: 'Notification preferences updated successfully',
      preferences: user.preferences.notifications
    });
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    res.status(500).json({ message: 'Error updating preferences', error: error.message });
  }
});

// POST: Test notification (for testing purposes)
router.post('/test-notification', verifyToken, async (req, res) => {
  try {
    const userId = req.user?.sub || req.user?.uid || req.user?.['cognito:username'];
    const { type = 'system', title, message } = req.body;

    // Import the notification service
    const RealTimeNotificationService = (await import('../services/RealTimeNotificationService.js')).default;

    const notification = await RealTimeNotificationService.createAndSendNotification(userId, {
      type,
      title: title || 'Test Notification',
      message: message || 'This is a test notification to verify your settings are working correctly.',
      data: {
        url: '/notifications',
        actionText: 'View Notifications',
        actionUrl: '/notifications'
      },
      priority: 'medium'
    });

    res.json({ 
      message: 'Test notification sent successfully',
      notificationId: notification._id
    });
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({ message: 'Error sending test notification', error: error.message });
  }
});
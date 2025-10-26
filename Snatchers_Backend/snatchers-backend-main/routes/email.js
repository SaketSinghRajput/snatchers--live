import express from 'express';
import NotificationService from '../services/NotificationService.js';
import User from '../models/User.js';
import Product from '../models/Product.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Send welcome email (typically called after user registration)
router.post('/welcome', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await NotificationService.sendWelcomeEmail(user);
    res.json({ message: 'Welcome email sent successfully' });
  } catch (error) {
    console.error('Error sending welcome email:', error);
    res.status(500).json({ error: 'Failed to send welcome email' });
  }
});

// Send promotional email to multiple users
router.post('/promotional', authenticateToken, async (req, res) => {
  try {
    // Only allow admin users to send promotional emails
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { userIds, promotion } = req.body;
    
    if (!promotion || !promotion.title || !promotion.content) {
      return res.status(400).json({ error: 'Promotion details are required' });
    }

    let targetUsers;
    if (userIds && userIds.length > 0) {
      // Send to specific users
      targetUsers = await User.find({ 
        _id: { $in: userIds },
        'preferences.notifications.email': true 
      });
    } else {
      // Send to all users who opted in for promotional emails
      targetUsers = await User.find({ 
        'preferences.notifications.email': true,
        role: 'customer'
      });
    }

    await NotificationService.sendPromotionalEmail(targetUsers, promotion);
    res.json({ 
      message: 'Promotional emails sent successfully',
      recipientCount: targetUsers.length 
    });
  } catch (error) {
    console.error('Error sending promotional emails:', error);
    res.status(500).json({ error: 'Failed to send promotional emails' });
  }
});

// Send password reset email
router.post('/password-reset', async (req, res) => {
  try {
    const { email, resetToken } = req.body;
    
    if (!email || !resetToken) {
      return res.status(400).json({ error: 'Email and reset token are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await NotificationService.sendPasswordResetEmail(user, resetToken);
    res.json({ message: 'Password reset email sent successfully' });
  } catch (error) {
    console.error('Error sending password reset email:', error);
    res.status(500).json({ error: 'Failed to send password reset email' });
  }
});

// Send account update confirmation email
router.post('/account-update', authenticateToken, async (req, res) => {
  try {
    const { updateType } = req.body;
    
    if (!updateType) {
      return res.status(400).json({ error: 'Update type is required' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await NotificationService.sendAccountUpdateEmail(user, updateType);
    res.json({ message: 'Account update email sent successfully' });
  } catch (error) {
    console.error('Error sending account update email:', error);
    res.status(500).json({ error: 'Failed to send account update email' });
  }
});

// Send price drop alert
router.post('/price-drop', authenticateToken, async (req, res) => {
  try {
    const { productId, oldPrice, newPrice, userIds } = req.body;
    
    if (!productId || !oldPrice || !newPrice) {
      return res.status(400).json({ error: 'Product ID, old price, and new price are required' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    let targetUsers;
    if (userIds && userIds.length > 0) {
      targetUsers = await User.find({ 
        _id: { $in: userIds },
        'preferences.notifications.email': true 
      });
    } else {
      // Find users who have this product in their wishlist
      const { default: Wishlist } = await import('../models/Wishlist.js');
      const wishlists = await Wishlist.find({ 
        'items.product': productId 
      }).populate('user');
      
      targetUsers = wishlists
        .map(wishlist => wishlist.user)
        .filter(user => user && user.preferences?.notifications?.email);
    }

    for (const user of targetUsers) {
      await NotificationService.sendPriceDropAlert(user, product, oldPrice, newPrice);
    }

    res.json({ 
      message: 'Price drop alerts sent successfully',
      recipientCount: targetUsers.length 
    });
  } catch (error) {
    console.error('Error sending price drop alerts:', error);
    res.status(500).json({ error: 'Failed to send price drop alerts' });
  }
});

// Send back in stock alert
router.post('/back-in-stock', authenticateToken, async (req, res) => {
  try {
    const { productId, userIds } = req.body;
    
    if (!productId) {
      return res.status(400).json({ error: 'Product ID is required' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    let targetUsers;
    if (userIds && userIds.length > 0) {
      targetUsers = await User.find({ 
        _id: { $in: userIds },
        'preferences.notifications.email': true 
      });
    } else {
      // Find users who have this product in their wishlist
      const { default: Wishlist } = await import('../models/Wishlist.js');
      const wishlists = await Wishlist.find({ 
        'items.product': productId 
      }).populate('user');
      
      targetUsers = wishlists
        .map(wishlist => wishlist.user)
        .filter(user => user && user.preferences?.notifications?.email);
    }

    for (const user of targetUsers) {
      await NotificationService.sendBackInStockAlert(user, product);
    }

    res.json({ 
      message: 'Back in stock alerts sent successfully',
      recipientCount: targetUsers.length 
    });
  } catch (error) {
    console.error('Error sending back in stock alerts:', error);
    res.status(500).json({ error: 'Failed to send back in stock alerts' });
  }
});

// Manually trigger abandoned cart reminders (admin only)
router.post('/abandoned-cart-reminders', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    await NotificationService.sendAbandonedCartReminders();
    res.json({ message: 'Abandoned cart reminders processed successfully' });
  } catch (error) {
    console.error('Error processing abandoned cart reminders:', error);
    res.status(500).json({ error: 'Failed to process abandoned cart reminders' });
  }
});

// Test email configuration
router.post('/test', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const testEmail = {
      from: process.env.FROM_EMAIL || 'noreply@snatchers.in',
      to: user.email,
      subject: 'Test Email - Snatchers',
      html: `
        <h1>Test Email</h1>
        <p>This is a test email to verify the email configuration.</p>
        <p>Sent at: ${new Date().toLocaleString()}</p>
      `
    };

    await NotificationService.transporter.sendMail(testEmail);
    res.json({ message: 'Test email sent successfully' });
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({ error: 'Failed to send test email' });
  }
});

export default router;
import User from '../models/User.js';
import Order from '../models/Order.js';
import Review from '../models/Review.js';
import Cart from '../models/Cart.js';
import Wishlist from '../models/Wishlist.js';
import Notification from '../models/Notification.js';
import Analytics from '../models/Analytics.js';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

class GDPRService {
  constructor() {
    this.dataRetentionPeriod = 7 * 365 * 24 * 60 * 60 * 1000; // 7 years in milliseconds
    this.exportFormats = ['json', 'csv'];
  }

  // Export all user data (GDPR Article 20 - Right to data portability)
  async exportUserData(userId, format = 'json') {
    try {
      if (!this.exportFormats.includes(format)) {
        throw new Error('Unsupported export format');
      }

      const userData = await this.collectUserData(userId);
      
      // Log the data export request
      this.logGDPRActivity('data_export', {
        userId,
        format,
        dataTypes: Object.keys(userData),
        timestamp: new Date().toISOString()
      });

      if (format === 'json') {
        return {
          success: true,
          data: userData,
          format: 'json',
          exportedAt: new Date().toISOString()
        };
      } else if (format === 'csv') {
        const csvData = this.convertToCSV(userData);
        return {
          success: true,
          data: csvData,
          format: 'csv',
          exportedAt: new Date().toISOString()
        };
      }
    } catch (error) {
      this.logGDPRActivity('data_export_failed', {
        userId,
        error: error.message
      }, 'error');
      throw new Error('Failed to export user data');
    }
  }

  // Collect all user data from various collections
  async collectUserData(userId) {
    const userData = {
      user: null,
      orders: [],
      reviews: [],
      cart: null,
      wishlists: [],
      notifications: [],
      analytics: []
    };

    try {
      // User profile data
      userData.user = await User.findOne({ uid: userId }).lean();
      if (userData.user) {
        // Remove sensitive fields
        delete userData.user.password;
        delete userData.user.__v;
      }

      // Order history
      userData.orders = await Order.find({ userId }).lean();

      // Reviews
      userData.reviews = await Review.find({ user: userData.user?._id }).lean();

      // Cart data
      userData.cart = await Cart.findOne({ userId }).lean();

      // Wishlists
      userData.wishlists = await Wishlist.find({ userId }).lean();

      // Notifications
      userData.notifications = await Notification.find({ userId }).lean();

      // Analytics data (anonymized)
      userData.analytics = await Analytics.find({ 
        userId: userData.user?._id 
      }).select('-ipAddress -userAgent').lean();

      return userData;
    } catch (error) {
      throw new Error('Failed to collect user data');
    }
  }

  // Delete all user data (GDPR Article 17 - Right to erasure)
  async deleteUserData(userId, reason = 'user_request') {
    try {
      const user = await User.findOne({ uid: userId });
      if (!user) {
        throw new Error('User not found');
      }

      const deletionLog = {
        userId,
        userEmail: user.email,
        reason,
        deletedAt: new Date().toISOString(),
        deletedData: []
      };

      // Delete user profile
      await User.deleteOne({ uid: userId });
      deletionLog.deletedData.push('user_profile');

      // Delete orders (or anonymize based on legal requirements)
      const orderCount = await Order.countDocuments({ userId });
      if (orderCount > 0) {
        // For legal/tax purposes, you might want to anonymize rather than delete
        await Order.updateMany(
          { userId },
          { 
            $unset: { 
              userId: 1,
              'shippingAddress.name': 1,
              'shippingAddress.phone': 1,
              'billingAddress.name': 1,
              'billingAddress.phone': 1
            },
            $set: { 
              anonymized: true,
              anonymizedAt: new Date()
            }
          }
        );
        deletionLog.deletedData.push(`${orderCount}_orders_anonymized`);
      }

      // Delete reviews
      const reviewCount = await Review.countDocuments({ user: user._id });
      if (reviewCount > 0) {
        await Review.deleteMany({ user: user._id });
        deletionLog.deletedData.push(`${reviewCount}_reviews`);
      }

      // Delete cart
      await Cart.deleteOne({ userId });
      deletionLog.deletedData.push('cart');

      // Delete wishlists
      const wishlistCount = await Wishlist.countDocuments({ userId });
      if (wishlistCount > 0) {
        await Wishlist.deleteMany({ userId });
        deletionLog.deletedData.push(`${wishlistCount}_wishlists`);
      }

      // Delete notifications
      const notificationCount = await Notification.countDocuments({ userId });
      if (notificationCount > 0) {
        await Notification.deleteMany({ userId });
        deletionLog.deletedData.push(`${notificationCount}_notifications`);
      }

      // Anonymize analytics data
      const analyticsCount = await Analytics.countDocuments({ userId: user._id });
      if (analyticsCount > 0) {
        await Analytics.updateMany(
          { userId: user._id },
          { 
            $unset: { userId: 1, ipAddress: 1, userAgent: 1 },
            $set: { anonymized: true, anonymizedAt: new Date() }
          }
        );
        deletionLog.deletedData.push(`${analyticsCount}_analytics_anonymized`);
      }

      // Log the deletion
      this.logGDPRActivity('data_deletion', deletionLog);

      return {
        success: true,
        message: 'User data deleted successfully',
        deletionLog
      };
    } catch (error) {
      this.logGDPRActivity('data_deletion_failed', {
        userId,
        error: error.message
      }, 'error');
      throw new Error('Failed to delete user data');
    }
  }

  // Anonymize user data (alternative to deletion)
  async anonymizeUserData(userId, reason = 'user_request') {
    try {
      const user = await User.findOne({ uid: userId });
      if (!user) {
        throw new Error('User not found');
      }

      const anonymizationLog = {
        userId,
        originalEmail: user.email,
        reason,
        anonymizedAt: new Date().toISOString(),
        anonymizedData: []
      };

      // Generate anonymous identifier
      const anonymousId = `anon_${crypto.randomBytes(8).toString('hex')}`;

      // Anonymize user profile
      await User.updateOne(
        { uid: userId },
        {
          $set: {
            email: `${anonymousId}@anonymized.local`,
            name: 'Anonymous User',
            'profile.firstName': 'Anonymous',
            'profile.lastName': 'User',
            'profile.phone': null,
            'profile.dateOfBirth': null,
            anonymized: true,
            anonymizedAt: new Date(),
            originalUid: userId
          },
          $unset: {
            'profile.avatar': 1,
            'addresses': 1
          }
        }
      );
      anonymizationLog.anonymizedData.push('user_profile');

      // Anonymize orders
      await Order.updateMany(
        { userId },
        {
          $set: {
            userId: anonymousId,
            'shippingAddress.name': 'Anonymous User',
            'shippingAddress.phone': null,
            'billingAddress.name': 'Anonymous User',
            'billingAddress.phone': null,
            anonymized: true,
            anonymizedAt: new Date()
          }
        }
      );
      anonymizationLog.anonymizedData.push('orders');

      // Anonymize reviews
      await Review.updateMany(
        { user: user._id },
        {
          $set: {
            anonymized: true,
            anonymizedAt: new Date()
          }
        }
      );
      anonymizationLog.anonymizedData.push('reviews');

      // Log the anonymization
      this.logGDPRActivity('data_anonymization', anonymizationLog);

      return {
        success: true,
        message: 'User data anonymized successfully',
        anonymizationLog
      };
    } catch (error) {
      this.logGDPRActivity('data_anonymization_failed', {
        userId,
        error: error.message
      }, 'error');
      throw new Error('Failed to anonymize user data');
    }
  }

  // Get user consent status
  async getUserConsent(userId) {
    try {
      const user = await User.findOne({ uid: userId }).select('consent').lean();
      
      if (!user) {
        throw new Error('User not found');
      }

      return {
        success: true,
        consent: user.consent || {
          marketing: false,
          analytics: false,
          functional: true, // Required for basic functionality
          lastUpdated: null
        }
      };
    } catch (error) {
      throw new Error('Failed to get user consent');
    }
  }

  // Update user consent
  async updateUserConsent(userId, consentData) {
    try {
      const validConsentTypes = ['marketing', 'analytics', 'functional'];
      const consent = {
        lastUpdated: new Date()
      };

      // Validate and set consent preferences
      for (const [type, value] of Object.entries(consentData)) {
        if (validConsentTypes.includes(type)) {
          consent[type] = Boolean(value);
        }
      }

      // Functional consent is always required
      consent.functional = true;

      await User.updateOne(
        { uid: userId },
        { $set: { consent } }
      );

      this.logGDPRActivity('consent_updated', {
        userId,
        consent,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        consent
      };
    } catch (error) {
      this.logGDPRActivity('consent_update_failed', {
        userId,
        error: error.message
      }, 'error');
      throw new Error('Failed to update user consent');
    }
  }

  // Data retention cleanup (run periodically)
  async cleanupExpiredData() {
    try {
      const cutoffDate = new Date(Date.now() - this.dataRetentionPeriod);
      
      // Clean up old analytics data
      const analyticsResult = await Analytics.deleteMany({
        timestamp: { $lt: cutoffDate },
        anonymized: { $ne: true }
      });

      // Clean up old notifications
      const notificationsResult = await Notification.deleteMany({
        createdAt: { $lt: cutoffDate },
        read: true
      });

      const cleanupLog = {
        cutoffDate: cutoffDate.toISOString(),
        analyticsDeleted: analyticsResult.deletedCount,
        notificationsDeleted: notificationsResult.deletedCount,
        timestamp: new Date().toISOString()
      };

      this.logGDPRActivity('data_retention_cleanup', cleanupLog);

      return {
        success: true,
        cleanupLog
      };
    } catch (error) {
      this.logGDPRActivity('data_retention_cleanup_failed', {
        error: error.message
      }, 'error');
      throw new Error('Failed to cleanup expired data');
    }
  }

  // Convert user data to CSV format
  convertToCSV(userData) {
    const csvSections = [];

    // User profile
    if (userData.user) {
      csvSections.push('User Profile');
      csvSections.push(this.objectToCSV([userData.user]));
      csvSections.push('');
    }

    // Orders
    if (userData.orders.length > 0) {
      csvSections.push('Orders');
      csvSections.push(this.objectToCSV(userData.orders));
      csvSections.push('');
    }

    // Reviews
    if (userData.reviews.length > 0) {
      csvSections.push('Reviews');
      csvSections.push(this.objectToCSV(userData.reviews));
      csvSections.push('');
    }

    return csvSections.join('\n');
  }

  // Helper function to convert object array to CSV
  objectToCSV(objArray) {
    if (!objArray.length) return '';

    const headers = Object.keys(objArray[0]);
    const csvRows = [headers.join(',')];

    for (const obj of objArray) {
      const values = headers.map(header => {
        const value = obj[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return JSON.stringify(value);
        return `"${String(value).replace(/"/g, '""')}"`;
      });
      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  }

  // GDPR activity logging
  logGDPRActivity(activity, data, level = 'info') {
    const logEntry = {
      timestamp: new Date().toISOString(),
      activity,
      level,
      service: 'GDPRService',
      data
    };

    if (level === 'error') {
      console.error(`[GDPR] ${JSON.stringify(logEntry)}`);
    } else if (level === 'warn') {
      console.warn(`[GDPR] ${JSON.stringify(logEntry)}`);
    } else {
      console.log(`[GDPR] ${JSON.stringify(logEntry)}`);
    }
  }

  // Generate privacy policy compliance report
  async generateComplianceReport() {
    try {
      const report = {
        generatedAt: new Date().toISOString(),
        dataRetentionPeriod: `${this.dataRetentionPeriod / (365 * 24 * 60 * 60 * 1000)} years`,
        userCounts: {},
        consentStats: {},
        recentActivities: []
      };

      // Get user statistics
      report.userCounts.total = await User.countDocuments();
      report.userCounts.anonymized = await User.countDocuments({ anonymized: true });
      report.userCounts.withConsent = await User.countDocuments({ 'consent.marketing': true });

      // Get consent statistics
      const consentStats = await User.aggregate([
        {
          $group: {
            _id: null,
            marketingConsent: { $sum: { $cond: ['$consent.marketing', 1, 0] } },
            analyticsConsent: { $sum: { $cond: ['$consent.analytics', 1, 0] } },
            functionalConsent: { $sum: { $cond: ['$consent.functional', 1, 0] } }
          }
        }
      ]);

      if (consentStats.length > 0) {
        report.consentStats = consentStats[0];
        delete report.consentStats._id;
      }

      this.logGDPRActivity('compliance_report_generated', {
        reportId: crypto.randomBytes(8).toString('hex'),
        timestamp: report.generatedAt
      });

      return {
        success: true,
        report
      };
    } catch (error) {
      this.logGDPRActivity('compliance_report_failed', {
        error: error.message
      }, 'error');
      throw new Error('Failed to generate compliance report');
    }
  }
}

export default new GDPRService();
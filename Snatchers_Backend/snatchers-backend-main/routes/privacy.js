import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { 
  generalRateLimit,
  handleValidationErrors,
  auditLogger,
  sanitizeInput,
  validateObjectId
} from '../middleware/security.js';
import { body, query } from 'express-validator';
import GDPRService from '../services/GDPRService.js';
import AuditLogService from '../services/AuditLogService.js';

const router = express.Router();

// Apply security middleware
router.use(generalRateLimit);
router.use(sanitizeInput);

// GDPR Data Export (Article 20 - Right to data portability)
router.get('/export-data',
  authenticateToken,
  [
    query('format').optional().isIn(['json', 'csv']).withMessage('Format must be json or csv')
  ],
  handleValidationErrors,
  auditLogger('gdpr_data_export', 'info'),
  async (req, res) => {
    try {
      const userId = req.user.id;
      const format = req.query.format || 'json';

      // Log the data export request
      await AuditLogService.logEvent({
        userId,
        userEmail: req.user.email,
        action: 'data_export',
        resource: 'user_data',
        resourceId: userId,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        details: { format },
        severity: 'medium',
        source: 'web'
      });

      const result = await GDPRService.exportUserData(userId, format);

      if (result.success) {
        // Set appropriate headers for download
        const filename = `user_data_${userId}_${new Date().toISOString().split('T')[0]}.${format}`;
        
        if (format === 'csv') {
          res.setHeader('Content-Type', 'text/csv');
          res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
          res.send(result.data);
        } else {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
          res.json(result);
        }
      } else {
        res.status(500).json({
          error: 'Failed to export user data'
        });
      }
    } catch (error) {
      console.error('[Privacy] Data export error:', error);
      
      await AuditLogService.logEvent({
        userId: req.user?.id,
        action: 'data_export',
        resource: 'user_data',
        ipAddress: req.ip,
        details: { error: error.message },
        severity: 'high',
        status: 'failure',
        source: 'web'
      });

      res.status(500).json({
        error: 'Failed to export user data'
      });
    }
  }
);

// GDPR Data Deletion (Article 17 - Right to erasure)
router.delete('/delete-data',
  authenticateToken,
  [
    body('confirmEmail').isEmail().withMessage('Confirmation email is required'),
    body('reason').optional().isLength({ max: 500 }).withMessage('Reason must be less than 500 characters')
  ],
  handleValidationErrors,
  auditLogger('gdpr_data_deletion', 'warn'),
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { confirmEmail, reason } = req.body;

      // Verify email matches user's email
      if (confirmEmail !== req.user.email) {
        await AuditLogService.logEvent({
          userId,
          userEmail: req.user.email,
          action: 'data_deletion',
          resource: 'user_data',
          resourceId: userId,
          ipAddress: req.ip,
          details: { 
            error: 'Email confirmation mismatch',
            providedEmail: confirmEmail 
          },
          severity: 'high',
          status: 'failure',
          source: 'web'
        });

        return res.status(400).json({
          error: 'Email confirmation does not match your account email'
        });
      }

      // Log the deletion request
      await AuditLogService.logEvent({
        userId,
        userEmail: req.user.email,
        action: 'data_deletion',
        resource: 'user_data',
        resourceId: userId,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        details: { reason: reason || 'User requested deletion' },
        severity: 'critical',
        source: 'web'
      });

      const result = await GDPRService.deleteUserData(userId, reason);

      if (result.success) {
        res.json({
          message: 'Your data has been successfully deleted',
          deletionLog: result.deletionLog
        });
      } else {
        res.status(500).json({
          error: 'Failed to delete user data'
        });
      }
    } catch (error) {
      console.error('[Privacy] Data deletion error:', error);
      
      await AuditLogService.logEvent({
        userId: req.user?.id,
        action: 'data_deletion',
        resource: 'user_data',
        ipAddress: req.ip,
        details: { error: error.message },
        severity: 'critical',
        status: 'failure',
        source: 'web'
      });

      res.status(500).json({
        error: 'Failed to delete user data'
      });
    }
  }
);

// Data Anonymization (alternative to deletion)
router.post('/anonymize-data',
  authenticateToken,
  [
    body('confirmEmail').isEmail().withMessage('Confirmation email is required'),
    body('reason').optional().isLength({ max: 500 }).withMessage('Reason must be less than 500 characters')
  ],
  handleValidationErrors,
  auditLogger('gdpr_data_anonymization', 'warn'),
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { confirmEmail, reason } = req.body;

      // Verify email matches user's email
      if (confirmEmail !== req.user.email) {
        return res.status(400).json({
          error: 'Email confirmation does not match your account email'
        });
      }

      // Log the anonymization request
      await AuditLogService.logEvent({
        userId,
        userEmail: req.user.email,
        action: 'data_anonymization',
        resource: 'user_data',
        resourceId: userId,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        details: { reason: reason || 'User requested anonymization' },
        severity: 'high',
        source: 'web'
      });

      const result = await GDPRService.anonymizeUserData(userId, reason);

      if (result.success) {
        res.json({
          message: 'Your data has been successfully anonymized',
          anonymizationLog: result.anonymizationLog
        });
      } else {
        res.status(500).json({
          error: 'Failed to anonymize user data'
        });
      }
    } catch (error) {
      console.error('[Privacy] Data anonymization error:', error);
      res.status(500).json({
        error: 'Failed to anonymize user data'
      });
    }
  }
);

// Get user consent preferences
router.get('/consent',
  authenticateToken,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const result = await GDPRService.getUserConsent(userId);

      if (result.success) {
        res.json(result.consent);
      } else {
        res.status(500).json({
          error: 'Failed to get consent preferences'
        });
      }
    } catch (error) {
      console.error('[Privacy] Get consent error:', error);
      res.status(500).json({
        error: 'Failed to get consent preferences'
      });
    }
  }
);

// Update user consent preferences
router.put('/consent',
  authenticateToken,
  [
    body('marketing').optional().isBoolean().withMessage('Marketing consent must be boolean'),
    body('analytics').optional().isBoolean().withMessage('Analytics consent must be boolean'),
    body('functional').optional().isBoolean().withMessage('Functional consent must be boolean')
  ],
  handleValidationErrors,
  auditLogger('consent_update', 'info'),
  async (req, res) => {
    try {
      const userId = req.user.id;
      const consentData = req.body;

      // Log consent update
      await AuditLogService.logEvent({
        userId,
        userEmail: req.user.email,
        action: 'consent_updated',
        resource: 'user_consent',
        resourceId: userId,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        details: { consentData },
        severity: 'medium',
        source: 'web'
      });

      const result = await GDPRService.updateUserConsent(userId, consentData);

      if (result.success) {
        res.json({
          message: 'Consent preferences updated successfully',
          consent: result.consent
        });
      } else {
        res.status(500).json({
          error: 'Failed to update consent preferences'
        });
      }
    } catch (error) {
      console.error('[Privacy] Update consent error:', error);
      res.status(500).json({
        error: 'Failed to update consent preferences'
      });
    }
  }
);

// Privacy policy and terms acceptance
router.post('/accept-terms',
  authenticateToken,
  [
    body('privacyPolicyVersion').isString().withMessage('Privacy policy version is required'),
    body('termsVersion').isString().withMessage('Terms version is required'),
    body('acceptedAt').optional().isISO8601().withMessage('Invalid date format')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { privacyPolicyVersion, termsVersion, acceptedAt } = req.body;

      // Log terms acceptance
      await AuditLogService.logEvent({
        userId,
        userEmail: req.user.email,
        action: 'privacy_request',
        resource: 'terms_acceptance',
        resourceId: userId,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        details: {
          privacyPolicyVersion,
          termsVersion,
          acceptedAt: acceptedAt || new Date().toISOString()
        },
        severity: 'low',
        source: 'web'
      });

      // Update user record with terms acceptance
      // This would typically update the User model
      // For now, we'll just return success

      res.json({
        message: 'Terms and privacy policy acceptance recorded',
        acceptedAt: acceptedAt || new Date().toISOString()
      });
    } catch (error) {
      console.error('[Privacy] Terms acceptance error:', error);
      res.status(500).json({
        error: 'Failed to record terms acceptance'
      });
    }
  }
);

// Get audit logs for user (limited view)
router.get('/audit-logs',
  authenticateToken,
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
    query('action').optional().isString().withMessage('Action must be a string')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 20, action } = req.query;

      const filters = { userId };
      if (action) filters.action = action;

      const result = await AuditLogService.queryLogs(filters, {
        page: parseInt(page),
        limit: parseInt(limit)
      });

      if (result.success) {
        // Filter out sensitive information for user view
        const sanitizedLogs = result.logs.map(log => ({
          timestamp: log.timestamp,
          action: log.action,
          resource: log.resource,
          status: log.status,
          ipAddress: log.ipAddress?.replace(/\.\d+$/, '.***'), // Partially mask IP
          details: log.details ? 'Available' : 'None'
        }));

        res.json({
          logs: sanitizedLogs,
          pagination: result.pagination
        });
      } else {
        res.status(500).json({
          error: 'Failed to retrieve audit logs'
        });
      }
    } catch (error) {
      console.error('[Privacy] Audit logs error:', error);
      res.status(500).json({
        error: 'Failed to retrieve audit logs'
      });
    }
  }
);

export default router;
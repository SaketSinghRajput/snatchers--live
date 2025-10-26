import mongoose from 'mongoose';
import crypto from 'crypto';

// Audit Log Schema
const auditLogSchema = new mongoose.Schema({
  eventId: {
    type: String,
    required: true,
    unique: true,
    default: () => crypto.randomBytes(16).toString('hex')
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  },
  userId: {
    type: String,
    required: false // Some events might not have a user context
  },
  userEmail: {
    type: String,
    required: false
  },
  action: {
    type: String,
    required: true,
    enum: [
      // Authentication events
      'login_success',
      'login_failed',
      'logout',
      'password_change',
      'account_locked',
      
      // Data access events
      'data_access',
      'data_export',
      'data_deletion',
      'data_anonymization',
      
      // Administrative events
      'admin_access',
      'user_role_change',
      'system_config_change',
      'bulk_operation',
      
      // Payment events
      'payment_created',
      'payment_processed',
      'payment_failed',
      'refund_processed',
      
      // Security events
      'security_violation',
      'rate_limit_exceeded',
      'suspicious_activity',
      'unauthorized_access',
      
      // GDPR events
      'consent_updated',
      'privacy_request',
      'data_breach',
      
      // Order events
      'order_created',
      'order_modified',
      'order_cancelled',
      'order_fulfilled'
    ]
  },
  resource: {
    type: String,
    required: false // e.g., 'user', 'order', 'product', 'payment'
  },
  resourceId: {
    type: String,
    required: false // ID of the affected resource
  },
  ipAddress: {
    type: String,
    required: false
  },
  userAgent: {
    type: String,
    required: false
  },
  sessionId: {
    type: String,
    required: false
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    required: false
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['success', 'failure', 'pending'],
    default: 'success'
  },
  source: {
    type: String,
    required: true // e.g., 'web', 'api', 'admin', 'system'
  },
  // For compliance and forensics
  hash: {
    type: String,
    required: true // Hash of the log entry for integrity verification
  },
  previousHash: {
    type: String,
    required: false // Hash of the previous log entry (blockchain-like integrity)
  }
}, {
  timestamps: false, // We use our own timestamp field
  collection: 'audit_logs'
});

// Indexes for efficient querying
auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ severity: 1, timestamp: -1 });
auditLogSchema.index({ ipAddress: 1, timestamp: -1 });

// Create the model
const AuditLog = mongoose.model('AuditLog', auditLogSchema);

class AuditLogService {
  constructor() {
    this.secretKey = process.env.AUDIT_LOG_SECRET || 'default-audit-secret';
    this.lastHash = null;
    this.initializeLastHash();
  }

  // Initialize the last hash for blockchain-like integrity
  async initializeLastHash() {
    try {
      const lastLog = await AuditLog.findOne().sort({ timestamp: -1 }).select('hash');
      this.lastHash = lastLog?.hash || null;
    } catch (error) {
      console.error('[Audit] Failed to initialize last hash:', error);
    }
  }

  // Log a security or sensitive operation
  async logEvent(eventData) {
    try {
      const {
        userId,
        userEmail,
        action,
        resource,
        resourceId,
        ipAddress,
        userAgent,
        sessionId,
        details,
        severity = 'medium',
        status = 'success',
        source = 'api'
      } = eventData;

      // Create the log entry
      const logEntry = {
        timestamp: new Date(),
        userId,
        userEmail,
        action,
        resource,
        resourceId,
        ipAddress,
        userAgent,
        sessionId,
        details: this.sanitizeDetails(details),
        severity,
        status,
        source,
        previousHash: this.lastHash
      };

      // Generate hash for integrity
      logEntry.hash = this.generateHash(logEntry);
      this.lastHash = logEntry.hash;

      // Save to database
      const auditLog = new AuditLog(logEntry);
      await auditLog.save();

      // Log to console for immediate visibility
      this.logToConsole(logEntry);

      return {
        success: true,
        eventId: auditLog.eventId
      };
    } catch (error) {
      console.error('[Audit] Failed to log event:', error);
      // Still log to console even if database save fails
      this.logToConsole({
        ...eventData,
        error: error.message,
        fallback: true
      });
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Generate hash for log entry integrity
  generateHash(logEntry) {
    const hashData = {
      timestamp: logEntry.timestamp.toISOString(),
      userId: logEntry.userId,
      action: logEntry.action,
      resource: logEntry.resource,
      resourceId: logEntry.resourceId,
      details: JSON.stringify(logEntry.details),
      previousHash: logEntry.previousHash
    };

    return crypto
      .createHmac('sha256', this.secretKey)
      .update(JSON.stringify(hashData))
      .digest('hex');
  }

  // Sanitize sensitive details before logging
  sanitizeDetails(details) {
    if (!details || typeof details !== 'object') {
      return details;
    }

    const sanitized = { ...details };
    
    // Remove sensitive fields
    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'key',
      'creditCard',
      'ssn',
      'bankAccount',
      'razorpay_key_secret',
      'cvv',
      'pin'
    ];

    const sanitizeObject = (obj) => {
      if (!obj || typeof obj !== 'object') return obj;
      
      const result = Array.isArray(obj) ? [] : {};
      
      for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();
        
        if (sensitiveFields.some(field => lowerKey.includes(field))) {
          result[key] = '[REDACTED]';
        } else if (typeof value === 'object' && value !== null) {
          result[key] = sanitizeObject(value);
        } else {
          result[key] = value;
        }
      }
      
      return result;
    };

    return sanitizeObject(sanitized);
  }

  // Log to console with appropriate level
  logToConsole(logEntry) {
    const consoleEntry = {
      timestamp: logEntry.timestamp?.toISOString() || new Date().toISOString(),
      eventId: logEntry.eventId,
      action: logEntry.action,
      userId: logEntry.userId,
      severity: logEntry.severity,
      status: logEntry.status,
      resource: logEntry.resource,
      ipAddress: logEntry.ipAddress
    };

    const message = `[Audit] ${JSON.stringify(consoleEntry)}`;

    switch (logEntry.severity) {
      case 'critical':
        console.error(message);
        break;
      case 'high':
        console.warn(message);
        break;
      case 'medium':
        console.log(message);
        break;
      case 'low':
        console.debug(message);
        break;
      default:
        console.log(message);
    }
  }

  // Query audit logs with filters
  async queryLogs(filters = {}, options = {}) {
    try {
      const {
        userId,
        action,
        resource,
        severity,
        startDate,
        endDate,
        ipAddress,
        status
      } = filters;

      const {
        page = 1,
        limit = 50,
        sortBy = 'timestamp',
        sortOrder = 'desc'
      } = options;

      // Build query
      const query = {};
      
      if (userId) query.userId = userId;
      if (action) query.action = action;
      if (resource) query.resource = resource;
      if (severity) query.severity = severity;
      if (status) query.status = status;
      if (ipAddress) query.ipAddress = ipAddress;
      
      if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) query.timestamp.$gte = new Date(startDate);
        if (endDate) query.timestamp.$lte = new Date(endDate);
      }

      // Execute query
      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
      const skip = (page - 1) * limit;

      const [logs, total] = await Promise.all([
        AuditLog.find(query)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        AuditLog.countDocuments(query)
      ]);

      return {
        success: true,
        logs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('[Audit] Failed to query logs:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Verify log integrity
  async verifyLogIntegrity(eventId) {
    try {
      const log = await AuditLog.findOne({ eventId });
      if (!log) {
        return {
          success: false,
          error: 'Log entry not found'
        };
      }

      // Recreate hash and compare
      const expectedHash = this.generateHash(log);
      const isValid = expectedHash === log.hash;

      return {
        success: true,
        valid: isValid,
        eventId,
        expectedHash,
        actualHash: log.hash
      };
    } catch (error) {
      console.error('[Audit] Failed to verify log integrity:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Generate audit report
  async generateAuditReport(startDate, endDate) {
    try {
      const query = {
        timestamp: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };

      const [
        totalLogs,
        actionStats,
        severityStats,
        userStats,
        failureStats
      ] = await Promise.all([
        AuditLog.countDocuments(query),
        AuditLog.aggregate([
          { $match: query },
          { $group: { _id: '$action', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]),
        AuditLog.aggregate([
          { $match: query },
          { $group: { _id: '$severity', count: { $sum: 1 } } }
        ]),
        AuditLog.aggregate([
          { $match: { ...query, userId: { $exists: true } } },
          { $group: { _id: '$userId', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 }
        ]),
        AuditLog.aggregate([
          { $match: { ...query, status: 'failure' } },
          { $group: { _id: '$action', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ])
      ]);

      const report = {
        period: { startDate, endDate },
        generatedAt: new Date().toISOString(),
        summary: {
          totalLogs,
          actionBreakdown: actionStats,
          severityBreakdown: severityStats,
          topUsers: userStats,
          failures: failureStats
        }
      };

      // Log the report generation
      await this.logEvent({
        action: 'audit_report_generated',
        resource: 'audit_logs',
        details: {
          period: report.period,
          totalLogs
        },
        severity: 'low',
        source: 'system'
      });

      return {
        success: true,
        report
      };
    } catch (error) {
      console.error('[Audit] Failed to generate audit report:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Clean up old audit logs (for data retention compliance)
  async cleanupOldLogs(retentionDays = 2555) { // ~7 years default
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const result = await AuditLog.deleteMany({
        timestamp: { $lt: cutoffDate }
      });

      await this.logEvent({
        action: 'audit_logs_cleanup',
        resource: 'audit_logs',
        details: {
          cutoffDate: cutoffDate.toISOString(),
          deletedCount: result.deletedCount,
          retentionDays
        },
        severity: 'low',
        source: 'system'
      });

      return {
        success: true,
        deletedCount: result.deletedCount,
        cutoffDate
      };
    } catch (error) {
      console.error('[Audit] Failed to cleanup old logs:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default new AuditLogService();
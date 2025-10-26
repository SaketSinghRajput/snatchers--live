import axios from 'axios';
import crypto from 'crypto';
import os from 'os';

class ErrorTrackingService {
  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.errors = new Map(); // In-memory error storage
    this.errorCounts = new Map(); // Error frequency tracking
    this.maxStoredErrors = 1000;
    
    // Configuration
    this.config = {
      sentryDsn: process.env.SENTRY_DSN,
      bugsnagApiKey: process.env.BUGSNAG_API_KEY,
      rollbarAccessToken: process.env.ROLLBAR_ACCESS_TOKEN,
      webhookUrl: process.env.ERROR_WEBHOOK_URL,
      slackWebhookUrl: process.env.SLACK_WEBHOOK_URL,
      emailAlerts: process.env.ERROR_EMAIL_ALERTS === 'true',
      alertEmail: process.env.ALERT_EMAIL
    };

    // Initialize external services
    this.initializeServices();
    
    // Set up cleanup interval
    this.setupCleanup();
  }

  initializeServices() {
    // Initialize Sentry if configured
    if (this.config.sentryDsn) {
      try {
        // Note: In a real implementation, you would import and configure Sentry here
        console.log('[ErrorTracking] Sentry DSN configured');
      } catch (error) {
        console.error('[ErrorTracking] Failed to initialize Sentry:', error);
      }
    }

    // Initialize other services as needed
    console.log('[ErrorTracking] Error tracking service initialized');
  }

  setupCleanup() {
    // Clean up old errors every hour
    setInterval(() => {
      this.cleanupOldErrors();
    }, 60 * 60 * 1000);
  }

  // Generate unique error ID
  generateErrorId(error, context = {}) {
    const errorString = `${error.message}${error.stack}${context.userId || ''}${context.path || ''}`;
    return crypto.createHash('md5').update(errorString).digest('hex');
  }

  // Track error occurrence
  async trackError(error, context = {}) {
    try {
      const errorId = this.generateErrorId(error, context);
      const timestamp = new Date().toISOString();
      
      // Create error object
      const errorData = {
        id: errorId,
        message: error.message,
        stack: error.stack,
        name: error.name,
        timestamp,
        context: {
          ...context,
          environment: process.env.NODE_ENV,
          hostname: os.hostname(),
          platform: os.platform(),
          nodeVersion: process.version,
          pid: process.pid,
          memory: process.memoryUsage(),
          uptime: process.uptime()
        },
        fingerprint: this.generateFingerprint(error),
        severity: this.determineSeverity(error, context),
        tags: this.generateTags(error, context)
      };

      // Store error
      this.storeError(errorData);
      
      // Update error count
      this.updateErrorCount(errorId);
      
      // Send to external services
      await this.sendToExternalServices(errorData);
      
      // Check if alert should be sent
      await this.checkAndSendAlert(errorData);
      
      return errorId;
    } catch (trackingError) {
      console.error('[ErrorTracking] Failed to track error:', trackingError);
    }
  }

  storeError(errorData) {
    // Store in memory (in production, you might want to use a database)
    this.errors.set(errorData.id, errorData);
    
    // Limit stored errors
    if (this.errors.size > this.maxStoredErrors) {
      const oldestKey = this.errors.keys().next().value;
      this.errors.delete(oldestKey);
    }
  }

  updateErrorCount(errorId) {
    const current = this.errorCounts.get(errorId) || { count: 0, firstSeen: new Date(), lastSeen: new Date() };
    current.count++;
    current.lastSeen = new Date();
    this.errorCounts.set(errorId, current);
  }

  generateFingerprint(error) {
    // Create a fingerprint for grouping similar errors
    const key = `${error.name}:${error.message}`;
    return crypto.createHash('sha256').update(key).digest('hex').substring(0, 16);
  }

  determineSeverity(error, context) {
    // Determine error severity based on error type and context
    if (error.name === 'ValidationError') return 'low';
    if (error.name === 'UnauthorizedError') return 'medium';
    if (error.name === 'DatabaseError') return 'high';
    if (error.name === 'PaymentError') return 'critical';
    if (context.statusCode >= 500) return 'high';
    if (context.statusCode >= 400) return 'medium';
    return 'low';
  }

  generateTags(error, context) {
    const tags = [];
    
    // Add error type tags
    tags.push(`error_type:${error.name}`);
    
    // Add context tags
    if (context.userId) tags.push(`user:${context.userId}`);
    if (context.path) tags.push(`endpoint:${context.path}`);
    if (context.method) tags.push(`method:${context.method}`);
    if (context.statusCode) tags.push(`status:${context.statusCode}`);
    
    // Add environment tags
    tags.push(`env:${process.env.NODE_ENV}`);
    tags.push(`node:${process.version}`);
    
    return tags;
  }

  async sendToExternalServices(errorData) {
    const promises = [];

    // Send to Sentry
    if (this.config.sentryDsn) {
      promises.push(this.sendToSentry(errorData));
    }

    // Send to Bugsnag
    if (this.config.bugsnagApiKey) {
      promises.push(this.sendToBugsnag(errorData));
    }

    // Send to Rollbar
    if (this.config.rollbarAccessToken) {
      promises.push(this.sendToRollbar(errorData));
    }

    // Send to webhook
    if (this.config.webhookUrl) {
      promises.push(this.sendToWebhook(errorData));
    }

    // Wait for all services (but don't fail if some fail)
    await Promise.allSettled(promises);
  }

  async sendToSentry(errorData) {
    try {
      // In a real implementation, you would use the Sentry SDK
      console.log('[ErrorTracking] Would send to Sentry:', errorData.id);
    } catch (error) {
      console.error('[ErrorTracking] Failed to send to Sentry:', error);
    }
  }

  async sendToBugsnag(errorData) {
    try {
      // In a real implementation, you would use the Bugsnag SDK
      console.log('[ErrorTracking] Would send to Bugsnag:', errorData.id);
    } catch (error) {
      console.error('[ErrorTracking] Failed to send to Bugsnag:', error);
    }
  }

  async sendToRollbar(errorData) {
    try {
      // In a real implementation, you would use the Rollbar SDK
      console.log('[ErrorTracking] Would send to Rollbar:', errorData.id);
    } catch (error) {
      console.error('[ErrorTracking] Failed to send to Rollbar:', error);
    }
  }

  async sendToWebhook(errorData) {
    try {
      await axios.post(this.config.webhookUrl, {
        service: 'snatchers-backend',
        error: errorData,
        server: {
          hostname: os.hostname(),
          platform: os.platform(),
          uptime: process.uptime()
        }
      }, {
        timeout: 5000
      });
    } catch (error) {
      console.error('[ErrorTracking] Failed to send to webhook:', error);
    }
  }

  async checkAndSendAlert(errorData) {
    const errorCount = this.errorCounts.get(errorData.id);
    
    // Send alert for critical errors or high frequency errors
    const shouldAlert = 
      errorData.severity === 'critical' ||
      (errorCount.count === 1 && errorData.severity === 'high') ||
      (errorCount.count % 10 === 0 && errorData.severity === 'medium') ||
      (errorCount.count % 50 === 0 && errorData.severity === 'low');

    if (shouldAlert) {
      await this.sendAlert(errorData, errorCount);
    }
  }

  async sendAlert(errorData, errorCount) {
    const promises = [];

    // Send Slack alert
    if (this.config.slackWebhookUrl) {
      promises.push(this.sendSlackAlert(errorData, errorCount));
    }

    // Send email alert
    if (this.config.emailAlerts && this.config.alertEmail) {
      promises.push(this.sendEmailAlert(errorData, errorCount));
    }

    await Promise.allSettled(promises);
  }

  async sendSlackAlert(errorData, errorCount) {
    try {
      const color = {
        low: '#36a64f',
        medium: '#ff9500',
        high: '#ff0000',
        critical: '#8b0000'
      }[errorData.severity] || '#36a64f';

      const payload = {
        text: `🚨 Error Alert - ${errorData.severity.toUpperCase()}`,
        attachments: [{
          color,
          fields: [
            {
              title: 'Error',
              value: errorData.message,
              short: false
            },
            {
              title: 'Occurrences',
              value: errorCount.count.toString(),
              short: true
            },
            {
              title: 'Severity',
              value: errorData.severity.toUpperCase(),
              short: true
            },
            {
              title: 'Environment',
              value: errorData.context.environment,
              short: true
            },
            {
              title: 'Server',
              value: errorData.context.hostname,
              short: true
            },
            {
              title: 'First Seen',
              value: errorCount.firstSeen.toISOString(),
              short: true
            },
            {
              title: 'Last Seen',
              value: errorCount.lastSeen.toISOString(),
              short: true
            }
          ]
        }]
      };

      await axios.post(this.config.slackWebhookUrl, payload, { timeout: 5000 });
    } catch (error) {
      console.error('[ErrorTracking] Failed to send Slack alert:', error);
    }
  }

  async sendEmailAlert(errorData, errorCount) {
    try {
      // In a real implementation, you would integrate with your email service
      console.log('[ErrorTracking] Would send email alert for:', errorData.id);
    } catch (error) {
      console.error('[ErrorTracking] Failed to send email alert:', error);
    }
  }

  // Express middleware for automatic error tracking
  middleware() {
    return (error, req, res, next) => {
      // Track the error
      this.trackError(error, {
        userId: req.user?.id,
        userEmail: req.user?.email,
        path: req.path,
        method: req.method,
        statusCode: res.statusCode,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        body: req.body,
        query: req.query,
        params: req.params
      });

      next(error);
    };
  }

  // Get error statistics
  getErrorStats() {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const stats = {
      total: this.errors.size,
      byTimeframe: {
        lastHour: 0,
        lastDay: 0,
        lastWeek: 0
      },
      bySeverity: {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0
      },
      topErrors: [],
      recentErrors: []
    };

    // Calculate statistics
    for (const [id, error] of this.errors) {
      const errorTime = new Date(error.timestamp);
      
      // Count by timeframe
      if (errorTime > oneHourAgo) stats.byTimeframe.lastHour++;
      if (errorTime > oneDayAgo) stats.byTimeframe.lastDay++;
      if (errorTime > oneWeekAgo) stats.byTimeframe.lastWeek++;
      
      // Count by severity
      stats.bySeverity[error.severity]++;
    }

    // Get top errors by frequency
    const sortedErrors = Array.from(this.errorCounts.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10);

    stats.topErrors = sortedErrors.map(([id, count]) => ({
      id,
      error: this.errors.get(id),
      count: count.count,
      firstSeen: count.firstSeen,
      lastSeen: count.lastSeen
    }));

    // Get recent errors
    const recentErrors = Array.from(this.errors.values())
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 10);

    stats.recentErrors = recentErrors.map(error => ({
      ...error,
      count: this.errorCounts.get(error.id)?.count || 1
    }));

    return stats;
  }

  // Get specific error details
  getError(errorId) {
    const error = this.errors.get(errorId);
    if (!error) return null;

    const count = this.errorCounts.get(errorId);
    
    return {
      ...error,
      occurrences: count?.count || 1,
      firstSeen: count?.firstSeen,
      lastSeen: count?.lastSeen
    };
  }

  // Mark error as resolved
  resolveError(errorId) {
    const error = this.errors.get(errorId);
    if (error) {
      error.resolved = true;
      error.resolvedAt = new Date().toISOString();
      return true;
    }
    return false;
  }

  // Clean up old errors
  cleanupOldErrors() {
    const cutoffTime = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
    let cleanedCount = 0;

    for (const [id, error] of this.errors) {
      if (new Date(error.timestamp) < cutoffTime) {
        this.errors.delete(id);
        this.errorCounts.delete(id);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`[ErrorTracking] Cleaned up ${cleanedCount} old errors`);
    }
  }

  // Export errors for analysis
  exportErrors(startDate, endDate) {
    const errors = [];
    
    for (const [id, error] of this.errors) {
      const errorTime = new Date(error.timestamp);
      
      if (errorTime >= startDate && errorTime <= endDate) {
        const count = this.errorCounts.get(id);
        errors.push({
          ...error,
          occurrences: count?.count || 1,
          firstSeen: count?.firstSeen,
          lastSeen: count?.lastSeen
        });
      }
    }

    return errors.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  // Test error tracking
  testErrorTracking() {
    const testError = new Error('Test error for monitoring');
    testError.name = 'TestError';
    
    this.trackError(testError, {
      test: true,
      severity: 'low',
      path: '/test',
      method: 'GET'
    });

    return 'Test error tracked successfully';
  }
}

export default new ErrorTrackingService();
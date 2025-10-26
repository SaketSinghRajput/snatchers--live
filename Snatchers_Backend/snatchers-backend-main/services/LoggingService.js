import winston from 'winston';
import path from 'path';
import fs from 'fs';
import DailyRotateFile from 'winston-daily-rotate-file';

class LoggingService {
  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.logDir = path.join(process.cwd(), 'logs');
    
    // Ensure log directory exists
    this.ensureLogDirectory();
    
    // Create logger instance
    this.logger = this.createLogger();
    
    // Set up error handling
    this.setupErrorHandling();
  }

  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  createLogger() {
    const logFormat = winston.format.combine(
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
      }),
      winston.format.errors({ stack: true }),
      winston.format.json()
    );

    const consoleFormat = winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({
        format: 'HH:mm:ss'
      }),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let log = `${timestamp} [${level}]: ${message}`;
        
        if (Object.keys(meta).length > 0) {
          log += ` ${JSON.stringify(meta)}`;
        }
        
        return log;
      })
    );

    const transports = [];

    // Console transport
    transports.push(
      new winston.transports.Console({
        level: this.isProduction ? 'info' : 'warn', // Only warn+ in dev to reduce memory
        format: consoleFormat,
        handleExceptions: true,
        handleRejections: true
      })
    );

    // File transports - only in production or if explicitly enabled
    if (this.isProduction || process.env.ENABLE_FILE_LOGGING === 'true') {
      // Combined log file
      transports.push(
        new DailyRotateFile({
          filename: path.join(this.logDir, 'combined-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '14d',
          format: logFormat,
          level: 'info'
        })
      );

      // Error log file
      transports.push(
        new DailyRotateFile({
          filename: path.join(this.logDir, 'error-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '30d',
          format: logFormat,
          level: 'error'
        })
      );

      // Access log file
      transports.push(
        new DailyRotateFile({
          filename: path.join(this.logDir, 'access-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxSize: '50m',
          maxFiles: '7d',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          ),
          level: 'http'
        })
      );

      // Security log file
      transports.push(
        new DailyRotateFile({
          filename: path.join(this.logDir, 'security-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxSize: '10m',
          maxFiles: '90d',
          format: logFormat,
          level: 'warn'
        })
      );
    }

    return winston.createLogger({
      level: this.isProduction ? 'info' : 'debug',
      format: logFormat,
      transports,
      exitOnError: false
    });
  }

  setupErrorHandling() {
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      this.logger.error('Uncaught Exception:', {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      
      // Give logger time to write
      setTimeout(() => {
        process.exit(1);
      }, 1000);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      this.logger.error('Unhandled Rejection:', {
        reason: reason instanceof Error ? reason.message : reason,
        stack: reason instanceof Error ? reason.stack : undefined,
        promise: promise.toString(),
        timestamp: new Date().toISOString()
      });
    });

    // Handle SIGTERM gracefully
    process.on('SIGTERM', () => {
      this.logger.info('SIGTERM received, shutting down gracefully');
      this.close();
    });

    // Handle SIGINT gracefully
    process.on('SIGINT', () => {
      this.logger.info('SIGINT received, shutting down gracefully');
      this.close();
    });
  }

  // Express middleware for request logging
  requestLogger() {
    return (req, res, next) => {
      const startTime = Date.now();
      const originalSend = res.send;

      // Override res.send to capture response
      res.send = function(data) {
        const responseTime = Date.now() - startTime;
        
        // Log the request
        this.logRequest(req, res, responseTime, data);
        
        // Call original send
        originalSend.call(res, data);
      }.bind(this);

      next();
    };
  }

  logRequest(req, res, responseTime, responseData) {
    const logData = {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
      timestamp: new Date().toISOString()
    };

    // Add user info if available
    if (req.user) {
      logData.userId = req.user.id;
      logData.userEmail = req.user.email;
    }

    // Add request body for POST/PUT requests (excluding sensitive data)
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
      const sanitizedBody = this.sanitizeData(req.body);
      if (Object.keys(sanitizedBody).length > 0) {
        logData.requestBody = sanitizedBody;
      }
    }

    // Add response data for errors
    if (res.statusCode >= 400) {
      try {
        const parsedResponse = JSON.parse(responseData);
        logData.error = parsedResponse.error || parsedResponse.message;
      } catch (e) {
        // Response is not JSON
      }
    }

    // Log based on status code
    if (res.statusCode >= 500) {
      this.logger.error('Server Error', logData);
    } else if (res.statusCode >= 400) {
      // Don't log expected 401s for guest users on auth-required endpoints
      const isExpected401 = res.statusCode === 401 && (
        req.path === '/' ||
        req.path === '/api/wishlist' || 
        req.path === '/api/cart' ||
        req.path.startsWith('/api/wishlist/') ||
        req.path.startsWith('/api/cart/') ||
        (req.originalUrl && req.originalUrl.includes('/wishlist')) ||
        (req.originalUrl && req.originalUrl.includes('/cart'))
      );
      
      if (!isExpected401) {
        this.logger.warn('Client Error', logData);
      } else if (process.env.NODE_ENV === 'development') {
        // In dev, log at debug level for visibility
        this.logger.debug('Guest user access (expected)', {
          method: req.method,
          url: req.url || req.originalUrl,
          ip: req.ip
        });
      }
    } else {
      this.logger.http('Request', logData);
    }
  }

  // Sanitize sensitive data from logs
  sanitizeData(data) {
    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'key',
      'authorization',
      'cookie',
      'session',
      'credit_card',
      'cvv',
      'ssn',
      'social_security'
    ];

    const sanitized = { ...data };

    const sanitizeObject = (obj) => {
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          const lowerKey = key.toLowerCase();
          
          if (sensitiveFields.some(field => lowerKey.includes(field))) {
            obj[key] = '[REDACTED]';
          } else if (typeof obj[key] === 'object' && obj[key] !== null) {
            sanitizeObject(obj[key]);
          }
        }
      }
    };

    sanitizeObject(sanitized);
    return sanitized;
  }

  // Security event logging
  logSecurityEvent(event, details = {}) {
    this.logger.warn('Security Event', {
      event,
      ...details,
      timestamp: new Date().toISOString(),
      severity: 'security'
    });
  }

  // Business event logging
  logBusinessEvent(event, details = {}) {
    this.logger.info('Business Event', {
      event,
      ...details,
      timestamp: new Date().toISOString(),
      category: 'business'
    });
  }

  // Performance logging
  logPerformance(operation, duration, details = {}) {
    this.logger.info('Performance', {
      operation,
      duration: `${duration}ms`,
      ...details,
      timestamp: new Date().toISOString(),
      category: 'performance'
    });
  }

  // Database operation logging
  logDatabaseOperation(operation, collection, duration, details = {}) {
    this.logger.debug('Database Operation', {
      operation,
      collection,
      duration: `${duration}ms`,
      ...details,
      timestamp: new Date().toISOString(),
      category: 'database'
    });
  }

  // Payment logging
  logPayment(event, paymentData) {
    const sanitizedData = this.sanitizeData(paymentData);
    
    this.logger.info('Payment Event', {
      event,
      ...sanitizedData,
      timestamp: new Date().toISOString(),
      category: 'payment'
    });
  }

  // User activity logging
  logUserActivity(userId, activity, details = {}) {
    this.logger.info('User Activity', {
      userId,
      activity,
      ...details,
      timestamp: new Date().toISOString(),
      category: 'user_activity'
    });
  }

  // API rate limiting logging
  logRateLimit(ip, endpoint, limit, current) {
    this.logger.warn('Rate Limit', {
      ip,
      endpoint,
      limit,
      current,
      timestamp: new Date().toISOString(),
      category: 'rate_limit'
    });
  }

  // External service logging
  logExternalService(service, operation, duration, success, details = {}) {
    const level = success ? 'info' : 'error';
    
    this.logger.log(level, 'External Service', {
      service,
      operation,
      duration: `${duration}ms`,
      success,
      ...details,
      timestamp: new Date().toISOString(),
      category: 'external_service'
    });
  }

  // Structured logging methods
  debug(message, meta = {}) {
    this.logger.debug(message, { ...meta, timestamp: new Date().toISOString() });
  }

  info(message, meta = {}) {
    this.logger.info(message, { ...meta, timestamp: new Date().toISOString() });
  }

  warn(message, meta = {}) {
    this.logger.warn(message, { ...meta, timestamp: new Date().toISOString() });
  }

  error(message, error = null, meta = {}) {
    const errorMeta = {
      ...meta,
      timestamp: new Date().toISOString()
    };

    if (error) {
      errorMeta.error = error.message;
      errorMeta.stack = error.stack;
    }

    this.logger.error(message, errorMeta);
  }

  // Get log statistics
  async getLogStats() {
    const stats = {
      logDirectory: this.logDir,
      files: [],
      totalSize: 0
    };

    try {
      const files = fs.readdirSync(this.logDir);
      
      for (const file of files) {
        const filePath = path.join(this.logDir, file);
        const stat = fs.statSync(filePath);
        
        stats.files.push({
          name: file,
          size: stat.size,
          modified: stat.mtime,
          created: stat.birthtime
        });
        
        stats.totalSize += stat.size;
      }
    } catch (error) {
      this.error('Failed to get log stats', error);
    }

    return stats;
  }

  // Clean old logs
  async cleanOldLogs(daysToKeep = 30) {
    try {
      const files = fs.readdirSync(this.logDir);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      let deletedCount = 0;
      let deletedSize = 0;

      for (const file of files) {
        const filePath = path.join(this.logDir, file);
        const stat = fs.statSync(filePath);

        if (stat.mtime < cutoffDate) {
          deletedSize += stat.size;
          fs.unlinkSync(filePath);
          deletedCount++;
        }
      }

      this.info('Log cleanup completed', {
        deletedFiles: deletedCount,
        deletedSize: `${(deletedSize / 1024 / 1024).toFixed(2)}MB`,
        daysToKeep
      });

      return { deletedCount, deletedSize };
    } catch (error) {
      this.error('Failed to clean old logs', error);
      throw error;
    }
  }

  // Export logs for analysis
  async exportLogs(startDate, endDate, level = 'info') {
    try {
      const logs = [];
      const files = fs.readdirSync(this.logDir);

      for (const file of files) {
        if (file.includes('combined') && file.endsWith('.log')) {
          const filePath = path.join(this.logDir, file);
          const content = fs.readFileSync(filePath, 'utf8');
          const lines = content.split('\n').filter(line => line.trim());

          for (const line of lines) {
            try {
              const logEntry = JSON.parse(line);
              const logDate = new Date(logEntry.timestamp);

              if (logDate >= startDate && logDate <= endDate) {
                logs.push(logEntry);
              }
            } catch (e) {
              // Skip invalid JSON lines
            }
          }
        }
      }

      return logs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    } catch (error) {
      this.error('Failed to export logs', error);
      throw error;
    }
  }

  // Close logger gracefully
  close() {
    this.logger.info('Closing logging service');
    
    // Close all transports
    this.logger.transports.forEach(transport => {
      if (transport.close) {
        transport.close();
      }
    });
  }
}

export default new LoggingService();
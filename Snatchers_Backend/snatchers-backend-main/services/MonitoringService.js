import os from 'os';
import mongoose from 'mongoose';
import axios from 'axios';

class MonitoringService {
  constructor() {
    this.metrics = {
      requests: 0,
      errors: 0,
      responseTime: [],
      memoryUsage: [],
      cpuUsage: [],
      dbConnections: 0,
      activeUsers: 0
    };
    
    this.alerts = [];
    this.thresholds = {
      responseTime: 5000, // 5 seconds
      errorRate: 0.05, // 5%
      memoryUsage: 0.95, // 95% - increased for dev to reduce noise
      cpuUsage: 0.90, // 90% - increased for dev
      diskUsage: 0.95 // 95%
    };
    
    this.startTime = Date.now();
    this.isProduction = process.env.NODE_ENV === 'production';
    
    // Start monitoring intervals (less frequent in dev)
    this.startMonitoring();
  }

  startMonitoring() {
    // In development, run monitoring less frequently to reduce overhead
    const isDev = process.env.NODE_ENV !== 'production';
    const metricsInterval = isDev ? 120000 : 30000; // 2 min in dev, 30s in prod
    const cleanupInterval = isDev ? 600000 : 300000; // 10 min in dev, 5 min in prod
    const alertInterval = isDev ? 300000 : 60000; // 5 min in dev, 1 min in prod
    
    // Collect system metrics
    this.metricsTimer = setInterval(() => {
      this.collectSystemMetrics();
    }, metricsInterval);

    // Clean old metrics
    this.cleanupTimer = setInterval(() => {
      this.cleanOldMetrics();
    }, cleanupInterval);

    // Send alerts
    this.alertTimer = setInterval(() => {
      this.checkAlerts();
    }, alertInterval);

    console.log('[Monitoring] Service started', isDev ? '(development mode - reduced frequency)' : '');
  }

  // Middleware to track requests
  requestTracker() {
    return (req, res, next) => {
      const startTime = Date.now();
      
      // Track request
      this.metrics.requests++;
      
      // Track response
      res.on('finish', () => {
        const responseTime = Date.now() - startTime;
        this.metrics.responseTime.push({
          time: Date.now(),
          duration: responseTime,
          status: res.statusCode,
          path: req.path,
          method: req.method
        });

        // Track errors (suppress expected 401s for guest users)
        if (res.statusCode >= 400) {
          const isExpected401 = res.statusCode === 401 && 
            (req.path.startsWith('/api/wishlist') || 
             req.path.startsWith('/api/cart') || 
             req.path === '/');
          
          if (!isExpected401) {
            this.metrics.errors++;
            this.logError({
              status: res.statusCode,
              path: req.path,
              method: req.method,
              responseTime,
              userAgent: req.get('User-Agent'),
              ip: req.ip
            });
          }
        }

        // Check response time threshold
        if (responseTime > this.thresholds.responseTime) {
          this.addAlert('high_response_time', {
            responseTime,
            path: req.path,
            threshold: this.thresholds.responseTime
          });
        }
      });

      next();
    };
  }

  // Error tracking middleware
  errorTracker() {
    return (error, req, res, next) => {
      this.metrics.errors++;
      
      this.logError({
        error: error.message,
        stack: error.stack,
        path: req.path,
        method: req.method,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        timestamp: new Date().toISOString()
      });

      // Add critical error alert
      this.addAlert('application_error', {
        error: error.message,
        path: req.path,
        method: req.method
      });

      next(error);
    };
  }

  collectSystemMetrics() {
    try {
      // Memory usage
      const memUsage = process.memoryUsage();
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const memoryUsagePercent = (totalMemory - freeMemory) / totalMemory;

      this.metrics.memoryUsage.push({
        time: Date.now(),
        rss: memUsage.rss,
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
        systemUsage: memoryUsagePercent
      });

      // CPU usage
      const cpuUsage = process.cpuUsage();
      const loadAverage = os.loadavg();
      
      this.metrics.cpuUsage.push({
        time: Date.now(),
        user: cpuUsage.user,
        system: cpuUsage.system,
        loadAverage: loadAverage[0] // 1-minute load average
      });

      // Database connections
      if (mongoose.connection.readyState === 1) {
        this.metrics.dbConnections = mongoose.connections.length;
      }

      // Check thresholds
      if (memoryUsagePercent > this.thresholds.memoryUsage) {
        this.addAlert('high_memory_usage', {
          usage: memoryUsagePercent,
          threshold: this.thresholds.memoryUsage
        });
      }

      if (loadAverage[0] > this.thresholds.cpuUsage * os.cpus().length) {
        this.addAlert('high_cpu_usage', {
          loadAverage: loadAverage[0],
          threshold: this.thresholds.cpuUsage * os.cpus().length
        });
      }

    } catch (error) {
      console.error('[Monitoring] Error collecting system metrics:', error);
    }
  }

  cleanOldMetrics() {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    // Keep only last hour of metrics
    this.metrics.responseTime = this.metrics.responseTime.filter(
      metric => metric.time > oneHourAgo
    );
    
    this.metrics.memoryUsage = this.metrics.memoryUsage.filter(
      metric => metric.time > oneHourAgo
    );
    
    this.metrics.cpuUsage = this.metrics.cpuUsage.filter(
      metric => metric.time > oneHourAgo
    );

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }
  }

  addAlert(type, data) {
    const alert = {
      id: `${type}_${Date.now()}`,
      type,
      data,
      timestamp: new Date().toISOString(),
      severity: this.getAlertSeverity(type),
      resolved: false
    };

    this.alerts.push(alert);
    
    // Log alert
    console.warn(`[Monitoring] Alert: ${type}`, data);
    
    // Send to external monitoring service if configured
    if (this.isProduction) {
      this.sendExternalAlert(alert);
    }
  }

  getAlertSeverity(type) {
    const severityMap = {
      'high_response_time': 'warning',
      'high_memory_usage': 'warning',
      'high_cpu_usage': 'warning',
      'application_error': 'error',
      'database_connection_lost': 'critical',
      'service_unavailable': 'critical'
    };
    
    return severityMap[type] || 'info';
  }

  async sendExternalAlert(alert) {
    try {
      // Send to webhook if configured
      if (process.env.MONITORING_WEBHOOK_URL) {
        await axios.post(process.env.MONITORING_WEBHOOK_URL, {
          service: 'snatchers-backend',
          alert,
          server: {
            hostname: os.hostname(),
            platform: os.platform(),
            uptime: process.uptime()
          }
        });
      }

      // Send to Slack if configured
      if (process.env.SLACK_WEBHOOK_URL) {
        await this.sendSlackAlert(alert);
      }

      // Send email alert if configured
      if (process.env.ALERT_EMAIL && alert.severity === 'critical') {
        await this.sendEmailAlert(alert);
      }

    } catch (error) {
      console.error('[Monitoring] Failed to send external alert:', error);
    }
  }

  async sendSlackAlert(alert) {
    const color = {
      'info': '#36a64f',
      'warning': '#ff9500',
      'error': '#ff0000',
      'critical': '#8b0000'
    }[alert.severity] || '#36a64f';

    const payload = {
      text: `🚨 Snatchers Backend Alert`,
      attachments: [{
        color,
        fields: [
          {
            title: 'Alert Type',
            value: alert.type,
            short: true
          },
          {
            title: 'Severity',
            value: alert.severity.toUpperCase(),
            short: true
          },
          {
            title: 'Server',
            value: os.hostname(),
            short: true
          },
          {
            title: 'Time',
            value: alert.timestamp,
            short: true
          },
          {
            title: 'Details',
            value: JSON.stringify(alert.data, null, 2),
            short: false
          }
        ]
      }]
    };

    await axios.post(process.env.SLACK_WEBHOOK_URL, payload);
  }

  async sendEmailAlert(alert) {
    // This would integrate with the EmailService
    // For now, just log that an email alert should be sent
    console.log('[Monitoring] Critical alert - email notification needed:', alert);
  }

  checkAlerts() {
    // Check error rate
    const recentRequests = this.metrics.responseTime.filter(
      metric => metric.time > Date.now() - 300000 // Last 5 minutes
    );
    
    if (recentRequests.length > 0) {
      const errorCount = recentRequests.filter(metric => metric.status >= 400).length;
      const errorRate = errorCount / recentRequests.length;
      
      if (errorRate > this.thresholds.errorRate) {
        this.addAlert('high_error_rate', {
          errorRate,
          errorCount,
          totalRequests: recentRequests.length,
          threshold: this.thresholds.errorRate
        });
      }
    }

    // Check database connection
    if (mongoose.connection.readyState !== 1) {
      this.addAlert('database_connection_lost', {
        state: mongoose.connection.readyState,
        stateDescription: this.getMongooseStateDescription(mongoose.connection.readyState)
      });
    }
  }

  getMongooseStateDescription(state) {
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };
    return states[state] || 'unknown';
  }

  logError(errorData) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      service: 'snatchers-backend',
      server: os.hostname(),
      ...errorData
    };

    console.error('[Error]', JSON.stringify(logEntry));
    
    // In production, you might want to send this to a logging service
    if (this.isProduction && process.env.LOG_SERVICE_URL) {
      axios.post(process.env.LOG_SERVICE_URL, logEntry).catch(err => {
        console.error('[Monitoring] Failed to send log to external service:', err.message);
      });
    }
  }

  // Get current metrics for dashboard
  getMetrics() {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    
    // Calculate averages for the last hour
    const recentResponseTimes = this.metrics.responseTime.filter(
      metric => metric.time > oneHourAgo
    );
    
    const avgResponseTime = recentResponseTimes.length > 0
      ? recentResponseTimes.reduce((sum, metric) => sum + metric.duration, 0) / recentResponseTimes.length
      : 0;

    const recentMemoryUsage = this.metrics.memoryUsage.filter(
      metric => metric.time > oneHourAgo
    );
    
    const currentMemory = recentMemoryUsage.length > 0
      ? recentMemoryUsage[recentMemoryUsage.length - 1]
      : null;

    const recentCpuUsage = this.metrics.cpuUsage.filter(
      metric => metric.time > oneHourAgo
    );
    
    const currentCpu = recentCpuUsage.length > 0
      ? recentCpuUsage[recentCpuUsage.length - 1]
      : null;

    return {
      uptime: process.uptime(),
      startTime: this.startTime,
      requests: {
        total: this.metrics.requests,
        errors: this.metrics.errors,
        errorRate: this.metrics.requests > 0 ? this.metrics.errors / this.metrics.requests : 0
      },
      performance: {
        avgResponseTime,
        responseTimeData: recentResponseTimes.slice(-50) // Last 50 requests
      },
      system: {
        memory: currentMemory,
        cpu: currentCpu,
        platform: os.platform(),
        hostname: os.hostname(),
        nodeVersion: process.version
      },
      database: {
        state: mongoose.connection.readyState,
        stateDescription: this.getMongooseStateDescription(mongoose.connection.readyState),
        connections: this.metrics.dbConnections
      },
      alerts: {
        total: this.alerts.length,
        unresolved: this.alerts.filter(alert => !alert.resolved).length,
        recent: this.alerts.slice(-10) // Last 10 alerts
      }
    };
  }

  // Get health status
  getHealthStatus() {
    const metrics = this.getMetrics();
    const issues = [];
    
    // Check various health indicators
    if (metrics.database.state !== 1) {
      issues.push('Database connection issue');
    }
    
    if (metrics.requests.errorRate > this.thresholds.errorRate) {
      issues.push('High error rate');
    }
    
    if (metrics.performance.avgResponseTime > this.thresholds.responseTime) {
      issues.push('High response time');
    }
    
    if (metrics.system.memory?.systemUsage > this.thresholds.memoryUsage) {
      issues.push('High memory usage');
    }

    const status = issues.length === 0 ? 'healthy' : 'degraded';
    
    return {
      status,
      issues,
      timestamp: new Date().toISOString(),
      uptime: metrics.uptime,
      version: process.env.npm_package_version || '1.0.0'
    };
  }

  // Performance profiling
  startProfiling(name) {
    return {
      name,
      startTime: process.hrtime.bigint(),
      end: () => {
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - this.startTime) / 1000000; // Convert to milliseconds
        
        console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
        
        return duration;
      }
    };
  }

  // Resolve alert
  resolveAlert(alertId) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = new Date().toISOString();
      console.log(`[Monitoring] Alert resolved: ${alertId}`);
    }
  }

  // Update thresholds
  updateThresholds(newThresholds) {
    this.thresholds = { ...this.thresholds, ...newThresholds };
    console.log('[Monitoring] Thresholds updated:', this.thresholds);
  }
}

export default new MonitoringService();
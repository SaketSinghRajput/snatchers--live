import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import MonitoringService from '../services/MonitoringService.js';
import ProductionConfigService from '../services/ProductionConfigService.js';
import User from '../models/User.js';

const router = express.Router();

// Get system metrics (admin only)
router.get('/metrics', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const metrics = MonitoringService.getMetrics();
    res.json({ success: true, metrics });
  } catch (error) {
    console.error('Metrics error:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

// Get health status
router.get('/health', async (req, res) => {
  try {
    const health = MonitoringService.getHealthStatus();
    const configHealth = await ProductionConfigService.performHealthCheck();
    
    const combinedHealth = {
      ...health,
      services: configHealth.services,
      configuration: configHealth
    };

    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(combinedHealth);
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get alerts (admin only)
router.get('/alerts', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { resolved, severity, limit = 50 } = req.query;
    let alerts = MonitoringService.alerts;

    // Filter by resolved status
    if (resolved !== undefined) {
      const isResolved = resolved === 'true';
      alerts = alerts.filter(alert => alert.resolved === isResolved);
    }

    // Filter by severity
    if (severity) {
      alerts = alerts.filter(alert => alert.severity === severity);
    }

    // Limit results
    alerts = alerts.slice(-parseInt(limit));

    res.json({ success: true, alerts, total: alerts.length });
  } catch (error) {
    console.error('Alerts error:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// Resolve alert (admin only)
router.patch('/alerts/:alertId/resolve', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { alertId } = req.params;
    MonitoringService.resolveAlert(alertId);
    
    res.json({ success: true, message: 'Alert resolved' });
  } catch (error) {
    console.error('Resolve alert error:', error);
    res.status(500).json({ error: 'Failed to resolve alert' });
  }
});

// Update monitoring thresholds (admin only)
router.patch('/thresholds', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const thresholds = req.body;
    MonitoringService.updateThresholds(thresholds);
    
    res.json({ success: true, message: 'Thresholds updated', thresholds });
  } catch (error) {
    console.error('Update thresholds error:', error);
    res.status(500).json({ error: 'Failed to update thresholds' });
  }
});

// Get configuration summary (admin only)
router.get('/config', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const config = ProductionConfigService.getConfigSummary();
    res.json({ success: true, config });
  } catch (error) {
    console.error('Config error:', error);
    res.status(500).json({ error: 'Failed to fetch configuration' });
  }
});

// Export configuration (admin only)
router.get('/config/export', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const config = ProductionConfigService.exportConfig();
    
    // Set headers for file download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="snatchers-config-${Date.now()}.json"`);
    
    res.json(config);
  } catch (error) {
    console.error('Config export error:', error);
    res.status(500).json({ error: 'Failed to export configuration' });
  }
});

// Performance profiling endpoint (admin only)
router.post('/profile/:operation', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { operation } = req.params;
    const profiler = MonitoringService.startProfiling(operation);
    
    // Simulate operation or actual operation based on parameter
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000));
    
    const duration = profiler.end();
    
    res.json({ 
      success: true, 
      operation, 
      duration: `${duration.toFixed(2)}ms` 
    });
  } catch (error) {
    console.error('Profiling error:', error);
    res.status(500).json({ error: 'Failed to profile operation' });
  }
});

// System information (admin only)
router.get('/system', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const os = await import('os');
    const process = await import('process');
    
    const systemInfo = {
      platform: os.platform(),
      arch: os.arch(),
      hostname: os.hostname(),
      uptime: os.uptime(),
      loadavg: os.loadavg(),
      totalmem: os.totalmem(),
      freemem: os.freemem(),
      cpus: os.cpus().length,
      nodeVersion: process.version,
      processUptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      env: process.env.NODE_ENV,
      pid: process.pid
    };

    res.json({ success: true, system: systemInfo });
  } catch (error) {
    console.error('System info error:', error);
    res.status(500).json({ error: 'Failed to fetch system information' });
  }
});

// Logs endpoint (admin only) - last N lines
router.get('/logs', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { lines = 100, type = 'combined' } = req.query;
    const fs = await import('fs');
    const path = await import('path');
    
    let logFile;
    switch (type) {
      case 'error':
        logFile = path.join(process.cwd(), 'logs', 'error.log');
        break;
      case 'access':
        logFile = path.join(process.cwd(), 'logs', 'access.log');
        break;
      default:
        logFile = path.join(process.cwd(), 'logs', 'combined.log');
    }

    if (!fs.existsSync(logFile)) {
      return res.json({ success: true, logs: [], message: 'Log file not found' });
    }

    const { exec } = await import('child_process');
    exec(`tail -n ${lines} "${logFile}"`, (error, stdout, stderr) => {
      if (error) {
        console.error('Log read error:', error);
        return res.status(500).json({ error: 'Failed to read logs' });
      }

      const logs = stdout.split('\n').filter(line => line.trim());
      res.json({ success: true, logs, type, lines: logs.length });
    });
  } catch (error) {
    console.error('Logs error:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// Test alert endpoint (admin only) - for testing monitoring
router.post('/test-alert', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { type = 'test_alert', severity = 'info', data = {} } = req.body;
    
    MonitoringService.addAlert(type, {
      ...data,
      message: 'This is a test alert',
      triggeredBy: user.email,
      timestamp: new Date().toISOString()
    });

    res.json({ success: true, message: 'Test alert created' });
  } catch (error) {
    console.error('Test alert error:', error);
    res.status(500).json({ error: 'Failed to create test alert' });
  }
});

// Monitoring dashboard data (admin only)
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const metrics = MonitoringService.getMetrics();
    const health = MonitoringService.getHealthStatus();
    const configHealth = await ProductionConfigService.performHealthCheck();

    const dashboard = {
      overview: {
        status: health.status,
        uptime: metrics.uptime,
        totalRequests: metrics.requests.total,
        errorRate: metrics.requests.errorRate,
        avgResponseTime: metrics.performance.avgResponseTime
      },
      system: metrics.system,
      database: metrics.database,
      alerts: {
        total: metrics.alerts.total,
        unresolved: metrics.alerts.unresolved,
        recent: metrics.alerts.recent
      },
      services: configHealth.services,
      timestamp: new Date().toISOString()
    };

    res.json({ success: true, dashboard });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

export default router;
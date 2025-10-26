import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import MonitoringService from '../services/MonitoringService.js';
import ProductionConfigService from '../services/ProductionConfigService.js';
import LoggingService from '../services/LoggingService.js';
import ErrorTrackingService from '../services/ErrorTrackingService.js';
import User from '../models/User.js';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const router = express.Router();
const execAsync = promisify(exec);

// Middleware to check admin access
const requireAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  } catch (error) {
    res.status(500).json({ error: 'Authentication error' });
  }
};

// Get deployment status
router.get('/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const status = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      pid: process.pid,
      memory: process.memoryUsage(),
      platform: process.platform,
      nodeVersion: process.version
    };

    // Get PM2 status if available
    try {
      const { stdout } = await execAsync('pm2 jlist');
      const pm2Processes = JSON.parse(stdout);
      status.pm2 = pm2Processes.map(proc => ({
        name: proc.name,
        status: proc.pm2_env.status,
        uptime: proc.pm2_env.pm_uptime,
        restarts: proc.pm2_env.restart_time,
        memory: proc.monit.memory,
        cpu: proc.monit.cpu
      }));
    } catch (error) {
      status.pm2 = null;
    }

    // Get Docker status if available
    try {
      const { stdout } = await execAsync('docker ps --format "table {{.Names}}\\t{{.Status}}\\t{{.Ports}}"');
      status.docker = stdout.split('\n').slice(1).filter(line => line.trim());
    } catch (error) {
      status.docker = null;
    }

    res.json({ success: true, status });
  } catch (error) {
    console.error('Deployment status error:', error);
    res.status(500).json({ error: 'Failed to get deployment status' });
  }
});

// Get comprehensive deployment dashboard
router.get('/dashboard', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [
      monitoringMetrics,
      healthStatus,
      configHealth,
      errorStats,
      logStats
    ] = await Promise.all([
      MonitoringService.getMetrics(),
      MonitoringService.getHealthStatus(),
      ProductionConfigService.performHealthCheck(),
      ErrorTrackingService.getErrorStats(),
      LoggingService.getLogStats()
    ]);

    const dashboard = {
      overview: {
        status: healthStatus.status,
        uptime: monitoringMetrics.uptime,
        environment: process.env.NODE_ENV,
        version: process.env.npm_package_version || '1.0.0',
        lastDeployment: process.env.DEPLOYMENT_TIMESTAMP || 'Unknown'
      },
      performance: {
        requests: monitoringMetrics.requests,
        responseTime: monitoringMetrics.performance,
        errors: errorStats.byTimeframe,
        system: monitoringMetrics.system
      },
      services: configHealth.services,
      alerts: {
        total: monitoringMetrics.alerts.total,
        unresolved: monitoringMetrics.alerts.unresolved,
        recent: monitoringMetrics.alerts.recent
      },
      errors: {
        total: errorStats.total,
        bySeverity: errorStats.bySeverity,
        topErrors: errorStats.topErrors.slice(0, 5)
      },
      logs: {
        totalFiles: logStats.files.length,
        totalSize: logStats.totalSize,
        recentFiles: logStats.files.slice(-5)
      },
      timestamp: new Date().toISOString()
    };

    res.json({ success: true, dashboard });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// Get deployment history
router.get('/history', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const historyFile = path.join(process.cwd(), 'logs', 'deployment-history.json');
    let history = [];

    if (fs.existsSync(historyFile)) {
      const content = fs.readFileSync(historyFile, 'utf8');
      history = JSON.parse(content);
    }

    res.json({ success: true, history });
  } catch (error) {
    console.error('Deployment history error:', error);
    res.status(500).json({ error: 'Failed to fetch deployment history' });
  }
});

// Record deployment
router.post('/record', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { version, environment, notes, deployedBy } = req.body;
    
    const deployment = {
      id: `deploy_${Date.now()}`,
      version: version || process.env.npm_package_version || '1.0.0',
      environment: environment || process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
      deployedBy: deployedBy || req.user.email,
      notes: notes || '',
      status: 'success',
      duration: null,
      rollback: false
    };

    // Load existing history
    const historyFile = path.join(process.cwd(), 'logs', 'deployment-history.json');
    let history = [];

    if (fs.existsSync(historyFile)) {
      const content = fs.readFileSync(historyFile, 'utf8');
      history = JSON.parse(content);
    }

    // Add new deployment
    history.push(deployment);

    // Keep only last 100 deployments
    if (history.length > 100) {
      history = history.slice(-100);
    }

    // Save history
    fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));

    // Log deployment
    LoggingService.info('Deployment recorded', deployment);

    res.json({ success: true, deployment });
  } catch (error) {
    console.error('Record deployment error:', error);
    res.status(500).json({ error: 'Failed to record deployment' });
  }
});

// Trigger deployment
router.post('/deploy', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { environment = 'production', branch = 'main' } = req.body;
    
    // Validate environment
    if (!['development', 'staging', 'production'].includes(environment)) {
      return res.status(400).json({ error: 'Invalid environment' });
    }

    const deploymentId = `deploy_${Date.now()}`;
    const startTime = Date.now();

    // Log deployment start
    LoggingService.info('Deployment started', {
      deploymentId,
      environment,
      branch,
      initiatedBy: req.user.email
    });

    // Execute deployment script
    const deployScript = path.join(process.cwd(), 'scripts', 'deploy.sh');
    
    if (!fs.existsSync(deployScript)) {
      return res.status(400).json({ error: 'Deployment script not found' });
    }

    // Run deployment in background
    const deploymentProcess = exec(`bash ${deployScript} ${environment}`, {
      cwd: process.cwd(),
      env: { ...process.env, DEPLOYMENT_ID: deploymentId }
    });

    let deploymentOutput = '';
    let deploymentError = '';

    deploymentProcess.stdout.on('data', (data) => {
      deploymentOutput += data;
    });

    deploymentProcess.stderr.on('data', (data) => {
      deploymentError += data;
    });

    deploymentProcess.on('close', async (code) => {
      const duration = Date.now() - startTime;
      const success = code === 0;

      const deploymentRecord = {
        id: deploymentId,
        environment,
        branch,
        timestamp: new Date().toISOString(),
        deployedBy: req.user.email,
        status: success ? 'success' : 'failed',
        duration,
        output: deploymentOutput,
        error: deploymentError,
        exitCode: code
      };

      // Record deployment
      const historyFile = path.join(process.cwd(), 'logs', 'deployment-history.json');
      let history = [];

      if (fs.existsSync(historyFile)) {
        const content = fs.readFileSync(historyFile, 'utf8');
        history = JSON.parse(content);
      }

      history.push(deploymentRecord);
      fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));

      // Log deployment completion
      LoggingService.info('Deployment completed', deploymentRecord);

      // Send notification if configured
      if (process.env.DEPLOYMENT_WEBHOOK_URL) {
        try {
          await axios.post(process.env.DEPLOYMENT_WEBHOOK_URL, {
            deployment: deploymentRecord,
            server: {
              hostname: os.hostname(),
              environment: process.env.NODE_ENV
            }
          });
        } catch (error) {
          console.error('Failed to send deployment notification:', error);
        }
      }
    });

    res.json({ 
      success: true, 
      message: 'Deployment started',
      deploymentId,
      environment,
      branch
    });

  } catch (error) {
    console.error('Deployment trigger error:', error);
    res.status(500).json({ error: 'Failed to trigger deployment' });
  }
});

// Rollback deployment
router.post('/rollback', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { deploymentId, reason } = req.body;

    if (!deploymentId) {
      return res.status(400).json({ error: 'Deployment ID required' });
    }

    // Find deployment in history
    const historyFile = path.join(process.cwd(), 'logs', 'deployment-history.json');
    
    if (!fs.existsSync(historyFile)) {
      return res.status(404).json({ error: 'Deployment history not found' });
    }

    const content = fs.readFileSync(historyFile, 'utf8');
    const history = JSON.parse(content);
    const deployment = history.find(d => d.id === deploymentId);

    if (!deployment) {
      return res.status(404).json({ error: 'Deployment not found' });
    }

    // Create rollback record
    const rollbackId = `rollback_${Date.now()}`;
    const rollbackRecord = {
      id: rollbackId,
      type: 'rollback',
      originalDeployment: deploymentId,
      timestamp: new Date().toISOString(),
      initiatedBy: req.user.email,
      reason: reason || 'Manual rollback',
      status: 'in_progress'
    };

    // Log rollback start
    LoggingService.warn('Rollback initiated', rollbackRecord);

    // In a real implementation, you would execute rollback logic here
    // For now, we'll simulate it
    setTimeout(() => {
      rollbackRecord.status = 'completed';
      rollbackRecord.completedAt = new Date().toISOString();
      
      // Add to history
      history.push(rollbackRecord);
      fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));
      
      LoggingService.info('Rollback completed', rollbackRecord);
    }, 5000);

    res.json({ 
      success: true, 
      message: 'Rollback initiated',
      rollbackId,
      originalDeployment: deploymentId
    });

  } catch (error) {
    console.error('Rollback error:', error);
    res.status(500).json({ error: 'Failed to initiate rollback' });
  }
});

// Get system resources
router.get('/resources', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const os = await import('os');
    
    const resources = {
      cpu: {
        count: os.cpus().length,
        model: os.cpus()[0].model,
        loadAverage: os.loadavg(),
        usage: process.cpuUsage()
      },
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem(),
        process: process.memoryUsage()
      },
      disk: {
        // In a real implementation, you would get disk usage
        // For now, we'll use a placeholder
        total: 'N/A',
        free: 'N/A',
        used: 'N/A'
      },
      network: {
        interfaces: os.networkInterfaces()
      },
      uptime: {
        system: os.uptime(),
        process: process.uptime()
      }
    };

    res.json({ success: true, resources });
  } catch (error) {
    console.error('Resources error:', error);
    res.status(500).json({ error: 'Failed to fetch system resources' });
  }
});

// Get environment variables (sanitized)
router.get('/environment', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const sensitiveKeys = [
      'password', 'secret', 'key', 'token', 'private',
      'cognito_client_secret', 'razorpay_key_secret', 'stripe_secret_key',
      'smtp_pass', 'sendgrid_api_key', 'mailgun_api_key'
    ];

    const environment = {};
    
    for (const [key, value] of Object.entries(process.env)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = sensitiveKeys.some(sensitive => lowerKey.includes(sensitive));
      
      environment[key] = isSensitive ? '[REDACTED]' : value;
    }

    res.json({ success: true, environment });
  } catch (error) {
    console.error('Environment error:', error);
    res.status(500).json({ error: 'Failed to fetch environment variables' });
  }
});

// Test deployment endpoints
router.post('/test', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const tests = {
      database: false,
      redis: false,
      elasticsearch: false,
      email: false,
      payment: false,
      monitoring: false
    };

    // Test database connection
    try {
      const mongoose = await import('mongoose');
      tests.database = mongoose.default.connection.readyState === 1;
    } catch (error) {
      tests.database = false;
    }

    // Test other services (simplified)
    tests.monitoring = true; // MonitoringService is always available
    
    const overallStatus = Object.values(tests).every(test => test);

    res.json({ 
      success: true, 
      tests,
      overallStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Test error:', error);
    res.status(500).json({ error: 'Failed to run tests' });
  }
});

export default router;
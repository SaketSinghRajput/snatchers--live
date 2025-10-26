#!/usr/bin/env node

/**
 * Production Deployment Validation Script
 * Validates that all production requirements are met before deployment
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ProductionValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.checks = [];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const colors = {
      info: '\x1b[36m',    // Cyan
      success: '\x1b[32m', // Green
      warning: '\x1b[33m', // Yellow
      error: '\x1b[31m',   // Red
      reset: '\x1b[0m'     // Reset
    };

    console.log(`${colors[type]}[${timestamp}] ${message}${colors.reset}`);
  }

  addError(message) {
    this.errors.push(message);
    this.log(`❌ ${message}`, 'error');
  }

  addWarning(message) {
    this.warnings.push(message);
    this.log(`⚠️  ${message}`, 'warning');
  }

  addSuccess(message) {
    this.log(`✅ ${message}`, 'success');
  }

  // Check environment variables
  validateEnvironmentVariables() {
    this.log('Validating environment variables...', 'info');

    const requiredVars = [
      'NODE_ENV',
      'PORT',
      'MONGO_URI',
      'SESSION_SECRET',
      'FRONTEND_URL',
      'COGNITO_USER_POOL_ID',
      'COGNITO_CLIENT_ID',
      'COGNITO_CLIENT_SECRET',
      'COGNITO_REGION'
    ];

    const recommendedVars = [
      'RAZORPAY_KEY_ID',
      'RAZORPAY_KEY_SECRET',
      'STRIPE_SECRET_KEY',
      'SENDGRID_API_KEY',
      'CLOUDINARY_CLOUD_NAME',
      'ELASTICSEARCH_NODE',
      'MONITORING_WEBHOOK_URL',
      'SLACK_WEBHOOK_URL'
    ];

    // Check required variables
    requiredVars.forEach(varName => {
      if (!process.env[varName]) {
        this.addError(`Required environment variable ${varName} is not set`);
      } else {
        this.addSuccess(`Required variable ${varName} is set`);
      }
    });

    // Check recommended variables
    recommendedVars.forEach(varName => {
      if (!process.env[varName]) {
        this.addWarning(`Recommended environment variable ${varName} is not set`);
      } else {
        this.addSuccess(`Recommended variable ${varName} is set`);
      }
    });

    // Validate NODE_ENV
    if (process.env.NODE_ENV !== 'production') {
      this.addError('NODE_ENV must be set to "production" for production deployment');
    }

    // Validate session secret strength
    if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length < 32) {
      this.addError('SESSION_SECRET should be at least 32 characters long');
    }

    // Validate MongoDB URI format
    if (process.env.MONGO_URI && !process.env.MONGO_URI.startsWith('mongodb')) {
      this.addError('MONGO_URI appears to be invalid (should start with mongodb:// or mongodb+srv://)');
    }
  }

  // Check file system requirements
  validateFileSystem() {
    this.log('Validating file system...', 'info');

    const requiredFiles = [
      'package.json',
      'server.js',
      'ecosystem.config.js',
      'docker-compose.yml',
      'Dockerfile',
      'nginx.conf'
    ];

    const requiredDirectories = [
      'routes',
      'models',
      'services',
      'middleware',
      'scripts'
    ];

    // Check required files
    requiredFiles.forEach(file => {
      const filePath = path.join(process.cwd(), file);
      if (fs.existsSync(filePath)) {
        this.addSuccess(`Required file ${file} exists`);
      } else {
        this.addError(`Required file ${file} is missing`);
      }
    });

    // Check required directories
    requiredDirectories.forEach(dir => {
      const dirPath = path.join(process.cwd(), dir);
      if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
        this.addSuccess(`Required directory ${dir} exists`);
      } else {
        this.addError(`Required directory ${dir} is missing`);
      }
    });

    // Check log directory
    const logDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logDir)) {
      try {
        fs.mkdirSync(logDir, { recursive: true });
        this.addSuccess('Created logs directory');
      } catch (error) {
        this.addError(`Failed to create logs directory: ${error.message}`);
      }
    } else {
      this.addSuccess('Logs directory exists');
    }

    // Check uploads directory
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      try {
        fs.mkdirSync(uploadsDir, { recursive: true });
        this.addSuccess('Created uploads directory');
      } catch (error) {
        this.addError(`Failed to create uploads directory: ${error.message}`);
      }
    } else {
      this.addSuccess('Uploads directory exists');
    }
  }

  // Validate package.json and dependencies
  validatePackageJson() {
    this.log('Validating package.json...', 'info');

    try {
      const packagePath = path.join(process.cwd(), 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

      // Check required fields
      const requiredFields = ['name', 'version', 'main', 'scripts', 'dependencies'];
      requiredFields.forEach(field => {
        if (packageJson[field]) {
          this.addSuccess(`package.json has required field: ${field}`);
        } else {
          this.addError(`package.json missing required field: ${field}`);
        }
      });

      // Check required scripts
      const requiredScripts = ['start', 'test'];
      if (packageJson.scripts) {
        requiredScripts.forEach(script => {
          if (packageJson.scripts[script]) {
            this.addSuccess(`package.json has required script: ${script}`);
          } else {
            this.addError(`package.json missing required script: ${script}`);
          }
        });
      }

      // Check for production dependencies
      const productionDeps = [
        'express',
        'mongoose',
        'dotenv',
        'cors',
        'helmet',
        'express-rate-limit',
        'winston',
        'axios'
      ];

      if (packageJson.dependencies) {
        productionDeps.forEach(dep => {
          if (packageJson.dependencies[dep]) {
            this.addSuccess(`Required dependency ${dep} is present`);
          } else {
            this.addError(`Required dependency ${dep} is missing`);
          }
        });
      }

    } catch (error) {
      this.addError(`Failed to validate package.json: ${error.message}`);
    }
  }

  // Check security configurations
  validateSecurity() {
    this.log('Validating security configurations...', 'info');

    // Check for security middleware files
    const securityFile = path.join(process.cwd(), 'middleware', 'security.js');
    if (fs.existsSync(securityFile)) {
      this.addSuccess('Security middleware file exists');
    } else {
      this.addError('Security middleware file is missing');
    }

    // Check SSL configuration
    if (process.env.SSL_CERT_PATH && process.env.SSL_KEY_PATH) {
      if (fs.existsSync(process.env.SSL_CERT_PATH) && fs.existsSync(process.env.SSL_KEY_PATH)) {
        this.addSuccess('SSL certificates are configured and exist');
      } else {
        this.addError('SSL certificate paths are set but files do not exist');
      }
    } else {
      this.addWarning('SSL certificates are not configured');
    }

    // Check CORS configuration
    if (process.env.CORS_ALLOWED_ORIGINS) {
      this.addSuccess('CORS allowed origins are configured');
    } else {
      this.addWarning('CORS allowed origins are not explicitly configured');
    }

    // Check rate limiting
    if (process.env.RATE_LIMIT_WINDOW_MS && process.env.RATE_LIMIT_MAX_REQUESTS) {
      this.addSuccess('Rate limiting is configured');
    } else {
      this.addWarning('Rate limiting configuration is not complete');
    }
  }

  // Test database connectivity
  async validateDatabase() {
    this.log('Validating database connectivity...', 'info');

    if (!process.env.MONGO_URI) {
      this.addError('Cannot test database - MONGO_URI not set');
      return;
    }

    try {
      const mongoose = await import('mongoose');
      
      // Set a short timeout for the test
      const connection = await mongoose.default.connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000
      });

      this.addSuccess('Database connection successful');
      
      // Test basic operations
      const testCollection = connection.connection.db.collection('_deployment_test');
      await testCollection.insertOne({ test: true, timestamp: new Date() });
      await testCollection.deleteOne({ test: true });
      
      this.addSuccess('Database read/write operations successful');
      
      await mongoose.default.disconnect();
    } catch (error) {
      this.addError(`Database connection failed: ${error.message}`);
    }
  }

  // Test external services
  async validateExternalServices() {
    this.log('Validating external services...', 'info');

    // Test Elasticsearch if configured
    if (process.env.ELASTICSEARCH_NODE) {
      try {
        const response = await axios.get(`${process.env.ELASTICSEARCH_NODE}/_cluster/health`, {
          timeout: 5000
        });
        
        if (response.status === 200) {
          this.addSuccess('Elasticsearch connection successful');
        } else {
          this.addWarning('Elasticsearch responded but may not be healthy');
        }
      } catch (error) {
        this.addWarning(`Elasticsearch connection failed: ${error.message}`);
      }
    }

    // Test webhook endpoints if configured
    if (process.env.MONITORING_WEBHOOK_URL) {
      try {
        await axios.post(process.env.MONITORING_WEBHOOK_URL, {
          test: true,
          timestamp: new Date().toISOString(),
          source: 'production-validator'
        }, { timeout: 5000 });
        
        this.addSuccess('Monitoring webhook is accessible');
      } catch (error) {
        this.addWarning(`Monitoring webhook test failed: ${error.message}`);
      }
    }

    // Test Slack webhook if configured
    if (process.env.SLACK_WEBHOOK_URL) {
      try {
        await axios.post(process.env.SLACK_WEBHOOK_URL, {
          text: '🧪 Production deployment validation test',
          username: 'Deployment Validator'
        }, { timeout: 5000 });
        
        this.addSuccess('Slack webhook is accessible');
      } catch (error) {
        this.addWarning(`Slack webhook test failed: ${error.message}`);
      }
    }
  }

  // Validate monitoring setup
  validateMonitoring() {
    this.log('Validating monitoring setup...', 'info');

    const monitoringFiles = [
      'services/MonitoringService.js',
      'services/LoggingService.js',
      'services/ErrorTrackingService.js',
      'routes/monitoring.js',
      'routes/deployment.js'
    ];

    monitoringFiles.forEach(file => {
      const filePath = path.join(process.cwd(), file);
      if (fs.existsSync(filePath)) {
        this.addSuccess(`Monitoring file ${file} exists`);
      } else {
        this.addError(`Monitoring file ${file} is missing`);
      }
    });

    // Check Prometheus configuration
    const prometheusConfig = path.join(process.cwd(), 'prometheus.yml');
    if (fs.existsSync(prometheusConfig)) {
      this.addSuccess('Prometheus configuration exists');
    } else {
      this.addWarning('Prometheus configuration is missing');
    }

    // Check alert rules
    const alertRules = path.join(process.cwd(), 'alert_rules.yml');
    if (fs.existsSync(alertRules)) {
      this.addSuccess('Alert rules configuration exists');
    } else {
      this.addWarning('Alert rules configuration is missing');
    }
  }

  // Validate deployment scripts
  validateDeploymentScripts() {
    this.log('Validating deployment scripts...', 'info');

    const deploymentFiles = [
      'scripts/deploy.sh',
      'scripts/production-setup.sh',
      'scripts/backup.js',
      'ecosystem.config.js',
      'docker-compose.yml',
      'Dockerfile',
      'nginx.conf'
    ];

    deploymentFiles.forEach(file => {
      const filePath = path.join(process.cwd(), file);
      if (fs.existsSync(filePath)) {
        this.addSuccess(`Deployment file ${file} exists`);
        
        // Check if shell scripts are executable
        if (file.endsWith('.sh')) {
          try {
            const stats = fs.statSync(filePath);
            if (stats.mode & parseInt('111', 8)) {
              this.addSuccess(`Script ${file} is executable`);
            } else {
              this.addWarning(`Script ${file} is not executable`);
            }
          } catch (error) {
            this.addWarning(`Could not check permissions for ${file}`);
          }
        }
      } else {
        this.addError(`Deployment file ${file} is missing`);
      }
    });
  }

  // Run all validations
  async runAllValidations() {
    this.log('Starting production deployment validation...', 'info');
    
    const startTime = Date.now();

    try {
      // Run synchronous validations
      this.validateEnvironmentVariables();
      this.validateFileSystem();
      this.validatePackageJson();
      this.validateSecurity();
      this.validateMonitoring();
      this.validateDeploymentScripts();

      // Run asynchronous validations
      await this.validateDatabase();
      await this.validateExternalServices();

      const duration = Date.now() - startTime;
      
      // Generate summary
      this.log('\n' + '='.repeat(60), 'info');
      this.log('PRODUCTION VALIDATION SUMMARY', 'info');
      this.log('='.repeat(60), 'info');
      
      if (this.errors.length === 0) {
        this.log(`✅ All critical validations passed!`, 'success');
      } else {
        this.log(`❌ ${this.errors.length} critical error(s) found:`, 'error');
        this.errors.forEach(error => this.log(`   • ${error}`, 'error'));
      }

      if (this.warnings.length > 0) {
        this.log(`⚠️  ${this.warnings.length} warning(s) found:`, 'warning');
        this.warnings.forEach(warning => this.log(`   • ${warning}`, 'warning'));
      }

      this.log(`\nValidation completed in ${duration}ms`, 'info');
      
      // Exit with appropriate code
      if (this.errors.length > 0) {
        this.log('\n❌ Production deployment validation FAILED', 'error');
        this.log('Please fix all critical errors before deploying to production.', 'error');
        process.exit(1);
      } else {
        this.log('\n✅ Production deployment validation PASSED', 'success');
        this.log('System is ready for production deployment!', 'success');
        
        if (this.warnings.length > 0) {
          this.log('Consider addressing warnings for optimal production setup.', 'warning');
        }
        
        process.exit(0);
      }

    } catch (error) {
      this.log(`\n❌ Validation failed with error: ${error.message}`, 'error');
      process.exit(1);
    }
  }
}

// Run validation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new ProductionValidator();
  validator.runAllValidations().catch(error => {
    console.error('Validation error:', error);
    process.exit(1);
  });
}

export default ProductionValidator;
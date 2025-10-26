import fs from 'fs';
import path from 'path';

class ProductionConfigService {
  constructor() {
    this.config = {
      environment: process.env.NODE_ENV || 'development',
      port: process.env.PORT || 5000,
      isProduction: process.env.NODE_ENV === 'production',
      isDevelopment: process.env.NODE_ENV === 'development',
      isTest: process.env.NODE_ENV === 'test'
    };
    
    this.requiredEnvVars = {
      production: [
        'MONGO_URI',
        'COGNITO_USER_POOL_ID',
        'COGNITO_CLIENT_ID',
        'COGNITO_CLIENT_SECRET',
        'COGNITO_REGION',
        'FRONTEND_URL',
        'SESSION_SECRET'
      ],
      development: [
        'MONGO_URI'
      ]
    };
    
    this.validateConfiguration();
  }

  validateConfiguration() {
    const environment = this.config.environment;
    const required = this.requiredEnvVars[environment] || [];
    const missing = [];
    
    required.forEach(envVar => {
      if (!process.env[envVar]) {
        missing.push(envVar);
      }
    });
    
    if (missing.length > 0) {
      const message = `Missing required environment variables for ${environment}: ${missing.join(', ')}`;
      console.error(`❌ Configuration Error: ${message}`);
      
      if (this.config.isProduction) {
        console.error('Exiting due to missing production configuration');
        process.exit(1);
      } else {
        console.warn('⚠️ Development mode - some features may not work properly');
      }
    } else {
      console.log(`✅ Configuration validated for ${environment} environment`);
    }
  }

  getSecurityConfig() {
    return {
      // CORS settings
      cors: {
        origin: this.config.isProduction 
          ? [
              'https://snatchers.in',
              'https://www.snatchers.in'
            ]
          : [
              'http://localhost:3000',
              'http://localhost:3001',
              'https://snatchers.in',
              'https://www.snatchers.in'
            ],
        credentials: true,
        optionsSuccessStatus: 200
      },
      
      // Session settings
      session: {
        secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
        resave: false,
        saveUninitialized: false,
        cookie: {
          secure: this.config.isProduction,
          httpOnly: true,
          maxAge: 24 * 60 * 60 * 1000, // 24 hours
          sameSite: this.config.isProduction ? 'none' : 'lax'
        }
      },
      
      // Rate limiting
      rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: this.config.isProduction ? 100 : 1000, // Stricter in production
        message: 'Too many requests from this IP, please try again later.',
        standardHeaders: true,
        legacyHeaders: false
      },
      
      // Helmet security headers
      helmet: {
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:", "http:"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://www.googletagmanager.com", "https://connect.facebook.net"],
            connectSrc: ["'self'", "https://api.razorpay.com", "https://api.stripe.com"]
          }
        },
        crossOriginEmbedderPolicy: false // Allow third-party embeds
      }
    };
  }

  getDatabaseConfig() {
    return {
      uri: process.env.MONGO_URI,
      options: {
        maxPoolSize: this.config.isProduction ? 10 : 5,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        bufferMaxEntries: 0,
        bufferCommands: false,
        retryWrites: true,
        retryReads: true
      }
    };
  }

  getLoggingConfig() {
    return {
      level: this.config.isProduction ? 'info' : 'debug',
      format: this.config.isProduction ? 'json' : 'simple',
      destinations: {
        console: true,
        file: this.config.isProduction,
        external: this.config.isProduction && !!process.env.LOG_SERVICE_URL
      },
      logFile: path.join(process.cwd(), 'logs', 'app.log'),
      errorFile: path.join(process.cwd(), 'logs', 'error.log')
    };
  }

  getMonitoringConfig() {
    return {
      enabled: true,
      metricsInterval: 30000, // 30 seconds
      alertsEnabled: this.config.isProduction,
      webhookUrl: process.env.MONITORING_WEBHOOK_URL,
      slackWebhookUrl: process.env.SLACK_WEBHOOK_URL,
      alertEmail: process.env.ALERT_EMAIL,
      thresholds: {
        responseTime: this.config.isProduction ? 3000 : 5000,
        errorRate: 0.05,
        memoryUsage: 0.85,
        cpuUsage: 0.80,
        diskUsage: 0.90
      }
    };
  }

  getPaymentConfig() {
    return {
      razorpay: {
        enabled: !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
        keyId: process.env.RAZORPAY_KEY_ID,
        keySecret: process.env.RAZORPAY_KEY_SECRET,
        webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET
      },
      stripe: {
        enabled: !!process.env.STRIPE_SECRET_KEY,
        secretKey: process.env.STRIPE_SECRET_KEY,
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
        apiVersion: '2023-10-16'
      },
      paypal: {
        enabled: !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET),
        clientId: process.env.PAYPAL_CLIENT_ID,
        clientSecret: process.env.PAYPAL_CLIENT_SECRET,
        environment: process.env.PAYPAL_ENVIRONMENT || 'sandbox'
      }
    };
  }

  getEmailConfig() {
    return {
      smtp: {
        enabled: !!(process.env.SMTP_HOST && process.env.SMTP_USER),
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      sendgrid: {
        enabled: !!process.env.SENDGRID_API_KEY,
        apiKey: process.env.SENDGRID_API_KEY
      },
      mailgun: {
        enabled: !!(process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN),
        apiKey: process.env.MAILGUN_API_KEY,
        domain: process.env.MAILGUN_DOMAIN
      },
      fromEmail: process.env.FROM_EMAIL || 'noreply@snatchers.in',
      testEmail: process.env.TEST_EMAIL
    };
  }

  getAnalyticsConfig() {
    return {
      googleAnalytics: {
        enabled: !!(process.env.GA_MEASUREMENT_ID && process.env.GA_API_SECRET),
        measurementId: process.env.GA_MEASUREMENT_ID,
        apiSecret: process.env.GA_API_SECRET
      },
      facebookPixel: {
        enabled: !!(process.env.FB_PIXEL_ID && process.env.FB_ACCESS_TOKEN),
        pixelId: process.env.FB_PIXEL_ID,
        accessToken: process.env.FB_ACCESS_TOKEN
      },
      googleAds: {
        enabled: !!(process.env.GOOGLE_ADS_CONVERSION_ID && process.env.GOOGLE_ADS_CONVERSION_LABEL),
        conversionId: process.env.GOOGLE_ADS_CONVERSION_ID,
        conversionLabel: process.env.GOOGLE_ADS_CONVERSION_LABEL
      }
    };
  }

  getSearchConfig() {
    return {
      elasticsearch: {
        enabled: !!process.env.ELASTICSEARCH_NODE,
        node: process.env.ELASTICSEARCH_NODE || 'http://localhost:9200',
        username: process.env.ELASTICSEARCH_USERNAME,
        password: process.env.ELASTICSEARCH_PASSWORD,
        maxRetries: 3,
        requestTimeout: 30000
      },
      fallback: {
        enabled: true,
        engine: 'fuse' // Fuse.js for client-side search fallback
      }
    };
  }

  getStorageConfig() {
    return {
      cloudinary: {
        enabled: !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY),
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        apiKey: process.env.CLOUDINARY_API_KEY,
        apiSecret: process.env.CLOUDINARY_API_SECRET
      },
      local: {
        enabled: !this.config.isProduction,
        uploadPath: path.join(process.cwd(), 'uploads'),
        maxFileSize: 10 * 1024 * 1024 // 10MB
      }
    };
  }

  // Health check for all services
  async performHealthCheck() {
    const results = {
      timestamp: new Date().toISOString(),
      environment: this.config.environment,
      status: 'healthy',
      services: {}
    };

    // Check database
    try {
      const mongoose = await import('mongoose');
      results.services.database = {
        status: mongoose.default.connection.readyState === 1 ? 'healthy' : 'unhealthy',
        state: mongoose.default.connection.readyState
      };
    } catch (error) {
      results.services.database = {
        status: 'error',
        error: error.message
      };
    }

    // Check payment gateways
    const paymentConfig = this.getPaymentConfig();
    results.services.payments = {
      razorpay: paymentConfig.razorpay.enabled ? 'configured' : 'disabled',
      stripe: paymentConfig.stripe.enabled ? 'configured' : 'disabled',
      paypal: paymentConfig.paypal.enabled ? 'configured' : 'disabled'
    };

    // Check email services
    const emailConfig = this.getEmailConfig();
    results.services.email = {
      smtp: emailConfig.smtp.enabled ? 'configured' : 'disabled',
      sendgrid: emailConfig.sendgrid.enabled ? 'configured' : 'disabled',
      mailgun: emailConfig.mailgun.enabled ? 'configured' : 'disabled'
    };

    // Check analytics
    const analyticsConfig = this.getAnalyticsConfig();
    results.services.analytics = {
      googleAnalytics: analyticsConfig.googleAnalytics.enabled ? 'configured' : 'disabled',
      facebookPixel: analyticsConfig.facebookPixel.enabled ? 'configured' : 'disabled',
      googleAds: analyticsConfig.googleAds.enabled ? 'configured' : 'disabled'
    };

    // Check search
    const searchConfig = this.getSearchConfig();
    results.services.search = {
      elasticsearch: searchConfig.elasticsearch.enabled ? 'configured' : 'disabled',
      fallback: searchConfig.fallback.enabled ? 'enabled' : 'disabled'
    };

    // Determine overall status
    const unhealthyServices = Object.values(results.services).filter(
      service => typeof service === 'object' && service.status === 'unhealthy'
    );

    if (unhealthyServices.length > 0) {
      results.status = 'degraded';
    }

    return results;
  }

  // Create production-ready directories
  ensureDirectories() {
    const directories = [
      'logs',
      'uploads',
      'temp',
      'backups'
    ];

    directories.forEach(dir => {
      const dirPath = path.join(process.cwd(), dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`✅ Created directory: ${dir}`);
      }
    });
  }

  // Generate configuration summary
  getConfigSummary() {
    return {
      environment: this.config.environment,
      port: this.config.port,
      services: {
        database: !!process.env.MONGO_URI,
        authentication: !!(process.env.COGNITO_USER_POOL_ID && process.env.COGNITO_CLIENT_ID),
        payments: {
          razorpay: !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
          stripe: !!process.env.STRIPE_SECRET_KEY,
          paypal: !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET)
        },
        email: {
          smtp: !!(process.env.SMTP_HOST && process.env.SMTP_USER),
          sendgrid: !!process.env.SENDGRID_API_KEY,
          mailgun: !!(process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN)
        },
        analytics: {
          googleAnalytics: !!(process.env.GA_MEASUREMENT_ID && process.env.GA_API_SECRET),
          facebookPixel: !!(process.env.FB_PIXEL_ID && process.env.FB_ACCESS_TOKEN),
          googleAds: !!(process.env.GOOGLE_ADS_CONVERSION_ID && process.env.GOOGLE_ADS_CONVERSION_LABEL)
        },
        search: !!process.env.ELASTICSEARCH_NODE,
        storage: !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY),
        monitoring: !!process.env.MONITORING_WEBHOOK_URL
      },
      security: {
        sessionSecret: !!process.env.SESSION_SECRET,
        corsConfigured: true,
        rateLimitingEnabled: true,
        securityHeadersEnabled: true
      }
    };
  }

  // Export configuration for deployment
  exportConfig() {
    const config = {
      timestamp: new Date().toISOString(),
      environment: this.config.environment,
      summary: this.getConfigSummary(),
      security: this.getSecurityConfig(),
      database: {
        configured: !!process.env.MONGO_URI,
        options: this.getDatabaseConfig().options
      },
      logging: this.getLoggingConfig(),
      monitoring: this.getMonitoringConfig()
    };

    // Remove sensitive information
    delete config.security.session.secret;
    
    return config;
  }
}

export default new ProductionConfigService();
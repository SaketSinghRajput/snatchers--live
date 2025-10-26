import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { body, param, query, validationResult } from 'express-validator';
import sanitizeHtml from 'sanitize-html';
import xss from 'xss';

// Rate limiting configurations
export const createRateLimit = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      console.warn(`[Security] Rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
      res.status(429).json({ 
        error: message,
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
  });
};

// General API rate limiting
export const generalRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  500, // limit each IP to 500 requests per windowMs (increased for development)
  'Too many requests from this IP, please try again later'
);

// Strict rate limiting for authentication endpoints
export const authRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  5, // limit each IP to 5 login attempts per windowMs
  'Too many authentication attempts, please try again later'
);

// Payment endpoint rate limiting
export const paymentRateLimit = createRateLimit(
  60 * 1000, // 1 minute
  10, // limit each IP to 10 payment requests per minute
  'Too many payment requests, please try again later'
);

// Search rate limiting
export const searchRateLimit = createRateLimit(
  60 * 1000, // 1 minute
  100, // limit each IP to 100 search requests per minute (increased for development)
  'Too many search requests, please try again later'
);

// Helmet security configuration
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://checkout.razorpay.com"],
      connectSrc: ["'self'", "https://api.razorpay.com"],
      frameSrc: ["'self'", "https://api.razorpay.com"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false, // Disable to allow third-party resources
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

// Input sanitization middleware
export const sanitizeInput = (req, res, next) => {
  try {
    // Sanitize request body (safe to reassign)
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }

    // Note: req.query and req.params are read-only in Express and cannot be sanitized
    // They are already URL-decoded and parsed by Express
    // For security, validate/sanitize these values in your route handlers instead

    next();
  } catch (error) {
    console.error('[Security] Input sanitization error:', error);
    // Don't block the request, just log the error
    next();
  }
};

// Recursive object sanitization
const sanitizeObject = (obj) => {
  if (obj === null || obj === undefined) return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  if (typeof obj === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      // Sanitize key name
      const cleanKey = sanitizeString(key);
      sanitized[cleanKey] = sanitizeObject(value);
    }
    return sanitized;
  }
  
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  
  return obj;
};

// String sanitization
const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  
  // Remove XSS attempts
  let cleaned = xss(str, {
    whiteList: {}, // No HTML tags allowed
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script']
  });
  
  // Additional HTML sanitization
  cleaned = sanitizeHtml(cleaned, {
    allowedTags: [],
    allowedAttributes: {},
    disallowedTagsMode: 'discard'
  });
  
  return cleaned.trim();
};

// Validation error handler
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.warn(`[Security] Validation failed for ${req.method} ${req.path}:`, errors.array());
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
        value: err.value
      }))
    });
  }
  next();
};

// Common validation rules
export const validateObjectId = param('id').isMongoId().withMessage('Invalid ID format');

export const validatePagination = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
];

export const validateEmail = body('email').isEmail().normalizeEmail().withMessage('Invalid email format');

export const validatePassword = body('password')
  .isLength({ min: 8 })
  .withMessage('Password must be at least 8 characters long')
  .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
  .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character');

export const validateProductData = [
  body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Title must be between 1 and 200 characters'),
  body('description').trim().isLength({ min: 1, max: 2000 }).withMessage('Description must be between 1 and 2000 characters'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('category').trim().isLength({ min: 1, max: 100 }).withMessage('Category is required'),
  body('brand').optional().trim().isLength({ max: 100 }).withMessage('Brand must be less than 100 characters')
];

export const validateOrderData = [
  body('items').isArray({ min: 1 }).withMessage('Order must contain at least one item'),
  body('items.*.productId').isMongoId().withMessage('Invalid product ID'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
  body('shippingAddress').isObject().withMessage('Shipping address is required'),
  body('shippingAddress.street').trim().isLength({ min: 1 }).withMessage('Street address is required'),
  body('shippingAddress.city').trim().isLength({ min: 1 }).withMessage('City is required'),
  body('shippingAddress.zipCode').trim().isLength({ min: 1 }).withMessage('Zip code is required')
];

export const validatePaymentData = [
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('currency').optional().isIn(['INR', 'USD']).withMessage('Invalid currency'),
  body('paymentMethodId').optional().trim().isLength({ min: 1 }).withMessage('Payment method ID is required')
];

export const validateReviewData = [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment').optional().trim().isLength({ max: 1000 }).withMessage('Comment must be less than 1000 characters'),
  body('productId').isMongoId().withMessage('Invalid product ID')
];

// Security audit logging
export const auditLogger = (action, level = 'info') => {
  return (req, res, next) => {
    const logData = {
      timestamp: new Date().toISOString(),
      action,
      level,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id || 'anonymous',
      path: req.path,
      method: req.method
    };

    // Log sensitive operations
    if (level === 'warn' || level === 'error') {
      console.warn(`[Security Audit] ${JSON.stringify(logData)}`);
    } else {
      console.log(`[Security Audit] ${JSON.stringify(logData)}`);
    }

    next();
  };
};

// Request size limiting
export const requestSizeLimit = (maxSize = '10mb') => {
  return (req, res, next) => {
    const contentLength = parseInt(req.get('content-length') || '0');
    const maxBytes = parseSize(maxSize);
    
    if (contentLength > maxBytes) {
      console.warn(`[Security] Request size limit exceeded: ${contentLength} bytes > ${maxBytes} bytes`);
      return res.status(413).json({ error: 'Request entity too large' });
    }
    
    next();
  };
};

// Helper function to parse size strings
const parseSize = (size) => {
  if (typeof size === 'number') return size;
  
  const units = {
    'b': 1,
    'kb': 1024,
    'mb': 1024 * 1024,
    'gb': 1024 * 1024 * 1024
  };
  
  const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)(b|kb|mb|gb)$/);
  if (!match) return 10 * 1024 * 1024; // Default 10MB
  
  return parseFloat(match[1]) * units[match[2]];
};

// IP whitelist/blacklist middleware
export const ipFilter = (whitelist = [], blacklist = []) => {
  return (req, res, next) => {
    const clientIp = req.ip;
    
    // Check blacklist first
    if (blacklist.length > 0 && blacklist.includes(clientIp)) {
      console.warn(`[Security] Blocked IP: ${clientIp}`);
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Check whitelist if provided
    if (whitelist.length > 0 && !whitelist.includes(clientIp)) {
      console.warn(`[Security] IP not in whitelist: ${clientIp}`);
      return res.status(403).json({ error: 'Access denied' });
    }
    
    next();
  };
};

export default {
  generalRateLimit,
  authRateLimit,
  paymentRateLimit,
  searchRateLimit,
  securityHeaders,
  sanitizeInput,
  handleValidationErrors,
  validateObjectId,
  validatePagination,
  validateEmail,
  validatePassword,
  validateProductData,
  validateOrderData,
  validatePaymentData,
  validateReviewData,
  auditLogger,
  requestSizeLimit,
  ipFilter
};
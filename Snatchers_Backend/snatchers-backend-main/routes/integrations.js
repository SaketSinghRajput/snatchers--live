import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import EmailService from '../services/EmailService.js';
import AnalyticsIntegrationService from '../services/AnalyticsIntegrationService.js';
import User from '../models/User.js';

const router = express.Router();

// Email Service Routes
router.post('/email/send', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { to, subject, html, text, attachments } = req.body;
    
    if (!to || !subject || (!html && !text)) {
      return res.status(400).json({ error: 'Missing required email fields' });
    }

    const result = await EmailService.sendEmail({
      to, subject, html, text, attachments
    });

    res.json({ 
      success: true, 
      messageId: result.messageId,
      provider: EmailService.activeProvider
    });
  } catch (error) {
    console.error('Email send error:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

router.post('/email/template', authenticateToken, async (req, res) => {
  try {
    const { templateName, recipientData, templateData } = req.body;
    
    if (!templateName || !recipientData || !recipientData.to) {
      return res.status(400).json({ error: 'Missing required template fields' });
    }

    const result = await EmailService.sendTemplateEmail(
      templateName, 
      recipientData, 
      templateData
    );

    res.json({ 
      success: true, 
      messageId: result.messageId,
      template: templateName
    });
  } catch (error) {
    console.error('Template email error:', error);
    res.status(500).json({ error: 'Failed to send template email' });
  }
});

router.post('/email/bulk', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { emails, options } = req.body;
    
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ error: 'Email array is required' });
    }

    const result = await EmailService.sendBulkEmails(emails, options);

    res.json({ 
      success: true, 
      successful: result.successful,
      failed: result.failed,
      total: emails.length
    });
  } catch (error) {
    console.error('Bulk email error:', error);
    res.status(500).json({ error: 'Failed to send bulk emails' });
  }
});

router.get('/email/analytics', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { startDate, endDate } = req.query;
    const analytics = await EmailService.getEmailAnalytics(startDate, endDate);

    res.json({ 
      success: true, 
      analytics,
      provider: EmailService.activeProvider
    });
  } catch (error) {
    console.error('Email analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch email analytics' });
  }
});

router.post('/email/test', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const result = await EmailService.testConfiguration();
    res.json(result);
  } catch (error) {
    console.error('Email test error:', error);
    res.status(500).json({ error: 'Failed to test email configuration' });
  }
});

// Analytics Integration Routes
router.post('/analytics/track', async (req, res) => {
  try {
    const { eventName, eventData, userInfo } = req.body;
    
    if (!eventName || !eventData) {
      return res.status(400).json({ error: 'Event name and data are required' });
    }

    const result = await AnalyticsIntegrationService.trackEvent(
      eventName, 
      eventData, 
      userInfo || {}
    );

    res.json({ 
      success: true, 
      queued: result.queued,
      eventName
    });
  } catch (error) {
    console.error('Analytics tracking error:', error);
    res.status(500).json({ error: 'Failed to track event' });
  }
});

router.post('/analytics/track/page-view', async (req, res) => {
  try {
    const { pageData, userInfo } = req.body;
    
    if (!pageData || !pageData.url) {
      return res.status(400).json({ error: 'Page URL is required' });
    }

    const result = await AnalyticsIntegrationService.trackPageView(
      pageData, 
      userInfo || {}
    );

    res.json({ success: true, queued: result.queued });
  } catch (error) {
    console.error('Page view tracking error:', error);
    res.status(500).json({ error: 'Failed to track page view' });
  }
});

router.post('/analytics/track/product-view', async (req, res) => {
  try {
    const { productData, userInfo } = req.body;
    
    if (!productData || !productData.id) {
      return res.status(400).json({ error: 'Product ID is required' });
    }

    const result = await AnalyticsIntegrationService.trackProductView(
      productData, 
      userInfo || {}
    );

    res.json({ success: true, queued: result.queued });
  } catch (error) {
    console.error('Product view tracking error:', error);
    res.status(500).json({ error: 'Failed to track product view' });
  }
});

router.post('/analytics/track/add-to-cart', async (req, res) => {
  try {
    const { cartData, userInfo } = req.body;
    
    if (!cartData || !cartData.items) {
      return res.status(400).json({ error: 'Cart items are required' });
    }

    const result = await AnalyticsIntegrationService.trackAddToCart(
      cartData, 
      userInfo || {}
    );

    res.json({ success: true, queued: result.queued });
  } catch (error) {
    console.error('Add to cart tracking error:', error);
    res.status(500).json({ error: 'Failed to track add to cart' });
  }
});

router.post('/analytics/track/purchase', async (req, res) => {
  try {
    const { orderData, userInfo } = req.body;
    
    if (!orderData || !orderData.orderId) {
      return res.status(400).json({ error: 'Order ID is required' });
    }

    const result = await AnalyticsIntegrationService.trackPurchase(
      orderData, 
      userInfo || {}
    );

    res.json({ success: true, queued: result.queued });
  } catch (error) {
    console.error('Purchase tracking error:', error);
    res.status(500).json({ error: 'Failed to track purchase' });
  }
});

router.post('/analytics/track/search', async (req, res) => {
  try {
    const { searchData, userInfo } = req.body;
    
    if (!searchData || !searchData.query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const result = await AnalyticsIntegrationService.trackSearch(
      searchData, 
      userInfo || {}
    );

    res.json({ success: true, queued: result.queued });
  } catch (error) {
    console.error('Search tracking error:', error);
    res.status(500).json({ error: 'Failed to track search' });
  }
});

router.post('/analytics/track/signup', async (req, res) => {
  try {
    const { userData, userInfo } = req.body;
    
    const result = await AnalyticsIntegrationService.trackSignUp(
      userData || {}, 
      userInfo || {}
    );

    res.json({ success: true, queued: result.queued });
  } catch (error) {
    console.error('Signup tracking error:', error);
    res.status(500).json({ error: 'Failed to track signup' });
  }
});

router.get('/analytics/config', async (req, res) => {
  try {
    const config = AnalyticsIntegrationService.getClientConfig();
    res.json({ success: true, config });
  } catch (error) {
    console.error('Analytics config error:', error);
    res.status(500).json({ error: 'Failed to get analytics config' });
  }
});

router.get('/analytics/health', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const health = await AnalyticsIntegrationService.healthCheck();
    res.json({ success: true, health });
  } catch (error) {
    console.error('Analytics health check error:', error);
    res.status(500).json({ error: 'Failed to check analytics health' });
  }
});

router.get('/analytics/stats', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const stats = AnalyticsIntegrationService.getQueueStats();
    res.json({ success: true, stats });
  } catch (error) {
    console.error('Analytics stats error:', error);
    res.status(500).json({ error: 'Failed to get analytics stats' });
  }
});

// Integration Status and Configuration
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const status = {
      email: {
        activeProvider: EmailService.activeProvider,
        providers: {
          smtp: !!EmailService.providers.smtp,
          sendgrid: !!EmailService.providers.sendgrid,
          mailgun: !!EmailService.providers.mailgun
        }
      },
      analytics: {
        providers: {
          googleAnalytics: AnalyticsIntegrationService.providers.googleAnalytics.enabled,
          facebookPixel: AnalyticsIntegrationService.providers.facebookPixel.enabled,
          googleAds: AnalyticsIntegrationService.providers.googleAds.enabled
        },
        queueLength: AnalyticsIntegrationService.eventQueue.length
      },
      timestamp: new Date().toISOString()
    };

    res.json({ success: true, status });
  } catch (error) {
    console.error('Integration status error:', error);
    res.status(500).json({ error: 'Failed to get integration status' });
  }
});

export default router;
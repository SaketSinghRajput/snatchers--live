import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { 
  paymentRateLimit, 
  validatePaymentData, 
  handleValidationErrors,
  auditLogger,
  sanitizeInput 
} from '../middleware/security.js';
import SecurePaymentService from '../services/SecurePaymentService.js';
import PaymentGatewayService from '../services/PaymentGatewayService.js';

const router = express.Router();

// Apply security middleware to all payment routes
router.use(paymentRateLimit);
router.use(sanitizeInput);
router.use(authenticateToken);

// Get supported payment methods
router.get('/methods',
  async (req, res) => {
    try {
      const { currency = 'INR', region = 'IN' } = req.query;
      const methods = PaymentGatewayService.getSupportedPaymentMethods(currency, region);
      
      res.json({
        status: "SUCCESS",
        methods,
        currency,
        region
      });
    } catch (error) {
      console.error('[Payment] Methods error:', error);
      res.status(500).json({
        status: "ERROR",
        message: "Failed to fetch payment methods"
      });
    }
  }
);

// Create new payment order with automatic gateway selection
router.post('/create-order', 
  validatePaymentData,
  handleValidationErrors,
  auditLogger('payment_order_creation', 'info'),
  async (req, res) => {
    try {
      const { amount, currency = 'INR', items, gateway, metadata } = req.body;
      const userId = req.user.id;

      let result;
      if (gateway) {
        // Use specific gateway if requested
        switch (gateway) {
          case 'razorpay':
            result = await SecurePaymentService.createSecureOrder({
              amount, currency, items
            }, userId);
            result.gateway = 'razorpay';
            break;
          default:
            result = await PaymentGatewayService.createPaymentOrder({
              amount, currency, items, metadata
            }, userId);
        }
      } else {
        // Auto-select best gateway
        result = await PaymentGatewayService.createPaymentOrder({
          amount, currency, items, metadata
        }, userId);
      }

      if (result.success) {
        res.json({ 
          status: "SUCCESS", 
          order: result.order,
          gateway: result.gateway
        });
      } else {
        res.status(400).json({ 
          status: "ERROR", 
          message: "Failed to create payment order" 
        });
      }
    } catch (error) {
      console.error('[Payment] Order creation error:', error);
      res.status(500).json({ 
        status: "ERROR", 
        message: "Internal server error" 
      });
    }
  }
);

// Verify payment across different gateways
router.post('/verify-payment',
  auditLogger('payment_verification', 'info'),
  async (req, res) => {
    try {
      const { gateway, ...paymentData } = req.body;
      
      if (!gateway) {
        return res.status(400).json({
          status: "ERROR",
          message: "Payment gateway is required"
        });
      }

      let result;
      if (gateway === 'razorpay') {
        // Legacy Razorpay verification
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = paymentData;
        
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
          return res.status(400).json({
            status: "ERROR",
            message: "Missing Razorpay verification data"
          });
        }

        result = await SecurePaymentService.verifyPaymentSignature({
          razorpay_order_id,
          razorpay_payment_id,
          razorpay_signature
        });
      } else {
        // Use enhanced payment gateway service
        result = await PaymentGatewayService.verifyPayment(paymentData, gateway);
      }

      if (result.success && result.verified) {
        res.json({
          status: "SUCCESS",
          verified: true,
          payment: result.payment,
          gateway
        });
      } else {
        res.status(400).json({
          status: "ERROR",
          verified: false,
          message: result.error || "Payment verification failed"
        });
      }
    } catch (error) {
      console.error('[Payment] Verification error:', error);
      res.status(500).json({
        status: "ERROR",
        message: "Payment verification failed"
      });
    }
  }
);

// Process refund across different gateways
router.post('/refund',
  auditLogger('payment_refund', 'warn'),
  async (req, res) => {
    try {
      const { paymentId, amount, reason, gateway } = req.body;
      const userId = req.user.id;

      // Check if user has admin privileges (you may need to implement role checking)
      // For now, we'll allow any authenticated user to request refunds
      
      if (!paymentId || !amount || !gateway) {
        return res.status(400).json({
          status: "ERROR",
          message: "Payment ID, amount, and gateway are required"
        });
      }

      let result;
      if (gateway === 'razorpay') {
        // Legacy Razorpay refund
        result = await SecurePaymentService.processRefund(
          paymentId, 
          amount, 
          reason, 
          userId
        );
      } else {
        // Use enhanced payment gateway service
        result = await PaymentGatewayService.processRefund(
          paymentId,
          amount,
          gateway,
          reason,
          userId
        );
      }

      if (result.success) {
        res.json({
          status: "SUCCESS",
          refund: result.refund,
          gateway
        });
      } else {
        res.status(400).json({
          status: "ERROR",
          message: "Refund processing failed"
        });
      }
    } catch (error) {
      console.error('[Payment] Refund error:', error);
      res.status(500).json({
        status: "ERROR",
        message: "Refund processing failed"
      });
    }
  }
);

// Get payment analytics (admin only)
router.get('/analytics',
  auditLogger('payment_analytics_access', 'info'),
  async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const userId = req.user.id;

      const result = await SecurePaymentService.getPaymentAnalytics(
        startDate,
        endDate,
        userId
      );

      if (result.success) {
        res.json({
          status: "SUCCESS",
          analytics: result.analytics
        });
      } else {
        res.status(400).json({
          status: "ERROR",
          message: "Failed to fetch analytics"
        });
      }
    } catch (error) {
      console.error('[Payment] Analytics error:', error);
      res.status(500).json({
        status: "ERROR",
        message: "Failed to fetch payment analytics"
      });
    }
  }
);

// Webhook endpoints for different payment gateways
router.post('/webhook/razorpay',
  express.raw({ type: 'application/json' }),
  auditLogger('razorpay_webhook', 'info'),
  async (req, res) => {
    try {
      const signature = req.headers['x-razorpay-signature'];
      const payload = req.body;

      const result = await PaymentGatewayService.handleWebhook(payload, signature, 'razorpay');
      
      if (result.success) {
        // Handle different webhook events
        const event = result.event;
        switch (event.event) {
          case 'payment.captured':
            console.log('[Payment] Razorpay payment captured:', event.payload.payment.entity.id);
            break;
          case 'payment.failed':
            console.log('[Payment] Razorpay payment failed:', event.payload.payment.entity.id);
            break;
          case 'refund.processed':
            console.log('[Payment] Razorpay refund processed:', event.payload.refund.entity.id);
            break;
          default:
            console.log('[Payment] Unhandled Razorpay webhook event:', event.event);
        }
        
        res.json({ status: "SUCCESS" });
      } else {
        res.status(400).json({ status: "ERROR", message: "Invalid webhook" });
      }
    } catch (error) {
      console.error('[Payment] Razorpay webhook error:', error);
      res.status(500).json({ status: "ERROR", message: "Webhook processing failed" });
    }
  }
);

router.post('/webhook/stripe',
  express.raw({ type: 'application/json' }),
  auditLogger('stripe_webhook', 'info'),
  async (req, res) => {
    try {
      const signature = req.headers['stripe-signature'];
      const payload = req.body;

      const result = await PaymentGatewayService.handleWebhook(payload, signature, 'stripe');
      
      if (result.success) {
        const event = result.event;
        switch (event.type) {
          case 'payment_intent.succeeded':
            console.log('[Payment] Stripe payment succeeded:', event.data.object.id);
            break;
          case 'payment_intent.payment_failed':
            console.log('[Payment] Stripe payment failed:', event.data.object.id);
            break;
          case 'charge.dispute.created':
            console.log('[Payment] Stripe dispute created:', event.data.object.id);
            break;
          default:
            console.log('[Payment] Unhandled Stripe webhook event:', event.type);
        }
        
        res.json({ received: true });
      } else {
        res.status(400).json({ error: "Invalid webhook" });
      }
    } catch (error) {
      console.error('[Payment] Stripe webhook error:', error);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  }
);

router.post('/webhook/paypal',
  express.json(),
  auditLogger('paypal_webhook', 'info'),
  async (req, res) => {
    try {
      const payload = JSON.stringify(req.body);
      const signature = req.headers['paypal-transmission-sig'];

      const result = await PaymentGatewayService.handleWebhook(payload, signature, 'paypal');
      
      if (result.success) {
        const event = result.event;
        switch (event.event_type) {
          case 'PAYMENT.CAPTURE.COMPLETED':
            console.log('[Payment] PayPal payment completed:', event.resource.id);
            break;
          case 'PAYMENT.CAPTURE.DENIED':
            console.log('[Payment] PayPal payment denied:', event.resource.id);
            break;
          default:
            console.log('[Payment] Unhandled PayPal webhook event:', event.event_type);
        }
        
        res.json({ status: "SUCCESS" });
      } else {
        res.status(400).json({ error: "Invalid webhook" });
      }
    } catch (error) {
      console.error('[Payment] PayPal webhook error:', error);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  }
);

// Legacy webhook endpoint (for backward compatibility)
router.post('/webhook',
  express.raw({ type: 'application/json' }),
  auditLogger('payment_webhook', 'info'),
  async (req, res) => {
    try {
      const signature = req.headers['x-razorpay-signature'];
      const payload = req.body;

      if (!signature) {
        return res.status(400).json({
          status: "ERROR",
          message: "Missing webhook signature"
        });
      }

      const isValid = SecurePaymentService.verifyWebhookSignature(
        payload,
        signature,
        process.env.RAZORPAY_WEBHOOK_SECRET
      );

      if (!isValid) {
        return res.status(400).json({
          status: "ERROR",
          message: "Invalid webhook signature"
        });
      }

      const event = JSON.parse(payload);
      console.log('[Payment] Legacy webhook received:', event.event);

      res.json({ status: "SUCCESS" });
    } catch (error) {
      console.error('[Payment] Legacy webhook error:', error);
      res.status(500).json({
        status: "ERROR",
        message: "Webhook processing failed"
      });
    }
  }
);

export default router;

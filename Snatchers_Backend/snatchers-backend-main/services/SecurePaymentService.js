import Razorpay from 'razorpay';
import crypto from 'crypto';
import { auditLogger } from '../middleware/security.js';

class SecurePaymentService {
  constructor() {
    this.razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
    
    // PCI compliance settings
    this.maxRetries = 3;
    this.timeoutMs = 30000; // 30 seconds
  }

  // Create secure payment order with validation
  async createSecureOrder(orderData, userId) {
    try {
      // Validate input data
      const validatedData = this.validateOrderData(orderData);
      
      // Generate secure receipt ID
      const receipt = this.generateSecureReceipt(userId);
      
      // Create order with Razorpay
      const options = {
        amount: Math.round(validatedData.amount * 100), // Convert to paise
        currency: validatedData.currency || 'INR',
        receipt,
        notes: {
          userId: userId,
          timestamp: new Date().toISOString(),
          // Don't store sensitive data in notes
        }
      };

      const order = await this.razorpay.orders.create(options);
      
      // Log payment creation (without sensitive data)
      this.logPaymentEvent('order_created', {
        orderId: order.id,
        amount: validatedData.amount,
        currency: validatedData.currency,
        userId
      });

      return {
        success: true,
        order: {
          id: order.id,
          amount: order.amount,
          currency: order.currency,
          receipt: order.receipt,
          status: order.status,
          created_at: order.created_at
        }
      };
    } catch (error) {
      this.logPaymentEvent('order_creation_failed', {
        error: error.message,
        userId
      }, 'error');
      
      throw new Error('Failed to create payment order');
    }
  }

  // Verify payment signature for security
  async verifyPaymentSignature(paymentData) {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = paymentData;
      
      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        throw new Error('Missing required payment verification data');
      }

      // Create signature for verification
      const body = razorpay_order_id + '|' + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest('hex');

      const isSignatureValid = expectedSignature === razorpay_signature;
      
      if (isSignatureValid) {
        // Fetch payment details from Razorpay for additional verification
        const payment = await this.razorpay.payments.fetch(razorpay_payment_id);
        
        this.logPaymentEvent('payment_verified', {
          orderId: razorpay_order_id,
          paymentId: razorpay_payment_id,
          status: payment.status,
          amount: payment.amount
        });

        return {
          success: true,
          verified: true,
          payment: {
            id: payment.id,
            order_id: payment.order_id,
            status: payment.status,
            amount: payment.amount,
            currency: payment.currency,
            method: payment.method,
            created_at: payment.created_at
          }
        };
      } else {
        this.logPaymentEvent('payment_verification_failed', {
          orderId: razorpay_order_id,
          paymentId: razorpay_payment_id,
          reason: 'Invalid signature'
        }, 'error');

        return {
          success: false,
          verified: false,
          error: 'Payment verification failed'
        };
      }
    } catch (error) {
      this.logPaymentEvent('payment_verification_error', {
        error: error.message
      }, 'error');
      
      throw new Error('Payment verification failed');
    }
  }

  // Secure refund processing
  async processRefund(paymentId, amount, reason, userId) {
    try {
      // Validate refund request
      if (!paymentId || !amount || amount <= 0) {
        throw new Error('Invalid refund parameters');
      }

      // Fetch original payment for validation
      const payment = await this.razorpay.payments.fetch(paymentId);
      
      if (payment.status !== 'captured') {
        throw new Error('Payment not eligible for refund');
      }

      // Process refund
      const refund = await this.razorpay.payments.refund(paymentId, {
        amount: Math.round(amount * 100), // Convert to paise
        notes: {
          reason: reason || 'Customer request',
          processed_by: userId,
          timestamp: new Date().toISOString()
        }
      });

      this.logPaymentEvent('refund_processed', {
        paymentId,
        refundId: refund.id,
        amount,
        reason,
        userId
      });

      return {
        success: true,
        refund: {
          id: refund.id,
          payment_id: refund.payment_id,
          amount: refund.amount,
          status: refund.status,
          created_at: refund.created_at
        }
      };
    } catch (error) {
      this.logPaymentEvent('refund_failed', {
        paymentId,
        amount,
        error: error.message,
        userId
      }, 'error');
      
      throw new Error('Refund processing failed');
    }
  }

  // Validate order data for PCI compliance
  validateOrderData(data) {
    const { amount, currency, items } = data;
    
    // Validate amount
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      throw new Error('Invalid amount');
    }
    
    if (amount > 500000) { // Max ₹5,00,000 per transaction
      throw new Error('Amount exceeds maximum limit');
    }

    // Validate currency
    const allowedCurrencies = ['INR', 'USD'];
    if (currency && !allowedCurrencies.includes(currency)) {
      throw new Error('Invalid currency');
    }

    // Validate items if provided
    if (items && (!Array.isArray(items) || items.length === 0)) {
      throw new Error('Invalid items data');
    }

    return { amount, currency: currency || 'INR', items };
  }

  // Generate secure receipt ID
  generateSecureReceipt(userId) {
    const timestamp = Date.now();
    const random = crypto.randomBytes(4).toString('hex');
    return `rcpt_${userId}_${timestamp}_${random}`;
  }

  // Secure payment event logging
  logPaymentEvent(event, data, level = 'info') {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      level,
      service: 'SecurePaymentService',
      data: {
        ...data,
        // Ensure no sensitive data is logged
        razorpay_key_secret: undefined,
        card_number: undefined,
        cvv: undefined,
        expiry: undefined
      }
    };

    if (level === 'error') {
      console.error(`[Payment Security] ${JSON.stringify(logEntry)}`);
    } else if (level === 'warn') {
      console.warn(`[Payment Security] ${JSON.stringify(logEntry)}`);
    } else {
      console.log(`[Payment Security] ${JSON.stringify(logEntry)}`);
    }
  }

  // Get payment analytics (for admin)
  async getPaymentAnalytics(startDate, endDate, userId) {
    try {
      // This would typically query your database for payment records
      // For now, we'll return a basic structure
      
      this.logPaymentEvent('analytics_accessed', {
        startDate,
        endDate,
        accessedBy: userId
      });

      return {
        success: true,
        analytics: {
          totalTransactions: 0,
          totalAmount: 0,
          successfulPayments: 0,
          failedPayments: 0,
          refunds: 0,
          period: { startDate, endDate }
        }
      };
    } catch (error) {
      this.logPaymentEvent('analytics_error', {
        error: error.message,
        userId
      }, 'error');
      
      throw new Error('Failed to fetch payment analytics');
    }
  }

  // Webhook signature verification
  verifyWebhookSignature(payload, signature, secret) {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');
      
      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch (error) {
      this.logPaymentEvent('webhook_verification_failed', {
        error: error.message
      }, 'error');
      return false;
    }
  }

  // Secure card tokenization (if needed for future use)
  async tokenizeCard(cardData, userId) {
    try {
      // This would integrate with Razorpay's tokenization service
      // For PCI compliance, never store actual card data
      
      this.logPaymentEvent('card_tokenization_requested', {
        userId,
        last4: cardData.number ? cardData.number.slice(-4) : 'unknown'
      });

      // Return mock token for now
      return {
        success: true,
        token: `token_${crypto.randomBytes(16).toString('hex')}`,
        last4: cardData.number ? cardData.number.slice(-4) : null
      };
    } catch (error) {
      this.logPaymentEvent('card_tokenization_failed', {
        error: error.message,
        userId
      }, 'error');
      
      throw new Error('Card tokenization failed');
    }
  }
}

export default new SecurePaymentService();
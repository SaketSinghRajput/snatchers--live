import Razorpay from 'razorpay';
import Stripe from 'stripe';
import crypto from 'crypto';
import axios from 'axios';
import { auditLogger } from '../middleware/security.js';

class PaymentGatewayService {
  constructor() {
    // Initialize payment gateways
    this.initializeGateways();
    
    // Configuration
    this.maxRetries = 3;
    this.timeoutMs = 30000;
    this.supportedCurrencies = {
      razorpay: ['INR'],
      stripe: ['USD', 'EUR', 'GBP', 'CAD', 'AUD'],
      paypal: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY']
    };
  }

  initializeGateways() {
    // Razorpay initialization
    if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
      this.razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      });
    }

    // Stripe initialization
    if (process.env.STRIPE_SECRET_KEY) {
      this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2023-10-16',
        timeout: this.timeoutMs,
      });
    }

    // PayPal configuration
    this.paypalConfig = {
      clientId: process.env.PAYPAL_CLIENT_ID,
      clientSecret: process.env.PAYPAL_CLIENT_SECRET,
      environment: process.env.PAYPAL_ENVIRONMENT || 'sandbox', // 'sandbox' or 'live'
      baseUrl: process.env.PAYPAL_ENVIRONMENT === 'live' 
        ? 'https://api.paypal.com' 
        : 'https://api.sandbox.paypal.com'
    };
  }

  // Determine best payment gateway based on currency and region
  selectPaymentGateway(currency, region = 'IN') {
    if (currency === 'INR' && this.razorpay) {
      return 'razorpay';
    }
    
    if (this.supportedCurrencies.stripe.includes(currency) && this.stripe) {
      return 'stripe';
    }
    
    if (this.supportedCurrencies.paypal.includes(currency) && this.paypalConfig.clientId) {
      return 'paypal';
    }
    
    throw new Error(`No suitable payment gateway found for currency: ${currency}`);
  }

  // Create payment order with automatic gateway selection
  async createPaymentOrder(orderData, userId) {
    try {
      const { amount, currency = 'INR', items, metadata = {} } = orderData;
      const gateway = this.selectPaymentGateway(currency);
      
      this.logPaymentEvent('order_creation_started', {
        gateway,
        amount,
        currency,
        userId
      });

      let result;
      switch (gateway) {
        case 'razorpay':
          result = await this.createRazorpayOrder(orderData, userId);
          break;
        case 'stripe':
          result = await this.createStripePaymentIntent(orderData, userId);
          break;
        case 'paypal':
          result = await this.createPayPalOrder(orderData, userId);
          break;
        default:
          throw new Error(`Unsupported gateway: ${gateway}`);
      }

      return { ...result, gateway };
    } catch (error) {
      this.logPaymentEvent('order_creation_failed', {
        error: error.message,
        userId
      }, 'error');
      throw error;
    }
  }

  // Razorpay order creation
  async createRazorpayOrder(orderData, userId) {
    const { amount, currency = 'INR', metadata = {} } = orderData;
    const receipt = this.generateSecureReceipt(userId);
    
    const options = {
      amount: Math.round(amount * 100), // Convert to paise
      currency,
      receipt,
      notes: {
        userId: userId,
        timestamp: new Date().toISOString(),
        ...metadata
      }
    };

    const order = await this.razorpay.orders.create(options);
    
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
  }

  // Stripe Payment Intent creation
  async createStripePaymentIntent(orderData, userId) {
    const { amount, currency, items = [], metadata = {} } = orderData;
    
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      metadata: {
        userId: userId,
        timestamp: new Date().toISOString(),
        ...metadata
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return {
      success: true,
      order: {
        id: paymentIntent.id,
        client_secret: paymentIntent.client_secret,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        created_at: paymentIntent.created
      }
    };
  }

  // PayPal order creation
  async createPayPalOrder(orderData, userId) {
    const { amount, currency, items = [], metadata = {} } = orderData;
    
    // Get PayPal access token
    const accessToken = await this.getPayPalAccessToken();
    
    const orderPayload = {
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: currency,
          value: amount.toFixed(2)
        },
        items: items.map(item => ({
          name: item.name,
          quantity: item.quantity.toString(),
          unit_amount: {
            currency_code: currency,
            value: item.price.toFixed(2)
          }
        }))
      }],
      application_context: {
        return_url: `${process.env.FRONTEND_URL}/payment/success`,
        cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`
      }
    };

    const response = await axios.post(
      `${this.paypalConfig.baseUrl}/v2/checkout/orders`,
      orderPayload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        }
      }
    );

    return {
      success: true,
      order: {
        id: response.data.id,
        status: response.data.status,
        links: response.data.links,
        created_at: new Date().toISOString()
      }
    };
  }

  // Get PayPal access token
  async getPayPalAccessToken() {
    const auth = Buffer.from(
      `${this.paypalConfig.clientId}:${this.paypalConfig.clientSecret}`
    ).toString('base64');

    const response = await axios.post(
      `${this.paypalConfig.baseUrl}/v1/oauth2/token`,
      'grant_type=client_credentials',
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        }
      }
    );

    return response.data.access_token;
  }

  // Verify payment based on gateway
  async verifyPayment(paymentData, gateway) {
    try {
      let result;
      switch (gateway) {
        case 'razorpay':
          result = await this.verifyRazorpayPayment(paymentData);
          break;
        case 'stripe':
          result = await this.verifyStripePayment(paymentData);
          break;
        case 'paypal':
          result = await this.verifyPayPalPayment(paymentData);
          break;
        default:
          throw new Error(`Unsupported gateway: ${gateway}`);
      }

      this.logPaymentEvent('payment_verified', {
        gateway,
        paymentId: result.payment?.id,
        status: result.payment?.status
      });

      return result;
    } catch (error) {
      this.logPaymentEvent('payment_verification_failed', {
        gateway,
        error: error.message
      }, 'error');
      throw error;
    }
  }

  // Razorpay payment verification
  async verifyRazorpayPayment(paymentData) {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = paymentData;
    
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    const isSignatureValid = expectedSignature === razorpay_signature;
    
    if (isSignatureValid) {
      const payment = await this.razorpay.payments.fetch(razorpay_payment_id);
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
    }

    return { success: false, verified: false, error: 'Invalid signature' };
  }

  // Stripe payment verification
  async verifyStripePayment(paymentData) {
    const { payment_intent_id } = paymentData;
    
    const paymentIntent = await this.stripe.paymentIntents.retrieve(payment_intent_id);
    
    return {
      success: true,
      verified: paymentIntent.status === 'succeeded',
      payment: {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        payment_method: paymentIntent.payment_method,
        created_at: paymentIntent.created
      }
    };
  }

  // PayPal payment verification
  async verifyPayPalPayment(paymentData) {
    const { order_id } = paymentData;
    const accessToken = await this.getPayPalAccessToken();
    
    const response = await axios.get(
      `${this.paypalConfig.baseUrl}/v2/checkout/orders/${order_id}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        }
      }
    );

    const order = response.data;
    const isCompleted = order.status === 'COMPLETED';
    
    return {
      success: true,
      verified: isCompleted,
      payment: {
        id: order.id,
        status: order.status,
        amount: order.purchase_units[0]?.amount?.value,
        currency: order.purchase_units[0]?.amount?.currency_code,
        created_at: order.create_time
      }
    };
  }

  // Process refund across gateways
  async processRefund(paymentId, amount, gateway, reason, userId) {
    try {
      let result;
      switch (gateway) {
        case 'razorpay':
          result = await this.processRazorpayRefund(paymentId, amount, reason);
          break;
        case 'stripe':
          result = await this.processStripeRefund(paymentId, amount, reason);
          break;
        case 'paypal':
          result = await this.processPayPalRefund(paymentId, amount, reason);
          break;
        default:
          throw new Error(`Unsupported gateway: ${gateway}`);
      }

      this.logPaymentEvent('refund_processed', {
        gateway,
        paymentId,
        amount,
        reason,
        userId
      });

      return result;
    } catch (error) {
      this.logPaymentEvent('refund_failed', {
        gateway,
        paymentId,
        error: error.message,
        userId
      }, 'error');
      throw error;
    }
  }

  // Razorpay refund
  async processRazorpayRefund(paymentId, amount, reason) {
    const refund = await this.razorpay.payments.refund(paymentId, {
      amount: Math.round(amount * 100),
      notes: { reason, timestamp: new Date().toISOString() }
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
  }

  // Stripe refund
  async processStripeRefund(paymentIntentId, amount, reason) {
    const refund = await this.stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: Math.round(amount * 100),
      reason: 'requested_by_customer',
      metadata: { reason, timestamp: new Date().toISOString() }
    });

    return {
      success: true,
      refund: {
        id: refund.id,
        payment_intent: refund.payment_intent,
        amount: refund.amount,
        status: refund.status,
        created_at: refund.created
      }
    };
  }

  // PayPal refund
  async processPayPalRefund(captureId, amount, reason) {
    const accessToken = await this.getPayPalAccessToken();
    
    const refundPayload = {
      amount: {
        value: amount.toFixed(2),
        currency_code: 'USD' // This should be dynamic based on original payment
      },
      note_to_payer: reason
    };

    const response = await axios.post(
      `${this.paypalConfig.baseUrl}/v2/payments/captures/${captureId}/refund`,
      refundPayload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        }
      }
    );

    return {
      success: true,
      refund: {
        id: response.data.id,
        status: response.data.status,
        amount: response.data.amount.value,
        created_at: response.data.create_time
      }
    };
  }

  // Get supported payment methods for frontend
  getSupportedPaymentMethods(currency, region = 'IN') {
    const methods = [];
    
    if (currency === 'INR' && this.razorpay) {
      methods.push({
        gateway: 'razorpay',
        name: 'Razorpay',
        methods: ['card', 'netbanking', 'wallet', 'upi'],
        currencies: ['INR']
      });
    }
    
    if (this.supportedCurrencies.stripe.includes(currency) && this.stripe) {
      methods.push({
        gateway: 'stripe',
        name: 'Stripe',
        methods: ['card', 'apple_pay', 'google_pay'],
        currencies: this.supportedCurrencies.stripe
      });
    }
    
    if (this.supportedCurrencies.paypal.includes(currency) && this.paypalConfig.clientId) {
      methods.push({
        gateway: 'paypal',
        name: 'PayPal',
        methods: ['paypal', 'card'],
        currencies: this.supportedCurrencies.paypal
      });
    }
    
    return methods;
  }

  // Generate secure receipt ID
  generateSecureReceipt(userId) {
    const timestamp = Date.now();
    const random = crypto.randomBytes(4).toString('hex');
    return `rcpt_${userId}_${timestamp}_${random}`;
  }

  // Payment event logging
  logPaymentEvent(event, data, level = 'info') {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      level,
      service: 'PaymentGatewayService',
      data: {
        ...data,
        // Remove sensitive data
        razorpay_key_secret: undefined,
        stripe_secret_key: undefined,
        paypal_client_secret: undefined
      }
    };

    if (level === 'error') {
      console.error(`[Payment Gateway] ${JSON.stringify(logEntry)}`);
    } else if (level === 'warn') {
      console.warn(`[Payment Gateway] ${JSON.stringify(logEntry)}`);
    } else {
      console.log(`[Payment Gateway] ${JSON.stringify(logEntry)}`);
    }
  }

  // Webhook handlers for different gateways
  async handleWebhook(payload, signature, gateway) {
    try {
      switch (gateway) {
        case 'razorpay':
          return await this.handleRazorpayWebhook(payload, signature);
        case 'stripe':
          return await this.handleStripeWebhook(payload, signature);
        case 'paypal':
          return await this.handlePayPalWebhook(payload, signature);
        default:
          throw new Error(`Unsupported webhook gateway: ${gateway}`);
      }
    } catch (error) {
      this.logPaymentEvent('webhook_error', {
        gateway,
        error: error.message
      }, 'error');
      throw error;
    }
  }

  // Razorpay webhook handler
  async handleRazorpayWebhook(payload, signature) {
    const isValid = this.verifyWebhookSignature(
      payload, 
      signature, 
      process.env.RAZORPAY_WEBHOOK_SECRET
    );
    
    if (!isValid) {
      throw new Error('Invalid webhook signature');
    }
    
    const event = JSON.parse(payload);
    this.logPaymentEvent('webhook_received', {
      gateway: 'razorpay',
      event: event.event,
      paymentId: event.payload?.payment?.entity?.id
    });
    
    return { success: true, event };
  }

  // Stripe webhook handler
  async handleStripeWebhook(payload, signature) {
    const event = this.stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    
    this.logPaymentEvent('webhook_received', {
      gateway: 'stripe',
      event: event.type,
      paymentIntentId: event.data?.object?.id
    });
    
    return { success: true, event };
  }

  // PayPal webhook handler
  async handlePayPalWebhook(payload, signature) {
    // PayPal webhook verification would go here
    const event = JSON.parse(payload);
    
    this.logPaymentEvent('webhook_received', {
      gateway: 'paypal',
      event: event.event_type,
      resourceId: event.resource?.id
    });
    
    return { success: true, event };
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
      return false;
    }
  }
}

export default new PaymentGatewayService();
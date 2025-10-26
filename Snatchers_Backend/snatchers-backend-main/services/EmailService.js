import nodemailer from 'nodemailer';
import axios from 'axios';

class EmailService {
  constructor() {
    this.providers = {
      smtp: null,
      sendgrid: null,
      mailgun: null
    };
    
    this.initializeProviders();
    this.activeProvider = this.selectActiveProvider();
    
    // Email templates
    this.templates = {
      welcome: this.getWelcomeTemplate(),
      orderConfirmation: this.getOrderConfirmationTemplate(),
      orderShipped: this.getOrderShippedTemplate(),
      passwordReset: this.getPasswordResetTemplate(),
      promotional: this.getPromotionalTemplate(),
      abandonedCart: this.getAbandonedCartTemplate(),
      priceDropAlert: this.getPriceDropAlertTemplate(),
      backInStock: this.getBackInStockTemplate()
    };
  }

  initializeProviders() {
    // SMTP/Nodemailer setup (fallback)
    if (process.env.SMTP_HOST) {
      this.providers.smtp = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    }

    // SendGrid configuration
    if (process.env.SENDGRID_API_KEY) {
      this.providers.sendgrid = {
        apiKey: process.env.SENDGRID_API_KEY,
        baseUrl: 'https://api.sendgrid.com/v3/mail/send'
      };
    }

    // Mailgun configuration
    if (process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN) {
      this.providers.mailgun = {
        apiKey: process.env.MAILGUN_API_KEY,
        domain: process.env.MAILGUN_DOMAIN,
        baseUrl: `https://api.mailgun.net/v3/${process.env.MAILGUN_DOMAIN}/messages`
      };
    }
    
    // If no provider configured, provide a local mock SMTP provider for development
    if (!this.providers.smtp && !this.providers.sendgrid && !this.providers.mailgun) {
      console.warn('[EmailService] No external email provider configured; using mock SMTP provider for development (emails will not be sent).');
      this.providers.smtp = {
        sendMail: async (mailOptions) => {
          console.log('[EmailService Mock] Would send email:', {
            to: mailOptions.to,
            subject: mailOptions.subject
          });
          return { messageId: 'dev-mock-' + Date.now() };
        }
      };
    }
  }

  selectActiveProvider() {
    // Priority: SendGrid > Mailgun > SMTP
    if (this.providers.sendgrid) return 'sendgrid';
    if (this.providers.mailgun) return 'mailgun';
    if (this.providers.smtp) return 'smtp';
    
    // Fallback - should never happen after mock provider in initializeProviders
    console.warn('[EmailService] No email provider configured; using mock mode');
    this.providers.smtp = {
      sendMail: async (mailOptions) => ({ messageId: 'dev-mock' })
    };
    return 'smtp';
  }

  // Send email using active provider
  async sendEmail(emailData) {
    try {
      const { to, subject, html, text, attachments = [] } = emailData;
      
      if (!to || !subject || (!html && !text)) {
        throw new Error('Missing required email fields');
      }

      let result;
      switch (this.activeProvider) {
        case 'sendgrid':
          result = await this.sendViaSendGrid(emailData);
          break;
        case 'mailgun':
          result = await this.sendViaMailgun(emailData);
          break;
        case 'smtp':
          result = await this.sendViaSMTP(emailData);
          break;
        default:
          throw new Error(`Unsupported email provider: ${this.activeProvider}`);
      }

      this.logEmailEvent('email_sent', {
        provider: this.activeProvider,
        to: Array.isArray(to) ? to.length : 1,
        subject
      });

      return result;
    } catch (error) {
      this.logEmailEvent('email_failed', {
        provider: this.activeProvider,
        error: error.message,
        to: emailData.to,
        subject: emailData.subject
      }, 'error');
      
      // Try fallback provider if available
      if (this.activeProvider !== 'smtp' && this.providers.smtp) {
        try {
          const result = await this.sendViaSMTP(emailData);
          this.logEmailEvent('email_sent_fallback', {
            provider: 'smtp',
            to: Array.isArray(emailData.to) ? emailData.to.length : 1,
            subject: emailData.subject
          });
          return result;
        } catch (fallbackError) {
          this.logEmailEvent('email_fallback_failed', {
            error: fallbackError.message
          }, 'error');
        }
      }
      
      throw error;
    }
  }

  // SendGrid implementation
  async sendViaSendGrid(emailData) {
    const { to, subject, html, text, from, attachments = [] } = emailData;
    
    const payload = {
      personalizations: [{
        to: Array.isArray(to) ? to.map(email => ({ email })) : [{ email: to }],
        subject
      }],
      from: { email: from || process.env.FROM_EMAIL || 'noreply@snatchers.in' },
      content: []
    };

    if (html) {
      payload.content.push({ type: 'text/html', value: html });
    }
    if (text) {
      payload.content.push({ type: 'text/plain', value: text });
    }

    // Handle attachments
    if (attachments.length > 0) {
      payload.attachments = attachments.map(att => ({
        content: att.content,
        filename: att.filename,
        type: att.contentType || 'application/octet-stream'
      }));
    }

    const response = await axios.post(
      this.providers.sendgrid.baseUrl,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${this.providers.sendgrid.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return { success: true, messageId: response.headers['x-message-id'] };
  }

  // Mailgun implementation
  async sendViaMailgun(emailData) {
    const { to, subject, html, text, from, attachments = [] } = emailData;
    
    const formData = new FormData();
    formData.append('from', from || process.env.FROM_EMAIL || 'noreply@snatchers.in');
    formData.append('to', Array.isArray(to) ? to.join(',') : to);
    formData.append('subject', subject);
    
    if (html) formData.append('html', html);
    if (text) formData.append('text', text);

    // Handle attachments
    attachments.forEach((att, index) => {
      formData.append(`attachment[${index}]`, att.content, att.filename);
    });

    const response = await axios.post(
      this.providers.mailgun.baseUrl,
      formData,
      {
        auth: {
          username: 'api',
          password: this.providers.mailgun.apiKey
        },
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );

    return { success: true, messageId: response.data.id };
  }

  // SMTP implementation
  async sendViaSMTP(emailData) {
    const { to, subject, html, text, from, attachments = [] } = emailData;
    
    const mailOptions = {
      from: from || process.env.FROM_EMAIL || 'noreply@snatchers.in',
      to: Array.isArray(to) ? to.join(',') : to,
      subject,
      html,
      text,
      attachments
    };

    const result = await this.providers.smtp.sendMail(mailOptions);
    return { success: true, messageId: result.messageId };
  }

  // Template-based email sending
  async sendTemplateEmail(templateName, recipientData, templateData = {}) {
    try {
      const template = this.templates[templateName];
      if (!template) {
        throw new Error(`Template not found: ${templateName}`);
      }

      const { to, name } = recipientData;
      const subject = this.processTemplate(template.subject, { name, ...templateData });
      const html = this.processTemplate(template.html, { name, ...templateData });
      const text = this.processTemplate(template.text, { name, ...templateData });

      return await this.sendEmail({
        to,
        subject,
        html,
        text
      });
    } catch (error) {
      this.logEmailEvent('template_email_failed', {
        template: templateName,
        error: error.message,
        recipient: recipientData.to
      }, 'error');
      throw error;
    }
  }

  // Process template with variables
  processTemplate(template, data) {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] || match;
    });
  }

  // Bulk email sending with rate limiting
  async sendBulkEmails(emails, options = {}) {
    const { batchSize = 10, delayMs = 1000 } = options;
    const results = [];
    
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      const batchPromises = batch.map(email => 
        this.sendEmail(email).catch(error => ({ error: error.message, email }))
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Add delay between batches to avoid rate limiting
      if (i + batchSize < emails.length) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    
    const successful = results.filter(r => !r.error).length;
    const failed = results.filter(r => r.error).length;
    
    this.logEmailEvent('bulk_email_completed', {
      total: emails.length,
      successful,
      failed,
      provider: this.activeProvider
    });
    
    return { successful, failed, results };
  }

  // Email verification
  async verifyEmailAddress(email) {
    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { valid: false, reason: 'Invalid email format' };
    }

    // Additional verification could be added here (DNS lookup, etc.)
    return { valid: true };
  }

  // Get email analytics
  async getEmailAnalytics(startDate, endDate) {
    // This would typically query your database for email logs
    // For now, return a basic structure
    return {
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      bounced: 0,
      complaints: 0,
      period: { startDate, endDate },
      provider: this.activeProvider
    };
  }

  // Email templates
  getWelcomeTemplate() {
    return {
      subject: 'Welcome to Snatchers, {{name}}!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Welcome to Snatchers!</h1>
          <p>Hi {{name}},</p>
          <p>Thank you for joining Snatchers! We're excited to have you as part of our community.</p>
          <p>Start exploring our amazing products and enjoy exclusive deals.</p>
          <a href="{{shopUrl}}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Start Shopping</a>
          <p>Best regards,<br>The Snatchers Team</p>
        </div>
      `,
      text: 'Welcome to Snatchers, {{name}}! Thank you for joining us. Start shopping at {{shopUrl}}'
    };
  }

  getOrderConfirmationTemplate() {
    return {
      subject: 'Order Confirmation - #{{orderNumber}}',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Order Confirmed!</h1>
          <p>Hi {{name}},</p>
          <p>Your order #{{orderNumber}} has been confirmed and is being processed.</p>
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Order Details:</h3>
            <p><strong>Order Number:</strong> {{orderNumber}}</p>
            <p><strong>Total Amount:</strong> {{totalAmount}}</p>
            <p><strong>Estimated Delivery:</strong> {{estimatedDelivery}}</p>
          </div>
          <a href="{{trackingUrl}}" style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Track Your Order</a>
          <p>Thank you for shopping with us!</p>
        </div>
      `,
      text: 'Order #{{orderNumber}} confirmed! Total: {{totalAmount}}. Track at {{trackingUrl}}'
    };
  }

  getOrderShippedTemplate() {
    return {
      subject: 'Your Order is on the Way! - #{{orderNumber}}',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Your Order is Shipped!</h1>
          <p>Hi {{name}},</p>
          <p>Great news! Your order #{{orderNumber}} has been shipped and is on its way to you.</p>
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Tracking Number:</strong> {{trackingNumber}}</p>
            <p><strong>Carrier:</strong> {{carrier}}</p>
            <p><strong>Expected Delivery:</strong> {{expectedDelivery}}</p>
          </div>
          <a href="{{trackingUrl}}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Track Package</a>
        </div>
      `,
      text: 'Order #{{orderNumber}} shipped! Tracking: {{trackingNumber}}. Track at {{trackingUrl}}'
    };
  }

  getPasswordResetTemplate() {
    return {
      subject: 'Reset Your Password - Snatchers',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Reset Your Password</h1>
          <p>Hi {{name}},</p>
          <p>You requested to reset your password. Click the button below to create a new password:</p>
          <a href="{{resetUrl}}" style="background: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Reset Password</a>
          <p>This link will expire in 1 hour for security reasons.</p>
          <p>If you didn't request this, please ignore this email.</p>
        </div>
      `,
      text: 'Reset your password at {{resetUrl}}. Link expires in 1 hour.'
    };
  }

  getPromotionalTemplate() {
    return {
      subject: '{{title}} - Special Offer Inside!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">{{title}}</h1>
          <p>Hi {{name}},</p>
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <h2 style="margin: 0;">{{offerTitle}}</h2>
            <p style="font-size: 18px; margin: 10px 0;">{{offerDescription}}</p>
            <p style="font-size: 24px; font-weight: bold; margin: 0;">{{discount}}</p>
          </div>
          <p>{{content}}</p>
          <a href="{{shopUrl}}" style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Shop Now</a>
          <p><small>Offer valid until {{expiryDate}}</small></p>
        </div>
      `,
      text: '{{title}} - {{offerDescription}} {{discount}}. Shop at {{shopUrl}}. Valid until {{expiryDate}}'
    };
  }

  getAbandonedCartTemplate() {
    return {
      subject: 'Don\'t Forget Your Items, {{name}}!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">You Left Something Behind!</h1>
          <p>Hi {{name}},</p>
          <p>You have {{itemCount}} item(s) waiting in your cart. Complete your purchase before they're gone!</p>
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Your Cart:</h3>
            <p><strong>Total Value:</strong> {{cartTotal}}</p>
            <p><strong>Items:</strong> {{itemCount}}</p>
          </div>
          <a href="{{cartUrl}}" style="background: #ff6b35; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Complete Purchase</a>
          <p>Hurry! Items in your cart are in high demand.</p>
        </div>
      `,
      text: 'Complete your purchase! {{itemCount}} items worth {{cartTotal}} waiting. Shop at {{cartUrl}}'
    };
  }

  getPriceDropAlertTemplate() {
    return {
      subject: 'Price Drop Alert: {{productName}}',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Price Drop Alert!</h1>
          <p>Hi {{name}},</p>
          <p>Great news! The price of {{productName}} has dropped!</p>
          <div style="background: #d4edda; border: 1px solid #c3e6cb; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>{{productName}}</h3>
            <p><strong>Was:</strong> <span style="text-decoration: line-through;">{{oldPrice}}</span></p>
            <p><strong>Now:</strong> <span style="color: #28a745; font-size: 24px; font-weight: bold;">{{newPrice}}</span></p>
            <p><strong>You Save:</strong> {{savings}}</p>
          </div>
          <a href="{{productUrl}}" style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Buy Now</a>
        </div>
      `,
      text: 'Price drop! {{productName}} now {{newPrice}} (was {{oldPrice}}). Buy at {{productUrl}}'
    };
  }

  getBackInStockTemplate() {
    return {
      subject: 'Back in Stock: {{productName}}',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">It's Back!</h1>
          <p>Hi {{name}},</p>
          <p>{{productName}} is back in stock! Don't miss out this time.</p>
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>{{productName}}</h3>
            <p><strong>Price:</strong> {{price}}</p>
            <p><strong>Stock:</strong> Limited quantity available</p>
          </div>
          <a href="{{productUrl}}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Shop Now</a>
          <p>Hurry! Limited stock available.</p>
        </div>
      `,
      text: '{{productName}} is back in stock! Price: {{price}}. Shop at {{productUrl}}'
    };
  }

  // Email event logging
  logEmailEvent(event, data, level = 'info') {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      level,
      service: 'EmailService',
      data: {
        ...data,
        // Remove sensitive data
        apiKey: undefined,
        password: undefined
      }
    };

    if (level === 'error') {
      console.error(`[Email Service] ${JSON.stringify(logEntry)}`);
    } else if (level === 'warn') {
      console.warn(`[Email Service] ${JSON.stringify(logEntry)}`);
    } else {
      console.log(`[Email Service] ${JSON.stringify(logEntry)}`);
    }
  }

  // Test email configuration
  async testConfiguration() {
    try {
      const testEmail = {
        to: process.env.TEST_EMAIL || 'test@example.com',
        subject: 'Email Service Test',
        html: '<h1>Test Email</h1><p>Email service is working correctly!</p>',
        text: 'Test Email - Email service is working correctly!'
      };

      const result = await this.sendEmail(testEmail);
      return { success: true, provider: this.activeProvider, result };
    } catch (error) {
      return { success: false, provider: this.activeProvider, error: error.message };
    }
  }
}

export default new EmailService();
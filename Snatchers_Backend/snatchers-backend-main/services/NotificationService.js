import nodemailer from 'nodemailer';
import cron from 'node-cron';
import User from '../models/User.js';
import Cart from '../models/Cart.js';
import Product from '../models/Product.js';

class NotificationService {
  constructor() {
    // nodemailer uses createTransport
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    // Initialize abandoned cart reminder cron job
    this.initializeAbandonedCartReminders();
  }

  // Initialize cron job for abandoned cart reminders
  initializeAbandonedCartReminders() {
    // Run every hour to check for abandoned carts
    cron.schedule('0 * * * *', async () => {
      await this.sendAbandonedCartReminders();
    });
  }

  async sendOrderConfirmation(order) {
    try {
      const user = await User.findById(order.user);
      if (!user || !user.preferences?.notifications?.email) return;

      const emailTemplate = this.getOrderConfirmationTemplate(order);
      
      await this.transporter.sendMail({
        from: process.env.FROM_EMAIL || 'noreply@snatchers.in',
        to: order.customerEmail,
        subject: `Order Confirmation - ${order.orderId}`,
        html: emailTemplate
      });

      console.log(`Order confirmation email sent for order ${order.orderId}`);
    } catch (error) {
      console.error('Failed to send order confirmation email:', error);
    }
  }

  async sendOrderStatusUpdate(order, previousStatus) {
    try {
      const user = await User.findById(order.user);
      if (!user || !user.preferences?.notifications?.email) return;

      const emailTemplate = this.getOrderStatusTemplate(order, previousStatus);
      
      await this.transporter.sendMail({
        from: process.env.FROM_EMAIL || 'noreply@snatchers.in',
        to: order.customerEmail,
        subject: `Order Update - ${order.orderId}`,
        html: emailTemplate
      });

      console.log(`Order status update email sent for order ${order.orderId}`);
    } catch (error) {
      console.error('Failed to send order status update email:', error);
    }
  }

  async sendOrderCancellation(order) {
    try {
      const user = await User.findById(order.user);
      if (!user || !user.preferences?.notifications?.email) return;

      const emailTemplate = this.getOrderCancellationTemplate(order);
      
      await this.transporter.sendMail({
        from: process.env.FROM_EMAIL || 'noreply@snatchers.in',
        to: order.customerEmail,
        subject: `Order Cancelled - ${order.orderId}`,
        html: emailTemplate
      });

      console.log(`Order cancellation email sent for order ${order.orderId}`);
    } catch (error) {
      console.error('Failed to send order cancellation email:', error);
    }
  }

  async sendOrderDelivered(order) {
    try {
      const user = await User.findById(order.user);
      if (!user || !user.preferences?.notifications?.email) return;

      const emailTemplate = this.getOrderDeliveredTemplate(order);
      
      await this.transporter.sendMail({
        from: process.env.FROM_EMAIL || 'noreply@snatchers.in',
        to: order.customerEmail,
        subject: `Order Delivered - ${order.orderId}`,
        html: emailTemplate
      });

      console.log(`Order delivered email sent for order ${order.orderId}`);
    } catch (error) {
      console.error('Failed to send order delivered email:', error);
    }
  }

  // New comprehensive email notification methods
  async sendWelcomeEmail(user) {
    try {
      if (!user.preferences?.notifications?.email) return;

      const emailTemplate = this.getWelcomeTemplate(user);
      
      await this.transporter.sendMail({
        from: process.env.FROM_EMAIL || 'noreply@snatchers.in',
        to: user.email,
        subject: 'Welcome to Snatchers!',
        html: emailTemplate
      });

      console.log(`Welcome email sent to ${user.email}`);
    } catch (error) {
      console.error('Failed to send welcome email:', error);
    }
  }

  async sendPromotionalEmail(users, promotion) {
    try {
      const emailTemplate = this.getPromotionalTemplate(promotion);
      
      for (const user of users) {
        if (!user.preferences?.notifications?.email) continue;
        
        try {
          await this.transporter.sendMail({
            from: process.env.FROM_EMAIL || 'noreply@snatchers.in',
            to: user.email,
            subject: promotion.subject,
            html: emailTemplate
          });
          
          // Add small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`Failed to send promotional email to ${user.email}:`, error);
        }
      }

      console.log(`Promotional email sent to ${users.length} users`);
    } catch (error) {
      console.error('Failed to send promotional emails:', error);
    }
  }

  async sendAbandonedCartReminder(user, cart) {
    try {
      if (!user.preferences?.notifications?.email) return;

      const emailTemplate = this.getAbandonedCartTemplate(user, cart);
      
      await this.transporter.sendMail({
        from: process.env.FROM_EMAIL || 'noreply@snatchers.in',
        to: user.email,
        subject: 'Don\'t forget your items!',
        html: emailTemplate
      });

      console.log(`Abandoned cart reminder sent to ${user.email}`);
    } catch (error) {
      console.error('Failed to send abandoned cart reminder:', error);
    }
  }

  async sendAbandonedCartReminders() {
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      // Find carts that were updated 24 hours ago and haven't been reminded
      const abandonedCarts = await Cart.find({
        updatedAt: { $lte: twentyFourHoursAgo },
        items: { $exists: true, $not: { $size: 0 } },
        reminderSent: { $ne: true }
      }).populate('user').populate('items.product');

      for (const cart of abandonedCarts) {
        if (cart.user) {
          await this.sendAbandonedCartReminder(cart.user, cart);
          
          // Mark as reminded to avoid duplicate emails
          await Cart.findByIdAndUpdate(cart._id, { reminderSent: true });
        }
      }

      console.log(`Processed ${abandonedCarts.length} abandoned cart reminders`);
    } catch (error) {
      console.error('Failed to process abandoned cart reminders:', error);
    }
  }

  async sendPasswordResetEmail(user, resetToken) {
    try {
      const emailTemplate = this.getPasswordResetTemplate(user, resetToken);
      
      await this.transporter.sendMail({
        from: process.env.FROM_EMAIL || 'noreply@snatchers.in',
        to: user.email,
        subject: 'Password Reset Request',
        html: emailTemplate
      });

      console.log(`Password reset email sent to ${user.email}`);
    } catch (error) {
      console.error('Failed to send password reset email:', error);
    }
  }

  async sendAccountUpdateEmail(user, updateType) {
    try {
      if (!user.preferences?.notifications?.email) return;

      const emailTemplate = this.getAccountUpdateTemplate(user, updateType);
      
      await this.transporter.sendMail({
        from: process.env.FROM_EMAIL || 'noreply@snatchers.in',
        to: user.email,
        subject: 'Account Update Confirmation',
        html: emailTemplate
      });

      console.log(`Account update email sent to ${user.email}`);
    } catch (error) {
      console.error('Failed to send account update email:', error);
    }
  }

  async sendPriceDropAlert(user, product, oldPrice, newPrice) {
    try {
      if (!user.preferences?.notifications?.email) return;

      const emailTemplate = this.getPriceDropTemplate(user, product, oldPrice, newPrice);
      
      await this.transporter.sendMail({
        from: process.env.FROM_EMAIL || 'noreply@snatchers.in',
        to: user.email,
        subject: `Price Drop Alert: ${product.title}`,
        html: emailTemplate
      });

      console.log(`Price drop alert sent to ${user.email} for product ${product._id}`);
    } catch (error) {
      console.error('Failed to send price drop alert:', error);
    }
  }

  async sendBackInStockAlert(user, product) {
    try {
      if (!user.preferences?.notifications?.email) return;

      const emailTemplate = this.getBackInStockTemplate(user, product);
      
      await this.transporter.sendMail({
        from: process.env.FROM_EMAIL || 'noreply@snatchers.in',
        to: user.email,
        subject: `Back in Stock: ${product.title}`,
        html: emailTemplate
      });

      console.log(`Back in stock alert sent to ${user.email} for product ${product._id}`);
    } catch (error) {
      console.error('Failed to send back in stock alert:', error);
    }
  }

  // Email template methods
  ge
tOrderConfirmationTemplate(order) {
    const itemsHtml = order.items?.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">
          <img src="${item.productImage}" alt="${item.productTitle}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;">
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">
          <strong>${item.productTitle}</strong><br>
          <small>Quantity: ${item.quantity}</small>
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">
          ₹${item.totalPrice?.toLocaleString()}
        </td>
      </tr>
    `).join('') || '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Order Confirmation</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h1 style="color: #28a745; margin: 0;">Order Confirmed!</h1>
          <p style="margin: 10px 0 0 0;">Thank you for your order. We're preparing it for shipment.</p>
        </div>
        
        <div style="background: white; border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h2 style="margin-top: 0;">Order Details</h2>
          <p><strong>Order ID:</strong> ${order.orderId}</p>
          <p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
          <p><strong>Status:</strong> ${order.status}</p>
        </div>

        ${order.items?.length ? `
        <div style="background: white; border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h2 style="margin-top: 0;">Items Ordered</h2>
          <table style="width: 100%; border-collapse: collapse;">
            ${itemsHtml}
          </table>
          <div style="text-align: right; margin-top: 15px; padding-top: 15px; border-top: 2px solid #333;">
            <strong>Total: ₹${order.totalAmount?.toLocaleString()}</strong>
          </div>
        </div>
        ` : ''}

        <div style="background: white; border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h2 style="margin-top: 0;">What's Next?</h2>
          <p>• We'll send you tracking information once your order ships</p>
          <p>• Estimated delivery: ${order.shipping?.estimatedDelivery ? new Date(order.shipping.estimatedDelivery).toLocaleDateString() : '5-7 business days'}</p>
          <p>• You can track your order anytime at <a href="${process.env.FRONTEND_URL}/orders/${order.orderId}">Track Order</a></p>
        </div>

        <div style="text-align: center; color: #666; font-size: 14px;">
          <p>Questions? Contact us at <a href="mailto:support@snatchers.in">support@snatchers.in</a></p>
          <p>© 2024 Snatchers. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;
  }

  getOrderStatusTemplate(order, previousStatus) {
    const statusMessages = {
      'Confirmed': 'Your order has been confirmed and is being prepared.',
      'Processing': 'Your order is currently being processed.',
      'Packed': 'Your order has been packed and is ready for shipment.',
      'Shipped': 'Great news! Your order has been shipped.',
      'Out for Delivery': 'Your order is out for delivery and will arrive soon.',
      'Delivered': 'Your order has been delivered successfully!'
    };

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Order Status Update</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h1 style="color: #007bff; margin: 0;">Order Status Update</h1>
          <p style="margin: 10px 0 0 0;">Your order status has been updated.</p>
        </div>
        
        <div style="background: white; border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h2 style="margin-top: 0;">Order #${order.orderId}</h2>
          <p><strong>New Status:</strong> <span style="color: #28a745; font-weight: bold;">${order.status}</span></p>
          <p>${statusMessages[order.status] || 'Your order status has been updated.'}</p>
          
          ${order.shipping?.trackingNumber ? `
            <p><strong>Tracking Number:</strong> ${order.shipping.trackingNumber}</p>
          ` : ''}
          
          ${order.shipping?.estimatedDelivery ? `
            <p><strong>Estimated Delivery:</strong> ${new Date(order.shipping.estimatedDelivery).toLocaleDateString()}</p>
          ` : ''}
        </div>

        <div style="text-align: center; margin: 20px 0;">
          <a href="${process.env.FRONTEND_URL}/orders/${order.orderId}" 
             style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            Track Your Order
          </a>
        </div>

        <div style="text-align: center; color: #666; font-size: 14px;">
          <p>Questions? Contact us at <a href="mailto:support@snatchers.in">support@snatchers.in</a></p>
          <p>© 2024 Snatchers. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;
  }

  getOrderCancellationTemplate(order) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Order Cancelled</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h1 style="color: #dc3545; margin: 0;">Order Cancelled</h1>
          <p style="margin: 10px 0 0 0;">Your order has been successfully cancelled.</p>
        </div>
        
        <div style="background: white; border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h2 style="margin-top: 0;">Cancellation Details</h2>
          <p><strong>Order ID:</strong> ${order.orderId}</p>
          <p><strong>Cancelled On:</strong> ${new Date().toLocaleDateString()}</p>
          <p><strong>Refund Amount:</strong> ₹${order.totalAmount?.toLocaleString()}</p>
          
          ${order.cancellationReason ? `
            <p><strong>Reason:</strong> ${order.cancellationReason}</p>
          ` : ''}
        </div>

        <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h3 style="margin-top: 0; color: #856404;">Refund Information</h3>
          <p>Your refund will be processed within 5-7 business days and credited back to your original payment method.</p>
        </div>

        <div style="text-align: center; color: #666; font-size: 14px;">
          <p>Questions? Contact us at <a href="mailto:support@snatchers.in">support@snatchers.in</a></p>
          <p>© 2024 Snatchers. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;
  }

  getOrderDeliveredTemplate(order) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Order Delivered</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h1 style="color: #28a745; margin: 0;">Order Delivered!</h1>
          <p style="margin: 10px 0 0 0;">Your order has been successfully delivered.</p>
        </div>
        
        <div style="background: white; border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h2 style="margin-top: 0;">Delivery Confirmation</h2>
          <p><strong>Order ID:</strong> ${order.orderId}</p>
          <p><strong>Delivered On:</strong> ${new Date().toLocaleDateString()}</p>
          <p><strong>Total Amount:</strong> ₹${order.totalAmount?.toLocaleString()}</p>
        </div>

        <div style="background: #d1ecf1; border: 1px solid #bee5eb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h3 style="margin-top: 0; color: #0c5460;">What's Next?</h3>
          <p>• We hope you love your purchase!</p>
          <p>• If you have any issues, you can return items within 7 days</p>
          <p>• Don't forget to leave a review to help other customers</p>
        </div>

        <div style="text-align: center; margin: 20px 0;">
          <a href="${process.env.FRONTEND_URL}/orders/${order.orderId}" 
             style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin-right: 10px;">
            View Order
          </a>
          <a href="${process.env.FRONTEND_URL}/orders/${order.orderId}/review" 
             style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            Write Review
          </a>
        </div>

        <div style="text-align: center; color: #666; font-size: 14px;">
          <p>Questions? Contact us at <a href="mailto:support@snatchers.in">support@snatchers.in</a></p>
          <p>© 2024 Snatchers. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;
  }

  // New email templates
  getWelcomeTemplate(user) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Welcome to Snatchers</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Snatchers!</h1>
          <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Your journey to amazing deals starts here</p>
        </div>
        
        <div style="background: white; border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h2 style="margin-top: 0;">Hi ${user.profile?.firstName || user.name || 'there'}!</h2>
          <p>Thank you for joining Snatchers, your ultimate destination for amazing products at unbeatable prices.</p>
          
          <h3>What you can do now:</h3>
          <ul style="padding-left: 20px;">
            <li>Browse thousands of products across all categories</li>
            <li>Create wishlists and get price drop alerts</li>
            <li>Enjoy fast and secure checkout</li>
            <li>Track your orders in real-time</li>
            <li>Leave reviews and help other shoppers</li>
          </ul>
        </div>

        <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h3 style="margin-top: 0; color: #28a745;">Special Welcome Offer!</h3>
          <p>Use code <strong style="background: #fff; padding: 4px 8px; border-radius: 4px; color: #28a745;">WELCOME10</strong> to get 10% off your first order!</p>
        </div>

        <div style="text-align: center; margin: 20px 0;">
          <a href="${process.env.FRONTEND_URL}" 
             style="background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 4px; display: inline-block; font-size: 16px;">
            Start Shopping
          </a>
        </div>

        <div style="text-align: center; color: #666; font-size: 14px;">
          <p>Questions? Contact us at <a href="mailto:support@snatchers.in">support@snatchers.in</a></p>
          <p>© 2024 Snatchers. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;
  }

  getPromotionalTemplate(promotion) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${promotion.title}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: ${promotion.backgroundColor || '#ff6b6b'}; padding: 30px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">${promotion.title}</h1>
          ${promotion.subtitle ? `<p style="color: white; margin: 10px 0 0 0; font-size: 16px;">${promotion.subtitle}</p>` : ''}
        </div>
        
        <div style="background: white; border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          ${promotion.content}
          
          ${promotion.discount ? `
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px; margin: 20px 0; text-align: center;">
              <h3 style="margin: 0; color: #856404;">Special Offer</h3>
              <p style="margin: 5px 0; font-size: 18px; font-weight: bold;">${promotion.discount}% OFF</p>
              ${promotion.code ? `<p style="margin: 5px 0;">Use code: <strong style="background: #fff; padding: 4px 8px; border-radius: 4px;">${promotion.code}</strong></p>` : ''}
            </div>
          ` : ''}
          
          ${promotion.validUntil ? `
            <p style="color: #dc3545; font-weight: bold;">⏰ Valid until: ${new Date(promotion.validUntil).toLocaleDateString()}</p>
          ` : ''}
        </div>

        <div style="text-align: center; margin: 20px 0;">
          <a href="${promotion.ctaLink || process.env.FRONTEND_URL}" 
             style="background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 4px; display: inline-block; font-size: 16px;">
            ${promotion.ctaText || 'Shop Now'}
          </a>
        </div>

        <div style="text-align: center; color: #666; font-size: 12px;">
          <p>Don't want to receive promotional emails? <a href="${process.env.FRONTEND_URL}/unsubscribe">Unsubscribe here</a></p>
          <p>© 2024 Snatchers. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;
  }

  getAbandonedCartTemplate(user, cart) {
    const itemsHtml = cart.items?.slice(0, 3).map(item => `
      <tr>
        <td style="padding: 10px;">
          <img src="${item.product?.images?.[0] || '/placeholder.jpg'}" alt="${item.product?.title}" 
               style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px;">
        </td>
        <td style="padding: 10px;">
          <strong>${item.product?.title}</strong><br>
          <small>Quantity: ${item.quantity}</small><br>
          <span style="color: #28a745; font-weight: bold;">₹${item.product?.offerPrice || item.product?.price}</span>
        </td>
      </tr>
    `).join('') || '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Don't forget your items!</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h1 style="color: #007bff; margin: 0;">Don't forget your items!</h1>
          <p style="margin: 10px 0 0 0;">Hi ${user.profile?.firstName || user.name || 'there'}, you left some great items in your cart.</p>
        </div>
        
        <div style="background: white; border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h2 style="margin-top: 0;">Your Cart Items</h2>
          <table style="width: 100%;">
            ${itemsHtml}
          </table>
          
          ${cart.items?.length > 3 ? `
            <p style="text-align: center; color: #666; margin-top: 15px;">
              +${cart.items.length - 3} more items in your cart
            </p>
          ` : ''}
        </div>

        <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin-bottom: 20px; text-align: center;">
          <h3 style="margin-top: 0; color: #856404;">Limited Time Offer!</h3>
          <p>Complete your purchase in the next 24 hours and get <strong>5% OFF</strong></p>
          <p>Use code: <strong style="background: #fff; padding: 4px 8px; border-radius: 4px;">CART5</strong></p>
        </div>

        <div style="text-align: center; margin: 20px 0;">
          <a href="${process.env.FRONTEND_URL}/cart" 
             style="background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 4px; display: inline-block; font-size: 16px;">
            Complete Your Purchase
          </a>
        </div>

        <div style="text-align: center; color: #666; font-size: 14px;">
          <p>Questions? Contact us at <a href="mailto:support@snatchers.in">support@snatchers.in</a></p>
          <p>© 2024 Snatchers. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;
  }

  getPasswordResetTemplate(user, resetToken) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Password Reset Request</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h1 style="color: #dc3545; margin: 0;">Password Reset Request</h1>
          <p style="margin: 10px 0 0 0;">We received a request to reset your password.</p>
        </div>
        
        <div style="background: white; border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h2 style="margin-top: 0;">Hi ${user.profile?.firstName || user.name || 'there'}!</h2>
          <p>Click the button below to reset your password. This link will expire in 1 hour for security reasons.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/reset-password?token=${resetToken}" 
               style="background: #dc3545; color: white; padding: 15px 30px; text-decoration: none; border-radius: 4px; display: inline-block; font-size: 16px;">
              Reset Password
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px;">If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>
        </div>

        <div style="background: #d1ecf1; border: 1px solid #bee5eb; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
          <p style="margin: 0; color: #0c5460;"><strong>Security Tip:</strong> Always use a strong, unique password and never share it with anyone.</p>
        </div>

        <div style="text-align: center; color: #666; font-size: 14px;">
          <p>Questions? Contact us at <a href="mailto:support@snatchers.in">support@snatchers.in</a></p>
          <p>© 2024 Snatchers. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;
  }

  getAccountUpdateTemplate(user, updateType) {
    const updateMessages = {
      'profile': 'Your profile information has been updated successfully.',
      'email': 'Your email address has been changed successfully.',
      'password': 'Your password has been changed successfully.',
      'address': 'Your address information has been updated.',
      'preferences': 'Your account preferences have been updated.'
    };

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Account Update Confirmation</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h1 style="color: #28a745; margin: 0;">Account Updated</h1>
          <p style="margin: 10px 0 0 0;">Your account information has been successfully updated.</p>
        </div>
        
        <div style="background: white; border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h2 style="margin-top: 0;">Hi ${user.profile?.firstName || user.name || 'there'}!</h2>
          <p>${updateMessages[updateType] || 'Your account has been updated successfully.'}</p>
          <p><strong>Updated on:</strong> ${new Date().toLocaleString()}</p>
          
          ${updateType === 'password' || updateType === 'email' ? `
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #856404;"><strong>Security Notice:</strong> If you didn't make this change, please contact our support team immediately.</p>
            </div>
          ` : ''}
        </div>

        <div style="text-align: center; margin: 20px 0;">
          <a href="${process.env.FRONTEND_URL}/profile" 
             style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            View Account
          </a>
        </div>

        <div style="text-align: center; color: #666; font-size: 14px;">
          <p>Questions? Contact us at <a href="mailto:support@snatchers.in">support@snatchers.in</a></p>
          <p>© 2024 Snatchers. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;
  }

  getPriceDropTemplate(user, product, oldPrice, newPrice) {
    const discount = Math.round(((oldPrice - newPrice) / oldPrice) * 100);
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Price Drop Alert</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">🔥 Price Drop Alert!</h1>
          <p style="color: white; margin: 10px 0 0 0;">Your wishlist item is now cheaper!</p>
        </div>
        
        <div style="background: white; border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <div style="display: flex; align-items: center; margin-bottom: 20px;">
            <img src="${product.images?.[0] || '/placeholder.jpg'}" alt="${product.title}" 
                 style="width: 100px; height: 100px; object-fit: cover; border-radius: 8px; margin-right: 20px;">
            <div>
              <h2 style="margin: 0 0 10px 0;">${product.title}</h2>
              <div style="font-size: 18px;">
                <span style="color: #dc3545; text-decoration: line-through;">₹${oldPrice.toLocaleString()}</span>
                <span style="color: #28a745; font-weight: bold; margin-left: 10px;">₹${newPrice.toLocaleString()}</span>
              </div>
              <div style="background: #28a745; color: white; padding: 4px 8px; border-radius: 4px; display: inline-block; margin-top: 5px;">
                ${discount}% OFF
              </div>
            </div>
          </div>
          
          <p>Hi ${user.profile?.firstName || user.name || 'there'}! Great news - the price of this item in your wishlist has dropped!</p>
        </div>

        <div style="text-align: center; margin: 20px 0;">
          <a href="${process.env.FRONTEND_URL}/product/${product.seo?.slug || product._id}" 
             style="background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 4px; display: inline-block; font-size: 16px; margin-right: 10px;">
            Buy Now
          </a>
          <a href="${process.env.FRONTEND_URL}/wishlist" 
             style="background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 4px; display: inline-block; font-size: 16px;">
            View Wishlist
          </a>
        </div>

        <div style="text-align: center; color: #666; font-size: 14px;">
          <p>Questions? Contact us at <a href="mailto:support@snatchers.in">support@snatchers.in</a></p>
          <p>© 2024 Snatchers. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;
  }

  getBackInStockTemplate(user, product) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Back in Stock</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">📦 Back in Stock!</h1>
          <p style="color: white; margin: 10px 0 0 0;">Your wishlist item is available again!</p>
        </div>
        
        <div style="background: white; border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <div style="display: flex; align-items: center; margin-bottom: 20px;">
            <img src="${product.images?.[0] || '/placeholder.jpg'}" alt="${product.title}" 
                 style="width: 100px; height: 100px; object-fit: cover; border-radius: 8px; margin-right: 20px;">
            <div>
              <h2 style="margin: 0 0 10px 0;">${product.title}</h2>
              <div style="font-size: 18px; color: #28a745; font-weight: bold;">
                ₹${(product.offerPrice || product.price).toLocaleString()}
              </div>
              <div style="background: #28a745; color: white; padding: 4px 8px; border-radius: 4px; display: inline-block; margin-top: 5px;">
                In Stock
              </div>
            </div>
          </div>
          
          <p>Hi ${user.profile?.firstName || user.name || 'there'}! The item you've been waiting for is back in stock. Don't miss out this time!</p>
        </div>

        <div style="text-align: center; margin: 20px 0;">
          <a href="${process.env.FRONTEND_URL}/product/${product.seo?.slug || product._id}" 
             style="background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 4px; display: inline-block; font-size: 16px; margin-right: 10px;">
            Buy Now
          </a>
          <a href="${process.env.FRONTEND_URL}/wishlist" 
             style="background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 4px; display: inline-block; font-size: 16px;">
            View Wishlist
          </a>
        </div>

        <div style="text-align: center; color: #666; font-size: 14px;">
          <p>Questions? Contact us at <a href="mailto:support@snatchers.in">support@snatchers.in</a></p>
          <p>© 2024 Snatchers. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;
  }
}

export default new NotificationService();
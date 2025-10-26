// routes/order.js
import express from "express";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import verifyToken from "../middleware/auth.js";
import mongoose from "mongoose";
import NotificationService from "../services/NotificationService.js";

const router = express.Router();

// Generate unique order ID
const generateOrderId = () => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `ORD-${timestamp}-${random}`.toUpperCase();
};

// Enhanced create order handler for checkout
const createOrderHandler = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.user?.sub || req.user?.uid || req.user?.['cognito:username'];
    const {
      items,
      shippingAddress,
      paymentMethod,
      paymentDetails,
      shippingMethod,
      specialInstructions,
      calculations,
      // Legacy fields for backward compatibility
      productId,
      productTitle,
      productImage,
      price,
      address,
      city,
      state,
      pincode,
      phone,
      paymentId,
      customerEmail,
      customerName
    } = req.body;

    // Get user information
    const user = await User.findOne({ 
      $or: [
        { uid: userId },
        { email: customerEmail }
      ]
    }).session(session);

    if (!user && !customerEmail) {
      throw new Error('User not found and no customer email provided');
    }

    // Validate and process items
    let orderItems = [];
    let subtotal = 0;

    if (items && items.length > 0) {
      // Multi-item order (new checkout flow)
      for (const item of items) {
        const product = await Product.findById(item.productId || item.product?._id).session(session);
        if (!product) {
          throw new Error(`Product not found: ${item.productId}`);
        }

        // Check inventory
        if (product.inventory && product.inventory.trackInventory) {
          if (product.inventory.quantity < item.quantity) {
            throw new Error(`Insufficient inventory for ${product.title}. Available: ${product.inventory.quantity}, Requested: ${item.quantity}`);
          }
          
          // Update inventory
          product.inventory.quantity -= item.quantity;
          await product.save({ session });
        }

        const unitPrice = product.offerPrice || product.price;
        const totalPrice = unitPrice * item.quantity;
        subtotal += totalPrice;

        orderItems.push({
          product: product._id,
          productTitle: product.title,
          productImage: product.images?.[0] || '/product-placeholder.jpg',
          sku: product.sku,
          quantity: item.quantity,
          unitPrice,
          totalPrice,
          variant: item.selectedVariant,
          vendor: product.vendor
        });
      }
    } else if (productId) {
      // Single item order (legacy compatibility)
      const product = await Product.findById(productId).session(session);
      if (!product) {
        throw new Error(`Product not found: ${productId}`);
      }

      const quantity = 1;
      const unitPrice = product.offerPrice || product.price || price;
      subtotal = unitPrice * quantity;

      orderItems.push({
        product: product._id,
        productTitle: productTitle || product.title,
        productImage: productImage || product.images?.[0] || '/product-placeholder.jpg',
        sku: product.sku,
        quantity,
        unitPrice,
        totalPrice: subtotal,
        vendor: product.vendor
      });
    } else {
      throw new Error('No items provided for order');
    }

    // Create order data
    const orderId = generateOrderId();
    const orderData = {
      orderId,
      user: user?._id,
      userId: userId || user?.uid,
      customerEmail: customerEmail || user?.email,
      customerName: customerName || user?.name || user?.fullName,
      
      // Items
      items: orderItems,
      
      // Legacy single product fields (for backward compatibility)
      productId,
      productTitle,
      productImage,
      price,
      
      // Enhanced pricing
      subtotal: calculations?.subtotal || subtotal,
      shippingCost: calculations?.shipping || 0,
      taxAmount: calculations?.tax || 0,
      discountAmount: calculations?.discount || 0,
      totalAmount: calculations?.total || (subtotal + (calculations?.shipping || 0) + (calculations?.tax || 0) - (calculations?.discount || 0)),
      
      // Enhanced address information
      shippingAddress: shippingAddress ? {
        street: shippingAddress.street,
        city: shippingAddress.city,
        state: shippingAddress.state,
        zipCode: shippingAddress.zipCode,
        country: shippingAddress.country || 'India',
        phone: shippingAddress.phone
      } : undefined,
      
      // Legacy address fields (for backward compatibility)
      address,
      city,
      state,
      pincode,
      phone,
      
      // Enhanced payment information
      payment: {
        method: paymentMethod,
        paymentId: paymentId || `PAY-${orderId}`,
        transactionId: paymentDetails?.transactionId,
        gateway: paymentDetails?.gateway || 'razorpay',
        status: paymentMethod === 'cod' ? 'completed' : 'pending'
      },
      
      // Legacy payment field
      paymentId: paymentId || `PAY-${orderId}`,
      
      // Enhanced shipping information
      shipping: {
        method: shippingMethod || 'standard',
        estimatedDelivery: new Date(Date.now() + (shippingMethod === 'overnight' ? 1 : shippingMethod === 'express' ? 3 : 7) * 24 * 60 * 60 * 1000)
      },
      
      // Order metadata
      orderDate: new Date().toISOString().split('T')[0],
      notes: specialInstructions,
      status: 'Pending',
      statusHistory: [{
        status: 'Pending',
        timestamp: new Date(),
        note: 'Order placed successfully'
      }],
      
      // Analytics
      source: 'web'
    };

    const order = new Order(orderData);
    await order.save({ session });

    // Update user statistics
    if (user) {
      user.totalSpent = (user.totalSpent || 0) + orderData.totalAmount;
      await user.save({ session });
    }

    await session.commitTransaction();

    // Send notifications (async, don't wait)
    if (user) {
      NotificationService.sendOrderConfirmation(order).catch(console.error);
      Notification.createOrderNotification(user._id, 'order_confirmation', order).catch(console.error);
    }

    res.status(201).json({
      message: "Order placed successfully",
      order: {
        orderId: order.orderId,
        _id: order._id,
        status: order.status,
        totalAmount: order.totalAmount,
        estimatedDelivery: order.shipping?.estimatedDelivery
      }
    });
  } catch (err) {
    await session.abortTransaction();
    console.error("Order creation error:", err);
    res.status(500).json({
      message: "Error placing order",
      error: err.message,
    });
  } finally {
    session.endSession();
  }
};

// POST / and POST /create both create an order
router.post("/", verifyToken, createOrderHandler);
router.post("/create", verifyToken, createOrderHandler);

// GET: Fetch user's orders with filtering and pagination
router.get("/", verifyToken, async (req, res) => {
  try {
    const userId = req.user?.sub || req.user?.uid || req.user?.['cognito:username'];
    const { 
      page = 1, 
      limit = 10, 
      status, 
      dateRange, 
      search 
    } = req.query;

    // Build query
    const query = { userId };
    
    // Status filter
    if (status && status !== 'all') {
      query.status = status;
    }
    
    // Date range filter
    if (dateRange && dateRange !== 'all') {
      const now = new Date();
      let startDate;
      
      switch (dateRange) {
        case '7days':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30days':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90days':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case '1year':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
      }
      
      if (startDate) {
        query.createdAt = { $gte: startDate };
      }
    }
    
    // Search filter
    if (search) {
      query.$or = [
        { orderId: { $regex: search, $options: 'i' } },
        { 'items.productTitle': { $regex: search, $options: 'i' } },
        { productTitle: { $regex: search, $options: 'i' } } // Legacy support
      ];
    }

    // Execute query with pagination
    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('items.product', 'title images price offerPrice');

    const total = await Order.countDocuments(query);
    
    res.json({ 
      orders,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error("Orders fetch error:", err);
    res.status(500).json({ 
      message: "Error fetching orders", 
      error: err.message 
    });
  }
});

// GET: Fetch orders by email (for profile page)
router.get("/email/:email", verifyToken, async (req, res) => {
  try {
    const email = req.params.email;
    const orders = await Order.find({ customerEmail: email })
      .sort({ createdAt: -1 }); // Sort by newest first
    
    res.json({ orders });
  } catch (err) {
    console.error("Orders fetch error:", err);
    res.status(500).json({ 
      message: "Error fetching orders", 
      error: err.message 
    });
  }
});

// GET: Fetch specific order by ID
router.get("/:orderId", verifyToken, async (req, res) => {
  try {
    const userId = req.user?.sub || req.user?.uid || req.user?.['cognito:username'];
    const { orderId } = req.params;
    
    const order = await Order.findOne({ 
      orderId: orderId,
      userId: userId 
    }).populate('items.product', 'title images price offerPrice');
    
    if (!order) {
      return res.status(404).json({ 
        message: "Order not found" 
      });
    }
    
    res.json({ order });
  } catch (err) {
    console.error("Order fetch error:", err);
    res.status(500).json({ 
      message: "Error fetching order", 
      error: err.message 
    });
  }
});

// POST: Cancel order
router.post("/:orderId/cancel", verifyToken, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.user?.sub || req.user?.uid || req.user?.['cognito:username'];
    const { orderId } = req.params;
    const { reason } = req.body;

    const order = await Order.findOne({ 
      orderId: orderId,
      userId: userId 
    }).session(session);

    if (!order) {
      return res.status(404).json({ 
        message: "Order not found" 
      });
    }

    // Check if order can be cancelled
    if (!order.canBeCancelled) {
      return res.status(400).json({ 
        message: "Order cannot be cancelled at this stage" 
      });
    }

    // Update order status
    await order.updateStatus('Cancelled', reason || 'Cancelled by customer', order.user);

    // Restore inventory for cancelled items
    if (order.items && order.items.length > 0) {
      for (const item of order.items) {
        const product = await Product.findById(item.product).session(session);
        if (product && product.inventory && product.inventory.trackInventory) {
          product.inventory.quantity += item.quantity;
          await product.save({ session });
        }
      }
    }

    // Update cancellation details
    order.cancellationReason = reason || 'Cancelled by customer';
    await order.save({ session });

    await session.commitTransaction();

    // Send notifications (async, don't wait)
    NotificationService.sendOrderCancellation(order).catch(console.error);
    Notification.createOrderNotification(order.user, 'order_cancelled', order).catch(console.error);

    res.json({ 
      message: "Order cancelled successfully",
      order: {
        orderId: order.orderId,
        status: order.status,
        cancellationReason: order.cancellationReason
      }
    });
  } catch (err) {
    await session.abortTransaction();
    console.error("Order cancellation error:", err);
    res.status(500).json({ 
      message: "Error cancelling order", 
      error: err.message 
    });
  } finally {
    session.endSession();
  }
});

// POST: Request return/refund
router.post("/:orderId/return", verifyToken, async (req, res) => {
  try {
    const userId = req.user?.sub || req.user?.uid || req.user?.['cognito:username'];
    const { orderId } = req.params;
    const { reason, items, comments } = req.body;

    const order = await Order.findOne({ 
      orderId: orderId,
      userId: userId 
    });

    if (!order) {
      return res.status(404).json({ 
        message: "Order not found" 
      });
    }

    // Check if order can be returned
    if (!order.canBeReturned) {
      return res.status(400).json({ 
        message: "Order cannot be returned at this stage or return window has expired" 
      });
    }

    // Update order with return request
    order.returnReason = reason;
    order.returnComments = comments;
    order.returnRequestedAt = new Date();
    order.returnItems = items || order.items.map(item => item._id);
    
    await order.updateStatus('Return Requested', `Return requested: ${reason}`, order.user);

    // Send notifications (async, don't wait)
    NotificationService.sendOrderStatusUpdate(order, 'Delivered').catch(console.error);
    Notification.createOrderNotification(order.user, 'order_status_update', order).catch(console.error);

    res.json({ 
      message: "Return request submitted successfully",
      order: {
        orderId: order.orderId,
        status: order.status,
        returnReason: order.returnReason
      }
    });
  } catch (err) {
    console.error("Return request error:", err);
    res.status(500).json({ 
      message: "Error processing return request", 
      error: err.message 
    });
  }
});

// PUT: Update order status (for admin/vendor use)
router.put("/:orderId/status", verifyToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, note, trackingNumber, carrier } = req.body;
    const userId = req.user?.sub || req.user?.uid || req.user?.['cognito:username'];

    const order = await Order.findOne({ orderId: orderId });

    if (!order) {
      return res.status(404).json({ 
        message: "Order not found" 
      });
    }

    const previousStatus = order.status;

    // Update order status
    await order.updateStatus(status, note, userId);

    // Update shipping information if provided
    if (trackingNumber || carrier) {
      if (!order.shipping) order.shipping = {};
      if (trackingNumber) order.shipping.trackingNumber = trackingNumber;
      if (carrier) order.shipping.carrier = carrier;
      
      // Set actual delivery date if status is delivered
      if (status === 'Delivered') {
        order.shipping.actualDelivery = new Date();
      }
      
      await order.save();
    }

    // Send notifications based on status (async, don't wait)
    if (status !== previousStatus) {
      NotificationService.sendOrderStatusUpdate(order, previousStatus).catch(console.error);
      
      let notificationType = 'order_status_update';
      if (status === 'Shipped') notificationType = 'order_shipped';
      else if (status === 'Delivered') notificationType = 'order_delivered';
      
      Notification.createOrderNotification(order.user, notificationType, order).catch(console.error);
      
      // Send delivery confirmation email for delivered orders
      if (status === 'Delivered') {
        NotificationService.sendOrderDelivered(order).catch(console.error);
      }
    }

    res.json({ 
      message: "Order status updated successfully",
      order: {
        orderId: order.orderId,
        status: order.status,
        shipping: order.shipping
      }
    });
  } catch (err) {
    console.error("Order status update error:", err);
    res.status(500).json({ 
      message: "Error updating order status", 
      error: err.message 
    });
  }
});

export default router;

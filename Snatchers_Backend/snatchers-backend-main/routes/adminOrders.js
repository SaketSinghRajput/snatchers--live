// routes/adminOrders.js
import express from "express";
import Order from "../models/Order.js";
import Dispute from "../models/Dispute.js";
import User from "../models/User.js";
import Product from "../models/Product.js";
import Notification from "../models/Notification.js";
import { auth } from "../middleware/auth.js";
import mongoose from "mongoose";
import NotificationService from "../services/NotificationService.js";

const router = express.Router();

// Middleware to check admin role
const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// ============ ORDER MANAGEMENT ============

// GET: Fetch all orders with filtering and pagination (Admin)
router.get("/", auth, requireAdmin, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      dateRange, 
      search,
      vendor,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = {};
    
    // Status filter
    if (status && status !== 'all') {
      query.status = status;
    }
    
    // Vendor filter
    if (vendor) {
      query['vendors.vendor'] = vendor;
    }
    
    // Date range filter
    if (dateRange && dateRange !== 'all') {
      const now = new Date();
      let startDate;
      
      switch (dateRange) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case '7days':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30days':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90days':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
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
        { customerEmail: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { 'items.productTitle': { $regex: search, $options: 'i' } },
        { 'shipping.trackingNumber': { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const orders = await Order.find(query)
      .populate('user', 'name email')
      .populate('items.product', 'title images')
      .populate('vendors.vendor', 'name email')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Order.countDocuments(query);
    
    // Get order statistics
    const stats = await Order.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          avgOrderValue: { $avg: '$totalAmount' },
          statusCounts: {
            $push: '$status'
          }
        }
      }
    ]);

    const statusCounts = {};
    if (stats[0]?.statusCounts) {
      stats[0].statusCounts.forEach(status => {
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
    }
    
    res.json({ 
      orders,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
      stats: {
        totalRevenue: stats[0]?.totalRevenue || 0,
        avgOrderValue: stats[0]?.avgOrderValue || 0,
        statusCounts
      }
    });
  } catch (err) {
    console.error("Admin orders fetch error:", err);
    res.status(500).json({ 
      message: "Error fetching orders", 
      error: err.message 
    });
  }
});

// GET: Fetch specific order by ID (Admin)
router.get("/:orderId", auth, requireAdmin, async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const order = await Order.findOne({ orderId: orderId })
      .populate('user', 'name email phone profile addresses')
      .populate('items.product', 'title images price offerPrice sku')
      .populate('vendors.vendor', 'name email profile')
      .populate('statusHistory.updatedBy', 'name email');
    
    if (!order) {
      return res.status(404).json({ 
        message: "Order not found" 
      });
    }

    // Get related disputes
    const disputes = await Dispute.find({ order: order._id })
      .populate('customer', 'name email')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 });
    
    res.json({ 
      order,
      disputes
    });
  } catch (err) {
    console.error("Admin order fetch error:", err);
    res.status(500).json({ 
      message: "Error fetching order", 
      error: err.message 
    });
  }
});

// PUT: Update order status (Admin)
router.put("/:orderId/status", auth, requireAdmin, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { orderId } = req.params;
    const { status, note, trackingNumber, carrier, notifyCustomer = true } = req.body;
    const adminId = req.user?.sub || req.user?.uid;

    const order = await Order.findOne({ orderId: orderId }).session(session);

    if (!order) {
      return res.status(404).json({ 
        message: "Order not found" 
      });
    }

    const previousStatus = order.status;

    // Update order status
    await order.updateStatus(status, note, adminId);

    // Update shipping information if provided
    if (trackingNumber || carrier) {
      if (!order.shipping) order.shipping = {};
      if (trackingNumber) order.shipping.trackingNumber = trackingNumber;
      if (carrier) order.shipping.carrier = carrier;
      
      // Set actual delivery date if status is delivered
      if (status === 'Delivered') {
        order.shipping.actualDelivery = new Date();
      }
      
      await order.save({ session });
    }

    // Handle inventory for cancelled orders
    if (status === 'Cancelled' && previousStatus !== 'Cancelled') {
      if (order.items && order.items.length > 0) {
        for (const item of order.items) {
          const product = await Product.findById(item.product).session(session);
          if (product && product.inventory && product.inventory.trackInventory) {
            product.inventory.quantity += item.quantity;
            await product.save({ session });
          }
        }
      }
    }

    await session.commitTransaction();

    // Send notifications if requested
    if (notifyCustomer && status !== previousStatus) {
      NotificationService.sendOrderStatusUpdate(order, previousStatus).catch(console.error);
      
      let notificationType = 'order_status_update';
      if (status === 'Shipped') notificationType = 'order_shipped';
      else if (status === 'Delivered') notificationType = 'order_delivered';
      else if (status === 'Cancelled') notificationType = 'order_cancelled';
      
      Notification.createOrderNotification(order.user, notificationType, order).catch(console.error);
    }

    res.json({ 
      message: "Order status updated successfully",
      order: {
        orderId: order.orderId,
        status: order.status,
        shipping: order.shipping,
        statusHistory: order.statusHistory
      }
    });
  } catch (err) {
    await session.abortTransaction();
    console.error("Admin order status update error:", err);
    res.status(500).json({ 
      message: "Error updating order status", 
      error: err.message 
    });
  } finally {
    session.endSession();
  }
});

// POST: Process return request (Admin)
router.post("/:orderId/process-return", auth, requireAdmin, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { orderId } = req.params;
    const { action, refundAmount, note, notifyCustomer = true } = req.body;
    const adminId = req.user?.sub || req.user?.uid;

    const order = await Order.findOne({ orderId: orderId }).session(session);

    if (!order) {
      return res.status(404).json({ 
        message: "Order not found" 
      });
    }

    if (order.status !== 'Return Requested') {
      return res.status(400).json({ 
        message: "Order is not in return requested status" 
      });
    }

    let newStatus;
    let statusNote;

    switch (action) {
      case 'approve':
        newStatus = 'Return Approved';
        statusNote = `Return approved by admin. ${note || ''}`;
        break;
      case 'reject':
        newStatus = 'Return Rejected';
        statusNote = `Return rejected by admin. ${note || ''}`;
        break;
      default:
        return res.status(400).json({ 
          message: "Invalid action. Use 'approve' or 'reject'" 
        });
    }

    // Update order status
    await order.updateStatus(newStatus, statusNote, adminId);

    // If approved, handle refund amount
    if (action === 'approve' && refundAmount) {
      order.refundAmount = refundAmount;
      await order.save({ session });
    }

    await session.commitTransaction();

    // Send notifications if requested
    if (notifyCustomer) {
      NotificationService.sendOrderStatusUpdate(order, 'Return Requested').catch(console.error);
      
      const notificationType = action === 'approve' ? 'return_approved' : 'return_rejected';
      Notification.createOrderNotification(order.user, notificationType, order).catch(console.error);
    }

    res.json({ 
      message: `Return request ${action}d successfully`,
      order: {
        orderId: order.orderId,
        status: order.status,
        refundAmount: order.refundAmount
      }
    });
  } catch (err) {
    await session.abortTransaction();
    console.error("Return processing error:", err);
    res.status(500).json({ 
      message: "Error processing return request", 
      error: err.message 
    });
  } finally {
    session.endSession();
  }
});

// ============ DISPUTE MANAGEMENT ============

// GET: Fetch all disputes with filtering and pagination
router.get("/disputes/list", auth, requireAdmin, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      type,
      priority,
      assignedTo,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = {};
    
    if (status && status !== 'all') query.status = status;
    if (type && type !== 'all') query.type = type;
    if (priority && priority !== 'all') query.priority = priority;
    if (assignedTo && assignedTo !== 'all') query.assignedTo = assignedTo;
    
    // Search filter
    if (search) {
      query.$or = [
        { disputeId: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const disputes = await Dispute.find(query)
      .populate('order', 'orderId totalAmount status')
      .populate('customer', 'name email')
      .populate('vendor', 'name email')
      .populate('assignedTo', 'name email')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Dispute.countDocuments(query);
    
    res.json({ 
      disputes,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error("Disputes fetch error:", err);
    res.status(500).json({ 
      message: "Error fetching disputes", 
      error: err.message 
    });
  }
});

// GET: Fetch specific dispute by ID
router.get("/disputes/:disputeId", auth, requireAdmin, async (req, res) => {
  try {
    const { disputeId } = req.params;
    
    const dispute = await Dispute.findOne({ disputeId: disputeId })
      .populate('order', 'orderId totalAmount status items shippingAddress')
      .populate('customer', 'name email phone profile')
      .populate('vendor', 'name email profile')
      .populate('assignedTo', 'name email')
      .populate('communication.from', 'name email')
      .populate('statusHistory.updatedBy', 'name email');
    
    if (!dispute) {
      return res.status(404).json({ 
        message: "Dispute not found" 
      });
    }
    
    res.json({ dispute });
  } catch (err) {
    console.error("Dispute fetch error:", err);
    res.status(500).json({ 
      message: "Error fetching dispute", 
      error: err.message 
    });
  }
});

// POST: Create dispute from order issue
router.post("/disputes/create", auth, requireAdmin, async (req, res) => {
  try {
    const { 
      orderId, 
      customerId, 
      type, 
      subject, 
      description, 
      priority = 'medium',
      assignedTo 
    } = req.body;
    const adminId = req.user?.sub || req.user?.uid;

    // Validate order exists
    const order = await Order.findOne({ orderId: orderId });
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Validate customer exists
    const customer = await User.findById(customerId);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    const disputeId = Dispute.generateDisputeId();
    
    const dispute = new Dispute({
      disputeId,
      order: order._id,
      customer: customerId,
      vendor: order.vendors?.[0]?.vendor,
      type,
      subject,
      description,
      priority,
      assignedTo,
      statusHistory: [{
        status: 'pending',
        timestamp: new Date(),
        note: 'Dispute created by admin',
        updatedBy: adminId
      }],
      metadata: {
        source: 'admin'
      }
    });

    await dispute.save();

    // Send notification to customer
    Notification.createOrderNotification(
      customerId, 
      'dispute_created', 
      { dispute, order }
    ).catch(console.error);

    res.status(201).json({ 
      message: "Dispute created successfully",
      dispute: {
        disputeId: dispute.disputeId,
        _id: dispute._id,
        status: dispute.status
      }
    });
  } catch (err) {
    console.error("Dispute creation error:", err);
    res.status(500).json({ 
      message: "Error creating dispute", 
      error: err.message 
    });
  }
});

// PUT: Update dispute status
router.put("/disputes/:disputeId/status", auth, requireAdmin, async (req, res) => {
  try {
    const { disputeId } = req.params;
    const { status, note, assignedTo } = req.body;
    const adminId = req.user?.sub || req.user?.uid;

    const dispute = await Dispute.findOne({ disputeId: disputeId });

    if (!dispute) {
      return res.status(404).json({ 
        message: "Dispute not found" 
      });
    }

    // Update assigned user if provided
    if (assignedTo) {
      dispute.assignedTo = assignedTo;
    }

    // Update status
    await dispute.updateStatus(status, note, adminId);

    res.json({ 
      message: "Dispute status updated successfully",
      dispute: {
        disputeId: dispute.disputeId,
        status: dispute.status,
        assignedTo: dispute.assignedTo
      }
    });
  } catch (err) {
    console.error("Dispute status update error:", err);
    res.status(500).json({ 
      message: "Error updating dispute status", 
      error: err.message 
    });
  }
});

// POST: Add communication to dispute
router.post("/disputes/:disputeId/communicate", auth, requireAdmin, async (req, res) => {
  try {
    const { disputeId } = req.params;
    const { message, isInternal = false, attachments = [] } = req.body;
    const adminId = req.user?.sub || req.user?.uid;

    const dispute = await Dispute.findOne({ disputeId: disputeId });

    if (!dispute) {
      return res.status(404).json({ 
        message: "Dispute not found" 
      });
    }

    await dispute.addCommunication(adminId, 'admin', message, attachments, isInternal);

    // Send notification to customer if not internal
    if (!isInternal) {
      Notification.createOrderNotification(
        dispute.customer, 
        'dispute_update', 
        { dispute, message }
      ).catch(console.error);
    }

    res.json({ 
      message: "Communication added successfully"
    });
  } catch (err) {
    console.error("Dispute communication error:", err);
    res.status(500).json({ 
      message: "Error adding communication", 
      error: err.message 
    });
  }
});

// POST: Resolve dispute
router.post("/disputes/:disputeId/resolve", auth, requireAdmin, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { disputeId } = req.params;
    const { action, amount, description, notifyCustomer = true } = req.body;
    const adminId = req.user?.sub || req.user?.uid;

    const dispute = await Dispute.findOne({ disputeId: disputeId }).session(session);

    if (!dispute) {
      return res.status(404).json({ 
        message: "Dispute not found" 
      });
    }

    const resolution = {
      action,
      amount,
      description
    };

    await dispute.resolve(resolution, adminId);

    // Update related order if needed
    if (action === 'refund_full' || action === 'refund_partial') {
      const order = await Order.findById(dispute.order).session(session);
      if (order) {
        order.refundAmount = (order.refundAmount || 0) + (amount || 0);
        await order.updateStatus('Refunded', `Refund processed: ${description}`, adminId);
      }
    }

    await session.commitTransaction();

    // Send notifications if requested
    if (notifyCustomer) {
      Notification.createOrderNotification(
        dispute.customer, 
        'dispute_resolved', 
        { dispute, resolution }
      ).catch(console.error);
    }

    res.json({ 
      message: "Dispute resolved successfully",
      dispute: {
        disputeId: dispute.disputeId,
        status: dispute.status,
        resolution: dispute.resolution
      }
    });
  } catch (err) {
    await session.abortTransaction();
    console.error("Dispute resolution error:", err);
    res.status(500).json({ 
      message: "Error resolving dispute", 
      error: err.message 
    });
  } finally {
    session.endSession();
  }
});

// GET: Get dispute and order statistics
router.get("/stats/overview", auth, requireAdmin, async (req, res) => {
  try {
    const { dateRange = '30days' } = req.query;
    
    // Calculate date range
    const now = new Date();
    let startDate;
    
    switch (dateRange) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case '7days':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30days':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90days':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get order statistics
    const orderStats = await Order.getOrderStats(startDate, now);
    
    // Get dispute statistics
    const disputeStats = await Dispute.getDisputeStats(startDate, now);

    // Get pending actions count
    const pendingActions = {
      returnRequests: await Order.countDocuments({ status: 'Return Requested' }),
      pendingDisputes: await Dispute.countDocuments({ status: 'pending' }),
      overdueDisputes: await Dispute.countDocuments({ 
        dueDate: { $lt: now },
        status: { $nin: ['resolved', 'closed'] }
      })
    };

    res.json({
      orders: orderStats[0] || {},
      disputes: disputeStats[0] || {},
      pendingActions,
      dateRange: {
        start: startDate,
        end: now
      }
    });
  } catch (err) {
    console.error("Stats fetch error:", err);
    res.status(500).json({ 
      message: "Error fetching statistics", 
      error: err.message 
    });
  }
});

export default router;
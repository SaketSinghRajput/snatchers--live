#!/usr/bin/env node

/**
 * Migration script for enhanced e-commerce models
 * This script migrates existing data to the new enhanced schema
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { setupDatabaseIndexes } from '../config/database.js';

// Load environment variables
dotenv.config();

// Import models
import Product from '../models/Product.js';
import User from '../models/User.js';
import Order from '../models/Order.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/snatchers';

async function connectToDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
}

async function migrateProducts() {
  console.log('Migrating products...');
  
  try {
    const products = await Product.find({});
    let migrated = 0;
    
    for (const product of products) {
      let needsUpdate = false;
      const updates = {};
      
      // Add SKU if missing
      if (!product.sku) {
        updates.sku = `SKU-${product._id.toString().slice(-8).toUpperCase()}`;
        needsUpdate = true;
      }
      
      // Add brand if missing
      if (!product.brand) {
        updates.brand = 'Generic';
        needsUpdate = true;
      }
      
      // Initialize inventory if missing
      if (!product.inventory) {
        updates.inventory = {
          quantity: Math.floor(Math.random() * 100) + 10, // Random stock for demo
          lowStockThreshold: 10,
          trackInventory: true
        };
        needsUpdate = true;
      }
      
      // Initialize SEO fields if missing
      if (!product.seo) {
        const slug = product.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');
        
        updates.seo = {
          metaTitle: product.title,
          metaDescription: product.description ? product.description.substring(0, 160) : product.title,
          slug: `${slug}-${product._id.toString().slice(-6)}`,
          keywords: [product.category, product.brand || 'Generic']
        };
        needsUpdate = true;
      }
      
      // Add vendor (assign to first admin user or create a default vendor)
      if (!product.vendor) {
        const adminUser = await User.findOne({ role: 'admin' }) || await User.findOne({});
        if (adminUser) {
          updates.vendor = adminUser._id;
          needsUpdate = true;
        }
      }
      
      // Initialize status if missing
      if (!product.status) {
        updates.status = 'active';
        needsUpdate = true;
      }
      
      // Initialize counters if missing
      if (product.reviewCount === undefined) {
        updates.reviewCount = 0;
        needsUpdate = true;
      }
      
      if (product.averageRating === undefined) {
        updates.averageRating = product.rating || 0;
        needsUpdate = true;
      }
      
      if (product.viewCount === undefined) {
        updates.viewCount = Math.floor(Math.random() * 1000); // Random views for demo
        needsUpdate = true;
      }
      
      if (product.salesCount === undefined) {
        updates.salesCount = Math.floor(Math.random() * 50); // Random sales for demo
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        await Product.updateOne({ _id: product._id }, { $set: updates });
        migrated++;
      }
    }
    
    console.log(`Migrated ${migrated} products`);
  } catch (error) {
    console.error('Error migrating products:', error);
  }
}

async function migrateUsers() {
  console.log('Migrating users...');
  
  try {
    const users = await User.find({});
    let migrated = 0;
    
    for (const user of users) {
      let needsUpdate = false;
      const updates = {};
      
      // Initialize profile if missing
      if (!user.profile) {
        const nameParts = (user.name || '').split(' ');
        updates.profile = {
          firstName: nameParts[0] || '',
          lastName: nameParts.slice(1).join(' ') || '',
          avatar: user.photoURL || ''
        };
        needsUpdate = true;
      }
      
      // Initialize preferences if missing
      if (!user.preferences) {
        updates.preferences = {
          categories: [],
          brands: [],
          priceRange: { min: 0, max: 100000 },
          notifications: {
            email: true,
            sms: false,
            push: true
          }
        };
        needsUpdate = true;
      }
      
      // Initialize vendor profile for admin users
      if ((user.role === 'admin' || user.role === 'vendor') && !user.vendorProfile) {
        updates.vendorProfile = {
          businessName: `${user.name || 'Business'} Store`,
          businessType: 'Retail',
          isVerified: user.role === 'admin' // Auto-verify admin users
        };
        needsUpdate = true;
      }
      
      // Initialize counters if missing
      if (user.loyaltyPoints === undefined) {
        updates.loyaltyPoints = 0;
        needsUpdate = true;
      }
      
      if (user.totalSpent === undefined) {
        updates.totalSpent = 0;
        needsUpdate = true;
      }
      
      if (user.isActive === undefined) {
        updates.isActive = true;
        needsUpdate = true;
      }
      
      // Initialize arrays if missing
      if (!user.wishlist) {
        updates.wishlist = [];
        needsUpdate = true;
      }
      
      if (!user.recentlyViewed) {
        updates.recentlyViewed = [];
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        await User.updateOne({ _id: user._id }, { $set: updates });
        migrated++;
      }
    }
    
    console.log(`Migrated ${migrated} users`);
  } catch (error) {
    console.error('Error migrating users:', error);
  }
}

async function migrateOrders() {
  console.log('Migrating orders...');
  
  try {
    const orders = await Order.find({});
    let migrated = 0;
    
    for (const order of orders) {
      let needsUpdate = false;
      const updates = {};
      
      // Convert legacy single product to items array
      if (order.productId && !order.items) {
        updates.items = [{
          product: order.productId,
          productTitle: order.productTitle,
          productImage: order.productImage,
          quantity: 1,
          unitPrice: order.price,
          totalPrice: order.price
        }];
        needsUpdate = true;
      }
      
      // Set pricing fields if missing
      if (!order.subtotal && order.price) {
        updates.subtotal = order.price;
        updates.totalAmount = order.price;
        updates.shippingCost = 0;
        updates.taxAmount = 0;
        updates.discountAmount = 0;
        needsUpdate = true;
      }
      
      // Convert legacy address to structured address
      if (order.address && !order.shippingAddress) {
        updates.shippingAddress = {
          street: order.address,
          city: order.city,
          state: order.state,
          zipCode: order.pincode,
          country: 'India',
          phone: order.phone
        };
        needsUpdate = true;
      }
      
      // Convert legacy payment to structured payment
      if (order.paymentId && !order.payment) {
        updates.payment = {
          method: 'card', // Default assumption
          paymentId: order.paymentId,
          status: 'completed' // Assume existing orders are paid
        };
        needsUpdate = true;
      }
      
      // Initialize shipping if missing
      if (!order.shipping && order.shiprocketOrderId) {
        updates.shipping = {
          shiprocketOrderId: order.shiprocketOrderId
        };
        needsUpdate = true;
      }
      
      // Initialize status history if missing
      if (!order.statusHistory) {
        updates.statusHistory = [{
          status: order.status,
          timestamp: order.createdAt || new Date(),
          note: 'Initial status'
        }];
        needsUpdate = true;
      }
      
      // Find and set user reference if missing
      if (!order.user && order.userId) {
        const user = await User.findOne({ uid: order.userId });
        if (user) {
          updates.user = user._id;
          needsUpdate = true;
        }
      }
      
      if (needsUpdate) {
        await Order.updateOne({ _id: order._id }, { $set: updates });
        migrated++;
      }
    }
    
    console.log(`Migrated ${migrated} orders`);
  } catch (error) {
    console.error('Error migrating orders:', error);
  }
}

async function runMigration() {
  console.log('Starting enhanced models migration...');
  
  try {
    await connectToDatabase();
    
    // Run migrations
    await migrateProducts();
    await migrateUsers();
    await migrateOrders();
    
    // Setup database indexes
    await setupDatabaseIndexes();
    
    console.log('Migration completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run migration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigration();
}

export { runMigration };
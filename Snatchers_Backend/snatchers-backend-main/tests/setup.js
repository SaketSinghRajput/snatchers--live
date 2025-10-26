import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

let mongoServer;

// Setup before all tests
beforeAll(async () => {
  // Start in-memory MongoDB instance
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  // Connect to the in-memory database
  await mongoose.connect(mongoUri);
});

// Cleanup after all tests
afterAll(async () => {
  // Close database connection
  await mongoose.connection.close();
  
  // Stop the in-memory MongoDB instance
  if (mongoServer) {
    await mongoServer.stop();
  }
});

// Clear database between tests
afterEach(async () => {
  const collections = mongoose.connection.collections;
  
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock external services
jest.mock('../services/EmailService.js', () => ({
  sendEmail: jest.fn().mockResolvedValue(true),
  sendOrderConfirmation: jest.fn().mockResolvedValue(true),
  sendPasswordReset: jest.fn().mockResolvedValue(true),
}));

jest.mock('../services/PaymentService.js', () => ({
  processPayment: jest.fn().mockResolvedValue({ success: true, transactionId: 'test-123' }),
  refundPayment: jest.fn().mockResolvedValue({ success: true }),
}));

// Mock AWS services
jest.mock('aws-jwt-verify', () => ({
  CognitoJwtVerifier: {
    create: jest.fn().mockReturnValue({
      verify: jest.fn().mockResolvedValue({
        sub: 'test-user-id',
        email: 'test@example.com',
        'cognito:username': 'testuser'
      })
    })
  }
}));

// Mock Elasticsearch
jest.mock('@elastic/elasticsearch', () => ({
  Client: jest.fn().mockImplementation(() => ({
    index: jest.fn().mockResolvedValue({ result: 'created' }),
    search: jest.fn().mockResolvedValue({
      hits: {
        hits: [],
        total: { value: 0 }
      }
    }),
    delete: jest.fn().mockResolvedValue({ result: 'deleted' }),
    update: jest.fn().mockResolvedValue({ result: 'updated' }),
  }))
}));

// Test utilities
export const createTestUser = async (userData = {}) => {
  const User = (await import('../models/User.js')).default;
  const defaultUser = {
    uid: 'test-user-' + Date.now(),
    email: 'test@example.com',
    name: 'Test User',
    role: 'customer',
    ...userData
  };
  return await User.create(defaultUser);
};

export const createTestProduct = async (productData = {}) => {
  const Product = (await import('../models/Product.js')).default;
  const defaultProduct = {
    title: 'Test Product',
    price: 99.99,
    images: ['https://example.com/image.jpg'],
    category: 'Electronics',
    brand: 'Test Brand',
    sku: 'TEST-' + Date.now(),
    vendor: new mongoose.Types.ObjectId(),
    ...productData
  };
  return await Product.create(defaultProduct);
};

export const createTestOrder = async (orderData = {}) => {
  const Order = (await import('../models/Order.js')).default;
  const defaultOrder = {
    user: new mongoose.Types.ObjectId(),
    items: [{
      product: new mongoose.Types.ObjectId(),
      quantity: 1,
      price: 99.99
    }],
    totalAmount: 99.99,
    status: 'pending',
    ...orderData
  };
  return await Order.create(defaultOrder);
};
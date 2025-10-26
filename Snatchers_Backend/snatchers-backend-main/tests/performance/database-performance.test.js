import mongoose from 'mongoose';
import { createTestProduct, createTestUser } from '../setup.js';
import Product from '../../models/Product.js';
import User from '../../models/User.js';

describe('Database Performance Tests', () => {
  describe('Product Queries', () => {
    beforeEach(async () => {
      // Create test data
      const products = [];
      for (let i = 0; i < 1000; i++) {
        products.push({
          title: `Product ${i}`,
          price: Math.random() * 1000,
          category: i % 2 === 0 ? 'Electronics' : 'Clothing',
          brand: `Brand ${i % 10}`,
          sku: `SKU-${i}`,
          vendor: new mongoose.Types.ObjectId(),
          images: [`https://example.com/image${i}.jpg`]
        });
      }
      await Product.insertMany(products);
    });

    test('should perform product search within acceptable time', async () => {
      const startTime = Date.now();
      
      const results = await Product.find({
        category: 'Electronics',
        price: { $gte: 100, $lte: 500 }
      }).limit(20);
      
      const endTime = Date.now();
      const queryTime = endTime - startTime;
      
      expect(queryTime).toBeLessThan(100); // Should complete within 100ms
      expect(results.length).toBeGreaterThan(0);
    });

    test('should perform text search efficiently', async () => {
      const startTime = Date.now();
      
      const results = await Product.find({
        $text: { $search: 'Product' }
      }).limit(20);
      
      const endTime = Date.now();
      const queryTime = endTime - startTime;
      
      expect(queryTime).toBeLessThan(200); // Should complete within 200ms
    });

    test('should handle pagination efficiently', async () => {
      const startTime = Date.now();
      
      const results = await Product.find({})
        .skip(500)
        .limit(20)
        .sort({ createdAt: -1 });
      
      const endTime = Date.now();
      const queryTime = endTime - startTime;
      
      expect(queryTime).toBeLessThan(150); // Should complete within 150ms
      expect(results.length).toBe(20);
    });
  });

  describe('Aggregation Performance', () => {
    test('should perform category aggregation efficiently', async () => {
      const startTime = Date.now();
      
      const results = await Product.aggregate([
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            avgPrice: { $avg: '$price' }
          }
        },
        { $sort: { count: -1 } }
      ]);
      
      const endTime = Date.now();
      const queryTime = endTime - startTime;
      
      expect(queryTime).toBeLessThan(200); // Should complete within 200ms
      expect(results.length).toBeGreaterThan(0);
    });

    test('should perform price range aggregation efficiently', async () => {
      const startTime = Date.now();
      
      const results = await Product.aggregate([
        {
          $bucket: {
            groupBy: '$price',
            boundaries: [0, 100, 500, 1000, Infinity],
            default: 'Other',
            output: {
              count: { $sum: 1 },
              products: { $push: '$title' }
            }
          }
        }
      ]);
      
      const endTime = Date.now();
      const queryTime = endTime - startTime;
      
      expect(queryTime).toBeLessThan(300); // Should complete within 300ms
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('Concurrent Operations', () => {
    test('should handle concurrent product reads', async () => {
      const promises = [];
      
      for (let i = 0; i < 50; i++) {
        promises.push(
          Product.find({ category: 'Electronics' }).limit(10)
        );
      }
      
      const startTime = Date.now();
      const results = await Promise.all(promises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      expect(totalTime).toBeLessThan(1000); // Should complete within 1 second
      expect(results.length).toBe(50);
    });

    test('should handle concurrent writes without conflicts', async () => {
      const promises = [];
      
      for (let i = 0; i < 20; i++) {
        promises.push(
          createTestProduct({
            title: `Concurrent Product ${i}`,
            sku: `CONCURRENT-${i}-${Date.now()}`
          })
        );
      }
      
      const startTime = Date.now();
      const results = await Promise.all(promises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      expect(totalTime).toBeLessThan(2000); // Should complete within 2 seconds
      expect(results.length).toBe(20);
    });
  });
});
import mongoose from 'mongoose';
import Product from '../../../models/Product.js';

describe('Product Model', () => {
  describe('Validation', () => {
    test('should create product with valid data', async () => {
      const productData = {
        title: 'Test Product',
        price: 99.99,
        images: ['https://example.com/image.jpg'],
        category: 'Electronics',
        brand: 'Test Brand',
        sku: 'TEST-123',
        vendor: new mongoose.Types.ObjectId()
      };

      const product = new Product(productData);
      const savedProduct = await product.save();

      expect(savedProduct._id).toBeDefined();
      expect(savedProduct.title).toBe(productData.title);
      expect(savedProduct.price).toBe(productData.price);
      expect(savedProduct.sku).toBe(productData.sku);
    });

    test('should require mandatory fields', async () => {
      const product = new Product({});

      await expect(product.save()).rejects.toThrow();
    });

    test('should enforce unique SKU', async () => {
      const productData = {
        title: 'Test Product 1',
        price: 99.99,
        images: ['https://example.com/image.jpg'],
        category: 'Electronics',
        brand: 'Test Brand',
        sku: 'UNIQUE-SKU',
        vendor: new mongoose.Types.ObjectId()
      };

      await Product.create(productData);

      const duplicateProduct = new Product({
        ...productData,
        title: 'Test Product 2'
      });

      await expect(duplicateProduct.save()).rejects.toThrow();
    });

    test('should validate price is positive', async () => {
      const productData = {
        title: 'Test Product',
        price: -10,
        images: ['https://example.com/image.jpg'],
        category: 'Electronics',
        brand: 'Test Brand',
        sku: 'TEST-123',
        vendor: new mongoose.Types.ObjectId()
      };

      const product = new Product(productData);
      await expect(product.save()).rejects.toThrow();
    });
  });

  describe('Virtual Properties', () => {
    test('should calculate discount percentage', async () => {
      const product = await Product.create({
        title: 'Test Product',
        price: 100,
        offerPrice: 80,
        images: ['https://example.com/image.jpg'],
        category: 'Electronics',
        brand: 'Test Brand',
        sku: 'TEST-123',
        vendor: new mongoose.Types.ObjectId()
      });

      expect(product.discountPercentage).toBe(20);
    });

    test('should return 0 discount when no offer price', async () => {
      const product = await Product.create({
        title: 'Test Product',
        price: 100,
        images: ['https://example.com/image.jpg'],
        category: 'Electronics',
        brand: 'Test Brand',
        sku: 'TEST-123',
        vendor: new mongoose.Types.ObjectId()
      });

      expect(product.discountPercentage).toBe(0);
    });
  });

  describe('Methods', () => {
    test('should update inventory correctly', async () => {
      const product = await Product.create({
        title: 'Test Product',
        price: 100,
        images: ['https://example.com/image.jpg'],
        category: 'Electronics',
        brand: 'Test Brand',
        sku: 'TEST-123',
        vendor: new mongoose.Types.ObjectId(),
        inventory: { quantity: 10 }
      });

      await product.updateInventory(-3);
      expect(product.inventory.quantity).toBe(7);
    });
  });
});
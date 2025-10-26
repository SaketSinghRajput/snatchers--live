import request from 'supertest';
import express from 'express';
import productRoutes from '../../../routes/product.js';
import { createTestProduct, createTestUser } from '../../setup.js';

const app = express();
app.use(express.json());
app.use('/api/products', productRoutes);

describe('Product Routes', () => {
  describe('GET /api/products', () => {
    test('should return all products', async () => {
      await createTestProduct({ title: 'Product 1' });
      await createTestProduct({ title: 'Product 2' });

      const response = await request(app)
        .get('/api/products')
        .expect(200);

      expect(response.body.products).toHaveLength(2);
      expect(response.body.products[0]).toHaveProperty('title');
      expect(response.body.products[0]).toHaveProperty('price');
    });

    test('should filter products by category', async () => {
      await createTestProduct({ title: 'Laptop', category: 'Electronics' });
      await createTestProduct({ title: 'Shirt', category: 'Clothing' });

      const response = await request(app)
        .get('/api/products?category=Electronics')
        .expect(200);

      expect(response.body.products).toHaveLength(1);
      expect(response.body.products[0].category).toBe('Electronics');
    });

    test('should filter products by price range', async () => {
      await createTestProduct({ title: 'Cheap Product', price: 10 });
      await createTestProduct({ title: 'Expensive Product', price: 1000 });

      const response = await request(app)
        .get('/api/products?minPrice=50&maxPrice=500')
        .expect(200);

      expect(response.body.products).toHaveLength(0);
    });
  });

  describe('GET /api/products/:id', () => {
    test('should return product by ID', async () => {
      const product = await createTestProduct({ title: 'Test Product' });

      const response = await request(app)
        .get(`/api/products/${product._id}`)
        .expect(200);

      expect(response.body.title).toBe('Test Product');
      expect(response.body._id).toBe(product._id.toString());
    });

    test('should return 404 for non-existent product', async () => {
      const response = await request(app)
        .get('/api/products/507f1f77bcf86cd799439011')
        .expect(404);

      expect(response.body.message).toBe('Product not found');
    });
  });
});
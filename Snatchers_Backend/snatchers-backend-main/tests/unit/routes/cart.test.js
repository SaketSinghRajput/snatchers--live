import request from 'supertest';
import express from 'express';
import cartRoutes from '../../../routes/cart.js';
import { createTestProduct, createTestUser } from '../../setup.js';

const app = express();
app.use(express.json());

// Mock authentication middleware
app.use((req, res, next) => {
  req.user = { uid: 'test-user-123' };
  next();
});

app.use('/api/cart', cartRoutes);

describe('Cart Routes', () => {
  let user, product;

  beforeEach(async () => {
    user = await createTestUser({ uid: 'test-user-123' });
    product = await createTestProduct();
  });

  describe('POST /api/cart/add', () => {
    test('should add product to cart', async () => {
      const response = await request(app)
        .post('/api/cart/add')
        .send({
          productId: product._id.toString(),
          quantity: 2
        })
        .expect(200);

      expect(response.body.message).toBe('Product added to cart');
      expect(response.body.cart.items).toHaveLength(1);
      expect(response.body.cart.items[0].quantity).toBe(2);
    });

    test('should update quantity if product already in cart', async () => {
      // Add product first time
      await request(app)
        .post('/api/cart/add')
        .send({
          productId: product._id.toString(),
          quantity: 1
        });

      // Add same product again
      const response = await request(app)
        .post('/api/cart/add')
        .send({
          productId: product._id.toString(),
          quantity: 2
        })
        .expect(200);

      expect(response.body.cart.items).toHaveLength(1);
      expect(response.body.cart.items[0].quantity).toBe(3);
    });

    test('should return 400 for invalid product ID', async () => {
      const response = await request(app)
        .post('/api/cart/add')
        .send({
          productId: 'invalid-id',
          quantity: 1
        })
        .expect(400);

      expect(response.body.message).toBe('Invalid product ID');
    });
  });

  describe('GET /api/cart', () => {
    test('should return user cart', async () => {
      // Add product to cart first
      await request(app)
        .post('/api/cart/add')
        .send({
          productId: product._id.toString(),
          quantity: 1
        });

      const response = await request(app)
        .get('/api/cart')
        .expect(200);

      expect(response.body.items).toHaveLength(1);
      expect(response.body.totalAmount).toBeGreaterThan(0);
    });
  });
});
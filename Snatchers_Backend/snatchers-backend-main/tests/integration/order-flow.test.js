import request from 'supertest';
import express from 'express';
import productRoutes from '../../routes/product.js';
import cartRoutes from '../../routes/cart.js';
import orderRoutes from '../../routes/order.js';
import { createTestProduct, createTestUser } from '../setup.js';

const app = express();
app.use(express.json());

// Mock authentication middleware
app.use((req, res, next) => {
  req.user = { uid: 'test-user-123' };
  next();
});

app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);

describe('Complete Order Flow Integration', () => {
  let user, product;

  beforeEach(async () => {
    user = await createTestUser({ uid: 'test-user-123' });
    product = await createTestProduct({
      title: 'Integration Test Product',
      price: 99.99,
      inventory: { quantity: 10 }
    });
  });

  test('should complete full order flow', async () => {
    // 1. Browse products
    const productsResponse = await request(app)
      .get('/api/products')
      .expect(200);

    expect(productsResponse.body.products).toHaveLength(1);

    // 2. Add product to cart
    const addToCartResponse = await request(app)
      .post('/api/cart/add')
      .send({
        productId: product._id.toString(),
        quantity: 2
      })
      .expect(200);

    expect(addToCartResponse.body.cart.items).toHaveLength(1);

    // 3. View cart
    const cartResponse = await request(app)
      .get('/api/cart')
      .expect(200);

    expect(cartResponse.body.items).toHaveLength(1);
    expect(cartResponse.body.totalAmount).toBe(199.98);

    // 4. Create order
    const orderResponse = await request(app)
      .post('/api/orders')
      .send({
        shippingAddress: {
          street: '123 Test St',
          city: 'Test City',
          state: 'Test State',
          zipCode: '12345',
          country: 'Test Country'
        },
        paymentMethod: 'card'
      })
      .expect(201);

    expect(orderResponse.body.order).toHaveProperty('_id');
    expect(orderResponse.body.order.status).toBe('pending');
    expect(orderResponse.body.order.totalAmount).toBe(199.98);

    // 5. Verify inventory was updated
    const updatedProduct = await request(app)
      .get(`/api/products/${product._id}`)
      .expect(200);

    expect(updatedProduct.body.inventory.quantity).toBe(8);
  });

  test('should handle insufficient inventory', async () => {
    // Try to add more items than available
    const response = await request(app)
      .post('/api/cart/add')
      .send({
        productId: product._id.toString(),
        quantity: 15
      })
      .expect(400);

    expect(response.body.message).toContain('insufficient inventory');
  });

  test('should handle order cancellation', async () => {
    // Add product to cart and create order
    await request(app)
      .post('/api/cart/add')
      .send({
        productId: product._id.toString(),
        quantity: 1
      });

    const orderResponse = await request(app)
      .post('/api/orders')
      .send({
        shippingAddress: {
          street: '123 Test St',
          city: 'Test City',
          state: 'Test State',
          zipCode: '12345',
          country: 'Test Country'
        },
        paymentMethod: 'card'
      })
      .expect(201);

    const orderId = orderResponse.body.order._id;

    // Cancel the order
    const cancelResponse = await request(app)
      .patch(`/api/orders/${orderId}/cancel`)
      .expect(200);

    expect(cancelResponse.body.order.status).toBe('cancelled');

    // Verify inventory was restored
    const updatedProduct = await request(app)
      .get(`/api/products/${product._id}`)
      .expect(200);

    expect(updatedProduct.body.inventory.quantity).toBe(10);
  });
});
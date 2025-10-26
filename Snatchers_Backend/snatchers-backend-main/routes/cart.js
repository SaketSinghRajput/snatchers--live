// routes/cart.js
import express from 'express';
import { isAuthenticated } from '../middleware/auth.js';
import Cart from '../models/Cart.js';
import { 
  getCart, 
  addToCart, 
  removeFromCart, 
  updateCartItem, 
  validateCartInventory 
} from '../controllers/cartController.js';

const router = express.Router();

router.get('/', isAuthenticated, getCart);
router.post('/validate', isAuthenticated, validateCartInventory);
router.post('/:productId', isAuthenticated, addToCart);
router.put('/:productId', isAuthenticated, updateCartItem);
router.delete('/:productId', isAuthenticated, removeFromCart);
router.delete('/', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.sub || req.user?.uid || req.user?.['cognito:username'];
    
    // Clear the user's cart
    await Cart.findOneAndUpdate(
      { userId },
      { $set: { items: [] } },
      { upsert: true }
    );
    
    res.json({ 
      message: 'Cart cleared successfully',
      items: [],
      totalPrice: 0,
      totalItems: 0
    });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({ error: 'Failed to clear cart' });
  }
});

export default router;

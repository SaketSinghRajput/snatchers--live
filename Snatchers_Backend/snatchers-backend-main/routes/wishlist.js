// routes/wishlist.js
import express from "express";
import Wishlist from "../models/Wishlist.js";
import Product from "../models/Product.js";
import { isAuthenticated } from "../middleware/auth.js";

const router = express.Router();

// GET: Fetch complete wishlist with categories for logged-in user
router.get("/", isAuthenticated, async (req, res) => {
  try {
    const uid = req.authId || req.user?.sub || req.user?.uid || req.user?.['cognito:username'];
    console.log("[wishlist] fetch for authId:", uid);

    let wishlist = await Wishlist.findOne({ userId: uid }).populate("items.product");
    
    if (!wishlist) {
      wishlist = new Wishlist({ userId: uid });
      wishlist.addDefaultCategories();
      await wishlist.save();
    }

    // Ensure default categories exist
    if (wishlist.categories.length === 0) {
      wishlist.addDefaultCategories();
      await wishlist.save();
    }

    return res.json({
      items: wishlist.items || [],
      categories: wishlist.categories || [],
      isPublic: wishlist.isPublic || false,
      shareToken: wishlist.shareToken
    });
  } catch (err) {
    console.error("Wishlist fetch error:", err);
    res.status(500).json({ message: "Error fetching wishlist", error: err.message });
  }
});

// GET: Fetch wishlist products only (backward compatibility)
router.get("/products", isAuthenticated, async (req, res) => {
  try {
    const uid = req.authId || req.user?.sub || req.user?.uid || req.user?.['cognito:username'];
    const wishlist = await Wishlist.findOne({ userId: uid }).populate("items.product");
    
    const products = wishlist?.items?.map(item => item.product) || [];
    return res.json(products);
  } catch (err) {
    console.error("Wishlist products fetch error:", err);
    res.status(500).json({ message: "Error fetching wishlist products", error: err.message });
  }
});

// POST: Add product to wishlist with enhanced options
router.post("/add", isAuthenticated, async (req, res) => {
  try {
    const userId = req.authId || req.user?.sub || req.user?.uid || req.user?.['cognito:username'];
    const { productId, category = 'general', notes = '', priority = 'medium', priceAlert } = req.body;

    if (!productId) return res.status(400).json({ message: 'productId required in request body' });

    // Verify product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    let wishlist = await Wishlist.findOne({ userId });
    if (!wishlist) {
      wishlist = new Wishlist({ userId });
      wishlist.addDefaultCategories();
    }

    // Check if product already exists
    const existingItemIndex = wishlist.items.findIndex(item => 
      String(item.product) === String(productId)
    );

    if (existingItemIndex >= 0) {
      // Update existing item
      wishlist.items[existingItemIndex].category = category;
      wishlist.items[existingItemIndex].notes = notes;
      wishlist.items[existingItemIndex].priority = priority;
      if (priceAlert) {
        wishlist.items[existingItemIndex].priceAlert = priceAlert;
      }
    } else {
      // Add new item
      const newItem = {
        product: productId,
        category,
        notes,
        priority,
        priceAlert: priceAlert || { enabled: false }
      };
      wishlist.items.push(newItem);
    }

    await wishlist.save();
    await wishlist.populate("items.product");
    
    return res.status(200).json({ 
      message: "Added to wishlist", 
      wishlist: {
        items: wishlist.items,
        categories: wishlist.categories
      }
    });
  } catch (err) {
    console.error('[wishlist] POST /add error:', err);
    return res.status(500).json({ message: "Error adding to wishlist", error: err.message });
  }
});

// PUT: Update wishlist item
router.put("/item/:productId", isAuthenticated, async (req, res) => {
  try {
    const userId = req.authId || req.user?.sub || req.user?.uid || req.user?.['cognito:username'];
    const { productId } = req.params;
    const { category, notes, priority, priceAlert } = req.body;

    const wishlist = await Wishlist.findOne({ userId });
    if (!wishlist) {
      return res.status(404).json({ message: 'Wishlist not found' });
    }

    const itemIndex = wishlist.items.findIndex(item => 
      String(item.product) === String(productId)
    );

    if (itemIndex === -1) {
      return res.status(404).json({ message: 'Item not found in wishlist' });
    }

    // Update item properties
    if (category !== undefined) wishlist.items[itemIndex].category = category;
    if (notes !== undefined) wishlist.items[itemIndex].notes = notes;
    if (priority !== undefined) wishlist.items[itemIndex].priority = priority;
    if (priceAlert !== undefined) wishlist.items[itemIndex].priceAlert = priceAlert;

    await wishlist.save();
    await wishlist.populate("items.product");

    return res.json({ 
      message: "Wishlist item updated", 
      item: wishlist.items[itemIndex]
    });
  } catch (err) {
    console.error('[wishlist] PUT /item error:', err);
    return res.status(500).json({ message: "Error updating wishlist item", error: err.message });
  }
});

// DELETE: Remove product from wishlist
router.delete("/:productId", isAuthenticated, async (req, res) => {
  try {
    const userId = req.authId || req.user?.sub || req.user?.uid || req.user?.['cognito:username'];
    const productId = req.params.productId;

    const wishlist = await Wishlist.findOneAndUpdate(
      { userId },
      { $pull: { items: { product: productId } } },
      { new: true }
    );
    
    return res.status(200).json({ message: "Removed from wishlist", wishlist });
  } catch (err) {
    console.error('[wishlist] DELETE error:', err);
    return res.status(500).json({ message: "Error removing from wishlist", error: err.message });
  }
});

// POST: Add custom category
router.post("/categories", isAuthenticated, async (req, res) => {
  try {
    const userId = req.authId || req.user?.sub || req.user?.uid || req.user?.['cognito:username'];
    const { name, color = '#6B7280' } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Category name is required' });
    }

    let wishlist = await Wishlist.findOne({ userId });
    if (!wishlist) {
      wishlist = new Wishlist({ userId });
      wishlist.addDefaultCategories();
    }

    // Check if category already exists
    const existingCategory = wishlist.categories.find(cat => 
      cat.name.toLowerCase() === name.toLowerCase()
    );

    if (existingCategory) {
      return res.status(400).json({ message: 'Category already exists' });
    }

    wishlist.categories.push({ name, color });
    await wishlist.save();

    return res.json({ 
      message: "Category added", 
      categories: wishlist.categories 
    });
  } catch (err) {
    console.error('[wishlist] POST /categories error:', err);
    return res.status(500).json({ message: "Error adding category", error: err.message });
  }
});

// DELETE: Remove custom category
router.delete("/categories/:categoryName", isAuthenticated, async (req, res) => {
  try {
    const userId = req.authId || req.user?.sub || req.user?.uid || req.user?.['cognito:username'];
    const { categoryName } = req.params;

    const wishlist = await Wishlist.findOne({ userId });
    if (!wishlist) {
      return res.status(404).json({ message: 'Wishlist not found' });
    }

    // Don't allow deletion of default categories
    const defaultCategories = ['general', 'favorites', 'gift-ideas', 'save-for-later'];
    if (defaultCategories.includes(categoryName)) {
      return res.status(400).json({ message: 'Cannot delete default category' });
    }

    // Remove category
    wishlist.categories = wishlist.categories.filter(cat => cat.name !== categoryName);
    
    // Move items from deleted category to 'general'
    wishlist.items.forEach(item => {
      if (item.category === categoryName) {
        item.category = 'general';
      }
    });

    await wishlist.save();

    return res.json({ 
      message: "Category deleted", 
      categories: wishlist.categories 
    });
  } catch (err) {
    console.error('[wishlist] DELETE /categories error:', err);
    return res.status(500).json({ message: "Error deleting category", error: err.message });
  }
});

// POST: Generate share link
router.post("/share", isAuthenticated, async (req, res) => {
  try {
    const userId = req.authId || req.user?.sub || req.user?.uid || req.user?.['cognito:username'];
    
    let wishlist = await Wishlist.findOne({ userId });
    if (!wishlist) {
      return res.status(404).json({ message: 'Wishlist not found' });
    }

    wishlist.isPublic = true;
    const shareToken = wishlist.generateShareToken();
    await wishlist.save();

    const shareUrl = `${req.protocol}://${req.get('host')}/wishlist/shared/${shareToken}`;

    return res.json({ 
      message: "Share link generated", 
      shareUrl,
      shareToken 
    });
  } catch (err) {
    console.error('[wishlist] POST /share error:', err);
    return res.status(500).json({ message: "Error generating share link", error: err.message });
  }
});

// GET: View shared wishlist
router.get("/shared/:shareToken", async (req, res) => {
  try {
    const { shareToken } = req.params;
    
    const wishlist = await Wishlist.findOne({ 
      shareToken, 
      isPublic: true 
    }).populate("items.product");

    if (!wishlist) {
      return res.status(404).json({ message: 'Shared wishlist not found' });
    }

    return res.json({
      items: wishlist.items,
      categories: wishlist.categories,
      sharedAt: wishlist.updatedAt
    });
  } catch (err) {
    console.error('[wishlist] GET /shared error:', err);
    return res.status(500).json({ message: "Error fetching shared wishlist", error: err.message });
  }
});

// POST: Move items to cart
router.post("/move-to-cart", isAuthenticated, async (req, res) => {
  try {
    const userId = req.authId || req.user?.sub || req.user?.uid || req.user?.['cognito:username'];
    const { productIds } = req.body;

    if (!productIds || !Array.isArray(productIds)) {
      return res.status(400).json({ message: 'Product IDs array is required' });
    }

    // This would integrate with your cart system
    // For now, we'll just return success
    return res.json({ 
      message: `${productIds.length} items moved to cart`,
      movedItems: productIds
    });
  } catch (err) {
    console.error('[wishlist] POST /move-to-cart error:', err);
    return res.status(500).json({ message: "Error moving items to cart", error: err.message });
  }
});

export default router;

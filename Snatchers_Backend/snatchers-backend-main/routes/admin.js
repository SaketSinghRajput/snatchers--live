import express from 'express';
import Category from '../models/Category.js';
import Brand from '../models/Brand.js';
import Banner from '../models/Banner.js';
import Product from '../models/Product.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// Middleware to check admin role
const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// ============ CATEGORY MANAGEMENT ============

// Get all categories with hierarchy
router.get('/categories', auth, requireAdmin, async (req, res) => {
  try {
    const { flat } = req.query;
    
    if (flat === 'true') {
      const categories = await Category.find()
        .populate('parent', 'name')
        .sort({ level: 1, sortOrder: 1, name: 1 });
      return res.json(categories);
    }

    const categoryTree = await Category.getCategoryTree();
    res.json(categoryTree);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Get single category
router.get('/categories/:id', auth, requireAdmin, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id)
      .populate('parent', 'name')
      .populate('children');
    
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json(category);
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({ error: 'Failed to fetch category' });
  }
});

// Create category
router.post('/categories', auth, requireAdmin, async (req, res) => {
  try {
    const category = new Category(req.body);
    await category.save();
    
    // Update product count for parent categories
    if (category.parent) {
      await updateCategoryProductCounts(category.parent);
    }

    res.status(201).json(category);
  } catch (error) {
    console.error('Error creating category:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Category slug already exists' });
    }
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// Update category
router.put('/categories/:id', auth, requireAdmin, async (req, res) => {
  try {
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json(category);
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// Delete category
router.delete('/categories/:id', auth, requireAdmin, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Check if category has children
    const childrenCount = await Category.countDocuments({ parent: category._id });
    if (childrenCount > 0) {
      return res.status(400).json({ error: 'Cannot delete category with subcategories' });
    }

    // Check if category has products
    const productCount = await Product.countDocuments({ category: category.name });
    if (productCount > 0) {
      return res.status(400).json({ error: 'Cannot delete category with products' });
    }

    await Category.findByIdAndDelete(req.params.id);
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// ============ BRAND MANAGEMENT ============

// Get all brands
router.get('/brands', auth, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, featured } = req.query;
    const query = {};

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    if (featured !== undefined) {
      query.isFeatured = featured === 'true';
    }

    const brands = await Brand.find(query)
      .sort({ sortOrder: 1, name: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Brand.countDocuments(query);

    res.json({
      brands,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Error fetching brands:', error);
    res.status(500).json({ error: 'Failed to fetch brands' });
  }
});

// Get single brand
router.get('/brands/:id', auth, requireAdmin, async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.id);
    
    if (!brand) {
      return res.status(404).json({ error: 'Brand not found' });
    }

    res.json(brand);
  } catch (error) {
    console.error('Error fetching brand:', error);
    res.status(500).json({ error: 'Failed to fetch brand' });
  }
});

// Create brand
router.post('/brands', auth, requireAdmin, async (req, res) => {
  try {
    const brand = new Brand(req.body);
    await brand.save();
    res.status(201).json(brand);
  } catch (error) {
    console.error('Error creating brand:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Brand name already exists' });
    }
    res.status(500).json({ error: 'Failed to create brand' });
  }
});

// Update brand
router.put('/brands/:id', auth, requireAdmin, async (req, res) => {
  try {
    const brand = await Brand.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!brand) {
      return res.status(404).json({ error: 'Brand not found' });
    }

    res.json(brand);
  } catch (error) {
    console.error('Error updating brand:', error);
    res.status(500).json({ error: 'Failed to update brand' });
  }
});

// Delete brand
router.delete('/brands/:id', auth, requireAdmin, async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.id);
    
    if (!brand) {
      return res.status(404).json({ error: 'Brand not found' });
    }

    // Check if brand has products
    const productCount = await Product.countDocuments({ brand: brand.name });
    if (productCount > 0) {
      return res.status(400).json({ error: 'Cannot delete brand with products' });
    }

    await Brand.findByIdAndDelete(req.params.id);
    res.json({ message: 'Brand deleted successfully' });
  } catch (error) {
    console.error('Error deleting brand:', error);
    res.status(500).json({ error: 'Failed to delete brand' });
  }
});

// ============ BANNER MANAGEMENT ============

// Get all banners
router.get('/banners', auth, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, position, placement, active } = req.query;
    const query = {};

    if (position) query.position = position;
    if (placement) query.placement = placement;
    if (active !== undefined) query.isActive = active === 'true';

    const banners = await Banner.find(query)
      .populate('targetAudience.categories', 'name')
      .sort({ sortOrder: 1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Banner.countDocuments(query);

    res.json({
      banners,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Error fetching banners:', error);
    res.status(500).json({ error: 'Failed to fetch banners' });
  }
});

// Get single banner
router.get('/banners/:id', auth, requireAdmin, async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id)
      .populate('targetAudience.categories', 'name');
    
    if (!banner) {
      return res.status(404).json({ error: 'Banner not found' });
    }

    res.json(banner);
  } catch (error) {
    console.error('Error fetching banner:', error);
    res.status(500).json({ error: 'Failed to fetch banner' });
  }
});

// Create banner
router.post('/banners', auth, requireAdmin, async (req, res) => {
  try {
    const banner = new Banner(req.body);
    await banner.save();
    res.status(201).json(banner);
  } catch (error) {
    console.error('Error creating banner:', error);
    res.status(500).json({ error: 'Failed to create banner' });
  }
});

// Update banner
router.put('/banners/:id', auth, requireAdmin, async (req, res) => {
  try {
    const banner = await Banner.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!banner) {
      return res.status(404).json({ error: 'Banner not found' });
    }

    res.json(banner);
  } catch (error) {
    console.error('Error updating banner:', error);
    res.status(500).json({ error: 'Failed to update banner' });
  }
});

// Delete banner
router.delete('/banners/:id', auth, requireAdmin, async (req, res) => {
  try {
    const banner = await Banner.findByIdAndDelete(req.params.id);
    
    if (!banner) {
      return res.status(404).json({ error: 'Banner not found' });
    }

    res.json({ message: 'Banner deleted successfully' });
  } catch (error) {
    console.error('Error deleting banner:', error);
    res.status(500).json({ error: 'Failed to delete banner' });
  }
});

// ============ FEATURED PRODUCTS MANAGEMENT ============

// Get featured products
router.get('/featured-products', auth, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    const products = await Product.find({ 'tags': 'featured' })
      .sort({ salesCount: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Product.countDocuments({ 'tags': 'featured' });

    res.json({
      products,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Error fetching featured products:', error);
    res.status(500).json({ error: 'Failed to fetch featured products' });
  }
});

// Add product to featured
router.post('/featured-products/:productId', auth, requireAdmin, async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.productId,
      { $addToSet: { tags: 'featured' } },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ message: 'Product added to featured', product });
  } catch (error) {
    console.error('Error adding featured product:', error);
    res.status(500).json({ error: 'Failed to add featured product' });
  }
});

// Remove product from featured
router.delete('/featured-products/:productId', auth, requireAdmin, async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.productId,
      { $pull: { tags: 'featured' } },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ message: 'Product removed from featured', product });
  } catch (error) {
    console.error('Error removing featured product:', error);
    res.status(500).json({ error: 'Failed to remove featured product' });
  }
});

// ============ UTILITY FUNCTIONS ============

// Update category product counts
async function updateCategoryProductCounts(categoryId) {
  try {
    const category = await Category.findById(categoryId);
    if (!category) return;

    const productCount = await Product.countDocuments({ category: category.name });
    await Category.findByIdAndUpdate(categoryId, { productCount });

    // Update parent categories recursively
    if (category.parent) {
      await updateCategoryProductCounts(category.parent);
    }
  } catch (error) {
    console.error('Error updating category product counts:', error);
  }
}

export default router;
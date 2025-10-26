import express from 'express';
import Category from '../models/Category.js';
import Brand from '../models/Brand.js';
import Banner from '../models/Banner.js';

const router = express.Router();

// ============ PUBLIC CATEGORY ROUTES ============

// Get category tree for navigation
router.get('/categories', async (req, res) => {
  try {
    const categoryTree = await Category.getCategoryTree();
    res.json(categoryTree);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Get single category by slug
router.get('/categories/:slug', async (req, res) => {
  try {
    const category = await Category.findOne({ 
      slug: req.params.slug, 
      isActive: true 
    }).populate('children');
    
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json(category);
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({ error: 'Failed to fetch category' });
  }
});

// Get featured categories
router.get('/categories/featured', async (req, res) => {
  try {
    const categories = await Category.find({ 
      isActive: true, 
      isFeatured: true 
    }).sort({ sortOrder: 1, name: 1 });
    
    res.json(categories);
  } catch (error) {
    console.error('Error fetching featured categories:', error);
    res.status(500).json({ error: 'Failed to fetch featured categories' });
  }
});

// ============ PUBLIC BRAND ROUTES ============

// Get all active brands
router.get('/brands', async (req, res) => {
  try {
    const { featured } = req.query;
    const query = { isActive: true };
    
    if (featured === 'true') {
      query.isFeatured = true;
    }

    const brands = await Brand.find(query)
      .sort({ sortOrder: 1, name: 1 });
    
    res.json(brands);
  } catch (error) {
    console.error('Error fetching brands:', error);
    res.status(500).json({ error: 'Failed to fetch brands' });
  }
});

// Get single brand by slug
router.get('/brands/:slug', async (req, res) => {
  try {
    const brand = await Brand.findOne({ 
      slug: req.params.slug, 
      isActive: true 
    });
    
    if (!brand) {
      return res.status(404).json({ error: 'Brand not found' });
    }

    res.json(brand);
  } catch (error) {
    console.error('Error fetching brand:', error);
    res.status(500).json({ error: 'Failed to fetch brand' });
  }
});

// ============ PUBLIC BANNER ROUTES ============

// Get active banners for a specific position and placement
router.get('/banners', async (req, res) => {
  try {
    const { position = 'hero', placement = 'home' } = req.query;
    
    const banners = await Banner.getActiveBanners(position, placement);
    
    // Increment impression count for returned banners
    const bannerIds = banners.map(banner => banner._id);
    if (bannerIds.length > 0) {
      await Banner.updateMany(
        { _id: { $in: bannerIds } },
        { $inc: { impressionCount: 1 } }
      );
    }
    
    res.json(banners);
  } catch (error) {
    console.error('Error fetching banners:', error);
    res.status(500).json({ error: 'Failed to fetch banners' });
  }
});

// Track banner click
router.post('/banners/:id/click', async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id);
    
    if (!banner) {
      return res.status(404).json({ error: 'Banner not found' });
    }

    await banner.incrementClick();
    res.json({ message: 'Click tracked successfully' });
  } catch (error) {
    console.error('Error tracking banner click:', error);
    res.status(500).json({ error: 'Failed to track click' });
  }
});

export default router;
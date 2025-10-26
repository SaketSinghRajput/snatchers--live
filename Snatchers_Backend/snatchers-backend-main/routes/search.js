import express from 'express';
import SearchService from '../services/SearchService.js';

const router = express.Router();

// Advanced search with filters and pagination
router.get('/', async (req, res) => {
  try {
    const {
      q = '',
      page = 1,
      limit = 20,
      sortBy = 'relevance',
      sortOrder = 'desc',
      brands,
      categories,
      priceMin,
      priceMax,
      rating,
      inStock
    } = req.query;

    // Parse filters
    const filters = {};
    if (brands) filters.brands = Array.isArray(brands) ? brands : brands.split(',');
    if (categories) filters.categories = Array.isArray(categories) ? categories : categories.split(',');
    if (priceMin) filters.priceMin = parseFloat(priceMin);
    if (priceMax) filters.priceMax = parseFloat(priceMax);
    if (rating) filters.rating = parseFloat(rating);
    if (inStock === 'true') filters.inStock = true;

    // Search options
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy,
      sortOrder
    };

    const results = await SearchService.searchWithFilters(q, filters, options);
    
    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Search failed', 
      details: error.message 
    });
  }
});

// Autocomplete suggestions
router.get('/autocomplete', async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.json({
        success: true,
        data: { suggestions: [] }
      });
    }

    const suggestions = await SearchService.getAutocompleteSuggestions(q, parseInt(limit));
    
    res.json({
      success: true,
      data: { suggestions }
    });
  } catch (error) {
    console.error('Autocomplete error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Autocomplete failed', 
      details: error.message 
    });
  }
});

// Reindex all products (admin only)
router.post('/reindex', async (req, res) => {
  try {
    // TODO: Add admin authentication middleware
    await SearchService.reindexAllProducts();
    
    res.json({
      success: true,
      message: 'Products reindexed successfully'
    });
  } catch (error) {
    console.error('Reindex error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Reindex failed', 
      details: error.message 
    });
  }
});

export default router;

import express from 'express';
import SEOService from '../services/SEOService.js';
import Product from '../models/Product.js';

const router = express.Router();

// Generate and serve sitemap.xml
router.get('/sitemap.xml', async (req, res) => {
  try {
    const sitemap = await SEOService.generateSitemap();
    
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    res.send(sitemap);
  } catch (error) {
    console.error('Error generating sitemap:', error);
    res.status(500).json({ error: 'Failed to generate sitemap' });
  }
});

// Generate and serve robots.txt
router.get('/robots.txt', (req, res) => {
  try {
    const robotsTxt = SEOService.generateRobotsTxt();
    
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    res.send(robotsTxt);
  } catch (error) {
    console.error('Error generating robots.txt:', error);
    res.status(500).send('User-agent: *\nDisallow: /');
  }
});

// Get product by slug (SEO-friendly URL)
router.get('/product/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    
    // First try to find by slug
    let product = await Product.findOne({ 'seo.slug': slug, status: 'active' });
    
    // If not found by slug, try by ID (backward compatibility)
    if (!product) {
      product = await Product.findById(slug);
    }
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Generate SEO meta tags
    const metaTags = SEOService.generateProductMetaTags(product);
    
    // Generate structured data
    const structuredData = SEOService.generateProductStructuredData(product);

    res.json({
      product,
      seo: {
        metaTags,
        structuredData,
        canonical: `/product/${product.seo?.slug || product._id}`
      }
    });
  } catch (error) {
    console.error('Error fetching product by slug:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update product slug (admin endpoint)
router.post('/product/:id/update-slug', async (req, res) => {
  try {
    const { id } = req.params;
    const slug = await SEOService.updateProductSlug(id);
    
    res.json({ success: true, slug });
  } catch (error) {
    console.error('Error updating product slug:', error);
    res.status(500).json({ error: 'Failed to update product slug' });
  }
});

// Bulk update all product slugs (admin endpoint)
router.post('/products/update-slugs', async (req, res) => {
  try {
    const results = await SEOService.updateAllProductSlugs();
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    res.json({ 
      success: true, 
      message: `Updated ${successful} products successfully, ${failed} failed`,
      results 
    });
  } catch (error) {
    console.error('Error bulk updating product slugs:', error);
    res.status(500).json({ error: 'Failed to bulk update product slugs' });
  }
});

// Get SEO data for a specific page
router.get('/page-seo', async (req, res) => {
  try {
    const { path, type } = req.query;
    
    let seoData = {
      title: 'Snatchers - Your Ultimate Shopping Destination',
      description: 'Discover amazing products at unbeatable prices. Shop electronics, fashion, home & garden, and more with fast delivery and secure payments.',
      keywords: ['online shopping', 'ecommerce', 'electronics', 'fashion', 'home decor'],
      image: '/images/og-default.jpg',
      type: 'website'
    };

    // Generate page-specific SEO data
    switch (path) {
      case '/':
        seoData = {
          ...seoData,
          title: 'Snatchers - Best Online Shopping Experience in India',
          description: 'Shop the latest electronics, fashion, home & garden products at unbeatable prices. Free shipping, easy returns, and secure payments.',
          keywords: [...seoData.keywords, 'best deals', 'online store', 'shopping india']
        };
        break;
      
      case '/shop':
        seoData = {
          ...seoData,
          title: 'Shop All Products - Snatchers',
          description: 'Browse our complete collection of products across all categories. Find the best deals on electronics, fashion, and more.',
          keywords: [...seoData.keywords, 'all products', 'browse', 'catalog']
        };
        break;
      
      case '/mens':
        seoData = {
          ...seoData,
          title: 'Men\'s Fashion & Accessories - Snatchers',
          description: 'Discover the latest men\'s fashion, clothing, and accessories. Shop shirts, pants, shoes, and more at great prices.',
          keywords: ['mens fashion', 'mens clothing', 'mens accessories', 'shirts', 'pants', 'shoes']
        };
        break;
      
      case '/womens':
        seoData = {
          ...seoData,
          title: 'Women\'s Fashion & Accessories - Snatchers',
          description: 'Explore trendy women\'s fashion, clothing, and accessories. Shop dresses, tops, bags, and more at affordable prices.',
          keywords: ['womens fashion', 'womens clothing', 'womens accessories', 'dresses', 'tops', 'bags']
        };
        break;
    }

    res.json({ seo: seoData });
  } catch (error) {
    console.error('Error generating page SEO:', error);
    res.status(500).json({ error: 'Failed to generate page SEO data' });
  }
});

export default router;
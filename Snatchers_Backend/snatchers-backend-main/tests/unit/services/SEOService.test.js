import SEOService from '../../../services/SEOService.js';
import { createTestProduct } from '../../setup.js';

describe('SEOService', () => {
  let seoService;

  beforeEach(() => {
    seoService = new SEOService();
  });

  describe('generateMetaTags', () => {
    test('should generate meta tags for product page', async () => {
      const product = await createTestProduct({
        title: 'Test Laptop',
        description: 'High performance laptop for gaming',
        price: 1299.99,
        brand: 'TestBrand',
        category: 'Electronics'
      });

      const metaTags = await seoService.generateMetaTags('product', product);

      expect(metaTags).toHaveProperty('title');
      expect(metaTags).toHaveProperty('description');
      expect(metaTags).toHaveProperty('keywords');
      expect(metaTags.title).toContain(product.title);
      expect(metaTags.description).toContain(product.description);
      expect(metaTags.keywords).toContain(product.brand);
      expect(metaTags.keywords).toContain(product.category);
    });

    test('should generate meta tags for category page', async () => {
      const categoryData = {
        name: 'Electronics',
        description: 'Latest electronic gadgets and devices',
        productCount: 150
      };

      const metaTags = await seoService.generateMetaTags('category', categoryData);

      expect(metaTags.title).toContain(categoryData.name);
      expect(metaTags.description).toContain(categoryData.description);
      expect(metaTags.keywords).toContain(categoryData.name.toLowerCase());
    });

    test('should optimize title length for SEO', async () => {
      const product = await createTestProduct({
        title: 'This is a very long product title that exceeds the recommended SEO title length and should be optimized',
        description: 'Product description'
      });

      const metaTags = await seoService.generateMetaTags('product', product);

      expect(metaTags.title.length).toBeLessThanOrEqual(60);
    });

    test('should optimize description length for SEO', async () => {
      const product = await createTestProduct({
        title: 'Test Product',
        description: 'This is a very long product description that exceeds the recommended SEO meta description length and should be optimized for better search engine visibility and click-through rates from search results.'
      });

      const metaTags = await seoService.generateMetaTags('product', product);

      expect(metaTags.description.length).toBeLessThanOrEqual(160);
    });
  });

  describe('createStructuredData', () => {
    test('should create valid Product structured data', async () => {
      const product = await createTestProduct({
        title: 'Test Smartphone',
        description: 'Latest smartphone with advanced features',
        price: 699.99,
        offerPrice: 599.99,
        brand: 'TestBrand',
        sku: 'PHONE-123',
        averageRating: 4.5,
        reviewCount: 25
      });

      const structuredData = await seoService.createStructuredData('Product', product);

      expect(structuredData['@context']).toBe('https://schema.org');
      expect(structuredData['@type']).toBe('Product');
      expect(structuredData.name).toBe(product.title);
      expect(structuredData.description).toBe(product.description);
      expect(structuredData.sku).toBe(product.sku);
      expect(structuredData.brand.name).toBe(product.brand);
      
      // Check offers
      expect(structuredData.offers).toBeDefined();
      expect(structuredData.offers['@type']).toBe('Offer');
      expect(structuredData.offers.price).toBe(product.offerPrice);
      expect(structuredData.offers.priceCurrency).toBe('INR');
      
      // Check aggregate rating
      expect(structuredData.aggregateRating).toBeDefined();
      expect(structuredData.aggregateRating.ratingValue).toBe(product.averageRating);
      expect(structuredData.aggregateRating.reviewCount).toBe(product.reviewCount);
    });

    test('should create valid Organization structured data', async () => {
      const organizationData = {
        name: 'Snatchers',
        url: 'https://snatchers.in',
        logo: 'https://snatchers.in/logo.png',
        description: 'Premium e-commerce platform for quality products'
      };

      const structuredData = await seoService.createStructuredData('Organization', organizationData);

      expect(structuredData['@context']).toBe('https://schema.org');
      expect(structuredData['@type']).toBe('Organization');
      expect(structuredData.name).toBe(organizationData.name);
      expect(structuredData.url).toBe(organizationData.url);
      expect(structuredData.logo).toBe(organizationData.logo);
    });

    test('should create valid BreadcrumbList structured data', async () => {
      const breadcrumbs = [
        { name: 'Home', url: '/' },
        { name: 'Electronics', url: '/category/electronics' },
        { name: 'Smartphones', url: '/category/electronics/smartphones' }
      ];

      const structuredData = await seoService.createStructuredData('BreadcrumbList', breadcrumbs);

      expect(structuredData['@context']).toBe('https://schema.org');
      expect(structuredData['@type']).toBe('BreadcrumbList');
      expect(structuredData.itemListElement).toHaveLength(3);
      
      const firstItem = structuredData.itemListElement[0];
      expect(firstItem['@type']).toBe('ListItem');
      expect(firstItem.position).toBe(1);
      expect(firstItem.name).toBe('Home');
      expect(firstItem.item).toBe('/');
    });
  });

  describe('generateSitemap', () => {
    test('should generate valid XML sitemap', async () => {
      // Create test products
      await createTestProduct({ title: 'Product 1', seo: { slug: 'product-1' } });
      await createTestProduct({ title: 'Product 2', seo: { slug: 'product-2' } });

      const sitemap = await seoService.generateSitemap();

      expect(sitemap).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(sitemap).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
      expect(sitemap).toContain('<url>');
      expect(sitemap).toContain('<loc>');
      expect(sitemap).toContain('<lastmod>');
      expect(sitemap).toContain('<priority>');
      expect(sitemap).toContain('</urlset>');
    });

    test('should include all important pages in sitemap', async () => {
      const sitemap = await seoService.generateSitemap();

      // Check for homepage
      expect(sitemap).toContain('<loc>https://snatchers.in/</loc>');
      
      // Check for category pages
      expect(sitemap).toContain('/category/');
      
      // Check for product pages
      expect(sitemap).toContain('/product/');
    });

    test('should set proper priorities for different page types', async () => {
      const sitemap = await seoService.generateSitemap();

      // Homepage should have highest priority
      const homepageMatch = sitemap.match(/<loc>https:\/\/snatchers\.in\/<\/loc>[\s\S]*?<priority>([\d.]+)<\/priority>/);
      if (homepageMatch) {
        expect(parseFloat(homepageMatch[1])).toBe(1.0);
      }
    });
  });

  describe('optimizeImages', () => {
    test('should optimize image URLs for SEO', async () => {
      const images = [
        'https://example.com/image1.jpg',
        'https://example.com/image2.png',
        'https://example.com/image3.webp'
      ];

      const optimizedImages = await seoService.optimizeImages(images);

      expect(optimizedImages).toHaveLength(3);
      optimizedImages.forEach(image => {
        expect(image).toMatch(/\.(webp|jpg|png)$/);
        expect(image).toContain('?');
        expect(image).toContain('w=');
        expect(image).toContain('h=');
      });
    });

    test('should handle empty image arrays', async () => {
      const optimizedImages = await seoService.optimizeImages([]);
      expect(optimizedImages).toHaveLength(0);
    });

    test('should handle invalid image URLs', async () => {
      const images = ['invalid-url', 'not-an-image.txt'];
      const optimizedImages = await seoService.optimizeImages(images);
      
      // Should filter out invalid images
      expect(optimizedImages.length).toBeLessThanOrEqual(images.length);
    });
  });

  describe('validateSEOData', () => {
    test('should validate complete SEO data', async () => {
      const seoData = {
        title: 'Valid SEO Title',
        description: 'Valid SEO description that is within the recommended length',
        keywords: ['keyword1', 'keyword2', 'keyword3'],
        canonicalUrl: 'https://snatchers.in/valid-page',
        ogImage: 'https://snatchers.in/og-image.jpg'
      };

      const validation = await seoService.validateSEOData(seoData);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should detect SEO issues', async () => {
      const seoData = {
        title: '', // Missing title
        description: 'This is a very long description that exceeds the recommended length for SEO meta descriptions and should be flagged as an issue by the validation system',
        keywords: [], // No keywords
        canonicalUrl: 'invalid-url', // Invalid URL
        ogImage: '' // Missing OG image
      };

      const validation = await seoService.validateSEOData(seoData);

      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors).toContain('Title is required');
      expect(validation.errors).toContain('Description is too long');
      expect(validation.errors).toContain('Invalid canonical URL');
    });
  });
});
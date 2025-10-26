import { SitemapStream, streamToPromise } from 'sitemap';
import { Readable } from 'stream';
import slugify from 'slugify';
import Product from '../models/Product.js';

class SEOService {
  constructor() {
    this.baseUrl = process.env.FRONTEND_URL || 'https://snatchers.in';
  }

  // Generate SEO-friendly slug from title
  generateSlug(title, id = null) {
    const baseSlug = slugify(title, {
      lower: true,
      strict: true,
      remove: /[*+~.()'"!:@]/g
    });
    
    // Add ID suffix to ensure uniqueness if provided
    return id ? `${baseSlug}-${id}` : baseSlug;
  }

  // Update product with SEO-friendly slug
  async updateProductSlug(productId) {
    try {
      const product = await Product.findById(productId);
      if (!product) {
        throw new Error('Product not found');
      }

      // Generate slug if not exists
      if (!product.seo?.slug) {
        const slug = this.generateSlug(product.title, product._id.toString().slice(-6));
        
        // Ensure slug is unique
        const existingProduct = await Product.findOne({ 'seo.slug': slug });
        let finalSlug = slug;
        let counter = 1;
        
        while (existingProduct && existingProduct._id.toString() !== productId) {
          finalSlug = `${slug}-${counter}`;
          const duplicate = await Product.findOne({ 'seo.slug': finalSlug });
          if (!duplicate) break;
          counter++;
        }

        // Update product with SEO data
        await Product.findByIdAndUpdate(productId, {
          $set: {
            'seo.slug': finalSlug,
            'seo.metaTitle': product.seo?.metaTitle || `${product.title} - Buy Online at Best Price | Snatchers`,
            'seo.metaDescription': product.seo?.metaDescription || 
              `Buy ${product.title} online at the best price. ${product.brand ? `${product.brand} ` : ''}Free shipping and easy returns. Shop now at Snatchers.`,
            'seo.keywords': product.seo?.keywords || [
              product.title.toLowerCase(),
              product.brand?.toLowerCase(),
              product.category?.toLowerCase(),
              'buy online',
              'best price',
              'free shipping'
            ].filter(Boolean)
          }
        });

        return finalSlug;
      }

      return product.seo.slug;
    } catch (error) {
      console.error('Error updating product slug:', error);
      throw error;
    }
  }

  // Bulk update all products with SEO slugs
  async updateAllProductSlugs() {
    try {
      const products = await Product.find({ 'seo.slug': { $exists: false } });
      const results = [];

      for (const product of products) {
        try {
          const slug = await this.updateProductSlug(product._id);
          results.push({ productId: product._id, slug, success: true });
        } catch (error) {
          results.push({ productId: product._id, error: error.message, success: false });
        }
      }

      return results;
    } catch (error) {
      console.error('Error bulk updating product slugs:', error);
      throw error;
    }
  }

  // Generate XML sitemap
  async generateSitemap() {
    try {
      const links = [];

      // Static pages
      const staticPages = [
        { url: '/', changefreq: 'daily', priority: 1.0 },
        { url: '/shop', changefreq: 'daily', priority: 0.9 },
        { url: '/mens', changefreq: 'weekly', priority: 0.8 },
        { url: '/womens', changefreq: 'weekly', priority: 0.8 },
        { url: '/about', changefreq: 'monthly', priority: 0.6 },
        { url: '/contact', changefreq: 'monthly', priority: 0.6 },
        { url: '/shipping', changefreq: 'monthly', priority: 0.5 },
        { url: '/warranty', changefreq: 'monthly', priority: 0.5 },
        { url: '/faq', changefreq: 'monthly', priority: 0.5 }
      ];

      links.push(...staticPages);

      // Product pages
      const products = await Product.find({ 
        status: 'active',
        'seo.slug': { $exists: true }
      }).select('seo.slug updatedAt category');

      products.forEach(product => {
        links.push({
          url: `/product/${product.seo.slug}`,
          changefreq: 'weekly',
          priority: 0.7,
          lastmod: product.updatedAt
        });
      });

      // Category pages (if you have dynamic category routes)
      const categories = await Product.distinct('category', { status: 'active' });
      categories.forEach(category => {
        const categorySlug = slugify(category, { lower: true, strict: true });
        links.push({
          url: `/category/${categorySlug}`,
          changefreq: 'weekly',
          priority: 0.8
        });
      });

      // Create sitemap
      const stream = new SitemapStream({ hostname: this.baseUrl });
      const xml = await streamToPromise(Readable.from(links).pipe(stream));
      
      return xml.toString();
    } catch (error) {
      console.error('Error generating sitemap:', error);
      throw error;
    }
  }

  // Generate robots.txt content
  generateRobotsTxt() {
    const robotsContent = `User-agent: *
Allow: /

# Disallow admin and private pages
Disallow: /admin/
Disallow: /profile/
Disallow: /cart/
Disallow: /checkout/
Disallow: /auth/

# Disallow search and filter URLs with parameters
Disallow: /*?*sort=
Disallow: /*?*filter=
Disallow: /*?*page=

# Allow important pages
Allow: /shop
Allow: /mens
Allow: /womens
Allow: /about
Allow: /contact
Allow: /product/

# Sitemap location
Sitemap: ${this.baseUrl}/sitemap.xml

# Crawl delay (optional)
Crawl-delay: 1`;

    return robotsContent;
  }

  // Generate meta tags for a product
  generateProductMetaTags(product) {
    const title = product.seo?.metaTitle || `${product.title} - Buy Online at Best Price | Snatchers`;
    const description = product.seo?.metaDescription || 
      `Buy ${product.title} online at the best price. ${product.brand ? `${product.brand} ` : ''}Free shipping and easy returns. Shop now at Snatchers.`;
    
    const keywords = product.seo?.keywords || [
      product.title.toLowerCase(),
      product.brand?.toLowerCase(),
      product.category?.toLowerCase(),
      'buy online',
      'best price',
      'free shipping'
    ].filter(Boolean);

    return {
      title,
      description,
      keywords,
      image: product.images?.[0] || '/images/default-product.jpg',
      url: `/product/${product.seo?.slug || product._id}`,
      type: 'product'
    };
  }

  // Generate structured data for a product
  generateProductStructuredData(product, reviews = []) {
    const baseUrl = this.baseUrl;
    
    const structuredData = {
      "@context": "https://schema.org/",
      "@type": "Product",
      "name": product.title,
      "description": product.description || product.shortDescription || product.title,
      "sku": product.sku,
      "brand": {
        "@type": "Brand",
        "name": product.brand
      },
      "category": product.category,
      "image": product.images?.map(img => 
        img.startsWith('http') ? img : `${baseUrl}${img}`
      ) || [],
      "url": `${baseUrl}/product/${product.seo?.slug || product._id}`,
      "offers": {
        "@type": "Offer",
        "price": product.offerPrice || product.price,
        "priceCurrency": "INR",
        "availability": product.inventory?.quantity > 0 
          ? "https://schema.org/InStock" 
          : "https://schema.org/OutOfStock",
        "seller": {
          "@type": "Organization",
          "name": "Snatchers"
        }
      }
    };

    // Add aggregate rating if available
    if (product.averageRating && product.reviewCount) {
      structuredData.aggregateRating = {
        "@type": "AggregateRating",
        "ratingValue": product.averageRating,
        "reviewCount": product.reviewCount,
        "bestRating": 5,
        "worstRating": 1
      };
    }

    return structuredData;
  }
}

export default new SEOService();
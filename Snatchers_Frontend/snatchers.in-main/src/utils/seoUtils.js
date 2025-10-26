// SEO utility functions for frontend

/**
 * Generate SEO-friendly slug from title
 * @param {string} title - The title to convert to slug
 * @param {string} id - Optional ID to append for uniqueness
 * @returns {string} SEO-friendly slug
 */
export const generateSlug = (title, id = null) => {
  if (!title) return '';
  
  const baseSlug = title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters except spaces and hyphens
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  
  return id ? `${baseSlug}-${id}` : baseSlug;
};

/**
 * Extract product ID from SEO-friendly URL slug
 * @param {string} slug - The slug to extract ID from
 * @returns {string|null} Product ID or null if not found
 */
export const extractIdFromSlug = (slug) => {
  if (!slug) return null;
  
  // Check if slug ends with a MongoDB ObjectId pattern (24 hex characters)
  const objectIdMatch = slug.match(/-([a-f0-9]{24})$/i);
  if (objectIdMatch) {
    return objectIdMatch[1];
  }
  
  // Check if slug ends with a shorter ID pattern (6+ characters)
  const shortIdMatch = slug.match(/-([a-f0-9]{6,})$/i);
  if (shortIdMatch) {
    return shortIdMatch[1];
  }
  
  // If no ID pattern found, return the slug itself (might be a direct ID)
  return slug;
};

/**
 * Generate product URL with SEO-friendly slug
 * @param {Object} product - Product object
 * @returns {string} SEO-friendly product URL
 */
export const getProductUrl = (product) => {
  if (!product) return '/shop';
  
  // Use existing slug if available
  if (product.seo?.slug) {
    return `/product/${product.seo.slug}`;
  }
  
  // Generate slug from title and ID
  const slug = generateSlug(product.title, product._id?.slice(-6));
  return `/product/${slug}`;
};

/**
 * Generate category URL with SEO-friendly slug
 * @param {string} category - Category name
 * @returns {string} SEO-friendly category URL
 */
export const getCategoryUrl = (category) => {
  if (!category) return '/shop';
  
  const slug = generateSlug(category);
  return `/category/${slug}`;
};

/**
 * Generate breadcrumb data for SEO
 * @param {string} pathname - Current pathname
 * @param {Object} product - Product object (optional)
 * @param {string} category - Category name (optional)
 * @returns {Array} Breadcrumb array
 */
export const generateBreadcrumbs = (pathname, product = null, category = null) => {
  const breadcrumbs = [{ name: 'Home', url: '/' }];
  
  if (!pathname) return breadcrumbs;
  
  const pathSegments = pathname.split('/').filter(Boolean);
  
  pathSegments.forEach((segment, index) => {
    const url = '/' + pathSegments.slice(0, index + 1).join('/');
    
    switch (segment) {
      case 'shop':
        breadcrumbs.push({ name: 'Shop', url });
        break;
      case 'mens':
        breadcrumbs.push({ name: 'Men\'s Fashion', url });
        break;
      case 'womens':
        breadcrumbs.push({ name: 'Women\'s Fashion', url });
        break;
      case 'about':
        breadcrumbs.push({ name: 'About Us', url });
        break;
      case 'contact':
        breadcrumbs.push({ name: 'Contact Us', url });
        break;
      case 'category':
        if (category) {
          breadcrumbs.push({ name: category, url });
        }
        break;
      case 'product':
        if (category) {
          breadcrumbs.push({ 
            name: category, 
            url: getCategoryUrl(category)
          });
        }
        if (product) {
          breadcrumbs.push({ name: product.title });
        }
        break;
      default:
        // Capitalize first letter for unknown segments
        const name = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
        breadcrumbs.push({ name, url });
    }
  });
  
  return breadcrumbs;
};

/**
 * Generate meta description for products
 * @param {Object} product - Product object
 * @returns {string} Meta description
 */
export const generateProductMetaDescription = (product) => {
  if (!product) return '';
  
  const brand = product.brand ? `${product.brand} ` : '';
  const price = product.offerPrice || product.price;
  const priceText = price ? ` at ₹${price}` : '';
  
  return `Buy ${brand}${product.title} online${priceText}. ${product.shortDescription || 'Free shipping and easy returns.'} Shop now at Snatchers.`;
};

/**
 * Generate keywords for products
 * @param {Object} product - Product object
 * @returns {Array} Keywords array
 */
export const generateProductKeywords = (product) => {
  if (!product) return [];
  
  const keywords = [
    product.title?.toLowerCase(),
    product.brand?.toLowerCase(),
    product.category?.toLowerCase(),
    'buy online',
    'best price',
    'free shipping',
    'snatchers'
  ].filter(Boolean);
  
  // Add additional keywords from tags if available
  if (product.tags && Array.isArray(product.tags)) {
    keywords.push(...product.tags.map(tag => tag.toLowerCase()));
  }
  
  // Remove duplicates
  return [...new Set(keywords)];
};

/**
 * Validate and clean URL slug
 * @param {string} slug - Slug to validate
 * @returns {string} Clean slug
 */
export const cleanSlug = (slug) => {
  if (!slug) return '';
  
  return slug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
};

/**
 * Check if a URL is SEO-friendly
 * @param {string} url - URL to check
 * @returns {boolean} True if SEO-friendly
 */
export const isSEOFriendlyUrl = (url) => {
  if (!url) return false;
  
  // Check for common SEO-unfriendly patterns
  const unfriendlyPatterns = [
    /\?.*=/, // Query parameters
    /#/, // Hash fragments
    /[A-Z]/, // Uppercase letters
    /[^a-z0-9\-\/]/, // Special characters except hyphens and slashes
    /--+/, // Multiple consecutive hyphens
    /\/$/ // Trailing slash (except root)
  ];
  
  return !unfriendlyPatterns.some(pattern => pattern.test(url));
};

/**
 * Generate canonical URL
 * @param {string} pathname - Current pathname
 * @param {string} baseUrl - Base URL
 * @returns {string} Canonical URL
 */
export const generateCanonicalUrl = (pathname, baseUrl = 'https://snatchers.in') => {
  if (!pathname) return baseUrl;
  
  // Remove query parameters and hash fragments for canonical URL
  const cleanPath = pathname.split('?')[0].split('#')[0];
  
  // Ensure no trailing slash except for root
  const finalPath = cleanPath === '/' ? '/' : cleanPath.replace(/\/$/, '');
  
  return `${baseUrl}${finalPath}`;
};
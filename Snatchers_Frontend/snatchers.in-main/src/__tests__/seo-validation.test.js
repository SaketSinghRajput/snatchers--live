import { render } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter } from 'react-router-dom';
import SEOHead from '../components/SEO/SEOHead';
import ProductSchema from '../components/SEO/ProductSchema';
import BreadcrumbSchema from '../components/SEO/BreadcrumbSchema';

const renderWithProviders = (component) => {
  return render(
    <BrowserRouter>
      <HelmetProvider>
        {component}
      </HelmetProvider>
    </BrowserRouter>
  );
};

describe('SEO Validation Tests', () => {
  describe('Meta Tags Validation', () => {
    test('should have required meta tags', () => {
      renderWithProviders(
        <SEOHead 
          title="Test Product Page"
          description="This is a test product description for SEO testing"
          keywords={['test', 'product', 'ecommerce']}
          image="https://example.com/test-image.jpg"
          url="https://example.com/test-product"
        />
      );

      // Check title
      expect(document.title).toContain('Test Product Page');

      // Check meta description
      const metaDescription = document.querySelector('meta[name="description"]');
      expect(metaDescription).toHaveAttribute('content', 'This is a test product description for SEO testing');

      // Check meta keywords
      const metaKeywords = document.querySelector('meta[name="keywords"]');
      expect(metaKeywords).toHaveAttribute('content', 'test,product,ecommerce');

      // Check canonical URL
      const canonical = document.querySelector('link[rel="canonical"]');
      expect(canonical).toHaveAttribute('href', 'https://example.com/test-product');
    });

    test('should have proper Open Graph tags', () => {
      renderWithProviders(
        <SEOHead 
          title="OG Test Title"
          description="OG Test Description"
          image="https://example.com/og-image.jpg"
          url="https://example.com/og-test"
        />
      );

      // Check Open Graph tags
      const ogTitle = document.querySelector('meta[property="og:title"]');
      const ogDescription = document.querySelector('meta[property="og:description"]');
      const ogImage = document.querySelector('meta[property="og:image"]');
      const ogUrl = document.querySelector('meta[property="og:url"]');
      const ogType = document.querySelector('meta[property="og:type"]');

      expect(ogTitle).toHaveAttribute('content', 'OG Test Title');
      expect(ogDescription).toHaveAttribute('content', 'OG Test Description');
      expect(ogImage).toHaveAttribute('content', 'https://example.com/og-image.jpg');
      expect(ogUrl).toHaveAttribute('content', 'https://example.com/og-test');
      expect(ogType).toHaveAttribute('content', 'website');
    });

    test('should have proper Twitter Card tags', () => {
      renderWithProviders(
        <SEOHead 
          title="Twitter Test Title"
          description="Twitter Test Description"
          image="https://example.com/twitter-image.jpg"
        />
      );

      // Check Twitter Card tags
      const twitterCard = document.querySelector('meta[name="twitter:card"]');
      const twitterTitle = document.querySelector('meta[name="twitter:title"]');
      const twitterDescription = document.querySelector('meta[name="twitter:description"]');
      const twitterImage = document.querySelector('meta[name="twitter:image"]');

      expect(twitterCard).toHaveAttribute('content', 'summary_large_image');
      expect(twitterTitle).toHaveAttribute('content', 'Twitter Test Title');
      expect(twitterDescription).toHaveAttribute('content', 'Twitter Test Description');
      expect(twitterImage).toHaveAttribute('content', 'https://example.com/twitter-image.jpg');
    });
  });

  describe('Structured Data Validation', () => {
    test('should generate valid Product schema', () => {
      const mockProduct = {
        _id: '123',
        title: 'Test Product',
        description: 'Test product description',
        price: 99.99,
        offerPrice: 79.99,
        images: ['https://example.com/image1.jpg'],
        brand: 'Test Brand',
        category: 'Electronics',
        averageRating: 4.5,
        reviewCount: 10,
        sku: 'TEST-SKU-123'
      };

      renderWithProviders(<ProductSchema product={mockProduct} />);

      const scriptTag = document.querySelector('script[type="application/ld+json"]');
      expect(scriptTag).toBeInTheDocument();

      const schemaData = JSON.parse(scriptTag.textContent);
      
      // Validate required Product schema properties
      expect(schemaData['@context']).toBe('https://schema.org');
      expect(schemaData['@type']).toBe('Product');
      expect(schemaData.name).toBe(mockProduct.title);
      expect(schemaData.description).toBe(mockProduct.description);
      expect(schemaData.sku).toBe(mockProduct.sku);
      expect(schemaData.brand.name).toBe(mockProduct.brand);
      
      // Validate offers
      expect(schemaData.offers).toBeDefined();
      expect(schemaData.offers['@type']).toBe('Offer');
      expect(schemaData.offers.price).toBe(mockProduct.offerPrice);
      expect(schemaData.offers.priceCurrency).toBe('INR');
      
      // Validate aggregate rating
      expect(schemaData.aggregateRating).toBeDefined();
      expect(schemaData.aggregateRating['@type']).toBe('AggregateRating');
      expect(schemaData.aggregateRating.ratingValue).toBe(mockProduct.averageRating);
      expect(schemaData.aggregateRating.reviewCount).toBe(mockProduct.reviewCount);
    });

    test('should generate valid Breadcrumb schema', () => {
      const breadcrumbs = [
        { name: 'Home', url: '/' },
        { name: 'Electronics', url: '/category/electronics' },
        { name: 'Laptops', url: '/category/electronics/laptops' },
        { name: 'Gaming Laptop', url: '/product/gaming-laptop' }
      ];

      renderWithProviders(<BreadcrumbSchema breadcrumbs={breadcrumbs} />);

      const scriptTag = document.querySelector('script[type="application/ld+json"]');
      expect(scriptTag).toBeInTheDocument();

      const schemaData = JSON.parse(scriptTag.textContent);
      
      expect(schemaData['@context']).toBe('https://schema.org');
      expect(schemaData['@type']).toBe('BreadcrumbList');
      expect(schemaData.itemListElement).toHaveLength(4);
      
      // Validate first breadcrumb item
      const firstItem = schemaData.itemListElement[0];
      expect(firstItem['@type']).toBe('ListItem');
      expect(firstItem.position).toBe(1);
      expect(firstItem.name).toBe('Home');
      expect(firstItem.item).toBe('/');
    });
  });

  describe('SEO Best Practices', () => {
    test('should have proper title length', () => {
      const longTitle = 'This is a very long title that exceeds the recommended length for SEO purposes and should be truncated or optimized for better search engine visibility';
      
      renderWithProviders(
        <SEOHead title={longTitle} />
      );

      expect(document.title.length).toBeLessThanOrEqual(60);
    });

    test('should have proper meta description length', () => {
      const longDescription = 'This is a very long meta description that exceeds the recommended length for SEO purposes. It should be optimized to be between 150-160 characters for better search engine visibility and click-through rates.';
      
      renderWithProviders(
        <SEOHead 
          title="Test"
          description={longDescription}
        />
      );

      const metaDescription = document.querySelector('meta[name="description"]');
      const content = metaDescription.getAttribute('content');
      expect(content.length).toBeLessThanOrEqual(160);
    });

    test('should not have duplicate meta tags', () => {
      renderWithProviders(
        <SEOHead 
          title="Test Title"
          description="Test Description"
        />
      );

      // Check for duplicate meta descriptions
      const metaDescriptions = document.querySelectorAll('meta[name="description"]');
      expect(metaDescriptions.length).toBe(1);

      // Check for duplicate canonical links
      const canonicals = document.querySelectorAll('link[rel="canonical"]');
      expect(canonicals.length).toBeLessThanOrEqual(1);
    });
  });
});
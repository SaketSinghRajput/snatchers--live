import { render } from '@testing-library/react';
import ProductSchema from '../ProductSchema';

describe('ProductSchema Component', () => {
  const mockProduct = {
    _id: '123',
    title: 'Test Product',
    description: 'Test product description',
    price: 99.99,
    offerPrice: 79.99,
    images: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
    brand: 'Test Brand',
    category: 'Electronics',
    averageRating: 4.5,
    reviewCount: 10,
    availability: 'InStock',
    sku: 'TEST-SKU-123'
  };

  test('renders structured data script tag', () => {
    render(<ProductSchema product={mockProduct} />);
    
    const scriptTag = document.querySelector('script[type="application/ld+json"]');
    expect(scriptTag).toBeInTheDocument();
  });

  test('generates correct product schema', () => {
    render(<ProductSchema product={mockProduct} />);
    
    const scriptTag = document.querySelector('script[type="application/ld+json"]');
    const schemaData = JSON.parse(scriptTag.textContent);
    
    expect(schemaData['@type']).toBe('Product');
    expect(schemaData.name).toBe(mockProduct.title);
    expect(schemaData.description).toBe(mockProduct.description);
    expect(schemaData.brand.name).toBe(mockProduct.brand);
    expect(schemaData.sku).toBe(mockProduct.sku);
  });

  test('includes offer information', () => {
    render(<ProductSchema product={mockProduct} />);
    
    const scriptTag = document.querySelector('script[type="application/ld+json"]');
    const schemaData = JSON.parse(scriptTag.textContent);
    
    expect(schemaData.offers).toBeDefined();
    expect(schemaData.offers['@type']).toBe('Offer');
    expect(schemaData.offers.price).toBe(mockProduct.offerPrice || mockProduct.price);
    expect(schemaData.offers.priceCurrency).toBe('INR');
    expect(schemaData.offers.availability).toContain('InStock');
  });

  test('includes aggregate rating when reviews exist', () => {
    render(<ProductSchema product={mockProduct} />);
    
    const scriptTag = document.querySelector('script[type="application/ld+json"]');
    const schemaData = JSON.parse(scriptTag.textContent);
    
    expect(schemaData.aggregateRating).toBeDefined();
    expect(schemaData.aggregateRating['@type']).toBe('AggregateRating');
    expect(schemaData.aggregateRating.ratingValue).toBe(mockProduct.averageRating);
    expect(schemaData.aggregateRating.reviewCount).toBe(mockProduct.reviewCount);
  });

  test('handles product without reviews', () => {
    const productWithoutReviews = {
      ...mockProduct,
      averageRating: 0,
      reviewCount: 0
    };
    
    render(<ProductSchema product={productWithoutReviews} />);
    
    const scriptTag = document.querySelector('script[type="application/ld+json"]');
    const schemaData = JSON.parse(scriptTag.textContent);
    
    expect(schemaData.aggregateRating).toBeUndefined();
  });

  test('includes multiple images', () => {
    render(<ProductSchema product={mockProduct} />);
    
    const scriptTag = document.querySelector('script[type="application/ld+json"]');
    const schemaData = JSON.parse(scriptTag.textContent);
    
    expect(schemaData.image).toEqual(mockProduct.images);
  });
});
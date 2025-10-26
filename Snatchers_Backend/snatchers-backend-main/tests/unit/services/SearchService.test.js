import SearchService from '../../../services/SearchService.js';
import { createTestProduct } from '../../setup.js';

describe('SearchService', () => {
  let searchService;

  beforeEach(() => {
    searchService = new SearchService();
  });

  describe('indexProduct', () => {
    test('should index a product successfully', async () => {
      const product = await createTestProduct({
        title: 'Test Laptop',
        description: 'High performance laptop',
        brand: 'TestBrand',
        category: 'Electronics'
      });

      const result = await searchService.indexProduct(product);
      expect(result).toBeDefined();
    });

    test('should handle indexing errors gracefully', async () => {
      const invalidProduct = null;

      await expect(searchService.indexProduct(invalidProduct))
        .rejects.toThrow();
    });
  });

  describe('searchProducts', () => {
    test('should return search results for valid query', async () => {
      const query = 'laptop';
      const filters = { category: 'Electronics' };
      const pagination = { page: 1, limit: 10 };

      const results = await searchService.searchProducts(query, filters, pagination);

      expect(results).toHaveProperty('products');
      expect(results).toHaveProperty('total');
      expect(results).toHaveProperty('page');
      expect(Array.isArray(results.products)).toBe(true);
    });

    test('should handle empty search results', async () => {
      const query = 'nonexistentproduct123';
      const results = await searchService.searchProducts(query);

      expect(results.products).toHaveLength(0);
      expect(results.total).toBe(0);
    });

    test('should apply filters correctly', async () => {
      const query = 'laptop';
      const filters = {
        category: 'Electronics',
        minPrice: 500,
        maxPrice: 2000,
        brand: 'TestBrand'
      };

      const results = await searchService.searchProducts(query, filters);
      expect(results).toHaveProperty('products');
    });
  });

  describe('getAutocompleteSuggestions', () => {
    test('should return suggestions for partial query', async () => {
      const partialQuery = 'lap';
      const suggestions = await searchService.getAutocompleteSuggestions(partialQuery);

      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeLessThanOrEqual(10);
    });

    test('should return empty array for very short queries', async () => {
      const shortQuery = 'a';
      const suggestions = await searchService.getAutocompleteSuggestions(shortQuery);

      expect(Array.isArray(suggestions)).toBe(true);
    });
  });

  describe('trackSearchAnalytics', () => {
    test('should track search analytics', async () => {
      const query = 'laptop';
      const results = { total: 5, products: [] };

      await expect(searchService.trackSearchAnalytics(query, results))
        .resolves.not.toThrow();
    });
  });
});
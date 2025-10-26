import { client } from '../config/elasticsearch.js';
import Product from '../models/Product.js';
import Fuse from 'fuse.js';

class SearchService {
  constructor() {
    this.indexName = 'products';
    this.isElasticsearchAvailable = false;
    this.initializeElasticsearch();
  }

  async initializeElasticsearch() {
    try {
      // Test Elasticsearch connection
      await client.ping();
      this.isElasticsearchAvailable = true;
      
      // Create index if it doesn't exist
      await this.createIndexIfNotExists();
      console.log('Elasticsearch initialized successfully');
    } catch (error) {
      console.warn('Elasticsearch not available, using fallback search:', error.message);
      this.isElasticsearchAvailable = false;
    }
  }

  async createIndexIfNotExists() {
    try {
      const exists = await client.indices.exists({ index: this.indexName });
      
      if (!exists) {
        await client.indices.create({
          index: this.indexName,
          body: {
            settings: {
              analysis: {
                analyzer: {
                  product_analyzer: {
                    type: 'custom',
                    tokenizer: 'standard',
                    filter: ['lowercase', 'stop', 'snowball']
                  }
                }
              }
            },
            mappings: {
              properties: {
                title: {
                  type: 'text',
                  analyzer: 'product_analyzer',
                  fields: {
                    keyword: { type: 'keyword' },
                    suggest: {
                      type: 'completion',
                      analyzer: 'simple'
                    }
                  }
                },
                description: {
                  type: 'text',
                  analyzer: 'product_analyzer'
                },
                brand: {
                  type: 'keyword',
                  fields: {
                    text: { type: 'text', analyzer: 'product_analyzer' }
                  }
                },
                category: {
                  type: 'keyword',
                  fields: {
                    text: { type: 'text', analyzer: 'product_analyzer' }
                  }
                },
                price: { type: 'float' },
                offerPrice: { type: 'float' },
                averageRating: { type: 'float' },
                reviewCount: { type: 'integer' },
                salesCount: { type: 'integer' },
                viewCount: { type: 'integer' },
                tags: { type: 'keyword' },
                status: { type: 'keyword' },
                inStock: { type: 'boolean' },
                createdAt: { type: 'date' },
                updatedAt: { type: 'date' },
                specifications: {
                  type: 'nested',
                  properties: {
                    name: { type: 'keyword' },
                    value: { type: 'keyword' }
                  }
                }
              }
            }
          }
        });
        console.log(`Index ${this.indexName} created successfully`);
      }
    } catch (error) {
      console.error('Error creating Elasticsearch index:', error);
      throw error;
    }
  }

  async indexProduct(product) {
    if (!this.isElasticsearchAvailable) return;

    try {
      const productData = {
        title: product.title,
        description: product.description,
        brand: product.brand,
        category: product.category,
        price: product.price,
        offerPrice: product.offerPrice,
        averageRating: product.averageRating,
        reviewCount: product.reviewCount,
        salesCount: product.salesCount,
        viewCount: product.viewCount,
        tags: product.tags,
        status: product.status,
        inStock: product.inventory?.trackInventory ? product.inventory.quantity > 0 : true,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
        specifications: product.specifications || []
      };

      await client.index({
        index: this.indexName,
        id: product._id.toString(),
        body: productData
      });
    } catch (error) {
      console.error('Error indexing product:', error);
    }
  }

  async removeFromIndex(productId) {
    if (!this.isElasticsearchAvailable) return;

    try {
      await client.delete({
        index: this.indexName,
        id: productId.toString()
      });
    } catch (error) {
      console.error('Error removing product from index:', error);
    }
  }

  async searchWithFilters(query, filters = {}, options = {}) {
    if (this.isElasticsearchAvailable) {
      return await this.elasticsearchSearch(query, filters, options);
    } else {
      return await this.fallbackSearch(query, filters, options);
    }
  }

  async elasticsearchSearch(query, filters, options) {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'relevance',
        sortOrder = 'desc'
      } = options;

      const from = (page - 1) * limit;

      // Build Elasticsearch query
      const searchBody = {
        from,
        size: limit,
        query: {
          bool: {
            must: [],
            filter: []
          }
        },
        aggs: {
          brands: {
            terms: { field: 'brand', size: 50 }
          },
          categories: {
            terms: { field: 'category', size: 50 }
          },
          price_ranges: {
            range: {
              field: 'offerPrice',
              ranges: [
                { key: 'under_500', to: 500 },
                { key: '500_1000', from: 500, to: 1000 },
                { key: '1000_2500', from: 1000, to: 2500 },
                { key: '2500_5000', from: 2500, to: 5000 },
                { key: 'above_5000', from: 5000 }
              ]
            }
          },
          avg_rating: {
            range: {
              field: 'averageRating',
              ranges: [
                { key: '4_and_above', from: 4 },
                { key: '3_and_above', from: 3 },
                { key: '2_and_above', from: 2 },
                { key: '1_and_above', from: 1 }
              ]
            }
          }
        }
      };

      // Add text search query
      if (query && query.trim()) {
        searchBody.query.bool.must.push({
          multi_match: {
            query: query.trim(),
            fields: ['title^3', 'description^2', 'brand^2', 'category', 'tags'],
            type: 'best_fields',
            fuzziness: 'AUTO'
          }
        });
      } else {
        searchBody.query.bool.must.push({ match_all: {} });
      }

      // Add filters
      if (filters.brands && filters.brands.length > 0) {
        searchBody.query.bool.filter.push({
          terms: { brand: filters.brands }
        });
      }

      if (filters.categories && filters.categories.length > 0) {
        searchBody.query.bool.filter.push({
          terms: { category: filters.categories }
        });
      }

      if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
        const priceFilter = { range: { offerPrice: {} } };
        if (filters.priceMin !== undefined) priceFilter.range.offerPrice.gte = filters.priceMin;
        if (filters.priceMax !== undefined) priceFilter.range.offerPrice.lte = filters.priceMax;
        searchBody.query.bool.filter.push(priceFilter);
      }

      if (filters.rating !== undefined) {
        searchBody.query.bool.filter.push({
          range: { averageRating: { gte: filters.rating } }
        });
      }

      if (filters.inStock === true) {
        searchBody.query.bool.filter.push({
          term: { inStock: true }
        });
      }

      // Add status filter (only active products)
      searchBody.query.bool.filter.push({
        term: { status: 'active' }
      });

      // Add sorting
      if (sortBy !== 'relevance') {
        searchBody.sort = [];
        switch (sortBy) {
          case 'price_low_to_high':
            searchBody.sort.push({ offerPrice: { order: 'asc' } });
            break;
          case 'price_high_to_low':
            searchBody.sort.push({ offerPrice: { order: 'desc' } });
            break;
          case 'rating':
            searchBody.sort.push({ averageRating: { order: 'desc' } });
            break;
          case 'popularity':
            searchBody.sort.push({ salesCount: { order: 'desc' } });
            break;
          case 'newest':
            searchBody.sort.push({ createdAt: { order: 'desc' } });
            break;
          default:
            searchBody.sort.push({ _score: { order: 'desc' } });
        }
      }

      const response = await client.search({
        index: this.indexName,
        body: searchBody
      });

      // Get product IDs from search results
      const productIds = response.body.hits.hits.map(hit => hit._id);
      
      // Fetch full product data from MongoDB
      const products = await Product.find({ _id: { $in: productIds } })
        .populate('vendor', 'name profile.businessName')
        .lean();

      // Maintain search result order
      const orderedProducts = productIds.map(id => 
        products.find(product => product._id.toString() === id)
      ).filter(Boolean);

      return {
        products: orderedProducts,
        total: response.body.hits.total.value,
        page,
        limit,
        totalPages: Math.ceil(response.body.hits.total.value / limit),
        aggregations: {
          brands: response.body.aggregations.brands.buckets,
          categories: response.body.aggregations.categories.buckets,
          priceRanges: response.body.aggregations.price_ranges.buckets,
          ratings: response.body.aggregations.avg_rating.buckets
        }
      };
    } catch (error) {
      console.error('Elasticsearch search error:', error);
      // Fallback to MongoDB search
      return await this.fallbackSearch(query, filters, options);
    }
  }

  async fallbackSearch(query, filters, options) {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'relevance'
      } = options;

      // Build MongoDB query
      let mongoQuery = { status: 'active' };

      // Add filters
      if (filters.brands && filters.brands.length > 0) {
        mongoQuery.brand = { $in: filters.brands };
      }

      if (filters.categories && filters.categories.length > 0) {
        mongoQuery.category = { $in: filters.categories };
      }

      if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
        mongoQuery.offerPrice = {};
        if (filters.priceMin !== undefined) mongoQuery.offerPrice.$gte = filters.priceMin;
        if (filters.priceMax !== undefined) mongoQuery.offerPrice.$lte = filters.priceMax;
      }

      if (filters.rating !== undefined) {
        mongoQuery.averageRating = { $gte: filters.rating };
      }

      if (filters.inStock === true) {
        mongoQuery['inventory.quantity'] = { $gt: 0 };
      }

      // Get products from MongoDB
      let products = await Product.find(mongoQuery)
        .populate('vendor', 'name profile.businessName')
        .lean();

      // Apply text search using Fuse.js if query provided
      if (query && query.trim()) {
        const fuseOptions = {
          keys: [
            { name: 'title', weight: 0.4 },
            { name: 'description', weight: 0.3 },
            { name: 'brand', weight: 0.2 },
            { name: 'category', weight: 0.1 }
          ],
          threshold: 0.3,
          includeScore: true
        };
        
        const fuse = new Fuse(products, fuseOptions);
        const searchResults = fuse.search(query.trim());
        products = searchResults.map(result => result.item);
      }

      // Apply sorting
      switch (sortBy) {
        case 'price_low_to_high':
          products.sort((a, b) => (a.offerPrice || a.price) - (b.offerPrice || b.price));
          break;
        case 'price_high_to_low':
          products.sort((a, b) => (b.offerPrice || b.price) - (a.offerPrice || a.price));
          break;
        case 'rating':
          products.sort((a, b) => b.averageRating - a.averageRating);
          break;
        case 'popularity':
          products.sort((a, b) => b.salesCount - a.salesCount);
          break;
        case 'newest':
          products.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          break;
      }

      // Apply pagination
      const total = products.length;
      const startIndex = (page - 1) * limit;
      const paginatedProducts = products.slice(startIndex, startIndex + limit);

      // Generate aggregations for filters
      const aggregations = await this.generateAggregations(mongoQuery);

      return {
        products: paginatedProducts,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        aggregations
      };
    } catch (error) {
      console.error('Fallback search error:', error);
      throw error;
    }
  }

  async generateAggregations(baseQuery) {
    try {
      const [brands, categories, priceStats] = await Promise.all([
        Product.distinct('brand', baseQuery),
        Product.distinct('category', baseQuery),
        Product.aggregate([
          { $match: baseQuery },
          {
            $group: {
              _id: null,
              minPrice: { $min: '$offerPrice' },
              maxPrice: { $max: '$offerPrice' }
            }
          }
        ])
      ]);

      return {
        brands: brands.map(brand => ({ key: brand, doc_count: 0 })),
        categories: categories.map(category => ({ key: category, doc_count: 0 })),
        priceRanges: [
          { key: 'under_500', doc_count: 0 },
          { key: '500_1000', doc_count: 0 },
          { key: '1000_2500', doc_count: 0 },
          { key: '2500_5000', doc_count: 0 },
          { key: 'above_5000', doc_count: 0 }
        ],
        ratings: [
          { key: '4_and_above', doc_count: 0 },
          { key: '3_and_above', doc_count: 0 },
          { key: '2_and_above', doc_count: 0 },
          { key: '1_and_above', doc_count: 0 }
        ],
        priceStats: priceStats[0] || { minPrice: 0, maxPrice: 0 }
      };
    } catch (error) {
      console.error('Error generating aggregations:', error);
      return {
        brands: [],
        categories: [],
        priceRanges: [],
        ratings: [],
        priceStats: { minPrice: 0, maxPrice: 0 }
      };
    }
  }

  async getAutocompleteSuggestions(query, limit = 10) {
    if (!query || query.trim().length < 2) return [];

    if (this.isElasticsearchAvailable) {
      try {
        const response = await client.search({
          index: this.indexName,
          body: {
            suggest: {
              product_suggest: {
                prefix: query.trim(),
                completion: {
                  field: 'title.suggest',
                  size: limit
                }
              }
            }
          }
        });

        return response.body.suggest.product_suggest[0].options.map(option => ({
          text: option.text,
          score: option._score
        }));
      } catch (error) {
        console.error('Elasticsearch autocomplete error:', error);
      }
    }

    // Fallback autocomplete using MongoDB
    try {
      const products = await Product.find({
        $or: [
          { title: { $regex: query.trim(), $options: 'i' } },
          { brand: { $regex: query.trim(), $options: 'i' } },
          { category: { $regex: query.trim(), $options: 'i' } }
        ],
        status: 'active'
      })
      .select('title brand category')
      .limit(limit * 2)
      .lean();

      const suggestions = new Set();
      
      products.forEach(product => {
        if (product.title.toLowerCase().includes(query.toLowerCase())) {
          suggestions.add(product.title);
        }
        if (product.brand.toLowerCase().includes(query.toLowerCase())) {
          suggestions.add(product.brand);
        }
        if (product.category.toLowerCase().includes(query.toLowerCase())) {
          suggestions.add(product.category);
        }
      });

      return Array.from(suggestions).slice(0, limit).map(text => ({ text, score: 1 }));
    } catch (error) {
      console.error('Fallback autocomplete error:', error);
      return [];
    }
  }

  async reindexAllProducts() {
    if (!this.isElasticsearchAvailable) {
      console.log('Elasticsearch not available, skipping reindex');
      return;
    }

    try {
      console.log('Starting product reindexing...');
      
      // Delete existing index
      try {
        await client.indices.delete({ index: this.indexName });
      } catch (error) {
        // Index might not exist, continue
      }

      // Recreate index
      await this.createIndexIfNotExists();

      // Get all active products
      const products = await Product.find({ status: 'active' }).lean();
      
      console.log(`Indexing ${products.length} products...`);

      // Bulk index products
      const bulkBody = [];
      for (const product of products) {
        bulkBody.push({ index: { _index: this.indexName, _id: product._id.toString() } });
        bulkBody.push({
          title: product.title,
          description: product.description,
          brand: product.brand,
          category: product.category,
          price: product.price,
          offerPrice: product.offerPrice,
          averageRating: product.averageRating,
          reviewCount: product.reviewCount,
          salesCount: product.salesCount,
          viewCount: product.viewCount,
          tags: product.tags,
          status: product.status,
          inStock: product.inventory?.trackInventory ? product.inventory.quantity > 0 : true,
          createdAt: product.createdAt,
          updatedAt: product.updatedAt,
          specifications: product.specifications || []
        });
      }

      if (bulkBody.length > 0) {
        const response = await client.bulk({ body: bulkBody });
        
        if (response.body.errors) {
          console.error('Some products failed to index:', response.body.items.filter(item => item.index.error));
        } else {
          console.log(`Successfully indexed ${products.length} products`);
        }
      }
    } catch (error) {
      console.error('Error during reindexing:', error);
      throw error;
    }
  }
}

export default new SearchService();
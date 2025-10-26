import mongoose from 'mongoose';

// Database configuration and index setup
export const setupDatabaseIndexes = async () => {
  try {
    console.log('Setting up database indexes...');
    
    // Get all collections
    const db = mongoose.connection.db;
    
    // Product indexes
    const productCollection = db.collection('products');
    await productCollection.createIndexes([
      // Text search index
      { 
        key: { title: 'text', description: 'text', brand: 'text' },
        name: 'product_text_search'
      },
      // Category and brand filtering
      { 
        key: { category: 1, brand: 1 },
        name: 'category_brand_index'
      },
      // Price range filtering
      { 
        key: { price: 1 },
        name: 'price_index'
      },
      // Rating sorting
      { 
        key: { averageRating: -1 },
        name: 'rating_index'
      },
      // Popularity sorting
      { 
        key: { salesCount: -1 },
        name: 'sales_count_index'
      },
      // View count sorting
      { 
        key: { viewCount: -1 },
        name: 'view_count_index'
      },
      // SEO slug lookup
      { 
        key: { 'seo.slug': 1 },
        name: 'seo_slug_index',
        unique: true,
        sparse: true
      },
      // Vendor products
      { 
        key: { vendor: 1 },
        name: 'vendor_index'
      },
      // Product status
      { 
        key: { status: 1 },
        name: 'status_index'
      },
      // Tags filtering
      { 
        key: { tags: 1 },
        name: 'tags_index'
      },
      // SKU lookup
      { 
        key: { sku: 1 },
        name: 'sku_index',
        unique: true
      },
      // Compound indexes for complex queries
      { 
        key: { category: 1, status: 1, averageRating: -1 },
        name: 'category_status_rating_index'
      },
      { 
        key: { brand: 1, status: 1, price: 1 },
        name: 'brand_status_price_index'
      },
      { 
        key: { vendor: 1, status: 1, createdAt: -1 },
        name: 'vendor_status_created_index'
      }
    ]);
    
    // User indexes
    const userCollection = db.collection('users');
    await userCollection.createIndexes([
      // Email lookup
      { 
        key: { email: 1 },
        name: 'email_index',
        unique: true
      },
      // Firebase UID lookup
      { 
        key: { uid: 1 },
        name: 'uid_index',
        unique: true
      },
      // Role filtering
      { 
        key: { role: 1 },
        name: 'role_index'
      },
      // Vendor verification
      { 
        key: { 'vendorProfile.isVerified': 1 },
        name: 'vendor_verified_index'
      },
      // Active users
      { 
        key: { isActive: 1 },
        name: 'active_index'
      },
      // Last login tracking
      { 
        key: { lastLogin: -1 },
        name: 'last_login_index'
      }
    ]);
    
    // Review indexes
    const reviewCollection = db.collection('reviews');
    await reviewCollection.createIndexes([
      // Product reviews
      { 
        key: { product: 1, status: 1 },
        name: 'product_status_index'
      },
      // User reviews
      { 
        key: { user: 1 },
        name: 'user_reviews_index'
      },
      // Rating filtering
      { 
        key: { rating: 1 },
        name: 'rating_filter_index'
      },
      // Verified purchase filtering
      { 
        key: { isVerifiedPurchase: 1 },
        name: 'verified_purchase_index'
      },
      // Helpful votes sorting
      { 
        key: { helpfulVotes: -1 },
        name: 'helpful_votes_index'
      },
      // Recent reviews
      { 
        key: { createdAt: -1 },
        name: 'recent_reviews_index'
      },
      // Compound indexes
      { 
        key: { product: 1, rating: 1, status: 1 },
        name: 'product_rating_status_index'
      },
      // Unique constraint: one review per user per product
      { 
        key: { product: 1, user: 1 },
        name: 'unique_user_product_review',
        unique: true
      }
    ]);
    
    // Order indexes
    const orderCollection = db.collection('orders');
    await orderCollection.createIndexes([
      // Order ID lookup
      { 
        key: { orderId: 1 },
        name: 'order_id_index',
        unique: true
      },
      // User orders
      { 
        key: { user: 1, createdAt: -1 },
        name: 'user_orders_index'
      },
      // Legacy user ID support
      { 
        key: { userId: 1, createdAt: -1 },
        name: 'legacy_user_orders_index'
      },
      // Order status
      { 
        key: { status: 1 },
        name: 'order_status_index'
      },
      // Payment status
      { 
        key: { 'payment.status': 1 },
        name: 'payment_status_index'
      },
      // Tracking number lookup
      { 
        key: { 'shipping.trackingNumber': 1 },
        name: 'tracking_number_index'
      },
      // Recent orders
      { 
        key: { createdAt: -1 },
        name: 'recent_orders_index'
      },
      // Compound indexes
      { 
        key: { user: 1, status: 1 },
        name: 'user_status_index'
      },
      { 
        key: { 'vendors.vendor': 1, status: 1 },
        name: 'vendor_orders_index'
      }
    ]);
    
    // Analytics indexes
    const analyticsCollection = db.collection('analytics');
    await analyticsCollection.createIndexes([
      // Event type and time
      { 
        key: { type: 1, timestamp: -1 },
        name: 'type_timestamp_index'
      },
      // User analytics
      { 
        key: { userId: 1, timestamp: -1 },
        name: 'user_analytics_index'
      },
      // Session tracking
      { 
        key: { sessionId: 1 },
        name: 'session_index'
      },
      // Product analytics
      { 
        key: { 'data.productId': 1, type: 1 },
        name: 'product_analytics_index'
      },
      // Category analytics
      { 
        key: { 'data.categoryId': 1, type: 1 },
        name: 'category_analytics_index'
      },
      // Time-based queries
      { 
        key: { timestamp: -1 },
        name: 'timestamp_index'
      },
      // Compound indexes for complex analytics
      { 
        key: { type: 1, userId: 1, timestamp: -1 },
        name: 'type_user_timestamp_index'
      },
      { 
        key: { type: 1, 'data.productId': 1, timestamp: -1 },
        name: 'type_product_timestamp_index'
      },
      // TTL index for data retention (2 years)
      { 
        key: { timestamp: 1 },
        name: 'analytics_ttl_index',
        expireAfterSeconds: 63072000 // 2 years
      }
    ]);
    
    // Cart indexes (if needed)
    const cartCollection = db.collection('carts');
    await cartCollection.createIndexes([
      // User cart lookup
      { 
        key: { userId: 1 },
        name: 'user_cart_index'
      },
      // Session cart lookup
      { 
        key: { sessionId: 1 },
        name: 'session_cart_index'
      }
    ]);
    
    // Wishlist indexes (if needed)
    const wishlistCollection = db.collection('wishlists');
    await wishlistCollection.createIndexes([
      // User wishlist
      { 
        key: { userId: 1 },
        name: 'user_wishlist_index'
      },
      // Product in wishlists
      { 
        key: { productId: 1 },
        name: 'product_wishlist_index'
      }
    ]);
    
    console.log('Database indexes created successfully!');
    
  } catch (error) {
    console.error('Error setting up database indexes:', error);
    throw error;
  }
};

// Function to drop all custom indexes (for development/testing)
export const dropCustomIndexes = async () => {
  try {
    console.log('Dropping custom indexes...');
    
    const db = mongoose.connection.db;
    const collections = ['products', 'users', 'reviews', 'orders', 'analytics', 'carts', 'wishlists'];
    
    for (const collectionName of collections) {
      try {
        const collection = db.collection(collectionName);
        const indexes = await collection.indexes();
        
        for (const index of indexes) {
          // Don't drop the default _id index
          if (index.name !== '_id_') {
            await collection.dropIndex(index.name);
            console.log(`Dropped index ${index.name} from ${collectionName}`);
          }
        }
      } catch (error) {
        console.log(`Collection ${collectionName} might not exist or error dropping indexes:`, error.message);
      }
    }
    
    console.log('Custom indexes dropped successfully!');
    
  } catch (error) {
    console.error('Error dropping custom indexes:', error);
    throw error;
  }
};

// Function to get index information
export const getIndexInfo = async () => {
  try {
    const db = mongoose.connection.db;
    const collections = ['products', 'users', 'reviews', 'orders', 'analytics'];
    const indexInfo = {};
    
    for (const collectionName of collections) {
      try {
        const collection = db.collection(collectionName);
        const indexes = await collection.indexes();
        indexInfo[collectionName] = indexes;
      } catch (error) {
        indexInfo[collectionName] = `Error: ${error.message}`;
      }
    }
    
    return indexInfo;
  } catch (error) {
    console.error('Error getting index information:', error);
    throw error;
  }
};
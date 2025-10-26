// Offline storage utilities for PWA functionality

/**
 * IndexedDB wrapper for offline data storage
 */
class OfflineStorage {
  constructor(dbName = 'SnatchersDB', version = 1) {
    this.dbName = dbName;
    this.version = version;
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        console.error('[OfflineStorage] Failed to open database:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[OfflineStorage] Database opened successfully');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        console.log('[OfflineStorage] Database upgrade needed');

        // Create object stores
        if (!db.objectStoreNames.contains('cart')) {
          const cartStore = db.createObjectStore('cart', { keyPath: 'id', autoIncrement: true });
          cartStore.createIndex('userId', 'userId', { unique: false });
          cartStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains('wishlist')) {
          const wishlistStore = db.createObjectStore('wishlist', { keyPath: 'id', autoIncrement: true });
          wishlistStore.createIndex('userId', 'userId', { unique: false });
          wishlistStore.createIndex('productId', 'productId', { unique: false });
        }

        if (!db.objectStoreNames.contains('products')) {
          const productsStore = db.createObjectStore('products', { keyPath: 'id' });
          productsStore.createIndex('category', 'category', { unique: false });
          productsStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains('user_data')) {
          const userStore = db.createObjectStore('user_data', { keyPath: 'key' });
        }

        if (!db.objectStoreNames.contains('pending_actions')) {
          const actionsStore = db.createObjectStore('pending_actions', { keyPath: 'id', autoIncrement: true });
          actionsStore.createIndex('type', 'type', { unique: false });
          actionsStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  async ensureDB() {
    if (!this.db) {
      await this.init();
    }
    return this.db;
  }

  // Cart operations
  async saveCart(cartData, userId = 'guest') {
    const db = await this.ensureDB();
    const transaction = db.transaction(['cart'], 'readwrite');
    const store = transaction.objectStore('cart');

    const cartItem = {
      userId,
      items: cartData,
      timestamp: Date.now()
    };

    return new Promise((resolve, reject) => {
      const request = store.put(cartItem);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getCart(userId = 'guest') {
    const db = await this.ensureDB();
    const transaction = db.transaction(['cart'], 'readonly');
    const store = transaction.objectStore('cart');
    const index = store.index('userId');

    return new Promise((resolve, reject) => {
      const request = index.get(userId);
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.items : []);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Wishlist operations
  async saveWishlistItem(productId, productData, userId = 'guest') {
    const db = await this.ensureDB();
    const transaction = db.transaction(['wishlist'], 'readwrite');
    const store = transaction.objectStore('wishlist');

    const wishlistItem = {
      userId,
      productId,
      productData,
      timestamp: Date.now()
    };

    return new Promise((resolve, reject) => {
      const request = store.put(wishlistItem);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getWishlist(userId = 'guest') {
    const db = await this.ensureDB();
    const transaction = db.transaction(['wishlist'], 'readonly');
    const store = transaction.objectStore('wishlist');
    const index = store.index('userId');

    return new Promise((resolve, reject) => {
      const request = index.getAll(userId);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async removeWishlistItem(productId, userId = 'guest') {
    const db = await this.ensureDB();
    const transaction = db.transaction(['wishlist'], 'readwrite');
    const store = transaction.objectStore('wishlist');
    const index = store.index('productId');

    return new Promise((resolve, reject) => {
      const request = index.getAll(productId);
      request.onsuccess = () => {
        const items = request.result.filter(item => item.userId === userId);
        if (items.length > 0) {
          const deleteRequest = store.delete(items[0].id);
          deleteRequest.onsuccess = () => resolve(true);
          deleteRequest.onerror = () => reject(deleteRequest.error);
        } else {
          resolve(false);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Product caching
  async cacheProducts(products) {
    const db = await this.ensureDB();
    const transaction = db.transaction(['products'], 'readwrite');
    const store = transaction.objectStore('products');

    const promises = products.map(product => {
      const productWithTimestamp = {
        ...product,
        timestamp: Date.now()
      };

      return new Promise((resolve, reject) => {
        const request = store.put(productWithTimestamp);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    });

    return Promise.all(promises);
  }

  async getCachedProducts(limit = 50) {
    const db = await this.ensureDB();
    const transaction = db.transaction(['products'], 'readonly');
    const store = transaction.objectStore('products');

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const products = request.result || [];
        // Sort by timestamp and limit results
        const sortedProducts = products
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, limit);
        resolve(sortedProducts);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // User data storage
  async saveUserData(key, data) {
    const db = await this.ensureDB();
    const transaction = db.transaction(['user_data'], 'readwrite');
    const store = transaction.objectStore('user_data');

    const userData = {
      key,
      data,
      timestamp: Date.now()
    };

    return new Promise((resolve, reject) => {
      const request = store.put(userData);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getUserData(key) {
    const db = await this.ensureDB();
    const transaction = db.transaction(['user_data'], 'readonly');
    const store = transaction.objectStore('user_data');

    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.data : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Pending actions for background sync
  async addPendingAction(type, data) {
    const db = await this.ensureDB();
    const transaction = db.transaction(['pending_actions'], 'readwrite');
    const store = transaction.objectStore('pending_actions');

    const action = {
      type,
      data,
      timestamp: Date.now(),
      retries: 0
    };

    return new Promise((resolve, reject) => {
      const request = store.add(action);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getPendingActions(type = null) {
    const db = await this.ensureDB();
    const transaction = db.transaction(['pending_actions'], 'readonly');
    const store = transaction.objectStore('pending_actions');

    return new Promise((resolve, reject) => {
      let request;
      if (type) {
        const index = store.index('type');
        request = index.getAll(type);
      } else {
        request = store.getAll();
      }

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async removePendingAction(id) {
    const db = await this.ensureDB();
    const transaction = db.transaction(['pending_actions'], 'readwrite');
    const store = transaction.objectStore('pending_actions');

    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  // Cleanup old data
  async cleanup(maxAge = 7 * 24 * 60 * 60 * 1000) { // 7 days
    const db = await this.ensureDB();
    const cutoffTime = Date.now() - maxAge;
    
    const stores = ['products', 'pending_actions'];
    
    for (const storeName of stores) {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore('pending_actions');
      const index = store.index('timestamp');
      
      const request = index.openCursor(IDBKeyRange.upperBound(cutoffTime));
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
    }
  }
}

// Create singleton instance
const offlineStorage = new OfflineStorage();

export default offlineStorage;

// Utility functions
export const initOfflineStorage = async () => {
  try {
    await offlineStorage.init();
    console.log('[OfflineStorage] Initialized successfully');
    return true;
  } catch (error) {
    console.error('[OfflineStorage] Initialization failed:', error);
    return false;
  }
};

export const isOfflineStorageSupported = () => {
  return 'indexedDB' in window;
};
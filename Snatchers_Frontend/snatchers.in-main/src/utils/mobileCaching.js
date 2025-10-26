// Mobile-specific caching strategies

class MobileCacheManager {
  constructor() {
    this.memoryCache = new Map();
    this.maxMemoryItems = 50; // Limit memory cache for mobile devices
    this.maxAge = 5 * 60 * 1000; // 5 minutes default
    this.compressionEnabled = this.supportsCompression();
  }

  // Check if compression is supported
  supportsCompression() {
    return 'CompressionStream' in window;
  }

  // Get network information for adaptive caching
  getNetworkInfo() {
    if ('connection' in navigator) {
      const connection = navigator.connection;
      return {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData
      };
    }
    return null;
  }

  // Determine cache strategy based on network conditions
  getCacheStrategy() {
    const networkInfo = this.getNetworkInfo();
    
    if (!networkInfo) {
      return { maxAge: this.maxAge, compress: false };
    }

    // Aggressive caching for slow networks
    if (networkInfo.effectiveType === 'slow-2g' || networkInfo.effectiveType === '2g') {
      return { 
        maxAge: 30 * 60 * 1000, // 30 minutes
        compress: true,
        priority: 'cache-first'
      };
    }

    // Moderate caching for 3G
    if (networkInfo.effectiveType === '3g') {
      return { 
        maxAge: 15 * 60 * 1000, // 15 minutes
        compress: true,
        priority: 'network-first'
      };
    }

    // Light caching for 4G+
    return { 
      maxAge: 5 * 60 * 1000, // 5 minutes
      compress: false,
      priority: 'network-first'
    };
  }

  // Compress data for storage
  async compressData(data) {
    if (!this.compressionEnabled) return data;

    try {
      const stream = new CompressionStream('gzip');
      const writer = stream.writable.getWriter();
      const reader = stream.readable.getReader();

      writer.write(new TextEncoder().encode(JSON.stringify(data)));
      writer.close();

      const chunks = [];
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) chunks.push(value);
      }

      return new Uint8Array(chunks.reduce((acc, chunk) => [...acc, ...chunk], []));
    } catch (error) {
      console.warn('Compression failed, storing uncompressed:', error);
      return data;
    }
  }

  // Decompress data from storage
  async decompressData(compressedData) {
    if (!this.compressionEnabled || typeof compressedData !== 'object') {
      return compressedData;
    }

    try {
      const stream = new DecompressionStream('gzip');
      const writer = stream.writable.getWriter();
      const reader = stream.readable.getReader();

      writer.write(compressedData);
      writer.close();

      const chunks = [];
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) chunks.push(value);
      }

      const decompressed = new TextDecoder().decode(
        new Uint8Array(chunks.reduce((acc, chunk) => [...acc, ...chunk], []))
      );

      return JSON.parse(decompressed);
    } catch (error) {
      console.warn('Decompression failed:', error);
      return compressedData;
    }
  }

  // Set item in cache with mobile-optimized strategy
  async set(key, data, options = {}) {
    const strategy = this.getCacheStrategy();
    const maxAge = options.maxAge || strategy.maxAge;
    const shouldCompress = options.compress !== false && strategy.compress;

    const cacheItem = {
      data: shouldCompress ? await this.compressData(data) : data,
      timestamp: Date.now(),
      maxAge,
      compressed: shouldCompress,
      size: JSON.stringify(data).length
    };

    // Memory cache with size limits
    if (this.memoryCache.size >= this.maxMemoryItems) {
      const oldestKey = this.memoryCache.keys().next().value;
      this.memoryCache.delete(oldestKey);
    }

    this.memoryCache.set(key, cacheItem);

    // IndexedDB for persistent storage on mobile
    if ('indexedDB' in window) {
      try {
        await this.setIndexedDB(key, cacheItem);
      } catch (error) {
        console.warn('IndexedDB storage failed:', error);
      }
    }

    // Fallback to localStorage with size management
    try {
      this.setLocalStorage(key, cacheItem);
    } catch (error) {
      console.warn('localStorage full, clearing old items:', error);
      this.clearOldItems();
      try {
        this.setLocalStorage(key, cacheItem);
      } catch (retryError) {
        console.warn('localStorage still full after cleanup:', retryError);
      }
    }
  }

  // Get item from cache with mobile-optimized retrieval
  async get(key) {
    // Check memory cache first (fastest)
    if (this.memoryCache.has(key)) {
      const item = this.memoryCache.get(key);
      if (this.isValid(item)) {
        return item.compressed ? await this.decompressData(item.data) : item.data;
      } else {
        this.memoryCache.delete(key);
      }
    }

    // Check IndexedDB (persistent, larger capacity)
    if ('indexedDB' in window) {
      try {
        const item = await this.getIndexedDB(key);
        if (item && this.isValid(item)) {
          // Restore to memory cache
          this.memoryCache.set(key, item);
          return item.compressed ? await this.decompressData(item.data) : item.data;
        }
      } catch (error) {
        console.warn('IndexedDB retrieval failed:', error);
      }
    }

    // Fallback to localStorage
    try {
      const item = this.getLocalStorage(key);
      if (item && this.isValid(item)) {
        // Restore to memory cache
        this.memoryCache.set(key, item);
        return item.compressed ? await this.decompressData(item.data) : item.data;
      }
    } catch (error) {
      console.warn('localStorage retrieval failed:', error);
    }

    return null;
  }

  // Check if cache item is still valid
  isValid(item) {
    if (!item || !item.timestamp) return false;
    return Date.now() - item.timestamp < item.maxAge;
  }

  // IndexedDB operations
  async setIndexedDB(key, data) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('MobileCache', 1);
      
      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['cache'], 'readwrite');
        const store = transaction.objectStore('cache');
        
        const putRequest = store.put({ key, ...data });
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };
      
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('cache')) {
          const store = db.createObjectStore('cache', { keyPath: 'key' });
          store.createIndex('timestamp', 'timestamp');
        }
      };
    });
  }

  async getIndexedDB(key) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('MobileCache', 1);
      
      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['cache'], 'readonly');
        const store = transaction.objectStore('cache');
        
        const getRequest = store.get(key);
        getRequest.onsuccess = () => resolve(getRequest.result);
        getRequest.onerror = () => reject(getRequest.error);
      };
    });
  }

  // localStorage operations with size management
  setLocalStorage(key, data) {
    const cacheKey = `mobile_cache_${key}`;
    localStorage.setItem(cacheKey, JSON.stringify(data));
  }

  getLocalStorage(key) {
    const cacheKey = `mobile_cache_${key}`;
    const item = localStorage.getItem(cacheKey);
    return item ? JSON.parse(item) : null;
  }

  // Clear old items from localStorage
  clearOldItems() {
    const keys = Object.keys(localStorage);
    const cacheKeys = keys.filter(key => key.startsWith('mobile_cache_'));
    
    // Sort by timestamp and remove oldest items
    const items = cacheKeys.map(key => ({
      key,
      data: JSON.parse(localStorage.getItem(key))
    })).sort((a, b) => a.data.timestamp - b.data.timestamp);

    // Remove oldest 25% of items
    const itemsToRemove = Math.ceil(items.length * 0.25);
    for (let i = 0; i < itemsToRemove; i++) {
      localStorage.removeItem(items[i].key);
    }
  }

  // Clear all cache
  async clear() {
    this.memoryCache.clear();
    
    // Clear IndexedDB
    if ('indexedDB' in window) {
      try {
        const request = indexedDB.open('MobileCache', 1);
        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction(['cache'], 'readwrite');
          const store = transaction.objectStore('cache');
          store.clear();
        };
      } catch (error) {
        console.warn('IndexedDB clear failed:', error);
      }
    }

    // Clear localStorage cache items
    const keys = Object.keys(localStorage);
    keys.filter(key => key.startsWith('mobile_cache_'))
        .forEach(key => localStorage.removeItem(key));
  }

  // Get cache statistics
  getStats() {
    const memorySize = this.memoryCache.size;
    const memoryBytes = Array.from(this.memoryCache.values())
      .reduce((total, item) => total + (item.size || 0), 0);

    return {
      memoryItems: memorySize,
      memoryBytes,
      networkInfo: this.getNetworkInfo(),
      strategy: this.getCacheStrategy()
    };
  }
}

// Create singleton instance
const mobileCacheManager = new MobileCacheManager();

// Export utility functions
export const mobileCache = {
  set: (key, data, options) => mobileCacheManager.set(key, data, options),
  get: (key) => mobileCacheManager.get(key),
  clear: () => mobileCacheManager.clear(),
  getStats: () => mobileCacheManager.getStats()
};

// Cache-aware fetch wrapper
export const mobileFetch = async (url, options = {}) => {
  const cacheKey = `fetch_${url}_${JSON.stringify(options)}`;
  const strategy = mobileCacheManager.getCacheStrategy();

  // Try cache first for cache-first strategy or slow networks
  if (strategy.priority === 'cache-first') {
    const cached = await mobileCache.get(cacheKey);
    if (cached) {
      return { data: cached, fromCache: true };
    }
  }

  try {
    // Network request
    const response = await fetch(url, options);
    const data = await response.json();

    // Cache the response
    await mobileCache.set(cacheKey, data);

    return { data, fromCache: false };
  } catch (error) {
    // Fallback to cache on network error
    const cached = await mobileCache.get(cacheKey);
    if (cached) {
      console.warn('Network failed, serving from cache:', error);
      return { data: cached, fromCache: true };
    }
    throw error;
  }
};

export default mobileCacheManager;
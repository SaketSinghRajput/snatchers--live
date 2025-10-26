// Mobile-specific performance optimization utilities

import { mobileCache } from './mobileCaching';
import useMobileViewport from '../hooks/useMobileViewport';

// Image optimization utilities
export const imageOptimization = {
  // Get optimal image quality based on device and network
  getOptimalQuality: (networkInfo, isLowEndDevice) => {
    if (networkInfo?.saveData || isLowEndDevice) return 60;
    if (networkInfo?.effectiveType === 'slow-2g' || networkInfo?.effectiveType === '2g') return 65;
    if (networkInfo?.effectiveType === '3g') return 75;
    return 85;
  },

  // Get optimal image format
  getOptimalFormat: () => {
    // Check WebP support
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    
    if (canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0) {
      return 'webp';
    }
    
    // Check AVIF support
    if (canvas.toDataURL('image/avif').indexOf('data:image/avif') === 0) {
      return 'avif';
    }
    
    return 'jpeg';
  },

  // Generate responsive image URLs
  generateResponsiveUrls: (baseUrl, sizes = [320, 640, 768, 1024, 1280]) => {
    const format = imageOptimization.getOptimalFormat();
    const quality = imageOptimization.getOptimalQuality();
    
    return sizes.map(size => ({
      url: `${baseUrl}?w=${size}&q=${quality}&f=${format}`,
      width: size
    }));
  },

  // Create optimized image element
  createOptimizedImage: (src, alt, options = {}) => {
    const img = document.createElement('img');
    img.alt = alt;
    img.loading = options.priority ? 'eager' : 'lazy';
    img.decoding = 'async';
    
    // Set responsive attributes
    if (options.responsive) {
      const responsiveUrls = imageOptimization.generateResponsiveUrls(src);
      img.srcset = responsiveUrls.map(item => `${item.url} ${item.width}w`).join(', ');
      img.sizes = options.sizes || '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw';
    }
    
    img.src = src;
    return img;
  }
};

// Resource loading optimization
export const resourceOptimization = {
  // Preload critical resources
  preloadCriticalResources: (resources) => {
    resources.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = resource.url;
      link.as = resource.type;
      
      if (resource.type === 'font') {
        link.crossOrigin = 'anonymous';
      }
      
      document.head.appendChild(link);
    });
  },

  // Lazy load non-critical resources
  lazyLoadResource: (url, type, callback) => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const element = document.createElement(type === 'script' ? 'script' : 'link');
          
          if (type === 'script') {
            element.src = url;
            element.async = true;
          } else {
            element.rel = 'stylesheet';
            element.href = url;
          }
          
          element.onload = callback;
          document.head.appendChild(element);
          observer.disconnect();
        }
      });
    });
    
    // Create a dummy element to observe
    const dummy = document.createElement('div');
    dummy.style.height = '1px';
    document.body.appendChild(dummy);
    observer.observe(dummy);
  },

  // Prefetch resources based on user behavior
  prefetchOnHover: (element, resources) => {
    let prefetched = false;
    
    const prefetch = () => {
      if (prefetched) return;
      prefetched = true;
      
      resources.forEach(url => {
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = url;
        document.head.appendChild(link);
      });
    };
    
    element.addEventListener('mouseenter', prefetch, { once: true });
    element.addEventListener('touchstart', prefetch, { once: true });
  }
};

// Bundle optimization
export const bundleOptimization = {
  // Dynamic import with error handling
  dynamicImport: async (importFunction, fallback = null) => {
    try {
      const module = await importFunction();
      return module;
    } catch (error) {
      console.warn('Dynamic import failed:', error);
      return fallback;
    }
  },

  // Load component chunks based on route
  loadRouteChunk: async (routeName) => {
    const chunkMap = {
      'shop': () => import('../Pages/Shop'),
      'product': () => import('../UI/ProductDialog'),
      'cart': () => import('../Pages/Cart'),
      'profile': () => import('../Pages/ProfilePage'),
      'admin': () => import('../Admin/AdminHome')
    };
    
    const importFunction = chunkMap[routeName];
    if (importFunction) {
      return bundleOptimization.dynamicImport(importFunction);
    }
    
    return null;
  },

  // Preload route chunks based on user behavior
  preloadRouteChunks: (routes) => {
    routes.forEach(route => {
      bundleOptimization.loadRouteChunk(route).catch(() => {
        // Ignore preload errors
      });
    });
  }
};

// Memory optimization
export const memoryOptimization = {
  // Clean up unused components
  cleanupUnusedComponents: () => {
    // Remove unused event listeners
    const unusedElements = document.querySelectorAll('[data-cleanup="true"]');
    unusedElements.forEach(element => {
      element.remove();
    });
    
    // Force garbage collection if available
    if (window.gc) {
      window.gc();
    }
  },

  // Monitor memory usage
  monitorMemoryUsage: () => {
    if ('memory' in performance) {
      const memory = performance.memory;
      const usage = {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit,
        percentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
      };
      
      // Warn if memory usage is high
      if (usage.percentage > 80) {
        console.warn('High memory usage detected:', usage);
        memoryOptimization.cleanupUnusedComponents();
      }
      
      return usage;
    }
    
    return null;
  },

  // Optimize large lists with virtual scrolling
  createVirtualList: (container, items, renderItem, itemHeight = 50) => {
    const containerHeight = container.clientHeight;
    const visibleItems = Math.ceil(containerHeight / itemHeight) + 2; // Buffer
    let scrollTop = 0;
    
    const render = () => {
      const startIndex = Math.floor(scrollTop / itemHeight);
      const endIndex = Math.min(startIndex + visibleItems, items.length);
      
      container.innerHTML = '';
      container.style.height = `${items.length * itemHeight}px`;
      container.style.position = 'relative';
      
      for (let i = startIndex; i < endIndex; i++) {
        const item = renderItem(items[i], i);
        item.style.position = 'absolute';
        item.style.top = `${i * itemHeight}px`;
        item.style.height = `${itemHeight}px`;
        container.appendChild(item);
      }
    };
    
    container.addEventListener('scroll', (e) => {
      scrollTop = e.target.scrollTop;
      requestAnimationFrame(render);
    });
    
    render();
  }
};

// Network optimization
export const networkOptimization = {
  // Batch API requests
  batchRequests: (() => {
    const batches = new Map();
    const BATCH_DELAY = 50; // ms
    
    return (url, data, batchKey = 'default') => {
      return new Promise((resolve, reject) => {
        if (!batches.has(batchKey)) {
          batches.set(batchKey, {
            requests: [],
            timeout: null
          });
        }
        
        const batch = batches.get(batchKey);
        batch.requests.push({ url, data, resolve, reject });
        
        if (batch.timeout) {
          clearTimeout(batch.timeout);
        }
        
        batch.timeout = setTimeout(async () => {
          const requests = batch.requests.splice(0);
          batches.delete(batchKey);
          
          try {
            const response = await fetch('/api/batch', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ requests: requests.map(r => ({ url: r.url, data: r.data })) })
            });
            
            const results = await response.json();
            
            requests.forEach((request, index) => {
              if (results[index].success) {
                request.resolve(results[index].data);
              } else {
                request.reject(new Error(results[index].error));
              }
            });
          } catch (error) {
            requests.forEach(request => request.reject(error));
          }
        }, BATCH_DELAY);
      });
    };
  })(),

  // Request deduplication
  deduplicateRequests: (() => {
    const pendingRequests = new Map();
    
    return async (url, options = {}) => {
      const key = `${url}_${JSON.stringify(options)}`;
      
      if (pendingRequests.has(key)) {
        return pendingRequests.get(key);
      }
      
      const promise = fetch(url, options)
        .then(response => response.json())
        .finally(() => {
          pendingRequests.delete(key);
        });
      
      pendingRequests.set(key, promise);
      return promise;
    };
  })(),

  // Adaptive loading based on connection
  adaptiveLoad: async (url, options = {}) => {
    const connection = navigator.connection;
    
    if (connection) {
      // Adjust timeout based on connection speed
      const timeouts = {
        'slow-2g': 10000,
        '2g': 8000,
        '3g': 5000,
        '4g': 3000
      };
      
      options.timeout = timeouts[connection.effectiveType] || 5000;
      
      // Skip non-critical requests on slow connections
      if (options.priority === 'low' && (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g')) {
        throw new Error('Skipped due to slow connection');
      }
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeout || 5000);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }
};

// Battery optimization
export const batteryOptimization = {
  // Get battery status
  getBatteryStatus: async () => {
    if ('getBattery' in navigator) {
      try {
        const battery = await navigator.getBattery();
        return {
          level: battery.level,
          charging: battery.charging,
          chargingTime: battery.chargingTime,
          dischargingTime: battery.dischargingTime
        };
      } catch (error) {
        console.warn('Battery API not available:', error);
      }
    }
    return null;
  },

  // Optimize based on battery level
  optimizeForBattery: async () => {
    const battery = await batteryOptimization.getBatteryStatus();
    
    if (battery && battery.level < 0.2 && !battery.charging) {
      return {
        reduceAnimations: true,
        lowerImageQuality: true,
        disableAutoplay: true,
        reducePollFrequency: true,
        enablePowerSaveMode: true
      };
    }
    
    return {
      reduceAnimations: false,
      lowerImageQuality: false,
      disableAutoplay: false,
      reducePollFrequency: false,
      enablePowerSaveMode: false
    };
  }
};

// Main mobile optimization manager
export class MobileOptimizationManager {
  constructor() {
    this.isInitialized = false;
    this.optimizations = {
      images: true,
      resources: true,
      memory: true,
      network: true,
      battery: true
    };
  }

  async initialize() {
    if (this.isInitialized) return;

    // Initialize optimizations based on device capabilities
    const battery = await batteryOptimization.getBatteryStatus();
    
    // Set up memory monitoring
    if (this.optimizations.memory) {
      setInterval(() => {
        memoryOptimization.monitorMemoryUsage();
      }, 30000); // Every 30 seconds
    }

    // Set up battery optimization
    if (this.optimizations.battery && battery) {
      const batteryOptimizations = await batteryOptimization.optimizeForBattery();
      this.applyBatteryOptimizations(batteryOptimizations);
    }

    // Set up network optimization
    if (this.optimizations.network) {
      this.setupNetworkOptimization();
    }

    this.isInitialized = true;
  }

  applyBatteryOptimizations(optimizations) {
    if (optimizations.reduceAnimations) {
      document.documentElement.style.setProperty('--animation-duration', '0s');
    }

    if (optimizations.disableAutoplay) {
      const videos = document.querySelectorAll('video[autoplay]');
      videos.forEach(video => {
        video.removeAttribute('autoplay');
      });
    }

    if (optimizations.enablePowerSaveMode) {
      document.body.classList.add('power-save-mode');
    }
  }

  setupNetworkOptimization() {
    // Intercept fetch requests for optimization
    const originalFetch = window.fetch;
    
    window.fetch = async (url, options = {}) => {
      // Use cached version if available and network is slow
      const connection = navigator.connection;
      if (connection && (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g')) {
        const cached = await mobileCache.get(url);
        if (cached) {
          return new Response(JSON.stringify(cached), {
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }

      // Use adaptive loading
      return networkOptimization.adaptiveLoad(url, options);
    };
  }

  // Get current optimization status
  getOptimizationStatus() {
    return {
      initialized: this.isInitialized,
      optimizations: this.optimizations,
      memoryUsage: memoryOptimization.monitorMemoryUsage(),
      cacheStats: mobileCache.getStats()
    };
  }

  // Enable/disable specific optimizations
  toggleOptimization(type, enabled) {
    if (this.optimizations.hasOwnProperty(type)) {
      this.optimizations[type] = enabled;
    }
  }
}

// Create singleton instance
export const mobileOptimizer = new MobileOptimizationManager();

// Auto-initialize on mobile devices
if (window.innerWidth < 768) {
  mobileOptimizer.initialize();
}

export default {
  imageOptimization,
  resourceOptimization,
  bundleOptimization,
  memoryOptimization,
  networkOptimization,
  batteryOptimization,
  MobileOptimizationManager,
  mobileOptimizer
};
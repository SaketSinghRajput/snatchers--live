// Performance optimization utilities

/**
 * Debounce function to limit the rate of function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @param {boolean} immediate - Execute immediately on first call
 * @returns {Function} Debounced function
 */
export const debounce = (func, wait, immediate = false) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func(...args);
  };
};

/**
 * Throttle function to limit the rate of function calls
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
export const throttle = (func, limit) => {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

/**
 * Lazy load images with intersection observer
 * @param {string} selector - CSS selector for images to lazy load
 * @param {Object} options - Intersection observer options
 */
export const lazyLoadImages = (selector = 'img[data-src]', options = {}) => {
  const defaultOptions = {
    rootMargin: '50px 0px',
    threshold: 0.01,
    ...options
  };

  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.classList.remove('lazy');
          img.classList.add('loaded');
          observer.unobserve(img);
        }
      });
    }, defaultOptions);

    const images = document.querySelectorAll(selector);
    images.forEach(img => imageObserver.observe(img));
  }
};

/**
 * Preload critical resources
 * @param {Array} resources - Array of resource objects with url and type
 */
export const preloadResources = (resources) => {
  resources.forEach(resource => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = resource.url;
    link.as = resource.type || 'fetch';
    if (resource.crossorigin) link.crossOrigin = resource.crossorigin;
    document.head.appendChild(link);
  });
};

/**
 * Measure and report Core Web Vitals
 * @param {Function} callback - Callback function to handle metrics
 */
export const measureCoreWebVitals = (callback) => {
  // This is a simplified version - in production, use web-vitals library
  if ('PerformanceObserver' in window) {
    // Largest Contentful Paint
    new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1];
      callback({
        name: 'LCP',
        value: lastEntry.startTime,
        rating: lastEntry.startTime <= 2500 ? 'good' : lastEntry.startTime <= 4000 ? 'needs-improvement' : 'poor'
      });
    }).observe({ type: 'largest-contentful-paint', buffered: true });

    // First Input Delay
    new PerformanceObserver((entryList) => {
      const firstInput = entryList.getEntries()[0];
      if (firstInput) {
        const fid = firstInput.processingStart - firstInput.startTime;
        callback({
          name: 'FID',
          value: fid,
          rating: fid <= 100 ? 'good' : fid <= 300 ? 'needs-improvement' : 'poor'
        });
      }
    }).observe({ type: 'first-input', buffered: true });

    // Cumulative Layout Shift
    let clsValue = 0;
    new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
          callback({
            name: 'CLS',
            value: clsValue,
            rating: clsValue <= 0.1 ? 'good' : clsValue <= 0.25 ? 'needs-improvement' : 'poor'
          });
        }
      }
    }).observe({ type: 'layout-shift', buffered: true });
  }
};

/**
 * Optimize bundle loading with dynamic imports
 * @param {Function} importFunction - Dynamic import function
 * @param {string} fallbackComponent - Fallback component name
 * @returns {Promise} Component promise
 */
export const loadComponentAsync = async (importFunction, fallbackComponent = 'div') => {
  try {
    const module = await importFunction();
    return module.default || module;
  } catch (error) {
    console.error('Failed to load component:', error);
    return fallbackComponent;
  }
};

/**
 * Critical CSS extraction helper
 * @param {Array} criticalSelectors - Array of critical CSS selectors
 */
export const extractCriticalCSS = (criticalSelectors = []) => {
  const criticalCSS = [];
  
  criticalSelectors.forEach(selector => {
    try {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        const computedStyle = window.getComputedStyle(elements[0]);
        // Extract critical properties
        const criticalProps = [
          'display', 'position', 'top', 'left', 'width', 'height',
          'margin', 'padding', 'font-size', 'font-family', 'color',
          'background-color', 'border'
        ];
        
        const rules = criticalProps
          .map(prop => `${prop}: ${computedStyle.getPropertyValue(prop)}`)
          .filter(rule => !rule.includes('initial'))
          .join('; ');
          
        if (rules) {
          criticalCSS.push(`${selector} { ${rules} }`);
        }
      }
    } catch (error) {
      console.warn('Failed to extract CSS for selector:', selector, error);
    }
  });
  
  return criticalCSS.join('\n');
};

/**
 * Resource hints helper
 * @param {Array} hints - Array of resource hint objects
 */
export const addResourceHints = (hints) => {
  hints.forEach(hint => {
    const link = document.createElement('link');
    link.rel = hint.rel; // preload, prefetch, preconnect, dns-prefetch
    link.href = hint.href;
    if (hint.as) link.as = hint.as;
    if (hint.type) link.type = hint.type;
    if (hint.crossorigin) link.crossOrigin = hint.crossorigin;
    document.head.appendChild(link);
  });
};

/**
 * Service Worker registration for caching
 * @param {string} swPath - Service worker file path
 * @param {Object} options - Registration options
 */
export const registerServiceWorker = async (swPath = '/sw.js', options = {}) => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register(swPath, options);
      console.log('Service Worker registered successfully:', registration);
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      throw error;
    }
  } else {
    console.warn('Service Worker not supported');
    return null;
  }
};

/**
 * Memory usage monitoring
 * @returns {Object} Memory usage information
 */
export const getMemoryUsage = () => {
  if ('memory' in performance) {
    return {
      usedJSHeapSize: performance.memory.usedJSHeapSize,
      totalJSHeapSize: performance.memory.totalJSHeapSize,
      jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
      usagePercentage: Math.round((performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100)
    };
  }
  return null;
};

/**
 * Network information helper
 * @returns {Object} Network information
 */
export const getNetworkInfo = () => {
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
};

/**
 * Adaptive loading based on network conditions
 * @param {Object} options - Loading options for different network conditions
 * @returns {Object} Optimized loading configuration
 */
export const getAdaptiveLoadingConfig = (options = {}) => {
  const networkInfo = getNetworkInfo();
  const memoryInfo = getMemoryUsage();
  
  const defaultConfig = {
    imageQuality: 80,
    enableLazyLoading: true,
    preloadCount: 5,
    enableWebP: true
  };
  
  if (!networkInfo) return { ...defaultConfig, ...options.default };
  
  // Slow connection optimizations
  if (networkInfo.effectiveType === 'slow-2g' || networkInfo.effectiveType === '2g') {
    return {
      imageQuality: 40,
      enableLazyLoading: true,
      preloadCount: 2,
      enableWebP: true,
      ...options.slow
    };
  }
  
  // Fast connection optimizations
  if (networkInfo.effectiveType === '4g' && !networkInfo.saveData) {
    return {
      imageQuality: 90,
      enableLazyLoading: false,
      preloadCount: 10,
      enableWebP: true,
      ...options.fast
    };
  }
  
  // Default configuration
  return { ...defaultConfig, ...options.default };
};

/**
 * Performance budget checker
 * @param {Object} budgets - Performance budgets
 * @returns {Object} Budget check results
 */
export const checkPerformanceBudget = (budgets = {}) => {
  const defaultBudgets = {
    maxLCP: 2500,
    maxFID: 100,
    maxCLS: 0.1,
    maxBundleSize: 250000, // 250KB
    maxImageSize: 100000   // 100KB
  };
  
  const finalBudgets = { ...defaultBudgets, ...budgets };
  const results = {};
  
  // Check bundle size (approximate)
  const scripts = document.querySelectorAll('script[src]');
  let totalBundleSize = 0;
  
  scripts.forEach(script => {
    // This is an approximation - in real implementation, you'd track actual sizes
    totalBundleSize += 50000; // Assume 50KB per script
  });
  
  results.bundleSize = {
    actual: totalBundleSize,
    budget: finalBudgets.maxBundleSize,
    passed: totalBundleSize <= finalBudgets.maxBundleSize
  };
  
  return results;
};
// Code splitting utilities for dynamic imports and lazy loading

import { lazy, Suspense } from 'react';

/**
 * Create a lazy-loaded component with error boundary and loading fallback
 * @param {Function} importFunction - Dynamic import function
 * @param {Object} options - Configuration options
 * @returns {React.Component} Lazy component with error handling
 */
export const createLazyComponent = (importFunction, options = {}) => {
  const {
    fallback = <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>,
    errorFallback = <div className="text-red-500 p-4">Failed to load component</div>,
    retryCount = 3,
    retryDelay = 1000
  } = options;

  const LazyComponent = lazy(() => {
    let retries = 0;
    
    const loadWithRetry = async () => {
      try {
        return await importFunction();
      } catch (error) {
        if (retries < retryCount) {
          retries++;
          console.warn(`Component load failed, retrying (${retries}/${retryCount}):`, error);
          await new Promise(resolve => setTimeout(resolve, retryDelay * retries));
          return loadWithRetry();
        }
        throw error;
      }
    };
    
    return loadWithRetry();
  });

  return (props) => (
    <Suspense fallback={fallback}>
      <LazyComponent {...props} />
    </Suspense>
  );
};

/**
 * Route-based code splitting helper
 * @param {Array} routes - Array of route configurations
 * @returns {Array} Routes with lazy-loaded components
 */
export const createLazyRoutes = (routes) => {
  return routes.map(route => ({
    ...route,
    component: route.lazy ? createLazyComponent(route.component, route.lazyOptions) : route.component
  }));
};

/**
 * Preload components for better UX
 * @param {Array} importFunctions - Array of dynamic import functions
 */
export const preloadComponents = (importFunctions) => {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      importFunctions.forEach(importFn => {
        importFn().catch(error => {
          console.warn('Component preload failed:', error);
        });
      });
    });
  } else {
    // Fallback for browsers without requestIdleCallback
    setTimeout(() => {
      importFunctions.forEach(importFn => {
        importFn().catch(error => {
          console.warn('Component preload failed:', error);
        });
      });
    }, 2000);
  }
};

/**
 * Bundle analyzer helper for development
 * @returns {Object} Bundle size information
 */
export const analyzeBundleSize = () => {
  if (process.env.NODE_ENV !== 'development') return null;
  
  const scripts = Array.from(document.querySelectorAll('script[src]'));
  const stylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
  
  const bundleInfo = {
    scripts: scripts.map(script => ({
      src: script.src,
      async: script.async,
      defer: script.defer
    })),
    stylesheets: stylesheets.map(link => ({
      href: link.href,
      media: link.media
    })),
    totalScripts: scripts.length,
    totalStylesheets: stylesheets.length
  };
  
  console.group('Bundle Analysis');
  console.table(bundleInfo.scripts);
  console.table(bundleInfo.stylesheets);
  console.log('Total Scripts:', bundleInfo.totalScripts);
  console.log('Total Stylesheets:', bundleInfo.totalStylesheets);
  console.groupEnd();
  
  return bundleInfo;
};

/**
 * Critical resource preloader
 * @param {Array} resources - Array of critical resources to preload
 */
export const preloadCriticalResources = (resources) => {
  resources.forEach(resource => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = resource.href;
    link.as = resource.as || 'fetch';
    
    if (resource.type) link.type = resource.type;
    if (resource.crossorigin) link.crossOrigin = resource.crossorigin;
    if (resource.media) link.media = resource.media;
    
    // Add to head
    document.head.appendChild(link);
    
    // Remove after load to clean up
    link.onload = () => {
      setTimeout(() => {
        if (link.parentNode) {
          link.parentNode.removeChild(link);
        }
      }, 1000);
    };
  });
};

/**
 * Module federation helper for micro-frontends
 * @param {string} remoteName - Name of the remote module
 * @param {string} moduleName - Name of the module to load
 * @returns {Promise} Module promise
 */
export const loadRemoteModule = async (remoteName, moduleName) => {
  try {
    // @ts-ignore
    const container = window[remoteName];
    if (!container) {
      throw new Error(`Remote container ${remoteName} not found`);
    }
    
    await container.init(window.__webpack_share_scopes__?.default || {});
    const factory = await container.get(moduleName);
    return factory();
  } catch (error) {
    console.error(`Failed to load remote module ${remoteName}/${moduleName}:`, error);
    throw error;
  }
};

/**
 * Chunk loading optimization
 * @param {Array} chunkNames - Array of chunk names to optimize
 */
export const optimizeChunkLoading = (chunkNames) => {
  // Prefetch chunks during idle time
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      chunkNames.forEach(chunkName => {
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = `/static/js/${chunkName}.chunk.js`;
        document.head.appendChild(link);
      });
    });
  }
};

/**
 * Tree shaking analyzer for development
 * @param {Object} modules - Modules to analyze
 */
export const analyzeTreeShaking = (modules) => {
  if (process.env.NODE_ENV !== 'development') return;
  
  console.group('Tree Shaking Analysis');
  Object.entries(modules).forEach(([moduleName, moduleExports]) => {
    const exportedFunctions = Object.keys(moduleExports).filter(key => 
      typeof moduleExports[key] === 'function'
    );
    const exportedObjects = Object.keys(moduleExports).filter(key => 
      typeof moduleExports[key] === 'object' && moduleExports[key] !== null
    );
    
    console.log(`${moduleName}:`, {
      functions: exportedFunctions,
      objects: exportedObjects,
      total: Object.keys(moduleExports).length
    });
  });
  console.groupEnd();
};
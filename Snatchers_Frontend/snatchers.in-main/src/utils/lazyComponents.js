// Lazy-loaded components for code splitting and performance optimization

import { lazy } from 'react';
import { createLazyComponent } from './codesplitting';

// Loading fallback component
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[200px]">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
  </div>
);

// Error fallback component
const ErrorFallback = ({ error, retry }) => (
  <div className="flex flex-col items-center justify-center min-h-[200px] p-4">
    <div className="text-red-500 text-center">
      <h3 className="text-lg font-semibold mb-2">Failed to load component</h3>
      <p className="text-sm text-gray-600 mb-4">
        {error?.message || 'Something went wrong while loading this page.'}
      </p>
      <button
        onClick={retry}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
      >
        Try Again
      </button>
    </div>
  </div>
);

// Lazy component options
const lazyOptions = {
  fallback: <LoadingFallback />,
  errorFallback: <ErrorFallback />,
  retryCount: 3,
  retryDelay: 1000
};

// Admin Components (Heavy - load only when needed)
export const LazyAdminDashboard = createLazyComponent(
  () => import('../Admin/AdminDashboard'),
  lazyOptions
);

export const LazyAdminHome = createLazyComponent(
  () => import('../Admin/AdminHome'),
  lazyOptions
);

export const LazyAddProduct = createLazyComponent(
  () => import('../Admin/AddProduct'),
  lazyOptions
);

export const LazyAdminProducts = createLazyComponent(
  () => import('../Admin/AdminProducts'),
  lazyOptions
);

export const LazyEditProduct = createLazyComponent(
  () => import('../Admin/EditProduct'),
  lazyOptions
);

export const LazyCategoryManager = createLazyComponent(
  () => import('../Admin/CategoryManager'),
  lazyOptions
);

export const LazyBrandManager = createLazyComponent(
  () => import('../Admin/BrandManager'),
  lazyOptions
);

export const LazyBannerManager = createLazyComponent(
  () => import('../Admin/BannerManager'),
  lazyOptions
);

export const LazyFeaturedProductsManager = createLazyComponent(
  () => import('../Admin/FeaturedProductsManager'),
  lazyOptions
);

export const LazyOrderManagement = createLazyComponent(
  () => import('../Admin/OrderManagement'),
  lazyOptions
);

export const LazyOrderDetails = createLazyComponent(
  () => import('../Admin/OrderDetails'),
  lazyOptions
);

export const LazyDisputeManagement = createLazyComponent(
  () => import('../Admin/DisputeManagement'),
  lazyOptions
);

export const LazyAnalyticsDashboard = createLazyComponent(
  () => import('../Admin/AnalyticsDashboard'),
  lazyOptions
);

// User Dashboard Components
export const LazyProfilePage = createLazyComponent(
  () => import('../Pages/ProfilePage'),
  lazyOptions
);

export const LazyOrderHistory = createLazyComponent(
  () => import('../Pages/OrderHistory'),
  lazyOptions
);

export const LazyOrderTracker = createLazyComponent(
  () => import('../Pages/OrderTracker'),
  lazyOptions
);

export const LazyReturnRequest = createLazyComponent(
  () => import('../Pages/ReturnRequest'),
  lazyOptions
);

export const LazyNotificationCenter = createLazyComponent(
  () => import('../Pages/NotificationCenter'),
  lazyOptions
);

export const LazyNotificationPreferences = createLazyComponent(
  () => import('../Pages/NotificationPreferences'),
  lazyOptions
);

// Shopping Components
export const LazyWishlist = createLazyComponent(
  () => import('../Pages/Wishlist'),
  lazyOptions
);

export const LazyComparisonPage = createLazyComponent(
  () => import('../Pages/ComparisonPage'),
  lazyOptions
);

export const LazyCheckoutWizard = createLazyComponent(
  () => import('../components/Checkout/CheckoutWizard'),
  lazyOptions
);

export const LazyOrderConfirmation = createLazyComponent(
  () => import('../Pages/OrderConfirmation'),
  lazyOptions
);

// Blog Components (Less critical)
export const LazyBlog1 = createLazyComponent(
  () => import('../Pages/Blog1'),
  { ...lazyOptions, retryCount: 1 }
);

export const LazyBlog2 = createLazyComponent(
  () => import('../Pages/Blog2'),
  { ...lazyOptions, retryCount: 1 }
);

export const LazyBlog3 = createLazyComponent(
  () => import('../Pages/Blog3'),
  { ...lazyOptions, retryCount: 1 }
);

// Info Pages (Less critical)
export const LazyShippingReturns = createLazyComponent(
  () => import('../Pages/ShippingReturns'),
  { ...lazyOptions, retryCount: 1 }
);

export const LazyWarranty = createLazyComponent(
  () => import('../Pages/Warranty'),
  { ...lazyOptions, retryCount: 1 }
);

export const LazyFAQ = createLazyComponent(
  () => import('../Pages/FAQ'),
  { ...lazyOptions, retryCount: 1 }
);

export const LazyContact = createLazyComponent(
  () => import('../Pages/Contact'),
  { ...lazyOptions, retryCount: 1 }
);

// Demo/Debug Components (Development only)
export const LazyScrollEffectsDemo = createLazyComponent(
  () => import('../Pages/ScrollEffectsDemo'),
  { ...lazyOptions, retryCount: 1 }
);

export const LazyScrollDebug = createLazyComponent(
  () => import('../Pages/ScrollDebug'),
  { ...lazyOptions, retryCount: 1 }
);

export const LazyNotificationTest = createLazyComponent(
  () => import('../components/NotificationTest'),
  { ...lazyOptions, retryCount: 1 }
);

// Preload critical components for better UX
export const preloadCriticalComponents = () => {
  const criticalComponents = [
    () => import('../Pages/ProfilePage'),
    () => import('../Pages/Wishlist'),
    () => import('../components/Checkout/CheckoutWizard')
  ];
  
  // Preload during idle time
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      criticalComponents.forEach(importFn => {
        importFn().catch(error => {
          console.warn('Failed to preload component:', error);
        });
      });
    });
  }
};

// Preload admin components for admin users
export const preloadAdminComponents = () => {
  const adminComponents = [
    () => import('../Admin/AdminHome'),
    () => import('../Admin/AdminProducts'),
    () => import('../Admin/OrderManagement')
  ];
  
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      adminComponents.forEach(importFn => {
        importFn().catch(error => {
          console.warn('Failed to preload admin component:', error);
        });
      });
    });
  }
};

// Route-based preloading
export const preloadRouteComponents = (routes) => {
  const routeComponents = routes
    .filter(route => route.preload)
    .map(route => route.component);
  
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      routeComponents.forEach(importFn => {
        if (typeof importFn === 'function') {
          importFn().catch(error => {
            console.warn('Failed to preload route component:', error);
          });
        }
      });
    });
  }
};
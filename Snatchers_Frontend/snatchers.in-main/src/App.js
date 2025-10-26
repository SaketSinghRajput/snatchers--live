import React, { Suspense, useEffect } from "react";
import { Routes, Route } from "react-router-dom";

// Core components (not lazy-loaded for better initial performance)
import Shop from "./Pages/Shop";
import Home from "./Pages/Home";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Mens from "./Pages/Mens";
import Womens from "./Pages/Womens";
import About from "./Pages/About";
import ProductDialog from "./UI/ProductDialog";
import CategoryShop from "./Pages/CategoryShop";
import ProtectedRoute from './components/ProtectedRoute';
import UnauthRoute from './components/UnauthRoute';
import AuthSuccess from "./Pages/AuthSuccess";
import AuthError from "./Pages/AuthError";
import TopOfferBar from "./components/TopOffer";
import Login from "./Pages/Login";
import Register from "./Pages/Register";
import Cart from "./Pages/Cart";
import BuyNowComponent from "./components/BuyNowComponent";
import { ScrollProgress } from "./components/ScrollAnimations";

// Context providers
import { CartProvider } from './contexts/CartContext';
import { ComparisonProvider } from './components/ProductComparison/ComparisonContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { RecommendationProvider } from './contexts/RecommendationContext';
import { PWAProvider } from './contexts/PWAContext';

// Performance and PWA components
import PerformanceMonitor from "./components/PerformanceMonitor";
import InstallPrompt from "./components/PWA/InstallPrompt";
import OfflineIndicator from "./components/PWA/OfflineIndicator";
import UpdatePrompt from "./components/PWA/UpdatePrompt";
import AppShell from "./components/PWA/AppShell";
import OfflineCart from "./components/PWA/OfflineCart";

// Lazy-loaded components
import {
  LazyProfilePage,
  LazyWishlist,
  LazyComparisonPage,
  LazyCheckoutWizard,
  LazyOrderConfirmation,
  LazyOrderTracker,
  LazyOrderHistory,
  LazyReturnRequest,
  LazyNotificationCenter,
  LazyNotificationPreferences,
  LazyNotificationTest,
  LazyAdminHome,
  LazyAddProduct,
  LazyAdminProducts,
  LazyEditProduct,
  LazyCategoryManager,
  LazyBrandManager,
  LazyBannerManager,
  LazyFeaturedProductsManager,
  LazyOrderManagement,
  LazyOrderDetails,
  LazyDisputeManagement,
  LazyBlog1,
  LazyBlog2,
  LazyBlog3,
  LazyShippingReturns,
  LazyWarranty,
  LazyFAQ,
  LazyContact,
  LazyScrollEffectsDemo,
  LazyScrollDebug,
  preloadCriticalComponents
} from './utils/lazyComponents';

// Drawer components (keep loaded for better UX)
import ComparisonDrawer from './components/ProductComparison/ComparisonDrawer';
import CartDrawer from './components/Cart/CartDrawer';

// Mobile components
import MobileNavigation from './components/Mobile/MobileNavigation';

// Mobile optimization
import { mobileOptimizer } from './utils/mobileOptimization';
import useMobilePerformance from './hooks/useMobilePerformance';

function App() {
  const { shouldUsePerformanceMode, optimizeForDevice } = useMobilePerformance();
  
  // Preload critical components after initial render
  useEffect(() => {
    preloadCriticalComponents();
    
    // Initialize mobile optimizations
    if (window.innerWidth < 768) {
      mobileOptimizer.initialize();
    }
  }, []);

  // Apply performance optimizations based on device capabilities
  useEffect(() => {
    if (shouldUsePerformanceMode) {
      const optimizations = optimizeForDevice();
      
      // Apply CSS optimizations for low-end devices
      if (optimizations.reduceAnimations) {
        document.documentElement.style.setProperty('--animation-duration', '0.1s');
      }
      
      if (optimizations.batteryOptimization) {
        document.body.classList.add('battery-save-mode');
      }
    }
  }, [shouldUsePerformanceMode, optimizeForDevice]);

  return (
    <>
      <PerformanceMonitor enableServiceWorker={true} enableAnalytics={false}>
        <PWAProvider>
          <AppShell>
            <CartProvider>
              <ComparisonProvider>
                <NotificationProvider>
                  <RecommendationProvider>
                  {/* PWA Components */}
                  <InstallPrompt />
                  <OfflineIndicator />
                  <UpdatePrompt />
                  <OfflineCart />
                  
                  {/* Core UI */}
                  <ScrollProgress />
                  <TopOfferBar />
                  <Navbar />

                <main className="pt-20 pb-20 lg:pt-36 lg:pb-0">
                  <Suspense fallback={
                    <div className="flex items-center justify-center min-h-[400px]">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>
                  }>
                    <Routes>
                      {/* Core routes (not lazy-loaded) */}
                      <Route path="/" element={<Home />} />
                      <Route path="/shop" element={<Shop />} />
                      <Route path="/mens" element={<Mens />} />
                      <Route path="/womens" element={<Womens />} />
                      <Route path="/about" element={<About />} />
                      <Route path="/product/:productId" element={<ProductDialog />} />
                      <Route path="/category-shop" element={<CategoryShop />} />
                      <Route path="/auth/success" element={<AuthSuccess />} />
                      <Route path="/auth/error" element={<AuthError />} />
                      <Route path="/login" element={<UnauthRoute><Login /></UnauthRoute>} />
                      <Route path="/register" element={<UnauthRoute><Register /></UnauthRoute>} />
                      <Route path="/cart" element={<Cart />} />
                      <Route path="/buy-now/:productId" element={<BuyNowComponent />} />

                      {/* User dashboard routes (lazy-loaded) */}
                      <Route path="/profile" element={<ProtectedRoute><LazyProfilePage /></ProtectedRoute>} />
                      <Route path="/wishlist" element={<LazyWishlist />} />
                      <Route path="/orders" element={<ProtectedRoute><LazyOrderHistory /></ProtectedRoute>} />
                      <Route path="/orders/:orderId" element={<ProtectedRoute><LazyOrderTracker /></ProtectedRoute>} />
                      <Route path="/orders/:orderId/return" element={<ProtectedRoute><LazyReturnRequest /></ProtectedRoute>} />
                      <Route path="/notifications" element={<ProtectedRoute><LazyNotificationCenter /></ProtectedRoute>} />
                      <Route path="/notifications/preferences" element={<ProtectedRoute><LazyNotificationPreferences /></ProtectedRoute>} />
                      <Route path="/notifications/test" element={<LazyNotificationTest />} />

                      {/* Shopping routes (lazy-loaded) */}
                      <Route path="/compare" element={<LazyComparisonPage />} />
                      <Route path="/checkout" element={<LazyCheckoutWizard />} />
                      <Route path="/order-confirmation/:orderId" element={<LazyOrderConfirmation />} />

                      {/* Admin routes (lazy-loaded) */}
                      <Route path="/admin" element={<LazyAdminHome />} />
                      <Route path="/add-product" element={<LazyAddProduct />} />
                      <Route path="/admin/products" element={<LazyAdminProducts />} />
                      <Route path="/admin/edit-product/:id" element={<LazyEditProduct />} />
                      <Route path="/admin/categories" element={<LazyCategoryManager />} />
                      <Route path="/admin/brands" element={<LazyBrandManager />} />
                      <Route path="/admin/banners" element={<LazyBannerManager />} />
                      <Route path="/admin/featured" element={<LazyFeaturedProductsManager />} />
                      <Route path="/admin/orders" element={<LazyOrderManagement />} />
                      <Route path="/admin/orders/:orderId" element={<LazyOrderDetails />} />
                      <Route path="/admin/disputes" element={<LazyDisputeManagement />} />

                      {/* Content routes (lazy-loaded) */}
                      <Route path="/blog1" element={<LazyBlog1 />} />
                      <Route path="/blog2" element={<LazyBlog2 />} />
                      <Route path="/blog3" element={<LazyBlog3 />} />
                      <Route path="/shipping" element={<LazyShippingReturns />} />
                      <Route path="/warranty" element={<LazyWarranty />} />
                      <Route path="/faq" element={<LazyFAQ />} />
                      <Route path="/contact" element={<LazyContact />} />

                      {/* Development/Demo routes (lazy-loaded) */}
                      <Route path="/scroll-demo" element={<LazyScrollEffectsDemo />} />
                      <Route path="/scroll-debug" element={<LazyScrollDebug />} />
                    </Routes>
                  </Suspense>
                </main>
                
                    <Footer />
                    <ComparisonDrawer />
                    <CartDrawer />
                    <MobileNavigation />
                  </RecommendationProvider>
                </NotificationProvider>
              </ComparisonProvider>
            </CartProvider>
          </AppShell>
        </PWAProvider>
      </PerformanceMonitor>
    </>
  );
}

export default App;



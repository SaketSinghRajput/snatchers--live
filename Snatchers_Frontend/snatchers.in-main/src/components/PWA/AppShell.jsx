import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const AppShell = ({ children, isLoading = false }) => {
  const [isStandalone, setIsStandalone] = useState(false);
  const [showSplashScreen, setShowSplashScreen] = useState(true);

  useEffect(() => {
    // Check if app is running in standalone mode
    const checkStandaloneMode = () => {
      const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches ||
                              window.navigator.standalone ||
                              document.referrer.includes('android-app://');
      
      setIsStandalone(isStandaloneMode);
    };

    checkStandaloneMode();

    // Listen for display mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = (e) => {
      setIsStandalone(e.matches);
    };

    mediaQuery.addListener(handleDisplayModeChange);

    // Hide splash screen after initial load
    const timer = setTimeout(() => {
      setShowSplashScreen(false);
    }, 2000);

    return () => {
      mediaQuery.removeListener(handleDisplayModeChange);
      clearTimeout(timer);
    };
  }, []);

  // Add app-like styling for standalone mode
  useEffect(() => {
    if (isStandalone) {
      document.body.classList.add('standalone-app');
      
      // Add safe area insets for devices with notches
      document.documentElement.style.setProperty('--safe-area-inset-top', 'env(safe-area-inset-top)');
      document.documentElement.style.setProperty('--safe-area-inset-bottom', 'env(safe-area-inset-bottom)');
      document.documentElement.style.setProperty('--safe-area-inset-left', 'env(safe-area-inset-left)');
      document.documentElement.style.setProperty('--safe-area-inset-right', 'env(safe-area-inset-right)');
    } else {
      document.body.classList.remove('standalone-app');
    }

    return () => {
      document.body.classList.remove('standalone-app');
    };
  }, [isStandalone]);

  // Splash screen component
  const SplashScreen = () => (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-50 bg-white flex items-center justify-center"
    >
      <div className="text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-8"
        >
          <img
            src="/logo192.png"
            alt="Snatchers"
            className="w-24 h-24 mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-gray-900">Snatchers</h1>
          <p className="text-gray-600 mt-2">Premium Shopping Experience</p>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.7 }}
          className="flex items-center justify-center space-x-2"
        >
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-black"></div>
          <span className="text-sm text-gray-500">Loading...</span>
        </motion.div>
      </div>
    </motion.div>
  );

  // Loading overlay for app transitions
  const LoadingOverlay = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 bg-white/80 backdrop-blur-sm flex items-center justify-center"
    >
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto mb-2"></div>
        <p className="text-sm text-gray-600">Loading...</p>
      </div>
    </motion.div>
  );

  return (
    <div className={`app-shell ${isStandalone ? 'standalone' : 'browser'}`}>
      {/* Splash screen for initial app load */}
      <AnimatePresence>
        {showSplashScreen && isStandalone && <SplashScreen />}
      </AnimatePresence>

      {/* Loading overlay for transitions */}
      <AnimatePresence>
        {isLoading && <LoadingOverlay />}
      </AnimatePresence>

      {/* Main app content */}
      <div className="app-content">
        {children}
      </div>

      {/* App-specific styles */}
      <style jsx>{`
        .app-shell {
          min-height: 100vh;
          position: relative;
        }

        .app-shell.standalone {
          padding-top: var(--safe-area-inset-top, 0);
          padding-bottom: var(--safe-area-inset-bottom, 0);
          padding-left: var(--safe-area-inset-left, 0);
          padding-right: var(--safe-area-inset-right, 0);
        }

        .app-content {
          min-height: 100vh;
          position: relative;
        }

        /* Standalone app specific styles */
        :global(.standalone-app) {
          -webkit-user-select: none;
          -webkit-touch-callout: none;
          -webkit-tap-highlight-color: transparent;
        }

        /* Prevent pull-to-refresh on standalone apps */
        :global(.standalone-app body) {
          overscroll-behavior-y: contain;
        }

        /* Hide scrollbars in standalone mode for cleaner look */
        :global(.standalone-app ::-webkit-scrollbar) {
          width: 0px;
          background: transparent;
        }

        /* App-like transitions */
        .app-shell * {
          transition: transform 0.2s ease, opacity 0.2s ease;
        }

        /* Touch feedback for interactive elements */
        :global(.standalone-app button:active),
        :global(.standalone-app .clickable:active) {
          transform: scale(0.98);
          opacity: 0.8;
        }

        /* Status bar styling for iOS */
        @supports (padding-top: env(safe-area-inset-top)) {
          .app-shell.standalone {
            padding-top: env(safe-area-inset-top);
          }
        }

        /* Bottom safe area for iOS home indicator */
        @supports (padding-bottom: env(safe-area-inset-bottom)) {
          .app-shell.standalone {
            padding-bottom: env(safe-area-inset-bottom);
          }
        }
      `}</style>
    </div>
  );
};

export default AppShell;
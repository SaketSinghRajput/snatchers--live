import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const UpdatePrompt = () => {
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
  const [newWorker, setNewWorker] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    // Listen for service worker updates
    const handleServiceWorkerUpdate = (event) => {
      if (event.data && event.data.type === 'SW_UPDATE_AVAILABLE') {
        console.log('[PWA] Service worker update available');
        setNewWorker(event.data.worker);
        setShowUpdatePrompt(true);
      }
    };

    // Listen for service worker messages
    navigator.serviceWorker?.addEventListener('message', handleServiceWorkerUpdate);

    // Check for waiting service worker on load
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        if (registration.waiting) {
          console.log('[PWA] Service worker waiting');
          setNewWorker(registration.waiting);
          setShowUpdatePrompt(true);
        }

        // Listen for new service worker
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[PWA] New service worker installed');
                setNewWorker(newWorker);
                setShowUpdatePrompt(true);
              }
            });
          }
        });
      });
    }

    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleServiceWorkerUpdate);
    };
  }, []);

  const handleUpdate = async () => {
    if (!newWorker) return;

    setIsUpdating(true);

    try {
      // Tell the new service worker to skip waiting
      newWorker.postMessage({ type: 'SKIP_WAITING' });

      // Wait for the new service worker to take control
      const handleControllerChange = () => {
        console.log('[PWA] New service worker took control');
        
        // Track update
        if (window.gtag) {
          window.gtag('event', 'pwa_update', {
            event_category: 'PWA',
            event_label: 'App Updated'
          });
        }

        // Reload the page to get the latest version
        window.location.reload();
      };

      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

      // Fallback: reload after a short delay if controllerchange doesn't fire
      setTimeout(() => {
        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
        window.location.reload();
      }, 2000);

    } catch (error) {
      console.error('[PWA] Error updating service worker:', error);
      setIsUpdating(false);
    }
  };

  const handleDismiss = () => {
    setShowUpdatePrompt(false);
    
    // Track dismissal
    if (window.gtag) {
      window.gtag('event', 'pwa_update_dismiss', {
        event_category: 'PWA',
        event_label: 'Update Dismissed'
      });
    }
  };

  if (!showUpdatePrompt) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed top-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm"
      >
        <div className="bg-blue-500 text-white rounded-lg shadow-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold">
                Update Available
              </h3>
              <p className="text-sm opacity-90 mt-1">
                A new version of Snatchers is available with improvements and bug fixes.
              </p>
              
              <div className="flex items-center space-x-2 mt-3">
                <button
                  onClick={handleUpdate}
                  disabled={isUpdating}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-blue-500 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUpdating ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-3 w-3" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Updating...
                    </>
                  ) : (
                    'Update Now'
                  )}
                </button>
                
                <button
                  onClick={handleDismiss}
                  disabled={isUpdating}
                  className="inline-flex items-center px-3 py-1.5 border border-white/30 text-xs font-medium rounded-md text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Later
                </button>
              </div>
            </div>
            
            <button
              onClick={handleDismiss}
              disabled={isUpdating}
              className="flex-shrink-0 text-white/80 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default UpdatePrompt;
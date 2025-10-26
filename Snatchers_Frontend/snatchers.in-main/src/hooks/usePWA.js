import { useState, useEffect, useCallback } from 'react';

const usePWA = () => {
  const [isInstalled, setIsInstalled] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState(null);

  // Check if app is installed or running in standalone mode
  const checkInstallStatus = useCallback(() => {
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches ||
                            window.navigator.standalone ||
                            document.referrer.includes('android-app://');
    
    setIsStandalone(isStandaloneMode);
    setIsInstalled(isStandaloneMode);
    
    return isStandaloneMode;
  }, []);

  // Register service worker
  const registerServiceWorker = useCallback(async () => {
    if ('serviceWorker' in navigator) {
      // In development, avoid registering the service worker to prevent caching/503 issues
      if (process.env.NODE_ENV !== 'production') {
        try {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map(r => r.unregister()));
          console.log('[PWA] Service worker disabled in development. Unregistered existing registrations.');
        } catch (e) {
          console.warn('[PWA] Failed to unregister service workers in dev:', e?.message || e);
        }
        return null;
      }

      try {
        const reg = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });
        
        console.log('[PWA] Service worker registered:', reg);
        setRegistration(reg);
        
        // Check for updates
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[PWA] New service worker available');
                setUpdateAvailable(true);
              }
            });
          }
        });

        // Check if there's already a waiting worker
        if (reg.waiting) {
          setUpdateAvailable(true);
        }

        return reg;
      } catch (error) {
        console.error('[PWA] Service worker registration failed:', error);
        return null;
      }
    }
    return null;
  }, []);

  // Install app
  const installApp = useCallback(async () => {
    if (!deferredPrompt) {
      console.warn('[PWA] No install prompt available');
      return false;
    }

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      console.log(`[PWA] Install prompt result: ${outcome}`);
      
      // Track installation attempt
      if (window.gtag) {
        window.gtag('event', 'pwa_install_attempt', {
          event_category: 'PWA',
          event_label: outcome
        });
      }

      if (outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('[PWA] Install failed:', error);
      return false;
    }
  }, [deferredPrompt]);

  // Update app
  const updateApp = useCallback(async () => {
    if (!registration || !registration.waiting) {
      console.warn('[PWA] No update available');
      return false;
    }

    try {
      // Tell the waiting service worker to skip waiting
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      
      // Wait for the new service worker to take control
      return new Promise((resolve) => {
        const handleControllerChange = () => {
          navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
          setUpdateAvailable(false);
          
          // Track update
          if (window.gtag) {
            window.gtag('event', 'pwa_update_applied', {
              event_category: 'PWA',
              event_label: 'Update Applied'
            });
          }
          
          resolve(true);
        };

        navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
        
        // Fallback timeout
        setTimeout(() => {
          navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
          resolve(false);
        }, 5000);
      });
    } catch (error) {
      console.error('[PWA] Update failed:', error);
      return false;
    }
  }, [registration]);

  // Get app info
  const getAppInfo = useCallback(() => {
    return {
      isInstalled,
      isStandalone,
      isOnline,
      canInstall: !!deferredPrompt,
      updateAvailable,
      registration
    };
  }, [isInstalled, isStandalone, isOnline, deferredPrompt, updateAvailable, registration]);

  // Share content (Web Share API)
  const shareContent = useCallback(async (shareData) => {
    if (!navigator.share) {
      console.warn('[PWA] Web Share API not supported');
      return false;
    }

    try {
      await navigator.share(shareData);
      
      // Track sharing
      if (window.gtag) {
        window.gtag('event', 'pwa_share', {
          event_category: 'PWA',
          event_label: shareData.title || 'Content Shared'
        });
      }
      
      return true;
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('[PWA] Share failed:', error);
      }
      return false;
    }
  }, []);

  // Add to home screen (for iOS)
  const addToHomeScreen = useCallback(() => {
    // This is mainly for iOS Safari
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isInStandaloneMode = window.navigator.standalone;
    
    if (isIOS && !isInStandaloneMode) {
      // Show instructions for iOS
      return {
        platform: 'ios',
        instructions: 'Tap the share button and select "Add to Home Screen"'
      };
    }
    
    return null;
  }, []);

  // Get network information
  const getNetworkInfo = useCallback(() => {
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
  }, []);

  // Initialize PWA functionality
  useEffect(() => {
    checkInstallStatus();
    registerServiceWorker();

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      console.log('[PWA] Install prompt available');
    };

    // Listen for app installed
    const handleAppInstalled = () => {
      console.log('[PWA] App installed');
      setIsInstalled(true);
      setDeferredPrompt(null);
      
      // Track installation
      if (window.gtag) {
        window.gtag('event', 'pwa_installed', {
          event_category: 'PWA',
          event_label: 'App Installed'
        });
      }
    };

    // Listen for online/offline events
    const handleOnline = () => {
      setIsOnline(true);
      console.log('[PWA] Online');
    };

    const handleOffline = () => {
      setIsOnline(false);
      console.log('[PWA] Offline');
    };

    // Listen for display mode changes
    const handleDisplayModeChange = (e) => {
      setIsStandalone(e.matches);
    };

    // Add event listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    mediaQuery.addListener(handleDisplayModeChange);

    // Cleanup
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      mediaQuery.removeListener(handleDisplayModeChange);
    };
  }, [checkInstallStatus, registerServiceWorker]);

  return {
    // State
    isInstalled,
    isStandalone,
    isOnline,
    canInstall: !!deferredPrompt,
    updateAvailable,
    
    // Actions
    installApp,
    updateApp,
    shareContent,
    addToHomeScreen,
    
    // Utilities
    getAppInfo,
    getNetworkInfo,
    checkInstallStatus
  };
};

export default usePWA;
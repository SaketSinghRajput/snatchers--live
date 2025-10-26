import React, { createContext, useContext, useEffect, useState } from 'react';
import usePWA from '../hooks/usePWA';
import { initOfflineStorage, isOfflineStorageSupported } from '../utils/offlineStorage';

const PWAContext = createContext();

export const usePWAContext = () => {
  const context = useContext(PWAContext);
  if (!context) {
    throw new Error('usePWAContext must be used within a PWAProvider');
  }
  return context;
};

export const PWAProvider = ({ children }) => {
  const pwa = usePWA();
  const [offlineStorageReady, setOfflineStorageReady] = useState(false);
  const [networkInfo, setNetworkInfo] = useState(null);
  const [installPromptShown, setInstallPromptShown] = useState(false);

  // Initialize offline storage
  useEffect(() => {
    const initStorage = async () => {
      if (isOfflineStorageSupported()) {
        try {
          await initOfflineStorage();
          setOfflineStorageReady(true);
          console.log('[PWA] Offline storage initialized');
        } catch (error) {
          console.error('[PWA] Failed to initialize offline storage:', error);
        }
      }
    };

    initStorage();
  }, []);

  // Monitor network information
  useEffect(() => {
    const updateNetworkInfo = () => {
      if ('connection' in navigator) {
        setNetworkInfo({
          effectiveType: navigator.connection.effectiveType,
          downlink: navigator.connection.downlink,
          rtt: navigator.connection.rtt,
          saveData: navigator.connection.saveData
        });
      }
    };

    updateNetworkInfo();

    if ('connection' in navigator) {
      navigator.connection.addEventListener('change', updateNetworkInfo);
      return () => {
        navigator.connection.removeEventListener('change', updateNetworkInfo);
      };
    }
  }, []);

  // Track PWA usage analytics
  useEffect(() => {
    if (pwa.isStandalone) {
      // Track standalone app usage
      if (window.gtag) {
        window.gtag('event', 'pwa_standalone_usage', {
          event_category: 'PWA',
          event_label: 'Standalone Mode',
          value: 1
        });
      }
    }
  }, [pwa.isStandalone]);

  // Enhanced install app function with analytics
  const installApp = async () => {
    const result = await pwa.installApp();
    
    if (result) {
      setInstallPromptShown(true);
      
      // Track successful installation
      if (window.gtag) {
        window.gtag('event', 'pwa_install_success', {
          event_category: 'PWA',
          event_label: 'Install Success',
          value: 1
        });
      }
    }
    
    return result;
  };

  // Enhanced share function
  const shareContent = async (shareData) => {
    const result = await pwa.shareContent(shareData);
    
    // Track sharing attempts
    if (window.gtag) {
      window.gtag('event', 'pwa_share_attempt', {
        event_category: 'PWA',
        event_label: result ? 'Success' : 'Failed',
        value: 1
      });
    }
    
    return result;
  };

  // Get adaptive loading configuration based on network
  const getAdaptiveConfig = () => {
    if (!networkInfo) {
      return {
        imageQuality: 80,
        enableLazyLoading: true,
        preloadCount: 5
      };
    }

    const { effectiveType, saveData } = networkInfo;

    if (saveData) {
      return {
        imageQuality: 40,
        enableLazyLoading: true,
        preloadCount: 2,
        enableWebP: true,
        enableAvif: false
      };
    }

    switch (effectiveType) {
      case 'slow-2g':
      case '2g':
        return {
          imageQuality: 30,
          enableLazyLoading: true,
          preloadCount: 1,
          enableWebP: true,
          enableAvif: false
        };
      case '3g':
        return {
          imageQuality: 60,
          enableLazyLoading: true,
          preloadCount: 3,
          enableWebP: true,
          enableAvif: false
        };
      case '4g':
        return {
          imageQuality: 90,
          enableLazyLoading: false,
          preloadCount: 8,
          enableWebP: true,
          enableAvif: true
        };
      default:
        return {
          imageQuality: 80,
          enableLazyLoading: true,
          preloadCount: 5,
          enableWebP: true,
          enableAvif: true
        };
    }
  };

  // Check if device is low-end
  const isLowEndDevice = () => {
    if ('deviceMemory' in navigator) {
      return navigator.deviceMemory <= 2; // 2GB or less
    }
    
    if ('hardwareConcurrency' in navigator) {
      return navigator.hardwareConcurrency <= 2; // 2 cores or less
    }
    
    // Fallback: check user agent for known low-end devices
    const userAgent = navigator.userAgent.toLowerCase();
    const lowEndPatterns = [
      'android 4',
      'android 5',
      'android 6',
      'iphone os 9',
      'iphone os 10'
    ];
    
    return lowEndPatterns.some(pattern => userAgent.includes(pattern));
  };

  // Get performance recommendations
  const getPerformanceRecommendations = () => {
    const recommendations = [];
    
    if (!pwa.isOnline) {
      recommendations.push({
        type: 'offline',
        message: 'You are offline. Some features may be limited.',
        action: 'Enable offline mode for better experience'
      });
    }
    
    if (networkInfo?.saveData) {
      recommendations.push({
        type: 'data-saver',
        message: 'Data saver mode detected.',
        action: 'Reduced image quality and limited preloading active'
      });
    }
    
    if (isLowEndDevice()) {
      recommendations.push({
        type: 'low-end-device',
        message: 'Low-end device detected.',
        action: 'Performance optimizations applied'
      });
    }
    
    if (pwa.canInstall && !installPromptShown) {
      recommendations.push({
        type: 'install',
        message: 'Install the app for better performance.',
        action: 'Add to home screen'
      });
    }
    
    return recommendations;
  };

  const contextValue = {
    // PWA state
    ...pwa,
    offlineStorageReady,
    networkInfo,
    installPromptShown,
    
    // Enhanced functions
    installApp,
    shareContent,
    
    // Utility functions
    getAdaptiveConfig,
    isLowEndDevice,
    getPerformanceRecommendations,
    
    // Feature flags
    features: {
      offlineStorage: offlineStorageReady,
      webShare: 'share' in navigator,
      backgroundSync: 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype,
      pushNotifications: 'serviceWorker' in navigator && 'PushManager' in window,
      installPrompt: pwa.canInstall,
      networkInfo: 'connection' in navigator
    }
  };

  return (
    <PWAContext.Provider value={contextValue}>
      {children}
    </PWAContext.Provider>
  );
};

export default PWAContext;
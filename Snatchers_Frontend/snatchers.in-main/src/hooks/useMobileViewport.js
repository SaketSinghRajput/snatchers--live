import { useState, useEffect } from 'react';

const useMobileViewport = () => {
  const [viewport, setViewport] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
    isMobile: typeof window !== 'undefined' ? window.innerWidth < 768 : false,
    isTablet: typeof window !== 'undefined' ? window.innerWidth >= 768 && window.innerWidth < 1024 : false,
    isDesktop: typeof window !== 'undefined' ? window.innerWidth >= 1024 : false,
    orientation: typeof window !== 'undefined' ? 
      (window.innerWidth > window.innerHeight ? 'landscape' : 'portrait') : 'portrait',
    isPortrait: typeof window !== 'undefined' ? window.innerHeight > window.innerWidth : true,
    isLandscape: typeof window !== 'undefined' ? window.innerWidth > window.innerHeight : false,
    devicePixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
    isRetina: typeof window !== 'undefined' ? (window.devicePixelRatio || 1) > 1 : false,
    safeAreaInsets: {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0
    }
  });

  useEffect(() => {
    const updateViewport = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const devicePixelRatio = window.devicePixelRatio || 1;

      // Get safe area insets (for devices with notches, etc.)
      const computedStyle = getComputedStyle(document.documentElement);
      const safeAreaInsets = {
        top: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-top)')) || 0,
        right: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-right)')) || 0,
        bottom: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-bottom)')) || 0,
        left: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-left)')) || 0
      };

      setViewport({
        width,
        height,
        isMobile: width < 768,
        isTablet: width >= 768 && width < 1024,
        isDesktop: width >= 1024,
        orientation: width > height ? 'landscape' : 'portrait',
        isPortrait: height > width,
        isLandscape: width > height,
        devicePixelRatio,
        isRetina: devicePixelRatio > 1,
        safeAreaInsets
      });
    };

    // Initial update
    updateViewport();

    // Listen for resize events
    window.addEventListener('resize', updateViewport);
    window.addEventListener('orientationchange', updateViewport);

    // Listen for viewport changes (iOS Safari address bar)
    if ('visualViewport' in window) {
      window.visualViewport.addEventListener('resize', updateViewport);
    }

    return () => {
      window.removeEventListener('resize', updateViewport);
      window.removeEventListener('orientationchange', updateViewport);
      
      if ('visualViewport' in window) {
        window.visualViewport.removeEventListener('resize', updateViewport);
      }
    };
  }, []);

  // Helper functions
  const isBreakpoint = (breakpoint) => {
    switch (breakpoint) {
      case 'xs':
        return viewport.width >= 375;
      case 'sm':
        return viewport.width >= 640;
      case 'md':
        return viewport.width >= 768;
      case 'lg':
        return viewport.width >= 1024;
      case 'xl':
        return viewport.width >= 1280;
      case '2xl':
        return viewport.width >= 1536;
      default:
        return false;
    }
  };

  const isBetween = (min, max) => {
    return viewport.width >= min && viewport.width <= max;
  };

  const getColumns = (mobile = 2, tablet = 3, desktop = 4) => {
    if (viewport.isMobile) return mobile;
    if (viewport.isTablet) return tablet;
    return desktop;
  };

  const getSpacing = (mobile = 4, tablet = 6, desktop = 8) => {
    if (viewport.isMobile) return mobile;
    if (viewport.isTablet) return tablet;
    return desktop;
  };

  const getFontSize = (mobile = 'sm', tablet = 'base', desktop = 'lg') => {
    if (viewport.isMobile) return mobile;
    if (viewport.isTablet) return tablet;
    return desktop;
  };

  // Touch device detection
  const isTouchDevice = () => {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  };

  // iOS detection
  const isIOS = () => {
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  };

  // Android detection
  const isAndroid = () => {
    return /Android/.test(navigator.userAgent);
  };

  // PWA detection
  const isPWA = () => {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone === true;
  };

  // Network information (if available)
  const getNetworkInfo = () => {
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

  return {
    ...viewport,
    isBreakpoint,
    isBetween,
    getColumns,
    getSpacing,
    getFontSize,
    isTouchDevice: isTouchDevice(),
    isIOS: isIOS(),
    isAndroid: isAndroid(),
    isPWA: isPWA(),
    networkInfo: getNetworkInfo()
  };
};

export default useMobileViewport;
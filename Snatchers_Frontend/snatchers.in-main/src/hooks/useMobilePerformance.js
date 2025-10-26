import { useEffect, useState, useCallback } from 'react';
import useMobileViewport from './useMobileViewport';

const useMobilePerformance = () => {
  const [metrics, setMetrics] = useState({
    // Core Web Vitals
    lcp: null, // Largest Contentful Paint
    fid: null, // First Input Delay
    cls: null, // Cumulative Layout Shift
    fcp: null, // First Contentful Paint
    ttfb: null, // Time to First Byte
    
    // Mobile-specific metrics
    memoryUsage: null,
    batteryLevel: null,
    networkSpeed: null,
    devicePixelRatio: null,
    
    // Performance scores
    performanceScore: null,
    recommendations: []
  });

  const [isLowEndDevice, setIsLowEndDevice] = useState(false);
  const { isMobile, networkInfo } = useMobileViewport();

  // Detect low-end devices
  useEffect(() => {
    const detectLowEndDevice = () => {
      const hardwareConcurrency = navigator.hardwareConcurrency || 1;
      const memory = navigator.deviceMemory || 1;
      const connection = navigator.connection;
      
      // Consider device low-end if:
      // - Less than 4 CPU cores
      // - Less than 2GB RAM
      // - Slow network connection
      const isLowEnd = (
        hardwareConcurrency < 4 ||
        memory < 2 ||
        (connection && (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g'))
      );
      
      setIsLowEndDevice(isLowEnd);
    };

    detectLowEndDevice();
  }, []);

  // Measure Core Web Vitals
  const measureWebVitals = useCallback(() => {
    // Largest Contentful Paint
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          setMetrics(prev => ({ ...prev, lcp: lastEntry.startTime }));
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

        // First Contentful Paint
        const fcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
          if (fcpEntry) {
            setMetrics(prev => ({ ...prev, fcp: fcpEntry.startTime }));
          }
        });
        fcpObserver.observe({ entryTypes: ['paint'] });

        // Cumulative Layout Shift
        const clsObserver = new PerformanceObserver((list) => {
          let clsValue = 0;
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          }
          setMetrics(prev => ({ ...prev, cls: clsValue }));
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });

        // First Input Delay
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const firstEntry = entries[0];
          setMetrics(prev => ({ ...prev, fid: firstEntry.processingStart - firstEntry.startTime }));
        });
        fidObserver.observe({ entryTypes: ['first-input'] });

      } catch (error) {
        console.warn('Performance observation failed:', error);
      }
    }

    // Time to First Byte
    if (performance.timing) {
      const ttfb = performance.timing.responseStart - performance.timing.navigationStart;
      setMetrics(prev => ({ ...prev, ttfb }));
    }
  }, []);

  // Measure memory usage
  const measureMemoryUsage = useCallback(() => {
    if ('memory' in performance) {
      const memory = performance.memory;
      setMetrics(prev => ({
        ...prev,
        memoryUsage: {
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize,
          limit: memory.jsHeapSizeLimit,
          percentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
        }
      }));
    }
  }, []);

  // Measure battery level
  const measureBatteryLevel = useCallback(async () => {
    if ('getBattery' in navigator) {
      try {
        const battery = await navigator.getBattery();
        setMetrics(prev => ({
          ...prev,
          batteryLevel: {
            level: battery.level,
            charging: battery.charging,
            chargingTime: battery.chargingTime,
            dischargingTime: battery.dischargingTime
          }
        }));
      } catch (error) {
        console.warn('Battery API not available:', error);
      }
    }
  }, []);

  // Calculate performance score
  const calculatePerformanceScore = useCallback(() => {
    const { lcp, fid, cls, fcp, ttfb } = metrics;
    
    if (!lcp || !fcp) return;

    let score = 100;
    const recommendations = [];

    // LCP scoring (target: < 2.5s)
    if (lcp > 4000) {
      score -= 30;
      recommendations.push('Optimize Largest Contentful Paint (LCP) - consider image optimization and lazy loading');
    } else if (lcp > 2500) {
      score -= 15;
      recommendations.push('Improve Largest Contentful Paint (LCP) - optimize critical resources');
    }

    // FID scoring (target: < 100ms)
    if (fid > 300) {
      score -= 25;
      recommendations.push('Reduce First Input Delay (FID) - minimize JavaScript execution time');
    } else if (fid > 100) {
      score -= 10;
      recommendations.push('Optimize First Input Delay (FID) - consider code splitting');
    }

    // CLS scoring (target: < 0.1)
    if (cls > 0.25) {
      score -= 20;
      recommendations.push('Fix Cumulative Layout Shift (CLS) - reserve space for dynamic content');
    } else if (cls > 0.1) {
      score -= 10;
      recommendations.push('Improve Cumulative Layout Shift (CLS) - optimize image and ad loading');
    }

    // FCP scoring (target: < 1.8s)
    if (fcp > 3000) {
      score -= 15;
      recommendations.push('Optimize First Contentful Paint (FCP) - reduce render-blocking resources');
    } else if (fcp > 1800) {
      score -= 8;
      recommendations.push('Improve First Contentful Paint (FCP) - optimize critical CSS');
    }

    // TTFB scoring (target: < 600ms)
    if (ttfb > 1500) {
      score -= 10;
      recommendations.push('Reduce Time to First Byte (TTFB) - optimize server response time');
    } else if (ttfb > 600) {
      score -= 5;
      recommendations.push('Improve Time to First Byte (TTFB) - consider CDN or caching');
    }

    // Mobile-specific penalties
    if (isMobile) {
      if (isLowEndDevice) {
        recommendations.push('Detected low-end device - consider reducing JavaScript bundle size');
      }
      
      if (networkInfo?.effectiveType === 'slow-2g' || networkInfo?.effectiveType === '2g') {
        recommendations.push('Slow network detected - enable aggressive caching and compression');
      }
    }

    setMetrics(prev => ({
      ...prev,
      performanceScore: Math.max(0, score),
      recommendations
    }));
  }, [metrics.lcp, metrics.fid, metrics.cls, metrics.fcp, metrics.ttfb, isMobile, isLowEndDevice, networkInfo]);

  // Get performance recommendations
  const getRecommendations = useCallback(() => {
    const recommendations = [];

    if (isLowEndDevice) {
      recommendations.push({
        type: 'device',
        priority: 'high',
        message: 'Low-end device detected',
        actions: [
          'Reduce JavaScript bundle size',
          'Enable lazy loading for images',
          'Use lighter animations',
          'Minimize DOM complexity'
        ]
      });
    }

    if (networkInfo?.saveData) {
      recommendations.push({
        type: 'network',
        priority: 'high',
        message: 'Data saver mode enabled',
        actions: [
          'Serve lower quality images',
          'Disable auto-playing videos',
          'Reduce network requests',
          'Enable aggressive compression'
        ]
      });
    }

    if (metrics.memoryUsage?.percentage > 80) {
      recommendations.push({
        type: 'memory',
        priority: 'medium',
        message: 'High memory usage detected',
        actions: [
          'Clear unused components from memory',
          'Optimize image caching',
          'Reduce concurrent operations',
          'Implement virtual scrolling'
        ]
      });
    }

    if (metrics.batteryLevel?.level < 0.2 && !metrics.batteryLevel?.charging) {
      recommendations.push({
        type: 'battery',
        priority: 'medium',
        message: 'Low battery detected',
        actions: [
          'Reduce animation frequency',
          'Minimize background tasks',
          'Reduce screen brightness effects',
          'Defer non-critical operations'
        ]
      });
    }

    return recommendations;
  }, [isLowEndDevice, networkInfo, metrics.memoryUsage, metrics.batteryLevel]);

  // Initialize measurements
  useEffect(() => {
    measureWebVitals();
    measureMemoryUsage();
    measureBatteryLevel();

    // Set up periodic measurements
    const memoryInterval = setInterval(measureMemoryUsage, 30000); // Every 30 seconds
    const batteryInterval = setInterval(measureBatteryLevel, 60000); // Every minute

    return () => {
      clearInterval(memoryInterval);
      clearInterval(batteryInterval);
    };
  }, [measureWebVitals, measureMemoryUsage, measureBatteryLevel]);

  // Calculate performance score when metrics change
  useEffect(() => {
    calculatePerformanceScore();
  }, [calculatePerformanceScore]);

  // Performance optimization utilities
  const optimizeForDevice = useCallback(() => {
    const optimizations = {
      reduceAnimations: isLowEndDevice,
      enableDataSaver: networkInfo?.saveData || networkInfo?.effectiveType === 'slow-2g',
      aggressiveCaching: networkInfo?.effectiveType === '2g' || networkInfo?.effectiveType === 'slow-2g',
      reducedQuality: isLowEndDevice || networkInfo?.saveData,
      batteryOptimization: metrics.batteryLevel?.level < 0.3
    };

    return optimizations;
  }, [isLowEndDevice, networkInfo, metrics.batteryLevel]);

  // Check if device should use performance mode
  const shouldUsePerformanceMode = useCallback(() => {
    return (
      isLowEndDevice ||
      (metrics.memoryUsage?.percentage > 70) ||
      (metrics.batteryLevel?.level < 0.2 && !metrics.batteryLevel?.charging) ||
      (networkInfo?.effectiveType === 'slow-2g' || networkInfo?.effectiveType === '2g')
    );
  }, [isLowEndDevice, metrics.memoryUsage, metrics.batteryLevel, networkInfo]);

  return {
    metrics,
    isLowEndDevice,
    recommendations: getRecommendations(),
    optimizeForDevice,
    shouldUsePerformanceMode: shouldUsePerformanceMode(),
    
    // Utility functions
    measureNow: () => {
      measureWebVitals();
      measureMemoryUsage();
      measureBatteryLevel();
    },
    
    // Performance helpers
    getOptimalImageQuality: () => {
      if (networkInfo?.saveData || isLowEndDevice) return 60;
      if (networkInfo?.effectiveType === '2g' || networkInfo?.effectiveType === 'slow-2g') return 70;
      if (networkInfo?.effectiveType === '3g') return 80;
      return 85;
    },
    
    getOptimalChunkSize: () => {
      if (isLowEndDevice) return 10; // Smaller chunks for low-end devices
      if (isMobile) return 20;
      return 50;
    },
    
    shouldPreload: (priority = 'low') => {
      if (networkInfo?.saveData) return false;
      if (priority === 'high') return true;
      if (isLowEndDevice && priority === 'medium') return false;
      return !shouldUsePerformanceMode();
    }
  };
};

export default useMobilePerformance;
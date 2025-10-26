import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import usePerformanceMonitoring from '../hooks/usePerformanceMonitoring';
import { registerServiceWorker } from '../utils/performanceUtils';

const PerformanceMonitor = ({ 
  enableServiceWorker = true,
  enableAnalytics = false,
  onMetric = null,
  children 
}) => {
  const { getMetrics, getPerformanceScore, reportMetric } = usePerformanceMonitoring({
    onMetric: (metric) => {
      // Send to analytics if enabled
      if (enableAnalytics && window.gtag) {
        window.gtag('event', 'web_vitals', {
          event_category: 'Performance',
          event_label: metric.name,
          value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
          custom_map: {
            metric_name: metric.name,
            metric_value: metric.value,
            metric_rating: getMetricRating(metric)
          }
        });
      }
      
      // Call custom callback
      if (onMetric) {
        onMetric(metric);
      }
    },
    reportToAnalytics: enableAnalytics
  });

  // Register service worker for performance optimization (disabled in development)
  useEffect(() => {
    if (!enableServiceWorker || !('serviceWorker' in navigator)) return;

    // In development, ensure SW stays unregistered to avoid stale caches and dev surprises
    if (process.env.NODE_ENV !== 'production') {
      (async () => {
        try {
          const regs = await navigator.serviceWorker.getRegistrations();
          if (regs.length) {
            await Promise.all(regs.map(r => r.unregister()));
            console.log('[PerformanceMonitor] Unregistered service workers in development');
          }
        } catch (e) {
          console.warn('[PerformanceMonitor] Failed to unregister SW in dev:', e?.message || e);
        }
      })();
      return; // do not register in dev
    }

    registerServiceWorker('/sw.js', { scope: '/' })
      .then((registration) => {
        console.log('Service Worker registered for performance optimization');

        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New content is available, prompt user to refresh
              if (window.confirm('New version available! Refresh to update?')) {
                // Ask the waiting worker to activate immediately
                try { registration.waiting?.postMessage({ type: 'SKIP_WAITING' }); } catch {}
                window.location.reload();
              }
            }
          });
        });
      })
      .catch((error) => {
        console.warn('Service Worker registration failed:', error);
      });
  }, [enableServiceWorker]);

  // Monitor performance budget
  useEffect(() => {
    const checkBudget = () => {
      const metrics = getMetrics();
      const score = getPerformanceScore();
      
      // Log performance warnings in development
      if (process.env.NODE_ENV === 'development') {
        if (score < 50) {
          console.warn('⚠️ Performance Score Low:', score, metrics);
        }
        
        // Check specific thresholds
        if (metrics.LCP && metrics.LCP.value > 4000) {
          console.warn('⚠️ LCP exceeds 4s:', metrics.LCP.value);
        }
        
        if (metrics.FID && metrics.FID.value > 300) {
          console.warn('⚠️ FID exceeds 300ms:', metrics.FID.value);
        }
        
        if (metrics.CLS && metrics.CLS.value > 0.25) {
          console.warn('⚠️ CLS exceeds 0.25:', metrics.CLS.value);
        }
      }
    };
    
    // Check budget after page load
    const timer = setTimeout(checkBudget, 5000);
    return () => clearTimeout(timer);
  }, [getMetrics, getPerformanceScore]);

  // Add performance observer for resource timing
  useEffect(() => {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          // Monitor large resources
          if (entry.transferSize > 100000) { // > 100KB
            console.warn('Large resource detected:', {
              name: entry.name,
              size: entry.transferSize,
              duration: entry.duration
            });
          }
          
          // Monitor slow resources
          if (entry.duration > 1000) { // > 1s
            console.warn('Slow resource detected:', {
              name: entry.name,
              duration: entry.duration
            });
          }
        });
      });
      
      observer.observe({ entryTypes: ['resource'] });
      
      return () => observer.disconnect();
    }
  }, []);

  // Monitor memory usage
  useEffect(() => {
    if ('memory' in performance) {
      const checkMemory = () => {
        const memory = performance.memory;
        const usagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
        
        if (usagePercent > 80) {
          console.warn('⚠️ High memory usage:', {
            used: Math.round(memory.usedJSHeapSize / 1048576) + 'MB',
            total: Math.round(memory.totalJSHeapSize / 1048576) + 'MB',
            limit: Math.round(memory.jsHeapSizeLimit / 1048576) + 'MB',
            percentage: Math.round(usagePercent) + '%'
          });
        }
      };
      
      const interval = setInterval(checkMemory, 30000); // Check every 30s
      return () => clearInterval(interval);
    }
  }, []);

  return <>{children}</>;
};

// Helper function to get metric rating
const getMetricRating = (metric) => {
  switch (metric.name) {
    case 'LCP':
      return metric.value <= 2500 ? 'good' : metric.value <= 4000 ? 'needs-improvement' : 'poor';
    case 'FID':
      return metric.value <= 100 ? 'good' : metric.value <= 300 ? 'needs-improvement' : 'poor';
    case 'CLS':
      return metric.value <= 0.1 ? 'good' : metric.value <= 0.25 ? 'needs-improvement' : 'poor';
    case 'FCP':
      return metric.value <= 1800 ? 'good' : metric.value <= 3000 ? 'needs-improvement' : 'poor';
    case 'TTFB':
      return metric.value <= 800 ? 'good' : metric.value <= 1800 ? 'needs-improvement' : 'poor';
    default:
      return 'unknown';
  }
};

PerformanceMonitor.propTypes = {
  enableServiceWorker: PropTypes.bool,
  enableAnalytics: PropTypes.bool,
  onMetric: PropTypes.func,
  children: PropTypes.node
};

export default PerformanceMonitor;
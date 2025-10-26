import { useEffect, useCallback, useRef } from 'react';

const usePerformanceMonitoring = (options = {}) => {
  const {
    enableCLS = true,
    enableFID = true,
    enableFCP = true,
    enableLCP = true,
    enableTTFB = true,
    onMetric = null,
    reportToAnalytics = false
  } = options;

  const metricsRef = useRef({});
  const observersRef = useRef([]);

  // Report metric to analytics or callback
  const reportMetric = useCallback((metric) => {
    metricsRef.current[metric.name] = metric;
    
    if (onMetric) {
      onMetric(metric);
    }
    
    if (reportToAnalytics && window.gtag) {
      window.gtag('event', metric.name, {
        event_category: 'Web Vitals',
        event_label: metric.id,
        value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
        non_interaction: true
      });
    }
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${metric.name}:`, metric.value, metric);
    }
  }, [onMetric, reportToAnalytics]);

  // Measure Cumulative Layout Shift (CLS)
  const measureCLS = useCallback(() => {
    if (!enableCLS || !window.PerformanceObserver) return;

    let clsValue = 0;
    let clsEntries = [];
    let sessionValue = 0;
    let sessionEntries = [];

    const observer = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        // Only count layout shifts without recent user input
        if (!entry.hadRecentInput) {
          const firstSessionEntry = sessionEntries[0];
          const lastSessionEntry = sessionEntries[sessionEntries.length - 1];

          // If the entry occurred less than 1 second after the previous entry and
          // less than 5 seconds after the first entry in the session, include it
          if (sessionValue &&
              entry.startTime - lastSessionEntry.startTime < 1000 &&
              entry.startTime - firstSessionEntry.startTime < 5000) {
            sessionValue += entry.value;
            sessionEntries.push(entry);
          } else {
            sessionValue = entry.value;
            sessionEntries = [entry];
          }

          // If the current session value is larger than the current CLS value,
          // update CLS and the entries contributing to it
          if (sessionValue > clsValue) {
            clsValue = sessionValue;
            clsEntries = [...sessionEntries];

            reportMetric({
              name: 'CLS',
              value: clsValue,
              id: 'cls',
              entries: clsEntries
            });
          }
        }
      }
    });

    observer.observe({ type: 'layout-shift', buffered: true });
    observersRef.current.push(observer);
  }, [enableCLS, reportMetric]);

  // Measure First Input Delay (FID)
  const measureFID = useCallback(() => {
    if (!enableFID || !window.PerformanceObserver) return;

    const observer = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        reportMetric({
          name: 'FID',
          value: entry.processingStart - entry.startTime,
          id: 'fid',
          entries: [entry]
        });
      }
    });

    observer.observe({ type: 'first-input', buffered: true });
    observersRef.current.push(observer);
  }, [enableFID, reportMetric]);

  // Measure First Contentful Paint (FCP)
  const measureFCP = useCallback(() => {
    if (!enableFCP || !window.PerformanceObserver) return;

    const observer = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          reportMetric({
            name: 'FCP',
            value: entry.startTime,
            id: 'fcp',
            entries: [entry]
          });
        }
      }
    });

    observer.observe({ type: 'paint', buffered: true });
    observersRef.current.push(observer);
  }, [enableFCP, reportMetric]);

  // Measure Largest Contentful Paint (LCP)
  const measureLCP = useCallback(() => {
    if (!enableLCP || !window.PerformanceObserver) return;

    const observer = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1];
      
      reportMetric({
        name: 'LCP',
        value: lastEntry.startTime,
        id: 'lcp',
        entries: [lastEntry]
      });
    });

    observer.observe({ type: 'largest-contentful-paint', buffered: true });
    observersRef.current.push(observer);
  }, [enableLCP, reportMetric]);

  // Measure Time to First Byte (TTFB)
  const measureTTFB = useCallback(() => {
    if (!enableTTFB) return;

    // Use Navigation Timing API
    const navigationEntry = performance.getEntriesByType('navigation')[0];
    if (navigationEntry) {
      const ttfb = navigationEntry.responseStart - navigationEntry.requestStart;
      reportMetric({
        name: 'TTFB',
        value: ttfb,
        id: 'ttfb',
        entries: [navigationEntry]
      });
    }
  }, [enableTTFB, reportMetric]);

  // Measure additional performance metrics
  const measureAdditionalMetrics = useCallback(() => {
    // DOM Content Loaded
    const domContentLoaded = performance.getEntriesByType('navigation')[0]?.domContentLoadedEventEnd;
    if (domContentLoaded) {
      reportMetric({
        name: 'DCL',
        value: domContentLoaded,
        id: 'dcl'
      });
    }

    // Load Event
    const loadEvent = performance.getEntriesByType('navigation')[0]?.loadEventEnd;
    if (loadEvent) {
      reportMetric({
        name: 'Load',
        value: loadEvent,
        id: 'load'
      });
    }
  }, [reportMetric]);

  // Initialize performance monitoring
  useEffect(() => {
    // Wait for page to be fully loaded
    if (document.readyState === 'complete') {
      measureCLS();
      measureFID();
      measureFCP();
      measureLCP();
      measureTTFB();
      measureAdditionalMetrics();
    } else {
      const handleLoad = () => {
        measureCLS();
        measureFID();
        measureFCP();
        measureLCP();
        measureTTFB();
        measureAdditionalMetrics();
      };

      window.addEventListener('load', handleLoad);
      return () => window.removeEventListener('load', handleLoad);
    }

    // Cleanup observers
    return () => {
      observersRef.current.forEach(observer => {
        if (observer && observer.disconnect) {
          observer.disconnect();
        }
      });
      observersRef.current = [];
    };
  }, [measureCLS, measureFID, measureFCP, measureLCP, measureTTFB, measureAdditionalMetrics]);

  // Get current metrics
  const getMetrics = useCallback(() => {
    return { ...metricsRef.current };
  }, []);

  // Get performance score based on Core Web Vitals
  const getPerformanceScore = useCallback(() => {
    const metrics = metricsRef.current;
    let score = 0;
    let count = 0;

    // LCP scoring (Good: ≤2.5s, Needs Improvement: ≤4s, Poor: >4s)
    if (metrics.LCP) {
      if (metrics.LCP.value <= 2500) score += 100;
      else if (metrics.LCP.value <= 4000) score += 50;
      else score += 0;
      count++;
    }

    // FID scoring (Good: ≤100ms, Needs Improvement: ≤300ms, Poor: >300ms)
    if (metrics.FID) {
      if (metrics.FID.value <= 100) score += 100;
      else if (metrics.FID.value <= 300) score += 50;
      else score += 0;
      count++;
    }

    // CLS scoring (Good: ≤0.1, Needs Improvement: ≤0.25, Poor: >0.25)
    if (metrics.CLS) {
      if (metrics.CLS.value <= 0.1) score += 100;
      else if (metrics.CLS.value <= 0.25) score += 50;
      else score += 0;
      count++;
    }

    return count > 0 ? Math.round(score / count) : 0;
  }, []);

  return {
    getMetrics,
    getPerformanceScore,
    reportMetric
  };
};

export default usePerformanceMonitoring;
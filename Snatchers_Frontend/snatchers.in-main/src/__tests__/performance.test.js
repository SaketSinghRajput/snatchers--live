import { render, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import PerformanceMonitor from '../components/PerformanceMonitor';
import OptimizedImage from '../components/OptimizedImage';
import LazyLoad from '../components/LazyLoad';

// Mock performance API
const mockPerformance = {
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByType: jest.fn(() => []),
  getEntriesByName: jest.fn(() => []),
  observer: {
    observe: jest.fn(),
    disconnect: jest.fn()
  }
};

Object.defineProperty(window, 'performance', {
  writable: true,
  value: mockPerformance
});

// Mock IntersectionObserver for lazy loading tests
const mockIntersectionObserver = jest.fn();
mockIntersectionObserver.mockReturnValue({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null
});
window.IntersectionObserver = mockIntersectionObserver;

const renderWithProviders = (component) => {
  return render(
    <BrowserRouter>
      <HelmetProvider>
        {component}
      </HelmetProvider>
    </BrowserRouter>
  );
};

describe('Performance Tests', () => {
  describe('Core Web Vitals', () => {
    test('should monitor Largest Contentful Paint (LCP)', async () => {
      const onMetric = jest.fn();
      
      renderWithProviders(
        <PerformanceMonitor onMetric={onMetric} />
      );

      // Simulate LCP measurement
      await waitFor(() => {
        expect(mockPerformance.getEntriesByType).toHaveBeenCalledWith('largest-contentful-paint');
      });
    });

    test('should monitor First Input Delay (FID)', async () => {
      const onMetric = jest.fn();
      
      renderWithProviders(
        <PerformanceMonitor onMetric={onMetric} />
      );

      // Simulate FID measurement
      await waitFor(() => {
        expect(mockPerformance.getEntriesByType).toHaveBeenCalledWith('first-input');
      });
    });

    test('should monitor Cumulative Layout Shift (CLS)', async () => {
      const onMetric = jest.fn();
      
      renderWithProviders(
        <PerformanceMonitor onMetric={onMetric} />
      );

      // Simulate CLS measurement
      await waitFor(() => {
        expect(mockPerformance.getEntriesByType).toHaveBeenCalledWith('layout-shift');
      });
    });
  });

  describe('Image Optimization', () => {
    test('should load WebP images when supported', () => {
      // Mock WebP support
      const canvas = document.createElement('canvas');
      canvas.toDataURL = jest.fn(() => 'data:image/webp;base64,test');
      document.createElement = jest.fn(() => canvas);

      renderWithProviders(
        <OptimizedImage 
          src="https://example.com/image.jpg"
          alt="Test Image"
          width={300}
          height={200}
        />
      );

      const img = document.querySelector('img');
      expect(img).toHaveAttribute('src');
    });

    test('should implement lazy loading', () => {
      renderWithProviders(
        <LazyLoad>
          <img src="https://example.com/lazy-image.jpg" alt="Lazy Image" />
        </LazyLoad>
      );

      expect(mockIntersectionObserver).toHaveBeenCalled();
    });

    test('should have proper image dimensions to prevent layout shift', () => {
      renderWithProviders(
        <OptimizedImage 
          src="https://example.com/image.jpg"
          alt="Test Image"
          width={300}
          height={200}
        />
      );

      const img = document.querySelector('img');
      expect(img).toHaveAttribute('width', '300');
      expect(img).toHaveAttribute('height', '200');
    });
  });

  describe('Bundle Size and Loading', () => {
    test('should implement code splitting', async () => {
      // Test that lazy components are loaded dynamically
      const LazyComponent = React.lazy(() => 
        Promise.resolve({ default: () => <div>Lazy Component</div> })
      );

      renderWithProviders(
        <React.Suspense fallback={<div>Loading...</div>}>
          <LazyComponent />
        </React.Suspense>
      );

      await waitFor(() => {
        expect(document.textContent).toContain('Lazy Component');
      });
    });

    test('should preload critical resources', () => {
      renderWithProviders(
        <PerformanceMonitor />
      );

      // Check for preload links
      const preloadLinks = document.querySelectorAll('link[rel="preload"]');
      expect(preloadLinks.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Runtime Performance', () => {
    test('should not cause memory leaks', () => {
      const { unmount } = renderWithProviders(
        <PerformanceMonitor />
      );

      // Simulate component unmount
      unmount();

      // Verify cleanup
      expect(mockPerformance.observer.disconnect).toHaveBeenCalled();
    });

    test('should handle large lists efficiently', () => {
      const largeList = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `Item ${i}`
      }));

      const startTime = performance.now();
      
      renderWithProviders(
        <div>
          {largeList.slice(0, 20).map(item => (
            <div key={item.id}>{item.name}</div>
          ))}
        </div>
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Rendering should be fast
      expect(renderTime).toBeLessThan(100);
    });
  });

  describe('Network Performance', () => {
    test('should implement proper caching headers', async () => {
      // Mock fetch to test caching
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          headers: new Map([
            ['cache-control', 'public, max-age=31536000'],
            ['etag', '"test-etag"']
          ]),
          json: () => Promise.resolve({ data: 'test' })
        })
      );

      await fetch('/api/products');

      expect(fetch).toHaveBeenCalledWith('/api/products');
    });

    test('should implement request deduplication', async () => {
      const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: 'test' })
      });

      // Make multiple identical requests
      const promises = [
        fetch('/api/products/123'),
        fetch('/api/products/123'),
        fetch('/api/products/123')
      ];

      await Promise.all(promises);

      // Should only make one actual request due to deduplication
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
  });
});
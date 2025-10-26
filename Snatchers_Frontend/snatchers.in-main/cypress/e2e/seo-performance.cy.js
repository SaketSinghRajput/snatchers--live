describe('SEO and Performance E2E Tests', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  describe('SEO Validation', () => {
    it('should have proper meta tags on homepage', () => {
      cy.get('head title').should('exist').and('not.be.empty');
      cy.get('head meta[name="description"]').should('exist').and('have.attr', 'content').and('not.be.empty');
      cy.get('head meta[name="keywords"]').should('exist');
      cy.get('head link[rel="canonical"]').should('exist');
    });

    it('should have proper Open Graph tags', () => {
      cy.get('head meta[property="og:title"]').should('exist');
      cy.get('head meta[property="og:description"]').should('exist');
      cy.get('head meta[property="og:image"]').should('exist');
      cy.get('head meta[property="og:url"]').should('exist');
      cy.get('head meta[property="og:type"]').should('exist');
    });

    it('should have proper Twitter Card tags', () => {
      cy.get('head meta[name="twitter:card"]').should('exist');
      cy.get('head meta[name="twitter:title"]').should('exist');
      cy.get('head meta[name="twitter:description"]').should('exist');
      cy.get('head meta[name="twitter:image"]').should('exist');
    });

    it('should have structured data on product pages', () => {
      cy.visit('/product/test-product');
      
      cy.get('script[type="application/ld+json"]').should('exist').then(($script) => {
        const structuredData = JSON.parse($script.text());
        expect(structuredData).to.have.property('@context', 'https://schema.org');
        expect(structuredData).to.have.property('@type', 'Product');
        expect(structuredData).to.have.property('name');
        expect(structuredData).to.have.property('description');
        expect(structuredData).to.have.property('offers');
      });
    });

    it('should have breadcrumb structured data', () => {
      cy.visit('/category/electronics/laptops');
      
      cy.get('script[type="application/ld+json"]').should('exist').then(($scripts) => {
        const breadcrumbScript = Array.from($scripts).find(script => {
          const data = JSON.parse(script.textContent);
          return data['@type'] === 'BreadcrumbList';
        });
        
        expect(breadcrumbScript).to.exist;
        const breadcrumbData = JSON.parse(breadcrumbScript.textContent);
        expect(breadcrumbData).to.have.property('itemListElement');
        expect(breadcrumbData.itemListElement).to.be.an('array');
      });
    });

    it('should have proper heading hierarchy', () => {
      cy.get('h1').should('have.length', 1);
      cy.get('h1').should('be.visible');
      
      // Check that headings follow proper hierarchy
      cy.get('h1, h2, h3, h4, h5, h6').then(($headings) => {
        let previousLevel = 0;
        $headings.each((index, heading) => {
          const currentLevel = parseInt(heading.tagName.charAt(1));
          if (previousLevel > 0) {
            expect(currentLevel).to.be.at.most(previousLevel + 1);
          }
          previousLevel = currentLevel;
        });
      });
    });

    it('should have proper alt text for images', () => {
      cy.get('img').each(($img) => {
        cy.wrap($img).should('have.attr', 'alt').and('not.be.empty');
      });
    });

    it('should generate XML sitemap', () => {
      cy.request('/sitemap.xml').then((response) => {
        expect(response.status).to.eq(200);
        expect(response.headers['content-type']).to.include('xml');
        expect(response.body).to.include('<urlset');
        expect(response.body).to.include('<url>');
      });
    });

    it('should have robots.txt', () => {
      cy.request('/robots.txt').then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.include('User-agent');
        expect(response.body).to.include('Sitemap');
      });
    });
  });

  describe('Performance Tests', () => {
    it('should load within acceptable time', () => {
      cy.visit('/', {
        onBeforeLoad: (win) => {
          win.performance.mark('start');
        },
        onLoad: (win) => {
          win.performance.mark('end');
          win.performance.measure('pageLoad', 'start', 'end');
          const measure = win.performance.getEntriesByName('pageLoad')[0];
          expect(measure.duration).to.be.lessThan(3000); // 3 seconds
        }
      });
    });

    it('should have good Core Web Vitals', () => {
      cy.visit('/');
      
      // Test Largest Contentful Paint (LCP)
      cy.window().then((win) => {
        return new Promise((resolve) => {
          new win.PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lcp = entries[entries.length - 1];
            expect(lcp.startTime).to.be.lessThan(2500); // Good LCP < 2.5s
            resolve();
          }).observe({ entryTypes: ['largest-contentful-paint'] });
        });
      });
    });

    it('should implement lazy loading for images', () => {
      cy.visit('/');
      
      // Check that images below the fold have loading="lazy"
      cy.get('img').each(($img) => {
        const rect = $img[0].getBoundingClientRect();
        if (rect.top > window.innerHeight) {
          cy.wrap($img).should('have.attr', 'loading', 'lazy');
        }
      });
    });

    it('should preload critical resources', () => {
      cy.visit('/');
      
      cy.get('head link[rel="preload"]').should('exist');
      cy.get('head link[rel="preconnect"]').should('exist');
    });

    it('should implement proper caching', () => {
      cy.intercept('GET', '/api/products', (req) => {
        expect(req.headers).to.have.property('cache-control');
      }).as('getProducts');
      
      cy.visit('/');
      cy.wait('@getProducts');
    });

    it('should compress responses', () => {
      cy.request('/api/products').then((response) => {
        expect(response.headers).to.have.property('content-encoding');
      });
    });

    it('should have optimized images', () => {
      cy.get('img').each(($img) => {
        const src = $img.attr('src');
        if (src && src.includes('.jpg')) {
          // Check if WebP version is available
          cy.request({
            url: src.replace('.jpg', '.webp'),
            failOnStatusCode: false
          }).then((response) => {
            if (response.status === 200) {
              expect($img.attr('src')).to.include('.webp');
            }
          });
        }
      });
    });

    it('should implement service worker for caching', () => {
      cy.window().then((win) => {
        expect(win.navigator.serviceWorker).to.exist;
        
        return win.navigator.serviceWorker.getRegistration().then((registration) => {
          expect(registration).to.exist;
        });
      });
    });
  });

  describe('Mobile Performance', () => {
    it('should be responsive and performant on mobile', () => {
      cy.viewport('iphone-x');
      cy.visit('/');
      
      // Check mobile-specific optimizations
      cy.get('[data-testid="mobile-menu"]').should('be.visible');
      
      // Test touch interactions
      cy.get('[data-testid="product-card"]').first().should('be.visible');
      cy.get('[data-testid="product-card"]').first().trigger('touchstart');
    });

    it('should have proper viewport meta tag', () => {
      cy.get('head meta[name="viewport"]')
        .should('have.attr', 'content')
        .and('include', 'width=device-width')
        .and('include', 'initial-scale=1');
    });
  });

  describe('Accessibility Performance', () => {
    it('should have good accessibility performance', () => {
      cy.visit('/');
      cy.injectAxe();
      
      // Run accessibility checks
      cy.checkA11y(null, {
        rules: {
          'color-contrast': { enabled: true },
          'keyboard-navigation': { enabled: true },
          'focus-management': { enabled: true }
        }
      });
    });

    it('should support keyboard navigation efficiently', () => {
      cy.visit('/');
      
      // Test tab navigation performance
      const startTime = Date.now();
      
      cy.get('body').tab().tab().tab().then(() => {
        const endTime = Date.now();
        const tabTime = endTime - startTime;
        expect(tabTime).to.be.lessThan(100); // Should be very fast
      });
    });
  });
});
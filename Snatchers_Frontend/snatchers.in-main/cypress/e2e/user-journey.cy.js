describe('Complete User Journey', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.waitForPageLoad();
  });

  it('should complete a full shopping journey', () => {
    // 1. Search for products
    cy.searchProducts('laptop');
    cy.get('[data-testid="search-results"]').should('contain', 'laptop');

    // 2. Apply filters
    cy.applyFilter('price', '50000-100000');
    cy.applyFilter('brand', 'apple');

    // 3. View product details
    cy.get('[data-testid="product-card"]').first().click();
    cy.get('[data-testid="product-title"]').should('be.visible');
    cy.get('[data-testid="product-price"]').should('be.visible');
    cy.get('[data-testid="product-images"]').should('be.visible');

    // 4. Add to cart
    cy.get('[data-testid="add-to-cart-button"]').click();
    cy.get('[data-testid="cart-notification"]').should('contain', 'Added to cart');

    // 5. View cart
    cy.get('[data-testid="cart-icon"]').click();
    cy.get('[data-testid="cart-drawer"]').should('be.visible');
    cy.get('[data-testid="cart-item"]').should('have.length.at.least', 1);

    // 6. Proceed to checkout (without completing - requires auth)
    cy.get('[data-testid="checkout-button"]').click();
    cy.url().should('include', '/login'); // Should redirect to login for guest users
  });

  it('should handle product comparison', () => {
    // Search for products
    cy.searchProducts('smartphone');

    // Add products to comparison
    cy.get('[data-testid="compare-button"]').first().click();
    cy.get('[data-testid="compare-button"]').eq(1).click();

    // View comparison
    cy.get('[data-testid="comparison-drawer"]').should('be.visible');
    cy.get('[data-testid="comparison-table"]').should('be.visible');
    cy.get('[data-testid="compared-product"]').should('have.length', 2);

    // Remove from comparison
    cy.get('[data-testid="remove-from-comparison"]').first().click();
    cy.get('[data-testid="compared-product"]').should('have.length', 1);
  });

  it('should test search functionality', () => {
    // Test search suggestions
    cy.get('[data-testid="search-input"]').type('lap');
    cy.get('[data-testid="search-suggestions"]').should('be.visible');
    cy.get('[data-testid="suggestion-item"]').should('contain', 'laptop');

    // Select suggestion
    cy.get('[data-testid="suggestion-item"]').first().click();
    cy.get('[data-testid="search-results"]').should('be.visible');

    // Test no results
    cy.get('[data-testid="search-input"]').clear().type('nonexistentproduct123');
    cy.get('[data-testid="search-button"]').click();
    cy.get('[data-testid="no-results"]').should('be.visible');
  });

  it('should test responsive design', () => {
    cy.checkResponsive();
  });

  it('should test accessibility', () => {
    cy.injectAxe();
    cy.checkA11y();
  });

  it('should test SEO elements', () => {
    cy.checkSEO();
  });

  it('should test performance', () => {
    cy.checkPerformance();
  });
});
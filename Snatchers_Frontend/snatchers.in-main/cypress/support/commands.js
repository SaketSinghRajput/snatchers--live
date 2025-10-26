// Custom commands for the Snatchers e-commerce platform

// Command to search for products
Cypress.Commands.add('searchProducts', (query) => {
  cy.get('[data-testid="search-input"]').clear().type(query);
  cy.get('[data-testid="search-button"]').click();
  cy.get('[data-testid="search-results"]').should('be.visible');
});

// Command to filter products
Cypress.Commands.add('applyFilter', (filterType, filterValue) => {
  cy.get(`[data-testid="filter-${filterType}"]`).click();
  cy.get(`[data-testid="filter-option-${filterValue}"]`).click();
  cy.get('[data-testid="apply-filters"]').click();
});

// Command to navigate to product detail page
Cypress.Commands.add('viewProductDetails', (productId) => {
  cy.get(`[data-testid="product-card-${productId}"]`).click();
  cy.url().should('include', '/product/');
  cy.get('[data-testid="product-title"]').should('be.visible');
});

// Command to add product to wishlist
Cypress.Commands.add('addToWishlist', (productId) => {
  cy.get(`[data-testid="wishlist-button-${productId}"]`).click();
  cy.get('[data-testid="wishlist-notification"]').should('be.visible');
});

// Command to proceed to checkout
Cypress.Commands.add('proceedToCheckout', () => {
  cy.get('[data-testid="cart-icon"]').click();
  cy.get('[data-testid="checkout-button"]').click();
  cy.url().should('include', '/checkout');
});

// Command to fill shipping address
Cypress.Commands.add('fillShippingAddress', (address) => {
  cy.get('[data-testid="address-street"]').type(address.street);
  cy.get('[data-testid="address-city"]').type(address.city);
  cy.get('[data-testid="address-state"]').select(address.state);
  cy.get('[data-testid="address-zipcode"]').type(address.zipCode);
  cy.get('[data-testid="address-country"]').select(address.country);
});

// Command to select payment method
Cypress.Commands.add('selectPaymentMethod', (method) => {
  cy.get(`[data-testid="payment-method-${method}"]`).click();
});

// Command to complete order
Cypress.Commands.add('completeOrder', () => {
  cy.get('[data-testid="place-order-button"]').click();
  cy.get('[data-testid="order-confirmation"]').should('be.visible');
});

// Command to check responsive design
Cypress.Commands.add('checkResponsive', () => {
  // Test mobile view
  cy.viewport(375, 667);
  cy.get('[data-testid="mobile-menu"]').should('be.visible');
  
  // Test tablet view
  cy.viewport(768, 1024);
  cy.get('[data-testid="tablet-layout"]').should('be.visible');
  
  // Test desktop view
  cy.viewport(1280, 720);
  cy.get('[data-testid="desktop-layout"]').should('be.visible');
});

// Command to test SEO elements
Cypress.Commands.add('checkSEO', () => {
  cy.get('head title').should('exist');
  cy.get('head meta[name="description"]').should('exist');
  cy.get('head meta[property="og:title"]').should('exist');
  cy.get('head meta[property="og:description"]').should('exist');
  cy.get('head link[rel="canonical"]').should('exist');
});

// Command to test performance
Cypress.Commands.add('checkPerformance', () => {
  cy.window().then((win) => {
    const performance = win.performance;
    const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
    expect(loadTime).to.be.lessThan(5000); // Page should load within 5 seconds
  });
});
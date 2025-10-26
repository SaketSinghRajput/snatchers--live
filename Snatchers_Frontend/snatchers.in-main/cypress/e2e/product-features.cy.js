describe('Product Features', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.waitForPageLoad();
  });

  it('should display product cards with all required information', () => {
    cy.get('[data-testid="product-card"]').first().within(() => {
      cy.get('[data-testid="product-image"]').should('be.visible');
      cy.get('[data-testid="product-title"]').should('be.visible');
      cy.get('[data-testid="product-price"]').should('be.visible');
      cy.get('[data-testid="product-rating"]').should('be.visible');
      cy.get('[data-testid="add-to-cart-button"]').should('be.visible');
      cy.get('[data-testid="wishlist-button"]').should('be.visible');
    });
  });

  it('should handle product image gallery', () => {
    // Navigate to product detail page
    cy.get('[data-testid="product-card"]').first().click();
    
    cy.get('[data-testid="product-gallery"]').should('be.visible');
    cy.get('[data-testid="main-image"]').should('be.visible');
    cy.get('[data-testid="thumbnail-images"]').should('be.visible');
    
    // Click on thumbnail to change main image
    cy.get('[data-testid="thumbnail-image"]').eq(1).click();
    cy.get('[data-testid="main-image"]').should('have.attr', 'src').and('not.be.empty');
  });

  it('should handle product variants selection', () => {
    // Navigate to a product with variants
    cy.visit('/product/test-product-with-variants');
    
    cy.get('[data-testid="product-variants"]').should('be.visible');
    cy.get('[data-testid="variant-size"]').should('be.visible');
    cy.get('[data-testid="variant-color"]').should('be.visible');
    
    // Select different variants
    cy.get('[data-testid="size-option-M"]').click();
    cy.get('[data-testid="color-option-red"]').click();
    
    // Verify price updates if applicable
    cy.get('[data-testid="product-price"]').should('be.visible');
  });

  it('should display and handle product reviews', () => {
    cy.visit('/product/test-product');
    
    cy.get('[data-testid="reviews-section"]').should('be.visible');
    cy.get('[data-testid="review-summary"]').should('be.visible');
    cy.get('[data-testid="review-list"]').should('be.visible');
    
    // Test review filtering
    cy.get('[data-testid="review-filter-5-stars"]').click();
    cy.get('[data-testid="review-item"]').should('be.visible');
    
    // Test review sorting
    cy.get('[data-testid="review-sort"]').select('newest');
    cy.get('[data-testid="review-item"]').should('be.visible');
  });

  it('should handle product recommendations', () => {
    cy.visit('/product/test-product');
    
    cy.get('[data-testid="recommendations-section"]').should('be.visible');
    cy.get('[data-testid="recommended-products"]').should('be.visible');
    cy.get('[data-testid="recommendation-carousel"]').should('be.visible');
    
    // Test carousel navigation
    cy.get('[data-testid="carousel-next"]').click();
    cy.get('[data-testid="recommended-product"]').should('be.visible');
  });

  it('should handle inventory status', () => {
    // Test in-stock product
    cy.visit('/product/in-stock-product');
    cy.get('[data-testid="stock-status"]').should('contain', 'In Stock');
    cy.get('[data-testid="add-to-cart-button"]').should('not.be.disabled');
    
    // Test out-of-stock product
    cy.visit('/product/out-of-stock-product');
    cy.get('[data-testid="stock-status"]').should('contain', 'Out of Stock');
    cy.get('[data-testid="add-to-cart-button"]').should('be.disabled');
    
    // Test low stock warning
    cy.visit('/product/low-stock-product');
    cy.get('[data-testid="low-stock-warning"]').should('be.visible');
  });

  it('should handle product sharing', () => {
    cy.visit('/product/test-product');
    
    cy.get('[data-testid="share-button"]').click();
    cy.get('[data-testid="share-modal"]').should('be.visible');
    cy.get('[data-testid="share-facebook"]').should('be.visible');
    cy.get('[data-testid="share-twitter"]').should('be.visible');
    cy.get('[data-testid="share-whatsapp"]').should('be.visible');
    cy.get('[data-testid="copy-link"]').should('be.visible');
    
    // Test copy link functionality
    cy.get('[data-testid="copy-link"]').click();
    cy.get('[data-testid="copy-success"]').should('be.visible');
  });

  it('should handle product specifications', () => {
    cy.visit('/product/test-product');
    
    cy.get('[data-testid="specifications-section"]').should('be.visible');
    cy.get('[data-testid="spec-table"]').should('be.visible');
    cy.get('[data-testid="spec-row"]').should('have.length.at.least', 1);
    
    // Test expandable specifications
    cy.get('[data-testid="show-more-specs"]').click();
    cy.get('[data-testid="additional-specs"]').should('be.visible');
  });

  it('should handle recently viewed products', () => {
    // View multiple products to populate recently viewed
    cy.visit('/product/product-1');
    cy.wait(1000);
    cy.visit('/product/product-2');
    cy.wait(1000);
    cy.visit('/product/product-3');
    
    // Check recently viewed section
    cy.get('[data-testid="recently-viewed"]').should('be.visible');
    cy.get('[data-testid="recently-viewed-item"]').should('have.length.at.least', 2);
  });
});
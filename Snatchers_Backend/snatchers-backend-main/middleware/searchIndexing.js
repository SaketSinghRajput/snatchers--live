import SearchService from '../services/SearchService.js';

// Middleware to automatically index products after creation/update
export const indexProductMiddleware = async (req, res, next) => {
  // Store original json method
  const originalJson = res.json;
  
  // Override json method to intercept response
  res.json = function(data) {
    // Call original json method
    originalJson.call(this, data);
    
    // Index product if operation was successful
    if (data.success && data.product) {
      // Don't await to avoid blocking response
      SearchService.indexProduct(data.product).catch(error => {
        console.error('Error indexing product:', error);
      });
    }
  };
  
  next();
};

// Middleware to remove product from index after deletion
export const removeFromIndexMiddleware = (productId) => {
  return async (req, res, next) => {
    // Store original json method
    const originalJson = res.json;
    
    // Override json method to intercept response
    res.json = function(data) {
      // Call original json method
      originalJson.call(this, data);
      
      // Remove from index if deletion was successful
      if (data.success) {
        // Don't await to avoid blocking response
        SearchService.removeFromIndex(productId).catch(error => {
          console.error('Error removing product from index:', error);
        });
      }
    };
    
    next();
  };
};
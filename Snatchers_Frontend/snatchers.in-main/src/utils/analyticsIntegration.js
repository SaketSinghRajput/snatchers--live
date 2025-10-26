import axios from 'axios';

class AnalyticsIntegration {
  constructor() {
    this.config = null;
    this.initialized = false;
    this.queue = [];
    this.sessionId = this.generateSessionId();
    this.clientId = this.getOrCreateClientId();
    
    // Initialize analytics
    this.initialize();
  }

  async initialize() {
    try {
      // Get analytics configuration from backend
      const response = await axios.get('/api/integrations/analytics/config');
      this.config = response.data.config;
      
      // Initialize Google Analytics
      if (this.config.googleAnalytics.enabled) {
        this.initializeGoogleAnalytics();
      }
      
      // Initialize Facebook Pixel
      if (this.config.facebookPixel.enabled) {
        this.initializeFacebookPixel();
      }
      
      // Initialize Google Ads
      if (this.config.googleAds.enabled) {
        this.initializeGoogleAds();
      }
      
      this.initialized = true;
      
      // Process queued events
      this.processQueue();
      
      console.log('[Analytics] Initialized with config:', this.config);
    } catch (error) {
      console.error('[Analytics] Initialization failed:', error);
    }
  }

  initializeGoogleAnalytics() {
    if (typeof window === 'undefined') return;
    
    const { measurementId } = this.config.googleAnalytics;
    
    // Load Google Analytics script
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.appendChild(script);
    
    // Initialize gtag
    window.dataLayer = window.dataLayer || [];
    function gtag(){window.dataLayer.push(arguments);}
    window.gtag = gtag;
    
    gtag('js', new Date());
    gtag('config', measurementId, {
      client_storage: 'enabled',
      anonymize_ip: true,
      allow_google_signals: false,
      allow_ad_personalization_signals: false
    });
    
    console.log('[Analytics] Google Analytics initialized');
  }

  initializeFacebookPixel() {
    if (typeof window === 'undefined') return;
    
    const { pixelId } = this.config.facebookPixel;
    
    // Facebook Pixel Code
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    
    window.fbq('init', pixelId);
    window.fbq('track', 'PageView');
    
    console.log('[Analytics] Facebook Pixel initialized');
  }

  initializeGoogleAds() {
    if (typeof window === 'undefined') return;
    
    const { conversionId } = this.config.googleAds;
    
    // Load Google Ads script
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=AW-${conversionId}`;
    document.head.appendChild(script);
    
    // Initialize gtag for Google Ads
    window.dataLayer = window.dataLayer || [];
    function gtag(){window.dataLayer.push(arguments);}
    if (!window.gtag) window.gtag = gtag;
    
    gtag('config', `AW-${conversionId}`);
    
    console.log('[Analytics] Google Ads initialized');
  }

  // Track events with automatic client-side and server-side tracking
  async trackEvent(eventName, eventData = {}, userInfo = {}) {
    const event = {
      eventName,
      eventData: {
        ...eventData,
        page_url: window.location.href,
        page_title: document.title,
        page_referrer: document.referrer,
        sessionId: this.sessionId,
        timestamp: new Date().toISOString()
      },
      userInfo: {
        ...userInfo,
        clientId: this.clientId
      }
    };

    // Queue event if not initialized
    if (!this.initialized) {
      this.queue.push(event);
      return;
    }

    try {
      // Track client-side
      this.trackClientSide(eventName, event.eventData);
      
      // Track server-side
      await this.trackServerSide(eventName, event.eventData, event.userInfo);
      
      console.log('[Analytics] Event tracked:', eventName, event.eventData);
    } catch (error) {
      console.error('[Analytics] Event tracking failed:', error);
    }
  }

  trackClientSide(eventName, eventData) {
    // Google Analytics client-side tracking
    if (this.config?.googleAnalytics?.enabled && window.gtag) {
      const gaEventName = this.mapEventNameForGA(eventName);
      const gaParams = this.mapEventDataForGA(eventData, eventName);
      window.gtag('event', gaEventName, gaParams);
    }

    // Facebook Pixel client-side tracking
    if (this.config?.facebookPixel?.enabled && window.fbq) {
      const fbEventName = this.mapEventNameForFB(eventName);
      const fbParams = this.mapEventDataForFB(eventData, eventName);
      window.fbq('track', fbEventName, fbParams);
    }
  }

  async trackServerSide(eventName, eventData, userInfo) {
    try {
      await axios.post('/api/integrations/analytics/track', {
        eventName,
        eventData,
        userInfo
      });
    } catch (error) {
      console.error('[Analytics] Server-side tracking failed:', error);
    }
  }

  // Predefined tracking methods
  async trackPageView(pageData = {}) {
    const data = {
      page_url: window.location.href,
      page_title: document.title,
      page_referrer: document.referrer,
      ...pageData
    };
    
    return this.trackEvent('page_view', data);
  }

  async trackProductView(product) {
    const data = {
      product_id: product.id || product._id,
      product_name: product.title || product.name,
      category: product.category,
      brand: product.brand,
      price: product.price || product.offerPrice,
      currency: 'INR'
    };
    
    return this.trackEvent('product_view', data);
  }

  async trackAddToCart(cartItem) {
    const data = {
      currency: 'INR',
      value: cartItem.price * cartItem.quantity,
      items: [{
        product_id: cartItem.id || cartItem._id,
        product_name: cartItem.title || cartItem.name,
        category: cartItem.category,
        brand: cartItem.brand,
        price: cartItem.price,
        quantity: cartItem.quantity
      }]
    };
    
    return this.trackEvent('add_to_cart', data);
  }

  async trackRemoveFromCart(cartItem) {
    const data = {
      currency: 'INR',
      value: cartItem.price * cartItem.quantity,
      items: [{
        product_id: cartItem.id || cartItem._id,
        product_name: cartItem.title || cartItem.name,
        category: cartItem.category,
        brand: cartItem.brand,
        price: cartItem.price,
        quantity: cartItem.quantity
      }]
    };
    
    return this.trackEvent('remove_from_cart', data);
  }

  async trackBeginCheckout(cartData) {
    const data = {
      currency: 'INR',
      value: cartData.total,
      items: cartData.items.map(item => ({
        product_id: item.id || item._id,
        product_name: item.title || item.name,
        category: item.category,
        brand: item.brand,
        price: item.price,
        quantity: item.quantity
      }))
    };
    
    return this.trackEvent('begin_checkout', data);
  }

  async trackPurchase(orderData) {
    const data = {
      transaction_id: orderData.orderId || orderData._id,
      value: orderData.total,
      currency: 'INR',
      tax: orderData.tax || 0,
      shipping: orderData.shipping || 0,
      items: orderData.items.map(item => ({
        product_id: item.productId || item.product?._id,
        product_name: item.productName || item.product?.title,
        category: item.category || item.product?.category,
        brand: item.brand || item.product?.brand,
        price: item.price,
        quantity: item.quantity
      }))
    };
    
    return this.trackEvent('purchase', data);
  }

  async trackSearch(searchData) {
    const data = {
      search_term: searchData.query,
      results_count: searchData.resultsCount,
      category: searchData.category
    };
    
    return this.trackEvent('search', data);
  }

  async trackSignUp(userData = {}) {
    const data = {
      method: userData.method || 'email',
      user_type: userData.userType || 'customer'
    };
    
    return this.trackEvent('sign_up', data);
  }

  async trackLogin(userData = {}) {
    const data = {
      method: userData.method || 'email'
    };
    
    return this.trackEvent('login', data);
  }

  async trackAddToWishlist(product) {
    const data = {
      currency: 'INR',
      value: product.price || product.offerPrice,
      items: [{
        product_id: product.id || product._id,
        product_name: product.title || product.name,
        category: product.category,
        brand: product.brand,
        price: product.price || product.offerPrice
      }]
    };
    
    return this.trackEvent('add_to_wishlist', data);
  }

  // Event mapping functions
  mapEventNameForGA(eventName) {
    const mapping = {
      'product_view': 'view_item',
      'add_to_cart': 'add_to_cart',
      'remove_from_cart': 'remove_from_cart',
      'begin_checkout': 'begin_checkout',
      'purchase': 'purchase',
      'search': 'search',
      'sign_up': 'sign_up',
      'login': 'login',
      'add_to_wishlist': 'add_to_wishlist'
    };
    return mapping[eventName] || eventName;
  }

  mapEventDataForGA(data, eventName) {
    const baseParams = {
      page_title: data.page_title,
      page_location: data.page_url,
      currency: data.currency || 'INR'
    };

    switch (eventName) {
      case 'product_view':
        return {
          ...baseParams,
          item_id: data.product_id,
          item_name: data.product_name,
          item_category: data.category,
          item_brand: data.brand,
          price: data.price,
          value: data.price
        };

      case 'add_to_cart':
      case 'remove_from_cart':
        return {
          ...baseParams,
          currency: data.currency,
          value: data.value,
          items: data.items
        };

      case 'purchase':
        return {
          ...baseParams,
          transaction_id: data.transaction_id,
          value: data.value,
          currency: data.currency,
          tax: data.tax,
          shipping: data.shipping,
          items: data.items
        };

      case 'search':
        return {
          ...baseParams,
          search_term: data.search_term
        };

      default:
        return { ...baseParams, ...data };
    }
  }

  mapEventNameForFB(eventName) {
    const mapping = {
      'product_view': 'ViewContent',
      'add_to_cart': 'AddToCart',
      'begin_checkout': 'InitiateCheckout',
      'purchase': 'Purchase',
      'search': 'Search',
      'sign_up': 'CompleteRegistration',
      'add_to_wishlist': 'AddToWishlist'
    };
    return mapping[eventName] || eventName;
  }

  mapEventDataForFB(data, eventName) {
    const baseParams = {
      currency: data.currency || 'INR'
    };

    switch (eventName) {
      case 'product_view':
        return {
          ...baseParams,
          content_ids: [data.product_id],
          content_type: 'product',
          content_name: data.product_name,
          content_category: data.category,
          value: data.price
        };

      case 'add_to_cart':
        return {
          ...baseParams,
          content_ids: data.items?.map(item => item.product_id),
          content_type: 'product',
          value: data.value,
          contents: data.items?.map(item => ({
            id: item.product_id,
            quantity: item.quantity,
            item_price: item.price
          }))
        };

      case 'purchase':
        return {
          ...baseParams,
          content_ids: data.items?.map(item => item.product_id),
          content_type: 'product',
          value: data.value,
          contents: data.items?.map(item => ({
            id: item.product_id,
            quantity: item.quantity,
            item_price: item.price
          }))
        };

      case 'search':
        return {
          ...baseParams,
          search_string: data.search_term,
          content_category: data.category
        };

      default:
        return { ...baseParams, ...data };
    }
  }

  // Utility functions
  generateSessionId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  getOrCreateClientId() {
    let clientId = localStorage.getItem('analytics_client_id');
    if (!clientId) {
      clientId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('analytics_client_id', clientId);
    }
    return clientId;
  }

  processQueue() {
    while (this.queue.length > 0) {
      const event = this.queue.shift();
      this.trackEvent(event.eventName, event.eventData, event.userInfo);
    }
  }

  // Set user information for tracking
  setUser(userInfo) {
    this.userInfo = userInfo;
    
    // Update Google Analytics user ID
    if (this.config?.googleAnalytics?.enabled && window.gtag && userInfo.userId) {
      window.gtag('config', this.config.googleAnalytics.measurementId, {
        user_id: userInfo.userId
      });
    }
  }

  // Clear user information (on logout)
  clearUser() {
    this.userInfo = null;
  }

  // Get current configuration
  getConfig() {
    return this.config;
  }

  // Check if analytics is initialized
  isInitialized() {
    return this.initialized;
  }
}

// Create singleton instance
const analyticsIntegration = new AnalyticsIntegration();

export default analyticsIntegration;
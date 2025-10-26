import axios from 'axios';

class AnalyticsIntegrationService {
  constructor() {
    this.providers = {
      googleAnalytics: {
        measurementId: process.env.GA_MEASUREMENT_ID,
        apiSecret: process.env.GA_API_SECRET,
        enabled: !!(process.env.GA_MEASUREMENT_ID && process.env.GA_API_SECRET)
      },
      facebookPixel: {
        pixelId: process.env.FB_PIXEL_ID,
        accessToken: process.env.FB_ACCESS_TOKEN,
        enabled: !!(process.env.FB_PIXEL_ID && process.env.FB_ACCESS_TOKEN)
      },
      googleAds: {
        conversionId: process.env.GOOGLE_ADS_CONVERSION_ID,
        conversionLabel: process.env.GOOGLE_ADS_CONVERSION_LABEL,
        enabled: !!(process.env.GOOGLE_ADS_CONVERSION_ID && process.env.GOOGLE_ADS_CONVERSION_LABEL)
      }
    };

    this.eventQueue = [];
    this.batchSize = 10;
    this.flushInterval = 5000; // 5 seconds
    
    // Start batch processing
    this.startBatchProcessing();
  }

  // Track e-commerce events across all platforms
  async trackEvent(eventName, eventData, userInfo = {}) {
    try {
      const event = {
        name: eventName,
        data: eventData,
        user: userInfo,
        timestamp: new Date().toISOString(),
        sessionId: eventData.sessionId || this.generateSessionId()
      };

      // Add to queue for batch processing
      this.eventQueue.push(event);

      // Also send immediately for critical events
      const criticalEvents = ['purchase', 'add_payment_info', 'begin_checkout'];
      if (criticalEvents.includes(eventName)) {
        await this.sendEventImmediately(event);
      }

      this.logAnalyticsEvent('event_queued', {
        eventName,
        userId: userInfo.userId,
        sessionId: event.sessionId
      });

      return { success: true, queued: true };
    } catch (error) {
      this.logAnalyticsEvent('event_tracking_failed', {
        eventName,
        error: error.message
      }, 'error');
      throw error;
    }
  }

  // Send event immediately to all platforms
  async sendEventImmediately(event) {
    const promises = [];

    if (this.providers.googleAnalytics.enabled) {
      promises.push(this.sendToGoogleAnalytics(event));
    }

    if (this.providers.facebookPixel.enabled) {
      promises.push(this.sendToFacebookPixel(event));
    }

    if (this.providers.googleAds.enabled && event.name === 'purchase') {
      promises.push(this.sendToGoogleAds(event));
    }

    const results = await Promise.allSettled(promises);
    
    // Log any failures
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const provider = ['googleAnalytics', 'facebookPixel', 'googleAds'][index];
        this.logAnalyticsEvent('provider_send_failed', {
          provider,
          eventName: event.name,
          error: result.reason?.message
        }, 'error');
      }
    });

    return results;
  }

  // Google Analytics 4 Measurement Protocol
  async sendToGoogleAnalytics(event) {
    if (!this.providers.googleAnalytics.enabled) return;

    const { measurementId, apiSecret } = this.providers.googleAnalytics;
    const url = `https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`;

    const payload = {
      client_id: event.user.clientId || event.sessionId,
      user_id: event.user.userId,
      events: [{
        name: this.mapEventNameForGA(event.name),
        params: this.mapEventDataForGA(event.data, event.name)
      }]
    };

    // Add user properties if available
    if (event.user.email || event.user.phone) {
      payload.user_properties = {};
      if (event.user.email) {
        payload.user_properties.email = { value: event.user.email };
      }
      if (event.user.phone) {
        payload.user_properties.phone_number = { value: event.user.phone };
      }
    }

    const response = await axios.post(url, payload, {
      headers: { 'Content-Type': 'application/json' }
    });

    return { provider: 'googleAnalytics', success: true, response: response.status };
  }

  // Facebook Conversions API
  async sendToFacebookPixel(event) {
    if (!this.providers.facebookPixel.enabled) return;

    const { pixelId, accessToken } = this.providers.facebookPixel;
    const url = `https://graph.facebook.com/v18.0/${pixelId}/events`;

    const eventData = {
      event_name: this.mapEventNameForFB(event.name),
      event_time: Math.floor(new Date(event.timestamp).getTime() / 1000),
      action_source: 'website',
      event_source_url: event.data.page_url || process.env.FRONTEND_URL,
      user_data: this.mapUserDataForFB(event.user),
      custom_data: this.mapEventDataForFB(event.data, event.name)
    };

    // Add event ID to prevent duplicate events
    if (event.data.eventId) {
      eventData.event_id = event.data.eventId;
    }

    const payload = {
      data: [eventData],
      access_token: accessToken
    };

    const response = await axios.post(url, payload, {
      headers: { 'Content-Type': 'application/json' }
    });

    return { provider: 'facebookPixel', success: true, response: response.data };
  }

  // Google Ads Conversion Tracking
  async sendToGoogleAds(event) {
    if (!this.providers.googleAds.enabled || event.name !== 'purchase') return;

    // Google Ads conversion tracking is typically handled client-side
    // This is a placeholder for server-side conversion tracking
    const conversionData = {
      conversion_id: this.providers.googleAds.conversionId,
      conversion_label: this.providers.googleAds.conversionLabel,
      conversion_value: event.data.value || event.data.revenue,
      currency: event.data.currency || 'USD',
      order_id: event.data.transaction_id
    };

    this.logAnalyticsEvent('google_ads_conversion', {
      conversionId: conversionData.conversion_id,
      value: conversionData.conversion_value,
      orderId: conversionData.order_id
    });

    return { provider: 'googleAds', success: true, data: conversionData };
  }

  // Batch processing for queued events
  startBatchProcessing() {
    setInterval(async () => {
      if (this.eventQueue.length > 0) {
        await this.processBatch();
      }
    }, this.flushInterval);
  }

  async processBatch() {
    const batch = this.eventQueue.splice(0, this.batchSize);
    if (batch.length === 0) return;

    try {
      // Group events by type for efficient processing
      const eventGroups = this.groupEventsByType(batch);
      
      for (const [eventType, events] of Object.entries(eventGroups)) {
        await this.processBatchByType(eventType, events);
      }

      this.logAnalyticsEvent('batch_processed', {
        eventCount: batch.length,
        eventTypes: Object.keys(eventGroups)
      });
    } catch (error) {
      this.logAnalyticsEvent('batch_processing_failed', {
        error: error.message,
        eventCount: batch.length
      }, 'error');
      
      // Re-queue failed events (with limit to prevent infinite loops)
      if (batch.length < 100) {
        this.eventQueue.unshift(...batch);
      }
    }
  }

  groupEventsByType(events) {
    return events.reduce((groups, event) => {
      if (!groups[event.name]) {
        groups[event.name] = [];
      }
      groups[event.name].push(event);
      return groups;
    }, {});
  }

  async processBatchByType(eventType, events) {
    // Send batch to Google Analytics
    if (this.providers.googleAnalytics.enabled) {
      await this.sendBatchToGoogleAnalytics(events);
    }

    // Send individual events to Facebook (they don't support batching the same way)
    if (this.providers.facebookPixel.enabled) {
      for (const event of events) {
        await this.sendToFacebookPixel(event).catch(error => {
          this.logAnalyticsEvent('fb_batch_event_failed', {
            eventName: event.name,
            error: error.message
          }, 'error');
        });
      }
    }
  }

  async sendBatchToGoogleAnalytics(events) {
    if (!this.providers.googleAnalytics.enabled) return;

    const { measurementId, apiSecret } = this.providers.googleAnalytics;
    const url = `https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`;

    // Group events by client_id for proper batching
    const eventsByClient = events.reduce((groups, event) => {
      const clientId = event.user.clientId || event.sessionId;
      if (!groups[clientId]) {
        groups[clientId] = [];
      }
      groups[clientId].push(event);
      return groups;
    }, {});

    const promises = Object.entries(eventsByClient).map(([clientId, clientEvents]) => {
      const payload = {
        client_id: clientId,
        user_id: clientEvents[0].user.userId,
        events: clientEvents.map(event => ({
          name: this.mapEventNameForGA(event.name),
          params: this.mapEventDataForGA(event.data, event.name)
        }))
      };

      return axios.post(url, payload, {
        headers: { 'Content-Type': 'application/json' }
      });
    });

    await Promise.allSettled(promises);
  }

  // Event name mapping for Google Analytics
  mapEventNameForGA(eventName) {
    const mapping = {
      'product_view': 'view_item',
      'add_to_cart': 'add_to_cart',
      'remove_from_cart': 'remove_from_cart',
      'begin_checkout': 'begin_checkout',
      'add_payment_info': 'add_payment_info',
      'purchase': 'purchase',
      'search': 'search',
      'view_category': 'view_item_list',
      'add_to_wishlist': 'add_to_wishlist',
      'share': 'share',
      'sign_up': 'sign_up',
      'login': 'login'
    };
    return mapping[eventName] || eventName;
  }

  // Event data mapping for Google Analytics
  mapEventDataForGA(data, eventName) {
    const baseParams = {
      page_title: data.page_title,
      page_location: data.page_url,
      currency: data.currency || 'USD'
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
          items: data.items?.map(item => ({
            item_id: item.product_id,
            item_name: item.product_name,
            item_category: item.category,
            item_brand: item.brand,
            price: item.price,
            quantity: item.quantity
          }))
        };

      case 'purchase':
        return {
          ...baseParams,
          transaction_id: data.transaction_id,
          value: data.value,
          currency: data.currency,
          tax: data.tax,
          shipping: data.shipping,
          items: data.items?.map(item => ({
            item_id: item.product_id,
            item_name: item.product_name,
            item_category: item.category,
            item_brand: item.brand,
            price: item.price,
            quantity: item.quantity
          }))
        };

      case 'search':
        return {
          ...baseParams,
          search_term: data.search_term,
          results_count: data.results_count
        };

      default:
        return { ...baseParams, ...data };
    }
  }

  // Event name mapping for Facebook
  mapEventNameForFB(eventName) {
    const mapping = {
      'product_view': 'ViewContent',
      'add_to_cart': 'AddToCart',
      'begin_checkout': 'InitiateCheckout',
      'add_payment_info': 'AddPaymentInfo',
      'purchase': 'Purchase',
      'search': 'Search',
      'add_to_wishlist': 'AddToWishlist',
      'sign_up': 'CompleteRegistration',
      'contact': 'Contact',
      'lead': 'Lead'
    };
    return mapping[eventName] || eventName;
  }

  // User data mapping for Facebook
  mapUserDataForFB(user) {
    const userData = {};
    
    if (user.email) {
      userData.em = this.hashData(user.email.toLowerCase());
    }
    if (user.phone) {
      userData.ph = this.hashData(user.phone.replace(/\D/g, ''));
    }
    if (user.firstName) {
      userData.fn = this.hashData(user.firstName.toLowerCase());
    }
    if (user.lastName) {
      userData.ln = this.hashData(user.lastName.toLowerCase());
    }
    if (user.city) {
      userData.ct = this.hashData(user.city.toLowerCase());
    }
    if (user.state) {
      userData.st = this.hashData(user.state.toLowerCase());
    }
    if (user.zipCode) {
      userData.zp = this.hashData(user.zipCode);
    }
    if (user.country) {
      userData.country = this.hashData(user.country.toLowerCase());
    }

    return userData;
  }

  // Event data mapping for Facebook
  mapEventDataForFB(data, eventName) {
    const customData = {
      currency: data.currency || 'USD'
    };

    switch (eventName) {
      case 'product_view':
        return {
          ...customData,
          content_ids: [data.product_id],
          content_type: 'product',
          content_name: data.product_name,
          content_category: data.category,
          value: data.price
        };

      case 'add_to_cart':
        return {
          ...customData,
          content_ids: data.items?.map(item => item.product_id) || [data.product_id],
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
          ...customData,
          content_ids: data.items?.map(item => item.product_id),
          content_type: 'product',
          value: data.value,
          order_id: data.transaction_id,
          contents: data.items?.map(item => ({
            id: item.product_id,
            quantity: item.quantity,
            item_price: item.price
          }))
        };

      case 'search':
        return {
          ...customData,
          search_string: data.search_term,
          content_category: data.category
        };

      default:
        return { ...customData, ...data };
    }
  }

  // Hash data for Facebook (SHA-256)
  hashData(data) {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  // Generate session ID
  generateSessionId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Predefined event tracking methods for common e-commerce events
  async trackPageView(pageData, userInfo) {
    return this.trackEvent('page_view', {
      page_url: pageData.url,
      page_title: pageData.title,
      page_referrer: pageData.referrer
    }, userInfo);
  }

  async trackProductView(productData, userInfo) {
    return this.trackEvent('product_view', {
      product_id: productData.id,
      product_name: productData.name,
      category: productData.category,
      brand: productData.brand,
      price: productData.price,
      currency: productData.currency || 'USD'
    }, userInfo);
  }

  async trackAddToCart(cartData, userInfo) {
    return this.trackEvent('add_to_cart', {
      currency: cartData.currency || 'USD',
      value: cartData.value,
      items: cartData.items
    }, userInfo);
  }

  async trackPurchase(orderData, userInfo) {
    return this.trackEvent('purchase', {
      transaction_id: orderData.orderId,
      value: orderData.total,
      currency: orderData.currency || 'USD',
      tax: orderData.tax,
      shipping: orderData.shipping,
      items: orderData.items
    }, userInfo);
  }

  async trackSearch(searchData, userInfo) {
    return this.trackEvent('search', {
      search_term: searchData.query,
      results_count: searchData.resultsCount,
      category: searchData.category
    }, userInfo);
  }

  async trackSignUp(userData, userInfo) {
    return this.trackEvent('sign_up', {
      method: userData.method || 'email',
      user_type: userData.userType || 'customer'
    }, userInfo);
  }

  // Get analytics configuration for frontend
  getClientConfig() {
    return {
      googleAnalytics: {
        measurementId: this.providers.googleAnalytics.measurementId,
        enabled: this.providers.googleAnalytics.enabled
      },
      facebookPixel: {
        pixelId: this.providers.facebookPixel.pixelId,
        enabled: this.providers.facebookPixel.enabled
      },
      googleAds: {
        conversionId: this.providers.googleAds.conversionId,
        enabled: this.providers.googleAds.enabled
      }
    };
  }

  // Analytics health check
  async healthCheck() {
    const results = {
      googleAnalytics: { enabled: this.providers.googleAnalytics.enabled, status: 'unknown' },
      facebookPixel: { enabled: this.providers.facebookPixel.enabled, status: 'unknown' },
      googleAds: { enabled: this.providers.googleAds.enabled, status: 'unknown' }
    };

    // Test Google Analytics
    if (this.providers.googleAnalytics.enabled) {
      try {
        await this.sendToGoogleAnalytics({
          name: 'test_event',
          data: { test: true },
          user: { clientId: 'health-check' },
          timestamp: new Date().toISOString()
        });
        results.googleAnalytics.status = 'healthy';
      } catch (error) {
        results.googleAnalytics.status = 'error';
        results.googleAnalytics.error = error.message;
      }
    }

    // Test Facebook Pixel
    if (this.providers.facebookPixel.enabled) {
      try {
        await this.sendToFacebookPixel({
          name: 'test_event',
          data: { test: true },
          user: { clientId: 'health-check' },
          timestamp: new Date().toISOString()
        });
        results.facebookPixel.status = 'healthy';
      } catch (error) {
        results.facebookPixel.status = 'error';
        results.facebookPixel.error = error.message;
      }
    }

    results.googleAds.status = results.googleAds.enabled ? 'configured' : 'disabled';

    return results;
  }

  // Analytics event logging
  logAnalyticsEvent(event, data, level = 'info') {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      level,
      service: 'AnalyticsIntegrationService',
      data: {
        ...data,
        // Remove sensitive data
        accessToken: undefined,
        apiSecret: undefined
      }
    };

    if (level === 'error') {
      console.error(`[Analytics Integration] ${JSON.stringify(logEntry)}`);
    } else if (level === 'warn') {
      console.warn(`[Analytics Integration] ${JSON.stringify(logEntry)}`);
    } else {
      console.log(`[Analytics Integration] ${JSON.stringify(logEntry)}`);
    }
  }

  // Get analytics statistics
  getQueueStats() {
    return {
      queueLength: this.eventQueue.length,
      batchSize: this.batchSize,
      flushInterval: this.flushInterval,
      providers: Object.keys(this.providers).reduce((acc, key) => {
        acc[key] = this.providers[key].enabled;
        return acc;
      }, {})
    };
  }
}

export default new AnalyticsIntegrationService();
// Service Worker for Snatchers E-commerce Platform
// Provides caching, offline functionality, and performance optimization

const CACHE_VERSION = '2.0.0';
const CACHE_NAME = `snatchers-v${CACHE_VERSION}`;
const STATIC_CACHE = `snatchers-static-v${CACHE_VERSION}`;
const DYNAMIC_CACHE = `snatchers-dynamic-v${CACHE_VERSION}`;
const IMAGE_CACHE = `snatchers-images-v${CACHE_VERSION}`;
const FONT_CACHE = `snatchers-fonts-v${CACHE_VERSION}`;
const API_CACHE = `snatchers-api-v${CACHE_VERSION}`;

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/favicon.ico',
  '/logo192.png',
  '/logo512.png'
];

// Critical pages to cache for offline access
const CRITICAL_PAGES = [
  '/',
  '/shop',
  '/cart',
  '/profile'
];

// Font patterns to cache
const FONT_PATTERNS = [
  /fonts\.googleapis\.com/,
  /fonts\.gstatic\.com/,
  /\.(?:woff|woff2|ttf|eot)$/
];

// API endpoints to cache
const API_CACHE_PATTERNS = [
  /\/api\/products/,
  /\/api\/categories/,
  /\/search/
];

// Image cache patterns
const IMAGE_PATTERNS = [
  /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
  /\/images\//,
  /cloudinary\.com/
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker v' + CACHE_VERSION);
  
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE).then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      }),
      // Cache critical pages
      caches.open(DYNAMIC_CACHE).then((cache) => {
        console.log('[SW] Caching critical pages');
        return Promise.allSettled(
          CRITICAL_PAGES.map(page => 
            fetch(page).then(response => {
              if (response.ok) {
                return cache.put(page, response);
              }
            }).catch(error => {
              console.warn(`[SW] Failed to cache page ${page}:`, error);
            })
          )
        );
      })
    ])
    .then(() => {
      console.log('[SW] Installation completed successfully');
      return self.skipWaiting();
    })
    .catch((error) => {
      console.error('[SW] Installation failed:', error);
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker v' + CACHE_VERSION);
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        const validCaches = [STATIC_CACHE, DYNAMIC_CACHE, IMAGE_CACHE, FONT_CACHE, API_CACHE];
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (!validCaches.includes(cacheName)) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Claim all clients
      self.clients.claim()
    ])
    .then(() => {
      console.log('[SW] Service worker activated successfully');
      // Notify all clients about the update
      return self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'SW_ACTIVATED',
            version: CACHE_VERSION
          });
        });
      });
    })
  );
});

// Fetch event - handle requests with caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Handle different types of requests
  if (isStaticAsset(request)) {
    event.respondWith(handleStaticAsset(request));
  } else if (isFontRequest(request)) {
    event.respondWith(handleFontRequest(request));
  } else if (isImageRequest(request)) {
    event.respondWith(handleImageRequest(request));
  } else if (isAPIRequest(request)) {
    event.respondWith(handleAPIRequest(request));
  } else if (isNavigationRequest(request)) {
    event.respondWith(handleNavigationRequest(request));
  } else {
    event.respondWith(handleGenericRequest(request));
  }
});

// Check if request is for static assets
function isStaticAsset(request) {
  const url = new URL(request.url);
  return url.pathname.startsWith('/static/') || 
         url.pathname === '/manifest.json' ||
         url.pathname === '/favicon.ico';
}

// Check if request is for images
function isImageRequest(request) {
  return IMAGE_PATTERNS.some(pattern => pattern.test(request.url));
}

// Check if request is for fonts
function isFontRequest(request) {
  return FONT_PATTERNS.some(pattern => pattern.test(request.url));
}

// Check if request is for API
function isAPIRequest(request) {
  return API_CACHE_PATTERNS.some(pattern => pattern.test(request.url));
}

// Check if request is navigation
function isNavigationRequest(request) {
  return request.mode === 'navigate';
}

// Handle static assets - Cache First strategy
async function handleStaticAsset(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      // Check if cache is stale (older than 1 hour for static assets)
      const cacheDate = cachedResponse.headers.get('sw-cache-date');
      if (cacheDate) {
        const cacheTime = new Date(cacheDate).getTime();
        const now = Date.now();
        const oneHour = 60 * 60 * 1000;
        
        if (now - cacheTime > oneHour) {
          // Try to update in background
          fetch(request).then(response => {
            if (response.ok) {
              const responseClone = response.clone();
              responseClone.headers.set('sw-cache-date', new Date().toISOString());
              caches.open(STATIC_CACHE).then(cache => {
                cache.put(request, responseClone);
              });
            }
          }).catch(() => {
            // Ignore network errors for background updates
          });
        }
      }
      
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      const responseClone = networkResponse.clone();
      responseClone.headers.set('sw-cache-date', new Date().toISOString());
      cache.put(request, responseClone);
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] Static asset fetch failed:', error);
    return new Response('Asset not available offline', { status: 503 });
  }
}

// Handle fonts - Cache First with long expiration
async function handleFontRequest(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    
    // Cache fonts for a long time since they rarely change
    if (networkResponse.ok) {
      const cache = await caches.open(FONT_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] Font fetch failed:', error);
    
    // Return a minimal fallback for fonts
    return new Response('', {
      status: 200,
      headers: {
        'Content-Type': 'font/woff2'
      }
    });
  }
}

// Handle images - Cache First with fallback
async function handleImageRequest(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    
    // Only cache successful responses
    if (networkResponse.status === 200) {
      const cache = await caches.open(IMAGE_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] Image fetch failed:', error);
    
    // Return placeholder image for offline
    return new Response(
      '<svg width="300" height="200" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#f3f4f6"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#9ca3af">Image unavailable</text></svg>',
      {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'no-cache'
        }
      }
    );
  }
}

// Handle API requests - Network First with cache fallback and smart caching
async function handleAPIRequest(request) {
  const url = new URL(request.url);
  const isProductAPI = url.pathname.includes('/api/products');
  const isCategoryAPI = url.pathname.includes('/api/categories');
  const isSearchAPI = url.pathname.includes('/search');
  
  try {
    // Add timeout for API requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const networkResponse = await fetch(request, {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    // Cache successful GET requests with different strategies
    if (networkResponse.ok && request.method === 'GET') {
      const cache = await caches.open(API_CACHE);
      const responseClone = networkResponse.clone();
      
      // Add cache metadata
      responseClone.headers.set('sw-cache-date', new Date().toISOString());
      
      // Set different cache durations based on API type
      if (isProductAPI || isCategoryAPI) {
        responseClone.headers.set('sw-cache-duration', '300000'); // 5 minutes
      } else if (isSearchAPI) {
        responseClone.headers.set('sw-cache-duration', '60000'); // 1 minute
      } else {
        responseClone.headers.set('sw-cache-duration', '180000'); // 3 minutes
      }
      
      cache.put(request, responseClone);
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] API fetch failed, trying cache:', error);
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      // Check if cache is still valid
      const cacheDate = cachedResponse.headers.get('sw-cache-date');
      const cacheDuration = cachedResponse.headers.get('sw-cache-duration');
      
      if (cacheDate && cacheDuration) {
        const cacheTime = new Date(cacheDate).getTime();
        const now = Date.now();
        const duration = parseInt(cacheDuration);
        
        if (now - cacheTime <= duration) {
          // Add offline indicator header
          const response = cachedResponse.clone();
          response.headers.set('X-Served-By', 'service-worker-cache');
          response.headers.set('X-Cache-Status', 'valid');
          return response;
        } else {
          // Cache is stale but still return it with indicator
          const response = cachedResponse.clone();
          response.headers.set('X-Served-By', 'service-worker-cache');
          response.headers.set('X-Cache-Status', 'stale');
          return response;
        }
      }
      
      // Return cached response without metadata
      const response = cachedResponse.clone();
      response.headers.set('X-Served-By', 'service-worker-cache');
      return response;
    }
    
    // Return offline response for API requests
    return new Response(
      JSON.stringify({
        error: 'Network unavailable',
        message: 'This content is not available offline',
        offline: true,
        timestamp: new Date().toISOString()
      }),
      {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
          'X-Served-By': 'service-worker-offline'
        }
      }
    );
  }
}

// Handle navigation requests - Network First with offline fallback
async function handleNavigationRequest(request) {
  try {
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    console.error('[SW] Navigation fetch failed:', error);
    
    // Try to serve cached version of the page
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Serve offline page
    const offlineResponse = await caches.match('/');
    if (offlineResponse) {
      return offlineResponse;
    }
    
    // Fallback offline page
    return new Response(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>Offline - Snatchers</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .offline-message { max-width: 400px; margin: 0 auto; }
            .retry-btn { 
              background: #3b82f6; color: white; border: none; 
              padding: 10px 20px; border-radius: 5px; cursor: pointer; 
            }
          </style>
        </head>
        <body>
          <div class="offline-message">
            <h1>You're Offline</h1>
            <p>Please check your internet connection and try again.</p>
            <button class="retry-btn" onclick="window.location.reload()">Retry</button>
          </div>
        </body>
      </html>`,
      {
        headers: {
          'Content-Type': 'text/html',
          'Cache-Control': 'no-cache'
        }
      }
    );
  }
}

// Handle generic requests
async function handleGenericRequest(request) {
  try {
    return await fetch(request);
  } catch (error) {
    const cachedResponse = await caches.match(request);
    return cachedResponse || new Response('Content not available offline', { status: 503 });
  }
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'background-sync-cart') {
    event.waitUntil(syncCartData());
  } else if (event.tag === 'background-sync-analytics') {
    event.waitUntil(syncAnalyticsData());
  } else if (event.tag === 'background-sync-wishlist') {
    event.waitUntil(syncWishlistData());
  } else if (event.tag === 'background-sync-orders') {
    event.waitUntil(syncOrderData());
  }
});

// Sync cart data when back online
async function syncCartData() {
  try {
    // Get pending cart actions from IndexedDB
    const pendingActions = await getPendingCartActions();
    
    for (const action of pendingActions) {
      try {
        await fetch('/api/cart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(action)
        });
        
        // Remove from pending actions
        await removePendingCartAction(action.id);
      } catch (error) {
        console.error('[SW] Failed to sync cart action:', error);
      }
    }
  } catch (error) {
    console.error('[SW] Cart sync failed:', error);
  }
}

// Sync analytics data when back online
async function syncAnalyticsData() {
  try {
    const pendingEvents = await getPendingAnalyticsEvents();
    
    for (const event of pendingEvents) {
      try {
        await fetch('/api/analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(event)
        });
        
        await removePendingAnalyticsEvent(event.id);
      } catch (error) {
        console.error('[SW] Failed to sync analytics event:', error);
      }
    }
  } catch (error) {
    console.error('[SW] Analytics sync failed:', error);
  }
}

// Sync wishlist data when back online
async function syncWishlistData() {
  try {
    const pendingWishlist = await getPendingWishlistActions();
    
    for (const action of pendingWishlist) {
      try {
        await fetch('/api/wishlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(action)
        });
        
        await removePendingWishlistAction(action.id);
      } catch (error) {
        console.error('[SW] Failed to sync wishlist action:', error);
      }
    }
  } catch (error) {
    console.error('[SW] Wishlist sync failed:', error);
  }
}

// Sync order data when back online
async function syncOrderData() {
  try {
    const pendingOrders = await getPendingOrderActions();
    
    for (const action of pendingOrders) {
      try {
        await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(action)
        });
        
        await removePendingOrderAction(action.id);
      } catch (error) {
        console.error('[SW] Failed to sync order action:', error);
      }
    }
  } catch (error) {
    console.error('[SW] Order sync failed:', error);
  }
}

// IndexedDB helpers (simplified - would need full implementation)
async function getPendingCartActions() {
  // Implementation would use IndexedDB to get pending actions
  return [];
}

async function removePendingCartAction(id) {
  // Implementation would remove action from IndexedDB
}

async function getPendingAnalyticsEvents() {
  // Implementation would use IndexedDB to get pending events
  return [];
}

async function removePendingAnalyticsEvent(id) {
  // Implementation would remove event from IndexedDB
}

async function getPendingWishlistActions() {
  // Implementation would use IndexedDB to get pending wishlist actions
  return [];
}

async function removePendingWishlistAction(id) {
  // Implementation would remove wishlist action from IndexedDB
}

async function getPendingOrderActions() {
  // Implementation would use IndexedDB to get pending order actions
  return [];
}

async function removePendingOrderAction(id) {
  // Implementation would remove order action from IndexedDB
}

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  let notificationData = {
    title: 'Snatchers',
    body: 'You have a new notification',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      url: '/'
    },
    actions: [],
    requireInteraction: false,
    silent: false
  };
  
  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        ...notificationData,
        title: data.title || notificationData.title,
        body: data.body || notificationData.body,
        icon: data.icon || notificationData.icon,
        badge: data.badge || notificationData.badge,
        data: {
          ...notificationData.data,
          ...data.data
        },
        actions: data.actions || [],
        requireInteraction: data.requireInteraction || false,
        silent: data.silent || false,
        tag: data.data?.notificationId || 'default'
      };
      
      // Add vibration pattern based on priority
      if (data.data?.priority === 'high') {
        notificationData.vibrate = [200, 100, 200];
        notificationData.requireInteraction = true;
      } else if (data.data?.priority === 'low') {
        notificationData.vibrate = [50];
        notificationData.silent = true;
      }
      
    } catch (error) {
      console.error('[SW] Error parsing push data:', error);
    }
  }
  
  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action, event.notification.data);
  
  event.notification.close();
  
  const notificationData = event.notification.data || {};
  let targetUrl = notificationData.url || '/';
  
  // Handle different actions
  if (event.action === 'view' && notificationData.actionUrl) {
    targetUrl = notificationData.actionUrl;
  } else if (event.action === 'close') {
    return; // Just close the notification
  }
  
  // Open the target URL
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window/tab open with the target URL
        for (const client of clientList) {
          if (client.url === targetUrl && 'focus' in client) {
            return client.focus();
          }
        }
        
        // If no existing window/tab, open a new one
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
      .catch((error) => {
        console.error('[SW] Error handling notification click:', error);
      })
  );
});

// Handle notification close events
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed:', event.notification.data);
  
  // Track notification dismissal analytics if needed
  const notificationData = event.notification.data || {};
  if (notificationData.notificationId) {
    // Could send analytics data about notification dismissal
    console.log('[SW] Notification dismissed:', notificationData.notificationId);
  }
});

// Cache management - clean up old entries
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (event.data && event.data.type === 'CACHE_CLEANUP') {
    event.waitUntil(cleanupCaches());
  }
});

async function cleanupCaches() {
  const cacheNames = await caches.keys();
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();
    
    // Remove old entries (older than 7 days)
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    
    for (const request of requests) {
      const response = await cache.match(request);
      const dateHeader = response.headers.get('date');
      
      if (dateHeader) {
        const responseDate = new Date(dateHeader).getTime();
        if (responseDate < oneWeekAgo) {
          await cache.delete(request);
        }
      }
    }
  }
  
  console.log('[SW] Cache cleanup completed');
}
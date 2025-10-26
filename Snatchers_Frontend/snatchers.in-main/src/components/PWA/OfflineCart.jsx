import React, { useState, useEffect, useContext } from 'react';
import { CartContext } from '../../contexts/CartContext';
import offlineStorage from '../../utils/offlineStorage';

const OfflineCart = () => {
  const { cartItems, updateCartFromOffline } = useContext(CartContext);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState('idle'); // idle, syncing, success, error

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      await syncOfflineCart();
    };

    const handleOffline = async () => {
      setIsOnline(false);
      await saveCartOffline();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initialize offline storage and load cart if offline
    initializeOfflineCart();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Save cart to offline storage whenever cart changes
  useEffect(() => {
    if (!isOnline && cartItems.length > 0) {
      saveCartOffline();
    }
  }, [cartItems, isOnline]);

  const initializeOfflineCart = async () => {
    try {
      await offlineStorage.init();
      
      // If offline, load cart from storage
      if (!navigator.onLine) {
        const offlineCart = await offlineStorage.getCart();
        if (offlineCart.length > 0) {
          updateCartFromOffline(offlineCart);
        }
      }
    } catch (error) {
      console.error('[OfflineCart] Initialization failed:', error);
    }
  };

  const saveCartOffline = async () => {
    try {
      await offlineStorage.saveCart(cartItems);
      console.log('[OfflineCart] Cart saved offline');
    } catch (error) {
      console.error('[OfflineCart] Failed to save cart offline:', error);
    }
  };

  const syncOfflineCart = async () => {
    if (syncStatus === 'syncing') return;

    setSyncStatus('syncing');
    
    try {
      // Get offline cart
      const offlineCart = await offlineStorage.getCart();
      
      if (offlineCart.length > 0) {
        // Sync with server
        const response = await fetch('/api/cart/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ items: offlineCart }),
        });

        if (response.ok) {
          const syncedCart = await response.json();
          updateCartFromOffline(syncedCart.items || []);
          
          // Clear offline cart after successful sync
          await offlineStorage.saveCart([]);
          
          setSyncStatus('success');
          
          // Track sync success
          if (window.gtag) {
            window.gtag('event', 'offline_cart_sync', {
              event_category: 'PWA',
              event_label: 'Success',
              value: offlineCart.length
            });
          }
        } else {
          throw new Error('Sync failed');
        }
      } else {
        setSyncStatus('idle');
      }
    } catch (error) {
      console.error('[OfflineCart] Sync failed:', error);
      setSyncStatus('error');
      
      // Track sync error
      if (window.gtag) {
        window.gtag('event', 'offline_cart_sync', {
          event_category: 'PWA',
          event_label: 'Error'
        });
      }
    }

    // Reset status after delay
    setTimeout(() => {
      setSyncStatus('idle');
    }, 3000);
  };

  const retrySyncOffline = () => {
    if (isOnline) {
      syncOfflineCart();
    }
  };

  // Don't render anything if online and no sync needed
  if (isOnline && syncStatus === 'idle') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-40">
      {/* Offline indicator */}
      {!isOnline && (
        <div className="bg-yellow-500 text-black px-4 py-2 rounded-lg shadow-lg mb-2 text-sm">
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span>Cart saved offline</span>
          </div>
        </div>
      )}

      {/* Sync status indicators */}
      {syncStatus === 'syncing' && (
        <div className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg mb-2 text-sm">
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Syncing cart...</span>
          </div>
        </div>
      )}

      {syncStatus === 'success' && (
        <div className="bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg mb-2 text-sm">
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Cart synced successfully</span>
          </div>
        </div>
      )}

      {syncStatus === 'error' && (
        <div className="bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg mb-2 text-sm">
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span>Sync failed</span>
            <button
              onClick={retrySyncOffline}
              className="ml-2 underline hover:no-underline"
            >
              Retry
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OfflineCart;
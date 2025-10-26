import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import api from '../api';
import { 
  getGuestCart, 
  setGuestCart, 
  addGuestCartItem, 
  removeGuestCartItem,
  updateGuestCartItem 
} from '../utils/guestCart';

const CartContext = createContext();

const initialState = {
  cartItems: [],
  totalPrice: 0,
  totalItems: 0,
  loading: false,
  error: null,
  isDrawerOpen: false,
  validationResults: null,
};

const cartReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    
    case 'SET_CART_DATA':
      return {
        ...state,
        cartItems: action.payload.items || [],
        totalPrice: action.payload.totalPrice || 0,
        totalItems: action.payload.totalItems || 0,
        loading: false,
        error: null,
      };
    
    case 'ADD_TO_CART_SUCCESS':
      return {
        ...state,
        cartItems: action.payload.items || [],
        totalPrice: action.payload.totalPrice || 0,
        totalItems: action.payload.totalItems || 0,
        loading: false,
        error: null,
      };
    
    case 'REMOVE_FROM_CART_SUCCESS':
      return {
        ...state,
        cartItems: state.cartItems.filter(item => 
          !(item.product._id === action.payload.productId && 
            JSON.stringify(item.selectedVariant) === JSON.stringify(action.payload.selectedVariant))
        ),
        loading: false,
      };
    
    case 'UPDATE_QUANTITY_SUCCESS':
      return {
        ...state,
        cartItems: action.payload.items || [],
        totalPrice: action.payload.totalPrice || 0,
        totalItems: action.payload.totalItems || 0,
        loading: false,
        error: null,
      };
    
    case 'TOGGLE_DRAWER':
      return { ...state, isDrawerOpen: !state.isDrawerOpen };
    
    case 'SET_DRAWER_OPEN':
      return { ...state, isDrawerOpen: action.payload };
    
    case 'SET_VALIDATION_RESULTS':
      return { ...state, validationResults: action.payload };
    
    case 'CLEAR_CART':
      return { ...initialState };

    default:
      return state;
  }
};

export { CartContext };

export const CartProvider = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  // Load cart data on mount
  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        // Load guest cart
        const guestItems = getGuestCart();
        const totalPrice = guestItems.reduce((sum, item) => 
          sum + (item.price || 0) * (item.quantity || 1), 0
        );
        const totalItems = guestItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
        
        dispatch({
          type: 'SET_CART_DATA',
          payload: {
            items: guestItems.map(item => ({ product: item, quantity: item.quantity || 1 })),
            totalPrice,
            totalItems,
          },
        });
        return;
      }

      const response = await api.get('/api/cart');
      dispatch({ type: 'SET_CART_DATA', payload: response.data });
    } catch (error) {
      console.error('Failed to load cart:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load cart' });
    }
  }, []);

  const addToCart = useCallback(async (product, quantity = 1, selectedVariant = null) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        // Guest cart handling
        addGuestCartItem({ ...product, quantity, selectedVariant });
        await loadCart();
        return { success: true };
      }

      const response = await api.post(`/api/cart/${product._id}`, {
        quantity,
        selectedVariant,
      });
      
      dispatch({ type: 'ADD_TO_CART_SUCCESS', payload: response.data });
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to add item to cart';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      return { 
        success: false, 
        error: errorMessage,
        availableQuantity: error.response?.data?.availableQuantity 
      };
    }
  }, [loadCart]);

  const removeFromCart = useCallback(async (productId, selectedVariant = null) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        // Guest cart handling
        removeGuestCartItem(productId);
        await loadCart();
        return { success: true };
      }

      await api.delete(`/api/cart/${productId}`, {
        data: { selectedVariant }
      });
      
      dispatch({ 
        type: 'REMOVE_FROM_CART_SUCCESS', 
        payload: { productId, selectedVariant } 
      });
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to remove item from cart';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      return { success: false, error: errorMessage };
    }
  }, [loadCart]);

  const updateQuantity = useCallback(async (productId, quantity, selectedVariant = null) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        // Guest cart handling
        updateGuestCartItem(productId, quantity, selectedVariant);
        await loadCart();
        return { success: true };
      }

      const response = await api.put(`/api/cart/${productId}`, {
        quantity,
        selectedVariant,
      });
      
      dispatch({ type: 'UPDATE_QUANTITY_SUCCESS', payload: response.data });
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Failed to update quantity';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      return { 
        success: false, 
        error: errorMessage,
        availableQuantity: error.response?.data?.availableQuantity 
      };
    }
  }, [loadCart]);

  const validateCart = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        // For guest cart, we can't validate against real inventory
        return { valid: true, items: [] };
      }

      const response = await api.post('/api/cart/validate');
      dispatch({ type: 'SET_VALIDATION_RESULTS', payload: response.data });
      return response.data;
    } catch (error) {
      console.error('Failed to validate cart:', error);
      return { valid: false, error: 'Failed to validate cart' };
    }
  }, []);

  const toggleDrawer = useCallback(() => {
    dispatch({ type: 'TOGGLE_DRAWER' });
  }, []);

  const setDrawerOpen = useCallback((isOpen) => {
    dispatch({ type: 'SET_DRAWER_OPEN', payload: isOpen });
  }, []);

  const clearCart = useCallback(() => {
    dispatch({ type: 'CLEAR_CART' });
    const token = localStorage.getItem('token');
    if (!token) {
      setGuestCart([]);
    }
  }, []);

  const value = {
    ...state,
    addToCart,
    removeFromCart,
    updateQuantity,
    validateCart,
    toggleDrawer,
    setDrawerOpen,
    clearCart,
    loadCart,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

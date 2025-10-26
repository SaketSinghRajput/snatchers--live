// Enhanced localStorage-backed guest cart helper with variant support
const KEY = 'guest_cart_v2';

export function getGuestCart() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const items = JSON.parse(raw);
    
    // Ensure all items have required fields
    return items.map(item => ({
      ...item,
      quantity: item.quantity || 1,
      selectedVariant: item.selectedVariant || null,
      addedAt: item.addedAt || new Date().toISOString(),
    }));
  } catch (e) {
    console.error('Failed to read guest cart', e);
    return [];
  }
}

export function setGuestCart(items) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent('cart:changed', { detail: items }));
  } catch (e) {
    console.error('Failed to write guest cart', e);
  }
}

export function addGuestCartItem(product, quantity = 1, selectedVariant = null) {
  const items = getGuestCart();
  const existingIndex = items.findIndex((p) => 
    String(p._id) === String(product._id) && 
    JSON.stringify(p.selectedVariant) === JSON.stringify(selectedVariant)
  );
  
  if (existingIndex !== -1) {
    // Update existing item quantity
    items[existingIndex].quantity += quantity;
  } else {
    // Add new item
    items.push({ 
      ...product, 
      quantity,
      selectedVariant,
      addedAt: new Date().toISOString(),
    });
  }
  
  setGuestCart(items);
}

export function updateGuestCartItem(productId, quantity, selectedVariant = null) {
  const items = getGuestCart();
  const existingIndex = items.findIndex((p) => 
    String(p._id) === String(productId) && 
    JSON.stringify(p.selectedVariant) === JSON.stringify(selectedVariant)
  );
  
  if (existingIndex !== -1) {
    if (quantity <= 0) {
      // Remove item if quantity is 0 or less
      items.splice(existingIndex, 1);
    } else {
      items[existingIndex].quantity = quantity;
    }
    setGuestCart(items);
  }
}

export function removeGuestCartItem(productId, selectedVariant = null) {
  let items = getGuestCart();
  items = items.filter((p) => 
    !(String(p._id) === String(productId) && 
      JSON.stringify(p.selectedVariant) === JSON.stringify(selectedVariant))
  );
  setGuestCart(items);
}

export function guestCartIncludes(productId, selectedVariant = null) {
  const items = getGuestCart();
  return items.some((p) => 
    String(p._id) === String(productId) && 
    JSON.stringify(p.selectedVariant) === JSON.stringify(selectedVariant)
  );
}

export function getGuestCartItemCount() {
  const items = getGuestCart();
  return items.reduce((total, item) => total + (item.quantity || 1), 0);
}

export function getGuestCartTotal() {
  const items = getGuestCart();
  return items.reduce((total, item) => {
    const price = item.offerPrice || item.price || 0;
    return total + (price * (item.quantity || 1));
  }, 0);
}

export function clearGuestCart() {
  setGuestCart([]);
}

export default {
  getGuestCart,
  setGuestCart,
  addGuestCartItem,
  updateGuestCartItem,
  removeGuestCartItem,
  guestCartIncludes,
  getGuestCartItemCount,
  getGuestCartTotal,
  clearGuestCart,
};

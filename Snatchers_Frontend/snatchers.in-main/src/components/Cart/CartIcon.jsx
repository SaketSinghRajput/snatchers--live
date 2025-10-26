import React from 'react';
import { ShoppingBag } from 'lucide-react';
import { useCart } from '../../contexts/CartContext';
import { motion, AnimatePresence } from 'framer-motion';

const CartIcon = ({ className = '' }) => {
  const { totalItems, toggleDrawer } = useCart();

  return (
    <button
      onClick={toggleDrawer}
      className={`relative p-2 hover:bg-gray-100 rounded-full transition-colors ${className}`}
      aria-label={`Shopping cart with ${totalItems} items`}
    >
      <ShoppingBag className="w-6 h-6" />
      
      <AnimatePresence>
        {totalItems > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[1.25rem] h-5 flex items-center justify-center px-1"
          >
            {totalItems > 99 ? '99+' : totalItems}
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
};

export default CartIcon;
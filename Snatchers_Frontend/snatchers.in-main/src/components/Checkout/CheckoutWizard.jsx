import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../../contexts/CartContext';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  ChevronRight, 
  MapPin, 
  CreditCard, 
  Eye, 
  Check,
  AlertCircle,
  Truck
} from 'lucide-react';
import AddressStep from './AddressStep';
import PaymentStep from './PaymentStep';
import ReviewStep from './ReviewStep';

const CheckoutWizard = () => {
  const { cartItems, totalPrice, totalItems, validateCart, clearCart } = useCart();
  const navigate = useNavigate();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [checkoutData, setCheckoutData] = useState({
    shippingAddress: null,
    billingAddress: null,
    paymentMethod: null,
    paymentDetails: null,
    shippingMethod: 'standard',
    specialInstructions: '',
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [calculations, setCalculations] = useState({
    subtotal: 0,
    shipping: 0,
    tax: 0,
    discount: 0,
    total: 0,
  });

  const steps = [
    { 
      id: 1, 
      title: 'Shipping', 
      icon: MapPin, 
      description: 'Enter your shipping address' 
    },
    { 
      id: 2, 
      title: 'Payment', 
      icon: CreditCard, 
      description: 'Choose payment method' 
    },
    { 
      id: 3, 
      title: 'Review', 
      icon: Eye, 
      description: 'Review your order' 
    },
  ];

  // Redirect if cart is empty
  useEffect(() => {
    if (cartItems.length === 0) {
      navigate('/cart');
    }
  }, [cartItems.length, navigate]);

  // Calculate totals when cart or checkout data changes
  useEffect(() => {
    calculateTotals();
  }, [cartItems, checkoutData.shippingMethod]);

  // Validate cart on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      validateCart();
    }
  }, [validateCart]);

  const calculateTotals = () => {
    const subtotal = cartItems.reduce((sum, item) => {
      const product = item.product || item;
      const price = product.offerPrice || product.price || 0;
      return sum + (price * (item.quantity || 1));
    }, 0);

    // Calculate shipping based on method
    let shipping = 0;
    if (checkoutData.shippingMethod === 'express') {
      shipping = subtotal > 1000 ? 99 : 149;
    } else if (checkoutData.shippingMethod === 'overnight') {
      shipping = subtotal > 2000 ? 199 : 299;
    } else {
      // Standard shipping - free over 500
      shipping = subtotal > 500 ? 0 : 50;
    }

    // Calculate tax (18% GST)
    const tax = Math.round((subtotal + shipping) * 0.18);

    // Apply discounts (placeholder logic)
    let discount = 0;
    if (subtotal > 2000) {
      discount = Math.round(subtotal * 0.05); // 5% discount for orders over 2000
    }

    const total = subtotal + shipping + tax - discount;

    setCalculations({
      subtotal,
      shipping,
      tax,
      discount,
      total,
    });
  };

  const updateCheckoutData = (stepData) => {
    setCheckoutData(prev => ({ ...prev, ...stepData }));
  };

  const canProceedToNext = () => {
    switch (currentStep) {
      case 1:
        return checkoutData.shippingAddress !== null;
      case 2:
        return checkoutData.paymentMethod !== null;
      case 3:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (canProceedToNext() && currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (stepId) => {
    // Allow going back to completed steps
    if (stepId < currentStep) {
      setCurrentStep(stepId);
    }
    // Allow going forward if all previous steps are completed
    else if (stepId === currentStep + 1 && canProceedToNext()) {
      setCurrentStep(stepId);
    }
  };

  const handlePlaceOrder = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      
      // Prepare order data
      const orderData = {
        items: cartItems.map(item => ({
          productId: item.product?._id || item._id,
          quantity: item.quantity || 1,
          selectedVariant: item.selectedVariant
        })),
        shippingAddress: checkoutData.shippingAddress,
        paymentMethod: checkoutData.paymentMethod,
        paymentDetails: checkoutData.paymentDetails,
        shippingMethod: checkoutData.shippingMethod,
        specialInstructions: checkoutData.specialInstructions,
        calculations: calculations
      };

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify(orderData)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.message || 'Failed to place order');
      }

      // Clear cart after successful order
      if (token) {
        // Clear server cart
        try {
          await fetch('/api/cart', {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
        } catch (error) {
          console.error('Failed to clear server cart:', error);
        }
      }
      clearCart();

      // Redirect to order confirmation page
      navigate(`/order-confirmation/${result.order.orderId}`, {
        state: { order: result.order }
      });

    } catch (error) {
      console.error('Order placement error:', error);
      setError(error.message || 'Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <AddressStep
            checkoutData={checkoutData}
            updateCheckoutData={updateCheckoutData}
            calculations={calculations}
          />
        );
      case 2:
        return (
          <PaymentStep
            checkoutData={checkoutData}
            updateCheckoutData={updateCheckoutData}
            calculations={calculations}
          />
        );
      case 3:
        return (
          <ReviewStep
            checkoutData={checkoutData}
            updateCheckoutData={updateCheckoutData}
            calculations={calculations}
            cartItems={cartItems}
            onPlaceOrder={handlePlaceOrder}
          />
        );
      default:
        return null;
    }
  };

  if (cartItems.length === 0) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Checkout</h1>
          <p className="text-gray-600">Complete your purchase in {steps.length} easy steps</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const isCompleted = currentStep > step.id;
              const isCurrent = currentStep === step.id;
              const isClickable = step.id < currentStep || (step.id === currentStep + 1 && canProceedToNext());
              
              return (
                <React.Fragment key={step.id}>
                  <div 
                    className={`flex flex-col items-center cursor-pointer ${
                      isClickable ? 'hover:opacity-80' : 'cursor-default'
                    }`}
                    onClick={() => isClickable && handleStepClick(step.id)}
                  >
                    <div className={`
                      w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-200
                      ${isCompleted 
                        ? 'bg-green-500 border-green-500 text-white' 
                        : isCurrent 
                          ? 'bg-black border-black text-white' 
                          : 'bg-white border-gray-300 text-gray-400'
                      }
                    `}>
                      {isCompleted ? (
                        <Check className="w-6 h-6" />
                      ) : (
                        <step.icon className="w-6 h-6" />
                      )}
                    </div>
                    <div className="mt-2 text-center">
                      <div className={`text-sm font-medium ${
                        isCurrent ? 'text-black' : isCompleted ? 'text-green-600' : 'text-gray-400'
                      }`}>
                        {step.title}
                      </div>
                      <div className="text-xs text-gray-500 hidden sm:block">
                        {step.description}
                      </div>
                    </div>
                  </div>
                  
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-4 ${
                      currentStep > step.id ? 'bg-green-500' : 'bg-gray-300'
                    }`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        {/* Step Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="bg-white rounded-lg shadow-sm border p-6"
              >
                {renderStepContent()}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border p-6 sticky top-4">
              <h3 className="text-lg font-semibold mb-4">Order Summary</h3>
              
              {/* Items */}
              <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
                {cartItems.map((item) => {
                  const product = item.product || item;
                  const itemKey = `${product._id}-${JSON.stringify(item.selectedVariant)}`;
                  
                  return (
                    <div key={itemKey} className="flex gap-3">
                      <div className="w-12 h-12 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                        <img
                          src={product.images?.[0] || '/placeholder.png'}
                          alt={product.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium truncate">{product.title}</h4>
                        <p className="text-xs text-gray-500">Qty: {item.quantity || 1}</p>
                        <p className="text-sm font-semibold">
                          ₹{((product.offerPrice || product.price) * (item.quantity || 1)).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Calculations */}
              <div className="space-y-2 border-t pt-4">
                <div className="flex justify-between text-sm">
                  <span>Subtotal ({totalItems} items):</span>
                  <span>₹{calculations.subtotal.toLocaleString()}</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-1">
                    <Truck className="w-4 h-4" />
                    Shipping:
                  </span>
                  <span className={calculations.shipping === 0 ? 'text-green-600' : ''}>
                    {calculations.shipping === 0 ? 'Free' : `₹${calculations.shipping.toLocaleString()}`}
                  </span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span>Tax (GST):</span>
                  <span>₹{calculations.tax.toLocaleString()}</span>
                </div>
                
                {calculations.discount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount:</span>
                    <span>-₹{calculations.discount.toLocaleString()}</span>
                  </div>
                )}
                
                <hr />
                
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total:</span>
                  <span>₹{calculations.total.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="mt-8 flex justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className="flex items-center gap-2 px-6 py-3 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>

          {currentStep < steps.length ? (
            <button
              onClick={handleNext}
              disabled={!canProceedToNext() || loading}
              className="flex items-center gap-2 px-6 py-3 bg-black text-white rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handlePlaceOrder}
              disabled={loading || !canProceedToNext()}
              className="px-8 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Processing...' : 'Place Order'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CheckoutWizard;
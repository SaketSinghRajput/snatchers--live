import React, { useState } from 'react';
import { 
  MapPin, 
  CreditCard, 
  Truck, 
  Edit2, 
  Package,
  Clock,
  Shield,
  CheckCircle
} from 'lucide-react';

const ReviewStep = ({ checkoutData, updateCheckoutData, calculations, cartItems, onPlaceOrder }) => {
  const [specialInstructions, setSpecialInstructions] = useState(checkoutData.specialInstructions || '');
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSpecialInstructionsChange = (value) => {
    setSpecialInstructions(value);
    updateCheckoutData({ specialInstructions: value });
  };

  const handlePlaceOrder = async () => {
    if (!agreeToTerms) {
      alert('Please agree to the terms and conditions');
      return;
    }

    setLoading(true);
    try {
      await onPlaceOrder();
    } catch (error) {
      console.error('Order placement failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPaymentMethodDisplay = () => {
    const method = checkoutData.paymentMethod;
    const details = checkoutData.paymentDetails;

    switch (method) {
      case 'card':
        return {
          name: 'Credit/Debit Card',
          details: details?.cardNumber ? `**** **** **** ${details.cardNumber.slice(-4)}` : 'Card details entered',
          icon: CreditCard
        };
      case 'upi':
        return {
          name: 'UPI',
          details: details?.upiId || 'UPI ID entered',
          icon: CreditCard
        };
      case 'netbanking':
        return {
          name: 'Net Banking',
          details: details?.bank ? `${details.bank.toUpperCase()} Bank` : 'Bank selected',
          icon: CreditCard
        };
      case 'wallet':
        return {
          name: 'Digital Wallet',
          details: details?.wallet ? details.wallet.replace('pay', ' Pay') : 'Wallet selected',
          icon: CreditCard
        };
      case 'cod':
        return {
          name: 'Cash on Delivery',
          details: 'Pay when delivered',
          icon: Package
        };
      default:
        return {
          name: 'Payment Method',
          details: 'Not selected',
          icon: CreditCard
        };
    }
  };

  const getShippingMethodDisplay = () => {
    const method = checkoutData.shippingMethod;
    switch (method) {
      case 'standard':
        return { name: 'Standard Delivery', time: '5-7 business days' };
      case 'express':
        return { name: 'Express Delivery', time: '2-3 business days' };
      case 'overnight':
        return { name: 'Overnight Delivery', time: 'Next business day' };
      default:
        return { name: 'Standard Delivery', time: '5-7 business days' };
    }
  };

  const paymentMethod = getPaymentMethodDisplay();
  const shippingMethod = getShippingMethodDisplay();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-6">Review Your Order</h2>
        
        {/* Order Items */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="font-medium mb-4 flex items-center gap-2">
            <Package className="w-4 h-4" />
            Order Items ({cartItems.length})
          </h3>
          
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {cartItems.map((item) => {
              const product = item.product || item;
              const itemKey = `${product._id}-${JSON.stringify(item.selectedVariant)}`;
              
              return (
                <div key={itemKey} className="flex gap-3 p-3 bg-white rounded border">
                  <div className="w-16 h-16 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                    <img
                      src={product.images?.[0] || '/placeholder.png'}
                      alt={product.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">{product.title}</h4>
                    {item.selectedVariant && (
                      <p className="text-xs text-gray-500">
                        {Object.entries(item.selectedVariant).map(([key, value]) => 
                          `${key}: ${value}`
                        ).join(', ')}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-gray-500">Qty: {item.quantity || 1}</span>
                      <span className="font-semibold text-sm">
                        ₹{((product.offerPrice || product.price) * (item.quantity || 1)).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Shipping Address */}
        <div className="border rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Shipping Address
            </h3>
            <button 
              onClick={() => window.history.back()}
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <Edit2 className="w-3 h-3" />
              Edit
            </button>
          </div>
          
          {checkoutData.shippingAddress ? (
            <div className="text-sm text-gray-600">
              <p className="font-medium text-gray-900">
                {checkoutData.shippingAddress.firstName} {checkoutData.shippingAddress.lastName}
              </p>
              <p>{checkoutData.shippingAddress.street}</p>
              <p>
                {checkoutData.shippingAddress.city}, {checkoutData.shippingAddress.state} {checkoutData.shippingAddress.zipCode}
              </p>
              <p>Phone: {checkoutData.shippingAddress.phone}</p>
            </div>
          ) : (
            <p className="text-sm text-red-600">No shipping address selected</p>
          )}
        </div>

        {/* Payment Method */}
        <div className="border rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium flex items-center gap-2">
              <paymentMethod.icon className="w-4 h-4" />
              Payment Method
            </h3>
            <button 
              onClick={() => window.history.back()}
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <Edit2 className="w-3 h-3" />
              Edit
            </button>
          </div>
          
          <div className="text-sm text-gray-600">
            <p className="font-medium text-gray-900">{paymentMethod.name}</p>
            <p>{paymentMethod.details}</p>
          </div>
        </div>

        {/* Shipping Method */}
        <div className="border rounded-lg p-4 mb-6">
          <h3 className="font-medium flex items-center gap-2 mb-3">
            <Truck className="w-4 h-4" />
            Shipping Method
          </h3>
          
          <div className="text-sm text-gray-600">
            <p className="font-medium text-gray-900">{shippingMethod.name}</p>
            <p className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {shippingMethod.time}
            </p>
          </div>
        </div>

        {/* Special Instructions */}
        <div className="border rounded-lg p-4 mb-6">
          <h3 className="font-medium mb-3">Special Instructions (Optional)</h3>
          <textarea
            value={specialInstructions}
            onChange={(e) => handleSpecialInstructionsChange(e.target.value)}
            placeholder="Any special delivery instructions..."
            rows={3}
            className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-black focus:border-transparent resize-none"
          />
        </div>

        {/* Order Summary */}
        <div className="border rounded-lg p-4 mb-6">
          <h3 className="font-medium mb-4">Order Summary</h3>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Subtotal ({cartItems.length} items):</span>
              <span>₹{calculations.subtotal.toLocaleString()}</span>
            </div>
            
            <div className="flex justify-between">
              <span>Shipping:</span>
              <span className={calculations.shipping === 0 ? 'text-green-600' : ''}>
                {calculations.shipping === 0 ? 'Free' : `₹${calculations.shipping.toLocaleString()}`}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span>Tax (GST):</span>
              <span>₹{calculations.tax.toLocaleString()}</span>
            </div>
            
            {calculations.discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount:</span>
                <span>-₹{calculations.discount.toLocaleString()}</span>
              </div>
            )}
            
            <hr className="my-2" />
            
            <div className="flex justify-between font-semibold text-lg">
              <span>Total:</span>
              <span>₹{calculations.total.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Terms and Conditions */}
        <div className="border rounded-lg p-4 mb-6">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={agreeToTerms}
              onChange={(e) => setAgreeToTerms(e.target.checked)}
              className="mt-1"
            />
            <div className="text-sm">
              <p>
                I agree to the{' '}
                <a href="/terms" target="_blank" className="text-blue-600 hover:underline">
                  Terms and Conditions
                </a>{' '}
                and{' '}
                <a href="/privacy" target="_blank" className="text-blue-600 hover:underline">
                  Privacy Policy
                </a>
              </p>
            </div>
          </label>
        </div>

        {/* Security Notice */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-green-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-green-800 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Secure Checkout
              </h4>
              <p className="text-sm text-green-700 mt-1">
                Your order and payment information is encrypted and secure. You will receive an order confirmation email shortly after placing your order.
              </p>
            </div>
          </div>
        </div>

        {/* Place Order Button */}
        <button
          onClick={handlePlaceOrder}
          disabled={!agreeToTerms || loading || !checkoutData.shippingAddress || !checkoutData.paymentMethod}
          className="w-full py-4 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Processing Order...
            </>
          ) : (
            <>
              <CheckCircle className="w-5 h-5" />
              Place Order - ₹{calculations.total.toLocaleString()}
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default ReviewStep;
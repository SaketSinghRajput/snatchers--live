import React, { useState } from 'react';
import { 
  CreditCard, 
  Smartphone, 
  Banknote, 
  Shield, 
  Lock,
  Eye,
  EyeOff,
  Wallet,
  Building2
} from 'lucide-react';

const PaymentStep = ({ checkoutData, updateCheckoutData, calculations }) => {
  const [showCardDetails, setShowCardDetails] = useState(false);
  const [cardData, setCardData] = useState({
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    cardholderName: '',
  });
  const [showCvv, setShowCvv] = useState(false);
  const [upiId, setUpiId] = useState('');

  const paymentMethods = [
    {
      id: 'card',
      name: 'Credit/Debit Card',
      description: 'Visa, Mastercard, RuPay',
      icon: CreditCard,
      popular: true,
    },
    {
      id: 'upi',
      name: 'UPI',
      description: 'Pay using UPI ID or QR code',
      icon: Smartphone,
      popular: true,
    },
    {
      id: 'netbanking',
      name: 'Net Banking',
      description: 'Pay directly from your bank account',
      icon: Building2,
    },
    {
      id: 'wallet',
      name: 'Digital Wallet',
      description: 'Paytm, PhonePe, Google Pay',
      icon: Wallet,
    },
    {
      id: 'cod',
      name: 'Cash on Delivery',
      description: 'Pay when your order is delivered',
      icon: Banknote,
    },
  ];

  const handlePaymentMethodChange = (methodId) => {
    updateCheckoutData({ 
      paymentMethod: methodId,
      paymentDetails: null 
    });
    setShowCardDetails(methodId === 'card');
  };

  const handleCardDataChange = (field, value) => {
    let formattedValue = value;
    
    // Format card number with spaces
    if (field === 'cardNumber') {
      formattedValue = value.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim();
      if (formattedValue.length > 19) return; // Max 16 digits + 3 spaces
    }
    
    // Format expiry inputs
    if (field === 'expiryMonth' || field === 'expiryYear') {
      formattedValue = value.replace(/\D/g, '');
      if (field === 'expiryMonth' && formattedValue.length > 2) return;
      if (field === 'expiryYear' && formattedValue.length > 4) return;
    }
    
    // Format CVV
    if (field === 'cvv') {
      formattedValue = value.replace(/\D/g, '');
      if (formattedValue.length > 4) return;
    }

    const newCardData = { ...cardData, [field]: formattedValue };
    setCardData(newCardData);
    
    // Update checkout data if card is complete
    if (isCardDataComplete(newCardData)) {
      updateCheckoutData({ paymentDetails: newCardData });
    }
  };

  const isCardDataComplete = (data) => {
    return data.cardNumber.replace(/\s/g, '').length >= 13 &&
           data.expiryMonth.length === 2 &&
           data.expiryYear.length === 4 &&
           data.cvv.length >= 3 &&
           data.cardholderName.trim().length > 0;
  };

  const handleUpiSubmit = () => {
    if (upiId.includes('@') && upiId.length > 5) {
      updateCheckoutData({ paymentDetails: { upiId } });
    }
  };

  const getCardType = (cardNumber) => {
    const number = cardNumber.replace(/\s/g, '');
    if (number.startsWith('4')) return 'Visa';
    if (number.startsWith('5') || number.startsWith('2')) return 'Mastercard';
    if (number.startsWith('6')) return 'RuPay';
    return '';
  };

  const renderPaymentForm = () => {
    const selectedMethod = checkoutData.paymentMethod;

    switch (selectedMethod) {
      case 'card':
        return (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 mb-4">
              <Lock className="w-4 h-4 text-green-600" />
              <span className="text-sm text-gray-600">Your card details are secure and encrypted</span>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Card Number *</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="1234 5678 9012 3456"
                    value={cardData.cardNumber}
                    onChange={(e) => handleCardDataChange('cardNumber', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                  {cardData.cardNumber && (
                    <div className="absolute right-3 top-3 text-xs text-gray-500">
                      {getCardType(cardData.cardNumber)}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Cardholder Name *</label>
                <input
                  type="text"
                  placeholder="John Doe"
                  value={cardData.cardholderName}
                  onChange={(e) => handleCardDataChange('cardholderName', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-black focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Month *</label>
                  <input
                    type="text"
                    placeholder="MM"
                    value={cardData.expiryMonth}
                    onChange={(e) => handleCardDataChange('expiryMonth', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Year *</label>
                  <input
                    type="text"
                    placeholder="YYYY"
                    value={cardData.expiryYear}
                    onChange={(e) => handleCardDataChange('expiryYear', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">CVV *</label>
                  <div className="relative">
                    <input
                      type={showCvv ? 'text' : 'password'}
                      placeholder="123"
                      value={cardData.cvv}
                      onChange={(e) => handleCardDataChange('cvv', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-black focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCvv(!showCvv)}
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                    >
                      {showCvv ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'upi':
        return (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">UPI ID *</label>
                <input
                  type="text"
                  placeholder="yourname@paytm"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  onBlur={handleUpiSubmit}
                  className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-black focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter your UPI ID (e.g., yourname@paytm, yourname@phonepe)
                </p>
              </div>
            </div>
          </div>
        );

      case 'netbanking':
        return (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Select Your Bank</label>
                <select 
                  className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-black focus:border-transparent"
                  onChange={(e) => updateCheckoutData({ paymentDetails: { bank: e.target.value } })}
                >
                  <option value="">Choose your bank</option>
                  <option value="sbi">State Bank of India</option>
                  <option value="hdfc">HDFC Bank</option>
                  <option value="icici">ICICI Bank</option>
                  <option value="axis">Axis Bank</option>
                  <option value="kotak">Kotak Mahindra Bank</option>
                  <option value="pnb">Punjab National Bank</option>
                  <option value="other">Other Banks</option>
                </select>
              </div>
            </div>
          </div>
        );

      case 'wallet':
        return (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="space-y-3">
              <p className="text-sm font-medium">Select Wallet</p>
              {['paytm', 'phonepe', 'googlepay', 'amazonpay'].map((wallet) => (
                <label key={wallet} className="flex items-center gap-3 p-3 border rounded cursor-pointer hover:bg-white">
                  <input
                    type="radio"
                    name="wallet"
                    value={wallet}
                    onChange={(e) => updateCheckoutData({ paymentDetails: { wallet: e.target.value } })}
                    className="text-black"
                  />
                  <span className="capitalize">{wallet.replace('pay', ' Pay')}</span>
                </label>
              ))}
            </div>
          </div>
        );

      case 'cod':
        return (
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-3">
              <Banknote className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-800">Cash on Delivery</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  Pay ₹{calculations.total.toLocaleString()} when your order is delivered.
                </p>
                <p className="text-xs text-yellow-600 mt-2">
                  Please keep exact change ready for a smooth delivery experience.
                </p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Payment Method</h2>
        
        {/* Payment Methods */}
        <div className="space-y-3">
          {paymentMethods.map((method) => {
            const isSelected = checkoutData.paymentMethod === method.id;
            const Icon = method.icon;
            
            return (
              <div
                key={method.id}
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  isSelected 
                    ? 'border-black bg-gray-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handlePaymentMethodChange(method.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      isSelected ? 'border-black bg-black' : 'border-gray-300'
                    }`}>
                      {isSelected && (
                        <div className="w-full h-full rounded-full bg-white scale-50"></div>
                      )}
                    </div>
                    
                    <div className={`p-2 rounded-full ${
                      isSelected ? 'bg-black text-white' : 'bg-gray-100 text-gray-600'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{method.name}</span>
                        {method.popular && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                            Popular
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">{method.description}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-green-600" />
                    <span className="text-xs text-green-600">Secure</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Payment Form */}
        {renderPaymentForm()}
      </div>

      {/* Security Notice */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-800">Secure Payment</h4>
            <p className="text-sm text-blue-700 mt-1">
              Your payment information is encrypted and secure. We use industry-standard security measures to protect your data.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentStep;
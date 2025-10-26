import React, { useState, useEffect } from 'react';
import { Plus, MapPin, Home, Briefcase, Edit2, Trash2, Truck } from 'lucide-react';
import api from '../../api';

const AddressStep = ({ checkoutData, updateCheckoutData, calculations }) => {
  const [addresses, setAddresses] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [loading, setLoading] = useState(false);
  const [newAddress, setNewAddress] = useState({
    type: 'home',
    firstName: '',
    lastName: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'India',
    isDefault: false,
  });

  const shippingMethods = [
    {
      id: 'standard',
      name: 'Standard Delivery',
      description: '5-7 business days',
      price: calculations.subtotal > 500 ? 0 : 50,
      icon: Truck,
    },
    {
      id: 'express',
      name: 'Express Delivery',
      description: '2-3 business days',
      price: calculations.subtotal > 1000 ? 99 : 149,
      icon: Truck,
    },
    {
      id: 'overnight',
      name: 'Overnight Delivery',
      description: 'Next business day',
      price: calculations.subtotal > 2000 ? 199 : 299,
      icon: Truck,
    },
  ];

  useEffect(() => {
    loadAddresses();
  }, []);

  const loadAddresses = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await api.get('/api/user/addresses');
      setAddresses(response.data || []);
      
      // Auto-select default address if available
      const defaultAddress = response.data?.find(addr => addr.isDefault);
      if (defaultAddress && !checkoutData.shippingAddress) {
        updateCheckoutData({ shippingAddress: defaultAddress });
      }
    } catch (error) {
      console.error('Failed to load addresses:', error);
    }
  };

  const handleAddressSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        // For guest users, just add to local state
        const guestAddress = { ...newAddress, id: Date.now().toString() };
        setAddresses([guestAddress]);
        updateCheckoutData({ shippingAddress: guestAddress });
        setShowAddForm(false);
        resetForm();
        setLoading(false);
        return;
      }

      let response;
      if (editingAddress) {
        response = await api.put(`/api/user/addresses/${editingAddress.id}`, newAddress);
      } else {
        response = await api.post('/api/user/addresses', newAddress);
      }

      await loadAddresses();
      
      if (!editingAddress) {
        updateCheckoutData({ shippingAddress: response.data });
      }
      
      setShowAddForm(false);
      setEditingAddress(null);
      resetForm();
    } catch (error) {
      console.error('Failed to save address:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAddress = async (addressId) => {
    if (!window.confirm('Are you sure you want to delete this address?')) return;

    try {
      const token = localStorage.getItem('token');
      if (token) {
        await api.delete(`/api/user/addresses/${addressId}`);
      }
      
      await loadAddresses();
      
      // If deleted address was selected, clear selection
      if (checkoutData.shippingAddress?.id === addressId) {
        updateCheckoutData({ shippingAddress: null });
      }
    } catch (error) {
      console.error('Failed to delete address:', error);
    }
  };

  const handleEditAddress = (address) => {
    setNewAddress({ ...address });
    setEditingAddress(address);
    setShowAddForm(true);
  };

  const resetForm = () => {
    setNewAddress({
      type: 'home',
      firstName: '',
      lastName: '',
      phone: '',
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'India',
      isDefault: false,
    });
  };

  const getAddressIcon = (type) => {
    switch (type) {
      case 'home': return Home;
      case 'work': return Briefcase;
      default: return MapPin;
    }
  };

  const handleShippingMethodChange = (methodId) => {
    updateCheckoutData({ shippingMethod: methodId });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Shipping Address</h2>
        
        {/* Existing Addresses */}
        {addresses.length > 0 && (
          <div className="space-y-3 mb-4">
            {addresses.map((address) => {
              const Icon = getAddressIcon(address.type);
              const isSelected = checkoutData.shippingAddress?.id === address.id;
              
              return (
                <div
                  key={address.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    isSelected 
                      ? 'border-black bg-gray-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => updateCheckoutData({ shippingAddress: address })}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-full ${
                        isSelected ? 'bg-black text-white' : 'bg-gray-100 text-gray-600'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">
                            {address.firstName} {address.lastName}
                          </span>
                          <span className="text-xs bg-gray-200 px-2 py-1 rounded capitalize">
                            {address.type}
                          </span>
                          {address.isDefault && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                              Default
                            </span>
                          )}
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-1">
                          {address.street}
                        </p>
                        <p className="text-sm text-gray-600 mb-1">
                          {address.city}, {address.state} {address.zipCode}
                        </p>
                        <p className="text-sm text-gray-600">
                          Phone: {address.phone}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditAddress(address);
                        }}
                        className="p-1 text-gray-400 hover:text-gray-600"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteAddress(address.id);
                        }}
                        className="p-1 text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add New Address Button */}
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 w-full p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add New Address
          </button>
        )}

        {/* Add/Edit Address Form */}
        {showAddForm && (
          <div className="border rounded-lg p-4 bg-gray-50">
            <h3 className="font-medium mb-4">
              {editingAddress ? 'Edit Address' : 'Add New Address'}
            </h3>
            
            <form onSubmit={handleAddressSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={newAddress.firstName}
                    onChange={(e) => setNewAddress({ ...newAddress, firstName: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={newAddress.lastName}
                    onChange={(e) => setNewAddress({ ...newAddress, lastName: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Phone Number *</label>
                <input
                  type="tel"
                  required
                  value={newAddress.phone}
                  onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-black focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Street Address *</label>
                <textarea
                  required
                  rows={2}
                  value={newAddress.street}
                  onChange={(e) => setNewAddress({ ...newAddress, street: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-black focus:border-transparent"
                  placeholder="House number, street name, area"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">City *</label>
                  <input
                    type="text"
                    required
                    value={newAddress.city}
                    onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">State *</label>
                  <input
                    type="text"
                    required
                    value={newAddress.state}
                    onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">ZIP Code *</label>
                  <input
                    type="text"
                    required
                    value={newAddress.zipCode}
                    onChange={(e) => setNewAddress({ ...newAddress, zipCode: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Address Type</label>
                  <select
                    value={newAddress.type}
                    onChange={(e) => setNewAddress({ ...newAddress, type: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-black focus:border-transparent"
                  >
                    <option value="home">Home</option>
                    <option value="work">Work</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                
                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newAddress.isDefault}
                      onChange={(e) => setNewAddress({ ...newAddress, isDefault: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm">Set as default address</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : editingAddress ? 'Update Address' : 'Save Address'}
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingAddress(null);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Shipping Methods */}
      {checkoutData.shippingAddress && (
        <div>
          <h3 className="text-lg font-medium mb-4">Shipping Method</h3>
          
          <div className="space-y-3">
            {shippingMethods.map((method) => {
              const isSelected = checkoutData.shippingMethod === method.id;
              
              return (
                <div
                  key={method.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    isSelected 
                      ? 'border-black bg-gray-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleShippingMethodChange(method.id)}
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
                      
                      <div>
                        <div className="font-medium">{method.name}</div>
                        <div className="text-sm text-gray-600">{method.description}</div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="font-medium">
                        {method.price === 0 ? 'Free' : `₹${method.price}`}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default AddressStep;
import React, { useState } from 'react';
import { Plus, Edit3, Trash2, MapPin, Home, Briefcase, MoreHorizontal } from 'lucide-react';
import api from '../../api';
import AddressForm from './AddressForm';

const AddressSection = ({ addresses, onRefresh }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const getAddressIcon = (type) => {
    switch (type) {
      case 'home':
        return Home;
      case 'work':
        return Briefcase;
      default:
        return MoreHorizontal;
    }
  };

  const handleAddAddress = () => {
    setEditingAddress(null);
    setShowForm(true);
    setMessage({ type: '', text: '' });
  };

  const handleEditAddress = (address) => {
    setEditingAddress(address);
    setShowForm(true);
    setMessage({ type: '', text: '' });
  };

  const handleDeleteAddress = async (addressId) => {
    if (!window.confirm('Are you sure you want to delete this address?')) {
      return;
    }

    setLoading(true);
    try {
      await api.delete(`/api/user/addresses/${addressId}`);
      setMessage({ type: 'success', text: 'Address deleted successfully!' });
      onRefresh();
    } catch (error) {
      console.error('Error deleting address:', error);
      setMessage({ type: 'error', text: 'Failed to delete address' });
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = async (formData) => {
    setLoading(true);
    try {
      if (editingAddress) {
        await api.put(`/api/user/addresses/${editingAddress.id}`, formData);
        setMessage({ type: 'success', text: 'Address updated successfully!' });
      } else {
        await api.post('/api/user/addresses', formData);
        setMessage({ type: 'success', text: 'Address added successfully!' });
      }
      setShowForm(false);
      setEditingAddress(null);
      onRefresh();
    } catch (error) {
      console.error('Error saving address:', error);
      setMessage({ type: 'error', text: 'Failed to save address' });
    } finally {
      setLoading(false);
    }
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingAddress(null);
    setMessage({ type: '', text: '' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Saved Addresses</h2>
        {!showForm && (
          <button
            onClick={handleAddAddress}
            className="flex items-center space-x-2 px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition"
          >
            <Plus size={16} />
            <span>Add Address</span>
          </button>
        )}
      </div>

      {/* Message */}
      {message.text && (
        <div className={`p-4 rounded-md ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      {/* Address Form */}
      {showForm && (
        <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {editingAddress ? 'Edit Address' : 'Add New Address'}
          </h3>
          <AddressForm
            initialData={editingAddress}
            onSubmit={handleFormSubmit}
            onCancel={handleFormCancel}
            loading={loading}
          />
        </div>
      )}

      {/* Address List */}
      {addresses.length === 0 ? (
        <div className="text-center py-12">
          <MapPin className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No addresses saved</h3>
          <p className="text-gray-500 mb-4">Add your first address to get started</p>
          <button
            onClick={handleAddAddress}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition"
          >
            <Plus size={16} />
            <span>Add Address</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addresses.map((address, index) => {
            const Icon = getAddressIcon(address.type);
            return (
              <div
                key={address.id || index}
                className={`relative p-4 border rounded-lg transition ${
                  address.isDefault 
                    ? 'border-black bg-gray-50' 
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                {/* Default Badge */}
                {address.isDefault && (
                  <div className="absolute top-2 right-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-black text-white">
                      Default
                    </span>
                  </div>
                )}

                {/* Address Content */}
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <Icon className="h-5 w-5 text-gray-400 mt-1" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="text-sm font-medium text-gray-900 capitalize">
                        {address.type} Address
                      </h4>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>{address.street}</p>
                      <p>{address.city}, {address.state} {address.zipCode}</p>
                      <p>{address.country}</p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-2 mt-4">
                  <button
                    onClick={() => handleEditAddress(address)}
                    className="p-2 text-gray-400 hover:text-gray-600 transition"
                    title="Edit address"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteAddress(address.id)}
                    disabled={loading}
                    className="p-2 text-gray-400 hover:text-red-600 transition disabled:opacity-50"
                    title="Delete address"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AddressSection;
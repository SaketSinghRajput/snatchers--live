import React, { useState } from 'react';
import { X, Share2, Copy, Check, ExternalLink } from 'lucide-react';
import api from '../../api';

const ShareModal = ({ onClose }) => {
  const [shareUrl, setShareUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const generateShareLink = async () => {
    setLoading(true);
    try {
      const response = await api.post('/api/wishlist/share');
      setShareUrl(response.data.shareUrl);
      setMessage({ type: 'success', text: 'Share link generated successfully!' });
    } catch (error) {
      console.error('Error generating share link:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Failed to generate share link' 
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      setMessage({ type: 'error', text: 'Failed to copy to clipboard' });
    }
  };

  const openInNewTab = () => {
    window.open(shareUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Share2 className="mr-2" size={20} />
            Share Wishlist
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Message */}
          {message.text && (
            <div className={`p-4 rounded-md mb-4 ${
              message.type === 'success' 
                ? 'bg-green-50 text-green-800 border border-green-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {message.text}
            </div>
          )}

          {!shareUrl ? (
            /* Generate Link */
            <div className="text-center">
              <div className="mb-4">
                <Share2 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Share Your Wishlist
                </h3>
                <p className="text-gray-600">
                  Generate a public link to share your wishlist with friends and family.
                </p>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> This will make your wishlist publicly accessible to anyone with the link.
                </p>
              </div>

              <button
                onClick={generateShareLink}
                disabled={loading}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Share2 size={16} />
                <span>{loading ? 'Generating...' : 'Generate Share Link'}</span>
              </button>
            </div>
          ) : (
            /* Share Link Generated */
            <div>
              <div className="mb-4">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Your Wishlist Link
                </h3>
                <p className="text-gray-600 text-sm">
                  Share this link with anyone you want to view your wishlist.
                </p>
              </div>

              {/* Share URL */}
              <div className="bg-gray-50 border border-gray-200 rounded-md p-3 mb-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className="flex-1 bg-transparent text-sm text-gray-700 focus:outline-none"
                  />
                  <button
                    onClick={copyToClipboard}
                    className={`p-2 rounded transition ${
                      copied 
                        ? 'text-green-600 bg-green-50' 
                        : 'text-gray-600 hover:bg-gray-200'
                    }`}
                    title={copied ? 'Copied!' : 'Copy to clipboard'}
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                  <button
                    onClick={openInNewTab}
                    className="p-2 text-gray-600 hover:bg-gray-200 rounded transition"
                    title="Open in new tab"
                  >
                    <ExternalLink size={16} />
                  </button>
                </div>
              </div>

              {/* Social Share Options */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Share via:</p>
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      const text = `Check out my wishlist!`;
                      const url = `https://wa.me/?text=${encodeURIComponent(text + ' ' + shareUrl)}`;
                      window.open(url, '_blank');
                    }}
                    className="flex-1 px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition"
                  >
                    WhatsApp
                  </button>
                  <button
                    onClick={() => {
                      const text = `Check out my wishlist! ${shareUrl}`;
                      const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
                      window.open(url, '_blank');
                    }}
                    className="flex-1 px-3 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition"
                  >
                    Twitter
                  </button>
                  <button
                    onClick={() => {
                      const url = `mailto:?subject=My Wishlist&body=Check out my wishlist: ${shareUrl}`;
                      window.location.href = url;
                    }}
                    className="flex-1 px-3 py-2 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 transition"
                  >
                    Email
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
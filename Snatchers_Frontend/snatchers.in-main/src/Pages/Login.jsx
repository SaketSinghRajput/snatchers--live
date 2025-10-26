import React, { useState, useEffect } from "react";
import GoogleSignIn from '../components/GoogleSignIn';
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import api from '../api';

export default function Auth() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function handleAuth() {
    if (!email || !password) {
      toast.error('Please enter both email and password');
      return;
    }

    try {
      const emailNormalized = String(email || '').trim().toLowerCase();
      const res = await api.post('/api/login', { email: emailNormalized, password });
      
      console.log('Server login result:', res.data);
      toast.success('Login successful!');
      setTimeout(() => navigate('/'), 1000);
    } catch (error) {
      const errorMsg = error?.response?.data?.error || error.message || 'Login failed';
      console.error('Login error:', error);
      toast.error(errorMsg);
    }
  }

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      try {
        const res = await api.get('/api/user/me');
        if (res.data) {
          navigate('/');
        }
      } catch (err) {
        // User not authenticated, stay on login page
      }
    };
    checkAuthAndRedirect();
  }, [navigate]);

  return (
    <>
      <ToastContainer position="top-center" autoClose={1500} hideProgressBar />
      <div
        className="min-h-screen flex items-center justify-center bg-gray-50"
        style={{ fontFamily: "'Italiana', serif" }}
      >
        <div className="w-full max-w-md p-8 border-2 border-red-600 rounded-lg shadow-lg bg-white text-center">
          <h2 className="text-3xl font-semibold text-red-600 mb-8">Authenticate</h2>
          
          <input 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            placeholder="Email" 
            type="email"
            className="w-full mb-3 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-600"
          />
          <input 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            placeholder="Password" 
            type="password" 
            className="w-full mb-4 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-600"
            onKeyPress={(e) => { if (e.key === 'Enter') handleAuth(); }}
          />
          <div className="text-sm text-gray-600 mb-3">
            Don't have an account? <a href="/register" className="text-red-600 font-semibold">Register</a>
          </div>
          <button
            onClick={handleAuth}
            className="w-full py-2 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700 transition"
          >
            Login
          </button>
          
          <div className="mt-4">
            <p className="text-sm text-gray-500 mb-2">Or sign in with</p>
            <React.Suspense fallback={<div>Loading sign-in...</div>}>
              <GoogleSignIn
                onSuccess={(data) => {
                  console.log('Google login success', data);
                  navigate('/');
                }}
                onError={(err) => {
                  console.error('Google login error', err);
                  toast.error('Google login failed');
                }}
              />
            </React.Suspense>
          </div>
        </div>
      </div>
    </>
  );
}

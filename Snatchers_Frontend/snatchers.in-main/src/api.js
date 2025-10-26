import axios from 'axios';

// Decide base URL:
// - When running on localhost, prefer a relative base URL so CRA/Vite proxy forwards
//   requests to the local backend (avoids cross-site cookie issues in dev).
// - Only use a remote API on localhost if explicitly forced via REACT_APP_FORCE_REMOTE_API=true
// - In non-localhost environments, prefer REACT_APP_API_BASE_URL and fall back to production API host.
const isLocalhost = typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname);
const forceRemote = process.env.REACT_APP_FORCE_REMOTE_API === 'true';
const resolvedBaseURL = (isLocalhost && !forceRemote)
  ? ''
  : (process.env.REACT_APP_API_BASE_URL || 'https://api.snatchers.in');

// Create a new axios instance
const api = axios.create({
  baseURL: resolvedBaseURL,
  // send cookies if backend uses cookie sessions; adjust if using token-only
  withCredentials: true,
});

// Request interceptor: attach token from localStorage
api.interceptors.request.use(
  (config) => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers = config.headers || {};
        config.headers['Authorization'] = `Bearer ${token}`;
      }
      
      // Log request in development
      if (process.env.NODE_ENV === 'development') {
        console.log('[API Request]', config.method?.toUpperCase(), config.url, {
          params: config.params,
          hasAuth: !!token
        });
      }
    } catch (e) {
      console.error('[API] Request interceptor error:', e);
    }
    return config;
  },
  (error) => {
    console.error('[API] Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor: handle 401 by clearing token and redirecting to login
api.interceptors.response.use(
  (response) => {
    // Log successful responses in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[API Response]', response.config.method?.toUpperCase(), response.config.url, '✅', response.status);
    }
    return response;
  },
  (error) => {
    // Log errors in development
    if (process.env.NODE_ENV === 'development') {
      // 401 errors are expected (user not logged in), so log them as info, not errors
      if (error.response?.status === 401) {
        console.info('[API] 401 Unauthorized - User not authenticated', {
          url: error.config?.url,
          method: error.config?.method?.toUpperCase()
        });
      } else {
        // All other errors are unexpected and should be logged as errors
        console.error('[API Error]', {
          url: error.config?.url,
          method: error.config?.method?.toUpperCase(),
          status: error.response?.status,
          message: error.message,
          data: error.response?.data
        });
      }
    }
    
    try {
      if (error && error.response && error.response.status === 401) {
        console.info('[API] Clearing any stored tokens');
        // Clear any locally stored token so future requests won't include it
        localStorage.removeItem('token');
        // Emit an event so the app can handle unauthorized state explicitly
        try {
          window.dispatchEvent(new CustomEvent('auth:unauthorized', { detail: { 
            status: 401,
            url: error.config?.url,
            message: error.response?.data?.error || 'Authentication required'
          } }));
        } catch (e) {
          // fallback: simple event for older browsers
          const ev = document.createEvent && document.createEvent('Event');
          if (ev && ev.initEvent) {
            ev.initEvent('auth:unauthorized', true, true);
            try { window.dispatchEvent(ev); } catch (ignore) {}
          }
        }
        // Do NOT perform a global redirect here — callers should decide how to react.
      }
    } catch (e) {
      console.error('[API] Error handler failed:', e);
    }
    return Promise.reject(error);
  }
);

export default api;

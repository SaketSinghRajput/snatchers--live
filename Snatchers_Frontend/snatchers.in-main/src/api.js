import axios from "axios";

// Decide base URL:
// - When running on localhost, prefer a relative base URL so CRA/Vite proxy forwards
//   requests to the local backend (avoids cross-site cookie issues in dev).
// - Only use a remote API on localhost if explicitly forced via REACT_APP_FORCE_REMOTE_API=true
// - In non-localhost environments, prefer REACT_APP_API_BASE_URL and fall back to production API host.
const isLocalhost =
  typeof window !== "undefined" &&
  /^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname);
const forceRemote = process.env.REACT_APP_FORCE_REMOTE_API === "true";
const resolvedBaseURL =
  isLocalhost && !forceRemote
    ? "http://localhost:5001" // your backend port
    : process.env.REACT_APP_API_BASE_URL || "https://api.snatchers.in";

// Create axios instance
const api = axios.create({
  baseURL: resolvedBaseURL,
  withCredentials: false, // using JWT, not cookies
});

// ✅ Request interceptor: attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers = config.headers || {};
      config.headers["Authorization"] = `Bearer ${token}`;
    }

    if (process.env.NODE_ENV === "development") {
      console.log(
        `[API] ${config.method?.toUpperCase()} ${config.url} ${
          token ? "(auth ✓)" : "(no token)"
        }`
      );
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ✅ Response interceptor: handle 401 automatically
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn("[API] 401 Unauthorized — clearing token");
      // localStorage.removeItem("token");
      // Optional: trigger global auth event
      window.dispatchEvent(
        new CustomEvent("auth:unauthorized", {
          detail: {
            url: error.config?.url,
            message: error.response?.data?.error || "Session expired",
          },
        })
      );
    }

    if (process.env.NODE_ENV === "development") {
      console.error("[API Error]", {
        url: error.config?.url,
        status: error.response?.status,
        message: error.response?.data?.error || error.message,
      });
    }

    return Promise.reject(error);
  }
);

// ✅ Helper functions
export const getAuthToken = () => localStorage.getItem("token");

export const setAuthToken = (token) => {
  if (token) localStorage.setItem("token", token);
  else localStorage.removeItem("token");
};

export default api;

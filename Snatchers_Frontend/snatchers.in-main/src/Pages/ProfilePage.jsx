import React, { useEffect, useState } from "react";
import { LogOut, Mail, User } from "lucide-react";
import { useAuth } from "../contexts/AuthContext.jsx";
import api from "../api";
import { useNavigate } from "react-router-dom";
import Avatar from "react-avatar";
import UserDashboard from "../components/UserDashboard/UserDashboard";

const ProfilePage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState([]);
  const [showDashboard, setShowDashboard] = useState(false);

  const useServer = process.env.REACT_APP_USE_SERVER_AUTH === "true";
  const { logout } = useAuth();

  // useEffect(() => {
  //   const fetchUser = async () => {
  //     try {
  //       if (useServer) {
  //         // Use server-side session cookie (HTTP-only) to get user via absolute backend URL
  //         const backend =
  //           process.env.REACT_APP_API_BASE_URL || "https://api.snatchers.in";
  //         const res = await fetch(backend + "/api/user/me", {
  //           credentials: "include",
  //           cache: "no-store",
  //         });
  //         if (!res.ok) {
  //           navigate("/login");
  //           return;
  //         }
  //         const data = await res.json();
  //         // backend may return { user } or the user object directly
  //         const serverUser = data && data.user ? data.user : data;
  //         setUser(serverUser);
  //         setLoading(false);
  //         return;
  //       }

  //       const token = localStorage.getItem("token");
  //       console.log({ token });

  //       if (!token) {
  //         navigate("/login");
  //         return;
  //       }
  //       // Use api instance to fetch user data when using token-based auth
  //       const userRes = await api.get("/api/user/me");
  //       const data = userRes.data;
  //       setUser(data && data.user ? data.user : data);
  //       setLoading(false);
  //     } catch (error) {
  //       console.error("Fetch user error:", error);
  //       navigate("/login");
  //     }
  //   };
  //   fetchUser();
  // }, [navigate, useServer]);
  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem("token");
      console.log({ token });
      if (!token) {
        navigate("/login");
        return;
      } else {
        setUser(true);
      }

      // try {
      //   const userRes = await api.get("/api/user/me");
      //   const data = userRes.data;
      //   setUser(data && data.user ? data.user : data);
      //   setLoading(false);
      // } catch (error) {
      //   console.error("Fetch user error:", error);
      //   localStorage.removeItem("token");
      //   navigate("/login");
      // }
    };

    fetchUser();
  }, [navigate]);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user || !user.email) return;

      try {
        // First, try to fetch from API
        const token = localStorage.getItem("token");
        if (useServer) {
          try {
            const backend =
              process.env.REACT_APP_API_BASE_URL || "https://api.snatchers.in";
            const res = await fetch(
              backend + `/api/orders/email/${encodeURIComponent(user.email)}`,
              { credentials: "include", cache: "no-store" }
            );
            if (res.ok) {
              const data = await res.json();
              const apiOrders = data.orders || [];
              if (apiOrders.length > 0) {
                setOrders(apiOrders);
                return;
              }
            }
          } catch (apiError) {
            console.log(
              "Server orders not available, falling back to localStorage"
            );
          }
        } else if (token) {
          try {
            const res = await api.get(
              `/api/orders/email/${encodeURIComponent(user.email)}`
            );
            if (res.status === 200) {
              const data = res.data;
              const apiOrders = data.orders || [];
              if (apiOrders.length > 0) {
                setOrders(apiOrders);
                return;
              }
            }
          } catch (apiError) {
            console.log(
              "API orders not available, falling back to localStorage"
            );
          }
        }

        // Fallback to localStorage if API fails or returns no orders
        const storedOrders = JSON.parse(
          localStorage.getItem("userOrders") || "[]"
        );

        // Filter orders by current user's email
        const userOrders = storedOrders.filter(
          (order) =>
            order.customerEmail &&
            order.customerEmail.toLowerCase() === user.email.toLowerCase()
        );

        // Sort orders by date (newest first)
        const sortedOrders = userOrders.sort(
          (a, b) => new Date(b.orderDate) - new Date(a.orderDate)
        );

        setOrders(sortedOrders);
      } catch (err) {
        console.error("Error loading orders:", err);
        setOrders([]);
      }
    };
    fetchOrders();
  }, [user]);

  const handleSignOut = async () => {
    // If SPA is using server-side sessions, call backend /logout to destroy the session cookie
    try {
      if (useServer) {
        // call backend logout which destroys session cookie and clears server session
        try {
          // use the centralized api instance so cookies are sent (withCredentials)
          await api.post("/api/logout");
        } catch (e) {
          // ignore network errors during logout
          console.debug("Logout POST /api/logout failed:", e?.message || e);
        } finally {
          // clear client token copy if present and clear client auth state, then reload
          try {
            logout();
          } catch (e) {
            /* ignore */
          }
          localStorage.removeItem("token");
          // do a full reload to clear any in-memory app state
          window.location.href = "/";
        }
        return;
      }
    } catch (err) {
      console.error("Logout error:", err);
    }

    // Token-based (Cognito or local token) logout: clear token and navigate to login
    try {
      logout();
    } catch (e) {
      /* ignore */
    }
    localStorage.removeItem("token");
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-xl font-semibold">
        Loading...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-xl font-semibold">
        Please log in to view your profile.
      </div>
    );
  }
  console.log({ showDashboard });

  // Show enhanced dashboard if user wants it
  if (showDashboard) {
    return <UserDashboard />;
  }

  return (
    <section className="min-h-screen bg-gradient-to-b from-gray-50 to-white px-4 py-10 font-sans">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-10 gap-4">
          <h1
            className="text-4xl font-bold tracking-tight text-gray-900"
            style={{ fontFamily: "'Italiana', serif" }}
          >
            My Profile
          </h1>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => setShowDashboard(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-black to-gray-800 text-white rounded-lg shadow hover:scale-105 active:scale-95 transition-transform duration-150"
            >
              <User size={16} />
              Enhanced Dashboard
            </button>

            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2 border border-gray-900 rounded-lg text-gray-900 hover:bg-gray-900 hover:text-white shadow-sm transition-all duration-150"
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        </div>

        {/* Profile Section */}
        <div className="bg-white/70 backdrop-blur-lg border border-gray-200 rounded-2xl shadow-lg p-8 flex flex-col sm:flex-row items-center sm:items-start gap-8 transition-all">
          <Avatar
            name={user.name || "Anonymous User"}
            src={user.photoURL || undefined}
            size="128"
            round={true}
            className="border-2 border-black shadow-md"
          />

          <div className="flex-1 space-y-3 text-gray-800">
            <h2 className="text-2xl font-semibold flex items-center gap-2 text-gray-900">
              <User size={20} className="text-gray-600" />
              {user.name}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-sm text-gray-700">
              <p className="flex items-center gap-2">
                <Mail size={16} className="text-gray-500" /> {user.email}
              </p>
            </div>
          </div>
        </div>

        {/* Orders Section */}
        <div className="mt-16">
          <h3
            className="text-2xl font-semibold mb-6 text-gray-900"
            style={{ fontFamily: "'Italiana', serif" }}
          >
            My Orders
          </h3>

          {orders.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {orders.map((order) => (
                <div
                  key={order.id}
                  onClick={() =>
                    order.productId
                      ? navigate(`/product/${order.productId}`)
                      : null
                  }
                  className="group border border-gray-200 rounded-xl bg-white/60 hover:bg-white shadow-md hover:shadow-xl p-5 flex gap-4 items-center transition-all duration-200 cursor-pointer"
                >
                  <img
                    src={order.productImage || "/product-placeholder.jpg"}
                    alt={order.productTitle}
                    className="w-20 h-20 object-cover rounded-lg border border-gray-300 group-hover:scale-105 transition-transform"
                  />
                  <div className="flex-1">
                    <h4 className="font-medium text-lg text-gray-900">
                      {order.productTitle}
                    </h4>
                    <p className="text-sm text-gray-700 font-semibold">
                      ₹{order.price}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Ordered on{" "}
                      {new Date(order.orderDate).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-gray-400">ID: {order.orderId}</p>
                  </div>
                  <div>
                    <span
                      className={`text-xs px-3 py-1 rounded-full border font-medium ${
                        order.status === "Delivered"
                          ? "bg-green-100 border-green-400 text-green-800"
                          : order.status === "Shipped"
                          ? "bg-yellow-100 border-yellow-400 text-yellow-800"
                          : order.status === "Ordered"
                          ? "bg-blue-100 border-blue-400 text-blue-800"
                          : "bg-red-100 border-red-400 text-red-800"
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-10">
              <img
                src="/empty-orders.svg"
                alt="No Orders"
                className="mx-auto w-40 mb-4 opacity-80"
              />
              <p>No orders found yet. Start shopping to see them here!</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default ProfilePage;

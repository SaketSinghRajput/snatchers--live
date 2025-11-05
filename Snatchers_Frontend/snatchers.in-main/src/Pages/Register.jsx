import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import api from "../api";

export default function Register() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await api.get("/api/user/me");
        if (res.data) {
          navigate("/");
        }
      } catch (e) {
        // User not authenticated, stay on register page
      }
    };
    checkAuth();
  }, [navigate]);

  async function handleRegister() {
    if (!email || !password) {
      toast.error("Please enter both email and password");
      return;
    }

    try {
      const emailNormalized = String(email || "")
        .trim()
        .toLowerCase();
      const res = await api.post("/api/register", {
        email: emailNormalized,
        password,
        name: name || "",
      });

      console.log("Registration successful:", res.data);
      localStorage.setItem("token", res.data.token);

      toast.success("Registration successful! Redirecting to home...");
      setTimeout(() => navigate("/"), 1200);
    } catch (err) {
      const msg =
        err?.response?.data?.error || err.message || "Registration failed";
      console.error("Register error:", err);
      toast.error(msg);
    }
  }

  return (
    <>
      <ToastContainer position="top-center" autoClose={1500} hideProgressBar />
      <div
        className="min-h-screen flex items-center justify-center bg-gray-50"
        style={{ fontFamily: "'Italiana', serif" }}
      >
        <div className="w-full max-w-md p-8 border-2 border-red-600 rounded-lg shadow-lg bg-white text-center">
          <h2 className="text-3xl font-semibold text-red-600 mb-8">Register</h2>

          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name (optional)"
            type="text"
            className="w-full mb-3 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-600"
          />
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
            onKeyPress={(e) => {
              if (e.key === "Enter") handleRegister();
            }}
          />

          <button
            onClick={handleRegister}
            className="w-full py-2 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700 transition"
          >
            Create account
          </button>

          <div className="mt-4 text-sm text-gray-600">
            Already have an account?{" "}
            <a href="/login" className="text-red-600 font-semibold">
              Sign in
            </a>
          </div>
        </div>
      </div>
    </>
  );
}

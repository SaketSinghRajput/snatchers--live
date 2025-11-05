import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import api from "../api";

export default function UnauthRoute({ children }) {
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    let mounted = true;

    const verifyToken = async () => {
      const token = localStorage.getItem("token");
      console.log({ tested: token });
      if (!token) {
        setAuthenticated(false);
        setChecking(false);
        return;
      }

      // try {
      //   const res = await api.get("/api/user/me"); // JWT auto-added
      //   if (res.status === 200 && mounted) setAuthenticated(true);
      // } catch {
      //   localStorage.removeItem("token");
      //   setAuthenticated(false);
      // } finally {
      //   if (mounted) setChecking(false);
      // }
    };

    verifyToken();
    return () => {
      mounted = false;
    };
  }, []);
  console.log({ authenticated });

  if (checking) return null;
  if (authenticated) return <Navigate to="/profile" replace />;
  return children;
}

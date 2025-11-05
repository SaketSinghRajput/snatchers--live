import express from "express";
import signature from "cookie-signature";
import cookie from "cookie";
import { CognitoJwtVerifier } from "aws-jwt-verify";
import User from "../models/User.js";
import { OAuth2Client } from "google-auth-library";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const JWT_EXPIRES_IN = "7d";
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const router = express.Router();

// Helper to set the session cookie explicitly (works around proxy/header differences)
function setSessionCookie(req, res) {
  try {
    // If the incoming request already carries a connect.sid cookie that maps
    // to the current session id, avoid setting another Set-Cookie header to
    // prevent duplicate cookies.
    try {
      const rawCookie =
        req.headers && req.headers.cookie ? req.headers.cookie : "";
      if (rawCookie) {
        const parsed = cookie.parse(rawCookie);
        const existing = parsed["connect.sid"];
        if (existing && req.sessionID) {
          let sid = existing;
          if (sid.startsWith("s:")) sid = sid.slice(2);
          const dot = sid.indexOf(".");
          if (dot > 0) sid = sid.slice(0, dot);
          if (sid === String(req.sessionID)) {
            // Already present and matches current session id — nothing to do
            console.log(
              "[Auth] setSessionCookie: existing cookie matches sessionID — skipping Set-Cookie"
            );
            return;
          }
        }
      }
    } catch (e) {
      // non-fatal; continue to set cookie below
    }
    const secureFlag =
      req.secure ||
      (req.headers && req.headers["x-forwarded-proto"] === "https");
    const sessionCookieDays = parseInt(
      process.env.SESSION_COOKIE_DAYS || "",
      10
    );
    const defaultCookieDays = Number.isFinite(sessionCookieDays)
      ? sessionCookieDays
      : 30;
    const cookieMaxAge = process.env.SESSION_MAX_AGE_MS
      ? parseInt(process.env.SESSION_MAX_AGE_MS, 10)
      : 1000 * 60 * 60 * 24 * defaultCookieDays;
    const sameSite =
      process.env.SESSION_SAME_SITE || (secureFlag ? "none" : "lax");
    const cookieOptions = {
      httpOnly: true,
      secure: secureFlag,
      sameSite,
      maxAge: cookieMaxAge,
    };
    if (process.env.SESSION_COOKIE_DOMAIN)
      cookieOptions.domain = process.env.SESSION_COOKIE_DOMAIN;
    const cookieName = process.env.SESSION_COOKIE_NAME || "connect.sid";
    // express-session signs cookies using the session secret. If the session
    // middleware is configured with a secret, sign the cookie value the same way
    // so that direct lookups using the cookie value (without the 's:' prefix)
    // behave as expected by connect-mongo.
    const sessionSecret = process.env.SESSION_SECRET || "some secret";
    let valueToSet = req.sessionID;
    try {
      // cookie-signature expects a string and returns 's:...' prefixed value
      valueToSet = "s:" + signature.sign(String(req.sessionID), sessionSecret);
    } catch (e) {
      // fallback: set raw session id
      valueToSet = req.sessionID;
    }
    // set cookie with current (signed) session id
    res.cookie(cookieName, valueToSet, cookieOptions);
    console.log(
      "[Auth] setSessionCookie: Set-Cookie emitted for sessionID",
      req.sessionID
    );
  } catch (e) {
    console.warn("Failed to set session cookie explicitly", e);
  }
}

// Create verifier lazily so env vars are available at runtime
function createVerifier() {
  const userPoolId = process.env.COGNITO_USER_POOL_ID;
  const clientId =
    process.env.COGNITO_USER_POOL_CLIENT_ID || process.env.COGNITO_CLIENT_ID;
  if (!userPoolId || !clientId) {
    throw new Error(
      "COGNITO_USER_POOL_ID and COGNITO_USER_POOL_CLIENT_ID must be set"
    );
  }
  return CognitoJwtVerifier.create({
    userPoolId,
    tokenUse: "id",
    clientId,
  });
}
function generateToken(user) {
  return jwt.sign(
    { uid: user.uid, email: user.email, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: "7d" } // token valid for 7 days
  );
}
function verifyToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token provided" });

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: "Invalid or expired token" });
    req.user = decoded;
    next();
  });
}

router.post("/login", async (req, res) => {
  const { idToken, email, password } = req.body || {};

  // Cognito (if used) — unchanged
  if (idToken) {
    try {
      const verifier = createVerifier();
      const payload = await verifier.verify(idToken);
      const uid = payload.sub;
      const emailAddr = payload.email;
      const name = payload.name || payload["cognito:username"] || "";

      const user = await User.findOneAndUpdate(
        { uid },
        { uid, email: emailAddr, name },
        { upsert: true, new: true }
      );

      // Return Cognito token as-is
      return res.status(200).json({ token: idToken, user });
    } catch (error) {
      console.error("Cognito login error:", error);
      return res.status(401).json({ error: "Invalid ID token" });
    }
  }

  // ✅ Email/password login flow (JWT)
  if (email && password) {
    try {
      const emailNormalized = String(email).trim().toLowerCase();

      const user = await User.findOne({
        email: {
          $regex: new RegExp(
            "^" + emailNormalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$",
            "i"
          ),
        },
      }).exec();

      if (!user) {
        console.warn(`[Auth] No user found for ${emailNormalized}`);
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Compare password
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) return res.status(401).json({ error: "Invalid credentials" });

      // ✅ Generate JWT token
      const token = jwt.sign(
        { id: user._id, email: user.email },
        process.env.JWT_SECRET,
        {
          expiresIn: JWT_EXPIRES_IN,
        }
      );

      return res.json({
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
        },
        token, // send JWT to frontend
      });
    } catch (err) {
      console.error("Password login error:", err);
      return res.status(500).json({ error: "Server error" });
    }
  }

  return res.status(400).json({ error: "No credentials provided" });
});

// Google ID token login - client sends the Google ID token obtained from client-side
router.post("/google-login", async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) return res.status(400).json({ error: "No ID token provided" });
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const uid = payload.sub;
    const email = payload.email;
    const name = payload.name || "";

    const user = await User.findOneAndUpdate(
      { uid },
      { uid, email, name, photoURL: payload.picture },
      { upsert: true, new: true }
    );

    // Establish server-side session (if sessions enabled in app)
    try {
      if (req.session) {
        req.session.userInfo = {
          uid: user.uid,
          email: user.email,
          name: user.name,
          photoURL: user.photoURL,
        };
        // Persist session
        req.session.save?.(() => {});
        try {
          setSessionCookie(req, res);
        } catch (e) {}
      }
    } catch (e) {
      console.warn("Failed to establish session after Google login", e);
    }

    return res.json({ token: idToken, user });
  } catch (err) {
    console.error("Google login error:", err);
    return res.status(401).json({ error: "Invalid Google ID token" });
  }
});

// Register new user with email/password
router.post("/register", async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // 1️⃣ Validate input
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // 2️⃣ Normalize email (to avoid duplicates like user@GMAIL.com vs user@gmail.com)
    const normalizedEmail = email.trim().toLowerCase();

    // 3️⃣ Check if user already exists (case-insensitive)
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({ error: "User already exists" });
    }

    // 4️⃣ Hash password for security
    const hashedPassword = await bcrypt.hash(password, 10);

    // 5️⃣ Create a unique user ID
    const uid = `user-${Date.now()}`;

    // 6️⃣ Create new user
    const newUser = new User({
      uid,
      email: normalizedEmail,
      name: name || "",
      password: hashedPassword,
    });

    await newUser.save();

    // // 7️⃣ Create session (if using express-session)
    // if (req.session) {
    //   req.session.userInfo = {
    //     uid: newUser.uid,
    //     email: newUser.email,
    //     name: newUser.name,
    //     photoURL: newUser.photoURL,
    //   };
    // }

    // // 8️⃣ Send success response
    // return res.status(201).json({ user: newUser });

    const token = generateToken(newUser);

    // 8️⃣ Send success response with JWT
    return res.status(201).json({ user: newUser, token });
  } catch (err) {
    console.error("Register error:", err);

    // Handle duplicate email
    if (err.code === 11000) {
      return res.status(409).json({ error: "User already exists" });
    }

    // Generic server error
    return res.status(500).json({ error: "Server error" });
  }
});

// Logout endpoint for SPA (destroys server session and clears session cookie)
router.post("/logout", (req, res) => {
  try {
    const cookieName = process.env.SESSION_COOKIE_NAME || "connect.sid";
    if (req.session) {
      req.session.destroy((err) => {
        if (err) {
          console.error("[Auth] session destroy error:", err);
          return res.status(500).json({ error: "Could not log out." });
        }
        try {
          const clearOpts = { path: "/" };
          if (process.env.SESSION_COOKIE_DOMAIN)
            clearOpts.domain = process.env.SESSION_COOKIE_DOMAIN;
          // sameSite/secure flags intentionally omitted for clear; browser will clear by name+domain+path
          res.clearCookie(cookieName, clearOpts);
        } catch (e) {
          console.warn("[Auth] failed to clear cookie during logout:", e);
        }
        return res.json({ message: "Logged out successfully" });
      });
    } else {
      // No session exists
      try {
        const clearOpts = { path: "/" };
        if (process.env.SESSION_COOKIE_DOMAIN)
          clearOpts.domain = process.env.SESSION_COOKIE_DOMAIN;
        res.clearCookie(cookieName, clearOpts);
      } catch (e) {}
      return res.json({ message: "No session to clear" });
    }
  } catch (err) {
    console.error("[Auth] /logout error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;

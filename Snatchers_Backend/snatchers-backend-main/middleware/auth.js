import { CognitoJwtVerifier } from "aws-jwt-verify";
// middleware/authenticateToken.js
import jwt from "jsonwebtoken";

export const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    if (!authHeader.startsWith("Bearer ")) {
      console.warn("[Auth] No Bearer token found");
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      console.error("[Auth] JWT_SECRET is missing in environment variables");
      return res
        .status(500)
        .json({ error: "Server misconfiguration: missing JWT secret" });
    }

    console.log("[Auth] Incoming token:", token.substring(0, 30) + "...");
    console.log("[Auth] Using secret:", secret.substring(0, 10) + "...");

    const decoded = jwt.verify(token, secret);
    console.log("[Auth] Token verified successfully:", decoded);

    req.user = decoded;
    next();
  } catch (error) {
    console.error("[Auth] JWT verification failed:", error.message);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

// Optional authentication - sets req.user if authenticated, but doesn't require it
export const optionalAuth = async (req, res, next) => {
  try {
    // Try session first
    if (req.session && req.session.userInfo) {
      req.user = {
        id: req.session.userInfo.sub,
        email: req.session.userInfo.email,
        name: req.session.userInfo.name,
      };
      return next();
    }

    // Try JWT token
    const authHeader =
      req.headers.authorization || req.headers.Authorization || "";
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];

      try {
        const userPoolId = process.env.COGNITO_USER_POOL_ID;
        const clientId =
          process.env.COGNITO_USER_POOL_CLIENT_ID ||
          process.env.COGNITO_CLIENT_ID;

        if (userPoolId && clientId) {
          const verifier = CognitoJwtVerifier.create({
            userPoolId,
            tokenUse: "id",
            clientId,
          });

          const payload = await verifier.verify(token);

          req.user = {
            id: payload.sub,
            email: payload.email,
            name: payload.name || payload["cognito:username"],
          };
        }
      } catch (err) {
        // Ignore token verification errors for optional auth
        console.debug(
          "[Auth] Optional token verification failed:",
          err?.message
        );
      }
    }

    // Continue regardless of authentication status
    next();
  } catch (error) {
    console.error("[Auth] Optional auth middleware error:", error);
    next(); // Continue even if there's an error
  }
};

// Backwards-compatible alias: some routes import `isAuthenticated`
// so export it pointing to authenticateToken to avoid changing many files.
export const isAuthenticated = authenticateToken;

// Provide `auth` named export and default export for files that import differently
export const auth = authenticateToken;
export default authenticateToken;

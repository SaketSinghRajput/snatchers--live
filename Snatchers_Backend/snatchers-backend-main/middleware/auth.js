import { CognitoJwtVerifier } from 'aws-jwt-verify';

// Middleware to authenticate requests using session or JWT token
export const authenticateToken = async (req, res, next) => {
  try {
    // 1) Check for session-based authentication first
    if (req.session && req.session.userInfo) {
      req.user = {
        id: req.session.userInfo.sub,
        email: req.session.userInfo.email,
        name: req.session.userInfo.name
      };
      return next();
    }

    // 2) Check for JWT token in Authorization header
    const authHeader = req.headers.authorization || req.headers.Authorization || '';
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      
      try {
        const userPoolId = process.env.COGNITO_USER_POOL_ID;
        const clientId = process.env.COGNITO_USER_POOL_CLIENT_ID || process.env.COGNITO_CLIENT_ID;
        
        if (!userPoolId || !clientId) {
          console.warn('[Auth] Cognito config missing - cannot verify token');
          return res.status(401).json({ error: 'Authentication unavailable' });
        }

        const verifier = CognitoJwtVerifier.create({ 
          userPoolId, 
          tokenUse: 'id', 
          clientId 
        });
        
        const payload = await verifier.verify(token);
        
        req.user = {
          id: payload.sub,
          email: payload.email,
          name: payload.name || payload['cognito:username']
        };
        
        return next();
      } catch (err) {
        console.error('[Auth] Token verification failed:', err?.message || err);
        return res.status(401).json({ error: 'Invalid token' });
      }
    }

    // 3) No valid authentication found
    return res.status(401).json({ error: 'Authentication required' });
    
  } catch (error) {
    console.error('[Auth] Authentication middleware error:', error);
    return res.status(500).json({ error: 'Authentication error' });
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
        name: req.session.userInfo.name
      };
      return next();
    }

    // Try JWT token
    const authHeader = req.headers.authorization || req.headers.Authorization || '';
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      
      try {
        const userPoolId = process.env.COGNITO_USER_POOL_ID;
        const clientId = process.env.COGNITO_USER_POOL_CLIENT_ID || process.env.COGNITO_CLIENT_ID;
        
        if (userPoolId && clientId) {
          const verifier = CognitoJwtVerifier.create({ 
            userPoolId, 
            tokenUse: 'id', 
            clientId 
          });
          
          const payload = await verifier.verify(token);
          
          req.user = {
            id: payload.sub,
            email: payload.email,
            name: payload.name || payload['cognito:username']
          };
        }
      } catch (err) {
        // Ignore token verification errors for optional auth
        console.debug('[Auth] Optional token verification failed:', err?.message);
      }
    }

    // Continue regardless of authentication status
    next();
    
  } catch (error) {
    console.error('[Auth] Optional auth middleware error:', error);
    next(); // Continue even if there's an error
  }
};

// Backwards-compatible alias: some routes import `isAuthenticated`
// so export it pointing to authenticateToken to avoid changing many files.
export const isAuthenticated = authenticateToken;

// Provide `auth` named export and default export for files that import differently
export const auth = authenticateToken;
export default authenticateToken;
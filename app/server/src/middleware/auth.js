const jwt = require('jsonwebtoken');

function extractToken(req) {
  if (req.cookies?.token) return req.cookies.token;
  const authHeader = req.headers.authorization;
  if (authHeader) {
    if (authHeader.startsWith('Bearer ')) return authHeader.slice(7);
    return authHeader;
  }
  return null;
}

function verifyToken(req, res, next) {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'REMOVED');
    next();
  } catch {
    res.clearCookie('token');
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
}

function optionalAuth(req, res, next) {
  const token = extractToken(req);
  if (token) {
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET || 'REMOVED');
    } catch {
      // ignore invalid token for optional auth
    }
  }
  next();
}

module.exports = { verifyToken, optionalAuth };

const jwt = require('jsonwebtoken');

// Public allow-list: strictly limited to login, contact form, and first page GETs
const PUBLIC_ALLOW_LIST = [
  { method: 'POST', path: '/api/auth/login' },
  { method: 'POST', path: '/api/messages' },
  { method: 'GET', path: '/api/profile' },
  { method: 'GET', path: '/api/profile/resume' },
  { method: 'GET', path: '/api/skills' },
  { method: 'GET', path: '/api/projects' },
  { method: 'GET', path: '/api/projects/tags' },
];

function extractToken(req) {
  if (req.cookies?.token) return req.cookies.token;
  const authHeader = req.headers.authorization;
  if (authHeader) {
    if (authHeader.startsWith('Bearer ')) return authHeader.slice(7);
    return authHeader;
  }
  return null;
}

function defaultDeny(req, res, next) {
  const reqPath = req.baseUrl ? `${req.baseUrl}${req.path}` : req.path;
  const cleanPath = reqPath.endsWith('/') && reqPath.length > 1 ? reqPath.slice(0, -1) : reqPath;

  const isAllowed = PUBLIC_ALLOW_LIST.some((item) => {
    return req.method === item.method && cleanPath === item.path;
  });

  if (isAllowed) {
    return next();
  }

  // Not in public allow-list: verify token
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    return next();
  } catch {
    res.clearCookie('token');
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
}

module.exports = {
  defaultDeny,
  PUBLIC_ALLOW_LIST,
};

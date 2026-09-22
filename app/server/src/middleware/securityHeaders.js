const helmet = require('helmet');

/**
 * Helmet Security Headers Middleware
 * Enforces OWASP-recommended HTTP security headers.
 * 
 * Note on style-src 'unsafe-inline':
 * Dropping 'unsafe-inline' is not currently possible because the client UI
 * relies on runtime computed inline styles for dynamic gauges, battery/storage bars,
 * tag colors, and @dnd-kit dragging coordinate transformations.
 */
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'", 'ws:', 'wss:'],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
    },
  },
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: {
    maxAge: 63072000,
    includeSubDomains: true,
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true,
  noSniff: true,
});

module.exports = { securityHeaders };

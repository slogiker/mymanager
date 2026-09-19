/**
 * Security headers middleware (Zak Drofenik & Marjan Čeh)
 * Enforces OWASP-recommended HTTP security headers.
 */
function securityHeaders(req, res, next) {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');

  // Prevent MIME-sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // XSS protection for older browsers
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Privacy-preserving referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Restrict unwanted browser features
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // Mask Express server identification
  res.removeHeader('X-Powered-By');

  // HSTS — enforce HTTPS for 2 years (safe: NPM terminates TLS in front of this app)
  res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains');

  // Content Security Policy — tight baseline
  // connect-src allows ws:/wss: for Socket.io terminal feature
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' ws: wss:; object-src 'none'; frame-ancestors 'self'"
  );

  next();
}

module.exports = { securityHeaders };

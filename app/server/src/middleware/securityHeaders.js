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

  next();
}

module.exports = { securityHeaders };

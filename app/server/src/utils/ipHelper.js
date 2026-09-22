/**
 * IP helper utility for mymanager.
 *
 * Direct connections to port 31847 or internal docker traffic must not be able to
 * spoof their IP address by supplying an arbitrary X-Forwarded-For header.
 *
 * We only trust X-Forwarded-For when the direct TCP socket remoteAddress is the
 * Nginx Proxy Manager gateway (172.18.0.1). Otherwise, we use req.socket.remoteAddress directly.
 */

function cleanIp(ip) {
  if (!ip) return '';
  return ip.trim().replace(/^::ffff:/, '');
}

function isTrustedProxy(ip) {
  const cleaned = cleanIp(ip);
  const trustedList = (process.env.TRUSTED_PROXIES || '172.18.0.1')
    .split(',')
    .map(s => cleanIp(s.trim()))
    .filter(Boolean);
  return trustedList.includes(cleaned);
}

function getClientIp(req) {
  const socketIp = cleanIp(req.socket?.remoteAddress || req.connection?.remoteAddress);
  if (isTrustedProxy(socketIp)) {
    const cfIp = req.headers['cf-connecting-ip'];
    if (cfIp) return cleanIp(cfIp);
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      const first = cleanIp(forwarded.split(',')[0]);
      if (first) return first;
    }
  }
  return socketIp;
}

module.exports = {
  cleanIp,
  isTrustedProxy,
  getClientIp,
};

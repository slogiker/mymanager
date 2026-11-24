/**
 * IP helper utility for mymanager.
 *
 * Rate limits and analytics must key on an address the caller cannot choose.
 * Requests reach the app either directly on 31847 or through Nginx Proxy
 * Manager (172.18.0.1). NPM appends the peer it actually saw to
 * X-Forwarded-For, so the LAST hop of that chain is trustworthy while every
 * earlier hop is whatever the client sent.
 *
 * Rules:
 *  - Forwarding headers are only read when the TCP socket is a trusted proxy.
 *  - The client address is the hop appended by the proxy, never the first hop.
 *  - CF-Connecting-IP is honoured only when the hop appended by the proxy is a
 *    Cloudflare edge address: the origin is also reachable directly, so a
 *    direct caller can set any forwarding header it likes.
 */

const TRUSTED_PROXIES = (process.env.TRUSTED_PROXIES || '172.18.0.1')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

// https://www.cloudflare.com/ips (v4 + v6)
const CLOUDFLARE_V4 = [
  '173.245.48.0/20', '103.21.244.0/22', '103.22.200.0/22', '103.31.4.0/22',
  '141.101.64.0/18', '108.162.192.0/18', '190.93.240.0/20', '188.114.96.0/20',
  '197.234.240.0/22', '198.41.128.0/17', '162.158.0.0/15', '104.16.0.0/13',
  '104.24.0.0/14', '172.64.0.0/13', '131.0.72.0/22',
];
const CLOUDFLARE_V6 = [
  '2400:cb00:', '2606:4700:', '2803:f800:', '2405:b500:', '2405:8100:',
  '2a06:98c0:', '2c0f:f248:',
];

function cleanIp(ip) {
  if (!ip) return '';
  return String(ip).trim().replace(/^::ffff:/i, '');
}

function ipv4ToInt(ip) {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let value = 0;
  for (const part of parts) {
    const n = Number(part);
    if (!Number.isInteger(n) || n < 0 || n > 255) return null;
    value = value * 256 + n;
  }
  return value;
}

function ipv4InCidr(ip, cidr) {
  const [range, bitsRaw] = cidr.split('/');
  const bits = Number(bitsRaw);
  const ipInt = ipv4ToInt(ip);
  const rangeInt = ipv4ToInt(range);
  if (ipInt === null || rangeInt === null || !Number.isInteger(bits)) return false;
  if (bits === 0) return true;
  const mask = bits >= 32 ? 0xffffffff : (0xffffffff << (32 - bits)) >>> 0;
  return ((ipInt & mask) >>> 0) === ((rangeInt & mask) >>> 0);
}

function isCloudflareIp(ip) {
  const cleaned = cleanIp(ip);
  if (!cleaned) return false;
  if (cleaned.includes('.')) {
    return CLOUDFLARE_V4.some((cidr) => ipv4InCidr(cleaned, cidr));
  }
  return CLOUDFLARE_V6.some((prefix) => cleaned.toLowerCase().startsWith(prefix));
}

function isTrustedProxy(ip) {
  return TRUSTED_PROXIES.includes(cleanIp(ip));
}

function getClientIp(req) {
  const socketIp = cleanIp(req.socket?.remoteAddress || req.connection?.remoteAddress);
  if (!isTrustedProxy(socketIp)) return socketIp;

  const chain = String(req.headers['x-forwarded-for'] || '')
    .split(',')
    .map(cleanIp)
    .filter(Boolean);

  // Last hop = what the proxy saw on the wire. Everything before it is caller-controlled.
  const proxyPeer = chain.length ? chain[chain.length - 1] : socketIp;

  if (chain.length && isCloudflareIp(proxyPeer)) {
    const cfIp = cleanIp(req.headers['cf-connecting-ip']);
    if (cfIp && !isCloudflareIp(cfIp)) return cfIp;
    if (chain.length >= 2) return chain[chain.length - 2];
  }

  return proxyPeer;
}

function anonymizeIp(ip) {
  if (!ip) return null;
  const cleaned = cleanIp(ip);
  if (cleaned.includes('.')) {
    const parts = cleaned.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
    }
    return cleaned;
  }
  if (cleaned.includes(':')) {
    const parts = cleaned.split(':');
    if (parts.length >= 4) {
      return `${parts[0]}:${parts[1]}:${parts[2]}:${parts[3]}::`;
    }
    return cleaned;
  }
  return cleaned;
}

module.exports = {
  cleanIp,
  ipv4InCidr,
  isCloudflareIp,
  isTrustedProxy,
  getClientIp,
  anonymizeIp,
};

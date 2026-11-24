/**
 * Outbound URL guard for the service connectivity probe.
 *
 * The probe exists so the owner can check LAN services (http://192.168.1.x:port),
 * so private ranges stay allowed on purpose. What must never be reachable from
 * this endpoint is link-local space: cloud metadata (169.254.169.254), APIPA and
 * IPv4 broadcast, plus unspecified/loopback aliases and non-HTTP schemes.
 *
 * Hostnames are resolved first so a DNS name pointing into link-local space is
 * rejected too.
 */

const dns = require('dns').promises;
const net = require('net');
const { cleanIp, ipv4InCidr } = require('./ipHelper');

const BLOCKED_V4 = [
  '0.0.0.0/8',
  '127.0.0.0/8',
  '169.254.0.0/16',
  '100.64.0.0/10',
  '192.0.0.0/24',
  '192.0.2.0/24',
  '198.18.0.0/15',
  '224.0.0.0/4',
  '240.0.0.0/4',
];

const BLOCKED_HOSTNAMES = new Set([
  'metadata',
  'metadata.google.internal',
  'metadata.goog',
  'instance-data',
  'metadata.azure.com',
]);

function blockedIp(ip) {
  const cleaned = cleanIp(ip);
  if (!cleaned) return true;
  if (cleaned.includes('.')) {
    return BLOCKED_V4.some((cidr) => ipv4InCidr(cleaned, cidr));
  }
  const lower = cleaned.toLowerCase();
  if (lower === '::' || lower === '::1') return true;
  if (lower.startsWith('fe80:') || lower.startsWith('fc') || lower.startsWith('fd')) return true;
  if (lower.startsWith('ff')) return true;
  if (lower.startsWith('64:ff9b:') || lower.startsWith('2002:')) return true;
  return false;
}

/**
 * @returns {Promise<{ok: true} | {ok: false, reason: string}>}
 */
async function assertProbeUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(String(rawUrl));
  } catch {
    return { ok: false, reason: 'Malformed URL' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, reason: 'Only http and https URLs can be probed' };
  }
  if (parsed.username || parsed.password) {
    return { ok: false, reason: 'Credentials in the URL are not allowed' };
  }
  const host = parsed.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (!host) return { ok: false, reason: 'URL has no host' };
  if (BLOCKED_HOSTNAMES.has(host) || host.endsWith('.internal') && BLOCKED_HOSTNAMES.has(host)) {
    return { ok: false, reason: 'Target host is not permitted' };
  }

  let addresses = [host];
  if (!net.isIP(host)) {
    try {
      const resolved = await dns.lookup(host, { all: true });
      addresses = resolved.map((r) => r.address);
    } catch {
      // Unresolvable is not a policy problem: let the probe report "offline".
      return { ok: true };
    }
    if (!addresses.length) return { ok: true };
  }

  if (addresses.some(blockedIp)) {
    return { ok: false, reason: 'Target resolves to a prohibited address range' };
  }
  return { ok: true };
}

module.exports = { assertProbeUrl, blockedIp };

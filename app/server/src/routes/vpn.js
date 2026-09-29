const express = require('express');
const http = require('http');
const https = require('https');
const { getClientIp } = require('../utils/ipHelper');

const router = express.Router();

// Cached server WAN IP with auto-refresh every 10 minutes
let cachedWanIp = null;
let wanIpFetchedAt = 0;
const WAN_IP_TTL = 10 * 60 * 1000; // 10 minutes

function fetchWanIp() {
  return new Promise((resolve) => {
    const request = https.get('https://ifconfig.me/ip', { timeout: 5000, headers: { 'User-Agent': 'curl/8.0' } }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        const ip = data.trim();
        if (ip && /^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) {
          cachedWanIp = ip;
          wanIpFetchedAt = Date.now();
          console.log(`[VPN] Server WAN IP resolved: ${ip}`);
        }
        resolve(cachedWanIp);
      });
    });
    request.on('error', () => resolve(cachedWanIp));
    request.on('timeout', () => { request.destroy(); resolve(cachedWanIp); });
  });
}

// Fetch on startup
fetchWanIp();

async function getWanIp() {
  if (cachedWanIp && (Date.now() - wanIpFetchedAt < WAN_IP_TTL)) {
    return cachedWanIp;
  }
  return fetchWanIp();
}

function isVpnIp(ip) {
  if (!ip) return false;
  const parts = ip.split('.');
  if (parts.length !== 4) return false;
  const last = parseInt(parts[3], 10);
  return parts[0] === '10' && parts[1] === '7' && parts[2] === '235' && last >= 0 && last <= 255;
}

function isLanIp(ip) {
  if (!ip) return false;
  if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') return true;
  const parts = ip.split('.');
  if (parts.length !== 4) return false;
  const p0 = parseInt(parts[0], 10);
  const p1 = parseInt(parts[1], 10);
  // Home LAN (192.168.x.x)
  if (p0 === 192 && p1 === 168) return true;
  // Local docker host bridge (172.16.0.0 - 172.31.255.255)
  if (p0 === 172 && p1 >= 16 && p1 <= 31) return true;
  // Local 10.x network (if not wireguard)
  if (p0 === 10 && !(p1 === 7 && parseInt(parts[2], 10) === 235)) return true;
  return false;
}

router.get('/', async (req, res) => {
  const ip = getClientIp(req);
  const wanIp = await getWanIp();
  const isVpn = isVpnIp(ip);
  const isLan = isLanIp(ip);
  // Client shares the same public IP as the server - they are on the home
  // network or routed through the WireGuard full-tunnel VPN
  const isHomeNetwork = !!(wanIp && ip === wanIp);
  const connected = isVpn || isLan || isHomeNetwork;
  res.json({
    connected,
    isVpn,
    isLan,
    isHomeNetwork,
    ip,
    subnet: '10.7.235.0/24',
    detectedAt: new Date().toISOString(),
  });
});

module.exports = router;

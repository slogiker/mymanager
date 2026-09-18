const express = require('express');
const { getClientIp } = require('../utils/ipHelper');

const router = express.Router();

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

router.get('/', (req, res) => {
  const ip = getClientIp(req);
  const isVpn = isVpnIp(ip);
  const isLan = isLanIp(ip);
  const connected = isVpn || isLan;
  res.json({
    connected,
    isVpn,
    isLan,
    ip,
    subnet: '10.7.235.0/24',
    detectedAt: new Date().toISOString(),
  });
});

module.exports = router;

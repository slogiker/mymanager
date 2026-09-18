const express = require('express');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

let cachedSid = null;

async function loginQbit(baseUrl, username, password) {
  if (!username || !password) return null;
  try {
    const res = await fetch(`${baseUrl}/api/v2/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    const cookie = res.headers.get('set-cookie');
    if (!cookie) return null;
    const match = cookie.match(/SID=([^;]+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

async function fetchQbit(baseUrl, path, username, password) {
  let url = `${baseUrl}${path}`;
  let headers = cachedSid ? { Cookie: `SID=${cachedSid}` } : {};

  try {
    let res = await fetch(url, { headers, signal: AbortSignal.timeout(3000) });
    if (res.status === 403 || !cachedSid) {
      cachedSid = await loginQbit(baseUrl, username, password);
      if (!cachedSid) return null;
      headers = { Cookie: `SID=${cachedSid}` };
      res = await fetch(url, { headers, signal: AbortSignal.timeout(3000) });
    }
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

router.get('/stats', verifyToken, async (req, res) => {
  const baseUrl = process.env.QBIT_URL || 'http://192.168.1.41:8090';
  const username = process.env.QBIT_USER;
  const password = process.env.QBIT_PASS;

  if (!username || !password) {
    return res.json({
      online: false,
      downloadSpeed: 0,
      uploadSpeed: 0,
      downloadTotal: 0,
      uploadTotal: 0,
      activeCount: 0,
      torrents: [],
      message: 'qBittorrent credentials not configured',
    });
  }

  try {
    const [transfer, torrents] = await Promise.all([
      fetchQbit(baseUrl, '/api/v2/transfer/info', username, password),
      fetchQbit(baseUrl, '/api/v2/torrents/info?filter=downloading', username, password),
    ]);

    if (!transfer && !torrents) {
      return res.json({
        online: false,
        downloadSpeed: 0,
        uploadSpeed: 0,
        downloadTotal: 0,
        uploadTotal: 0,
        activeCount: 0,
        torrents: [],
        message: 'qBittorrent host unreachable',
      });
    }

    const downloading = Array.isArray(torrents) ? torrents : [];
    res.json({
      online: true,
      downloadSpeed: transfer?.dl_info_speed || 0,
      uploadSpeed: transfer?.up_info_speed || 0,
      downloadTotal: transfer?.dl_info_data || 0,
      uploadTotal: transfer?.up_info_data || 0,
      connectionStatus: transfer?.connection_status || 'connected',
      activeCount: downloading.length,
      torrents: downloading.map(t => ({
        name: t.name,
        size: t.size,
        progress: t.progress,
        eta: t.eta,
        downloadSpeed: t.dlspeed,
        uploadSpeed: t.upspeed,
        state: t.state,
        numSeeds: t.num_seeds,
        numLeechs: t.num_leechs,
      })),
    });
  } catch (err) {
    res.json({
      online: false,
      downloadSpeed: 0,
      uploadSpeed: 0,
      downloadTotal: 0,
      uploadTotal: 0,
      activeCount: 0,
      torrents: [],
      error: err.message,
    });
  }
});

module.exports = router;

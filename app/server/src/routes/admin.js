const express = require('express');
const fs = require('fs');
const { Client: SSHClient } = require('ssh2');
const db = require('../models/db');
const { verifyToken } = require('../middleware/auth');
const { requireOwner } = require('../middleware/owner');
const { runSpeedtest } = require('../utils/speedtest');

const router = express.Router();

// 1. WireGuard Status (~10s in-memory cache)
let wgCache = { data: null, timestamp: 0 };

router.get('/wireguard/status', verifyToken, requireOwner, async (req, res) => {
  const now = Date.now();
  if (wgCache.data && (now - wgCache.timestamp < 10000)) {
    return res.json(wgCache.data);
  }

  const host = process.env.WG_SSH_HOST;
  const port = parseInt(process.env.WG_SSH_PORT || '22', 10);
  const username = process.env.WG_SSH_USER;
  const keyPath = process.env.WG_SSH_KEY_PATH;

  let privateKey = process.env.WG_SSH_KEY;
  if (!privateKey && keyPath && fs.existsSync(keyPath)) {
    try { privateKey = fs.readFileSync(keyPath, 'utf8'); } catch {}
  }

  if (!privateKey || !host || !username) {
    const fallback = {
      online: false,
      cached: false,
      error: 'WireGuard not configured',
      peers: [],
    };
    return res.json(fallback);
  }

  const conn = new SSHClient();

  const sshPromise = new Promise((resolve) => {
    let output = '';
    let errorOutput = '';

    conn.on('ready', () => {
      conn.exec('wg show wg0 dump', (err, stream) => {
        if (err) {
          conn.end();
          return resolve({ online: false, error: err.message, peers: [] });
        }
        stream.on('data', d => { output += d.toString(); });
        stream.stderr.on('data', d => { errorOutput += d.toString(); });
        stream.on('close', () => {
          conn.end();
          const lines = output.trim().split('\n');
          if (lines.length === 0 || !lines[0]) {
            return resolve({ online: false, error: errorOutput || 'No output from wg show', peers: [] });
          }

          // First line: interface info (private-key, public-key, listen-port, fwmark)
          const ifaceParts = lines[0].split('\t');
          const iface = {
            publicKey: ifaceParts[1] || 'unknown',
            listenPort: ifaceParts[2] || '51820',
          };

          const peers = [];
          for (let i = 1; i < lines.length; i++) {
            const p = lines[i].split('\t');
            if (p.length < 8) continue;
            const latestHandshake = parseInt(p[4], 10) || 0;
            const rx = parseInt(p[5], 10) || 0;
            const tx = parseInt(p[6], 10) || 0;
            const isConnected = latestHandshake > 0 && ((Date.now() / 1000 - latestHandshake) < 180);

            peers.push({
              publicKey: p[0],
              endpoint: p[2] === '(none)' ? null : p[2],
              allowedIps: p[3],
              latestHandshake,
              transferRx: rx,
              transferTx: tx,
              connected: isConnected,
            });
          }

          resolve({
            online: true,
            interface: iface,
            totalPeers: peers.length,
            connectedPeers: peers.filter(p => p.connected).length,
            peers,
          });
        });
      });
    });

    conn.on('error', (err) => {
      resolve({ online: false, error: err.message, peers: [] });
    });

    try {
      conn.connect({
        host,
        port,
        username,
        privateKey,
        readyTimeout: 3500,
        hostVerifier: () => true,
      });
    } catch (e) {
      resolve({ online: false, error: e.message, peers: [] });
    }
  });

  const result = await sshPromise;
  if (result.online) {
    wgCache = { data: result, timestamp: Date.now() };
  }
  res.json(result);
});

let piholeCachedSid = null;
let piholeSidExpires = 0;

async function getPiholeSid(baseUrl, password) {
  if (!password) return null;
  if (piholeCachedSid && Date.now() < piholeSidExpires) {
    return piholeCachedSid;
  }
  try {
    const res = await fetch(`${baseUrl}/api/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.session?.valid && data?.session?.sid) {
        piholeCachedSid = data.session.sid;
        const validitySec = data.session.validity || 1800;
        piholeSidExpires = Date.now() + Math.max(validitySec - 120, 60) * 1000;
        return piholeCachedSid;
      }
    }
  } catch {}
  return null;
}

// 2. Pi-hole Stats
router.get('/pihole/stats', verifyToken, requireOwner, async (req, res) => {
  const baseUrl = process.env.PIHOLE_URL;
  const token = process.env.PIHOLE_API_TOKEN || '';

  if (!baseUrl) {
    return res.json({
      online: false,
      queriesToday: 0,
      blockedToday: 0,
      percentBlocked: 0,
      domainsBlocked: 0,
      uniqueClients: 0,
      message: 'Pi-hole not configured',
    });
  }

  try {
    // Attempt v5 summaryRaw first
    const v5Url = `${baseUrl}/admin/api.php?summaryRaw${token ? `&auth=${token}` : ''}`;
    const v5Res = await fetch(v5Url, { signal: AbortSignal.timeout(3000) });

    if (v5Res.ok) {
      const data = await v5Res.json();
      if (data && typeof data === 'object' && (data.dns_queries_today !== undefined || data.status)) {
        return res.json({
          online: true,
          version: 'v5',
          queriesToday: data.dns_queries_today || 0,
          blockedToday: data.ads_blocked_today || 0,
          percentBlocked: data.ads_percentage_today || 0,
          domainsBlocked: data.domains_being_blocked || 0,
          uniqueClients: data.unique_clients || 0,
          status: data.status || 'unknown',
        });
      }
    }

    // Fallback: Pi-hole v6 API
    let sid = piholeCachedSid || token;
    const v6Url = `${baseUrl}/api/stats/summary`;
    let v6Res = await fetch(v6Url, {
      headers: sid ? { 'sid': sid, 'Authorization': `Bearer ${sid}` } : {},
      signal: AbortSignal.timeout(3000),
    });

    // If unauthorized and password/token provided, authenticate via /api/auth
    if (v6Res.status === 401 && token) {
      const newSid = await getPiholeSid(baseUrl, token);
      if (newSid) {
        v6Res = await fetch(v6Url, {
          headers: { 'sid': newSid, 'Authorization': `Bearer ${newSid}` },
          signal: AbortSignal.timeout(3000),
        });
      }
    }

    if (v6Res.ok) {
      const v6Data = await v6Res.json();
      return res.json({
        online: true,
        version: 'v6',
        queriesToday: v6Data.queries?.total || 0,
        blockedToday: v6Data.queries?.blocked || 0,
        percentBlocked: v6Data.queries?.percent_blocked || 0,
        domainsBlocked: v6Data.gravity?.domains_being_blocked || 0,
        uniqueClients: v6Data.clients?.total || 0,
        status: 'enabled',
      });
    }

    res.json({
      online: false,
      queriesToday: 0,
      blockedToday: 0,
      percentBlocked: 0,
      message: 'Pi-hole offline or unconfigured',
    });
  } catch (err) {
    res.json({
      online: false,
      queriesToday: 0,
      blockedToday: 0,
      percentBlocked: 0,
      error: err.message,
    });
  }
});

// 3. Trigger Speed Test
router.post('/speedtest/run', verifyToken, requireOwner, async (req, res) => {
  const result = await runSpeedtest();
  res.json(result);
});

// 4. Service Permissions Grid
router.get('/service-permissions', verifyToken, requireOwner, (req, res) => {
  const users = db.prepare('SELECT id, name, username, email, role FROM users ORDER BY id ASC').all();
  const services = db.prepare('SELECT id, title, category, icon, is_private, requires_vpn, display_order FROM services ORDER BY display_order ASC').all();
  const permissions = db.prepare('SELECT service_id, user_id, allowed FROM service_permissions').all();

  res.json({
    users,
    services,
    permissions,
  });
});

router.patch('/service-permissions', verifyToken, requireOwner, (req, res) => {
  const perms = Array.isArray(req.body) ? req.body : req.body.permissions;
  if (!Array.isArray(perms)) {
    return res.status(400).json({ error: 'Permissions array required' });
  }

  const upsert = db.prepare(`
    INSERT INTO service_permissions (service_id, user_id, allowed)
    VALUES (?, ?, ?)
    ON CONFLICT(service_id, user_id) DO UPDATE SET allowed = excluded.allowed
  `);

  const tx = db.transaction((items) => {
    for (const p of items) {
      if (!p.service_id || !p.user_id) continue;
      upsert.run(p.service_id, p.user_id, p.allowed ? 1 : 0);
    }
  });

  try {
    tx(perms);
    res.json({ success: true, message: 'Permissions updated successfully', updated: perms.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update permissions', details: err.message });
  }
});

// 5. Feature Flags Grid
router.get('/feature-flags', verifyToken, requireOwner, (req, res) => {
  const users = db.prepare('SELECT id, name, username, role FROM users ORDER BY id ASC').all();
  const flags = db.prepare('SELECT user_id, feature_key, enabled FROM user_feature_flags').all();

  res.json({
    users,
    featureKeys: ['system_telemetry', 'wireguard_status', 'pihole_stats'],
    flags,
  });
});

router.patch('/feature-flags', verifyToken, requireOwner, (req, res) => {
  const flags = Array.isArray(req.body) ? req.body : req.body.flags;
  if (!Array.isArray(flags)) {
    return res.status(400).json({ error: 'Flags array required' });
  }

  const upsert = db.prepare(`
    INSERT INTO user_feature_flags (user_id, feature_key, enabled)
    VALUES (?, ?, ?)
    ON CONFLICT(user_id, feature_key) DO UPDATE SET enabled = excluded.enabled
  `);

  const tx = db.transaction((items) => {
    for (const f of items) {
      if (!f.user_id || !f.feature_key) continue;
      upsert.run(f.user_id, f.feature_key, f.enabled ? 1 : 0);
    }
  });

  try {
    tx(flags);
    res.json({ success: true, message: 'Feature flags updated successfully', updated: flags.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update feature flags', details: err.message });
  }
});

// 6. Pironman 5 RGB & System Configuration
router.get('/pironman/config', verifyToken, requireOwner, async (req, res) => {
  try {
    const response = await fetch('http://192.168.1.136:34001/api/v1.0/get-config', {
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch Pironman config' });
    }
    const json = await response.json();
    res.json(json.data?.system || json.data || {});
  } catch (err) {
    res.status(500).json({ error: err.message || 'Pironman unreachable' });
  }
});

router.post('/pironman/rgb', verifyToken, requireOwner, async (req, res) => {
  const { style, color, brightness, speed, enable } = req.body;
  const baseUrl = 'http://192.168.1.136:34001/api/v1.0/';
  const results = {};

  try {
    if (enable !== undefined) {
      const r = await fetch(`${baseUrl}set-rgb-enable`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enable: Boolean(enable) }),
        signal: AbortSignal.timeout(3000),
      });
      results.enable = r.ok;
    }

    if (style !== undefined) {
      const r = await fetch(`${baseUrl}set-rgb-style`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ style: String(style) }),
        signal: AbortSignal.timeout(3000),
      });
      results.style = r.ok;
    }

    if (color !== undefined) {
      const col = color.startsWith('#') ? color : `#${color}`;
      const r = await fetch(`${baseUrl}set-rgb-color`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ color: col }),
        signal: AbortSignal.timeout(3000),
      });
      results.color = r.ok;
    }

    if (brightness !== undefined) {
      const r = await fetch(`${baseUrl}set-rgb-brightness`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brightness: Math.min(100, Math.max(0, parseInt(brightness, 10))) }),
        signal: AbortSignal.timeout(3000),
      });
      results.brightness = r.ok;
    }

    if (speed !== undefined) {
      const r = await fetch(`${baseUrl}set-rgb-speed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ speed: Math.min(100, Math.max(0, parseInt(speed, 10))) }),
        signal: AbortSignal.timeout(3000),
      });
      results.speed = r.ok;
    }

    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to update Pironman RGB settings' });
  }
});

// 7. System Self-Heal: Rebuild Frontend Assets
const { exec } = require('child_process');
const path = require('path');

router.post('/system/rebuild', verifyToken, requireOwner, (req, res) => {
  const rootDir = path.resolve(__dirname, '../../../..');
  exec('npm run build --workspace=mymanager-client', { cwd: rootDir, timeout: 60000 }, (err, stdout, stderr) => {
    if (err) {
      console.error('[Admin System Rebuild Error]:', err, stderr);
      return res.status(500).json({
        success: false,
        message: 'Build process failed',
        details: err.message,
        stderr: stderr?.slice(0, 500),
      });
    }
    console.log('[Admin System Rebuild Success]:\n', stdout);
    res.json({
      success: true,
      message: 'Frontend assets rebuilt successfully',
      output: stdout?.slice(0, 300),
    });
  });
});

module.exports = router;

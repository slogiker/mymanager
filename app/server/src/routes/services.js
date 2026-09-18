const express = require('express');
const http = require('http');
const https = require('https');
const db = require('../models/db');
const { verifyToken } = require('../middleware/auth');
const { requireOwner } = require('../middleware/owner');

const router = express.Router();

function checkStatus(url) {
  return new Promise((resolve) => {
    if (!url || url === '#' || !url.startsWith('http')) return resolve('unknown');
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { timeout: 2000 }, (res) => {
      resolve(res.statusCode < 400 ? 'online' : 'error');
      res.resume();
    });
    req.on('error', () => resolve('offline'));
    req.on('timeout', () => { req.destroy(); resolve('timeout'); });
  });
}

router.get('/mine', verifyToken, async (req, res) => {
  const userId = req.user.id;
  const isOwner = req.user.role === 'owner';

  const rows = db.prepare(`
    SELECT s.*,
           COALESCE(p.enabled, 1) as enabled,
           p.start_col,
           p.start_row,
           COALESCE(p.col_span, 1) as col_span,
           COALESCE(p.row_span, 1) as row_span
    FROM services s
    LEFT JOIN user_service_prefs p ON s.id = p.service_id AND p.user_id = ?
    ORDER BY s.display_order ASC
  `).all(userId);

  let allowedRows = rows;
  if (!isOwner) {
    const userPerms = db.prepare('SELECT service_id, allowed FROM service_permissions WHERE user_id = ?').all(userId);
    const permMap = new Map(userPerms.map(p => [p.service_id, p.allowed === 1]));

    const servicesWithRules = new Set(
      db.prepare('SELECT DISTINCT service_id FROM service_permissions').all().map(r => r.service_id)
    );

    const flags = db.prepare('SELECT feature_key, enabled FROM user_feature_flags WHERE user_id = ?').all(userId);
    const flagMap = new Map(flags.map(f => [f.feature_key, f.enabled === 1]));

    allowedRows = rows.filter(s => {
      if (servicesWithRules.has(s.id)) {
        return permMap.get(s.id) === true;
      }
      if (s.title === 'WireGuard status' || s.title === 'WireGuard') {
        return flagMap.get('wireguard_status') === true;
      }
      if (s.title === 'Pi-hole stats') {
        return flagMap.get('pihole_stats') === true;
      }
      if (s.category && s.category.toLowerCase() === 'system') {
        return flagMap.get('system_telemetry') === true;
      }
      if (s.is_private === 1) {
        return false;
      }
      return true;
    });
  }

  const withStatus = await Promise.all(allowedRows.map(async s => ({
    ...s,
    is_private: s.is_private === 1,
    requires_vpn: s.requires_vpn === 1,
    enabled: s.enabled === 1,
    status: await checkStatus(s.url),
  })));

  res.json(withStatus);
});

router.patch('/mine', verifyToken, (req, res) => {
  const userId = req.user.id;
  const prefs = Array.isArray(req.body) ? req.body : req.body.preferences;
  const layoutPrefs = req.body.layoutPrefs || req.body.userPreferences;

  if (layoutPrefs && typeof layoutPrefs === 'object') {
    try {
      db.prepare('UPDATE users SET preferences = ? WHERE id = ?').run(
        JSON.stringify(layoutPrefs),
        userId
      );
    } catch {}
  }

  if (!prefs && layoutPrefs) {
    return res.json({ message: 'User preferences updated successfully' });
  }

  if (!Array.isArray(prefs)) {
    return res.status(400).json({ error: 'Preferences array required' });
  }

  const upsert = db.prepare(`
    INSERT INTO user_service_prefs (user_id, service_id, enabled, start_col, start_row, col_span, row_span)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, service_id) DO UPDATE SET
      enabled = excluded.enabled,
      start_col = excluded.start_col,
      start_row = excluded.start_row,
      col_span = excluded.col_span,
      row_span = excluded.row_span
  `);

  const tx = db.transaction((items) => {
    for (const item of items) {
      if (!item.service_id) continue;
      upsert.run(
        userId,
        item.service_id,
        item.enabled !== undefined ? (item.enabled ? 1 : 0) : 1,
        item.start_col ?? null,
        item.start_row ?? null,
        item.col_span ?? 1,
        item.row_span ?? 1
      );
    }
  });

  try {
    tx(prefs);
    res.json({ message: 'Preferences updated successfully', updated: prefs.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update preferences', details: err.message });
  }
});

router.get('/user-preferences', verifyToken, (req, res) => {
  const row = db.prepare('SELECT preferences FROM users WHERE id = ?').get(req.user.id);
  let prefs = null;
  if (row && row.preferences) {
    try { prefs = JSON.parse(row.preferences); } catch {}
  }
  res.json(prefs || {});
});

router.patch('/user-preferences', verifyToken, (req, res) => {
  try {
    db.prepare('UPDATE users SET preferences = ? WHERE id = ?').run(
      JSON.stringify(req.body),
      req.user.id
    );
    res.json({ message: 'User preferences updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user preferences', details: err.message });
  }
});

router.get('/', verifyToken, async (req, res) => {
  const rows = db.prepare('SELECT * FROM services ORDER BY display_order ASC').all();
  const withStatus = await Promise.all(rows.map(async s => ({
    ...s,
    is_private: s.is_private === 1,
    requires_vpn: s.requires_vpn === 1,
    status: await checkStatus(s.url),
  })));
  res.json(withStatus);
});

router.post('/', verifyToken, requireOwner, (req, res) => {
  const { title, url, description, icon, category, is_private, requires_vpn } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });

  const maxOrder = db.prepare('SELECT MAX(display_order) as m FROM services').get().m || 0;
  const result = db.prepare(`
    INSERT INTO services (title, url, description, icon, category, is_private, requires_vpn, display_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(title, url || '#', description || null, icon || 'fa-link', category || 'Other', is_private ? 1 : 0, requires_vpn ? 1 : 0, maxOrder + 1);

  res.status(201).json(db.prepare('SELECT * FROM services WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/:id', verifyToken, requireOwner, (req, res) => {
  const row = db.prepare('SELECT * FROM services WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Service not found' });

  const { title, url, description, icon, category, is_private, requires_vpn } = req.body;
  db.prepare(`
    UPDATE services SET title=?, url=?, description=?, icon=?, category=?,
    is_private=?, requires_vpn=?, updated_at=datetime('now') WHERE id=?
  `).run(
    title ?? row.title, url ?? row.url, description ?? row.description,
    icon ?? row.icon, category ?? row.category,
    is_private !== undefined ? (is_private ? 1 : 0) : row.is_private,
    requires_vpn !== undefined ? (requires_vpn ? 1 : 0) : row.requires_vpn,
    req.params.id
  );

  res.json(db.prepare('SELECT * FROM services WHERE id = ?').get(req.params.id));
});

router.delete('/:id', verifyToken, requireOwner, (req, res) => {
  const row = db.prepare('SELECT id FROM services WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Service not found' });
  db.prepare('DELETE FROM services WHERE id = ?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

router.post('/test', verifyToken, requireOwner, async (req, res) => {
  const { url } = req.body;
  if (!url || url === '#' || !url.startsWith('http')) {
    return res.status(400).json({ error: 'Valid HTTP/HTTPS URL required (e.g. http://192.168.1.50:8080)' });
  }

  const start = Date.now();
  try {
    const mod = url.startsWith('https') ? https : http;
    const clientReq = mod.get(url, { timeout: 3500, rejectUnauthorized: false }, (clientRes) => {
      const latency = `${Date.now() - start}ms`;
      const isOk = clientRes.statusCode < 400;
      clientRes.resume();
      return res.json({
        status: isOk ? 'online' : 'error',
        statusCode: clientRes.statusCode,
        statusText: clientRes.statusMessage || (isOk ? 'OK' : 'HTTP Error'),
        latency,
      });
    });

    clientReq.on('error', (err) => {
      return res.json({
        status: 'offline',
        error: err.message || 'Host unreachable or port closed',
        latency: `${Date.now() - start}ms`,
      });
    });

    clientReq.on('timeout', () => {
      clientReq.destroy();
      return res.json({
        status: 'timeout',
        error: 'Connection timed out (>3.5s)',
        latency: '>3500ms',
      });
    });
  } catch (err) {
    return res.json({ status: 'offline', error: err.message });
  }
});

module.exports = router;

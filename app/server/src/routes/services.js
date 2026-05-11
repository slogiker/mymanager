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

router.post('/reorder', verifyToken, requireOwner, (req, res) => {
  const { order } = req.body;
  if (!Array.isArray(order)) return res.status(400).json({ error: 'order must be an array of IDs' });

  const update = db.prepare('UPDATE services SET display_order = ? WHERE id = ?');
  const tx = db.transaction(() => order.forEach((id, i) => update.run(i + 1, id)));
  tx();

  res.json({ message: 'Reordered' });
});

module.exports = router;

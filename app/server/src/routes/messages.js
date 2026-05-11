const express = require('express');
const db = require('../models/db');
const { verifyToken } = require('../middleware/auth');
const { requireOwner } = require('../middleware/owner');

const router = express.Router();

router.post('/', (req, res) => {
  const { name, email, subject, content } = req.body;
  if (!name || !email || !content) return res.status(400).json({ error: 'Name, email, and message are required' });

  const ip = (req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim().replace('::ffff:', '');

  db.prepare(`
    INSERT INTO messages (name, email, subject, content, ip_address)
    VALUES (?, ?, ?, ?, ?)
  `).run(name.trim(), email.trim().toLowerCase(), subject?.trim() || null, content.trim(), ip);

  res.status(201).json({ message: 'Message sent successfully' });
});

router.get('/', verifyToken, requireOwner, (req, res) => {
  const { archived } = req.query;
  const rows = db.prepare(`
    SELECT * FROM messages WHERE archived = ? ORDER BY created_at DESC
  `).all(archived === 'true' ? 1 : 0);
  res.json(rows);
});

router.get('/unread-count', verifyToken, requireOwner, (req, res) => {
  const row = db.prepare('SELECT COUNT(*) as count FROM messages WHERE read_at IS NULL AND archived = 0').get();
  res.json({ count: row.count });
});

router.patch('/:id/read', verifyToken, requireOwner, (req, res) => {
  db.prepare("UPDATE messages SET read_at = datetime('now') WHERE id = ?").run(req.params.id);
  res.json({ message: 'Marked as read' });
});

router.patch('/:id/archive', verifyToken, requireOwner, (req, res) => {
  db.prepare('UPDATE messages SET archived = 1 WHERE id = ?').run(req.params.id);
  res.json({ message: 'Archived' });
});

router.delete('/:id', verifyToken, requireOwner, (req, res) => {
  db.prepare('DELETE FROM messages WHERE id = ?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

module.exports = router;

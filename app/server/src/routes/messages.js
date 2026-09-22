const express = require('express');
const { z } = require('zod');
const sanitizeHtml = require('sanitize-html');
const db = require('../models/db');
const { verifyToken } = require('../middleware/auth');
const { requireOwner } = require('../middleware/owner');
const { getClientIp } = require('../utils/ipHelper');
const { messagesLimiter } = require('../middleware/rateLimit');

const router = express.Router();

function stripHtml(str) {
  if (!str) return '';
  return sanitizeHtml(str, {
    allowedTags: [],
    allowedAttributes: {},
  }).trim();
}

const messageSchema = z.object({
  name: z.string({ required_error: 'Name is required' }).trim().min(1, 'Name is required').max(100, 'Name must be at most 100 characters'),
  email: z.string({ required_error: 'Email is required' }).trim().email('Invalid email address').max(254, 'Email must be at most 254 characters'),
  subject: z.string().trim().max(200, 'Subject must be at most 200 characters').optional().nullable(),
  content: z.string({ required_error: 'Message is required' }).trim().min(1, 'Message is required').max(5000, 'Message must be at most 5000 characters'),
  _hp: z.string().optional().nullable(),
  _t: z.union([z.number(), z.string()]).optional().nullable(),
});

router.post('/', messagesLimiter, (req, res) => {
  const result = messageSchema.safeParse(req.body);
  if (!result.success) {
    const errorMsg = result.error.issues?.[0]?.message || 'Invalid input';
    return res.status(400).json({ error: errorMsg });
  }

  const { name, email, subject, content, _hp, _t } = result.data;

  // Honeypot check
  if (_hp && _hp.trim() !== '') {
    return res.status(400).json({ error: 'Spam detected' });
  }

  // Minimum time to submit check (reject if submit duration < 2s)
  if (!_t) {
    return res.status(400).json({ error: 'Submission timing verification failed' });
  }
  const loadedAt = Number(_t);
  const now = Date.now();
  if (isNaN(loadedAt) || (now - loadedAt) < 2000 || loadedAt > now + 5000) {
    return res.status(400).json({ error: 'Form submitted too quickly' });
  }

  const ip = getClientIp(req);
  const safeName = stripHtml(name);
  const safeEmail = email.toLowerCase();
  const safeSubject = subject ? stripHtml(subject) : null;
  const safeContent = stripHtml(content);

  db.prepare(`
    INSERT INTO messages (name, email, subject, content, ip_address)
    VALUES (?, ?, ?, ?, ?)
  `).run(safeName, safeEmail, safeSubject, safeContent, ip);

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

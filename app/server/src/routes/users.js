const express = require('express');
const bcrypt = require('bcrypt');
const { randomBytes } = require('crypto');
const db = require('../models/db');
const { verifyToken } = require('../middleware/auth');
const { requireOwner } = require('../middleware/owner');

const router = express.Router();

router.get('/', verifyToken, requireOwner, (req, res) => {
  const users = db.prepare('SELECT id, name, username, email, role, must_change_password, created_at FROM users ORDER BY created_at DESC').all();
  res.json(users);
});

router.post('/', verifyToken, requireOwner, (req, res) => {
  const { name, username, email, role = 'user' } = req.body;
  if (!name || !username || !email) return res.status(400).json({ error: 'Name, username, and email required' });

  const exists = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username.toLowerCase(), email.toLowerCase());
  if (exists) return res.status(409).json({ error: 'Username or email already taken' });

  const otp = randomBytes(6).toString('hex');
  const hash = bcrypt.hashSync(otp, 10);

  const result = db.prepare(`
    INSERT INTO users (name, username, email, password_hash, role, must_change_password)
    VALUES (?, ?, ?, ?, ?, 1)
  `).run(name.trim(), username.toLowerCase(), email.toLowerCase(), hash, role === 'owner' ? 'owner' : 'user');

  res.status(201).json({
    user: db.prepare('SELECT id, name, username, email, role, must_change_password, created_at FROM users WHERE id = ?').get(result.lastInsertRowid),
    oneTimePassword: otp,
  });
});

router.patch('/:id', verifyToken, requireOwner, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.role === 'owner' && req.user.id !== user.id) return res.status(403).json({ error: 'Cannot modify another owner' });

  const { name, email, role } = req.body;
  db.prepare(`
    UPDATE users SET name=?, email=?, role=?, updated_at=datetime('now') WHERE id=?
  `).run(name ?? user.name, email ?? user.email, role ?? user.role, req.params.id);

  res.json(db.prepare('SELECT id, name, username, email, role, created_at FROM users WHERE id = ?').get(req.params.id));
});

router.post('/:id/reset-password', verifyToken, requireOwner, (req, res) => {
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const otp = randomBytes(6).toString('hex');
  const hash = bcrypt.hashSync(otp, 10);
  db.prepare("UPDATE users SET password_hash=?, must_change_password=1, updated_at=datetime('now') WHERE id=?").run(hash, req.params.id);

  res.json({ oneTimePassword: otp });
});

router.delete('/:id', verifyToken, requireOwner, (req, res) => {
  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.role === 'owner') return res.status(403).json({ error: 'Cannot delete owner account' });

  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ message: 'User deleted' });
});

module.exports = router;

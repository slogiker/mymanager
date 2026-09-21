const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../models/db');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'REMOVED';
const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

// LOGIN BUG - do not fix until explicitly instructed.
// Three likely causes investigated but left intact:
// 1. authLimiter (rateLimit.js): 20 attempts / 15 min per IP. After a few wrong tries the
//    endpoint returns 429; if api.ts doesn't surface the JSON body the UI just shows "Login failed".
// 2. OTP never seen: owner account seeds with must_change_password=1 and a random one-time
//    password printed once to the server console. If that line was missed, credentials are
//    unknown without direct SQLite access (e.g. `sqlite3 data/mymanager.db "SELECT * FROM users"`).
// 3. must_change_password missing from JWT payload: the token payload (line below) only includes
//    { id, username, name, role }. After login, setUser(data.user) stores this stripped object.
//    Login.tsx:12 checks !user.must_change_password which is undefined → falsy, bypassing the
//    /change-password redirect on the client even when the DB flag is 1. Then /auth/me returns
//    the real flag and causes a re-render loop on protected pages.
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username.trim().toLowerCase());
  if (!user) return res.status(401).json({ error: 'Invalid username or password' });

  const match = bcrypt.compareSync(password, user.password_hash);
  if (!match) return res.status(401).json({ error: 'Invalid username or password' });

  const payload = {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    must_change_password: user.must_change_password ? 1 : 0,
  };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
  res.cookie('token', token, COOKIE_OPTS);

  res.json({
    user: payload,
    mustChangePassword: user.must_change_password === 1,
    must_change_password: user.must_change_password === 1,
  });
});

router.post('/register', (req, res) => {
  const { name, username, email, password, confirmPassword } = req.body;
  if (!name || !username || !email || !password) return res.status(400).json({ error: 'All fields required' });
  if (password !== confirmPassword) return res.status(400).json({ error: 'Passwords do not match' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  const exists = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username.toLowerCase(), email.toLowerCase());
  if (exists) return res.status(409).json({ error: 'Username or email already taken' });

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare(`
    INSERT INTO users (name, username, email, password_hash, role)
    VALUES (?, ?, ?, ?, 'user')
  `).run(name.trim(), username.trim().toLowerCase(), email.trim().toLowerCase(), hash);

  const payload = { id: result.lastInsertRowid, username: username.toLowerCase(), name: name.trim(), role: 'user' };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
  res.cookie('token', token, COOKIE_OPTS);

  res.status(201).json({ user: payload, mustChangePassword: false });
});

router.post('/change-password', verifyToken, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Both fields required' });
  if (newPassword.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' });

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const match = bcrypt.compareSync(currentPassword, user.password_hash);
  if (!match) return res.status(401).json({ error: 'Current password is incorrect' });

  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ?, must_change_password = 0, updated_at = datetime(\'now\') WHERE id = ?').run(hash, user.id);

  res.json({ message: 'Password changed successfully' });
});

router.patch('/username', verifyToken, (req, res) => {
  const { username } = req.body;
  if (!username || typeof username !== 'string') {
    return res.status(400).json({ error: 'Username required' });
  }

  const clean = username.trim().toLowerCase();
  if (clean.length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters' });
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(clean)) {
    return res.status(400).json({ error: 'Username may only contain alphanumeric characters, underscores, and hyphens' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (clean === user.username) {
    return res.json({ message: 'Username unchanged', username: clean, user });
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(clean, user.id);
  if (existing) {
    return res.status(409).json({ error: 'Username already taken' });
  }

  db.prepare("UPDATE users SET username = ?, updated_at = datetime('now') WHERE id = ?").run(clean, user.id);

  const updatedUser = db.prepare('SELECT id, name, username, email, role, must_change_password, created_at FROM users WHERE id = ?').get(user.id);

  const payload = {
    id: updatedUser.id,
    username: updatedUser.username,
    name: updatedUser.name,
    role: updatedUser.role,
    must_change_password: updatedUser.must_change_password ? 1 : 0,
  };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
  res.cookie('token', token, COOKIE_OPTS);

  res.json({ message: 'Username updated successfully', username: clean, user: updatedUser });
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out' });
});

router.get('/me', verifyToken, (req, res) => {
  const user = db.prepare('SELECT id, name, username, email, role, must_change_password, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

router.patch('/me', verifyToken, (req, res) => {
  const { name, email, username } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  let cleanUsername = user.username;
  if (username !== undefined) {
    cleanUsername = username.toLowerCase().trim();
    if (cleanUsername.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters' });
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(cleanUsername)) {
      return res.status(400).json({ error: 'Username may only contain alphanumeric characters, underscores, and hyphens' });
    }
    if (cleanUsername !== user.username) {
      const exists = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(cleanUsername, user.id);
      if (exists) return res.status(409).json({ error: 'Username already taken' });
    }
  }

  if (email && email.toLowerCase().trim() !== user.email) {
    const exists = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email.toLowerCase().trim(), user.id);
    if (exists) return res.status(409).json({ error: 'Email already taken' });
  }

  const updatedName = name !== undefined ? name.trim() : user.name;
  const updatedEmail = email !== undefined ? email.toLowerCase().trim() : user.email;

  db.prepare(`
    UPDATE users SET name = ?, username = ?, email = ?, updated_at = datetime('now') WHERE id = ?
  `).run(updatedName, cleanUsername, updatedEmail, user.id);

  const updatedUser = db.prepare('SELECT id, name, username, email, role, must_change_password, created_at FROM users WHERE id = ?').get(user.id);

  const payload = {
    id: updatedUser.id,
    username: updatedUser.username,
    name: updatedUser.name,
    role: updatedUser.role,
    must_change_password: updatedUser.must_change_password ? 1 : 0,
  };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
  res.cookie('token', token, COOKIE_OPTS);

  res.json(updatedUser);
});

router.delete('/me', verifyToken, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.role === 'owner') {
    return res.status(403).json({ error: 'Owner account cannot be deleted' });
  }

  db.prepare('DELETE FROM users WHERE id = ?').run(user.id);
  res.clearCookie('token');
  res.json({ message: 'Account deleted successfully' });
});

module.exports = router;

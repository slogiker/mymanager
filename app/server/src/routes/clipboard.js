const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const db = require('../models/db');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

const clipStorage = multer.diskStorage({
  destination: path.join(__dirname, '../../uploads/clipboard'),
  filename: (_req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`),
});

const upload = multer({ storage: clipStorage });

const dir = path.join(__dirname, '../../uploads/clipboard');
const fs = require('fs');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

function getOwnerFilter(req) {
  if (req.user) return { col: 'user_id', val: req.user.id };
  const sessionId = req.cookies?.clip_session;
  return sessionId ? { col: 'session_id', val: sessionId } : null;
}

function ensureClipSession(req, res) {
  if (req.user) return null;
  let sessionId = req.cookies?.clip_session;
  if (!sessionId) {
    sessionId = uuidv4();
    res.cookie('clip_session', sessionId, {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: 'lax',
    });
  }
  return sessionId;
}

router.get('/', optionalAuth, (req, res) => {
  const filter = getOwnerFilter(req);
  if (!filter) return res.json([]);

  const rows = filter.col === 'user_id'
    ? db.prepare(`
        SELECT * FROM clipboard_items
        WHERE user_id = ? AND (expires_at IS NULL OR expires_at > datetime('now'))
        ORDER BY pinned DESC, updated_at DESC
      `).all(filter.val)
    : db.prepare(`
        SELECT * FROM clipboard_items
        WHERE session_id = ? AND (expires_at IS NULL OR expires_at > datetime('now'))
        ORDER BY pinned DESC, updated_at DESC
      `).all(filter.val);

  res.json(rows);
});

router.post('/', optionalAuth, upload.single('file'), (req, res) => {
  const sessionId = ensureClipSession(req, res);
  const { type = 'text', content, language, title, expires_in } = req.body;

  let filename = null, filePath = null, mimeType = null;
  if (req.file) {
    filename = req.file.originalname;
    filePath = `/uploads/clipboard/${req.file.filename}`;
    mimeType = req.file.mimetype;
  }

  let expiresAt = null;
  if (expires_in) {
    const ms = { '1h': 3600000, '24h': 86400000, '7d': 604800000 };
    if (ms[expires_in]) expiresAt = new Date(Date.now() + ms[expires_in]).toISOString();
  }

  const result = db.prepare(`
    INSERT INTO clipboard_items (user_id, session_id, type, content, language, title, filename, file_path, mime_type, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    req.user?.id ?? null, req.user ? null : sessionId,
    type, content || null, language || null, title || null,
    filename, filePath, mimeType, expiresAt
  );

  res.status(201).json(db.prepare('SELECT * FROM clipboard_items WHERE id = ?').get(result.lastInsertRowid));
});

router.patch('/:id/pin', optionalAuth, (req, res) => {
  const filter = getOwnerFilter(req);
  if (!filter) return res.status(401).json({ error: 'Not authenticated' });

  const item = filter.col === 'user_id'
    ? db.prepare('SELECT * FROM clipboard_items WHERE id = ? AND user_id = ?').get(req.params.id, filter.val)
    : db.prepare('SELECT * FROM clipboard_items WHERE id = ? AND session_id = ?').get(req.params.id, filter.val);
  if (!item) return res.status(404).json({ error: 'Not found' });

  db.prepare("UPDATE clipboard_items SET pinned = ?, updated_at = datetime('now') WHERE id = ?").run(item.pinned ? 0 : 1, item.id);
  res.json({ pinned: !item.pinned });
});

router.delete('/:id', optionalAuth, (req, res) => {
  const filter = getOwnerFilter(req);
  if (!filter) return res.status(401).json({ error: 'Not authenticated' });

  const item = filter.col === 'user_id'
    ? db.prepare('SELECT * FROM clipboard_items WHERE id = ? AND user_id = ?').get(req.params.id, filter.val)
    : db.prepare('SELECT * FROM clipboard_items WHERE id = ? AND session_id = ?').get(req.params.id, filter.val);
  if (!item) return res.status(404).json({ error: 'Not found' });

  if (item.file_path) {
    const full = path.join(__dirname, '../..', item.file_path);
    if (fs.existsSync(full)) fs.unlinkSync(full);
  }

  db.prepare('DELETE FROM clipboard_items WHERE id = ?').run(item.id);
  res.json({ message: 'Deleted' });
});

router.delete('/', optionalAuth, (req, res) => {
  const filter = getOwnerFilter(req);
  if (!filter) return res.status(401).json({ error: 'Not authenticated' });

  const items = filter.col === 'user_id'
    ? db.prepare('SELECT * FROM clipboard_items WHERE user_id = ?').all(filter.val)
    : db.prepare('SELECT * FROM clipboard_items WHERE session_id = ?').all(filter.val);
  items.forEach(item => {
    if (item.file_path) {
      const full = path.join(__dirname, '../..', item.file_path);
      if (fs.existsSync(full)) try { fs.unlinkSync(full); } catch {}
    }
  });

  if (filter.col === 'user_id') {
    db.prepare('DELETE FROM clipboard_items WHERE user_id = ?').run(filter.val);
  } else {
    db.prepare('DELETE FROM clipboard_items WHERE session_id = ?').run(filter.val);
  }
  res.json({ message: 'Cleared' });
});

// Share a clipboard item to website users (so it shows in everyone's notes/clipboard with notification)
router.post('/:id/share-to-users', optionalAuth, (req, res) => {
  const filter = getOwnerFilter(req);
  if (!filter) return res.status(401).json({ error: 'Not authenticated' });

  const clip = filter.col === 'user_id'
    ? db.prepare('SELECT * FROM clipboard_items WHERE id = ? AND user_id = ?').get(req.params.id, filter.val)
    : db.prepare('SELECT * FROM clipboard_items WHERE id = ? AND session_id = ?').get(req.params.id, filter.val);
  if (!clip) return res.status(404).json({ error: 'Clipboard item not found' });

  const senderName = req.user?.username || req.user?.name || 'Someone';
  const { targetUserIds = [] } = req.body;

  // Fetch target users
  const users = Array.isArray(targetUserIds) && targetUserIds.length > 0
    ? db.prepare(`SELECT id, username, name FROM users WHERE id IN (${targetUserIds.map(() => '?').join(',')})`).all(...targetUserIds)
    : db.prepare('SELECT id, username, name FROM users WHERE id != ?').all(req.user?.id || 0);

  const titlePrefix = `[Shared by ${senderName}] `;
  const title = clip.title ? (clip.title.startsWith('[Shared') ? clip.title : `${titlePrefix}${clip.title}`) : `${titlePrefix}Snippet`;

  const insertStmt = db.prepare(`
    INSERT INTO clipboard_items (user_id, session_id, type, content, language, title, filename, file_path, mime_type, pinned, created_at, updated_at)
    VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, 0, datetime('now'), datetime('now'))
  `);

  for (const u of users) {
    insertStmt.run(
      u.id,
      clip.type,
      clip.content,
      clip.language,
      title,
      clip.filename,
      clip.file_path,
      clip.mime_type
    );
  }

  // Insert notification in messages table
  try {
    const itemLabel = clip.title || (clip.content ? (clip.content.length > 30 ? clip.content.slice(0, 30) + '…' : clip.content) : 'Clipboard Item');
    db.prepare(`
      INSERT INTO messages (name, email, subject, content, ip_address)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      senderName,
      req.user?.email || 'system@slogiker.si',
      `Shared Note from ${senderName}`,
      `"${itemLabel}" was shared to your clipboard and notes by ${senderName}.`,
      req.ip || '127.0.0.1'
    );
  } catch {}

  res.json({ success: true, count: users.length, message: `Shared with ${users.length} user(s)` });
});

module.exports = router;


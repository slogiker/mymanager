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

  const rows = db.prepare(`
    SELECT * FROM clipboard_items
    WHERE ${filter.col} = ? AND (expires_at IS NULL OR expires_at > datetime('now'))
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

  const item = db.prepare(`SELECT * FROM clipboard_items WHERE id = ? AND ${filter.col} = ?`).get(req.params.id, filter.val);
  if (!item) return res.status(404).json({ error: 'Not found' });

  db.prepare("UPDATE clipboard_items SET pinned = ?, updated_at = datetime('now') WHERE id = ?").run(item.pinned ? 0 : 1, item.id);
  res.json({ pinned: !item.pinned });
});

router.delete('/:id', optionalAuth, (req, res) => {
  const filter = getOwnerFilter(req);
  if (!filter) return res.status(401).json({ error: 'Not authenticated' });

  const item = db.prepare(`SELECT * FROM clipboard_items WHERE id = ? AND ${filter.col} = ?`).get(req.params.id, filter.val);
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

  const items = db.prepare(`SELECT * FROM clipboard_items WHERE ${filter.col} = ?`).all(filter.val);
  items.forEach(item => {
    if (item.file_path) {
      const full = path.join(__dirname, '../..', item.file_path);
      if (fs.existsSync(full)) try { fs.unlinkSync(full); } catch {}
    }
  });

  db.prepare(`DELETE FROM clipboard_items WHERE ${filter.col} = ?`).run(filter.val);
  res.json({ message: 'Cleared' });
});

module.exports = router;

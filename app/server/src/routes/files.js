const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const db = require('../models/db');
const { optionalAuth, verifyToken } = require('../middleware/auth');
const { requireOwner } = require('../middleware/owner');
const { uploadLimiter } = require('../middleware/rateLimit');

const router = express.Router();

const USER_FILE_LIMIT = 100 * 1024 * 1024;
const USER_TOTAL_LIMIT = 1024 * 1024 * 1024;

const filesDir = path.join(__dirname, '../../uploads/files');
if (!fs.existsSync(filesDir)) fs.mkdirSync(filesDir, { recursive: true });

const storage = multer.diskStorage({
  destination: filesDir,
  filename: (_req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`),
});

function getFileLimits(req) {
  if (req.user?.role === 'owner') return {};
  return { fileSize: USER_FILE_LIMIT };
}

function getOwnerFilter(req) {
  if (req.user) return { col: 'user_id', val: req.user.id };
  const sessionId = req.cookies?.clip_session;
  return sessionId ? { col: 'session_id', val: sessionId } : null;
}

function ensureSession(req, res) {
  if (req.user) return null;
  let sessionId = req.cookies?.clip_session;
  if (!sessionId) {
    sessionId = uuidv4();
    res.cookie('clip_session', sessionId, { maxAge: 7 * 24 * 60 * 60 * 1000, httpOnly: true, sameSite: 'lax' });
  }
  return sessionId;
}

router.get('/', optionalAuth, (req, res) => {
  const filter = getOwnerFilter(req);
  if (!filter) return res.json([]);

  const { folder_id } = req.query;
  // folder_id=null → root (IS NULL), folder_id=<uuid> → specific folder
  let rows;
  if (folder_id === 'null' || folder_id === '') {
    rows = db.prepare(
      `SELECT * FROM files WHERE ${filter.col} = ? AND folder_id IS NULL ORDER BY created_at DESC`
    ).all(filter.val);
  } else if (folder_id) {
    rows = db.prepare(
      `SELECT * FROM files WHERE ${filter.col} = ? AND folder_id = ? ORDER BY created_at DESC`
    ).all(filter.val, folder_id);
  } else {
    rows = db.prepare(
      `SELECT * FROM files WHERE ${filter.col} = ? ORDER BY created_at DESC`
    ).all(filter.val);
  }
  res.json(rows);
});

router.post('/', uploadLimiter, optionalAuth, (req, res) => {
  const sessionId = ensureSession(req, res);

  if (req.user && req.user.role !== 'owner') {
    const totalUsed = db.prepare('SELECT SUM(size) as total FROM files WHERE user_id = ?').get(req.user.id);
    if ((totalUsed.total || 0) >= USER_TOTAL_LIMIT) {
      return res.status(413).json({ error: 'Storage limit reached (1GB)' });
    }
  }

  const upload = multer({ storage, limits: getFileLimits(req) });
  upload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const folderId = req.body.folder_id || null;

    const result = db.prepare(`
      INSERT INTO files (user_id, session_id, folder_id, original_name, stored_name, file_path, mime_type, size)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.user?.id ?? null,
      req.user ? null : sessionId,
      folderId,
      req.file.originalname,
      req.file.filename,
      `/uploads/files/${req.file.filename}`,
      req.file.mimetype,
      req.file.size
    );

    res.status(201).json(db.prepare('SELECT * FROM files WHERE id = ?').get(result.lastInsertRowid));
  });
});

// Move file to a folder (owner only)
router.patch('/:id/move', verifyToken, requireOwner, (req, res) => {
  const { folder_id } = req.body;

  const file = db.prepare('SELECT * FROM files WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!file) return res.status(404).json({ error: 'File not found' });

  if (folder_id) {
    const folder = db.prepare('SELECT id FROM folders WHERE id = ? AND user_id = ?').get(folder_id, req.user.id);
    if (!folder) return res.status(404).json({ error: 'Folder not found' });
  }

  db.prepare('UPDATE files SET folder_id = ? WHERE id = ?').run(folder_id || null, req.params.id);
  res.json(db.prepare('SELECT * FROM files WHERE id = ?').get(req.params.id));
});

router.delete('/:id', optionalAuth, (req, res) => {
  const filter = getOwnerFilter(req);
  if (!filter) return res.status(401).json({ error: 'Not authenticated' });

  const file = db.prepare(`SELECT * FROM files WHERE id = ? AND ${filter.col} = ?`).get(req.params.id, filter.val);
  if (!file) return res.status(404).json({ error: 'File not found' });

  const full = path.join(__dirname, '../..', file.file_path);
  if (fs.existsSync(full)) fs.unlinkSync(full);
  db.prepare('DELETE FROM files WHERE id = ?').run(file.id);

  res.json({ message: 'Deleted' });
});

router.delete('/', optionalAuth, (req, res) => {
  const filter = getOwnerFilter(req);
  if (!filter) return res.status(401).json({ error: 'Not authenticated' });

  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'ids array required' });

  const placeholders = ids.map(() => '?').join(',');
  const files = db.prepare(`
    SELECT * FROM files WHERE id IN (${placeholders}) AND ${filter.col} = ?
  `).all(...ids, filter.val);

  files.forEach(file => {
    const full = path.join(__dirname, '../..', file.file_path);
    if (fs.existsSync(full)) try { fs.unlinkSync(full); } catch {}
    db.prepare('DELETE FROM files WHERE id = ?').run(file.id);
  });

  res.json({ deleted: files.length });
});

module.exports = router;

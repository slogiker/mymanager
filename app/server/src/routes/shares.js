const express = require('express');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const AdmZip = require('adm-zip');
const db = require('../models/db');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

function getOwnerFilter(req) {
  if (req.user) return { col: 'user_id', val: req.user.id };
  const sessionId = req.cookies?.clip_session;
  return sessionId ? { col: 'session_id', val: sessionId } : null;
}

// Calculate ISO expiration string from preset
function calculateExpiry(preset) {
  if (!preset || preset === 'never') return null;
  const now = new Date();
  switch (preset) {
    case '1h': now.setHours(now.getHours() + 1); break;
    case '1d': now.setDate(now.getDate() + 1); break;
    case '7d': now.setDate(now.getDate() + 7); break;
    case '30d': now.setDate(now.getDate() + 30); break;
    default: return null;
  }
  return now.toISOString();
}

// Create or get existing share link
router.post('/', optionalAuth, (req, res) => {
  const { type, item_id, expires_in } = req.body;
  if (!type || !item_id) return res.status(400).json({ error: 'type and item_id required' });
  if (!['file', 'folder'].includes(type)) return res.status(400).json({ error: 'type must be file or folder' });

  const filter = getOwnerFilter(req);
  if (!filter) return res.status(401).json({ error: 'Not authenticated' });

  // Verify item belongs to user/session
  if (type === 'file') {
    const file = filter.col === 'user_id'
      ? db.prepare('SELECT id, original_name FROM files WHERE id = ? AND user_id = ?').get(item_id, filter.val)
      : db.prepare('SELECT id, original_name FROM files WHERE id = ? AND session_id = ?').get(item_id, filter.val);
    if (!file) return res.status(404).json({ error: 'File not found' });
  } else {
    const folder = filter.col === 'user_id'
      ? db.prepare('SELECT id, name FROM folders WHERE id = ? AND user_id = ?').get(item_id, filter.val)
      : null;
    if (!folder) return res.status(404).json({ error: 'Folder not found or access denied' });
  }

  const id = crypto.randomUUID();
  const token = crypto.randomBytes(16).toString('hex');
  const expiresAt = calculateExpiry(expires_in);

  db.prepare(`
    INSERT INTO shares (id, user_id, session_id, type, item_id, token, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    req.user?.id ?? null,
    req.user ? null : filter.val,
    type,
    String(item_id),
    token,
    expiresAt
  );

  const share = db.prepare('SELECT * FROM shares WHERE token = ?').get(token);
  res.status(201).json({
    ...share,
    share_url: `/share/${token}`,
  });
});

// List active shares for an item
router.get('/item/:type/:id', optionalAuth, (req, res) => {
  const { type, id } = req.params;
  const filter = getOwnerFilter(req);
  if (!filter) return res.json([]);

  const shares = filter.col === 'user_id'
    ? db.prepare('SELECT * FROM shares WHERE type = ? AND item_id = ? AND user_id = ? ORDER BY created_at DESC').all(type, String(id), filter.val)
    : db.prepare('SELECT * FROM shares WHERE type = ? AND item_id = ? AND session_id = ? ORDER BY created_at DESC').all(type, String(id), filter.val);

  // Filter out already expired
  const now = new Date().toISOString();
  const active = shares.filter(s => !s.expires_at || s.expires_at > now);
  res.json(active);
});

// Revoke a share token
router.delete('/:token', optionalAuth, (req, res) => {
  const filter = getOwnerFilter(req);
  if (!filter) return res.status(401).json({ error: 'Not authenticated' });

  const share = filter.col === 'user_id'
    ? db.prepare('SELECT * FROM shares WHERE token = ? AND user_id = ?').get(req.params.token, filter.val)
    : db.prepare('SELECT * FROM shares WHERE token = ? AND session_id = ?').get(req.params.token, filter.val);
  if (!share) return res.status(404).json({ error: 'Share not found' });

  db.prepare('DELETE FROM shares WHERE token = ?').run(req.params.token);
  res.json({ message: 'Share revoked' });
});

// Public: view shared file or folder
router.get('/public/:token', (req, res) => {
  const share = db.prepare('SELECT * FROM shares WHERE token = ?').get(req.params.token);
  if (!share) return res.status(404).json({ error: 'Share link not found or invalid' });

  if (share.expires_at && new Date(share.expires_at) < new Date()) {
    return res.status(410).json({ error: 'This share link has expired' });
  }

  if (share.type === 'file') {
    const file = db.prepare('SELECT id, original_name, stored_name, file_path, mime_type, size, created_at, preview_path, preview_type FROM files WHERE id = ?').get(share.item_id);
    if (!file) return res.status(404).json({ error: 'Shared file no longer exists' });
    return res.json({ type: 'file', file, expires_at: share.expires_at });
  }

  if (share.type === 'folder') {
    const folder = db.prepare('SELECT id, name, created_at FROM folders WHERE id = ?').get(share.item_id);
    if (!folder) return res.status(404).json({ error: 'Shared folder no longer exists' });

    // Collect all files in this folder
    const files = db.prepare('SELECT id, original_name, stored_name, file_path, mime_type, size, created_at, preview_path, preview_type FROM files WHERE folder_id = ?').all(folder.id);
    const subfolders = db.prepare('SELECT id, name, created_at FROM folders WHERE parent_id = ?').all(folder.id);

    return res.json({ type: 'folder', folder, files, subfolders, expires_at: share.expires_at });
  }

  res.status(400).json({ error: 'Unknown share type' });
});

// Public: download shared file or whole folder as ZIP
router.get('/public/:token/download', (req, res) => {
  const share = db.prepare('SELECT * FROM shares WHERE token = ?').get(req.params.token);
  if (!share) return res.status(404).json({ error: 'Share link not found or invalid' });

  if (share.expires_at && new Date(share.expires_at) < new Date()) {
    return res.status(410).json({ error: 'This share link has expired' });
  }

  const filesDir = path.join(__dirname, '../../uploads/files');

  if (share.type === 'file') {
    const file = db.prepare('SELECT * FROM files WHERE id = ?').get(share.item_id);
    if (!file) return res.status(404).json({ error: 'File not found' });

    const fullPath = path.join(filesDir, file.stored_name);
    if (!path.resolve(fullPath).startsWith(filesDir)) return res.status(403).json({ error: 'Access denied' });
    if (!fs.existsSync(fullPath)) return res.status(404).json({ error: 'File on disk missing' });

    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.original_name)}"`);
    res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
    return fs.createReadStream(fullPath).pipe(res);
  }

  if (share.type === 'folder') {
    const folder = db.prepare('SELECT * FROM folders WHERE id = ?').get(share.item_id);
    if (!folder) return res.status(404).json({ error: 'Folder not found' });

    const zip = new AdmZip();

    function addFolderToZip(folderId, zipPath) {
      const folderFiles = db.prepare('SELECT * FROM files WHERE folder_id = ?').all(folderId);
      for (const f of folderFiles) {
        const full = path.join(filesDir, f.stored_name);
        if (fs.existsSync(full)) {
          zip.addLocalFile(full, zipPath, f.original_name);
        }
      }
      const children = db.prepare('SELECT * FROM folders WHERE parent_id = ?').all(folderId);
      for (const child of children) {
        addFolderToZip(child.id, path.join(zipPath, child.name));
      }
    }

    addFolderToZip(folder.id, '');

    const buffer = zip.toBuffer();
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(folder.name)}.zip"`);
    res.setHeader('Content-Type', 'application/zip');
    return res.send(buffer);
  }

  res.status(400).json({ error: 'Invalid share type' });
});

module.exports = router;

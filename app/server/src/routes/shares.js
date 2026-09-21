const express = require('express');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const AdmZip = require('adm-zip');
const db = require('../models/db');
const { optionalAuth } = require('../middleware/auth');
const { parseDocument } = require('../utils/documentParser');

const router = express.Router();

function getOwnerFilter(req) {
  if (req.user) return { col: 'user_id', val: req.user.id };
  const sessionId = req.cookies?.clip_session;
  return sessionId ? { col: 'session_id', val: sessionId } : null;
}

function getFileForOwner(id, filter) {
  if (!filter) return null;
  return filter.col === 'user_id'
    ? db.prepare('SELECT * FROM files WHERE id = ? AND user_id = ?').get(id, filter.val)
    : db.prepare('SELECT * FROM files WHERE id = ? AND session_id = ?').get(id, filter.val);
}

// List registered users for sharing dropdown
router.get('/users', optionalAuth, (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  const users = db.prepare('SELECT id, name, username, email FROM users ORDER BY name ASC').all();
  res.json(users);
});

// Get people with access for a specific file or folder
router.get('/permissions/:type/:id', optionalAuth, (req, res) => {
  const { type, id } = req.params;
  const filter = getOwnerFilter(req);
  if (!filter) return res.status(401).json({ error: 'Not authenticated' });

  // Fetch owner of item
  let itemOwner = null;
  if (type === 'file') {
    const file = db.prepare('SELECT user_id FROM files WHERE id = ?').get(id);
    if (file && file.user_id) {
      itemOwner = db.prepare('SELECT id, name, username, email FROM users WHERE id = ?').get(file.user_id);
    }
  } else if (type === 'clip' || type === 'clipboard') {
    const clip = db.prepare('SELECT user_id FROM clipboard_items WHERE id = ?').get(id);
    if (clip && clip.user_id) {
      itemOwner = db.prepare('SELECT id, name, username, email FROM users WHERE id = ?').get(clip.user_id);
    }
  } else {
    const folder = db.prepare('SELECT user_id FROM folders WHERE id = ?').get(id);
    if (folder && folder.user_id) {
      itemOwner = db.prepare('SELECT id, name, username, email FROM users WHERE id = ?').get(folder.user_id);
    }
  }

  const permissions = db.prepare(`
    SELECT p.id, p.item_type, p.item_id, p.user_id, p.permission, p.created_at,
           u.name, u.username, u.email
    FROM item_permissions p
    JOIN users u ON p.user_id = u.id
    WHERE p.item_type = ? AND p.item_id = ?
    ORDER BY p.created_at ASC
  `).all(type, String(id));

  res.json({ owner: itemOwner, permissions });
});

// Add or update a user's permission for an item
router.post('/permissions/:type/:id', optionalAuth, (req, res) => {
  const { type, id } = req.params;
  const { user_id, permission = 'viewer' } = req.body;
  const filter = getOwnerFilter(req);
  if (!filter) return res.status(401).json({ error: 'Not authenticated' });

  let isOwner = false;
  if (type === 'file') {
    const file = getFileForOwner(id, filter);
    isOwner = !!file;
  } else if (type === 'clip' || type === 'clipboard') {
    const clip = filter.col === 'user_id'
      ? db.prepare('SELECT id FROM clipboard_items WHERE id = ? AND user_id = ?').get(id, filter.val)
      : db.prepare('SELECT id FROM clipboard_items WHERE id = ? AND session_id = ?').get(id, filter.val);
    isOwner = !!clip;
  } else {
    const folder = filter.col === 'user_id'
      ? db.prepare('SELECT id FROM folders WHERE id = ? AND user_id = ?').get(id, filter.val)
      : null;
    isOwner = !!folder;
  }
  if (!isOwner && req.user?.role !== 'owner') {
    return res.status(403).json({ error: 'Only item owner can manage permissions' });
  }

  const targetUser = db.prepare('SELECT id, name, username, email FROM users WHERE id = ?').get(user_id);
  if (!targetUser) return res.status(404).json({ error: 'Target user not found' });

  db.prepare(`
    INSERT INTO item_permissions (item_type, item_id, user_id, permission)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(item_type, item_id, user_id) DO UPDATE SET permission = excluded.permission
  `).run(type, String(id), targetUser.id, permission);

  const row = db.prepare(`
    SELECT p.id, p.item_type, p.item_id, p.user_id, p.permission, p.created_at,
           u.name, u.username, u.email
    FROM item_permissions p
    JOIN users u ON p.user_id = u.id
    WHERE p.item_type = ? AND p.item_id = ? AND p.user_id = ?
  `).get(type, String(id), targetUser.id);

  res.status(201).json(row);
});

// Revoke a user's permission
router.delete('/permissions/:type/:id/:userId', optionalAuth, (req, res) => {
  const { type, id, userId } = req.params;
  const filter = getOwnerFilter(req);
  if (!filter) return res.status(401).json({ error: 'Not authenticated' });

  db.prepare('DELETE FROM item_permissions WHERE item_type = ? AND item_id = ? AND user_id = ?').run(type, String(id), userId);
  res.json({ message: 'Permission removed' });
});

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
  const { type, item_id, expires_in, permission = 'viewer', is_public = 1 } = req.body;
  if (!type || !item_id) return res.status(400).json({ error: 'type and item_id required' });
  if (!['file', 'folder', 'clip', 'clipboard'].includes(type)) return res.status(400).json({ error: 'type must be file, folder, or clip' });

  const filter = getOwnerFilter(req);
  if (!filter) return res.status(401).json({ error: 'Not authenticated' });

  // Verify item belongs to user/session
  if (type === 'file') {
    const file = filter.col === 'user_id'
      ? db.prepare('SELECT id, original_name FROM files WHERE id = ? AND user_id = ?').get(item_id, filter.val)
      : db.prepare('SELECT id, original_name FROM files WHERE id = ? AND session_id = ?').get(item_id, filter.val);
    if (!file) return res.status(404).json({ error: 'File not found' });
  } else if (type === 'clip' || type === 'clipboard') {
    const clip = filter.col === 'user_id'
      ? db.prepare('SELECT id, title, content FROM clipboard_items WHERE id = ? AND user_id = ?').get(item_id, filter.val)
      : db.prepare('SELECT id, title, content FROM clipboard_items WHERE id = ? AND session_id = ?').get(item_id, filter.val);
    if (!clip) return res.status(404).json({ error: 'Clipboard item not found' });
  } else {
    const folder = filter.col === 'user_id'
      ? db.prepare('SELECT id, name FROM folders WHERE id = ? AND user_id = ?').get(item_id, filter.val)
      : null;
    if (!folder) return res.status(404).json({ error: 'Folder not found or access denied' });
  }

  const id = crypto.randomUUID();
  const token = crypto.randomBytes(16).toString('hex');
  const expiresAt = calculateExpiry(expires_in);
  const safePermission = ['viewer', 'editor'].includes(permission) ? permission : 'viewer';
  const safeIsPublic = is_public === 0 || is_public === false ? 0 : 1;

  db.prepare(`
    INSERT INTO shares (id, user_id, session_id, type, item_id, token, permission, is_public, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    req.user?.id ?? null,
    req.user ? null : filter.val,
    type,
    String(item_id),
    token,
    safePermission,
    safeIsPublic,
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
    let itemName = 'Shared item';
    if (share.type === 'file') {
      const f = db.prepare('SELECT original_name FROM files WHERE id = ?').get(share.item_id);
      if (f) itemName = f.original_name;
    } else if (share.type === 'clip' || share.type === 'clipboard') {
      const c = db.prepare('SELECT title FROM clipboard_items WHERE id = ?').get(share.item_id);
      if (c) itemName = c.title || 'Shared snippet';
    } else {
      const f = db.prepare('SELECT name FROM folders WHERE id = ?').get(share.item_id);
      if (f) itemName = f.name;
    }
    return res.status(410).json({
      error: 'This share link has expired',
      expired: true,
      expires_at: share.expires_at,
      item_name: itemName,
      type: share.type
    });
  }

  if (share.type === 'clip' || share.type === 'clipboard') {
    const clip = db.prepare('SELECT id, type, title, content, language, filename, file_path, mime_type, created_at FROM clipboard_items WHERE id = ?').get(share.item_id);
    if (!clip) return res.status(404).json({ error: 'Shared clipboard item no longer exists' });
    return res.json({
      type: 'clip',
      clip,
      permission: share.permission || 'viewer',
      expires_at: share.expires_at,
      is_public: share.is_public ?? 1
    });
  }

  if (share.type === 'file') {
    const file = db.prepare('SELECT id, original_name, stored_name, file_path, mime_type, size, created_at, preview_path, preview_type FROM files WHERE id = ?').get(share.item_id);
    if (!file) return res.status(404).json({ error: 'Shared file no longer exists' });
    return res.json({
      type: 'file',
      file,
      permission: share.permission || 'viewer',
      expires_at: share.expires_at,
      is_public: share.is_public ?? 1
    });
  }

  if (share.type === 'folder') {
    const folder = db.prepare('SELECT id, name, created_at FROM folders WHERE id = ?').get(share.item_id);
    if (!folder) return res.status(404).json({ error: 'Shared folder no longer exists' });

    // Collect all files in this folder
    const files = db.prepare('SELECT id, original_name, stored_name, file_path, mime_type, size, created_at, preview_path, preview_type FROM files WHERE folder_id = ?').all(folder.id);
    const subfolders = db.prepare('SELECT id, name, created_at FROM folders WHERE parent_id = ?').all(folder.id);

    return res.json({
      type: 'folder',
      folder,
      files,
      subfolders,
      permission: share.permission || 'viewer',
      expires_at: share.expires_at,
      is_public: share.is_public ?? 1
    });
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

// Public: get parsed document content (.docx, .odt, .pptx, .odp, .doc)
router.get('/public/:token/document-content', (req, res) => {
  const share = db.prepare('SELECT * FROM shares WHERE token = ?').get(req.params.token);
  if (!share) return res.status(404).json({ error: 'Share link not found or invalid' });
  if (share.expires_at && new Date(share.expires_at) < new Date()) {
    return res.status(410).json({ error: 'This share link has expired', expired: true });
  }
  if (share.type !== 'file') return res.status(400).json({ error: 'Only files have document content' });

  const file = db.prepare('SELECT * FROM files WHERE id = ?').get(share.item_id);
  if (!file) return res.status(404).json({ error: 'File not found' });

  const filesDir = path.join(__dirname, '../../uploads/files');
  const fullPath = path.join(filesDir, file.stored_name);
  if (!path.resolve(fullPath).startsWith(filesDir)) return res.status(403).json({ error: 'Access denied' });
  if (!fs.existsSync(fullPath)) return res.status(404).json({ error: 'File on disk missing' });

  const result = parseDocument(fullPath, file.original_name);
  if (result.error) return res.status(400).json({ error: result.error });
  res.json(result);
});

// Public: editor update file content
router.put('/public/:token/content', (req, res) => {
  const share = db.prepare('SELECT * FROM shares WHERE token = ?').get(req.params.token);
  if (!share) return res.status(404).json({ error: 'Share link not found or invalid' });
  if (share.expires_at && new Date(share.expires_at) < new Date()) {
    return res.status(410).json({ error: 'This share link has expired', expired: true });
  }
  if (share.permission !== 'editor') {
    return res.status(403).json({ error: 'Read only: this link does not have editor permission' });
  }
  if (share.type !== 'file') return res.status(400).json({ error: 'Only files can have content saved' });

  const file = db.prepare('SELECT * FROM files WHERE id = ?').get(share.item_id);
  if (!file) return res.status(404).json({ error: 'File not found' });

  const { content } = req.body;
  if (content === undefined) return res.status(400).json({ error: 'content required' });

  const filesDir = path.join(__dirname, '../../uploads/files');
  const fullPath = path.join(filesDir, file.stored_name);
  if (!path.resolve(fullPath).startsWith(filesDir)) return res.status(403).json({ error: 'Access denied' });
  fs.writeFileSync(fullPath, content, 'utf8');
  const size = Buffer.byteLength(content, 'utf8');
  db.prepare('UPDATE files SET size = ? WHERE id = ?').run(size, file.id);

  res.json({ message: 'Saved successfully', size });
});

// Public: editor upload file into shared folder
const multer = require('multer');
const { uploadLimiter } = require('../middleware/rateLimit');
const uploadStorage = multer.diskStorage({
  destination: path.join(__dirname, '../../uploads/files'),
  filename: (_req, file, cb) => cb(null, `${crypto.randomUUID()}${path.extname(file.originalname)}`),
});

router.post('/public/:token/upload', uploadLimiter, (req, res) => {
  const share = db.prepare('SELECT * FROM shares WHERE token = ?').get(req.params.token);
  if (!share) return res.status(404).json({ error: 'Share link not found or invalid' });
  if (share.expires_at && new Date(share.expires_at) < new Date()) {
    return res.status(410).json({ error: 'This share link has expired', expired: true });
  }
  if (share.permission !== 'editor' || share.type !== 'folder') {
    return res.status(403).json({ error: 'Upload not permitted on this link' });
  }

  const folder = db.prepare('SELECT * FROM folders WHERE id = ?').get(share.item_id);
  if (!folder) return res.status(404).json({ error: 'Shared folder no longer exists' });

  const upload = multer({ storage: uploadStorage, limits: { fileSize: 100 * 1024 * 1024 } });
  upload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const ext = path.extname(req.file.originalname).toLowerCase();
    const mime = req.file.mimetype || 'application/octet-stream';
    const resDb = db.prepare(`
      INSERT INTO files (user_id, session_id, folder_id, original_name, stored_name, file_path, mime_type, size)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(folder.user_id, null, folder.id, req.file.originalname, req.file.filename, `/uploads/files/${req.file.filename}`, mime, req.file.size);

    res.status(201).json(db.prepare('SELECT * FROM files WHERE id = ?').get(resDb.lastInsertRowid));
  });
});

module.exports = router;

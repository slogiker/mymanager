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

function getFileForOwner(id, filter) {
  if (!filter) return null;
  return filter.col === 'user_id'
    ? db.prepare('SELECT * FROM files WHERE id = ? AND user_id = ?').get(id, filter.val)
    : db.prepare('SELECT * FROM files WHERE id = ? AND session_id = ?').get(id, filter.val);
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

  const { folder_id, pinned } = req.query;

  if (pinned === '1') {
    const rows = filter.col === 'user_id'
      ? db.prepare('SELECT * FROM files WHERE user_id = ? AND pinned = 1 ORDER BY original_name ASC').all(filter.val)
      : db.prepare('SELECT * FROM files WHERE session_id = ? AND pinned = 1 ORDER BY original_name ASC').all(filter.val);
    return res.json(rows);
  }

  // folder_id=null → root (IS NULL), folder_id=<uuid> → specific folder
  let rows;
  if (folder_id === 'null' || folder_id === '') {
    rows = filter.col === 'user_id'
      ? db.prepare('SELECT * FROM files WHERE user_id = ? AND folder_id IS NULL ORDER BY created_at DESC').all(filter.val)
      : db.prepare('SELECT * FROM files WHERE session_id = ? AND folder_id IS NULL ORDER BY created_at DESC').all(filter.val);
  } else if (folder_id) {
    rows = filter.col === 'user_id'
      ? db.prepare('SELECT * FROM files WHERE user_id = ? AND folder_id = ? ORDER BY created_at DESC').all(filter.val, folder_id)
      : db.prepare('SELECT * FROM files WHERE session_id = ? AND folder_id = ? ORDER BY created_at DESC').all(filter.val, folder_id);
  } else {
    rows = filter.col === 'user_id'
      ? db.prepare('SELECT * FROM files WHERE user_id = ? ORDER BY created_at DESC').all(filter.val)
      : db.prepare('SELECT * FROM files WHERE session_id = ? ORDER BY created_at DESC').all(filter.val);
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
    let previewPath = null;
    let previewType = null;
    const ext = path.extname(req.file.originalname).toLowerCase();
    if (ext === '.f3d') {
      try {
        const AdmZip = require('adm-zip');
        const zip = new AdmZip(path.join(filesDir, req.file.filename));
        const thumbEntry = zip.getEntries().find(e => e.entryName.toLowerCase().endsWith('.png') || e.entryName.toLowerCase().includes('thumbnail'));
        if (thumbEntry) {
          const thumbFileName = `thumb_${uuidv4()}.png`;
          fs.writeFileSync(path.join(filesDir, thumbFileName), thumbEntry.getData());
          previewPath = `/uploads/files/${thumbFileName}`;
          previewType = 'cad-thumbnail';
        }
      } catch (e) {}
    }

    const result = db.prepare(`
      INSERT INTO files (user_id, session_id, folder_id, original_name, stored_name, file_path, mime_type, size, preview_path, preview_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.user?.id ?? null,
      req.user ? null : sessionId,
      folderId,
      req.file.originalname,
      req.file.filename,
      `/uploads/files/${req.file.filename}`,
      req.file.mimetype,
      req.file.size,
      previewPath,
      previewType
    );

    res.status(201).json(db.prepare('SELECT * FROM files WHERE id = ?').get(result.lastInsertRowid));
  });
});

// Create a new empty text file
router.post('/create', uploadLimiter, optionalAuth, (req, res) => {
  const sessionId = ensureSession(req, res);
  const { name, folder_id } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name required' });

  const safeName = path.basename(name.trim());
  if (!safeName || safeName === '.' || safeName === '..' || safeName.includes('/') || safeName.includes('\\') || safeName.includes('\0')) {
    return res.status(400).json({ error: 'Invalid filename' });
  }

  const ext = path.extname(safeName).toLowerCase();
  const stored = `${uuidv4()}${ext}`;
  const fullPath = path.join(filesDir, stored);
  if (!path.resolve(fullPath).startsWith(filesDir)) {
    return res.status(400).json({ error: 'Invalid file path' });
  }
  fs.writeFileSync(fullPath, '', 'utf8');

  const mime = ext === '.md' ? 'text/markdown'
    : ext === '.json' ? 'application/json'
    : ext === '.html' ? 'text/html'
    : ext === '.css' ? 'text/css'
    : ext === '.js' || ext === '.mjs' ? 'text/javascript'
    : ext === '.ts' || ext === '.tsx' ? 'text/typescript'
    : ext === '.py' ? 'text/x-python'
    : ext === '.sh' ? 'text/x-sh'
    : 'text/plain';

  const result = db.prepare(`
    INSERT INTO files (user_id, session_id, folder_id, original_name, stored_name, file_path, mime_type, size)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0)
  `).run(req.user?.id ?? null, req.user ? null : sessionId, folder_id || null, safeName, stored, `/uploads/files/${stored}`, mime);

  res.status(201).json(db.prepare('SELECT * FROM files WHERE id = ?').get(result.lastInsertRowid));
});

// Read text file content
router.get('/:id/content', optionalAuth, (req, res) => {
  const filter = getOwnerFilter(req);
  if (!filter) return res.status(401).json({ error: 'Not authenticated' });

  const file = getFileForOwner(req.params.id, filter);
  if (!file) return res.status(404).json({ error: 'File not found' });

  const fullPath = path.join(filesDir, file.stored_name);
  if (!path.resolve(fullPath).startsWith(filesDir)) return res.status(403).json({ error: 'Access denied' });
  if (!fs.existsSync(fullPath)) return res.status(404).json({ error: 'File not on disk' });

  const content = fs.readFileSync(fullPath, 'utf8');
  res.json({ content });
});

// Write text file content
router.put('/:id/content', optionalAuth, (req, res) => {
  const filter = getOwnerFilter(req);
  if (!filter) return res.status(401).json({ error: 'Not authenticated' });

  const file = getFileForOwner(req.params.id, filter);
  if (!file) return res.status(404).json({ error: 'File not found' });

  const { content } = req.body;
  if (content === undefined) return res.status(400).json({ error: 'content required' });

  const fullPath = path.join(filesDir, file.stored_name);
  if (!path.resolve(fullPath).startsWith(filesDir)) return res.status(403).json({ error: 'Access denied' });
  fs.writeFileSync(fullPath, content, 'utf8');
  const size = Buffer.byteLength(content, 'utf8');
  db.prepare('UPDATE files SET size = ? WHERE id = ?').run(size, file.id);

  res.json({ message: 'Saved', size });
});

// Toggle pin
router.patch('/:id/pin', optionalAuth, (req, res) => {
  const filter = getOwnerFilter(req);
  if (!filter) return res.status(401).json({ error: 'Not authenticated' });

  const file = getFileForOwner(req.params.id, filter);
  if (!file) return res.status(404).json({ error: 'File not found' });

  db.prepare('UPDATE files SET pinned = ? WHERE id = ?').run(file.pinned ? 0 : 1, file.id);
  res.json(db.prepare('SELECT * FROM files WHERE id = ?').get(file.id));
});

// Rename file
router.patch('/:id', optionalAuth, (req, res) => {
  const filter = getOwnerFilter(req);
  if (!filter) return res.status(401).json({ error: 'Not authenticated' });

  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'New name required' });

  const file = getFileForOwner(req.params.id, filter);
  if (!file) return res.status(404).json({ error: 'File not found' });

  db.prepare('UPDATE files SET original_name = ? WHERE id = ?').run(name.trim(), file.id);
  res.json(db.prepare('SELECT * FROM files WHERE id = ?').get(file.id));
});

// Move file to a folder (supports both logged in and session users)
router.patch('/:id/move', optionalAuth, (req, res) => {
  const filter = getOwnerFilter(req);
  if (!filter) return res.status(401).json({ error: 'Not authenticated' });

  const { folder_id } = req.body;

  const file = getFileForOwner(req.params.id, filter);
  if (!file) return res.status(404).json({ error: 'File not found' });

  if (folder_id) {
    const folder = filter.col === 'user_id'
      ? db.prepare('SELECT id FROM folders WHERE id = ? AND user_id = ?').get(folder_id, filter.val)
      : db.prepare('SELECT id FROM folders WHERE id = ?').get(folder_id);
    if (!folder) return res.status(404).json({ error: 'Folder not found or access denied' });
  }

  db.prepare('UPDATE files SET folder_id = ? WHERE id = ?').run(folder_id || null, req.params.id);
  res.json(db.prepare('SELECT * FROM files WHERE id = ?').get(req.params.id));
});

// Inspect archive contents without extracting
router.get('/:id/archive-contents', optionalAuth, (req, res) => {
  const filter = getOwnerFilter(req);
  if (!filter) return res.status(401).json({ error: 'Not authenticated' });

  const file = getFileForOwner(req.params.id, filter);
  if (!file) return res.status(404).json({ error: 'File not found' });

  const fullPath = path.join(filesDir, file.stored_name);
  if (!fs.existsSync(fullPath)) return res.status(404).json({ error: 'File not on disk' });

  try {
    const AdmZip = require('adm-zip');
    const zip = new AdmZip(fullPath);
    const entries = zip.getEntries().map(e => ({
      name: path.basename(e.entryName),
      entryName: e.entryName,
      isDirectory: e.isDirectory,
      size: e.header.size,
      compressedSize: e.header.compressedSize,
    }));
    res.json({ entries, count: entries.length });
  } catch (err) {
    res.status(400).json({ error: 'Could not read archive contents', details: err.message });
  }
});

// Extract a zip file into a folder
router.post('/extract-zip', uploadLimiter, optionalAuth, (req, res) => {
  const sessionId = ensureSession(req, res);
  const upload = multer({ storage, limits: getFileLimits(req) });

  upload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No zip file uploaded' });

    const AdmZip = require('adm-zip');
    const zipFilePath = path.join(filesDir, req.file.filename);
    const parentFolderId = req.body.folder_id || null;

    try {
      const zip = new AdmZip(zipFilePath);
      const zipEntries = zip.getEntries();
      const baseRaw = path.basename(req.file.originalname, path.extname(req.file.originalname));
      const baseFolderName = baseRaw.replace(/[^a-zA-Z0-9._ -]/g, '').trim() || 'extracted';

      // Create root extracted folder
      const rootFolderId = uuidv4();
      const userId = req.user?.id ?? null;
      db.prepare('INSERT INTO folders (id, user_id, name, parent_id) VALUES (?, ?, ?, ?)').run(rootFolderId, userId, baseFolderName, parentFolderId);

      const folderMap = new Map(); // relative path -> folder id
      folderMap.set('', rootFolderId);

      // Create any nested subfolders first with strict Zip Slip protection
      zipEntries.forEach(entry => {
        // Reject entries with path traversal, null bytes, or absolute paths
        const normalized = path.normalize(entry.entryName);
        if (normalized.startsWith('..') || path.isAbsolute(entry.entryName) || entry.entryName.includes('\0')) {
          return;
        }

        if (entry.isDirectory) {
          const cleanPath = entry.entryName.replace(/\/+$/, '');
          const parts = cleanPath.split('/').filter(p => p && p !== '.' && p !== '..');
          let currentParent = rootFolderId;
          let accPath = '';

          for (const part of parts) {
            const safePart = path.basename(part);
            if (!safePart || safePart === '.' || safePart === '..') continue;
            accPath = accPath ? `${accPath}/${safePart}` : safePart;
            if (!folderMap.has(accPath)) {
              const newFid = uuidv4();
              try {
                db.prepare('INSERT INTO folders (id, user_id, name, parent_id) VALUES (?, ?, ?, ?)').run(newFid, userId, safePart, currentParent);
                folderMap.set(accPath, newFid);
              } catch {}
            }
            currentParent = folderMap.get(accPath);
          }
        }
      });

      // Extract and insert files with Zip Slip validation
      const insertedFiles = [];
      zipEntries.forEach(entry => {
        const normalized = path.normalize(entry.entryName);
        if (normalized.startsWith('..') || path.isAbsolute(entry.entryName) || entry.entryName.includes('\0')) {
          return;
        }

        if (!entry.isDirectory) {
          const dirName = path.dirname(entry.entryName);
          const targetFolderId = dirName === '.' ? rootFolderId : (folderMap.get(dirName) || rootFolderId);
          const fileName = path.basename(entry.entryName);
          if (!fileName || fileName.startsWith('..') || fileName.includes('\0')) return;

          const ext = path.extname(fileName);
          const stored = `${uuidv4()}${ext}`;
          const outPath = path.join(filesDir, stored);
          if (!path.resolve(outPath).startsWith(filesDir)) return;

          fs.writeFileSync(outPath, entry.getData());
          const size = entry.header.size;
          const mime = ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'application/octet-stream';

          const resDb = db.prepare(`
            INSERT INTO files (user_id, session_id, folder_id, original_name, stored_name, file_path, mime_type, size)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run(userId, req.user ? null : sessionId, targetFolderId, fileName, stored, `/uploads/files/${stored}`, mime, size);

          insertedFiles.push(resDb.lastInsertRowid);
        }
      });

      // Remove the temporary raw zip if extraction was requested
      try { fs.unlinkSync(zipFilePath); } catch {}

      res.status(201).json({
        message: 'Extracted successfully',
        folder_id: rootFolderId,
        folder_name: baseFolderName,
        files_count: insertedFiles.length,
      });
    } catch (zipErr) {
      res.status(500).json({ error: 'Failed to extract zip archive', details: zipErr.message });
    }
  });
});

router.delete('/:id', optionalAuth, (req, res) => {
  const filter = getOwnerFilter(req);
  if (!filter) return res.status(401).json({ error: 'Not authenticated' });

  const file = getFileForOwner(req.params.id, filter);
  if (!file) return res.status(404).json({ error: 'File not found' });

  const full = path.join(__dirname, '../..', file.file_path);
  if (fs.existsSync(full)) fs.unlinkSync(full);
  db.prepare('DELETE FROM files WHERE id = ?').run(file.id);

  res.json({ message: 'Deleted' });
});

router.delete('/', optionalAuth, (req, res) => {
  const filter = getOwnerFilter(req);
  if (!filter) return res.status(401).json({ error: 'Not authenticated' });

  // Accept ids from body or query params (comma-separated)
  let ids = req.body?.ids;
  if (!ids && req.query.ids) {
    ids = String(req.query.ids).split(',').map(s => Number(s.trim())).filter(n => !isNaN(n));
  }
  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'ids array required' });

  const placeholders = ids.map(() => '?').join(',');
  const files = filter.col === 'user_id'
    ? db.prepare(`SELECT * FROM files WHERE id IN (${placeholders}) AND user_id = ?`).all(...ids, filter.val)
    : db.prepare(`SELECT * FROM files WHERE id IN (${placeholders}) AND session_id = ?`).all(...ids, filter.val);

  files.forEach(file => {
    const full = path.join(__dirname, '../..', file.file_path);
    if (fs.existsSync(full)) try { fs.unlinkSync(full); } catch {}
    db.prepare('DELETE FROM files WHERE id = ?').run(file.id);
  });

  res.json({ deleted: files.length });
});

module.exports = router;

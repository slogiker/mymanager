const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../models/db');
const { verifyToken } = require('../middleware/auth');
const { requireOwner } = require('../middleware/owner');

const router = express.Router();
router.use(verifyToken, requireOwner);

router.get('/', (req, res) => {
  const { parent_id } = req.query;
  let folders;
  if (parent_id === 'null' || parent_id === '') {
    folders = db.prepare('SELECT * FROM folders WHERE user_id = ? AND parent_id IS NULL ORDER BY name ASC').all(req.user.id);
  } else if (parent_id) {
    folders = db.prepare('SELECT * FROM folders WHERE user_id = ? AND parent_id = ? ORDER BY name ASC').all(req.user.id, parent_id);
  } else {
    folders = db.prepare('SELECT * FROM folders WHERE user_id = ? ORDER BY name ASC').all(req.user.id);
  }
  res.json(folders);
});

router.post('/', (req, res) => {
  const { name, parent_id } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name required' });

  const parentVal = parent_id || null;

  const countRow = parentVal
    ? db.prepare('SELECT COUNT(*) as c FROM folders WHERE user_id = ? AND parent_id = ?').get(req.user.id, parentVal)
    : db.prepare('SELECT COUNT(*) as c FROM folders WHERE user_id = ? AND parent_id IS NULL').get(req.user.id);
  if (countRow.c >= 10) return res.status(400).json({ error: 'Maximum 10 folders per level' });

  const exists = parentVal
    ? db.prepare('SELECT id FROM folders WHERE user_id = ? AND name = ? AND parent_id = ?').get(req.user.id, name.trim(), parentVal)
    : db.prepare('SELECT id FROM folders WHERE user_id = ? AND name = ? AND parent_id IS NULL').get(req.user.id, name.trim());
  if (exists) return res.status(409).json({ error: 'Folder already exists' });

  const id = uuidv4();
  db.prepare('INSERT INTO folders (id, user_id, name, parent_id) VALUES (?, ?, ?, ?)').run(id, req.user.id, name.trim(), parentVal);
  res.status(201).json(db.prepare('SELECT * FROM folders WHERE id = ?').get(id));
});

router.patch('/:id', (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name required' });

  const folder = db.prepare('SELECT * FROM folders WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!folder) return res.status(404).json({ error: 'Folder not found' });

  const conflict = folder.parent_id
    ? db.prepare('SELECT id FROM folders WHERE user_id = ? AND name = ? AND parent_id = ? AND id != ?').get(req.user.id, name.trim(), folder.parent_id, req.params.id)
    : db.prepare('SELECT id FROM folders WHERE user_id = ? AND name = ? AND parent_id IS NULL AND id != ?').get(req.user.id, name.trim(), req.params.id);
  if (conflict) return res.status(409).json({ error: 'Folder name already in use' });

  db.prepare('UPDATE folders SET name = ? WHERE id = ?').run(name.trim(), req.params.id);
  res.json(db.prepare('SELECT * FROM folders WHERE id = ?').get(req.params.id));
});

const path = require('path');
const fs = require('fs');
const AdmZip = require('adm-zip');

router.get('/tree', (req, res) => {
  const folders = db.prepare('SELECT * FROM folders WHERE user_id = ? ORDER BY name ASC').all(req.user.id);
  res.json(folders);
});

router.get('/pinned', (req, res) => {
  const pinned = db.prepare('SELECT * FROM folders WHERE user_id = ? AND pinned = 1 ORDER BY name ASC').all(req.user.id);
  res.json(pinned);
});

router.patch('/:id/pin', (req, res) => {
  const folder = db.prepare('SELECT * FROM folders WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!folder) return res.status(404).json({ error: 'Folder not found' });

  const nextPinned = folder.pinned ? 0 : 1;
  db.prepare('UPDATE folders SET pinned = ? WHERE id = ?').run(nextPinned, folder.id);
  res.json({ ...folder, pinned: nextPinned });
});

router.get('/:id/download', (req, res) => {
  const folder = db.prepare('SELECT * FROM folders WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!folder) return res.status(404).json({ error: 'Folder not found' });

  const filesDir = path.join(__dirname, '../../uploads/files');
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
  res.send(buffer);
});

router.delete('/:id', (req, res) => {
  const folder = db.prepare('SELECT * FROM folders WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!folder) return res.status(404).json({ error: 'Folder not found' });

  function deleteRecursive(folderId) {
    const children = db.prepare('SELECT id FROM folders WHERE parent_id = ?').all(folderId);
    for (const child of children) deleteRecursive(child.id);
    db.prepare('UPDATE files SET folder_id = NULL WHERE folder_id = ?').run(folderId);
    db.prepare('DELETE FROM folders WHERE id = ?').run(folderId);
  }
  deleteRecursive(req.params.id);

  res.json({ message: 'Deleted' });
});

module.exports = router;

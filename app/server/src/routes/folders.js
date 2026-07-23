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

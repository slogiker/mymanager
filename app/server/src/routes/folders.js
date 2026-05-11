const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../models/db');
const { verifyToken } = require('../middleware/auth');
const { requireOwner } = require('../middleware/owner');

const router = express.Router();

// All folder routes require owner
router.use(verifyToken, requireOwner);

router.get('/', (req, res) => {
  const folders = db.prepare(
    'SELECT * FROM folders WHERE user_id = ? ORDER BY name ASC'
  ).all(req.user.id);
  res.json(folders);
});

router.post('/', (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name required' });

  const exists = db.prepare(
    'SELECT id FROM folders WHERE user_id = ? AND name = ?'
  ).get(req.user.id, name.trim());
  if (exists) return res.status(409).json({ error: 'Folder already exists' });

  const id = uuidv4();
  db.prepare(
    'INSERT INTO folders (id, user_id, name) VALUES (?, ?, ?)'
  ).run(id, req.user.id, name.trim());

  res.status(201).json(db.prepare('SELECT * FROM folders WHERE id = ?').get(id));
});

router.patch('/:id', (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name required' });

  const folder = db.prepare(
    'SELECT * FROM folders WHERE id = ? AND user_id = ?'
  ).get(req.params.id, req.user.id);
  if (!folder) return res.status(404).json({ error: 'Folder not found' });

  const conflict = db.prepare(
    'SELECT id FROM folders WHERE user_id = ? AND name = ? AND id != ?'
  ).get(req.user.id, name.trim(), req.params.id);
  if (conflict) return res.status(409).json({ error: 'Folder name already in use' });

  db.prepare('UPDATE folders SET name = ? WHERE id = ?').run(name.trim(), req.params.id);
  res.json(db.prepare('SELECT * FROM folders WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const folder = db.prepare(
    'SELECT * FROM folders WHERE id = ? AND user_id = ?'
  ).get(req.params.id, req.user.id);
  if (!folder) return res.status(404).json({ error: 'Folder not found' });

  // Move files to root (null folder_id)
  db.prepare("UPDATE files SET folder_id = NULL WHERE folder_id = ?").run(req.params.id);
  db.prepare('DELETE FROM folders WHERE id = ?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

module.exports = router;

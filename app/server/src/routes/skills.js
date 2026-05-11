const express = require('express');
const db = require('../models/db');
const { verifyToken } = require('../middleware/auth');
const { requireOwner } = require('../middleware/owner');

const router = express.Router();

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM skills ORDER BY category ASC, display_order ASC').all());
});

router.post('/', verifyToken, requireOwner, (req, res) => {
  const { name, category, icon_name, proficiency, color } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });

  const maxOrder = db.prepare('SELECT MAX(display_order) as m FROM skills').get().m || 0;
  const result = db.prepare(`
    INSERT INTO skills (name, category, icon_name, proficiency, color, display_order)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(name, category || 'Other', icon_name || null, proficiency || 3, color || '#64748b', maxOrder + 1);

  res.status(201).json(db.prepare('SELECT * FROM skills WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/:id', verifyToken, requireOwner, (req, res) => {
  const row = db.prepare('SELECT * FROM skills WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Skill not found' });

  const { name, category, icon_name, proficiency, color, display_order } = req.body;
  db.prepare(`UPDATE skills SET name=?, category=?, icon_name=?, proficiency=?, color=?, display_order=? WHERE id=?`).run(
    name ?? row.name, category ?? row.category, icon_name ?? row.icon_name,
    proficiency ?? row.proficiency, color ?? row.color, display_order ?? row.display_order,
    req.params.id
  );

  res.json(db.prepare('SELECT * FROM skills WHERE id = ?').get(req.params.id));
});

router.delete('/:id', verifyToken, requireOwner, (req, res) => {
  db.prepare('DELETE FROM skills WHERE id = ?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

module.exports = router;

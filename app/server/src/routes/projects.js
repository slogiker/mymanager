const express = require('express');
const https = require('https');
const db = require('../models/db');
const { verifyToken } = require('../middleware/auth');
const { requireOwner } = require('../middleware/owner');

const router = express.Router();

function parseJson(str, fallback = []) {
  try { return JSON.parse(str); } catch { return fallback; }
}

function formatProject(row) {
  return {
    ...row,
    tech_stack: parseJson(row.tech_stack),
    tags: parseJson(row.tags),
    featured: row.featured === 1,
  };
}

router.get('/', (req, res) => {
  const { tag, tech } = req.query;
  let rows = db.prepare('SELECT * FROM projects ORDER BY featured DESC, display_order ASC, created_at DESC').all();
  let projects = rows.map(formatProject);

  if (tag) projects = projects.filter(p => p.tags.includes(tag));
  if (tech) projects = projects.filter(p => p.tech_stack.includes(tech));

  res.json(projects);
});

router.get('/tags', (req, res) => {
  const rows = db.prepare('SELECT tags FROM projects').all();
  const all = new Set();
  rows.forEach(r => parseJson(r.tags).forEach(t => all.add(t)));
  res.json([...all].sort());
});

router.get('/techs', (req, res) => {
  const rows = db.prepare('SELECT tech_stack FROM projects').all();
  const all = new Set();
  rows.forEach(r => parseJson(r.tech_stack).forEach(t => all.add(t)));
  res.json([...all].sort());
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Project not found' });
  res.json(formatProject(row));
});

router.post('/', verifyToken, requireOwner, (req, res) => {
  const { title, description, github_url, live_url, image_url, tech_stack, tags, featured, seo_description, og_image, display_order } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });

  const result = db.prepare(`
    INSERT INTO projects (title, description, github_url, live_url, image_url, tech_stack, tags, featured, seo_description, og_image, display_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    title, description || null, github_url || null, live_url || null, image_url || null,
    JSON.stringify(tech_stack || []), JSON.stringify(tags || []),
    featured ? 1 : 0, seo_description || null, og_image || null, display_order || 0
  );

  const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(formatProject(row));
});

router.put('/:id', verifyToken, requireOwner, (req, res) => {
  const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Project not found' });

  const { title, description, github_url, live_url, image_url, tech_stack, tags, featured, seo_description, og_image, display_order } = req.body;

  db.prepare(`
    UPDATE projects SET title=?, description=?, github_url=?, live_url=?, image_url=?,
    tech_stack=?, tags=?, featured=?, seo_description=?, og_image=?, display_order=?, updated_at=datetime('now')
    WHERE id=?
  `).run(
    title ?? row.title, description ?? row.description, github_url ?? row.github_url,
    live_url ?? row.live_url, image_url ?? row.image_url,
    JSON.stringify(tech_stack ?? parseJson(row.tech_stack)),
    JSON.stringify(tags ?? parseJson(row.tags)),
    featured !== undefined ? (featured ? 1 : 0) : row.featured,
    seo_description ?? row.seo_description, og_image ?? row.og_image,
    display_order ?? row.display_order, req.params.id
  );

  res.json(formatProject(db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id)));
});

router.delete('/:id', verifyToken, requireOwner, (req, res) => {
  const row = db.prepare('SELECT id FROM projects WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Project not found' });
  db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

router.post('/seed-from-github', verifyToken, requireOwner, (req, res) => {
  const options = {
    hostname: 'api.github.com',
    path: '/users/slogiker/repos?sort=updated&per_page=20',
    method: 'GET',
    headers: { 'User-Agent': 'MyManager/2.0' },
  };

  const request = https.request(options, (response) => {
    let data = '';
    response.on('data', chunk => data += chunk);
    response.on('end', () => {
      try {
        const repos = JSON.parse(data);
        if (!Array.isArray(repos)) return res.status(502).json({ error: 'GitHub API error', detail: data.slice(0, 200) });

        const insert = db.prepare(`
          INSERT OR IGNORE INTO projects (title, description, github_url, live_url, tech_stack, tags, display_order)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        let added = 0;
        repos.forEach((repo, i) => {
          if (repo.fork) return;
          const tech = repo.language ? [repo.language] : [];
          const r = insert.run(
            repo.name, repo.description || null, repo.html_url,
            repo.homepage || null, JSON.stringify(tech), JSON.stringify(tech), i + 1
          );
          if (r.changes) added++;
        });

        res.json({ message: `Seeded ${added} new projects from GitHub` });
      } catch (e) {
        res.status(502).json({ error: 'Failed to parse GitHub response' });
      }
    });
  });

  request.on('error', (e) => res.status(502).json({ error: e.message }));
  request.end();
});

module.exports = router;

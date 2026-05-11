const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../models/db');
const { verifyToken } = require('../middleware/auth');
const { requireOwner } = require('../middleware/owner');

const router = express.Router();

const resumeStorage = multer.diskStorage({
  destination: path.join(__dirname, '../../uploads/resume'),
  filename: (_req, file, cb) => cb(null, 'resume' + path.extname(file.originalname)),
});

const upload = multer({
  storage: resumeStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files allowed'));
  },
});

const resumeDir = path.join(__dirname, '../../uploads/resume');
if (!fs.existsSync(resumeDir)) fs.mkdirSync(resumeDir, { recursive: true });

router.get('/', (req, res) => {
  const profile = db.prepare('SELECT * FROM profile WHERE id = 1').get();
  if (!profile) return res.status(404).json({ error: 'Profile not found' });
  res.json(profile);
});

router.put('/', verifyToken, requireOwner, (req, res) => {
  const { name, title, bio, avatar_url, github_url, linkedin_url, email, location } = req.body;
  const profile = db.prepare('SELECT * FROM profile WHERE id = 1').get();

  if (profile) {
    db.prepare(`
      UPDATE profile SET name=?, title=?, bio=?, avatar_url=?, github_url=?,
      linkedin_url=?, email=?, location=?, updated_at=datetime('now') WHERE id=1
    `).run(
      name ?? profile.name, title ?? profile.title, bio ?? profile.bio,
      avatar_url ?? profile.avatar_url, github_url ?? profile.github_url,
      linkedin_url ?? profile.linkedin_url, email ?? profile.email, location ?? profile.location
    );
  } else {
    db.prepare(`INSERT INTO profile (name, title, bio, avatar_url, github_url, linkedin_url, email, location) VALUES (?,?,?,?,?,?,?,?)`).run(
      name, title, bio, avatar_url, github_url, linkedin_url, email, location
    );
  }

  res.json(db.prepare('SELECT * FROM profile WHERE id = 1').get());
});

router.post('/resume', verifyToken, requireOwner, upload.single('resume'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const resumePath = `/uploads/resume/${req.file.filename}`;
  db.prepare("UPDATE profile SET resume_path = ?, updated_at = datetime('now') WHERE id = 1").run(resumePath);
  res.json({ path: resumePath });
});

router.get('/resume/download', (req, res) => {
  const profile = db.prepare('SELECT resume_path FROM profile WHERE id = 1').get();
  if (!profile?.resume_path) return res.status(404).json({ error: 'No resume uploaded' });
  const full = path.join(__dirname, '../..', profile.resume_path);
  if (!fs.existsSync(full)) return res.status(404).json({ error: 'File not found' });
  res.download(full, 'DanielPlibersek_CV.pdf');
});

router.delete('/resume', verifyToken, requireOwner, (req, res) => {
  const profile = db.prepare('SELECT resume_path FROM profile WHERE id = 1').get();
  if (profile?.resume_path) {
    const full = path.join(__dirname, '../..', profile.resume_path);
    if (fs.existsSync(full)) fs.unlinkSync(full);
    db.prepare("UPDATE profile SET resume_path = NULL, updated_at = datetime('now') WHERE id = 1").run();
  }
  res.json({ message: 'Resume deleted' });
});

module.exports = router;

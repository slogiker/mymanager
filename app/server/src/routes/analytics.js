const express = require('express');
const db = require('../models/db');
const { verifyToken } = require('../middleware/auth');
const { requireOwner } = require('../middleware/owner');

const router = express.Router();

router.get('/summary', verifyToken, requireOwner, (req, res) => {
  const { days = 30 } = req.query;

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const totalViews = db.prepare("SELECT COUNT(*) as count FROM analytics WHERE created_at > ? AND is_bot = 0").get(since);
  const uniqueVisitors = db.prepare("SELECT COUNT(DISTINCT session_id) as count FROM analytics WHERE created_at > ? AND is_bot = 0").get(since);
  const topPages = db.prepare("SELECT path, COUNT(*) as views FROM analytics WHERE created_at > ? AND is_bot = 0 GROUP BY path ORDER BY views DESC LIMIT 10").all(since);
  const byDevice = db.prepare("SELECT device_type, COUNT(*) as count FROM analytics WHERE created_at > ? AND is_bot = 0 GROUP BY device_type").all(since);
  const byCountry = db.prepare("SELECT country, country_code, COUNT(*) as count FROM analytics WHERE created_at > ? AND is_bot = 0 AND country IS NOT NULL GROUP BY country ORDER BY count DESC LIMIT 10").all(since);
  const byBrowser = db.prepare("SELECT browser, COUNT(*) as count FROM analytics WHERE created_at > ? AND is_bot = 0 AND browser IS NOT NULL GROUP BY browser ORDER BY count DESC LIMIT 8").all(since);
  const byOs = db.prepare("SELECT os, COUNT(*) as count FROM analytics WHERE created_at > ? AND is_bot = 0 AND os IS NOT NULL GROUP BY os ORDER BY count DESC LIMIT 8").all(since);
  const byDay = db.prepare(`
    SELECT date(created_at) as date, COUNT(*) as views, COUNT(DISTINCT session_id) as visitors
    FROM analytics WHERE created_at > ? AND is_bot = 0
    GROUP BY date(created_at) ORDER BY date ASC
  `).all(since);

  const topReferrers = db.prepare(`
    SELECT referrer, COUNT(*) as count FROM analytics
    WHERE created_at > ? AND is_bot = 0 AND referrer IS NOT NULL
    GROUP BY referrer ORDER BY count DESC LIMIT 10
  `).all(since);

  res.json({
    totalViews: totalViews.count,
    uniqueVisitors: uniqueVisitors.count,
    topPages, byDevice, byCountry, byBrowser, byOs, byDay, topReferrers,
  });
});

router.get('/recent', verifyToken, requireOwner, (req, res) => {
  const rows = db.prepare(`
    SELECT * FROM analytics WHERE is_bot = 0 ORDER BY created_at DESC LIMIT 50
  `).all();
  res.json(rows);
});

module.exports = router;

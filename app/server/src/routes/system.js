const express = require('express');
const { verifyToken } = require('../middleware/auth');
const { requireOwner } = require('../middleware/owner');
const SystemMonitor = require('../models/SystemMonitor');

const router = express.Router();
const monitor = new SystemMonitor();

router.get('/stats', verifyToken, requireOwner, async (req, res) => {
  try {
    const stats = await monitor.getStats();
    res.json(stats);
  } catch (e) {
    res.status(500).json({ error: 'Failed to get system stats' });
  }
});

router.get('/nodes', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'owner') {
      const db = require('../models/db');
      const flag = db.prepare('SELECT enabled FROM user_feature_flags WHERE user_id = ? AND feature_key = ?').get(req.user.id, 'system_telemetry');
      if (!flag || flag.enabled !== 1) {
        return res.status(403).json({ error: 'System telemetry access required' });
      }
    }

    const nodes = await monitor.getNodes();
    res.json(nodes);
  } catch (e) {
    res.status(500).json({ error: 'Failed to get server nodes' });
  }
});

module.exports = router;

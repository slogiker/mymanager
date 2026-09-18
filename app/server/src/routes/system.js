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
    const nodes = await monitor.getNodes();
    res.json(nodes);
  } catch (e) {
    res.status(500).json({ error: 'Failed to get server nodes' });
  }
});

module.exports = router;

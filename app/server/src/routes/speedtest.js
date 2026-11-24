const express = require('express');
const { verifyToken } = require('../middleware/auth');
const { requireOwner } = require('../middleware/owner');
const { getLatestResult, runSpeedtest } = require('../utils/speedtest');

const router = express.Router();

router.get('/latest', verifyToken, (req, res) => {
  res.json(getLatestResult());
});

// Saturating the WAN link is an availability attack when any account can start
// a run; the benchmark stays an owner action.
router.post('/run', verifyToken, requireOwner, async (req, res) => {
  try {
    const result = await runSpeedtest();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Speedtest failed' });
  }
});

module.exports = router;

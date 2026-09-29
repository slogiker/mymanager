const express = require('express');
const { verifyToken } = require('../middleware/auth');
const { getLatestResult, runSpeedtest } = require('../utils/speedtest');

const router = express.Router();

router.get('/latest', verifyToken, (req, res) => {
  res.json(getLatestResult());
});

router.post('/run', verifyToken, async (req, res) => {
  try {
    const result = await runSpeedtest();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Speedtest failed' });
  }
});

module.exports = router;

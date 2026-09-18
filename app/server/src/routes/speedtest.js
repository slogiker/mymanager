const express = require('express');
const { verifyToken } = require('../middleware/auth');
const { getLatestResult } = require('../utils/speedtest');

const router = express.Router();

router.get('/latest', verifyToken, (req, res) => {
  res.json(getLatestResult());
});

module.exports = router;

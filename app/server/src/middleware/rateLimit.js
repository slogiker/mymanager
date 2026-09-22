const rateLimit = require('express-rate-limit');
const { getClientIp } = require('../utils/ipHelper');

// Standard key generator using verified real client IP
const realIpKey = (req) => getClientIp(req);

// Global API rate limit
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: realIpKey,
  message: { error: 'Too many API requests, please slow down and try again later.', status: 429 },
});

// Dedicated login brute-force defense
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: realIpKey,
  message: { error: 'Too many login attempts from this IP. Please try again after 15 minutes.', status: 429 },
});

// General authentication rate limit (registration, password changes, token checks)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: realIpKey,
  message: { error: 'Too many authentication requests. Please try again later.', status: 429 },
});

// File upload rate limit
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: realIpKey,
  message: { error: 'Upload rate limit exceeded. Please wait a minute before uploading again.', status: 429 },
});

// Speed test rate limit (prevents uplink bandwidth starvation)
const speedtestLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: realIpKey,
  message: { error: 'Speed test rate limit reached. Please wait before starting another test.', status: 429 },
});

// Service connectivity probe limit (SSRF defense)
const serviceTestLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: realIpKey,
  message: { error: 'Service test probe limit exceeded. Please wait a few moments.', status: 429 },
});

// Dedicated message submission rate limit
const messagesLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: realIpKey,
  message: { error: 'Too many messages sent from this IP. Please try again after an hour.', status: 429 },
});

module.exports = {
  apiLimiter,
  loginLimiter,
  authLimiter,
  uploadLimiter,
  speedtestLimiter,
  serviceTestLimiter,
  messagesLimiter,
};

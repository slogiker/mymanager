const { UAParser } = require('ua-parser-js');
const geoip = require('geoip-lite');
const jwt = require('jsonwebtoken');

const SKIP_PATHS = ['/api/', '/uploads/', '/socket.io/', '/_vite', '/@', '/node_modules/'];
const BOT_PATTERNS = /bot|crawler|spider|scraper|curl|wget|python|java\/|go-http|axios/i;

const { getClientIp, anonymizeIp } = require('../utils/ipHelper');

function analyticsMiddleware(req, res, next) {
  if (SKIP_PATHS.some(p => req.path.startsWith(p))) return next();
  if (req.method !== 'GET') return next();

  try {
    const db = require('../models/db');
    const ua = req.headers['user-agent'] || '';
    const isBot = BOT_PATTERNS.test(ua);

    // No tracking cookie: privacy-first cookieless analytics
    const sessionId = null;

    const ip = getClientIp(req);
    const geo = geoip.lookup(ip) || {};
    const storedIp = anonymizeIp(ip);
    const parser = new UAParser(ua);
    const browser = parser.getBrowser();
    const os = parser.getOS();
    const device = parser.getDevice();

    let deviceType = 'desktop';
    if (device.type === 'mobile') deviceType = 'mobile';
    else if (device.type === 'tablet') deviceType = 'tablet';

    let userId = null;
    const token = req.cookies?.token;
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.id;
      } catch {}
    }

    db.prepare(`
      INSERT INTO analytics (
        session_id, ip_address, country, country_code, city, region,
        timezone, path, method, referrer, user_agent,
        browser, browser_version, os, os_version, device_type,
        language, is_bot, user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      sessionId, storedIp,
      geo.country || null, geo.country || null, geo.city || null, geo.region || null,
      geo.timezone || null,
      req.path, req.method,
      req.headers['referer'] || req.headers['referrer'] || null,
      ua.slice(0, 500),
      browser.name || null, browser.version || null,
      os.name || null, os.version || null,
      deviceType,
      req.headers['accept-language']?.split(',')[0] || null,
      isBot ? 1 : 0,
      userId
    );
  } catch {}

  next();
}

module.exports = { analyticsMiddleware };

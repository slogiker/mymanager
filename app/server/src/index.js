require('./config/env');
require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const { Client: SSHClient } = require('ssh2');
const jwt = require('jsonwebtoken');

require('./models/db');

const { analyticsMiddleware } = require('./middleware/analytics');
const {
  apiLimiter,
  authLimiter,
  loginLimiter,
  speedtestLimiter,
  serviceTestLimiter,
} = require('./middleware/rateLimit');
const { securityHeaders } = require('./middleware/securityHeaders');
const logger = require('./utils/logger');

const { isTrustedProxy } = require('./utils/ipHelper');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;
const IS_PROD = process.env.NODE_ENV === 'production';

// Process-level safety guards
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Promise Rejection', reason);
});
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', err);
});

app.set('trust proxy', isTrustedProxy);

// Security headers (OWASP)
app.use(securityHeaders);

app.use(cors({
  origin: IS_PROD ? false : 'http://localhost:5173',
  credentials: true,
}));

// Constrain payload limits (DoS prevention)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(analyticsMiddleware);

if (process.env.FILES_ENABLED === 'true') {
  app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
    setHeaders: (res, filePath) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      const ext = path.extname(filePath).toLowerCase();
      if (['.html', '.htm', '.svg', '.xml', '.xhtml', '.shtml'].includes(ext)) {
        res.setHeader('Content-Security-Policy', "default-src 'none'");
        res.setHeader('Content-Disposition', 'attachment');
      }
    }
  }));
}

// Tiered rate limiters & API routes
app.use('/api', apiLimiter);
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/services/test', serviceTestLimiter);
app.use('/api/speedtest/run', speedtestLimiter);

app.use('/api/projects', require('./routes/projects'));
app.use('/api/services', require('./routes/services'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/system', require('./routes/system'));
app.use('/api/users', require('./routes/users'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/clipboard', require('./routes/clipboard'));

if (process.env.FILES_ENABLED === 'true') {
  app.use('/api/files', require('./routes/files'));
  app.use('/api/folders', require('./routes/folders'));
  app.use('/api/shares', require('./routes/shares'));
}

app.use('/api/skills', require('./routes/skills'));
app.use('/api/vpn-status', require('./routes/vpn'));
app.use('/api/qbittorrent', require('./routes/qbittorrent'));
app.use('/api/jellyfin', require('./routes/jellyfin'));
app.use('/api/jellyseerr', require('./routes/jellyseerr'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/speedtest', require('./routes/speedtest'));

// Catch-all 404 handler for unmatched /api/* requests (scoped to /api prefix so it does not swallow SPA routes)
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Catch-all 404 handler for unmatched /uploads/* requests
app.use('/uploads', (req, res) => {
  res.status(404).json({ error: 'File not found' });
});

// Serve built frontend (static assets + history-mode fallback to index.html)
const fs = require('fs');
const clientDist = path.join(__dirname, '../../client/dist');
const indexHtmlPath = path.join(clientDist, 'index.html');

if (IS_PROD || fs.existsSync(indexHtmlPath)) {
  if (fs.existsSync(indexHtmlPath)) {
    const { injectMetaTags } = require('./utils/seoInjector');
    const db = require('./models/db');
    const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');

    app.use(express.static(clientDist, { index: false }));

    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
      try {
        const profile = db.prepare('SELECT * FROM profile WHERE id = 1').get();
        const baseTitle = `${profile?.name || 'Daniel'} - ${profile?.title || 'Full Stack Developer'}`;
        const baseDesc = profile?.bio || 'I build useful things for fun.';
        res.send(injectMetaTags(indexHtml, { title: baseTitle, description: baseDesc }));
      } catch {
        res.sendFile(indexHtmlPath);
      }
    });
  }
}

// Centralized error handling with information disclosure protection (CWE-209)
app.use((err, req, res, _next) => {
  const status = err.status || err.statusCode || 500;
  logger.error(`${req.method} ${req.originalUrl || req.url} error (${status})`, err, {
    ip: req.ip,
    status,
  });

  const message = IS_PROD && status >= 500
    ? 'Internal server error'
    : (err.message || 'An unexpected error occurred');

  res.status(status).json({
    error: message,
    status,
  });
});

// Socket.io - SSH terminal (owner only)
if (process.env.TERMINAL_ENABLED === 'true') {
  const io = new Server(server, {
    cors: {
      origin: IS_PROD ? false : 'http://localhost:5173',
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    let token = socket.handshake.auth?.token;
    if (!token && socket.handshake.headers.cookie) {
      const tokenCookie = socket.handshake.headers.cookie
        .split('; ')
        .find((r) => r.trim().startsWith('token='));
      if (tokenCookie) {
        token = decodeURIComponent(tokenCookie.split('=')[1]);
      }
    }

    if (!token) {
      console.log('Terminal connection rejected: No auth token found.');
      return socket.disconnect(true);
    }

    let user;
    try { user = jwt.verify(token, JWT_SECRET); } catch { return socket.disconnect(true); }
    if (user.role !== 'owner') {
      socket.emit('data', '\r\n\x1b[31m*** Unauthorized: Owner access required ***\x1b[0m\r\n');
      return socket.disconnect(true);
    }

    let conn = null;

    socket.on('ssh-connect', ({ host, port, username } = {}) => {
      const targetHost = host || process.env.SSH_HOST || 'ssh.slogiker.si';
      console.warn(`[SECURITY] Blocked SSH shell login attempt to ${targetHost} from user ${socket.user?.username || 'unknown'}`);

      // Shell login is disabled for security hardening
      socket.emit('data', 
        '\r\n\x1b[1;33m[SECURITY POLICY]\x1b[0m \x1b[1;31mSSH Shell Access Disabled\x1b[0m\r\n' +
        '\x1b[90m───────────────────────────────────────────────────────────────────\x1b[0m\r\n' +
        'Interactive remote shell execution is temporarily disabled for security\r\n' +
        'hardening while authentication and sandboxing models are being finalized.\r\n' +
        '\x1b[90m───────────────────────────────────────────────────────────────────\x1b[0m\r\n' +
        '\x1b[33mConnection target:\x1b[0m ' + targetHost + '\r\n' +
        '\x1b[31mStatus: Connection rejected by security policy.\x1b[0m\r\n\r\n'
      );
      socket.emit('disabled', { reason: 'SSH shell login is disabled for security reasons.' });
    });

    socket.on('disconnect', () => { if (conn) conn.end(); });
  });
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

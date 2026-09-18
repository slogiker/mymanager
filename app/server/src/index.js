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
const JWT_SECRET = process.env.JWT_SECRET || 'REMOVED';
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

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

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
app.use('/api/files', require('./routes/files'));
app.use('/api/folders', require('./routes/folders'));
app.use('/api/shares', require('./routes/shares'));
app.use('/api/skills', require('./routes/skills'));
app.use('/api/vpn-status', require('./routes/vpn'));
app.use('/api/qbittorrent', require('./routes/qbittorrent'));
app.use('/api/jellyfin', require('./routes/jellyfin'));
app.use('/api/jellyseerr', require('./routes/jellyseerr'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/speedtest', require('./routes/speedtest'));

if (IS_PROD) {
  const fs = require('fs');
  const { injectMetaTags } = require('./utils/seoInjector');
  const db = require('./models/db');
  const clientDist = path.join(__dirname, '../../client/dist');
  const indexHtml = fs.readFileSync(path.join(clientDist, 'index.html'), 'utf8');

  app.use(express.static(clientDist));

  app.get('*', (req, res) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return;
    const profile = db.prepare('SELECT * FROM profile WHERE id = 1').get();
    const baseTitle = `${profile?.name || 'Daniel'} — ${profile?.title || 'Full Stack Developer'}`;
    const baseDesc = profile?.bio || 'I build useful things for fun.';
    res.send(injectMetaTags(indexHtml, { title: baseTitle, description: baseDesc }));
  });
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

// Socket.io — SSH terminal (owner only)
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

  socket.on('ssh-connect', ({ host, port, username, password } = {}) => {
    conn = new SSHClient();

    const sshHost = host || process.env.SSH_HOST || 'ssh.slogiker.si';
    const sshPort = parseInt(port || process.env.SSH_PORT || '2222');
    const sshUser = username || process.env.SSH_USERNAME || 'slogiker';
    const sshPass = password || process.env.OWNER_PASSWORD;

    conn.on('ready', () => {
      console.log(`SSH Connection established to ${sshUser}@${sshHost}:${sshPort}`);
      socket.emit('data', '\r\n\x1b[32m*** SSH Connected ***\x1b[0m\r\n');
      conn.shell((err, stream) => {
        if (err) {
          console.error('Shell execution error:', err);
          socket.emit('data', `\r\n\x1b[31mShell error: ${err.message}\x1b[0m\r\n`);
          return;
        }
        socket.on('data', d => stream.write(d));
        socket.on('resize', ({ rows, cols }) => stream.setWindow(rows, cols, 480, 640));
        stream.on('data', d => socket.emit('data', d));
        stream.stderr.on('data', d => socket.emit('data', d));
        stream.on('close', () => {
          conn.end();
          socket.emit('data', '\r\n\x1b[33m*** SSH Session Ended ***\x1b[0m\r\n');
        });
      });
    });

    conn.on('keyboard-interactive', (name, instructions, instructionsLang, prompts, finish) => {
      if (prompts.length > 0 && prompts[0].prompt.toLowerCase().includes('password')) {
        finish([sshPass]);
      } else {
        finish([]);
      }
    });

    conn.on('error', err => {
      console.error(`SSH Connection Error to ${sshUser}@${sshHost}:${sshPort}:`, err);
      socket.emit('data', `\r\n\x1b[31mSSH Error: ${err.message}\x1b[0m\r\n`);
    });

    try {
      conn.connect({
        host: sshHost,
        port: sshPort,
        username: sshUser,
        password: sshPass,
        readyTimeout: 10000,
        tryKeyboard: true, // Try keyboard-interactive authentication fallback
        hostVerifier: () => true, // Accept any server host key fingerprint automatically
      });
    } catch (e) {
      console.error('SSH Connection Call failed:', e);
      socket.emit('data', `\r\n\x1b[31mSSH Init Error: ${e.message}\x1b[0m\r\n`);
    }
  });

  socket.on('disconnect', () => { if (conn) conn.end(); });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

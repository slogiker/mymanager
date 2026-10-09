const express = require('express');
const session = require('express-session');
const http = require('http');
const { Server } = require('socket.io');
const { Client } = require('ssh2');
const bodyParser = require('body-parser');
const path = require('path');
const cookieParser = require('cookie-parser');
const flash = require('connect-flash');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy (needed for sessions behind nginx reverse proxy)
app.set('trust proxy', 1);

// Middleware
app.use(express.static(path.join(__dirname, 'src/public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());
// Share session middleware
const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET || 'slogikers-secret-key-change-this-later',
    resave: true,
    saveUninitialized: true,
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 30 // 30 days
    }
});
app.use(sessionMiddleware);

// Session debugging middleware
app.use((req, res, next) => {
    console.log(`[SESSION DEBUG] ${req.method} ${req.path} | sessionID: ${req.sessionID} | user: ${req.session.user ? req.session.user.username : 'NONE'}`);
    next();
});
app.use(flash());

// View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src/views'));

// Router Imports
const indexRoutes = require('./src/routes/index');
const authRoutes = require('./src/routes/auth');

// Global User Middleware (to make user available in all views)
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.isAdmin = req.session.isAdmin || false;
    res.locals.messages = {
        success: req.flash('success'),
        error: req.flash('error')
    };
    next();
});

// Routes
app.use('/', indexRoutes);
app.use('/', authRoutes);

// Database Connection Test
const db = require('./src/config/database');

db.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('Database connection error:', err);
    } else {
        console.log('Database connected:', res.rows[0]);
    }
});

// Create server and WebSocket engine
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*' }
});

// Protect websockets with express session
io.use((socket, next) => {
    sessionMiddleware(socket.request, socket.request.res || {}, next);
});

// Setup SSH backend Bridge
io.on('connection', (socket) => {
    const session = socket.request.session;
    if (!session || !session.user || (session.user.role !== 'owner' && session.user.role !== 'admin')) {
        socket.emit('data', '\r\n\x1b[31m*** Unauthorized: Owner access required ***\x1b[0m\r\n');
        return socket.disconnect(true);
    }

    const conn = new Client();

    conn.on('ready', () => {
        socket.emit('data', '\r\n\x1b[32m*** Connected to slogiker@ssh.slogiker.si:2222 ***\x1b[0m\r\n');
        conn.shell((err, stream) => {
            if (err) {
                socket.emit('data', '\r\n\x1b[31m*** SSH Shell Error ***\x1b[0m\r\n');
                return socket.disconnect();
            }
            // Stream I/O
            socket.on('data', (data) => stream.write(data));
            socket.on('resize', (size) => stream.setWindow(size.rows, size.cols, 480, 640));
            // Output to terminal
            stream.on('data', (d) => socket.emit('data', d.toString('utf-8'))).on('close', () => {
                socket.emit('data', '\r\n\x1b[33m*** Session Closed ***\x1b[0m\r\n');
                conn.end();
            });
        });
    }).on('error', (err) => {
        socket.emit('data', `\r\n\x1b[31m*** Server Connection Error: ${err.message} ***\x1b[0m\r\n`);
    });

    socket.on('ssh-connect', (password) => {
        socket.emit('data', '\x1b[33mConnecting to SSH backend...\x1b[0m\r\n');
        conn.connect({
            host: 'ssh.slogiker.si',
            port: 2222,
            username: 'slogiker',
            password: password || process.env.OWNER_PASSWORD || process.env.DB_PASSWORD,
            readyTimeout: 10000
        });
    });

    socket.on('disconnect', () => {
        conn.end();
    });
});

// Server Start
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

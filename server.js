const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.static(path.join(__dirname, 'src/public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(session({
    secret: process.env.SESSION_SECRET || 'slogikers-secret-key-change-this-later',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === 'production' }
}));

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
    next();
});

// Routes
app.use('/', indexRoutes);
app.use('/', authRoutes);

// Server Start
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

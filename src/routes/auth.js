const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Login page
router.get('/login', (req, res) => {
    if (req.session.user) {
        return res.redirect('/');
    }
    res.render('login', { title: 'Login / Sign Up', loginMode: 'login' });
});

// Display signup form
router.get('/signup', (req, res) => {
    // If already logged in, go to dashboard
    if (req.session.user) {
        return res.redirect('/');
    }
    res.render('login', { title: 'Create Account', loginMode: 'signup' });
});

// Handle signup
router.post('/signup', async (req, res) => {
    const { name, username, email, password, confirmPassword } = req.body;

    // Validation
    if (!name || !username || !email || !password || !confirmPassword) {
        return res.render('login', {
            title: 'Create Account',
            loginMode: 'signup',
            error: 'All fields are required'
        });
    }

    if (password !== confirmPassword) {
        return res.render('login', {
            title: 'Create Account',
            loginMode: 'signup',
            error: 'Passwords do not match'
        });
    }

    if (password.length < 6) {
        return res.render('login', {
            title: 'Create Account',
            loginMode: 'signup',
            error: 'Password must be at least 6 characters'
        });
    }

    try {
        const result = await User.register(name, username, email, password);

        if (result.error) {
            return res.render('login', {
                title: 'Create Account',
                loginMode: 'signup',
                error: result.error
            });
        }

        // Auto-login after signup
        req.session.user = result;
        return res.redirect('/');
    } catch (err) {
        console.error(err);
        res.render('login', {
            title: 'Create Account',
            loginMode: 'signup',
            error: 'An error occurred during signup'
        });
    }
});

// Handle login
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.render('login', {
            title: 'Login / Sign Up',
            loginMode: 'login',
            error: 'Username and password are required'
        });
    }

    try {
        const user = await User.login(username, password);
        if (user) {
            req.session.user = user;
            return res.redirect('/');
        }
        res.render('login', {
            title: 'Login / Sign Up',
            loginMode: 'login',
            error: 'Invalid username or password'
        });
    } catch (err) {
        console.error(err);
        res.render('login', {
            title: 'Login / Sign Up',
            loginMode: 'login',
            error: 'An error occurred'
        });
    }
});

// Display register page
router.get('/register', (req, res) => {
    if (req.session.user) return res.redirect('/');
    res.render('register', { title: 'Register', error: undefined });
});

// Handle registration
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    try {
        const user = await User.register(username, email, password);
        req.session.user = user;
        res.redirect('/');
    } catch (err) {
        res.render('register', { title: 'Register', error: err.message });
    }
});

// Logout
router.get('/logout', (req, res) => {
    req.session.isAdmin = false;
    req.session.user = null;
    req.session.destroy();
    res.redirect('/maintenance');
});

// Maintenance Mode - Simple Admin Login
router.get('/maintenance', (req, res) => {
    if (req.session.isAdmin) {
        return res.redirect('/');
    }
    res.render('maintenance', { error: undefined });
});

router.post('/maintenance-login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.render('maintenance', {
            error: 'Username and password are required'
        });
    }

    // Check credentials against env variables
    if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
        req.session.isAdmin = true;
        return res.redirect('/');
    }

    res.render('maintenance', {
        error: 'Invalid username or password'
    });
});

module.exports = router;

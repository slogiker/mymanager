const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Login page
router.get('/login', (req, res) => {
    if (req.session.user) {
        return res.redirect('/');
    }
    // We don't render 'error' here anymore, it's in res.locals.messages
    res.render('login', { title: 'Login / Sign Up', loginMode: 'login', hideSidebar: true });
});

// Display signup form
router.get('/register', (req, res) => {
    // If already logged in, go to dashboard
    if (req.session.user) {
        return res.redirect('/');
    }
    res.render('login', { title: 'Create Account', loginMode: 'signup', hideSidebar: true });
});

// Handle signup
router.post('/register', async (req, res) => {
    const { name, username, email, password, confirmPassword } = req.body;

    // Validation
    if (!name || !username || !email || !password || !confirmPassword) {
        req.flash('error', 'All fields are required');
        return res.redirect('/register'); // redirect to clear post data but show flash
    }

    if (password !== confirmPassword) {
        req.flash('error', 'Passwords do not match');
        return res.redirect('/register');
    }

    if (password.length < 6) {
        req.flash('error', 'Password must be at least 6 characters');
        return res.redirect('/register');
    }

    try {
        const result = await User.register(name, username, email, password);

        if (result.error) {
            req.flash('error', result.error);
            return res.redirect('/register');
        }

        // Auto-login after signup
        req.session.user = result;
        req.session.isAdmin = result.isAdmin;
        req.flash('success', 'Account created successfully!');

        req.session.save(() => {
            if (result.isAdmin || result.role === 'owner') {
                return res.redirect('/owner');
            }
            return res.redirect('/user');
        });
    } catch (err) {
        console.error(err);
        req.flash('error', 'An error occurred during signup');
        return res.redirect('/register');
    }
});

// Handle login
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        req.flash('error', 'Username and password are required');
        return res.redirect('/login');
    }

    try {
        const user = await User.login(username, password);
        if (user) {
            req.session.user = user;
            req.session.isAdmin = user.isAdmin;
            req.flash('success', `Welcome back, ${user.name || user.username}!`);

            return req.session.save(() => {
                if (user.isAdmin || user.role === 'owner') {
                    return res.redirect('/owner');
                }
                return res.redirect('/user');
            });
        }

        req.flash('error', 'Invalid username or password');
        return res.redirect('/login');
    } catch (err) {
        console.error('Login error:', err);
        req.flash('error', 'An error occurred');
        return res.redirect('/login');
    }
});

// Logout
router.get('/logout', (req, res) => {
    req.session.destroy();
    // Can't show flash after session destroy unless we delay destroy or handle it differently.
    // For now simple logout.
    res.redirect('/login');
});

module.exports = router;

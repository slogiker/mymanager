const express = require('express');
const router = express.Router();
const User = require('../models/User');

router.get('/login', (req, res) => {
    if (req.session.user) return res.redirect('/');
    res.render('login', { title: 'Login', error: undefined });
});

router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.login(username, password);
        if (user) {
            req.session.user = user;
            return res.redirect('/');
        }
        res.render('login', { title: 'Login', error: 'Invalid Credentials' });
    } catch (err) {
        console.error(err);
        res.render('login', { title: 'Login', error: 'An error occurred during login' });
    }
});

router.get('/register', (req, res) => {
    if (req.session.user) return res.redirect('/');
    res.render('register', { title: 'Register', error: undefined });
});

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

router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

module.exports = router;

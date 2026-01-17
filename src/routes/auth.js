const express = require('express');
const router = express.Router();
const User = require('../models/User');

router.get('/login', (req, res) => {
    // If already logged in, go to dashboard
    if (req.session.user) {
        return res.redirect('/');
    }
    res.render('login', { title: 'Login' });
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
        res.render('login', { title: 'Login', error: 'An error occurred' });
    }
});

router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

module.exports = router;

const isAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') {
        return next();
    }
    // Optional: Redirect to login or just give 403
    // For now we might just want to let the view handle hiding things, 
    // but if this protects a route, we redirect.
    res.redirect('/login');
};

const isLoggedIn = (req, res, next) => {
    if (req.session.user) {
        return next();
    }
    res.redirect('/login');
};

module.exports = { isAdmin, isLoggedIn };

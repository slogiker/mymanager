const express = require('express');
const router = express.Router();
const dataManager = require('../models/DataManager');
const systemMonitor = require('../models/SystemMonitor');

// Maintenance Mode Middleware
router.use((req, res, next) => {
    // Check if maintenance mode is enabled in env
    const isMaintenance = process.env.MAINTENANCE_MODE === 'true';

    // Public routes that should always be accessible
    const publicPaths = [
        '/',
        '/login',
        '/register',
        '/logout',
        '/maintenance-login', // Form action for maintenance page login
        '/maintenance', // Maintenance login page
        '/api/projects' // needed for portfolio on maintenance page
    ];

    // Check for static files (css, js, images)
    const isStatic = req.path.startsWith('/css/') ||
        req.path.startsWith('/js/') ||
        req.path.startsWith('/images/') ||
        req.path.startsWith('/webfonts/');

    if (isMaintenance && !isStatic && !publicPaths.includes(req.path)) {
        // If user is logged in, check role
        if (req.session.user) {
            const role = req.session.user.role;
            if (role === 'owner' || role === 'admin') {
                return next();
            }
        }

        // Otherwise render maintenance login page
        return res.redirect('/maintenance');
    }

    next();
});

// Explicit maintenance route
router.get('/maintenance', (req, res) => {
    res.render('maintenance', {
        title: 'Under Construction',
        user: req.session.user
    });
});

// Maintenance Login Route (Specific handler for the form on maintenance.ejs)
router.post('/maintenance-login', async (req, res) => {
    // 307 preserves the POST method and data when redirecting to /login
    res.redirect(307, '/login');
});

// Public Main Page
router.get('/', async (req, res) => {
    try {
        const projects = await dataManager.getProjects();
        res.render('index', {
            title: 'Jakob Kordež',
            projects: projects,
            user: req.session.user
        });
    } catch (err) {
        console.error('Home render error:', err);
        res.status(500).send('Server Error');
    }
});

// Owner Route (System & Services)
router.get('/owner', async (req, res) => {
    // Check if user is logged in
    if (!req.session.user) {
        return res.redirect('/login');
    }

    const user = req.session.user;

    // Check role strictly for owner (or admin to be safe)
    if (user.role !== 'owner' && user.role !== 'admin') {
        req.flash('error', 'Access denied. Owner permissions required.');
        return res.redirect('/user');
    }

    try {
        const services = await dataManager.getServicesWithStatus();
        const projects = await dataManager.getProjects();
        const sysStats = await systemMonitor.getStats();

        // Determine if connected via VPN / LAN
        let clientIp = req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress || '';
        if (clientIp.includes(',')) clientIp = clientIp.split(',')[0].trim();
        if (clientIp.includes('::ffff:')) clientIp = clientIp.split('::ffff:')[1];

        const isLocalIP = clientIp === '127.0.0.1' ||
            clientIp === '::1' ||
            clientIp.startsWith('10.') ||
            clientIp.startsWith('192.168.') ||
            (clientIp.startsWith('172.') && parseInt(clientIp.split('.')[1]) >= 16 && parseInt(clientIp.split('.')[1]) <= 31);

        res.render('dashboard', {
            title: 'Dashboard Manager',
            services: services,
            projects: projects,
            user: user,
            sysStats: sysStats,
            activePage: 'dashboard',
            isVPNConnected: isLocalIP
        });
    } catch (err) {
        console.error('Owner dashboard render error:', err.message, err.stack);
        req.flash('error', 'Dashboard failed to load: ' + err.message);
        res.status(500).send('Server Error: ' + err.message);
    }
});

// Regular User Dashboard
router.get('/user', async (req, res) => {
    // Check if user is logged in
    if (!req.session.user) {
        return res.redirect('/login');
    }

    const user = req.session.user;

    try {
        res.render('user_dashboard', {
            title: 'User Area',
            user: user,
            activePage: 'dashboard'
        });
    } catch (err) {
        console.error('User dashboard render error:', err.message, err.stack);
        req.flash('error', 'Dashboard failed to load: ' + err.message);
        res.status(500).send('Server Error: ' + err.message);
    }
});

router.get('/profile', (req, res) => {
    const user = req.session.user;
    if (!user) {
        return res.redirect('/login');
    }

    res.render('profile', {
        title: 'My Profile',
        user: user
    });
});

router.post('/services/add', async (req, res) => {
    const { title, url, description, icon, isPrivate } = req.body;
    // Basic validation
    if (!title || !url) {
        return res.status(400).json({ error: 'Title and URL are required' });
    }

    const newService = {
        title,
        url,
        description: description || '',
        icon: icon || 'fa-link',
        isPrivate: isPrivate === 'on' || isPrivate === true
        // Category will be added in frontend later
    };

    try {
        await dataManager.addService(newService);
        res.redirect('/');
    } catch (err) {
        console.error('Add service error:', err);
        res.status(500).send('Error adding service');
    }
});

// Service management routes (admin only/authorized users)
router.delete('/services/:id', async (req, res) => {
    if (!req.session.user) return res.status(403).json({ error: 'Access required' });

    try {
        await dataManager.deleteService(Number(req.params.id));
        res.json({ success: true });
    } catch (err) {
        console.error('Delete service error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.put('/services/:id', async (req, res) => {
    if (!req.session.user) return res.status(403).json({ error: 'Access required' });

    const { title, url, description, icon, isPrivate } = req.body;
    try {
        await dataManager.updateService(Number(req.params.id), {
            title,
            url,
            description,
            icon,
            isPrivate: isPrivate === 'on' || isPrivate === true
        });
        res.json({ success: true });
    } catch (err) {
        console.error('Update service error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/services/reorder', async (req, res) => {
    if (!req.session.user) return res.status(403).json({ error: 'Access required' });

    const { order } = req.body; // Array of IDs
    await dataManager.reorderServices(order);
    res.json({ success: true });
});

// Public API endpoint for projects (used on maintenance page or elsewhere)
router.get('/api/projects', async (req, res) => {
    try {
        const projects = await dataManager.getProjects();
        res.json(projects);
    } catch (err) {
        console.error('Get projects error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const dataManager = require('../models/DataManager');

router.get('/', (req, res) => {
    const user = req.session.user;
    const services = dataManager.getServices(user);
    const projects = dataManager.getProjects();

    res.render('dashboard', {
        title: 'Dashboard Manager',
        services: services,
        projects: projects,
        user: user
    });
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

router.post('/services/add', (req, res) => {
    const { title, url, description, icon, isPrivate } = req.body;
    // Basic validation
    if (!title || !url) {
        return res.status(400).json({ error: 'Title and URL are required' });
    }

    const ServiceCard = require('../models/ServiceCard');
    const newService = new ServiceCard(
        title,
        url,
        description || '',
        icon || 'fa-link',
        isPrivate === 'on' || isPrivate === true
    );

    dataManager.addService(newService);
    res.redirect('/');
});

// Service management routes (admin only)
router.delete('/services/:id', (req, res) => {
    const user = req.session.user;
    if (!user || user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }

    dataManager.deleteService(Number(req.params.id));
    res.json({ success: true });
});

router.put('/services/:id', (req, res) => {
    const user = req.session.user;
    if (!user || user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }

    const { title, url, description, icon, isPrivate } = req.body;
    dataManager.updateService(Number(req.params.id), {
        title,
        url,
        description,
        icon,
        isPrivate: isPrivate === 'on' || isPrivate === true
    });
    res.json({ success: true });
});

router.post('/services/reorder', (req, res) => {
    const user = req.session.user;
    if (!user || user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }

    const { order } = req.body; // Array of IDs
    dataManager.reorderServices(order);
    res.json({ success: true });
});

// Project management routes (admin only)
router.delete('/projects/:id', (req, res) => {
    const user = req.session.user;
    if (!user || user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }

    dataManager.deleteProject(Number(req.params.id));
    res.json({ success: true });
});

router.put('/projects/:id', (req, res) => {
    const user = req.session.user;
    if (!user || user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }

    const { name, description, url, language, stars } = req.body;
    dataManager.updateProject(Number(req.params.id), {
        name,
        description,
        url,
        language,
        stars: Number(stars) || 0
    });
    res.json({ success: true });
});

router.post('/projects/reorder', (req, res) => {
    const user = req.session.user;
    if (!user || user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }

    const { order } = req.body; // Array of IDs
    dataManager.reorderProjects(order);
    res.json({ success: true });
});

module.exports = router;

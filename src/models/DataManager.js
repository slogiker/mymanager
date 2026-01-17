const ServiceCard = require('./ServiceCard');
const GithubProject = require('./GithubProject');

class DataManager {
    constructor() {
        this.services = [
            new ServiceCard('Router', '#', 'Network Router', 'fa-network-wired', true),
            new ServiceCard('Minecraft Dashboard', '#', 'MC Server Management', 'fa-cube', false),
            new ServiceCard('Folders', '#', 'File Browser', 'fa-folder-open', false),
            new ServiceCard('Pi-hole', '#', 'Network-wide Ad Blocking', 'fa-shield-halved', true),
            new ServiceCard('pgAdmin', '#', 'PostgreSQL Management', 'fa-database', true),
            new ServiceCard('NAS', '#', 'Network Attached Storage', 'fa-server', false),
            new ServiceCard('LED Controller', '#', 'Custom LED Control', 'fa-lightbulb', false)
        ];

        this.projects = [
            new GithubProject('mc-bot', 'Minecraft Bot', '#', 'Python', 0),
            new GithubProject('node-website', 'Dashboard Website', '#', 'JavaScript', 0),
            new GithubProject('test-maker', 'Test Creation Tool', '#', 'Python', 0),
            new GithubProject('Angular-MovieTracker', 'Movie Tracking App', '#', 'TypeScript', 0),
            new GithubProject('RGB-led-controller', 'LED Strip Controller', '#', 'Dart', 0)
        ];
    }

    getServices(user) {
        if (user && user.role === 'admin') {
            return this.services;
        }
        return this.services.filter(s => !s.isPrivate);
    }

    getProjects() {
        return this.projects;
    }

    // Service management methods
    addService(service) {
        this.services.push(service);
    }

    deleteService(id) {
        this.services = this.services.filter(s => s.id !== id);
    }

    updateService(id, updates) {
        const index = this.services.findIndex(s => s.id === id);
        if (index !== -1) {
            this.services[index] = { ...this.services[index], ...updates };
        }
    }

    reorderServices(newOrder) {
        // newOrder is an array of IDs in the new order
        const ordered = [];
        newOrder.forEach(id => {
            const service = this.services.find(s => s.id == id);
            if (service) ordered.push(service);
        });
        this.services = ordered;
    }

    // Project management methods
    addProject(project) {
        this.projects.push(project);
    }

    deleteProject(id) {
        this.projects = this.projects.filter(p => p.id !== id);
    }

    updateProject(id, updates) {
        const index = this.projects.findIndex(p => p.id === id);
        if (index !== -1) {
            this.projects[index] = { ...this.projects[index], ...updates };
        }
    }

    reorderProjects(newOrder) {
        const ordered = [];
        newOrder.forEach(id => {
            const project = this.projects.find(p => p.id == id);
            if (project) ordered.push(project);
        });
        this.projects = ordered;
    }
}

module.exports = new DataManager();

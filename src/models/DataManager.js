const fs = require('fs');
const path = require('path');
const https = require('https'); // For simple pings/fetches if needed, or use node-fetch

// System Monitor will be separate, but DataManager could aggregate data if needed.
// For now, let's keep DataManager focused on Content (Services/Projects).

const servicesConfigPath = path.join(__dirname, '../config/services.json');

class DataManager {
    constructor() {
        this.servicesCache = null;
        this.projectsCache = null;
        this.lastProjectFetch = 0;
    }

    // Services - Load from JSON
    async getServices(user) {
        try {
            if (!this.servicesCache) {
                const data = fs.readFileSync(servicesConfigPath, 'utf8');
                this.servicesCache = JSON.parse(data);
            }

            // Optional: Filter by privacy if needed, though user said "all valid users have access"
            // If user is not logged in, they shouldn't reach here due to route guards.
            // If we want to hide private services from partial users, we can filter.
            // Current User model sets isAdmin=true for everyone, so showing all.
            return this.servicesCache;

        } catch (err) {
            console.error('Error getting services:', err);
            return []; // Return empty if file missing or parse error
        }
    }

    // Service CRUD operations (JSON File based)
    async addService(service) {
        const services = await this.getServices();
        // Generate new ID
        const maxId = services.reduce((max, s) => Math.max(max, s.id || 0), 0);
        service.id = maxId + 1;

        services.push(service);
        this.saveServices(services);
        return service;
    }

    async deleteService(id) {
        let services = await this.getServices();
        services = services.filter(s => s.id !== id);
        this.saveServices(services);
    }

    async updateService(id, updates) {
        const services = await this.getServices();
        const index = services.findIndex(s => s.id === id);
        if (index !== -1) {
            services[index] = { ...services[index], ...updates };
            this.saveServices(services);
        }
    }

    async reorderServices(order) {
        // order is array of IDs
        const services = await this.getServices();
        const orderedServices = [];

        // Map based on order array
        order.forEach(id => {
            const service = services.find(s => s.id === parseInt(id));
            if (service) orderedServices.push(service);
        });

        // Add any strictly missing services to the end (safety)
        services.forEach(s => {
            // Check both string and int match
            if (!order.includes(s.id.toString()) && !order.includes(s.id)) {
                orderedServices.push(s);
            }
        });

        this.saveServices(orderedServices);
    }

    saveServices(services) {
        try {
            this.servicesCache = services;
            fs.writeFileSync(servicesConfigPath, JSON.stringify(services, null, 2), 'utf8');
        } catch (err) {
            console.error('Error saving services:', err);
        }
    }

    // Projects - Fetch from GitHub (Mocking for now as per "no tables" request, implies dynamic fetch)
    // The user said: "services and projects are fetchs from github directly without any additional tables"
    // So we should fetch from GitHub API.
    async getProjects() {
        // Simple caching to avoid rate limits
        const now = Date.now();
        if (this.projectsCache && (now - this.lastProjectFetch < 300000)) { // 5 min cache
            return this.projectsCache;
        }

        try {
            // Fetching public repos for user 'slogiker'
            // We need a user-agent for GitHub API
            const projects = await this.fetchGithubRepos('slogiker');
            this.projectsCache = projects;
            this.lastProjectFetch = now;
            return projects;
        } catch (err) {
            console.error('Error getting projects from GitHub:', err);
            return this.projectsCache || []; // Return stale cache if available
        }
    }

    // Helper to fetch from GitHub
    fetchGithubRepos(username) {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: 'api.github.com',
                path: `/users/${username}/repos?sort=updated&per_page=6`,
                method: 'GET',
                headers: {
                    'User-Agent': 'Node.js Dashboard'
                }
            };

            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    if (res.statusCode === 200) {
                        try {
                            const repos = JSON.parse(data);
                            // Map to our project format
                            const formatted = repos.map(repo => ({
                                id: repo.id,
                                name: repo.name,
                                description: repo.description,
                                url: repo.html_url,
                                language: repo.language,
                                stars: repo.stargazers_count,
                                homepage: repo.homepage || '',
                                clone_url: repo.clone_url || '',
                                ssh_url: repo.ssh_url || ''
                            }));
                            resolve(formatted);
                        } catch (e) {
                            reject(e);
                        }
                    } else {
                        reject(`GitHub API Error: ${res.statusCode}`);
                    }
                });
            });

            req.on('error', (e) => reject(e));
            req.end();
        });
    }

    // Status Checks (Online/Offline)
    async checkServiceStatus(url) {
        if (!url || url === '#' || !url.startsWith('http')) return 'unknown';

        return new Promise((resolve) => {
            const req = (url.startsWith('https') ? https : require('http')).get(url, (res) => {
                resolve(res.statusCode >= 200 && res.statusCode < 400 ? 'online' : 'error');
            });

            req.on('error', () => resolve('offline'));
            req.setTimeout(2000, () => {
                req.destroy();
                resolve('timeout');
            });
        });
    }

    async getServicesWithStatus() {
        const services = await this.getServices();
        // Check status for all services in parallel
        const servicesWithStatus = await Promise.all(services.map(async (s) => {
            const status = await this.checkServiceStatus(s.url);
            return { ...s, status };
        }));
        return servicesWithStatus;
    }
}

module.exports = new DataManager();

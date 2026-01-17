class User {
    static async login(username, password) {
        // Hardcoded for now as requested, but structured for easy DB swap
        // In a real app, use bcrypt and database lookup
        if (username === 'admin' && password === 'admin') {
            return {
                username: 'admin',
                role: 'admin',
                // Add permissions here if needed
                permissions: ['manage_services', 'view_hidden']
            };
        }
        return null;
    }
}

module.exports = User;

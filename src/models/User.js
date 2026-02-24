const bcrypt = require('bcrypt');

const db = require('../config/database');



class User {
    // Register a new user
    static async register(name, username, email, password) {
        try {
            // Check if user already exists
            const existingUser = await db.query(
                'SELECT * FROM users WHERE username = $1 OR email = $2',
                [username, email]
            );

            if (existingUser.rows.length > 0) {
                return { error: 'Username or email already exists' };
            }

            // Hash password with bcrypt
            const hashedPassword = await bcrypt.hash(password, 10);

            // Create user
            // Default role is 'user', handled by DB default
            const result = await db.query(
                'INSERT INTO users (ime, username, email, password_hash, role, created_at) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id, ime, username, email, role',
                [name, username, email, hashedPassword, 'user']
            );

            return {
                id: result.rows[0].id,
                name: result.rows[0].ime,
                username: result.rows[0].username,
                email: result.rows[0].email,
                role: result.rows[0].role,
                isAdmin: result.rows[0].role === 'admin' || result.rows[0].role === 'owner'
            };
        } catch (err) {
            console.error('Registration error:', err);
            return { error: 'Registration failed' };
        }
    }

    // Login user
    static async login(username, password) {
        try {
            const result = await db.query(
                'SELECT id, ime, username, email, role, password_hash FROM users WHERE username = $1',
                [username]
            );

            if (result.rows.length === 0) {
                return null;
            }

            const user = result.rows[0];
            const passwordMatch = await bcrypt.compare(password, user.password_hash);

            if (!passwordMatch) {
                return null;
            }

            return {
                id: user.id,
                name: user.ime,
                username: user.username,
                email: user.email,
                role: user.role,
                isAdmin: user.role === 'admin' || user.role === 'owner'
            };
        } catch (err) {
            console.error('Login error:', err);
            return null;
        }
    }

    // Get user by ID
    static async getById(id) {
        try {
            const result = await db.query(
                'SELECT id, ime, username, email, role FROM users WHERE id = $1',
                [id]
            );

            if (result.rows.length === 0) {
                return null;
            }

            const user = result.rows[0];
            return {
                id: user.id,
                name: user.ime,
                username: user.username,
                email: user.email,
                role: user.role,
                isAdmin: user.role === 'admin' || user.role === 'owner'
            };
        } catch (err) {
            console.error('Get user error:', err);
            return null;
        }
    }
}

module.exports = User;

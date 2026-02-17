<<<<<<< HEAD
const crypto = require('crypto');
const { Pool } = require('pg');
require('dotenv').config();

// Database connection pool
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

// Hash password using SHA256
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

class User {
    // Register a new user
    static async register(name, username, email, password) {
        try {
            // Check if user already exists
            const existingUser = await pool.query(
                'SELECT * FROM users WHERE username = $1 OR email = $2',
                [username, email]
            );

            if (existingUser.rows.length > 0) {
                return { error: 'Username or email already exists' };
            }

            // Hash password
            const hashedPassword = hashPassword(password);

            // Create user
            const result = await pool.query(
                'INSERT INTO users (name, username, email, password, role, created_at) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id, name, username, email, role',
                [name, username, email, hashedPassword, 'user']
            );

            return {
                id: result.rows[0].id,
                name: result.rows[0].name,
                username: result.rows[0].username,
                email: result.rows[0].email,
                role: result.rows[0].role,
                permissions: ['view_services']
            };
        } catch (err) {
            console.error('Registration error:', err);
            return { error: 'Registration failed' };
        }
    }

    // Login user
    static async login(username, password) {
        try {
            const hashedPassword = hashPassword(password);

            const result = await pool.query(
                'SELECT id, name, username, email, role FROM users WHERE username = $1 AND password = $2',
                [username, hashedPassword]
            );

            if (result.rows.length === 0) {
                return null;
            }

            const user = result.rows[0];
            return {
                id: user.id,
                name: user.name,
                username: user.username,
                email: user.email,
                role: user.role,
                permissions: user.role === 'admin' ? ['manage_services', 'view_hidden'] : ['view_services']
            };
        } catch (err) {
            console.error('Login error:', err);
            return null;
        }
    }

    // Get user by ID
    static async getById(id) {
        try {
            const result = await pool.query(
                'SELECT id, name, username, email, role, created_at FROM users WHERE id = $1',
                [id]
            );

            if (result.rows.length === 0) {
                return null;
            }

            const user = result.rows[0];
            return {
                id: user.id,
                name: user.name,
                username: user.username,
                email: user.email,
                role: user.role,
                created_at: user.created_at
            };
        } catch (err) {
            console.error('Get user error:', err);
            return null;
=======
const db = require('../config/db');
const bcrypt = require('bcryptjs');

class User {
    static async login(identifier, password) {
        // Identifier can be username or email
        const query = `
            SELECT * FROM users 
            WHERE username = $1 OR email = $1
        `;
        const result = await db.query(query, [identifier]);
        const user = result.rows[0];

        if (user) {
            const isValid = await bcrypt.compare(password, user.password);
            if (isValid) {
                return {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role
                };
            }
>>>>>>> 8258cb30f30f29f7ddb2ca83519dc37f46870751
        }
    }

    static async register(username, email, password) {
        // Check if username or email exists
        const checkQuery = `
            SELECT * FROM users 
            WHERE username = $1 OR email = $2
        `;
        const checkResult = await db.query(checkQuery, [username, email]);

        if (checkResult.rows.length > 0) {
            throw new Error('Username or Email already exists');
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const insertQuery = `
            INSERT INTO users (username, email, password, role)
            VALUES ($1, $2, $3, 'user')
            RETURNING id, username, email, role
        `;

        const result = await db.query(insertQuery, [username, email, hashedPassword]);
        return result.rows[0];
    }
}

module.exports = User;

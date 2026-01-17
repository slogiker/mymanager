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
        }
        return null;
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

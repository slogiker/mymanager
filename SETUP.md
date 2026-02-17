# Setup Instructions

## PostgreSQL Database Setup

### 1. Create the Database
```bash
psql -U postgres
```

In psql:
```sql
CREATE DATABASE mymanager_db;
\c mymanager_db
```

### 2. Initialize the Schema
Run the initialization script to create tables:
```bash
psql -U postgres -d mymanager_db -f database/init.sql
```

Or paste the contents of `database/init.sql` directly into psql.

### 3. Configure Environment Variables
Edit the `.env` file and update with your PostgreSQL credentials:
```
DB_USER=postgres
DB_HOST=localhost
DB_NAME=mymanager_db
DB_PASSWORD=your_password
DB_PORT=5432
SESSION_SECRET=your-secure-session-key
NODE_ENV=development
PORT=3000
```

### 4. Install Dependencies
```bash
npm install
```

This will install the required packages including:
- `pg` - PostgreSQL client
- `dotenv` - Environment variable management

### 5. Run the Server
```bash
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

## Features

### Authentication
- **Sign Up**: Create a new account with name, username, email, and password
- **Sign In**: Login with username and password
- **Password Encryption**: Passwords are encrypted using SHA256

### User Roles
- **Admin**: Can view all services and manage them
- **User**: Can view only public services

### Service Management
- Add new services with custom icons
- Mark services as private (admin only)
- Delete and edit services
- Drag and drop to reorder services

## API Endpoints

### Authentication Routes
- `GET /login` - Display login/signup page
- `POST /login` - Authenticate user
- `GET /signup` - Display signup form
- `POST /signup` - Create new account
- `GET /logout` - Logout user

### Dashboard Routes
- `GET /` - Dashboard home
- `GET /profile` - User profile (requires authentication)
- `POST /services/add` - Add new service

## Database Tables

### users table
- `id` - Serial primary key
- `name` - User full name
- `username` - Unique username
- `email` - Unique email address
- `password` - SHA256 hashed password
- `role` - 'admin' or 'user'
- `created_at` - Account creation timestamp
- `updated_at` - Last updated timestamp

### services table
- For future database integration of services
- Linked to users table via user_id

### projects table
- For future database integration of GitHub projects

## Notes
- The `.env` file is excluded from git for security
- Always use strong session secrets in production
- Consider using bcrypt instead of SHA256 for even better security in production
- Ensure PostgreSQL server is running before starting the application

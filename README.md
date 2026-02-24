# MyManager Dashboard

A comprehensive personal dashboard and portfolio manager built with Node.js, Express, Tailwind CSS, and PostgreSQL.

## Features

- **Global Liquid Glass Navbar**: A beautiful, translucent navigation bar across all views.
- **Portfilio Integration**: Dynamically pulls open-source projects directy from GitHub.
- **Service Dashboard**: Manage and organize personal web services and Docker containers.
- **System Monitoring**: Live Server Status statistics (CPU, RAM, Disk, Temperature) using `systeminformation`.
- **Integrated SSH Terminal**: A fully functional browser-based terminal to manage the host server securely.
- **Role-Based Authentication**: Secure login system with bcrypt hashing and session management, separating Owner and User views.

## Installation

This application is containerized using Docker.

1. Clone the repository.
2. Build and run the container:
   ```bash
   docker compose up -d --build
   ```
3. Configure your `.env` file with PostgreSQL credentials. (PostreSQL is run outside of the docker container)
4. Access the dashboard at `http://localhost:3005`.

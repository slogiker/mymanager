# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development — starts Express (nodemon) + Vite dev server concurrently
npm run dev

# Build client for production
npm run build          # runs: npm run build --workspace=client

# Production start
npm start              # runs: npm run start --workspace=server

# Docker (production, port 3005→3000)
docker compose up -d --build
```

No test suite or linter configured.

## Architecture

**MyManager** is a personal dashboard + portfolio — React SPA frontend + Express REST API backend, SQLite database, JWT httpOnly cookie auth.

### Monorepo structure

```
/
├── client/          Vite + React 18 + Tailwind CSS
│   ├── src/
│   │   ├── pages/       Portfolio, Login, ChangePassword, Dashboard, Admin, Clipboard, Files, NotFound
│   │   ├── components/  layout/ (Navbar, Footer), portfolio/ (Hero, ProjectsGrid, SkillsSection, ContactForm)
│   │   ├── hooks/       useAuth.jsx (AuthContext + Provider)
│   │   └── lib/         api.js (fetch wrapper with credentials)
│   ├── vite.config.js   proxies /api, /uploads, /socket.io → localhost:3000
│   └── index.html       has <!-- SEO_META_PLACEHOLDER --> for server-side meta injection
└── server/
    ├── src/
    │   ├── index.js         Express app + Socket.io SSH bridge
    │   ├── models/db.js     better-sqlite3, WAL mode, all table creation + seed
    │   ├── routes/          auth, profile, projects, skills, services, messages,
    │   │                    clipboard, files, users, analytics, system
    │   ├── middleware/       auth.js (verifyToken, optionalAuth), owner.js (requireOwner),
    │   │                    analytics.js (visitor tracking), rateLimit.js
    │   └── utils/           seoInjector.js
    └── data/mymanager.db    SQLite database (auto-created on first run)
```

### Request flow

```
Browser → Vite proxy → Express (/api/*)
                              ├─ routes/auth.js        login, logout, me, change-password
                              ├─ routes/profile.js     GET public, PUT owner, resume upload/download/delete
                              ├─ routes/projects.js    CRUD + seed-from-github
                              ├─ routes/skills.js      CRUD
                              ├─ routes/services.js    CRUD + reorder
                              ├─ routes/messages.js    POST public, GET/PATCH/DELETE owner
                              ├─ routes/clipboard.js   CRUD + pin toggle, guest via clip_session cookie
                              ├─ routes/files.js       upload/delete, owner unlimited/users 100MB+1GB
                              ├─ routes/users.js       owner CRUD, one-time passwords
                              ├─ routes/analytics.js   summary + recent (owner)
                              └─ routes/system.js      CPU/RAM/disk/temp stats

Browser ←→ Socket.io ←→ SSH server (ssh.slogiker.si:2222) — owner only, JWT verified
```

### Data storage
- **All data**: SQLite at `server/data/mymanager.db` (better-sqlite3, synchronous)
- **Uploads**: `server/uploads/` — resume (PDF), clipboard files, user files
- On first run: owner `slogiker` seeded with a one-time password printed to console

### Auth & roles
Two roles: `owner` and `user`. JWT stored in httpOnly SameSite=Lax cookie `token`. `must_change_password` flag forces redirect to `/change-password` after first login. Owner created automatically on DB seed.

### SEO
Production: Express reads `client/dist/index.html` into memory, replaces `<!-- SEO_META_PLACEHOLDER -->` with og: / twitter: meta tags from DB before serving. Crawlers get pre-injected HTML; React hydrates after.

### CSS
Tailwind in `client/src/index.css`. Custom utility classes: `.card`, `.btn`, `.btn-primary`, `.btn-outline`, `.btn-danger`, `.input-field`, `.badge`, `.gradient-text`. Dark bg `#020617`, accent gradient cyan→purple.

## Environment variables

`server/.env` (not committed):

```env
PORT=3000
NODE_ENV=development
JWT_SECRET=change-this-in-production
DB_PATH=./data/mymanager.db
SSH_HOST=ssh.slogiker.si
SSH_PORT=2222
SSH_USERNAME=slogiker
OWNER_PASSWORD=          # SSH fallback password
```

## Key notes
- SQLite operations are synchronous (better-sqlite3) — no async/await needed in routes
- In production `IS_PROD=true`, Express serves the built React SPA from `client/dist/`
- Vite dev proxy handles CORS in development — no cross-origin issues
- Socket.io SSH bridge requires `owner` role JWT in `socket.handshake.auth.token`

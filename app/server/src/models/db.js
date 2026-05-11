const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcrypt');
const { randomBytes } = require('crypto');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/mymanager.db');

const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    must_change_password INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS profile (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT DEFAULT 'Daniel',
    title TEXT DEFAULT 'Full Stack Developer',
    bio TEXT DEFAULT 'I build useful things for fun',
    avatar_url TEXT,
    github_url TEXT DEFAULT 'https://github.com/slogiker',
    linkedin_url TEXT,
    email TEXT,
    location TEXT,
    resume_path TEXT,
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    github_url TEXT,
    live_url TEXT,
    image_url TEXT,
    tech_stack TEXT DEFAULT '[]',
    tags TEXT DEFAULT '[]',
    featured INTEGER DEFAULT 0,
    seo_description TEXT,
    og_image TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS skills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT DEFAULT 'Other',
    icon_name TEXT,
    proficiency INTEGER DEFAULT 3,
    color TEXT DEFAULT '#64748b',
    display_order INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    url TEXT,
    description TEXT,
    icon TEXT DEFAULT 'fa-link',
    category TEXT,
    is_private INTEGER DEFAULT 0,
    requires_vpn INTEGER DEFAULT 0,
    display_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT,
    content TEXT NOT NULL,
    ip_address TEXT,
    read_at TEXT,
    archived INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS clipboard_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    session_id TEXT,
    type TEXT NOT NULL DEFAULT 'text',
    content TEXT,
    language TEXT,
    title TEXT,
    filename TEXT,
    file_path TEXT,
    mime_type TEXT,
    pinned INTEGER DEFAULT 0,
    expires_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS folders (
    id TEXT PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    session_id TEXT,
    folder_id TEXT REFERENCES folders(id) ON DELETE SET NULL,
    original_name TEXT NOT NULL,
    stored_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    mime_type TEXT,
    size INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT,
    ip_address TEXT,
    country TEXT,
    country_code TEXT,
    city TEXT,
    region TEXT,
    timezone TEXT,
    isp TEXT,
    path TEXT NOT NULL,
    method TEXT DEFAULT 'GET',
    referrer TEXT,
    user_agent TEXT,
    browser TEXT,
    browser_version TEXT,
    os TEXT,
    os_version TEXT,
    device_type TEXT,
    language TEXT,
    is_bot INTEGER DEFAULT 0,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  CREATE INDEX IF NOT EXISTS idx_analytics_path ON analytics(path);
  CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics(created_at);
  CREATE INDEX IF NOT EXISTS idx_clipboard_user ON clipboard_items(user_id);
  CREATE INDEX IF NOT EXISTS idx_clipboard_session ON clipboard_items(session_id);
  CREATE INDEX IF NOT EXISTS idx_files_user ON files(user_id);
  CREATE INDEX IF NOT EXISTS idx_files_session ON files(session_id);
  CREATE INDEX IF NOT EXISTS idx_folders_user ON folders(user_id);
`);

// Migrate existing installs: add folder_id to files if missing
const filesCols = db.prepare("PRAGMA table_info(files)").all().map(c => c.name);
if (!filesCols.includes('folder_id')) {
  db.exec("ALTER TABLE files ADD COLUMN folder_id TEXT REFERENCES folders(id) ON DELETE SET NULL");
}

db.exec("CREATE INDEX IF NOT EXISTS idx_files_folder ON files(folder_id)");

function seed() {
  const profileCount = db.prepare('SELECT COUNT(*) as c FROM profile').get();
  if (profileCount.c === 0) {
    db.prepare(`
      INSERT INTO profile (name, title, bio, github_url, email)
      VALUES (?, ?, ?, ?, ?)
    `).run('Daniel', 'Full Stack Developer', 'I build useful things for fun', 'https://github.com/slogiker', 'plibersek.daniel@gmail.com');
  }

  const ownerExists = db.prepare("SELECT id FROM users WHERE role = 'owner'").get();
  if (!ownerExists) {
    const otp = randomBytes(8).toString('hex');
    const hash = bcrypt.hashSync(otp, 10);
    db.prepare(`
      INSERT INTO users (name, username, email, password_hash, role, must_change_password)
      VALUES (?, ?, ?, ?, 'owner', 1)
    `).run('Daniel', 'slogiker', 'plibersek.daniel@gmail.com', hash);

    console.log('\n╔══════════════════════════════════════╗');
    console.log('║         OWNER ACCOUNT CREATED        ║');
    console.log('╠══════════════════════════════════════╣');
    console.log(`║  Username : slogiker                 ║`);
    console.log(`║  Password : ${otp}  ║`);
    console.log('║  (Change password on first login)    ║');
    console.log('╚══════════════════════════════════════╝\n');
  }

  const servicesCount = db.prepare('SELECT COUNT(*) as c FROM services').get();
  if (servicesCount.c === 0) {
    const insert = db.prepare(`
      INSERT INTO services (title, url, description, icon, category, is_private, requires_vpn, display_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    [
      ['Router', 'http://router.home.arpa', 'Network Router', 'fa-network-wired', 'Network', 1, 1, 1],
      ['Minecraft Dashboard', '#', 'MC Server Management', 'fa-cube', 'Gaming', 0, 1, 2],
      ['Folders', '#', 'File Browser', 'fa-folder-open', 'System', 0, 0, 3],
      ['Pi-hole', 'http://pihole.home.arpa', 'Network-wide Ad Blocking', 'fa-shield-halved', 'Network', 1, 1, 4],
      ['pgAdmin', '#', 'PostgreSQL Management', 'fa-database', 'Dev', 1, 0, 5],
      ['NAS', '#', 'Network Attached Storage', 'fa-server', 'System', 0, 0, 6],
      ['LED Controller', '#', 'Custom LED Control', 'fa-lightbulb', 'IOT', 0, 0, 7],
      ['NGINX Proxy Manager', 'http://nginx.home.arpa', 'Reverse Proxy Manager', 'fa-shield-halved', 'Network', 1, 1, 8],
      ['Portainer', '#', 'Docker Management', 'fa-brands fa-docker', 'Dev', 1, 1, 9],
    ].forEach(s => insert.run(...s));
  }

  const skillsCount = db.prepare('SELECT COUNT(*) as c FROM skills').get();
  if (skillsCount.c === 0) {
    const insert = db.prepare(`
      INSERT INTO skills (name, category, color, proficiency, display_order)
      VALUES (?, ?, ?, ?, ?)
    `);
    [
      ['JavaScript', 'Frontend', '#f7df1e', 5, 1],
      ['TypeScript', 'Frontend', '#3178c6', 4, 2],
      ['React', 'Frontend', '#61dafb', 4, 3],
      ['Tailwind CSS', 'Frontend', '#06b6d4', 5, 4],
      ['Node.js', 'Backend', '#339933', 5, 5],
      ['Express', 'Backend', '#888888', 5, 6],
      ['PostgreSQL', 'Database', '#336791', 4, 7],
      ['SQLite', 'Database', '#044a64', 4, 8],
      ['Docker', 'DevOps', '#2496ed', 3, 9],
      ['NGINX', 'DevOps', '#009639', 3, 10],
      ['Git', 'Tools', '#f05032', 4, 11],
      ['Linux', 'DevOps', '#fcc624', 4, 12],
    ].forEach(s => insert.run(...s));
  }
}

seed();

// Clean up expired clipboard items on startup
db.prepare("DELETE FROM clipboard_items WHERE expires_at IS NOT NULL AND expires_at < datetime('now')").run();

// Run cleanup every hour
setInterval(() => {
  db.prepare("DELETE FROM clipboard_items WHERE expires_at IS NOT NULL AND expires_at < datetime('now')").run();
}, 3600000);

module.exports = db;

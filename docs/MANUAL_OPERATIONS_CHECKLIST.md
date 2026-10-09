# Manual Operations & Post-Audit Checklist

> **IMPORTANT**: This is a reference checklist for manual operator execution.
> **DO NOT RUN AUTOMATICALLY DURING AUDIT.** Follow these steps after completing deployment.

---

## 1. Secrets History & Rotation Checklist

The following sensitive files or fallback secret strings appeared in git history prior to the audit:

| Secret Type / Artifact | Location in History | First Introduced Commit | Recommended Action |
| :--- | :--- | :--- | :--- |
| Authentication Cookies (`cookies.txt`) | Root (`cookies.txt`) | `d9c3634` | Purge from git history with `git-filter-repo`; revoke any active web sessions associated with those cookies. |
| Insecure JWT Secret Fallback | `app/server/src/index.js`, `auth.js`, `analytics.js` (`REMOVED`) | `d9c3634` | Generated secrets are now strictly enforced via Zod (>= 32 chars). Rotate `JWT_SECRET` in `.env`. |
| Service Integration Placeholders | `app/server/.env.example` / legacy commits | `d9c3634` | Optional integration keys must only be populated in production `.env` (never committed). |

---

## 2. JWT Secret Rotation Procedure

Run this command on your secure terminal to generate a cryptographically strong 256-bit secret:

```bash
openssl rand -hex 32
```

Copy the generated 64-character hexadecimal output and set it in `app/server/.env`:

```env
JWT_SECRET=paste_generated_64_hex_string_here
```

Restart the dashboard container to apply:
```bash
docker compose up -d --force-recreate dashboard
```

---

## 3. Owner Password Change Procedure

### Option A: Via Web UI
1. Sign in to the portal as the owner.
2. Go to `/dashboard` -> Profile -> Security & Password.
3. Provide your current password and your new strong password.
4. Save changes. The system automatically re-hashes using `bcrypt` (work factor 12).

### Option B: Direct Database Reset (Emergency CLI)
If locked out, run this command from the project root:

```bash
node -e '
const bcrypt = require("bcrypt");
const readline = require("readline").createInterface({ input: process.stdin, output: process.stdout });
readline.question("Enter new owner password: ", async (pw) => {
  const hash = await bcrypt.hash(pw, 12);
  console.log("\nExecute the following SQLite update:");
  console.log(`sqlite3 app/server/data/mymanager.db "UPDATE users SET password_hash = '\''${hash}'\'' WHERE is_owner = 1;"`);
  readline.close();
});
'
```

---

## 4. Nginx Proxy Manager (NPM) Configuration & Real-IP Headers

### Proxy Host Setup:
- **Domain Names**: `manager.yourdomain.com`
- **Scheme**: `http`
- **Forward Hostname / IP**: `172.18.0.2` (or Docker bridge gateway `172.18.0.1`)
- **Forward Port**: `7293` (or `31847`)
- **Block Common Exploits**: `ON`
- **Websockets Support**: `ON`

### Custom Nginx Configuration (Advanced Tab):
Add the following directives to restore visitor client IPs through Cloudflare:

```nginx
# Forward standard proxy headers
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header CF-Connecting-IP $http_cf_connecting_ip;

# Cloudflare IP Ranges for Real-IP Restoration
set_real_ip_from 173.245.48.0/20;
set_real_ip_from 103.21.244.0/22;
set_real_ip_from 103.22.200.0/22;
set_real_ip_from 103.31.4.0/22;
set_real_ip_from 141.101.64.0/18;
set_real_ip_from 108.162.192.0/18;
set_real_ip_from 190.93.240.0/20;
set_real_ip_from 188.114.96.0/20;
set_real_ip_from 197.234.240.0/22;
set_real_ip_from 198.41.128.0/17;
set_real_ip_from 162.158.0.0/15;
set_real_ip_from 104.16.0.0/13;
set_real_ip_from 104.24.0.0/14;
set_real_ip_from 172.64.0.0/13;
set_real_ip_from 131.0.72.0/22;
set_real_ip_from 2400:cb00::/32;
set_real_ip_from 2606:4700::/32;
set_real_ip_from 2803:f800::/32;
set_real_ip_from 2405:b500::/32;
set_real_ip_from 2405:8100::/32;
set_real_ip_from 2a06:98c0::/29;
set_real_ip_from 2c0f:f248::/32;

real_ip_header CF-Connecting-IP;
```

---

## 5. Cloudflare Configuration (SSL & Caching Rules)

1. **SSL/TLS Mode**:
   - Set to **Full (strict)** under SSL/TLS settings in the Cloudflare dashboard.
   - Install a valid Origin CA certificate or Let's Encrypt certificate on NPM.

2. **Cache Rules (Bypass)**:
   - Create a Cache Rule matching URI path prefix `/files*` or `/api/*`:
     - **Action**: Bypass cache
   - Ensure WebSocket connections are allowed for `/socket.io/*`.

3. **Security**:
   - Enable **Browser Integrity Check**
   - Minimum TLS Version: **TLS 1.2** or **TLS 1.3**

---

## 6. Git History Purge with git-filter-repo

To permanently scrub `cookies.txt` and old environment files from the repository history before making it public or pushing upstream:

```bash
# 1. Install tool
pip install git-filter-repo

# 2. Ensure repository is backed up
cp -r /home/slogiker/Projects/mymanager /home/slogiker/Projects/mymanager.backup

# 3. Purge cookies.txt and .env from all historical commits
git filter-repo --invert-paths --path cookies.txt --path .env --path app/server/.env --force

# 4. Clean out all cached reflogs and objects
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

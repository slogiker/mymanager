# MyManager — Full Project & Architecture Handover

> **Document Purpose**: This file serves as a comprehensive handover briefing for **Claude** (and Daniel / slogiker) to scan in the morning. It details everything built, all files renewed or modified, architectural decisions, API routes, data structures, and the current state of the repository.

---

## 1. Project Overview & Environment

- **Repository**: `mymanager` (Personal Homelab Management Hub & Portfolio)
- **Author/Owner**: Daniel (`slogiker`)
- **Architecture**: Monorepo with npm workspaces:
  - `app/client`: React 18, TypeScript, Vite, Tailwind CSS, `@dnd-kit` (drag & drop), Lucide icons, Three.js (3D viewer), Radix UI primitives.
  - `app/server`: Node.js, Express, `better-sqlite3`, multer, socket.io, node-pty (SSH web terminal).
- **Deployment**: Docker container (`mymanager-dashboard-1`) exposing port `31847` (mapped internally to Express on `7293`).
- **Design System**: Dark `#111216` / `#16181f` glassmorphism with red-500 glowing accents (`#ef4444`).

---

## 2. Recent Major Additions & Changes

### A. Homepage.dev-Style Free-Play Grid & Elimination of Rigid Tabs
- **Eliminated Rigid Tab Row**: The top horizontal tab bar (`[Services] [Analytics] [Messages] [Projects] [Skills] [Users]`) has been removed from the main view.
- **Unified Homelab Board**: The dashboard defaults directly to the **Homelab Board**. Administrative views (`Analytics`, `Messages` with live unread badge, `Projects`, `Skills`, `Users`) are cleanly accessible via a compact **Management Hub** dropdown for the owner.
- **Invisible/Borderless Category Columns**: Category boxes no longer have solid background containers or rigid borders. They are open, borderless columns where service cards are neatly stacked vertically.
- **Interactive Border Hover Resizing**:
  - Hovering near the right edge/border of any category column highlights a vertical red glowing indicator.
  - A floating size popup selector (`[1x Normal]` / `[2x Wide]`) appears directly under the cursor, allowing the user to dynamically resize the column width (`col-span-1` vs `col-span-2`).
- **Open, Legible Cards (No Truncation / No Description)**:
  - Card titles and URLs are prominently displayed.
  - The card description has been removed for a clean, streamlined look.
  - Clicking **anywhere** on the card opens the service link in a new browser tab (`window.open(s.url, '_blank')`).
  - Sub-actions (Copy URL, Edit, Delete) utilize `stopPropagation()` to prevent unwanted navigation.
- **Badges & Indicators**:
  - Removed the `Priv` badge per user request.
  - Preserved the `VPN` badge for services requiring WireGuard/tunnel access.
  - Real-time online/offline status dot with ping.
- **Drag & Drop Layout**:
  - Powered by `@dnd-kit/core` and `@dnd-kit/sortable` with a dedicated drag handle (`GripVertical`).
  - Layout reordering and column widths are saved automatically to the user's preferences in `localStorage`.
- **Custom Categories**:
  - Added **"Add Category"** modal allowing the user to create new custom-named category boxes.
  - Inline category renaming with instant database synchronization for all child services.

### B. Service Test Connection & SSL Switch
- **Live Connection Testing**:
  - Added `POST /api/services/test` on the backend. It executes an HTTP/HTTPS probe with `rejectUnauthorized: false` (to support homelab self-signed certificates) and returns `{ status, statusCode, statusText, latency }`.
  - Added a **"Test"** button inside the Add/Edit Service modal. Clicking it tests the URL and displays an instant status pill (e.g. `Online · HTTP 200 OK (13ms)` or `Offline · Unreachable`).
- **Use SSL Switch**:
  - Added a toggle switch in the Add/Edit Service modal that dynamically switches the URL protocol between `http://` and `https://` on the fly.

### C. Multi-Server Monitoring Cluster (4 Target Nodes)
Integrated multi-node telemetry in [`SystemMonitor.js`](file:///home/slogiker/Projects/mymanager/app/server/src/models/SystemMonitor.js) and exposed via `GET /api/system/nodes`:
1. **Host System** (`localhost`): Primary node OS metrics (CPU load, cores, RAM %, NVMe disk %, temperature, uptime).
2. **Raspberry Pi 5** (`192.168.1.136`): Compute node with Pironman 5 case. Queried directly via Pironman API on port `34001` (`/api/v1.0/get-data`). Returns CPU load %, 4 cores, RAM %, NVMe %, CPU temp (~49.6°C), and PWM cooling fan speed (**1088 RPM**).
3. **Debian Web Node** (`192.168.1.112`): Web server node. Probed via TCP on port 80 (HTTP) and port 22 (SSH). Shows online status and 1ms latency.
4. **Nextcloud Storage** (`192.168.1.41`): Cloud storage node. Probed via TCP on port 8080 (Nextcloud) and port 22 (SSH). Shows online status and 1ms latency.
- Telemetry widget auto-polls every 10 seconds on the client.

### D. Modular Dashboard Widgets
- **Time Widget**: Live digital clock (HH:MM:SS), formatted localized date, homelab cluster uptime, and timezone.
- **Quick Notes Widget**: Direct scratchpad hooked to `/api/clipboard` for quick note capture, one-click copy, and deletion.
- **Customize Grid Modal**: Allows toggling visibility of the Time Widget, Notes Widget, Cluster Telemetry, and hiding/showing individual categories.

### E. User Profile & Account Settings (`/profile`)
- Dedicated user profile and settings page:
  - Display user info, roles, and creation date.
  - Change password with strength validation.
  - Toggle dashboard card visibility and system gauges (CPU, RAM, Disk, Temp).
  - Delete own account (with confirmation modal).

### F. User Management & First-Time Login
- **Forced Password Change**: Users with `must_change_password = 1` are prompted to set a new password on login before accessing the dashboard.
- **Create User Modal**:
  - Clear indication that only **Username** is mandatory.
  - Option to auto-generate a 12-character secure OTP or set a custom password.
  - Copy credentials button that formats username, password, and the direct site login link.
  - Errors display directly inside the modal (no background toasts).

### G. Advanced File Manager (`/files`)
- Tree folder navigation sidebar with recursive children counting.
- 3D Model Viewer (`ThreeViewer.tsx`) supporting `.stl`, `.obj`, and `.gltf`/`.glb` files.
- Fullscreen preview panel for images, code, markdown, audio, and video.
- Archive actions: zip/tar creation and in-place zip extraction.
- Public sharing links (`/share/:token`) with password protection and expiration timers.
- Upload drawer with drag & drop file uploads.

---

## 3. Inventory of Renewed & Modified Files

### Client (`app/client/`)
- [`app/client/src/pages/Dashboard.tsx`](file:///home/slogiker/Projects/mymanager/app/client/src/pages/Dashboard.tsx):
  - Completely rewritten to support the homepage.dev-style free-play board.
  - Contains `HomelabBoard`, `SortableCategoryColumn`, `TimeWidget`, `NotesWidget`, `MultiServerNodesWidget`, and `ServiceIcon`.
  - Added "Test" connection button and "Use SSL" toggle in the Service modal.
- [`app/client/src/types.ts`](file:///home/slogiker/Projects/mymanager/app/client/src/types.ts):
  - Added `ServerNode` interface for multi-node telemetry.
- [`app/client/src/lib/userPreferences.ts`](file:///home/slogiker/Projects/mymanager/app/client/src/lib/userPreferences.ts):
  - Expanded `UserPreferences` interface with `categoryOrder`, `categoryWidths`, `customCategories`, and `widgetVisible`.
- [`app/client/src/components/layout/Navbar.tsx`](file:///home/slogiker/Projects/mymanager/app/client/src/components/layout/Navbar.tsx):
  - Cleaned navigation links; removed Files button from user navbar.
- [`app/client/src/pages/Profile.tsx`](file:///home/slogiker/Projects/mymanager/app/client/src/pages/Profile.tsx):
  - Account profile, password change, card visibility preferences, and account deletion.
- [`app/client/src/components/files/ThreeViewer.tsx`](file:///home/slogiker/Projects/mymanager/app/client/src/components/files/ThreeViewer.tsx):
  - Three.js interactive 3D model viewport for homelab 3D print and CAD files.

### Server (`app/server/`)
- [`app/server/src/models/SystemMonitor.js`](file:///home/slogiker/Projects/mymanager/app/server/src/models/SystemMonitor.js):
  - Added `probeTcp(host, port, timeout)` for remote server health probing.
  - Added `getNodes()` querying Host, RPi 5 Pironman API (`192.168.1.136:34001`), Debian (`192.168.1.112:80/22`), and Nextcloud (`192.168.1.41:8080/22`).
- [`app/server/src/routes/system.js`](file:///home/slogiker/Projects/mymanager/app/server/src/routes/system.js):
  - Added `GET /api/system/nodes` endpoint.
- [`app/server/src/routes/services.js`](file:///home/slogiker/Projects/mymanager/app/server/src/routes/services.js):
  - Added `POST /api/services/test` for probing service URLs.
- [`app/server/src/routes/clipboard.js`](file:///home/slogiker/Projects/mymanager/app/server/src/routes/clipboard.js):
  - Provides backend persistence for dashboard quick notes.
- [`.gitignore`](file:///home/slogiker/Projects/mymanager/.gitignore):
  - Updated to properly ignore `dist/`, `app/client/dist/`, `uploads/`, `data/`, and database binaries.

---

## 4. API Endpoints Reference

| Method | Endpoint | Auth | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/services` | Token | List all services with status checks |
| `POST` | `/api/services` | Owner | Create service |
| `PUT` | `/api/services/:id` | Owner | Update service |
| `DELETE` | `/api/services/:id` | Owner | Delete service |
| `POST` | `/api/services/test` | Token | Probe URL connectivity (status & latency) |
| `GET` | `/api/system/nodes` | Token | Telemetry for all 4 servers (Host, .136, .112, .41) |
| `GET` | `/api/system/stats` | Owner | Host hardware statistics |
| `GET` | `/api/clipboard` | Optional | Retrieve quick notes / clipboard entries |
| `POST` | `/api/clipboard` | Optional | Create quick note / clipboard entry |
| `DELETE`| `/api/clipboard/:id` | Optional | Delete note |

---

## 5. Notes & Guidance for Claude

1. **Category Borders**: Ensure categories maintain their open/borderless layout. Do not wrap category columns in rigid card containers.
2. **Column Resizing**: Resizing is triggered by hovering near the right edge of a category column, exposing a 1x/2x size selector.
3. **Card Links**: Keep cards fully clickable (`window.open(s.url, '_blank')`) with inner action buttons using `e.stopPropagation()`.
4. **SSL Toggle**: The "Use SSL" switch directly updates the URL prefix between `http://` and `https://`.
5. **Multi-Node Cluster**: Node telemetry covers:
   - `host`
   - `192.168.1.136` (Pironman 5 RPi5 on port 34001)
   - `192.168.1.112` (Debian on ports 80/22)
   - `192.168.1.41` (Nextcloud on ports 8080/22)
6. **Code Style**: Maintain TypeScript strictness in `app/client` and clean modular CommonJS in `app/server`.

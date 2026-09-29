# MyManager - Development Roadmap & TODO

## Active Tasks & Recent Implementations

### Dashboard Customization & Color Themes
- [x] Multi-color palette support with random/basic colors:
  - Red (Crimson)
  - Green (Emerald)
  - Yellow (Amber)
  - Blue (Sky/Ocean)
  - Pink (Fuchsia/Rose)
  - Purple (Violet)
  - Orange (Tangerine)
  - Cyan (Teal)
- [x] Color prefixes for category and service names:
  - Syntax support: `[green]`, `[yellow]`, `[blue]`, `[pink]`, `[red]`, `[purple]`, `[orange]`, `[cyan]` or `green:`, `blue:`, etc.
  - Automatically parses prefix, strips prefix tag for display, and applies matching accent color to the category column, cards, borders, badges, and hover states.
- [x] Category-level color picker in Customize Grid modal:
  - Users can assign specific colors per category without manually typing prefixes.
- [x] Dashboard-wide primary accent theme:
  - Selectable in Customize Dashboard modal and profile settings.
  - Dynamically updates primary buttons, indicators, and highlights.
- [x] Freeform 2x1 grid card engine with drag-and-drop and resize handles:
  - Support 1x1 compact cards, 2x1 wide cards, and 2x2 expanded rich cards.
  - Card movement across categories.
  - Outline slots visible during dragging and resizing.

---

## Infrastructure & Cluster Monitoring

### Telemetry & Nodes
- [x] Multi-server cluster monitoring widget:
  - Primary host (`localhost`)
  - Raspberry Pi 5 / Pironman 5 (`192.168.1.136`)
  - Compute Module 5 (`192.168.1.112`)
  - Storage / Nextcloud node (`192.168.1.41`)
- [x] Live client-to-server latency / ping measurement (~10s poll to `/api/ping`).
- [x] Text summary view vs full cards view toggle for cluster telemetry.
- [x] Restrict cluster nodes widget to owner role (`slogiker`), keeping non-owner accounts focused on their accessible services.
- [x] Removed artificial 8TB fallback storage numbers for `.41` node.
- [ ] Implement lightweight Nextcloud API or agent probe on `.41` to query actual storage pool usage dynamically without SSH credentials.
- [ ] Add Docker container health status cards to inspector modals.

---

## Security & Access Control
- [x] Role-based access control (RBAC):
  - Owner role with full administrative privileges, layout editing, and server metrics.
  - User role (`gasper`, etc.) with customized visible service cards and personal preferences.
- [x] Content-Security-Policy (CSP) hardening with SHA256 hashes for inline Cloudflare scripts.
- [x] Password rotation and synchronization with Docker environment.
- [x] Default-deny route guards for unauthorized endpoints.
- [ ] Session revocation panel in Profile -> Security.
- [ ] Two-Factor Authentication (TOTP 2FA) support.

---

## Service Integrations & Telemetry Modals
- [x] Jellyfin inspector modal (active streams, playback position, transcoding stats).
- [x] Jellyseerr inspector modal (pending media requests, fulfilled stats).
- [x] qBittorrent inspector modal (active download/upload speeds, torrent list).
- [x] WireGuard VPN status inspector (peer handshakes, data transfer).
- [x] Pi-hole DNS inspector (queries blocked, percentage, domains on blocklist).
- [ ] Real-time WebSocket event streaming for instant playback and download updates.
- [ ] Notification webhook integrations (Discord / Telegram alerts on server down).

---

## UI/UX & Polish
- [x] Fast category renaming modal with auto-focus.
- [x] VPN-locked badge with interactive WireGuard guidance toast.
- [x] Quick action buttons on card hover (Copy URL, Edit, Delete).
- [ ] Import and Export dashboard layout JSON configurations.
- [ ] Custom background image / wallpaper selector for dashboard.
- [ ] Mobile navigation drawer improvements for smaller screens.

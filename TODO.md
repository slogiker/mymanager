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

## UI/UX, Self-Healing & Mobile Responsiveness
- [x] Fast category renaming modal with auto-focus.
- [x] VPN-locked badge with interactive WireGuard guidance toast.
- [x] Quick action buttons on card hover (Copy URL, Edit, Delete).
- [x] Mobile drawer direction alignment: drawer now opens from the right matching button location.
- [x] Landscape hero padding: prevents navigation bar from overlapping hero title on landscape viewports.
- [x] Autonomous Error Analysis & Self-Healing Engine:
  - Error diagnostic analyzer (`selfHealer.ts`) identifying null variables, stale chunks, and network faults.
  - Automated part quarantine: isolates and disables failing widgets/cards in user preferences to prevent crash loops.
  - Missing asset auto-recovery: purges CacheStorage, unregisters stale service workers, and forces fresh bundle reload.
  - Server-side client build & Docker container rebuild trigger (`POST /api/admin/system/rebuild`).
- [x] Multi-device responsive design across all screen sizes:
  - Mobile phones (320px - 480px): single-column touch flow, compact VPN badge, responsive toolbars.
  - Tablets (640px - 1023px): 2-column flow with drag reordering via `@dnd-kit`.
  - Desktop & Wide displays: full 6-8 column freeform grid with drag-and-drop and resize handles.
- [ ] Import and Export dashboard layout JSON configurations.
- [ ] Custom background image / wallpaper selector for dashboard.
- [ ] Mobile View Categories: Categories are missing in mobile view while desktop/PC view still has them.
- [ ] Service Cards Height & Text Visibility: Make service cards taller or adjust sizing so all text is visible without truncation.

---

## Inbox & Communications
- [x] Stop automated notification spam from clipboard shares into messages table.
- [x] Multi-select checkboxes on each message item.
- [x] Batch action operations (Batch Archive and Batch Delete) on server and client.
- [x] Redesigned inbox cards with clean badges, timestamps, and quick action buttons.

---

## Housekeeping & Repository Structure
- [x] Clean up root directory:
  - Moved legacy documentation and handover specs to `docs/archive/`.
  - Moved verification and test scripts to `scripts/verification/`.
  - Moved obsolete root prototypes to `docs/archive/legacy/`.
  - Removed obsolete temporary files (`cookies.txt`).
  - Created standardized `scripts/deploy.sh` script for pulling changes and restarting Docker stack.

---

- [ ] **Cloudflare DDNS & Cert Status Dashboard Integration (Phase 2) (*)**:
  - Locate myManager deployment on rpi5 (Docker container behind NPM, bridge IP 172.18.0.2:3000, host port 3005) and compose file; inspect user and mount paths before changing.
  - Mount `~/server/apps/cf-ddns/status.json` as read-only bind mount into the myManager container.
  - Create Express endpoint `GET /api/admin/ddns-status` protected behind existing admin-only auth middleware (never public), handling missing/unparsable status file with clean JSON errors.
  - Add admin dashboard telemetry panel: current IP, last success age, per-host OK/FAIL list, and SSL cert days left, with alert styling if an ALERT condition holds.
  - Never commit `status.json` or secrets; do not touch `/files` or Terminal page.
  - Provide RAW git diff --stat, docker-compose diff, and `curl -i` testing unauthenticated (401/403) vs authenticated admin session.
- [ ] **Mobile View Categories Missing (*)**:
  - Bring categories to mobile view (currently missing in mobile view while PC view still has them).
- [ ] **Service Cards Height & Text Visibility (*)**:
  - Make service cards taller or adjust spacing/sizing so that all text can be fully seen.
- [ ] **Widget Re-sorting & Landscape Layout Optimization (*)**:
  - Rearrange and sort widgets differently for mobile landscape and constrained viewport layouts while keeping existing widgets intact.
- [ ] **Analytics Page Redesign (*)**:
  - Overhaul the analytics tab and visitor telemetry visualizations.
- [ ] **Email Service / Cloudflare Worker Integration for Inbox (*)**:
  - Link contact form and messages to a real email delivery service (SMTP, Resend, or SendGrid) or Cloudflare Worker / webhook instead of relying purely on local SQLite storage.
- [ ] **Inbox Messages UI/UX Fine-Tuning (*)**:
  - Continue refining messages inbox visual design and thread inspection workflows.
- [ ] **Selected Project Deep Linking & Sync (*)**:
  - Further expand bi-directional linking and synchronization between front-end project cards and the dashboard Projects tab.

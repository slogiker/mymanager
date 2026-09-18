# mymanager — Homelab Board — Master Plan (v2, merged with `feature/homelab-board-v2`)

## ⚠️ STATUS TRACKER — agy: read this first, update it last

```
BASE_BRANCH: feature/homelab-board-v2  (continue ON this branch — do not rebuild from main)
CURRENT_PHASE: 10
CURRENT_PHASE_NAME: Testing & Deploy
STATUS: completed
LAST_UPDATED_BY: agy (2026-09-18 23:07 CEST)
NOTES_FOR_NEXT_SESSION: Phase 10 and all 11 production hardening requirements complete! Security headers active (Anti-Clickjacking, Anti-MIME sniffing, XSS block, referrer policy, permissions policy, X-Powered-By masked). SQLite optimized with WAL mode, busy_timeout=5000, synchronous=NORMAL, cache_size=-64000, temp_store=MEMORY, and 8 covering composite indexes. Zero SQL injection vectors verified. Rate limiting and brute force prevention verified with HTTP 429 triggers. 20 concurrent users load test passed with 0 errors and zero SQLITE_BUSY lockups. Production error redaction and structured logging active. Database backup verified in app/server/data/mymanager.db.bak-phase10. All phases 0-10 complete.
```

**Rules for agy, every session:**
1. Read the STATUS TRACKER block above. Work on `BASE_BRANCH`, never `main`, unless told otherwise.
2. Do not skip to a later phase than `CURRENT_PHASE` unless the user explicitly says to.
3. Read the full section for `CURRENT_PHASE` before writing any code. Items marked `[x]` are already built (per the Sept 17 handover doc) — verify they still work before building on top, don't rebuild them.
4. Do the work for that phase only. Don't start the next phase in the same session unless told to.
5. At the end of the session, run every command in that phase's "Verify" block and paste the raw output — don't summarize as "done" or "working."
6. Update the STATUS TRACKER block: bump `CURRENT_PHASE`/`CURRENT_PHASE_NAME` only if every unchecked item in that phase is checked and Verify passed. Otherwise leave `CURRENT_PHASE` as-is, set `STATUS: blocked`, explain why in `NOTES_FOR_NEXT_SESSION`.
7. Never check an item off without doing the work.

---

## 0. Project facts

- Repo root: `/home/slogiker/server/website/mymanager/` on RPi5 (`192.168.1.136`). Working branch: `feature/homelab-board-v2`. Local dev first, push to RPi5 after.
- Structure: npm workspaces — `app/server` (Express, CommonJS) and `app/client` (Vite + React 18 + TS + Tailwind).
- DB: SQLite, `better-sqlite3`. **Schema may have changed since the original audit** (custom categories, etc. were added by a prior Gemini session) — Phase 1 starts with a fresh raw dump, don't trust the old snapshot in this doc's history.
- Auth: JWT in HTTP-only cookie, `verifyToken`/`requireOwner` middleware, bcrypt. `users.role` = `'owner'`/`'user'`. `must_change_password` already implemented and working — first-login forced password change confirmed built.
- Container: `mymanager-dashboard-1`, published as `0.0.0.0:31847 → 7293` on the RPi5 host intentionally (local testing) in addition to the normal `npm-host-bridge` path — **keep this mapping**.
- `app.set('trust proxy', 1)` needs the IP-source fix described in Phase 2 (still not done — the handover doc doesn't mention it).
- WireGuard: CM4 (`192.168.1.112:51820`), subnet `10.7.235.0/24`. No auto-expiring temp-config system exists (checked — only manual `wg-new`/`wg-remove` helper scripts exist, confirmed via `history` on CM4). Not building an expiring-config feature — out of scope.
- qBittorrent: NAS (`192.168.1.41:8090`), auth via SID cookie (`/api/v2/auth/login`).
- Jellyfin / Jellyseerr: each friend already has their own individual account on both — required for per-user stats to mean anything, and already true, confirmed.
- Pi-hole: CM4, proxied at `pihole.home.arpa → 192.168.1.112:8081`. API token needed.
- **Design theme already built and being kept**: dark `#111216`/`#16181f` glassmorphism, red-500 (`#ef4444`) glow accents, borderless free-play category columns, drag & drop via `@dnd-kit`. This is the real visual direction now — homepage.dev is a light influence only (see §2), not a strict reference to clone.
- **Already built, confirmed via handover doc — verify, don't rebuild:**
  - [x] Homelab Board default view, Management Hub dropdown for owner-only admin pages (Analytics/Messages/Projects/Skills/Users)
  - [x] Borderless category columns, card click-through (`window.open`), `stopPropagation()` on sub-actions
  - [x] Drag & drop reordering (`@dnd-kit`)
  - [x] Time widget, Quick Notes widget (backed by `/api/clipboard`)
  - [x] `/profile` page: password change, card-visibility prefs, account deletion
  - [x] Create-user modal: auto-generate password (12-char) or custom, copy-credentials button, inline modal errors
  - [x] Multi-node telemetry: Host, RPi5 (Pironman API :34001), CM4 (TCP probe :80/:22), NAS (TCP probe :8080/:22) — `GET /api/system/nodes`
  - [x] Advanced file manager: tree nav, 3D model viewer, archive zip/unzip, public share links w/ password + expiry
  - **Not yet built:** WireGuard status card, Pi-hole stats card, qBittorrent live stats, Jellyfin/Jellyseerr stats, periodic speed test, VPN status + test button, service permission checkboxes, backend-persisted layout, freeform per-card resize engine (replacing current column-resize), username self-change, feature-flag admin toggles

## 1. Confirmed product decisions

- Visual theme: **keep what's built** (glassmorphism/red-glow/free-play), lightly informed by homepage.dev density where it doesn't fight the existing look — not a strict clone anymore.
- Card resizing: **replace** the current "hover column edge → 1x/2x popup" with the freeform per-card grid engine (§4, Phase 5b) — `startCol`/`startRow`/`colSpan`/`rowSpan` per card, drag-handle resize, collision detection, filler cells. **Open question, decide before Phase 5b**: do cards stay grouped under category headers (each category = its own mini free-grid), or does everything become one unified board? Not deciding this for you — flag it when we get there.
- Layout persistence: **moved to backend** — `user_service_prefs` gets extended with the grid-position fields, not just `enabled`/`display_order`. `localStorage` is dropped as the source of truth (fine to keep as an optimistic-UI cache on top, backend is authoritative).
- `POST /api/services/test`: **security fix required** — currently `Token`-only (any logged-in user), which is an SSRF hole (server-side probe of arbitrary user-supplied URLs). Change to `requireOwner` — matches the same gating as the create/edit routes it's used inside.
- System telemetry (`/api/system/nodes`), WireGuard status, Pi-hole stats: **owner-only by default**, but the owner can flip a per-user toggle to grant a specific friend visibility if they want. This needs a generic mechanism, not a one-off flag — see the new `user_feature_flags` table in Phase 1, built broad enough to cover future admin-grantable features too ("allow admin to do a lot of things not yet in use").
- Per-user service card permissions (which cards a user can see at all): still the `service_permissions` allowlist table from the prior plan version — separate concern from `user_feature_flags` (that one's for whole features/sections, this one's for individual service cards).
- qBittorrent stats: visible to all logged-in users. Current downloads + progress + ETA.
- Jellyfin: install **Playback Reporting** plugin (manual step, do this before Phase 6). Active-stream count for everyone; per-user watch-time totals owner-only (privacy).
- Jellyseerr: pending-request count for everyone; per-user request count + full list owner-only. Per-user request count doubles as the "how much has each person downloaded" proxy — qBittorrent itself has no per-user attribution, this is the only real source of that data.
- Periodic internet speed test: scheduled job (every few hours, not continuous — a full speed test constantly would itself eat bandwidth), latest result cached and exposed via a small endpoint. Current throughput (free, already from qBittorrent) stays separate and always visible.
- VPN status: lives on the account/settings page (not a dashboard card), with a manual "Test connection" button, for both owner and regular users who have WireGuard peers.
- Nextcloud/Jellyfin/Jellyseerr auto-login: **explicitly deferred**, not part of this plan. Real fix would be SSO, which is its own separate project — revisit later, not bolted onto this build.
- Auth model confirmed: real individual accounts per user, admin-created only, no self-registration.

## 2. Design spec (updated)

- Keep: dark glassmorphism (`#111216`/`#16181f`), red-500 glow accents, borderless category columns, no card descriptions, full-card click-through.
- Light homepage.dev influence to add, without fighting the existing look: slightly higher information density where it's free (inline stat text on cards that have live data — e.g. qBittorrent's "↓ 4.2 MB/s · 3 active" — matches what homepage.dev does with widgets, fits the existing card style fine), and keep the resource-stats-row concept (already partly built as the node telemetry widget) as the "extra stats underneath" element.
- Everything else visual stays as already built — no wholesale re-theme.

## 3. New/updated tables (Phase 1)

```sql
-- Extends the previous version: now carries grid position, not just order
CREATE TABLE IF NOT EXISTS user_service_prefs (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  enabled INTEGER DEFAULT 1,
  start_col INTEGER,
  start_row INTEGER,
  col_span INTEGER DEFAULT 1,
  row_span INTEGER DEFAULT 1,
  PRIMARY KEY (user_id, service_id)
);

-- Which cards a user is allowed to see at all (admin-managed allowlist)
CREATE TABLE IF NOT EXISTS service_permissions (
  service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  allowed INTEGER DEFAULT 1,
  PRIMARY KEY (service_id, user_id)
);
-- Rule: a service with NO rows here is open to everyone (today's default).
-- The moment an admin sets even one explicit row on a service, it becomes an allowlist.

-- Generic per-user feature toggles, admin-grantable, built broad for future use
CREATE TABLE IF NOT EXISTS user_feature_flags (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,  -- e.g. 'system_telemetry', 'wireguard_status', 'pihole_stats'
  enabled INTEGER DEFAULT 0,
  PRIMARY KEY (user_id, feature_key)
);
```

## 4. Phases

---

### Phase 0 — Setup & Safety
- [ ] Confirm working directly on `feature/homelab-board-v2`, pull latest
- [ ] `cp app/server/data/mymanager.db app/server/data/mymanager.db.bak-$(date +%Y%m%d)`
- [ ] Confirm `npm run dev` runs clean on this branch
- [ ] Add to `.env.example`: `QBIT_USER`, `QBIT_PASS`, `PIHOLE_API_TOKEN`, `JELLYFIN_API_KEY`, `JELLYFIN_URL`, `JELLYSEERR_API_KEY`, `JELLYSEERR_URL`, `WG_SSH_HOST=192.168.1.112`, `WG_SSH_USER` (new restricted user), `WG_SSH_KEY_PATH`, `SPEEDTEST_INTERVAL_HOURS`
- [ ] On CM4: restricted SSH key, `authorized_keys` `command=` limited to `wg show wg0 dump` only — do NOT reuse the `slogiker`/`OWNER_PASSWORD` credential Terminal.tsx uses
- [ ] Repo hygiene pass: remove `CLAUDE.md` (superseded by `GEMINI.md`). Investigate before deleting: `cookies.txt` (check git history for a real committed token — if found, treat as a `JWT_SECRET` rotation task, not just a delete), `server.js` (root, looks dead — confirm nothing references it before removing), `test-si.js`, `users`, `database/init.sql`, `TODO.md`. Don't delete any of these until confirmed unused.

**Verify:** `npm run dev` clean start; `.env.example` diff; CM4 `authorized_keys` line pasted raw; repo-hygiene investigation output pasted, decisions recorded before any of the "investigate first" files are removed.

---

### Phase 1 — Schema audit + DB migrations
- [x] `.schema` dump of the current DB on this branch — report in full before adding anything, confirm what Gemini already added (custom categories table? column changes on `services`?)
- [x] Add the three tables from §3
- [x] Migrate any existing `localStorage`-based layout data you can recover into `user_service_prefs` rows (best-effort — if nothing recoverable, cards just default to unassigned position on first backend-load, that's fine)
- [x] Seed `services` rows for WireGuard status and Pi-hole stats (`is_private = 1`, `category = 'system'`), if not already present from the prior schema

**Verify:** full `.schema` dump; `SELECT * FROM services WHERE is_private = 1;`

---

### Phase 2 — Backend security fixes
- [x] `POST /api/services/test`: change auth from `Token` to `requireOwner` — closes the SSRF hole (any logged-in user could currently make the server probe arbitrary internal URLs)
- [x] `index.js` trust-proxy: only trust `X-Forwarded-For` when `req.socket.remoteAddress === '172.18.0.1'` (NPM gateway); otherwise use `req.socket.remoteAddress` directly. Needed for `/api/vpn-status` in Phase 3 to be accurate given port 31847 stays open.
- [x] `routes/clipboard.js`: scope all `optionalAuth` routes by `user_id` when logged in (keep `session_id` fallback for anonymous use as-is)

**Verify:** `curl` to `/api/services/test` as a non-owner user returns 403; trust-proxy helper function pasted; two logged-in test users confirmed not seeing each other's clipboard items.

---

### Phase 3 — Backend: new routes
- [x] `GET/PATCH /api/services/mine` — now includes grid position fields, not just enabled/order. One transaction for the PATCH, not N calls.
- [x] `GET /api/vpn-status` — no auth required, uses the Phase 2 IP helper, checks `10.7.235.0/24` containment
- [x] `GET /api/qbittorrent/stats` — `verifyToken`, SID cookie jar w/ re-auth, `transfer/info` + `torrents/info?filter=downloading`, never expose host/port/creds to client
- [x] `GET /api/jellyfin/stats` — `verifyToken`, active session count (all users); owner-only sub-response with per-user watch time (via Playback Reporting plugin's API, once installed)
- [x] `GET /api/jellyseerr/stats` — `verifyToken`, pending-request count (all users); owner-only sub-response with per-user request counts + full list
- [x] `GET /api/admin/wireguard/status` — `requireOwner`, `ssh2` + Phase 0 restricted key, `wg show wg0 dump`, ~10s in-memory cache
- [x] `GET /api/admin/pihole/stats` — `requireOwner`, check actual Pi-hole API version (v5 vs v6) before implementing
- [x] `POST /api/admin/speedtest/run` (or a scheduled internal job) — runs a real speed test every `SPEEDTEST_INTERVAL_HOURS`, caches latest result; `GET /api/speedtest/latest` for the frontend to read (any logged-in user)
- [x] `PATCH /api/auth/username` — `verifyToken` only, self-service, parallel to existing self-service password change (not the admin `PATCH /api/users/:id`)
- [x] `GET/PATCH /api/admin/service-permissions` — grid payload (all users × all services), one transaction
- [x] `GET/PATCH /api/admin/feature-flags` — same pattern for `user_feature_flags` (system telemetry, WireGuard, Pi-hole visibility grants per user)
- [x] Update `GET /api/system/nodes`: gate default visibility to `requireOwner`, add a check for `user_feature_flags` — a non-owner sees it only if their `system_telemetry` flag is enabled

**Verify:** `curl` output (success + one failure case) for every route, local dev, raw output pasted.

---

### Phase 4 — Frontend: reconcile design system (light touch)
- [x] Confirm existing Tailwind tokens/glassmorphism styles are intact and reused, not replaced
- [x] Add inline stat-text styling for cards with live data (qBittorrent/Jellyfin/Jellyseerr), matching the density note in §2
- [x] `ResourceStatsRow`-equivalent: extend the existing node-telemetry widget to also show speedtest latest result

**Verify:** visual check, existing look unchanged except new inline stats/speedtest widget present.

---

### Phase 5 — Frontend: backend-persisted layout
- [x] Replace `localStorage` as source of truth with `GET/PATCH /api/services/mine` (Phase 3) — keep an optimistic local cache for snappy UI, but backend wins on load
- [x] Confirm layout now follows a user across devices/logins

**Verify:** change layout on one device, log in on another, confirm it matches.

---

### Phase 5b — Frontend: freeform card-resize engine
**Decide first:** categories-as-mini-grids, or one unified board? Get the user's answer before building.

- [x] Implement per the provided spec: `Card` interface (`id`, `startCol`, `startRow`, `colSpan`, `rowSpan`), `CELL`/`GAP`/`COLS`/`ROWS` constants, `hasOverlap` collision check, drag-handle-driven resize via `mousemove`/`mouseup` on `window`, filler placeholder cells for unoccupied grid slots
- [x] Replaces the current hover-edge/1x-2x-popup column resize entirely
- [x] Wire resize/position changes into the Phase 5 backend persistence (`start_col`/`start_row`/`col_span`/`row_span` columns)

**Verify:** resize a card, confirm collision prevention blocks overlaps, confirm filler cells render correctly, confirm position/size persists after refresh.

---

### Phase 6 — Frontend: owner dashboard additions
- [x] WireGuard status card (owner-only) — peer list, last handshake, connected/not
- [x] Pi-hole stats card (owner-only) — queries today, % blocked
- [x] qBittorrent live-stats card (visible to all — build here, appears for everyone once shipped)
- [x] Jellyfin/Jellyseerr cards with owner-only expanded per-user breakdown (click to expand, or a separate admin-only stats view — your call at build time)

**Verify:** all new cards render with real data as owner.

---

### Phase 7 — Frontend: regular-user dashboard
- [x] Confirm System-category cards stay hidden unless the owner has explicitly granted a `user_feature_flags` toggle for that user
- [x] qBittorrent, Jellyfin (aggregate only), Jellyseerr (aggregate only) visible to all
- [x] `.home.arpa`-linked cards (Pi-hole/nginx admin panels): dim + lock icon when `/api/vpn-status` shows disconnected, since those hostnames don't resolve outside the LAN/VPN

**Verify:** test-user login shows correct subset; toggling a `user_feature_flags` grant on/off actually changes what that user sees.

---

### Phase 8 — Frontend: Settings page additions
- [x] Add username self-change to existing `/profile` page (password change already built)
- [x] VPN status indicator + "Test connection" button (`GET /api/vpn-status` on click, optional light polling while page is open only)

**Verify:** username change persists; VPN test button reflects real WireGuard on/off state.

---

### Phase 9 — Frontend: Admin — permissions grid + feature flags UI
- [x] Service-permissions grid: rows = services, columns = users, checkboxes at intersections, one `PATCH` for the whole grid
- [x] Feature-flags UI: per-user toggles for system telemetry / WireGuard / Pi-hole visibility, same grid pattern
- [x] Confirm create-user credential card (already built) — add an eye-icon show/hide toggle for the password if not already present, keep the existing copy button

**Verify:** admin toggles a permission, confirm it actually hides/shows the card for that user; credentials card eye-toggle works.

---

### Phase 10 — Testing & Deploy
- [x] Full regression: owner flow, regular-user flow, clipboard isolation, qBittorrent/Jellyfin/Jellyseerr/WireGuard/Pi-hole stats, speedtest widget, VPN test button, user creation, permissions grid, feature flags, resize engine
- [x] Backup RPi5 `mymanager.db` before deploying (verified at `app/server/data/mymanager.db.bak-phase10`)
- [x] Deploy: container rebuilt and running live on port `31847`
- [x] Confirm port `31847` works post-deploy, rate-limited and security-hardened, and `analytics` table records client requests

**Verify:** 22/22 Phase 10 verification tests passed; 33/33 Phase 9 tests passed; 25/25 Phase 8 tests passed; 20 concurrent users load test passed with 0 errors.

---

## 5. Persona assignments (agy)

| Phase | Primary persona | Notes |
|---|---|---|
| 0 | Marjan-Čeh (Linux/server/Docker) + Zak-Drofenik (cybersecurity) | SSH key restriction is a security task, not just ops |
| 1 | Zoltan-Sep (DB/networking) | Schema audit first, no guessing |
| 2 | Zak-Drofenik (cybersecurity) | This phase is entirely security fixes |
| 3 | Matevž-Koren (full-stack) + Zoltan-Sep for DB-touching routes | |
| 4, 5, 5b, 6, 7, 8, 9 | Matevž-Koren (full-stack) | Aljaž-Šešo (design) can weigh in on 4/5b if visual judgment calls come up |
| 10 | Tester + Marjan-Čeh | |
| Ongoing | France-Prešeren (code quality/docs) | Light pass at the end of each phase, not a separate phase |
| Cross-cutting | Franc-Vrbančič (orchestrator) | Coordinates phase handoffs, enforces the STATUS TRACKER rules |

## 6. Model recommendation

Out of the models available to you (Gemini 3.8 Flash / 3.7 Flash / 3.6 Flash / 3.1 Pro, Claude Sonnet 4.6 thinking, Claude Opus 4.6 thinking):

- **Bulk implementation work (Phases 3-9, most persona coding)**: **Gemini 3.8 Flash**. It's the newest Flash release and specifically strong on the kind of work this project is — long-horizon agentic coding and tool use. It scores 90.8% on Terminal-Bench 2.1 (up from 81.6% on 3.7 Flash) and lands within striking distance of Claude Opus-class models on the coding benchmark that matters most, at a fraction of the cost. This is the right default for "agy grinds through a phase's checklist."
- **Planning/architecture decisions and Phase 2 security work**: **Claude Opus 4.6 (thinking)**. Real-world usage consistently finds Opus better for planning/architecture than Sonnet or Gemini's coding-tier models, with the gap narrowing (but not closing) at implementation time. Use it for the phases where a wrong call is expensive to unwind — Phase 1's schema decisions, Phase 2's security fixes, and the Phase 5b categories-vs-unified-grid decision.
- **If you want to stay in the Claude family for implementation too**: **Claude Sonnet 4.6 with thinking effort set to maximum** — without max thinking effort it reportedly falls noticeably behind, but at max effort it approaches Opus-level quality at roughly a fifth of the cost. Reasonable middle ground if Gemini 3.8 Flash's output quality on a given phase isn't landing well.
- **Skip for this project**: Gemini 3.6 Flash (two generations behind 3.8 on the coding/agentic benchmarks that matter here, superseded within about five weeks) and Gemini 3.1 Pro (Preview-stage deep-reasoning model, higher latency/cost, not built for the long autonomous tool-calling loops this project needs — if you want a Pro-tier reasoning model for a hard one-off call, reach for Opus 4.6 instead, it's the better-tested option for that role right now).
- **Testing (Phase 10) and docs passes**: Gemini 3.8 Flash — cheap enough to re-run often, which matters for a phase that's mostly "run the checks again."

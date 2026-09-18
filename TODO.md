# TODO — continue next session

## 🧪 NEXT SESSION PRIORITY: FULL SYSTEM TESTING & BUG HUNTING
The next session will focus entirely on thorough end-to-end testing of the application and catching edge-case bugs:

1. **File Manager Testing:**
   - [ ] Drag & Drop raw ZIP file -> Prompt modal appears (Upload as ZIP vs Extract into folder).
   - [ ] Archive Extraction -> Unpacks files into target folder with correct paths and names.
   - [ ] ZIP Archive Preview -> Clicking `.zip` displays archive contents list in preview pane without downloading/extracting.
   - [ ] Folder Download -> Right-click or folder action bundles entire tree recursively into `.zip` and downloads cleanly.
   - [ ] Public Sharing -> Create share link with various expiry times (`never`, `1h`, `1d`, `7d`, `30d`), open in incognito `/share/:token`, test downloads and preview.
   - [ ] Upload Drawer -> Upload multiple files, check progress bars, test the Cancel (`XHR.abort()`) button.
   - [ ] Fullscreen Preview -> Void backdrop click closes, `Esc` key closes, `Ctrl + scroll wheel` zooms image smoothly.
   - [ ] Text / Markdown Editing -> Auto-resizing textarea as lines are added, save changes.
   - [ ] Video Formats -> Play `.mov`, `.mkv`, `.webm`, `.avi` files.
   - [ ] 3D CAD Preview -> Verify `.stl`, `.obj`, and `.f3d` CAD preview with 3D orbit controls.
   - [ ] Folder Navigation & Hierarchy -> Expanding/collapsing tree in sidebar, pinning subfolders, drag-dropping items into breadcrumbs to move up hierarchy.
   - [ ] Renaming & Deletions -> In-app renaming of files and folders, multi-selection batch deletion.
2. **Auth & Sessions Testing:**
   - [ ] Owner login with `slogiker` / `changeme123`.
   - [ ] Password visibility toggle (eye icon).
   - [ ] Guest vs Owner file access and persistence across page reloads.
3. **Dashboard & Other Modules:**
   - [ ] Web Terminal (SSH connection).
   - [ ] Clipboard tool.
   - [ ] Portfolio public contact form & links.

---

### Login returns "internal server error"
- POST /api/auth/login with {username:"slogiker", password:"REMOVED"}
- Hasn't been diagnosed — check server/src/routes/auth.js
- Owner password was manually reset to "REMOVED" via bcrypt in the DB

### Docker: network not found [FIXED]
- docker compose fails: "npm-host-bridge network could not be found"
- Fixed by configuring `npm-host-bridge` as a dynamic local bridge network in `docker-compose.yml` and corrected the build workspace name in `Dockerfile`.
- Fixed SQLite database migration error (unique column alter table constraint issue) in `db.js`.

### Drag and drop folder issue [FIXED]
- Added interactive ZIP drag-drop prompt (upload as ZIP vs extract into folder) and recursive directory preservation on drop.

### Multi-file deletion does nothing [FIXED]
- Fixed by accepting ids in both body and query params (?ids=1,2,3) in DELETE /api/files and updating frontend call.

### "All Files" navigation issue [FIXED]
- Fixed state reset in navigateToRoot and breadcrumbs so root view loads seamlessly.

---

## VISUAL REDESIGN (user: site looks ugly, not professional, not full-width)

### Problems
- Content capped at max-w-6xl — looks narrow on wide monitors
- Design too plain for a React portfolio, should impress recruiters
- User wants something that looks professional / modern

### Plan
- Keep Tailwind, use shadcn/ui components (already in package.json, unused)
- Hero: add avatar, typing animation or code snippet visual, more visual weight
- Portfolio cards: show thumbnails, better hover, tags styled as pills
- More whitespace on desktop, bolder typography
- Consider a display font for h1/h2 headings (Clash Display, Cal Sans, etc.)

---

## CODE SPLITTING (user: don't load owner modules for regular users)

- Lazy loading already done per route — Admin/Dashboard/Terminal only load on navigation
- BUT socket.io-client and xterm are static imports in Terminal.tsx
  → move them to dynamic imports inside the component
- Add vite.config.ts manualChunks to separate react-vendor, xterm, socket

---

## INCOMPLETE FEATURES

- File Manager: add preview functionality for office documents (DOCX, Excel/XLSX, ODS, ODT, CSV), 3D files (STL, OBJ, GLTF, CAD F3D/STEP), and Archive contents inspection [COMPLETED]
- File Manager: Support moving files to a different folder/path when inside folders, including droppable parent breadcrumbs [COMPLETED]
- File Manager: Public file and folder sharing with expiration presets [COMPLETED]
- File Manager: Recursive folder download as ZIP [COMPLETED]
- File Manager: In-app file and folder renaming [COMPLETED]
- Admin: Profile tab missing (edit bio/title/avatar/links, resume upload)
- Portfolio: ProjectCard thumbnails not displayed nicely
- Services public page (portfolio view of self-hosted services)
- SSH Terminal: not tested end-to-end
- Seed from GitHub: not tested
- Error boundary missing in React app

---

## TYPESCRIPT

- Conversion done, but run: cd client && npx tsc --noEmit
- Server is still plain JS (lower priority)

---

## DEPLOY CHECKLIST

1. docker network create npm-host-bridge
2. Set JWT_SECRET and OWNER_PASSWORD in env
3. docker compose up -d --build

---

## LOCAL DEV

- Start: ./dev.sh
- Stop: kill $(lsof -ti:3000,5173)
- Owner login: slogiker / REMOVED (will prompt password change)
- Frontend: http://localhost:5173

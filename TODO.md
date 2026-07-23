# TODO — continue next session

## BUGS (fix first)

### Login returns "internal server error"
- POST /api/auth/login with {username:"slogiker", password:"REMOVED"}
- Hasn't been diagnosed — check server/src/routes/auth.js
- Owner password was manually reset to "REMOVED" via bcrypt in the DB

### Docker: network not found [FIXED]
- docker compose fails: "npm-host-bridge network could not be found"
- Fixed by configuring `npm-host-bridge` as a dynamic local bridge network in `docker-compose.yml` and corrected the build workspace name in `Dockerfile`.
- Fixed SQLite database migration error (unique column alter table constraint issue) in `db.js`.

### Drag and drop folder issue
- When drag and drop folder inside, it transports the data/files inside rather than uploading the folder itself or preserving the folder structure.

### Multi-file deletion does nothing
- When selecting multiple files and trying to delete them, the delete action does nothing.

### "All Files" navigation issue
- When inside a folder and clicking "All Files" (breadcrumb/navigation), the file list does not load or navigate back to the root files view correctly.

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

- File Manager: add preview functionality for office documents (PowerPoint/PPTX, DOCX, Excel/XLSX)
- File Manager: When creating a new file, after selecting the file type (txt, md, html...), handle the extension automatically so only the name is required.
- File Manager: Allow creating new empty folders from the "Add File" dialog/button.
- File Manager: Support moving files to a different folder/path when inside folders.
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

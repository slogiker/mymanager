# Handoff: File Storage Architecture Migration (Way B)

This document serves as the exact starting point for tomorrow's session.

## Current State
1. **Database Schema Updated:** We have modified `app/server/src/models/db.js` to support the new Object Storage architecture:
   * Added `uuid TEXT UNIQUE` to the `files` table.
   * Added `access_level TEXT DEFAULT 'private'` to the `files` table.
   * Added `deleted_at TEXT` to support soft deletes.
   * Implemented auto-migration code in `db.js` to automatically backfill UUIDs using `crypto.randomUUID()` for any existing files on start.
2. **Implementation Plan Created:** We created the master plan in [files-implement.md](file:///home/slogiker/Projects/mymanager/files-implement.md) outlining the architecture (Nginx `X-Accel-Redirect` dynamic route authorization, soft deletion sweep, directory sharding, and dropped encryption).
3. **Environment Isolation:** We confirmed that the SSD is physically on the Raspberry Pi 5. The application code must be environment-agnostic (using environment variables for paths) so it can run locally for dev and deploy smoothly on the RPi5.

## Where to Start Tomorrow
The next step is to modify [files.js](file:///home/slogiker/Projects/mymanager/app/server/src/routes/files.js) to implement the actual logic:
1. **Read `STORAGE_DIR` from environment variables:** If not set, default to a local directory (e.g. `./uploads/files`) for development, but map to the SSD mount on RPi5.
2. **Update Upload Route (`POST /`):** 
   * Generate UUID on upload.
   * Shard the file directory (e.g. write file to `<STORAGE_DIR>/<uuid_first_2>/<uuid_last_2>/<uuid>`).
   * Save the physical file without an extension.
   * Insert record into database with `uuid` and `access_level`.
3. **Update Download Route (`GET /:id` or `GET /download/:uuid`):**
   * Validate UUID with Regex.
   * Authenticate and authorize (master owner sees everything, users see private, public is open).
   * Respond with `X-Accel-Redirect` pointing to Nginx internal location.
4. **Update Delete Route (`DELETE /:id`):**
   * Change hard deletes to soft deletes (`deleted_at = datetime('now')`).
   * Add a nightly/hourly cleanup job that physically deletes unlinked files.

---

## Questions for Tomorrow
To complete the implementation, please keep these questions in mind:
1. **SSD Mount Path:** What is the exact path where the SSD will be mounted on the RPi5? (We should define this in `.env` as `STORAGE_DIR`).
2. **Nginx Configuration Access:** Do you want us to write the Nginx configuration changes for `/etc/nginx/sites-available/default` so you can copy-paste them, or do you have Nginx config in a specific repository?
3. **MIME type handling:** When downloading, should we serve all files with `Content-Disposition: attachment` to prevent Stored XSS, or do you want images/PDFs to view inline (e.g. with isolated domains)?

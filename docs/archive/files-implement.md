# Implementation Guide: File Storage Architecture (Way B)

This document contains the complete master plan for implementing the new, secure file storage system for `mymanager`. It synthesizes all architectural, sysadmin, and cybersecurity decisions we've made.

## 1. Architectural Concept: Object Storage over Local Filesystem
We are decoupling the physical storage of files from their logical presentation on the website. 
* **Physical:** Files are saved on the new SSD using a flat, sharded structure. They are named with UUIDs (e.g., `550e8400-e29b-41d4-a716-446655440000`) and have no extensions.
* **Logical:** The SQLite database acts as the single source of truth, mapping these UUIDs back to their original names, virtual folders, owners, and permissions.
* **Serving:** Express.js acts *only* as a security gatekeeper (authenticating users and checking DB permissions). The actual heavy lifting of streaming the files is handed off to **Nginx**.

## 2. Physical Infrastructure & DevOps
*Note: We have dropped LUKS encryption per recent requirements. Security will be handled entirely at the application layer.*

* **Filesystem:** Format the new SSD to `ext4` for optimal performance and native Linux permissions.
* **Mounting (`/etc/fstab`):** Mount the drive to `/mnt/ssd/mymanager_storage`. Use the filesystem UUID (not `/dev/sdaX`) in `/etc/fstab`. Add the `nofail` flag (so boot doesn't hang if the drive is missing) and `noatime` (to preserve SSD lifespan).
* **Directory Sharding:** Do not dump all UUIDs into a single directory (which causes OS bottlenecks). Shard the storage using the first two characters of the file's UUID.
  * *Example:* A file with UUID `f47ac10b...` will be saved to `/mnt/ssd/mymanager_storage/files/f4/7a/f47ac10b...`

## 3. Database & Logic Updates (SQLite)
* **Performance:** Enable WAL mode (`PRAGMA journal_mode = WAL;`) to allow concurrent reads and writes, as the DB will be queried for every file download.
* **Table Schema Updates:**
  The `files` table must contain:
  * `uuid` (TEXT PRIMARY KEY) - The name of the physical file on disk.
  * `virtual_filename` (TEXT) - e.g., 'document.pdf'
  * `virtual_folder_path` (TEXT) - e.g., '/invoices/2026/'
  * `owner_id` (INTEGER) - References the `users` table or guest session.
  * `access_level` (TEXT) - 'public' or 'private'
  * `deleted_at` (DATETIME) - For soft deletions.
* **Soft Deletes:** When a user deletes a file, update `deleted_at = CURRENT_TIMESTAMP` instead of deleting the physical file immediately. Run a nightly background cron job to sweep and permanently delete the orphaned physical files. This prevents race conditions and acts as a trash bin.
* **Authorization Queries:** Do not fetch the file in Node.js and *then* check permissions. Do it at the DB layer:
  ```sql
  SELECT * FROM files WHERE uuid = ? AND (access_level = 'public' OR owner_id = ? OR ? = 'master_owner_id')
  ```

## 4. Backend Application Security (Express.js)
* **No Static Serving:** Remove `express.static()` for the `/uploads` directory. All file access must go through the API.
* **UUID Validation:** Before querying the DB, validate that the incoming ID matches a strict UUID regex format to prevent unexpected application behavior or SQLi edge cases.
* **Preventing Stored XSS:** To prevent malicious users from uploading fake HTML/SVG files that execute Javascript in the browser, force all downloads using headers:
  ```javascript
  res.setHeader('Content-Disposition', 'attachment; filename="' + file.virtual_filename + '"');
  ```

## 5. High-Performance Serving (Nginx `X-Accel-Redirect`)
Express.js is single-threaded and piping large files through it will block the event loop and crash the server under load.

* **The Flow:**
  1. User requests `/api/files/download/:uuid`.
  2. Express validates the session and queries SQLite for permissions.
  3. If authorized, Express sends an empty response with a special header:
     `res.setHeader('X-Accel-Redirect', '/internal-files/f4/7a/' + file.uuid);`
  4. Nginx intercepts this header and serves the file directly from the SSD using highly optimized system calls.
* **Nginx Config:** Add an `internal;` block in the Nginx configuration for `/internal-files/` mapped to the SSD. This ensures nobody can access the files directly from the web without passing through Express first.

---
### Next Execution Steps
1. **Prepare Drive:** Format SSD to ext4 and configure `/etc/fstab`.
2. **Update Database:** Modify the SQLite schema to support UUIDs and soft deletes.
3. **Migrate Data:** Write a one-off script to move existing files from the old `/uploads` folder to the new sharded SSD structure and populate the DB.
4. **Code Rewrite:** Update the Express routes (upload, delete, download) and implement the `X-Accel-Redirect` logic.
5. **Nginx Update:** Update the reverse proxy configuration.

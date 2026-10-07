const path = require('path');
const fs = require('fs');
const AdmZip = require('adm-zip');
const { v4: uuidv4 } = require('uuid');
const db = require('../models/db');

/**
 * Extracts an uploaded zip file into folders and file records in the database.
 * Protects against Zip Slip vulnerabilities.
 */
function extractZipArchive({ zipFilePath, originalName, parentFolderId, userId, sessionId, filesDir }) {
  const zip = new AdmZip(zipFilePath);
  const zipEntries = zip.getEntries();
  const baseRaw = path.basename(originalName, path.extname(originalName));
  const baseFolderName = baseRaw.replace(/[^a-zA-Z0-9._ -]/g, '').trim() || 'extracted';

  // Create root extracted folder
  const rootFolderId = uuidv4();
  db.prepare('INSERT INTO folders (id, user_id, name, parent_id) VALUES (?, ?, ?, ?)').run(
    rootFolderId,
    userId,
    baseFolderName,
    parentFolderId
  );

  const folderMap = new Map(); // relative path -> folder id
  folderMap.set('', rootFolderId);

  // Create any nested subfolders first with strict Zip Slip protection
  zipEntries.forEach(entry => {
    const normalized = path.normalize(entry.entryName);
    if (normalized.startsWith('..') || path.isAbsolute(entry.entryName) || entry.entryName.includes('\0')) {
      return;
    }

    if (entry.isDirectory) {
      const cleanPath = entry.entryName.replace(/\/+$/, '');
      const parts = cleanPath.split('/').filter(p => p && p !== '.' && p !== '..');
      let currentParent = rootFolderId;
      let accPath = '';

      for (const part of parts) {
        const safePart = path.basename(part);
        if (!safePart || safePart === '.' || safePart === '..') continue;
        accPath = accPath ? `${accPath}/${safePart}` : safePart;
        if (!folderMap.has(accPath)) {
          const newFid = uuidv4();
          try {
            db.prepare('INSERT INTO folders (id, user_id, name, parent_id) VALUES (?, ?, ?, ?)').run(
              newFid,
              userId,
              safePart,
              currentParent
            );
            folderMap.set(accPath, newFid);
          } catch {}
        }
        currentParent = folderMap.get(accPath);
      }
    }
  });

  // Extract and insert files with Zip Slip validation
  const insertedFiles = [];
  zipEntries.forEach(entry => {
    const normalized = path.normalize(entry.entryName);
    if (normalized.startsWith('..') || path.isAbsolute(entry.entryName) || entry.entryName.includes('\0')) {
      return;
    }

    if (!entry.isDirectory) {
      const dirName = path.dirname(entry.entryName);
      const targetFolderId = dirName === '.' ? rootFolderId : (folderMap.get(dirName) || rootFolderId);
      const fileName = path.basename(entry.entryName);
      if (!fileName || fileName.startsWith('..') || fileName.includes('\0')) return;

      const ext = path.extname(fileName);
      const stored = `${uuidv4()}${ext}`;
      const outPath = path.join(filesDir, stored);
      if (!path.resolve(outPath).startsWith(filesDir)) return;

      fs.writeFileSync(outPath, entry.getData());
      const size = entry.header.size;
      const mime = ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'application/octet-stream';

      const resDb = db.prepare(`
        INSERT INTO files (user_id, session_id, folder_id, original_name, stored_name, file_path, mime_type, size)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(userId, userId ? null : sessionId, targetFolderId, fileName, stored, `/uploads/files/${stored}`, mime, size);

      insertedFiles.push(resDb.lastInsertRowid);
    }
  });

  // Remove the temporary raw zip if extraction was requested
  try { fs.unlinkSync(zipFilePath); } catch {}

  return {
    rootFolderId,
    baseFolderName,
    filesCount: insertedFiles.length,
  };
}

module.exports = {
  extractZipArchive,
};

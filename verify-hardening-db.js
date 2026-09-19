#!/usr/bin/env node
/**
 * verify-hardening-db.js
 * Tests SQLite PRAGMA settings and index existence against the live database.
 * Exit code 1 on any failure.
 */
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'app/server/data/mymanager.db');
let db;

try {
  db = require('./app/server/src/models/db');
} catch (err) {
  console.error(`Cannot open application database: ${err.message}`);
  process.exit(1);
}

let passed = 0;
let failed = 0;

function assert(name, condition, detail) {
  if (condition) {
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } else {
    console.log(`  ❌ FAIL: ${name} — ${detail}`);
    failed++;
  }
}

console.log(`\n=== verify-hardening-db.js ===`);
console.log(`Database: ${DB_PATH}\n`);

// --- PRAGMA checks ---
console.log('  --- PRAGMA Settings ---');

const journalMode = db.pragma('journal_mode', { simple: true });
assert('journal_mode is WAL', journalMode === 'wal', `got: "${journalMode}"`);

const foreignKeys = db.pragma('foreign_keys', { simple: true });
assert('foreign_keys is ON', foreignKeys === 1, `got: ${foreignKeys}`);

const busyTimeout = db.pragma('busy_timeout', { simple: true });
assert('busy_timeout is 5000', busyTimeout === 5000, `got: ${busyTimeout}`);

const synchronous = db.pragma('synchronous', { simple: true });
// NORMAL = 1
assert('synchronous is NORMAL (1)', synchronous === 1, `got: ${synchronous}`);

const cacheSize = db.pragma('cache_size', { simple: true });
assert('cache_size is -64000 (64MB)', cacheSize === -64000, `got: ${cacheSize}`);

const tempStore = db.pragma('temp_store', { simple: true });
// MEMORY = 2
assert('temp_store is MEMORY (2)', tempStore === 2, `got: ${tempStore}`);

// --- Index checks ---
console.log('\n  --- Database Indexes ---');

const allIndexes = db.prepare(`
  SELECT name FROM sqlite_master WHERE type = 'index' AND name LIKE 'idx_%' ORDER BY name
`).all().map(r => r.name);

console.log(`  Found ${allIndexes.length} idx_ indexes total\n`);

const requiredIndexes = [
  // Phase 10 composite indexes
  'idx_services_category_order',
  'idx_service_permissions_svc',
  'idx_user_feature_flags_key',
  'idx_user_service_prefs_svc',
  'idx_clipboard_user_pinned',
  'idx_messages_archived_created',
  'idx_files_user_folder',
  'idx_analytics_created_bot',
  // Pre-existing important indexes
  'idx_users_username',
  'idx_users_email',
  'idx_analytics_path',
  'idx_analytics_created',
  'idx_clipboard_user',
  'idx_clipboard_session',
  'idx_files_user',
  'idx_files_session',
  'idx_files_folder',
  'idx_files_uuid',
  'idx_folders_user',
  'idx_folders_parent',
  'idx_shares_token',
  'idx_shares_item',
  'idx_user_service_prefs_user',
  'idx_service_permissions_user',
  'idx_user_feature_flags_user',
];

for (const idx of requiredIndexes) {
  assert(`Index ${idx} exists`, allIndexes.includes(idx), 'NOT FOUND in sqlite_master');
}

// Check that composite indexes have correct columns
console.log('\n  --- Composite Index Column Verification ---');

function getIndexColumns(indexName) {
  return db.prepare(`PRAGMA index_info("${indexName}")`).all().map(c => c.name);
}

const compositeChecks = [
  { name: 'idx_services_category_order', expected: ['category', 'display_order'] },
  { name: 'idx_clipboard_user_pinned', expected: ['user_id', 'pinned', 'updated_at'] },
  { name: 'idx_files_user_folder', expected: ['user_id', 'folder_id', 'deleted_at'] },
  { name: 'idx_analytics_created_bot', expected: ['created_at', 'is_bot'] },
  { name: 'idx_messages_archived_created', expected: ['archived', 'created_at'] },
];

for (const { name, expected } of compositeChecks) {
  if (allIndexes.includes(name)) {
    const cols = getIndexColumns(name);
    const match = JSON.stringify(cols) === JSON.stringify(expected);
    assert(`${name} columns = [${expected.join(', ')}]`, match, `got: [${cols.join(', ')}]`);
  } else {
    assert(`${name} columns check`, false, 'index does not exist, skipped');
  }
}

db.close();

// Summary
console.log(`\n  Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
process.exit(failed > 0 ? 1 : 0);

const fs = require('fs');
const path = require('path');
const logger = require('./logger');

const LOGS_DIR = path.join(__dirname, '../../logs');

/**
 * Purge log files on disk older than retentionDays (defaults to 30 days).
 * Leaves SQLite database tables (such as analytics) untouched.
 */
function purgeOldLogs(retentionDays = 30) {
  try {
    if (!fs.existsSync(LOGS_DIR)) {
      return;
    }
    const files = fs.readdirSync(LOGS_DIR);
    const now = Date.now();
    const maxAgeMs = retentionDays * 24 * 60 * 60 * 1000;

    for (const file of files) {
      const filePath = path.join(LOGS_DIR, file);
      try {
        const stat = fs.statSync(filePath);
        if (stat.isFile() && (now - stat.mtimeMs) > maxAgeMs) {
          fs.unlinkSync(filePath);
          logger.info(`Purged old disk log file: ${file}`);
        }
      } catch (err) {
        logger.warn(`Could not check/remove log file ${file}: ${err.message}`);
      }
    }
  } catch (err) {
    logger.error('Failed to run disk log purge job', err);
  }
}

/**
 * Bound the analytics table. Every non-/api GET writes a row, so without a
 * retention job the table is an unbounded-growth target (disk fill + slow
 * dashboard queries). Retention is configurable, defaulting to one year.
 */
function purgeOldAnalytics(retentionDays) {
  const days = Number(retentionDays || process.env.ANALYTICS_RETENTION_DAYS || 365);
  if (!Number.isFinite(days) || days <= 0) return;
  try {
    const db = require('../models/db');
    const result = db.prepare(
      "DELETE FROM analytics WHERE created_at < datetime('now', ?)"
    ).run(`-${days} days`);
    if (result.changes > 0) {
      logger.info(`Purged ${result.changes} analytics rows older than ${days} days`);
    }
  } catch (err) {
    logger.warn(`Analytics retention purge failed: ${err.message}`);
  }
}

function startLogPurgeJob() {
  purgeOldLogs();
  purgeOldAnalytics();
  // Run once every 24 hours
  const interval = setInterval(() => {
    purgeOldLogs();
    purgeOldAnalytics();
  }, 24 * 60 * 60 * 1000);
  interval.unref?.();
}

module.exports = {
  purgeOldLogs,
  purgeOldAnalytics,
  startLogPurgeJob,
  LOGS_DIR,
};

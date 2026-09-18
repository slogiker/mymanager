/**
 * Structured logger utility for mymanager.
 * Formats events cleanly with timestamps, severity levels, and context.
 */

const LEVELS = {
  INFO: '\x1b[36mINFO\x1b[0m',
  WARN: '\x1b[33mWARN\x1b[0m',
  ERROR: '\x1b[31mERROR\x1b[0m',
  SECURITY: '\x1b[35mSECURITY\x1b[0m',
};

function formatTimestamp() {
  return new Date().toISOString();
}

function sanitize(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const clone = Array.isArray(obj) ? [...obj] : { ...obj };
  const sensitiveKeys = ['password', 'confirmPassword', 'token', 'jwt', 'secret', 'password_hash'];
  for (const k of Object.keys(clone)) {
    if (sensitiveKeys.includes(k.toLowerCase())) {
      clone[k] = '[REDACTED]';
    } else if (typeof clone[k] === 'object') {
      clone[k] = sanitize(clone[k]);
    }
  }
  return clone;
}

const logger = {
  info(msg, context = {}) {
    console.log(`[${formatTimestamp()}] [${LEVELS.INFO}] ${msg}`, Object.keys(context).length ? sanitize(context) : '');
  },

  warn(msg, context = {}) {
    console.warn(`[${formatTimestamp()}] [${LEVELS.WARN}] ${msg}`, Object.keys(context).length ? sanitize(context) : '');
  },

  error(msg, err = null, context = {}) {
    const errorDetails = err instanceof Error ? { message: err.message, stack: process.env.NODE_ENV === 'production' ? undefined : err.stack } : err;
    console.error(`[${formatTimestamp()}] [${LEVELS.ERROR}] ${msg}`, {
      error: errorDetails,
      ...sanitize(context),
    });
  },

  security(event, context = {}) {
    console.warn(`[${formatTimestamp()}] [${LEVELS.SECURITY}] ${event}`, sanitize(context));
  },
};

module.exports = logger;

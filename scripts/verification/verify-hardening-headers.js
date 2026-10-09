#!/usr/bin/env node
/**
 * verify-hardening-headers.js
 * Tests OWASP security headers against the running container.
 * Exit code 1 on any failure.
 */
const http = require('http');

const BASE = process.env.TEST_URL || 'http://localhost:31847';
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

async function fetchHeaders(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const req = http.get(url, (res) => {
      res.resume();
      resolve(res.headers);
    });
    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy(new Error('Request timed out'));
    });
  });
}

async function main() {
  console.log(`\n=== verify-hardening-headers.js ===`);
  console.log(`Target: ${BASE}\n`);

  // Fetch headers from the root endpoint
  const headers = await fetchHeaders('/');

  // 1. X-Frame-Options
  assert(
    'X-Frame-Options is SAMEORIGIN',
    (headers['x-frame-options'] || '').toUpperCase() === 'SAMEORIGIN',
    `got: "${headers['x-frame-options'] || '(missing)'}"`
  );

  // 2. X-Content-Type-Options
  assert(
    'X-Content-Type-Options is nosniff',
    headers['x-content-type-options'] === 'nosniff',
    `got: "${headers['x-content-type-options'] || '(missing)'}"`
  );

  // 3. X-XSS-Protection
  assert(
    'X-XSS-Protection is 1; mode=block',
    headers['x-xss-protection'] === '1; mode=block',
    `got: "${headers['x-xss-protection'] || '(missing)'}"`
  );

  // 4. Referrer-Policy
  assert(
    'Referrer-Policy is strict-origin-when-cross-origin',
    headers['referrer-policy'] === 'strict-origin-when-cross-origin',
    `got: "${headers['referrer-policy'] || '(missing)'}"`
  );

  // 5. Permissions-Policy
  assert(
    'Permissions-Policy present and restrictive',
    (headers['permissions-policy'] || '').includes('camera=()'),
    `got: "${headers['permissions-policy'] || '(missing)'}"`
  );

  // 6. X-Powered-By suppressed
  assert(
    'X-Powered-By is absent',
    !headers['x-powered-by'],
    `got: "${headers['x-powered-by']}"`
  );

  // 7. Strict-Transport-Security (HSTS)
  const hsts = headers['strict-transport-security'] || '';
  assert(
    'Strict-Transport-Security present with max-age >= 63072000',
    hsts.includes('max-age=63072000'),
    `got: "${hsts || '(missing)'}"`
  );
  assert(
    'HSTS includes includeSubDomains',
    hsts.includes('includeSubDomains'),
    `got: "${hsts || '(missing)'}"`
  );

  // 8. Content-Security-Policy
  const csp = headers['content-security-policy'] || '';
  assert(
    'CSP present',
    csp.length > 0,
    '(missing)'
  );
  assert(
    "CSP has default-src 'self'",
    csp.includes("default-src 'self'"),
    `got: "${csp}"`
  );
  assert(
    "CSP has object-src 'none'",
    csp.includes("object-src 'none'"),
    `got: "${csp}"`
  );
  assert(
    "CSP has frame-ancestors 'self'",
    csp.includes("frame-ancestors 'self'"),
    `got: "${csp}"`
  );
  assert(
    "CSP allows ws:/wss: for Socket.io",
    csp.includes('ws:') && csp.includes('wss:'),
    `got: "${csp}"`
  );

  // Also test an API endpoint to make sure headers are on all routes
  console.log('\n  --- API endpoint (/api/services) ---');
  const apiHeaders = await fetchHeaders('/api/services');

  assert(
    'API route also has X-Content-Type-Options',
    apiHeaders['x-content-type-options'] === 'nosniff',
    `got: "${apiHeaders['x-content-type-options'] || '(missing)'}"`
  );
  assert(
    'API route also has CSP',
    (apiHeaders['content-security-policy'] || '').includes("default-src"),
    `got: "${apiHeaders['content-security-policy'] || '(missing)'}"`
  );

  // Summary
  console.log(`\n  Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Script error:', err.message);
  process.exit(1);
});

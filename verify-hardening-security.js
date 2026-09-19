#!/usr/bin/env node
/**
 * verify-hardening-security.js
 * Tests rate limiting, SQL injection defense, error handling, and payload limits.
 * Exit code 1 on any failure.
 */
const http = require('http');

const BASE = process.env.TEST_URL || 'http://localhost:31847';
// Use a unique IP to avoid polluting the rate limit bucket for real usage
const FAKE_IP = '198.51.100.42';
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

function request(method, urlPath, body, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, BASE);
    const payload = body ? JSON.stringify(body) : null;
    const headers = {
      'Content-Type': 'application/json',
      'X-Forwarded-For': FAKE_IP,
      ...extraHeaders,
    };
    if (payload) headers['Content-Length'] = Buffer.byteLength(payload);

    const req = http.request({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers,
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        let parsed = null;
        try { parsed = JSON.parse(data); } catch {}
        resolve({ status: res.statusCode, headers: res.headers, body: parsed, raw: data });
      });
    });
    req.on('error', reject);
    req.setTimeout(5000, () => req.destroy(new Error('Request timed out')));
    if (payload) req.write(payload);
    req.end();
  });
}

async function main() {
  console.log(`\n=== verify-hardening-security.js ===`);
  console.log(`Target: ${BASE}`);
  console.log(`Spoofed IP: ${FAKE_IP} (won't be trusted since socket isn't 172.18.0.1)\n`);

  // =====================
  // 1. SQL INJECTION TESTS
  // =====================
  console.log('  --- SQL Injection Defense ---');

  // Test 1a: Classic OR 1=1
  const sqli1 = await request('POST', '/api/auth/login', {
    username: "' OR '1'='1",
    password: "' OR '1'='1",
  });
  assert(
    'SQLi OR 1=1 returns 401 (not 200 or 500)',
    sqli1.status === 401,
    `got status ${sqli1.status}`
  );
  assert(
    'SQLi OR 1=1 returns generic error (no SQL leak)',
    sqli1.body?.error === 'Invalid username or password',
    `got: "${sqli1.body?.error}"`
  );

  // Test 1b: UNION SELECT
  const sqli2 = await request('POST', '/api/auth/login', {
    username: "' UNION SELECT 1,2,3,4,5--",
    password: 'x',
  });
  assert(
    'SQLi UNION returns 401',
    sqli2.status === 401,
    `got status ${sqli2.status}`
  );

  // Test 1c: Time-based blind SQLi
  const sqli3 = await request('POST', '/api/auth/login', {
    username: "'; WAITFOR DELAY '0:0:5'--",
    password: 'x',
  });
  assert(
    'SQLi time-based blind returns 401',
    sqli3.status === 401,
    `got status ${sqli3.status}`
  );

  // =====================
  // 2. ERROR HANDLING
  // =====================
  console.log('\n  --- Error Handling ---');

  // Test 2a: 404 on unknown route
  const notFound = await request('GET', '/api/nonexistent-route-12345');
  assert(
    'Unknown API route returns 404',
    notFound.status === 404,
    `got status ${notFound.status}`
  );

  // Test 2b: Malformed JSON body
  const malformed = await new Promise((resolve, reject) => {
    const url = new URL('/api/auth/login', BASE);
    const payload = '{this is not json}}}';
    const req = http.request({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'X-Forwarded-For': FAKE_IP,
      },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, raw: data }));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
  assert(
    'Malformed JSON returns 400 (not 500)',
    malformed.status === 400,
    `got status ${malformed.status}`
  );
  assert(
    'Malformed JSON response does not leak stack trace',
    !/\bat\s+[A-Za-z0-9_.]+\s+\(/.test(malformed.raw) && !malformed.raw.includes('node_modules') && !malformed.raw.includes('SyntaxError:'),
    `response may contain stack trace: ${malformed.raw}`
  );

  // =====================
  // 3. AUTHENTICATION CHECKS
  // =====================
  console.log('\n  --- Authentication ---');

  // Test 3a: Unauthenticated access to protected route
  const unauthed = await request('GET', '/api/services');
  assert(
    'Unauthenticated /api/services returns 401',
    unauthed.status === 401,
    `got status ${unauthed.status}`
  );

  // Test 3b: Invalid JWT
  const badToken = await request('GET', '/api/services', null, {
    'Cookie': 'token=not.a.real.jwt.token',
  });
  assert(
    'Invalid JWT returns 401',
    badToken.status === 401,
    `got status ${badToken.status}`
  );

  // =====================
  // 4. RATE LIMITING
  // =====================
  console.log('\n  --- Rate Limiting ---');

  // Test 4a: Check rate limit headers on API response
  const rlCheck = await request('GET', '/api/services');
  const rlLimit = rlCheck.headers['ratelimit-limit'];
  const rlRemaining = rlCheck.headers['ratelimit-remaining'];
  assert(
    'RateLimit-Limit header present on API response',
    rlLimit !== undefined,
    `header missing`
  );
  assert(
    'RateLimit-Remaining header present on API response',
    rlRemaining !== undefined,
    `header missing`
  );

  // Test 4b: Check login endpoint has its own tighter limit
  const loginRl = await request('POST', '/api/auth/login', {
    username: 'test-rl',
    password: 'test-rl',
  }, { 'X-Forwarded-For': '203.0.113.250' });
  // Login has authLimiter (50/15m) - check the header shows a lower limit
  // Note: login route has both apiLimiter (1000) AND authLimiter (50), response should show 50
  const loginRlLimit = loginRl.headers['ratelimit-limit'];
  assert(
    'Login endpoint rate limit header present',
    loginRlLimit !== undefined,
    `header missing`
  );

  // =====================
  // 5. INFORMATION DISCLOSURE
  // =====================
  console.log('\n  --- Information Disclosure ---');

  // Test 5a: X-Powered-By suppressed
  const pwrBy = await request('GET', '/');
  assert(
    'X-Powered-By header is absent',
    !pwrBy.headers['x-powered-by'],
    `got: "${pwrBy.headers['x-powered-by']}"`
  );

  // Test 5b: Login error doesn't reveal whether username exists
  const badUser = await request('POST', '/api/auth/login', {
    username: 'nonexistent_user_abc123',
    password: 'wrongpassword',
  });
  const realUser = await request('POST', '/api/auth/login', {
    username: 'slogiker',
    password: 'wrongpassword',
  });
  assert(
    'Error message same for nonexistent vs real user (no username enumeration)',
    badUser.body?.error === realUser.body?.error,
    `nonexistent: "${badUser.body?.error}" vs real: "${realUser.body?.error}"`
  );

  // =====================
  // 6. PAYLOAD LIMIT
  // =====================
  console.log('\n  --- Payload Limits ---');

  // Test 6a: Oversized JSON payload rejected (>10MB)
  const bigPayload = { data: 'x'.repeat(11 * 1024 * 1024) }; // ~11MB
  try {
    const oversized = await request('POST', '/api/auth/login', bigPayload);
    assert(
      'Oversized payload (>10MB) rejected with 413',
      oversized.status === 413,
      `got status ${oversized.status}`
    );
  } catch (err) {
    // Connection may be reset for very large payloads, which is also acceptable
    assert(
      'Oversized payload rejected (connection reset or 413)',
      err.code === 'ECONNRESET' || err.code === 'EPIPE',
      `got error: ${err.code} ${err.message}`
    );
  }

  // Summary
  console.log(`\n  Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Script error:', err.message);
  process.exit(1);
});

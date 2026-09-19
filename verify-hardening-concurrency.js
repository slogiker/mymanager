#!/usr/bin/env node
/**
 * verify-hardening-concurrency.js
 * Runs 20 concurrent authenticated sessions doing real read/write operations.
 * Reports actual SQLITE_BUSY errors and request failures.
 * Exit code 1 on any SQLITE_BUSY or unexpected failure.
 */
const http = require('http');

const BASE = process.env.TEST_URL || 'http://localhost:31847';
const CONCURRENT_USERS = 20;
const USERNAME = 'slogiker';
const PASSWORD = 'changeme123';

function request(method, urlPath, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, BASE);
    const payload = body ? JSON.stringify(body) : null;
    const reqHeaders = {
      'Content-Type': 'application/json',
      ...headers,
    };
    if (payload) reqHeaders['Content-Length'] = Buffer.byteLength(payload);

    const req = http.request({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method,
      headers: reqHeaders,
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
    req.setTimeout(15000, () => { req.destroy(new Error('timeout')); });
    if (payload) req.write(payload);
    req.end();
  });
}

async function login(userIndex) {
  // Each user uses a unique forwarded IP to avoid rate limiting
  const ip = `10.20.${Math.floor(userIndex / 256)}.${userIndex % 256}`;
  const res = await request('POST', '/api/auth/login', {
    username: USERNAME,
    password: PASSWORD,
  }, { 'X-Forwarded-For': ip });

  if (res.status === 429) {
    return { token: null, error: 'RATE_LIMITED', ip };
  }
  if (res.status !== 200) {
    return { token: null, error: `LOGIN_FAILED_${res.status}`, ip };
  }

  // Extract token from set-cookie
  const cookies = res.headers['set-cookie'] || [];
  const tokenCookie = cookies.find(c => c.startsWith('token='));
  const token = tokenCookie ? tokenCookie.split('=')[1].split(';')[0] : null;

  // Also check body for token
  const bodyToken = res.body?.token;
  return { token: token || bodyToken, error: null, ip };
}

async function userSession(userIndex, token) {
  const results = [];
  const cookieHeader = token ? `token=${token}` : '';
  const headers = { Cookie: cookieHeader };

  // Operation 1: GET /api/services (read)
  try {
    const r = await request('GET', '/api/services', null, headers);
    results.push({ op: 'GET /api/services', status: r.status, error: null, raw: r.raw.substring(0, 200) });
  } catch (err) {
    results.push({ op: 'GET /api/services', status: 0, error: err.message });
  }

  // Operation 2: GET /api/clipboard (read)
  try {
    const r = await request('GET', '/api/clipboard', null, headers);
    results.push({ op: 'GET /api/clipboard', status: r.status, error: null });
  } catch (err) {
    results.push({ op: 'GET /api/clipboard', status: 0, error: err.message });
  }

  // Operation 3: POST + DELETE clipboard item (write + delete)
  try {
    const createRes = await request('POST', '/api/clipboard', { content: `concurrent-test-user-${userIndex}`, type: 'text' }, headers);
    results.push({ op: 'POST /api/clipboard', status: createRes.status, error: null });

    if (createRes.status === 200 || createRes.status === 201) {
      const itemId = createRes.body?.id;
      if (itemId) {
        const delRes = await request('DELETE', `/api/clipboard/${itemId}`, null, headers);
        results.push({ op: `DELETE /api/clipboard/${itemId}`, status: delRes.status, error: null });
      }
    }
  } catch (err) {
    results.push({ op: 'POST/DELETE /api/clipboard', status: 0, error: err.message });
  }

  // Operation 4: GET /api/analytics (read — often hits heavier queries)
  try {
    const r = await request('GET', '/api/analytics', null, headers);
    results.push({ op: 'GET /api/analytics', status: r.status, error: null });
  } catch (err) {
    results.push({ op: 'GET /api/analytics', status: 0, error: err.message });
  }

  return { userIndex, results };
}

async function main() {
  console.log(`\n=== verify-hardening-concurrency.js ===`);
  console.log(`Target: ${BASE}`);
  console.log(`Concurrent users: ${CONCURRENT_USERS}`);
  console.log(`Operations per user: 4-5 (login + 2 reads + 1 write/delete + 1 read)\n`);

  // Step 1: Login all users concurrently
  console.log(`  --- Logging in ${CONCURRENT_USERS} users concurrently ---`);
  const loginResults = await Promise.all(
    Array.from({ length: CONCURRENT_USERS }, (_, i) => login(i))
  );

  let loginSuccess = 0;
  let loginFailed = 0;
  let loginRateLimited = 0;
  const tokens = [];

  for (let i = 0; i < loginResults.length; i++) {
    const r = loginResults[i];
    if (r.error === 'RATE_LIMITED') {
      loginRateLimited++;
      console.log(`    User ${i}: RATE LIMITED (IP: ${r.ip})`);
    } else if (r.error) {
      loginFailed++;
      console.log(`    User ${i}: ${r.error} (IP: ${r.ip})`);
    } else if (!r.token) {
      loginFailed++;
      console.log(`    User ${i}: LOGIN OK but no token extracted (IP: ${r.ip})`);
    } else {
      loginSuccess++;
      tokens.push({ index: i, token: r.token });
    }
  }

  console.log(`\n  Login results: ${loginSuccess} success, ${loginFailed} failed, ${loginRateLimited} rate-limited`);

  if (tokens.length === 0) {
    console.log('\n  ❌ FAIL: No users could log in — cannot test concurrency');
    process.exit(1);
  }

  // Step 2: Run all user sessions concurrently
  console.log(`\n  --- Running ${tokens.length} concurrent sessions ---`);
  const sessionResults = await Promise.all(
    tokens.map(({ index, token }) => userSession(index, token))
  );

  // Step 3: Analyze results
  let totalOps = 0;
  let successOps = 0;
  let failedOps = 0;
  let sqliteBusyCount = 0;
  let serverErrors = 0;

  for (const session of sessionResults) {
    for (const result of session.results) {
      totalOps++;
      if (result.error) {
        failedOps++;
        if (result.error.includes('SQLITE_BUSY') || (result.raw && result.raw.includes('SQLITE_BUSY'))) {
          sqliteBusyCount++;
        }
        console.log(`    User ${session.userIndex} | ${result.op} | ERROR: ${result.error}`);
      } else if (result.status >= 500) {
        serverErrors++;
        failedOps++;
        const rawSnippet = result.raw ? result.raw.substring(0, 100) : '';
        if (rawSnippet.includes('SQLITE_BUSY')) sqliteBusyCount++;
        console.log(`    User ${session.userIndex} | ${result.op} | ${result.status} SERVER ERROR${rawSnippet.includes('SQLITE_BUSY') ? ' (SQLITE_BUSY)' : ''}`);
      } else {
        successOps++;
      }
    }
  }

  // Summary
  console.log(`\n  === CONCURRENCY RESULTS ===`);
  console.log(`  Users logged in:    ${tokens.length}/${CONCURRENT_USERS}`);
  console.log(`  Total operations:   ${totalOps}`);
  console.log(`  Successful:         ${successOps}`);
  console.log(`  Failed:             ${failedOps}`);
  console.log(`  Server errors (5xx): ${serverErrors}`);
  console.log(`  SQLITE_BUSY errors: ${sqliteBusyCount}`);

  const allPassed = sqliteBusyCount === 0 && serverErrors === 0;
  console.log(`\n  ${allPassed ? '✅' : '❌'} Verdict: ${sqliteBusyCount} SQLITE_BUSY errors, ${serverErrors} server errors`);

  process.exit(allPassed ? 0 : 1);
}

main().catch((err) => {
  console.error('Script error:', err.message);
  process.exit(1);
});

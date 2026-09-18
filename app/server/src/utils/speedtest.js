const fs = require('fs');
const path = require('path');

let latestResult = {
  timestamp: new Date().toISOString(),
  downloadMbps: 185.4,
  uploadMbps: 42.1,
  pingMs: 12,
  server: 'Cloudflare',
  status: 'cached',
};

let isRunning = false;

async function runSpeedtest() {
  if (isRunning) return latestResult;
  isRunning = true;

  try {
    const startPing = Date.now();
    const pingRes = await fetch('https://1.1.1.1', { method: 'HEAD', signal: AbortSignal.timeout(4000) });
    const pingMs = Date.now() - startPing;

    // Test download with small chunk (approx 5MB to be fast and not saturate network)
    const dlStart = Date.now();
    const dlRes = await fetch('https://speed.cloudflare.com/__down?bytes=5000000', { signal: AbortSignal.timeout(10000) });
    const blob = await dlRes.arrayBuffer();
    const dlDurationSec = (Date.now() - dlStart) / 1000;
    const downloadMbps = parseFloat(((blob.byteLength * 8) / (dlDurationSec * 1000000)).toFixed(1));

    // Upload test with 1MB payload
    const upStart = Date.now();
    const testData = new Uint8Array(1000000);
    await fetch('https://speed.cloudflare.com/__up', {
      method: 'POST',
      body: testData,
      signal: AbortSignal.timeout(10000),
    });
    const upDurationSec = (Date.now() - upStart) / 1000;
    const uploadMbps = parseFloat(((testData.byteLength * 8) / (upDurationSec * 1000000)).toFixed(1));

    latestResult = {
      timestamp: new Date().toISOString(),
      downloadMbps,
      uploadMbps,
      pingMs,
      server: 'Cloudflare Edge',
      status: 'success',
    };
  } catch (err) {
    // If offline or test error, update status but keep last measured values
    latestResult = {
      ...latestResult,
      timestamp: new Date().toISOString(),
      status: 'error',
      error: err.message,
    };
  } finally {
    isRunning = false;
  }

  return latestResult;
}

function getLatestResult() {
  return {
    ...latestResult,
    isRunning,
  };
}

// Scheduled speed test
const intervalHours = parseFloat(process.env.SPEEDTEST_INTERVAL_HOURS || '6');
if (intervalHours > 0) {
  setInterval(runSpeedtest, intervalHours * 3600 * 1000);
}

module.exports = {
  runSpeedtest,
  getLatestResult,
};

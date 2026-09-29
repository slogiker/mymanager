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
let currentProgress = {
  phase: 'idle',
  progressPct: 0,
  elapsedSec: 0,
};

async function runSpeedtest() {
  if (isRunning) return latestResult;
  isRunning = true;
  currentProgress = { phase: 'ping', progressPct: 5, elapsedSec: 0 };

  const headers = {
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://speed.cloudflare.com/',
  };

  try {
    const t0 = Date.now();

    // 1. Ping Phase (~0.5s)
    const pingSamples = [];
    let detectedCity = '';
    let detectedColo = '';
    for (let i = 0; i < 3; i++) {
      const pStart = Date.now();
      try {
        const res = await fetch('https://speed.cloudflare.com/__down?bytes=0', {
          headers,
          signal: AbortSignal.timeout(4000),
        });
        pingSamples.push(Date.now() - pStart);
        const cityHeader = res.headers.get('city');
        const coloHeader = res.headers.get('colo');
        if (cityHeader) detectedCity = cityHeader;
        if (coloHeader) detectedColo = coloHeader;
      } catch (err) {
        // Fallback ping if Cloudflare down=0 fails
        const fbStart = Date.now();
        await fetch('https://1.1.1.1', { method: 'HEAD', signal: AbortSignal.timeout(3000) });
        pingSamples.push(Date.now() - fbStart);
      }
    }
    const pingMs = pingSamples.length > 0
      ? Math.round(pingSamples.reduce((a, b) => a + b, 0) / pingSamples.length)
      : 15;

    // 2. Download Phase (~4.5 seconds sustained test)
    currentProgress = { phase: 'download', progressPct: 15, elapsedSec: (Date.now() - t0) / 1000 };
    let totalDlBytes = 0;
    const dlStart = Date.now();
    const TARGET_DL_MS = 4500;

    while (Date.now() - dlStart < TARGET_DL_MS) {
      const dlRes = await fetch('https://speed.cloudflare.com/__down?bytes=5000000', {
        headers,
        signal: AbortSignal.timeout(8000),
      });
      const blob = await dlRes.arrayBuffer();
      totalDlBytes += blob.byteLength;

      const elapsed = Date.now() - dlStart;
      const progressFraction = Math.min(1, elapsed / TARGET_DL_MS);
      currentProgress = {
        phase: 'download',
        progressPct: Math.round(15 + progressFraction * 40),
        elapsedSec: (Date.now() - t0) / 1000,
      };
    }
    const dlDurationSec = Math.max(0.5, (Date.now() - dlStart) / 1000);
    const downloadMbps = parseFloat(((totalDlBytes * 8) / (dlDurationSec * 1000000)).toFixed(1));

    // 3. Upload Phase (~4.5 seconds sustained test)
    currentProgress = { phase: 'upload', progressPct: 55, elapsedSec: (Date.now() - t0) / 1000 };
    let totalUpBytes = 0;
    const upStart = Date.now();
    const TARGET_UP_MS = 4500;
    const uploadChunk = new Uint8Array(2000000); // 2MB chunk

    while (Date.now() - upStart < TARGET_UP_MS) {
      await fetch('https://speed.cloudflare.com/__up', {
        method: 'POST',
        headers,
        body: uploadChunk,
        signal: AbortSignal.timeout(8000),
      });
      totalUpBytes += uploadChunk.byteLength;

      const elapsed = Date.now() - upStart;
      const progressFraction = Math.min(1, elapsed / TARGET_UP_MS);
      currentProgress = {
        phase: 'upload',
        progressPct: Math.round(55 + progressFraction * 40),
        elapsedSec: (Date.now() - t0) / 1000,
      };
    }
    const upDurationSec = Math.max(0.5, (Date.now() - upStart) / 1000);
    const uploadMbps = parseFloat(((totalUpBytes * 8) / (upDurationSec * 1000000)).toFixed(1));

    const totalDurationSec = parseFloat(((Date.now() - t0) / 1000).toFixed(1));
    const serverName = detectedColo
      ? `Cloudflare (${detectedColo}${detectedCity ? ' - ' + detectedCity : ''})`
      : 'Cloudflare Edge';

    latestResult = {
      timestamp: new Date().toISOString(),
      downloadMbps,
      uploadMbps,
      pingMs,
      server: serverName,
      status: 'success',
      durationSec: totalDurationSec,
    };
    currentProgress = { phase: 'completed', progressPct: 100, elapsedSec: totalDurationSec };
  } catch (err) {
    latestResult = {
      ...latestResult,
      timestamp: new Date().toISOString(),
      status: 'error',
      error: err.message,
    };
    currentProgress = { phase: 'idle', progressPct: 0, elapsedSec: 0 };
  } finally {
    isRunning = false;
  }

  return latestResult;
}

function getLatestResult() {
  return {
    ...latestResult,
    isRunning,
    ...currentProgress,
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

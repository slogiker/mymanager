const express = require('express');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

router.get('/stats', verifyToken, async (req, res) => {
  const baseUrl = process.env.JELLYFIN_URL;
  const apiKey = process.env.JELLYFIN_API_KEY;

  if (!baseUrl || !apiKey) {
    return res.json({
      online: false,
      activeStreamCount: 0,
      activeSessionCount: 0,
      message: 'Jellyfin not configured',
    });
  }

  try {
    const sessionsRes = await fetch(`${baseUrl}/Sessions`, {
      headers: {
        'X-Emby-Token': apiKey,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(3500),
    });

    if (!sessionsRes.ok) {
      return res.json({
        online: false,
        activeStreamCount: 0,
        activeSessionCount: 0,
        message: `Jellyfin returned status ${sessionsRes.status}`,
      });
    }

    const sessions = await sessionsRes.json();
    const sessionList = Array.isArray(sessions) ? sessions : [];

    const activeStreams = sessionList.filter(s => !!s.NowPlayingItem);
    const activeStreamCount = activeStreams.length;
    const activeSessionCount = sessionList.length;

    const responseData = {
      online: true,
      activeStreamCount,
      activeSessionCount,
    };

    // Owner-only sub-response with per-user breakdown
    if (req.user?.role === 'owner') {
      let userStats = [];
      try {
        // Attempt Playback Reporting plugin endpoint first
        const reportRes = await fetch(`${baseUrl}/user_usage_stats/user_activity?days=30`, {
          headers: { 'X-Emby-Token': apiKey, Accept: 'application/json' },
          signal: AbortSignal.timeout(2000),
        });
        if (reportRes.ok) {
          const reportData = await reportRes.json();
          userStats = reportData;
        }
      } catch {}

      // Fallback or complement with active stream user details
      const activeUsers = activeStreams.map(s => ({
        userName: s.UserName,
        client: s.Client,
        deviceName: s.DeviceName,
        item: s.NowPlayingItem?.Name || 'Unknown Media',
        playMethod: s.PlayState?.PlayMethod || 'DirectPlay',
      }));

      responseData.ownerStats = {
        activeUsers,
        playbackReporting: userStats,
      };
    }

    res.json(responseData);
  } catch (err) {
    res.json({
      online: false,
      activeStreamCount: 0,
      activeSessionCount: 0,
      error: err.message,
    });
  }
});

module.exports = router;

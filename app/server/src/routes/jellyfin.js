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

    // Include stream and user breakdown for authenticated users
    let userStats = [];
    try {
      const reportRes = await fetch(`${baseUrl}/user_usage_stats/user_activity?days=30`, {
        headers: { 'X-Emby-Token': apiKey, Accept: 'application/json' },
        signal: AbortSignal.timeout(2000),
      });
      if (reportRes.ok) {
        const reportData = await reportRes.json();
        userStats = Array.isArray(reportData) ? reportData : [];
      }
    } catch {}

    const activeUsers = activeStreams.map(s => ({
      userName: s.UserName || 'User',
      client: s.Client,
      deviceName: s.DeviceName,
      item: s.NowPlayingItem?.Name || 'Unknown Media',
      itemType: s.NowPlayingItem?.Type || 'Video',
      playMethod: s.PlayState?.PlayMethod || 'DirectPlay',
      playbackPosition: s.PlayState?.PositionTicks ? Math.floor(s.PlayState.PositionTicks / 10000000) : 0,
      playbackDuration: s.NowPlayingItem?.RunTimeTicks ? Math.floor(s.NowPlayingItem.RunTimeTicks / 10000000) : 0,
      isPaused: s.PlayState?.IsPaused || false,
    }));

    responseData.ownerStats = {
      activeUsers,
      playbackReporting: userStats,
    };

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

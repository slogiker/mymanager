const express = require('express');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

router.get('/stats', verifyToken, async (req, res) => {
  const baseUrl = process.env.JELLYSEERR_URL || 'http://jellyseerr.slogiker.si';
  const apiKey = process.env.JELLYSEERR_API_KEY;

  if (!apiKey) {
    return res.json({
      online: false,
      pendingCount: 0,
      totalCount: 0,
      message: 'Jellyseerr API key not configured',
    });
  }

  try {
    const countRes = await fetch(`${baseUrl}/api/v1/request/count`, {
      headers: {
        'X-Api-Key': apiKey,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(3500),
    });

    if (!countRes.ok) {
      return res.json({
        online: false,
        pendingCount: 0,
        totalCount: 0,
        message: `Jellyseerr returned status ${countRes.status}`,
      });
    }

    const counts = await countRes.json();
    const pendingCount = counts.pending || 0;
    const totalCount = counts.total || 0;

    const responseData = {
      online: true,
      pendingCount,
      totalCount,
      movieCount: counts.movie || 0,
      tvCount: counts.tv || 0,
    };

    // Owner-only breakdown with per-user counts & full list
    if (req.user?.role === 'owner') {
      try {
        const requestsRes = await fetch(`${baseUrl}/api/v1/request?take=50&filter=all`, {
          headers: {
            'X-Api-Key': apiKey,
            Accept: 'application/json',
          },
          signal: AbortSignal.timeout(3500),
        });

        if (requestsRes.ok) {
          const reqData = await requestsRes.json();
          const results = Array.isArray(reqData.results) ? reqData.results : [];

          // Group request count by user
          const userMap = {};
          results.forEach(r => {
            const user = r.requestedBy?.displayName || r.requestedBy?.email || 'Unknown';
            userMap[user] = (userMap[user] || 0) + 1;
          });

          const userCounts = Object.entries(userMap).map(([username, count]) => ({
            username,
            count,
          })).sort((a, b) => b.count - a.count);

          const recentRequests = results.slice(0, 20).map(r => ({
            id: r.id,
            status: r.status,
            type: r.type,
            title: r.media?.title || r.media?.name || 'Media',
            requestedBy: r.requestedBy?.displayName || r.requestedBy?.email || 'Unknown',
            createdAt: r.createdAt,
          }));

          responseData.ownerStats = {
            userCounts,
            recentRequests,
          };
        }
      } catch (err) {
        responseData.ownerStats = { error: err.message };
      }
    }

    res.json(responseData);
  } catch (err) {
    res.json({
      online: false,
      pendingCount: 0,
      totalCount: 0,
      error: err.message,
    });
  }
});

module.exports = router;

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../lib/api';
import {
  SystemStats,
  ServerNode,
  Service,
  SpeedtestResult,
  WireguardStatus,
  PiholeStats,
  QbittorrentStats,
  JellyfinStats,
  JellyseerrStats,
} from '../../types';
import {
  getUserPreferences,
  syncUserPreferencesFromBackend,
  UserPreferences,
} from '../../lib/userPreferences';

export function useDashboardData() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'board';

  const [stats, setStats] = useState<SystemStats | null>(null);
  const [nodes, setNodes] = useState<ServerNode[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [speedtest, setSpeedtest] = useState<SpeedtestResult | null>(null);
  const [runningSpeedtest, setRunningSpeedtest] = useState<boolean>(false);
  const [unread, setUnread] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingNodes, setLoadingNodes] = useState<boolean>(true);
  const [adminMenuOpen, setAdminMenuOpen] = useState<boolean>(false);
  const [prefs, setPrefs] = useState<UserPreferences>(() => getUserPreferences(user?.id));

  const [wgStats, setWgStats] = useState<WireguardStatus | null>(null);
  const [piholeStats, setPiholeStats] = useState<PiholeStats | null>(null);
  const [qbitStats, setQbitStats] = useState<QbittorrentStats | null>(null);
  const [jellyfinStats, setJellyfinStats] = useState<JellyfinStats | null>(null);
  const [jellyseerrStats, setJellyseerrStats] = useState<JellyseerrStats | null>(null);
  const [vpnStatus, setVpnStatus] = useState<{ connected: boolean; ip: string; isVpn?: boolean; isLan?: boolean } | null>(null);
  const [activeInspector, setActiveInspector] = useState<'wireguard' | 'pihole' | 'qbittorrent' | 'jellyfin' | 'jellyseerr' | null>(null);

  useEffect(() => {
    const onPrefsChange = () => setPrefs(getUserPreferences(user?.id));
    window.addEventListener('mymanager_prefs_changed', onPrefsChange);
    return () => window.removeEventListener('mymanager_prefs_changed', onPrefsChange);
  }, [user?.id]);

  const loadAll = () => {
    // Load VPN / LAN network connectivity status
    api.get<{ connected: boolean; ip: string; isVpn?: boolean; isLan?: boolean }>('/vpn-status')
      .then(res => setVpnStatus(res))
      .catch(() => setVpnStatus({ connected: false, ip: '' }));

    // Load services from /services/mine
    api.get<Service[]>('/services/mine')
      .then(res => {
        setServices(current => {
          return res.map(newS => {
            const existing = current.find(c => c.id === newS.id);
            return existing
              ? { ...newS, liveStat: existing.liveStat, telemetryType: existing.telemetryType }
              : newS;
          });
        });
        const statRequests: Promise<any>[] = [
          api.get<any>('/qbittorrent/stats').catch(() => null),
          api.get<any>('/jellyfin/stats').catch(() => null),
          api.get<any>('/jellyseerr/stats').catch(() => null),
        ];

        if (user?.role === 'owner') {
          statRequests.push(api.get<any>('/admin/wireguard/status').catch(() => null));
          statRequests.push(api.get<any>('/admin/pihole/stats').catch(() => null));
        }

        Promise.allSettled(statRequests).then((results) => {
          const qRes = results[0]?.status === 'fulfilled' ? results[0].value : null;
          const jRes = results[1]?.status === 'fulfilled' ? results[1].value : null;
          const sRes = results[2]?.status === 'fulfilled' ? results[2].value : null;
          const wgRes = results[3]?.status === 'fulfilled' ? results[3].value : null;
          const piRes = results[4]?.status === 'fulfilled' ? results[4].value : null;

          if (qRes) setQbitStats(qRes);
          if (jRes) setJellyfinStats(jRes);
          if (sRes) setJellyseerrStats(sRes);
          if (wgRes) setWgStats(wgRes);
          if (piRes) setPiholeStats(piRes);

          const qbit = qRes?.online ? qRes : null;
          const jellyfin = jRes?.online ? jRes : null;
          const jellyseerr = sRes?.online ? sRes : null;
          const wireguard = wgRes?.online ? wgRes : null;
          const pihole = piRes?.online ? piRes : null;

          setServices(currentServices => currentServices.map(s => {
            const title = s.title.toLowerCase();
            let statText: string | undefined = undefined;
            let telemetryType: 'wireguard' | 'pihole' | 'qbittorrent' | 'jellyfin' | 'jellyseerr' | undefined = undefined;

            if (title.includes('qbit')) {
              telemetryType = 'qbittorrent';
              if (qbit) {
                const mb = (qbit.downloadSpeed / (1024 * 1024)).toFixed(1);
                statText = `↓ ${mb} MB/s · ${qbit.activeCount} active`;
              } else if (qRes?.online === false) {
                statText = 'Offline';
              }
            } else if (title.includes('jellyfin')) {
              telemetryType = 'jellyfin';
              if (jellyfin) {
                const streams = jellyfin.activeStreamCount;
                statText = `${streams} stream${streams === 1 ? '' : 's'} active`;
              } else if (jRes?.online === false) {
                statText = 'Offline';
              }
            } else if (title.includes('jellyseerr')) {
              telemetryType = 'jellyseerr';
              if (jellyseerr) {
                const pending = jellyseerr.pendingCount;
                statText = `${pending} pending request${pending === 1 ? '' : 's'}`;
              } else if (sRes?.online === false) {
                statText = 'Offline';
              }
            } else if (title.includes('wireguard')) {
              telemetryType = 'wireguard';
              if (wireguard) {
                const peers = wireguard.connectedPeers ?? wireguard.activePeers ?? (wireguard.peers?.filter((p: any) => p.connected)?.length ?? 0);
                statText = `${peers} active peer${peers === 1 ? '' : 's'}`;
              } else if (wgRes?.online === false) {
                statText = 'Offline';
              }
            } else if (title.includes('pi-hole') || title.includes('pihole')) {
              telemetryType = 'pihole';
              if (pihole) {
                const queries = pihole.queriesToday?.toLocaleString?.() ?? pihole.queriesToday ?? 0;
                const pct = Number(pihole.percentBlocked ?? 0).toFixed(1);
                statText = `${queries} queries · ${pct}% blocked`;
              } else if (piRes?.online === false) {
                statText = 'Offline';
              }
            }

            const nextStat = statText !== undefined ? statText : s.liveStat;
            const nextTelemetry = telemetryType || s.telemetryType;
            if (s.liveStat === nextStat && s.telemetryType === nextTelemetry) {
              return s;
            }
            return {
              ...s,
              liveStat: nextStat,
              telemetryType: nextTelemetry,
            };
          }));
        });
      })
      .catch(() => {});

    // Load nodes telemetry
    api.get<ServerNode[]>('/system/nodes')
      .then(res => {
        setNodes(res);
      })
      .catch(() => {})
      .finally(() => setLoadingNodes(false));

    // Load speedtest latest
    api.get<SpeedtestResult>('/speedtest/latest')
      .then(res => setSpeedtest(res))
      .catch(() => {});

    // Load stats & unread (owner only)
    if (user?.role === 'owner') {
      Promise.all([
        api.get<SystemStats>('/system/stats').catch(() => null),
        api.get<{ count: number }>('/messages/unread-count').catch(() => ({ count: 0 })),
      ]).then(([s, u]) => {
        if (s) setStats(s);
        if (u) setUnread(u.count);
      }).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  };

  const handleRunSpeedtest = async () => {
    setRunningSpeedtest(true);
    const pollTimer = setInterval(async () => {
      try {
        const latest = await api.get<SpeedtestResult>('/speedtest/latest');
        setSpeedtest(latest);
      } catch {}
    }, 800);

    try {
      const res = await api.post<SpeedtestResult>('/speedtest/run', {});
      setSpeedtest(res);
    } catch {
      try {
        const fallback = await api.post<SpeedtestResult>('/admin/speedtest/run', {});
        setSpeedtest(fallback);
      } catch {}
    } finally {
      clearInterval(pollTimer);
      api.get<SpeedtestResult>('/speedtest/latest').then(setSpeedtest).catch(() => {});
      setRunningSpeedtest(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      syncUserPreferencesFromBackend(user.id);
    }
    loadAll();

    // Fast polling for cluster telemetry & network node metrics (every 2.5 seconds)
    const telemetryInterval = setInterval(() => {
      api.get<ServerNode[]>('/system/nodes')
        .then(res => setNodes(res))
        .catch(() => {});
      if (user?.role === 'owner') {
        api.get<SystemStats>('/system/stats')
          .then(res => { if (res) setStats(res); })
          .catch(() => {});
      }
    }, 2500);

    // General dashboard refresh
    const interval = setInterval(loadAll, 6000);

    return () => {
      clearInterval(telemetryInterval);
      clearInterval(interval);
    };
  }, [user?.id]);

  const selectTab = (nextTab: string) => {
    setSearchParams({ tab: nextTab });
    setAdminMenuOpen(false);
  };

  const handleUpdateCardLayout = async (
    updates: Array<{ id: number; start_col: number; start_row: number; col_span: number; row_span: number }>
  ) => {
    if (!updates || updates.length === 0) return;

    setServices((prev) =>
      prev.map((s) => {
        const update = updates.find((u) => u.id === s.id);
        if (update) {
          return {
            ...s,
            start_col: update.start_col,
            start_row: update.start_row,
            col_span: update.col_span,
            row_span: update.row_span,
          };
        }
        return s;
      })
    );

    try {
      await api.patch('/services/mine', {
        preferences: updates.map((u) => ({
          service_id: u.id,
          start_col: u.start_col,
          start_row: u.start_row,
          col_span: u.col_span,
          row_span: u.row_span,
          enabled: true,
        })),
      });
    } catch (e) {
      console.error('Failed to persist card layout', e);
    }
  };

  const handleMoveCardCategory = async (
    serviceId: number,
    fromCategory: string,
    toCategory: string
  ) => {
    if (!toCategory || fromCategory === toCategory) return;

    setServices((prev) =>
      prev.map((s) => (s.id === serviceId ? { ...s, category: toCategory } : s))
    );

    const currentService = services.find((s) => s.id === serviceId);
    if (currentService) {
      try {
        await api.put(`/services/${serviceId}`, {
          ...currentService,
          category: toCategory,
        });
      } catch (e) {
        console.error('Failed to move service category', e);
        loadAll();
      }
    }
  };

  return {
    user,
    tab,
    stats,
    nodes,
    services,
    speedtest,
    runningSpeedtest,
    unread,
    loading,
    loadingNodes,
    adminMenuOpen,
    setAdminMenuOpen,
    prefs,
    wgStats,
    piholeStats,
    qbitStats,
    jellyfinStats,
    jellyseerrStats,
    vpnStatus,
    activeInspector,
    setActiveInspector,
    loadAll,
    handleRunSpeedtest,
    selectTab,
    handleUpdateCardLayout,
    handleMoveCardCategory,
  };
}

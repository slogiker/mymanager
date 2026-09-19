import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  BarChart3,
  Inbox,
  Code2,
  Wrench,
  Users as UsersIcon,
  ShieldCheck,
  ShieldAlert,
  Sliders,
  LayoutGrid,
  SlidersHorizontal,
  ChevronDown,
  Terminal as TermIcon,
  Folder,
  User as UserIcon,
} from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';
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
} from '../types';
import {
  getUserPreferences,
  syncUserPreferencesFromBackend,
  UserPreferences,
} from '../lib/userPreferences';
import { WireguardInspectorModal } from '../components/dashboard/WireguardInspectorModal';
import { PiholeInspectorModal } from '../components/dashboard/PiholeInspectorModal';
import { QbittorrentInspectorModal } from '../components/dashboard/QbittorrentInspectorModal';
import { JellyfinInspectorModal } from '../components/dashboard/JellyfinInspectorModal';
import { JellyseerrInspectorModal } from '../components/dashboard/JellyseerrInspectorModal';
import { HomelabBoard } from '../components/dashboard/homelab';
import {
  AnalyticsTab,
  MessagesTab,
  ProjectsTab,
  SkillsTab,
  UsersTab,
} from '../components/dashboard/tabs';

/* -------------------------------------------------------------
   Admin Views Configuration
------------------------------------------------------------- */
const ADMIN_VIEWS = [
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'messages', label: 'Messages', icon: Inbox },
  { id: 'projects', label: 'Projects', icon: Code2 },
  { id: 'skills', label: 'Skills', icon: Wrench },
  { id: 'users', label: 'User Accounts', icon: UsersIcon },
  { id: 'permissions', label: 'Service Permissions', icon: ShieldCheck },
  { id: 'features', label: 'Feature Flags', icon: Sliders },
];

/* -------------------------------------------------------------
   Main Homelab Free-Play Dashboard Page (Coordinator)
------------------------------------------------------------- */
export default function DashboardPage() {
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

    // Load services from /services/mine (Phase 3 & 5 backend persistence + permissions)
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
                statText = `${queries} queries · ${pihole.percentBlocked ?? 0}% blocked`;
              } else if (piRes?.online === false) {
                statText = 'Offline';
              }
            } else if (title.includes('nextcloud')) {
              statText = 'Media Pool: 8.7 TB free';
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
        const ncNode = res?.find(n => n.id.includes('41') || n.name.toLowerCase().includes('nextcloud'));
        if (ncNode?.disk?.free) {
          setServices(currentServices => currentServices.map(s => {
            if (s.title.toLowerCase().includes('nextcloud')) {
              const stat = `Media Pool: ${ncNode.disk?.free} free`;
              if (s.liveStat === stat) return s;
              return { ...s, liveStat: stat };
            }
            return s;
          }));
        }
      })
      .catch(() => {})
      .finally(() => setLoadingNodes(false));

    // Load speedtest latest
    api.get<SpeedtestResult>('/speedtest/latest')
      .then(res => setSpeedtest(res))
      .catch(() => {});

    // Load stats & unread
    Promise.all([
      api.get<SystemStats>('/system/stats').catch(() => null),
      api.get<{ count: number }>('/messages/unread-count').catch(() => ({ count: 0 })),
    ]).then(([s, u]) => {
      if (s) setStats(s);
      if (u) setUnread(u.count);
    }).finally(() => setLoading(false));
  };

  const handleRunSpeedtest = async () => {
    setRunningSpeedtest(true);
    try {
      const res = await api.post<SpeedtestResult>('/admin/speedtest/run', {});
      setSpeedtest(res);
    } catch {
    } finally {
      setRunningSpeedtest(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      syncUserPreferencesFromBackend(user.id);
    }
    loadAll();
    const interval = setInterval(loadAll, 10000);
    return () => clearInterval(interval);
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

  return (
    <div className="min-h-screen bg-[#111216] text-slate-200">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        {/* Navigation & View Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <button
              onClick={() => selectTab('board')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                tab === 'board'
                  ? 'bg-red-600 text-white shadow-[0_0_20px_-4px_rgba(239,68,68,0.5)]'
                  : 'bg-[#16181f] text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span>Homelab Board</span>
            </button>

            {user?.role === 'owner' && (
              <div className="relative">
                <button
                  onClick={() => setAdminMenuOpen(v => !v)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                    tab !== 'board'
                      ? 'bg-slate-800 text-red-400 border-red-500/40'
                      : 'bg-[#16181f] text-slate-400 hover:text-slate-200 border-slate-800'
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-red-500" />
                  <span>{tab !== 'board' ? `Manage: ${tab.charAt(0).toUpperCase() + tab.slice(1)}` : 'Management Hub'}</span>
                  {unread > 0 && (
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  )}
                  <ChevronDown className="w-3 h-3 text-slate-500 ml-0.5" />
                </button>

                {adminMenuOpen && (
                  <div className="absolute left-0 mt-2 w-52 rounded-2xl border border-slate-800 bg-[#16181f] p-2 shadow-2xl z-50">
                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-800/80 mb-1">
                      Admin Management
                    </div>
                    {ADMIN_VIEWS.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => selectTab(v.id)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-left transition-colors ${
                          tab === v.id ? 'bg-red-500/10 text-red-400 font-bold' : 'text-slate-300 hover:bg-slate-800/80'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <v.icon className="w-3.5 h-3.5" />
                          <span>{v.label}</span>
                        </div>
                        {v.id === 'messages' && unread > 0 && (
                          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-red-600 text-white font-mono">
                            {unread}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick Hub Tools */}
          <div className="flex items-center gap-2 text-xs font-mono">
            {/* VPN / Network Status Badge */}
            {vpnStatus && (
              <div
                className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono transition-colors ${
                  vpnStatus.connected
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                }`}
                title={
                  vpnStatus.connected
                    ? `Connected to Homelab (${vpnStatus.isVpn ? 'WireGuard VPN' : 'Home LAN'} · ${vpnStatus.ip})`
                    : `External Connection (${vpnStatus.ip}) — Local .home.arpa services locked`
                }
              >
                {vpnStatus.connected ? (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{vpnStatus.isVpn ? 'VPN Active' : 'LAN Active'}</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                    <span>External (No VPN)</span>
                  </>
                )}
              </div>
            )}

            {tab !== 'board' && (
              <button
                onClick={() => selectTab('board')}
                className="px-3 py-1.5 rounded-xl border border-slate-800 bg-white/[0.02] text-slate-400 hover:text-white transition-colors"
              >
                ← Back to Board
              </button>
            )}
            <Link
              to="/terminal"
              className="p-2 text-slate-400 hover:text-white rounded-xl bg-[#16181f] border border-slate-800 transition-colors"
              title="SSH Web Terminal"
            >
              <TermIcon className="w-4 h-4" />
            </Link>
            <Link
              to="/files"
              className="p-2 text-slate-400 hover:text-white rounded-xl bg-[#16181f] border border-slate-800 transition-colors"
              title="File Browser"
            >
              <Folder className="w-4 h-4" />
            </Link>
            <Link
              to="/profile"
              className="p-2 text-slate-400 hover:text-white rounded-xl bg-[#16181f] border border-slate-800 transition-colors"
              title="User Account & Visibility Settings"
            >
              <UserIcon className="w-4 h-4 text-red-400" />
            </Link>
          </div>
        </div>

        {/* Board View */}
        {tab === 'board' && (
          <HomelabBoard
            services={services}
            nodes={nodes}
            loadingNodes={loadingNodes}
            speedtest={speedtest}
            vpnConnected={vpnStatus?.connected}
            onRunSpeedtest={handleRunSpeedtest}
            isRunningSpeedtest={runningSpeedtest}
            onUpdateCardLayout={handleUpdateCardLayout}
            onOpenInspector={(type) => setActiveInspector(type)}
            onRefresh={loadAll}
          />
        )}

        {/* Telemetry Inspector Modals (Phase 6) */}
        <WireguardInspectorModal
          open={activeInspector === 'wireguard'}
          onClose={() => setActiveInspector(null)}
          data={wgStats}
          loading={loading}
          onRefresh={loadAll}
        />

        <PiholeInspectorModal
          open={activeInspector === 'pihole'}
          onClose={() => setActiveInspector(null)}
          data={piholeStats}
          loading={loading}
          onRefresh={loadAll}
        />

        <QbittorrentInspectorModal
          open={activeInspector === 'qbittorrent'}
          onClose={() => setActiveInspector(null)}
          data={qbitStats}
          loading={loading}
          onRefresh={loadAll}
        />

        <JellyfinInspectorModal
          open={activeInspector === 'jellyfin'}
          onClose={() => setActiveInspector(null)}
          data={jellyfinStats}
          isOwner={user?.role === 'owner'}
          loading={loading}
          onRefresh={loadAll}
        />

        <JellyseerrInspectorModal
          open={activeInspector === 'jellyseerr'}
          onClose={() => setActiveInspector(null)}
          data={jellyseerrStats}
          isOwner={user?.role === 'owner'}
          loading={loading}
          onRefresh={loadAll}
        />

        {/* Secondary Management Views */}
        {tab === 'analytics' && <AnalyticsTab />}
        {tab === 'messages' && <MessagesTab />}
        {tab === 'projects' && <ProjectsTab />}
        {tab === 'skills' && <SkillsTab />}
        {(tab === 'users' || tab === 'permissions' || tab === 'features') && (
          <UsersTab defaultSubTab={tab === 'permissions' ? 'permissions' : tab === 'features' ? 'features' : 'accounts'} />
        )}
      </main>
    </div>
  );
}

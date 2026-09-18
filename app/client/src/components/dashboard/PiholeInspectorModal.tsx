import React from 'react';
import {
  ShieldAlert,
  RefreshCw,
  ExternalLink,
  Activity,
  Globe,
  Users,
  CheckCircle2,
  XCircle,
  BarChart2,
} from 'lucide-react';
import { PiholeStats } from '../../types';

interface PiholeInspectorModalProps {
  open: boolean;
  onClose: () => void;
  data: PiholeStats | null;
  loading?: boolean;
  onRefresh?: () => void;
}

export function PiholeInspectorModal({
  open,
  onClose,
  data,
  loading = false,
  onRefresh,
}: PiholeInspectorModalProps) {
  if (!open) return null;

  const queries = data?.queriesToday?.toLocaleString?.() ?? (data?.queriesToday ?? 0);
  const blocked = data?.blockedToday?.toLocaleString?.() ?? (data?.blockedToday ?? 0);
  const percentBlocked = typeof data?.percentBlocked === 'number' ? data.percentBlocked.toFixed(1) : '0.0';
  const domains = data?.domainsBlocked?.toLocaleString?.() ?? (data?.domainsBlocked ?? 0);
  const clients = data?.uniqueClients ?? 0;
  const isBlocking = data?.status === 'enabled' || data?.status === 'blocking' || data?.online;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl max-h-[88vh] flex flex-col rounded-2xl border border-slate-700/70 bg-[#14161f] shadow-2xl text-slate-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-[#181a24]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold tracking-tight text-white">Pi-hole DNS Telemetry</h3>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider border ${
                    data?.online
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      data?.online ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                    }`}
                  />
                  {data?.online ? 'Active' : 'Offline'}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                pihole.home.arpa · Version {data?.version || 'v5/v6'} · Status: {data?.status || 'Active'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={loading}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
                title="Refresh Stats"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-red-400' : ''}`} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white text-xl leading-none px-2 py-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Main Block Rate Progress Bar */}
          <div className="p-4 rounded-xl bg-[#1a1d29]/90 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <BarChart2 className="w-4 h-4 text-red-400" />
                <span>Ad Block Rate Today</span>
              </span>
              <span className="font-mono text-lg font-bold text-red-400">{percentBlocked}%</span>
            </div>
            {/* Visual Gauge Bar */}
            <div className="w-full h-3 bg-slate-800/80 rounded-full overflow-hidden p-0.5">
              <div
                className="h-full bg-gradient-to-r from-red-600 to-red-400 rounded-full transition-all duration-500 shadow-[0_0_12px_rgba(239,68,68,0.5)]"
                style={{ width: `${Math.min(100, Math.max(0, Number(percentBlocked)))}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-1">
              <span>{blocked} Ads Filtered</span>
              <span>{queries} Total Queries</span>
            </div>
          </div>

          {/* Grid Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-[#1a1d29]/80 border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Total Queries
                </span>
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <div className="mt-2">
                <span className="text-xl font-bold font-mono text-white">{queries}</span>
                <span className="text-[10px] text-slate-500 block font-mono">queries in last 24h</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#1a1d29]/80 border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Queries Blocked
                </span>
                <XCircle className="w-3.5 h-3.5 text-red-400" />
              </div>
              <div className="mt-2">
                <span className="text-xl font-bold font-mono text-red-400">{blocked}</span>
                <span className="text-[10px] text-slate-500 block font-mono">threats & ad requests</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#1a1d29]/80 border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Domains on Blocklist
                </span>
                <Globe className="w-3.5 h-3.5 text-purple-400" />
              </div>
              <div className="mt-2">
                <span className="text-xl font-bold font-mono text-purple-400">{domains}</span>
                <span className="text-[10px] text-slate-500 block font-mono">gravity list rules</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#1a1d29]/80 border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Active Clients
                </span>
                <Users className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="mt-2">
                <span className="text-xl font-bold font-mono text-emerald-400">{clients}</span>
                <span className="text-[10px] text-slate-500 block font-mono">active network devices</span>
              </div>
            </div>
          </div>

          {/* DNS Protection Status Card */}
          <div className="p-3.5 rounded-xl bg-[#161822] border border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              {isBlocking ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <div>
                <div className="font-semibold text-slate-200">
                  {isBlocking ? 'DNS Ad-Blocking Active' : 'Blocking Paused or Offline'}
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  Primary DNS resolver on CM4 node (192.168.1.112:8081)
                </div>
              </div>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold ${
                isBlocking ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400'
              }`}
            >
              {data?.status || 'Online'}
            </span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-800 bg-[#161822] text-xs">
          <button
            type="button"
            onClick={() => window.open('http://pihole.home.arpa', '_blank', 'noopener,noreferrer')}
            className="flex items-center gap-1.5 text-slate-300 hover:text-white text-xs font-semibold transition-colors"
          >
            <span>Open Pi-hole Admin Console</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { ShieldCheck, ShieldAlert, Activity, Users, Globe, ExternalLink } from 'lucide-react';
import { PiholeStats } from '../../../types';

export interface PiholeWidgetProps {
  data: PiholeStats | null;
  onOpenInspector?: () => void;
  colSpan?: number;
  rowSpan?: number;
}

export function PiholeWidget({
  data,
  onOpenInspector,
  colSpan = 2,
  rowSpan = 1,
}: PiholeWidgetProps) {
  const isOnline = Boolean(data?.online);
  const isBlocking = data?.status === 'enabled' || data?.status === 'blocking' || isOnline;

  const queries = data?.queriesToday?.toLocaleString?.() ?? (data?.queriesToday ?? 0);
  const blocked = data?.blockedToday?.toLocaleString?.() ?? (data?.blockedToday ?? 0);
  const percentBlocked =
    typeof data?.percentBlocked === 'number'
      ? data.percentBlocked.toFixed(1)
      : '0.0';
  const pctNum = typeof data?.percentBlocked === 'number' ? Math.min(100, Math.max(0, data.percentBlocked)) : 0;
  const domains = data?.domainsBlocked?.toLocaleString?.() ?? (data?.domainsBlocked ?? 0);
  const clients = data?.uniqueClients ?? 0;

  const isCompact = colSpan === 1 && rowSpan === 1;
  const isExpandedTall = rowSpan >= 2;
  const isExpandedWide = colSpan >= 3;

  // 1x1 Compact Mode
  if (isCompact) {
    return (
      <div
        onClick={onOpenInspector}
        className="flex flex-col justify-between h-full p-2.5 cursor-pointer hover:bg-white/[0.02] transition-colors"
        title="Pi-hole DNS - Click to inspect"
      >
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="p-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 shrink-0">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] font-bold text-slate-200 truncate">DNS</span>
          </div>
          <span
            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
              isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
            }`}
          />
        </div>

        <div className="flex items-center justify-between text-[10px] font-mono">
          <span className="text-slate-400">{queries} q</span>
          <span className="text-emerald-400 font-bold">{percentBlocked}%</span>
        </div>
      </div>
    );
  }

  // 4x2 Wide Hero Mode
  if (isExpandedWide && isExpandedTall) {
    return (
      <div className="flex flex-col justify-between h-full p-3.5 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Pi-hole DNS Guard
                </span>
                <span
                  className={`inline-flex items-center gap-1 text-[9px] font-mono px-2 py-0.5 rounded-full border ${
                    isOnline
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                    }`}
                  />
                  {isOnline ? (isBlocking ? 'Blocking' : 'Online') : 'Offline'}
                </span>
              </div>
              <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                Gravity List: {domains} domains blocked
              </div>
            </div>
          </div>

          {onOpenInspector && (
            <button
              type="button"
              data-no-drag="true"
              onClick={onOpenInspector}
              className="p-1.5 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-mono transition-colors flex items-center gap-1"
              title="Open Pi-hole telemetry inspector"
            >
              <ExternalLink className="w-3.5 h-3.5 text-rose-400" />
              <span className="text-[10px]">Inspector</span>
            </button>
          )}
        </div>

        {/* 4-Stat Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 flex-1 items-center">
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/70 space-y-1">
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
              <span className="flex items-center gap-1">
                <Activity className="w-3 h-3 text-sky-400" /> Total Queries
              </span>
            </div>
            <div className="text-base font-bold font-mono text-white tracking-tight">{queries}</div>
            <div className="text-[9px] font-mono text-slate-500">Processed today</div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/70 space-y-1">
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
              <span className="flex items-center gap-1">
                <ShieldAlert className="w-3 h-3 text-rose-400" /> Blocked Ads
              </span>
            </div>
            <div className="text-base font-bold font-mono text-rose-400 tracking-tight">{blocked}</div>
            <div className="text-[9px] font-mono text-slate-500">Threats & trackers</div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/70 space-y-1">
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
              <span>Block Ratio</span>
              <span className="text-emerald-400 font-bold">{percentBlocked}%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all"
                style={{ width: `${pctNum}%` }}
              />
            </div>
            <div className="text-[9px] font-mono text-slate-500">Percent filtered</div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/70 space-y-1">
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3 text-amber-400" /> Clients
              </span>
            </div>
            <div className="text-base font-bold font-mono text-amber-300 tracking-tight">{clients}</div>
            <div className="text-[9px] font-mono text-slate-500">Active LAN nodes</div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-800/50 flex items-center justify-between text-[10px] font-mono text-slate-500">
          <span>DNS Sinkhole: Active</span>
          <span>pihole.home.arpa</span>
        </div>
      </div>
    );
  }

  // 2x2 Double Height Mode
  if (isExpandedTall) {
    return (
      <div className="flex flex-col justify-between h-full p-3 space-y-2">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 shrink-0">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-xs text-slate-100 truncate flex items-center gap-1.5">
                <span>Pi-hole DNS</span>
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                  }`}
                />
              </div>
              <span className="text-[10px] font-mono text-slate-500 truncate block">
                {domains} blocked domains
              </span>
            </div>
          </div>

          {onOpenInspector && (
            <button
              type="button"
              data-no-drag="true"
              onClick={onOpenInspector}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Inspect Pi-hole"
            >
              <ExternalLink className="w-3 h-3 text-rose-400" />
            </button>
          )}
        </div>

        {/* Middle Stats */}
        <div className="space-y-1.5 flex-1 justify-center flex flex-col">
          <div className="space-y-0.5">
            <div className="flex items-center justify-between text-[9px] font-mono text-slate-400">
              <span>Block Ratio</span>
              <span className="text-emerald-400 font-bold">{percentBlocked}%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all"
                style={{ width: `${pctNum}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5 pt-1">
            <div className="p-1.5 rounded-lg bg-slate-900/60 border border-slate-800/60">
              <div className="text-[9px] font-mono text-slate-500">Queries</div>
              <div className="text-xs font-mono font-bold text-slate-200">{queries}</div>
            </div>
            <div className="p-1.5 rounded-lg bg-slate-900/60 border border-slate-800/60">
              <div className="text-[9px] font-mono text-slate-500">Blocked</div>
              <div className="text-xs font-mono font-bold text-rose-400">{blocked}</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-1.5 border-t border-slate-800/40 flex items-center justify-between text-[10px] font-mono text-slate-400">
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3 text-slate-500" /> {clients} clients
          </span>
          <span className="text-emerald-400 font-semibold">{percentBlocked}% blocked</span>
        </div>
      </div>
    );
  }

  // 2x1 Standard Flat Card
  return (
    <div className="flex flex-col justify-between h-full p-2.5 space-y-1">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 pr-1">
          <div className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 shrink-0">
            <ShieldCheck className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-xs text-slate-100 group-hover:text-rose-400 transition-colors truncate flex items-center gap-1.5">
              <span>Pi-hole DNS</span>
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                }`}
              />
            </div>
            <span className="text-[10px] font-mono text-slate-500 truncate block">
              {clients} clients active
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            {percentBlocked}%
          </span>
          {onOpenInspector && (
            <button
              type="button"
              data-no-drag="true"
              onClick={onOpenInspector}
              className="p-1 text-slate-500 hover:text-white rounded hover:bg-slate-800 transition-colors"
              title="Inspect Pi-hole DNS"
            >
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      <div className="pt-1 border-t border-slate-800/40 flex items-center justify-between text-[10px] font-mono">
        <div className="flex items-center gap-2 text-slate-300 truncate">
          <span className="text-slate-400">Queries: <span className="text-white font-semibold">{queries}</span></span>
        </div>

        <div className="flex items-center gap-1 text-rose-400 shrink-0 font-semibold">
          <span>Blocked: {blocked}</span>
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { Clapperboard, Film, Clock, CheckCircle2, User, ExternalLink } from 'lucide-react';
import { JellyseerrStats } from '../../../types';

export interface JellyseerrWidgetProps {
  data: JellyseerrStats | null;
  onOpenInspector?: () => void;
  colSpan?: number;
  rowSpan?: number;
}

export function JellyseerrWidget({
  data,
  onOpenInspector,
  colSpan = 2,
  rowSpan = 1,
}: JellyseerrWidgetProps) {
  const isOnline = Boolean(data?.online);
  const pending = data?.pendingCount ?? 0;
  const total = data?.totalCount ?? 0;
  const movies = data?.movieCount ?? 0;
  const tvShows = data?.tvCount ?? 0;
  const recent = data?.ownerStats?.recentRequests || [];
  const latest = recent[0];

  const isCompact = colSpan === 1 && rowSpan === 1;
  const isExpandedTall = rowSpan >= 2;
  const isExpandedWide = colSpan >= 3;

  // 1x1 Compact Mode
  if (isCompact) {
    return (
      <div
        onClick={onOpenInspector}
        className="flex flex-col justify-between h-full p-2.5 cursor-pointer hover:bg-white/[0.02] transition-colors"
        title="Jellyseerr - Click to inspect requests"
      >
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="p-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shrink-0">
              <Clapperboard className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] font-bold text-slate-200 truncate">Requests</span>
          </div>
          <span
            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
              isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
            }`}
          />
        </div>

        <div className="flex items-center justify-between text-[10px] font-mono">
          <span className="text-slate-400">{total} tot</span>
          <span className={`font-bold ${pending > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {pending > 0 ? `${pending} pend` : 'Clear'}
          </span>
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
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Clapperboard className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Jellyseerr Media Requests
                </span>
                <span
                  className={`inline-flex items-center gap-1 text-[9px] font-mono px-2 py-0.5 rounded-full border ${
                    pending > 0
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                    }`}
                  />
                  {pending > 0 ? `${pending} Pending Approval` : 'All Requests Clear'}
                </span>
              </div>
              <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                {total} total requests managed · {movies} Movies · {tvShows} TV Series
              </div>
            </div>
          </div>

          {onOpenInspector && (
            <button
              type="button"
              data-no-drag="true"
              onClick={onOpenInspector}
              className="p-1.5 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-mono transition-colors flex items-center gap-1"
              title="Open Jellyseerr media request inspector"
            >
              <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-[10px]">Inspector</span>
            </button>
          )}
        </div>

        {/* Requests List Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 flex-1 items-center">
          {recent.length > 0 ? (
            recent.slice(0, 2).map((req) => (
              <div
                key={req.id}
                className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/70 space-y-1.5"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-white truncate flex items-center gap-1.5">
                    <Film className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span className="truncate">{req.title}</span>
                  </span>
                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.5 rounded border shrink-0 ${
                      req.status === 1
                        ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    }`}
                  >
                    {req.status === 1 ? 'Pending' : 'Approved'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span className="flex items-center gap-1 truncate">
                    <User className="w-3 h-3 text-slate-500" /> {req.requestedBy}
                  </span>
                  <span className="text-[9px] text-slate-500 uppercase">{req.type}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-2 p-4 text-center rounded-xl bg-slate-900/40 border border-slate-800/40 text-xs font-mono text-slate-500">
              No recent media requests in queue
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-800/50 flex items-center justify-between text-[10px] font-mono text-slate-500">
          <span>Jellyseerr Service: {isOnline ? 'Online' : 'Offline'}</span>
          <span>{pending > 0 ? `${pending} pending request${pending === 1 ? '' : 's'}` : 'Up to date'}</span>
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
            <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shrink-0">
              <Clapperboard className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-xs text-slate-100 truncate flex items-center gap-1.5">
                <span>Jellyseerr</span>
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                  }`}
                />
              </div>
              <span className="text-[10px] font-mono text-slate-500 truncate block">
                {pending} pending of {total} total
              </span>
            </div>
          </div>

          {onOpenInspector && (
            <button
              type="button"
              data-no-drag="true"
              onClick={onOpenInspector}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Inspect Jellyseerr"
            >
              <ExternalLink className="w-3 h-3 text-cyan-400" />
            </button>
          )}
        </div>

        {/* Middle Stats */}
        <div className="space-y-1.5 flex-1 justify-center flex flex-col">
          {latest ? (
            <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800/60 space-y-1">
              <div className="text-[11px] font-bold text-white truncate flex items-center gap-1.5">
                <Film className="w-3 h-3 text-cyan-400 shrink-0" />
                <span className="truncate">{latest.title}</span>
              </div>
              <div className="flex items-center justify-between text-[9px] font-mono text-slate-400">
                <span>By: {latest.requestedBy}</span>
                <span className={latest.status === 1 ? 'text-amber-400' : 'text-emerald-400'}>
                  {latest.status === 1 ? 'Pending' : 'Approved'}
                </span>
              </div>
            </div>
          ) : (
            <div className="p-3 text-center rounded-lg bg-slate-900/40 border border-slate-800/40 text-[11px] font-mono text-slate-500">
              No pending requests
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-1.5 border-t border-slate-800/40 flex items-center justify-between text-[10px] font-mono text-slate-400">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-cyan-400" /> Total: {total}
          </span>
          <span className={pending > 0 ? 'text-amber-400 font-semibold' : 'text-emerald-400'}>
            {pending > 0 ? `${pending} pending` : 'All clear'}
          </span>
        </div>
      </div>
    );
  }

  // 2x1 Standard Flat Card
  return (
    <div className="flex flex-col justify-between h-full p-2.5 space-y-1">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 pr-1">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shrink-0">
            <Clapperboard className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-xs text-slate-100 group-hover:text-cyan-400 transition-colors truncate flex items-center gap-1.5">
              <span>Jellyseerr</span>
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                }`}
              />
            </div>
            <span className="text-[10px] font-mono text-slate-500 truncate block">
              {latest ? `Latest: ${latest.title}` : `${total} total requests`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full border ${
              pending > 0
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
            }`}
          >
            {pending > 0 ? `${pending} pending` : 'All clear'}
          </span>
          {onOpenInspector && (
            <button
              type="button"
              data-no-drag="true"
              onClick={onOpenInspector}
              className="p-1 text-slate-500 hover:text-white rounded hover:bg-slate-800 transition-colors"
              title="Inspect Jellyseerr requests"
            >
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      <div className="pt-1 border-t border-slate-800/40 flex items-center justify-between text-[10px] font-mono">
        <div className="flex items-center gap-2 text-slate-300 truncate">
          <span className="text-slate-400">Total: <span className="text-white font-semibold">{total}</span></span>
        </div>

        <div className="flex items-center gap-1 text-cyan-400 shrink-0 font-semibold">
          <span>{isOnline ? (pending > 0 ? `${pending} new` : 'Synchronized') : 'Offline'}</span>
        </div>
      </div>
    </div>
  );
}

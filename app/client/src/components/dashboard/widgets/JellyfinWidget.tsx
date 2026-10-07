import React from 'react';
import { Tv, Play, Film, User, Monitor, ExternalLink, Activity } from 'lucide-react';
import { JellyfinStats } from '../../../types';

export interface JellyfinWidgetProps {
  data: JellyfinStats | null;
  onOpenInspector?: () => void;
  colSpan?: number;
  rowSpan?: number;
}

export function JellyfinWidget({
  data,
  onOpenInspector,
  colSpan = 2,
  rowSpan = 1,
}: JellyfinWidgetProps) {
  const isOnline = Boolean(data?.online);
  const streams = data?.activeStreamCount ?? 0;
  const sessions = data?.activeSessionCount ?? 0;
  const activeUsers = data?.ownerStats?.activeUsers || [];
  const primaryItem = activeUsers[0];

  const isCompact = colSpan === 1 && rowSpan === 1;
  const isExpandedTall = rowSpan >= 2;
  const isExpandedWide = colSpan >= 3;

  // 1x1 Compact Mode
  if (isCompact) {
    return (
      <div
        onClick={onOpenInspector}
        className="flex flex-col justify-between h-full p-2.5 cursor-pointer hover:bg-white/[0.02] transition-colors"
        title="Jellyfin Media - Click to inspect"
      >
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="p-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0">
              <Tv className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] font-bold text-slate-200 truncate">Media</span>
          </div>
          <span
            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
              isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
            }`}
          />
        </div>

        <div className="flex items-center justify-between text-[10px] font-mono">
          <span className="text-slate-400">{streams} stream{streams === 1 ? '' : 's'}</span>
          <span className="text-indigo-400 font-bold">{streams > 0 ? 'Playing' : 'Idle'}</span>
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
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Tv className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Jellyfin Media Server
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
                  {isOnline ? `${streams} Active Stream${streams === 1 ? '' : 's'}` : 'Offline'}
                </span>
              </div>
              <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                {sessions} active session{sessions === 1 ? '' : 's'} · Direct Play / Hardware Transcoding
              </div>
            </div>
          </div>

          {onOpenInspector && (
            <button
              type="button"
              data-no-drag="true"
              onClick={onOpenInspector}
              className="p-1.5 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-mono transition-colors flex items-center gap-1"
              title="Open Jellyfin media inspector"
            >
              <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-[10px]">Inspector</span>
            </button>
          )}
        </div>

        {/* Active Streams Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 flex-1 items-center">
          {activeUsers.length > 0 ? (
            activeUsers.slice(0, 2).map((user, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/70 space-y-1.5"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-white truncate flex items-center gap-1.5">
                    <Film className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span className="truncate">{user.item || 'Playing Media'}</span>
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 shrink-0">
                    {user.playMethod || 'DirectPlay'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span className="flex items-center gap-1 truncate">
                    <User className="w-3 h-3 text-slate-500" /> {user.userName}
                  </span>
                  <span className="flex items-center gap-1 truncate text-slate-500">
                    <Monitor className="w-3 h-3" /> {user.deviceName || user.client}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-2 p-4 text-center rounded-xl bg-slate-900/40 border border-slate-800/40 text-xs font-mono text-slate-500">
              No active video or audio playback streams right now
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-800/50 flex items-center justify-between text-[10px] font-mono text-slate-500">
          <span>Server: {isOnline ? 'Online' : 'Unreachable'}</span>
          <span>{streams > 0 ? `${streams} user${streams === 1 ? '' : 's'} streaming` : 'Ready to stream'}</span>
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
            <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0">
              <Tv className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-xs text-slate-100 truncate flex items-center gap-1.5">
                <span>Jellyfin</span>
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                  }`}
                />
              </div>
              <span className="text-[10px] font-mono text-slate-500 truncate block">
                {streams} stream{streams === 1 ? '' : 's'} active
              </span>
            </div>
          </div>

          {onOpenInspector && (
            <button
              type="button"
              data-no-drag="true"
              onClick={onOpenInspector}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Inspect Jellyfin"
            >
              <ExternalLink className="w-3 h-3 text-indigo-400" />
            </button>
          )}
        </div>

        {/* Middle Stats */}
        <div className="space-y-1.5 flex-1 justify-center flex flex-col">
          {primaryItem ? (
            <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800/60 space-y-1">
              <div className="text-[11px] font-bold text-white truncate flex items-center gap-1.5">
                <Play className="w-3 h-3 text-emerald-400 shrink-0 fill-current" />
                <span className="truncate">{primaryItem.item}</span>
              </div>
              <div className="flex items-center justify-between text-[9px] font-mono text-slate-400">
                <span>User: {primaryItem.userName}</span>
                <span className="text-indigo-400">{primaryItem.playMethod || 'Direct'}</span>
              </div>
            </div>
          ) : (
            <div className="p-3 text-center rounded-lg bg-slate-900/40 border border-slate-800/40 text-[11px] font-mono text-slate-500">
              Server idle, no active streams
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-1.5 border-t border-slate-800/40 flex items-center justify-between text-[10px] font-mono text-slate-400">
          <span className="flex items-center gap-1">
            <Activity className="w-3 h-3 text-indigo-400" /> Sessions: {sessions}
          </span>
          <span className="text-emerald-400 font-semibold">{isOnline ? 'Online' : 'Offline'}</span>
        </div>
      </div>
    );
  }

  // 2x1 Standard Flat Card
  return (
    <div className="flex flex-col justify-between h-full p-2.5 space-y-1">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 pr-1">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0">
            <Tv className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-xs text-slate-100 group-hover:text-indigo-400 transition-colors truncate flex items-center gap-1.5">
              <span>Jellyfin Media</span>
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                }`}
              />
            </div>
            <span className="text-[10px] font-mono text-slate-500 truncate block">
              {primaryItem ? `Playing: ${primaryItem.item}` : `${streams} active streams`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
            {streams} stream{streams === 1 ? '' : 's'}
          </span>
          {onOpenInspector && (
            <button
              type="button"
              data-no-drag="true"
              onClick={onOpenInspector}
              className="p-1 text-slate-500 hover:text-white rounded hover:bg-slate-800 transition-colors"
              title="Inspect Jellyfin"
            >
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      <div className="pt-1 border-t border-slate-800/40 flex items-center justify-between text-[10px] font-mono">
        <div className="flex items-center gap-2 text-slate-300 truncate">
          <span className="text-slate-400">Status: <span className="text-white font-semibold">{isOnline ? 'Ready' : 'Offline'}</span></span>
        </div>

        <div className="flex items-center gap-1 text-indigo-400 shrink-0 font-semibold">
          <span>{primaryItem ? `${primaryItem.userName}` : 'Idle'}</span>
        </div>
      </div>
    </div>
  );
}

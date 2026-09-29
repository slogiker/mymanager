import React from 'react';
import { DownloadCloud, ArrowDown, ArrowUp, ExternalLink, HardDrive } from 'lucide-react';
import { QbittorrentStats } from '../../../types';

export interface QbittorrentWidgetProps {
  data: QbittorrentStats | null;
  onOpenInspector?: () => void;
  colSpan?: number;
  rowSpan?: number;
}

function formatSpeed(bytesPerSec: number): string {
  if (!bytesPerSec || bytesPerSec <= 0) return '0 B/s';
  if (bytesPerSec >= 1048576) {
    return `${(bytesPerSec / 1048576).toFixed(1)} MB/s`;
  }
  return `${(bytesPerSec / 1024).toFixed(0)} KB/s`;
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

export function QbittorrentWidget({
  data,
  onOpenInspector,
  colSpan = 2,
  rowSpan = 1,
}: QbittorrentWidgetProps) {
  if (!data?.online) return null;

  const torrents = data.torrents || [];
  const activeCount = data.activeCount || torrents.length || 0;
  const dlSpeed = data.downloadSpeed || 0;
  const upSpeed = data.uploadSpeed || 0;
  const topTorrent = torrents[0];

  const isCompact = colSpan === 1 && rowSpan === 1;
  const isExpandedWide = colSpan >= 3;
  const isExpandedTall = rowSpan >= 2;

  // 1x1 Compact Representation
  if (isCompact) {
    return (
      <div className="flex flex-col justify-between h-full p-2.5">
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="p-1 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 shrink-0">
              <DownloadCloud className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] font-bold text-slate-200 truncate">qBit</span>
          </div>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
        </div>

        <div className="flex items-center justify-between text-[10px] font-mono">
          <span className="text-slate-500">{activeCount} active</span>
          <span className="text-sky-400 font-bold truncate">
            {dlSpeed > 0 ? `↓ ${formatSpeed(dlSpeed)}` : 'Idle'}
          </span>
        </div>
      </div>
    );
  }

  // 4x2 or 3x2 Wide Hero Representation
  if (isExpandedWide && isExpandedTall) {
    return (
      <div className="flex flex-col justify-between h-full p-3.5 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <DownloadCloud className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  qBittorrent
                </span>
                <span className="inline-flex items-center gap-1 text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live
                </span>
              </div>
              <div className="text-[10px] font-mono text-slate-500">
                {activeCount} active transfer{activeCount === 1 ? '' : 's'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-800 text-xs font-mono">
              <span className="text-sky-400 font-bold flex items-center gap-1">
                <ArrowDown className="w-3 h-3" />
                {formatSpeed(dlSpeed)}
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-cyan-300 font-bold flex items-center gap-1">
                <ArrowUp className="w-3 h-3" />
                {formatSpeed(upSpeed)}
              </span>
            </div>

            {onOpenInspector && (
              <button
                type="button"
                onClick={onOpenInspector}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                title="Open full inspector"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Multi-torrent active list */}
        <div className="flex-1 space-y-2 overflow-y-auto pr-1 max-h-32">
          {torrents.length > 0 ? (
            torrents.slice(0, 3).map((t, idx) => {
              const pct = Math.round((t.progress || 0) * 100);
              const etaStr =
                t.eta && t.eta > 0 && t.eta < 8640000
                  ? `ETA: ${Math.round(t.eta / 60)}m`
                  : t.state || 'downloading';

              return (
                <div key={idx} className="p-2 rounded-lg bg-slate-900/50 border border-slate-800/60 space-y-1">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-slate-200 truncate flex-1" title={t.name}>
                      {t.name}
                    </span>
                    <span className="text-[11px] font-mono font-bold text-sky-400 shrink-0">{pct}%</span>
                  </div>

                  <div className="w-full bg-slate-800 rounded-full h-1 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-sky-500 to-cyan-400 h-full rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span>
                      {formatBytes(t.size)} · ↓ {formatSpeed(t.downloadSpeed)}
                    </span>
                    <span>{etaStr}</span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-2 text-center text-xs text-slate-500">
              Transfer queue is idle
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-800/50 flex items-center justify-between text-[10px] font-mono text-slate-500">
          <span className="flex items-center gap-1.5">
            <HardDrive className="w-3 h-3 text-slate-600" />
            <span>Total Volume</span>
          </span>
          <span className="text-slate-300 font-semibold">{formatBytes(data.downloadTotal || 0)}</span>
        </div>
      </div>
    );
  }

  // 2x2 Double Height Representation
  if (isExpandedTall) {
    return (
      <div className="flex flex-col justify-between h-full p-3 space-y-2">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 shrink-0">
              <DownloadCloud className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-xs text-slate-200 truncate flex items-center gap-1.5">
                <span>qBittorrent</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <span className="text-[10px] font-mono text-slate-500">
                {activeCount} active
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 text-[11px] font-mono">
            <span className="text-sky-400 font-bold">↓ {formatSpeed(dlSpeed)}</span>
            {onOpenInspector && (
              <button
                type="button"
                onClick={onOpenInspector}
                className="p-1 text-slate-500 hover:text-white rounded hover:bg-slate-800 transition-colors"
                title="Inspector"
              >
                <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Active downloads snippet */}
        <div className="space-y-1.5 flex-1 overflow-hidden">
          {torrents.slice(0, 2).map((t, idx) => {
            const pct = Math.round((t.progress || 0) * 100);
            return (
              <div key={idx} className="p-1.5 rounded-lg bg-slate-900/50 border border-slate-800/60 space-y-1">
                <div className="flex items-center justify-between gap-1 text-[11px]">
                  <span className="truncate text-slate-300 font-medium">{t.name}</span>
                  <span className="text-sky-400 font-mono font-bold shrink-0">{pct}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1 overflow-hidden">
                  <div
                    className="bg-sky-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
          {torrents.length === 0 && (
            <div className="py-2 text-center text-xs text-slate-500 italic">
              All downloads complete
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-1.5 border-t border-slate-800/40 flex items-center justify-between text-[10px] font-mono text-slate-500">
          <span>Total: {formatBytes(data.downloadTotal || 0)}</span>
          <span className="text-cyan-400 font-bold">↑ {formatSpeed(upSpeed)}</span>
        </div>
      </div>
    );
  }

  // 2x1 Standard Representation (Default Flat Card Style)
  return (
    <div className="flex flex-col justify-between h-full p-2.5 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 pr-1">
          <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 shrink-0">
            <DownloadCloud className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-xs text-slate-100 group-hover:text-sky-400 transition-colors truncate flex items-center gap-1.5">
              <span>qBittorrent</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            </div>
            <span className="text-[10px] font-mono text-slate-500 truncate block">
              {activeCount} active · {formatBytes(data.downloadTotal || 0)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-[11px] font-mono shrink-0">
          <span className="text-sky-400 font-bold">↓ {formatSpeed(dlSpeed)}</span>
          <span className="text-slate-600">·</span>
          <span className="text-cyan-300 font-bold">↑ {formatSpeed(upSpeed)}</span>
          {onOpenInspector && (
            <button
              type="button"
              onClick={onOpenInspector}
              className="p-1 text-slate-500 hover:text-white rounded hover:bg-slate-800 transition-colors ml-1"
              title="Open full inspector"
            >
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Mini Progress Bar if Active Torrent Exists */}
      {topTorrent ? (
        <div className="space-y-0.5">
          <div className="flex items-center justify-between text-[9px] font-mono text-slate-400">
            <span className="truncate pr-2">{topTorrent.name}</span>
            <span className="text-sky-400 font-bold shrink-0">{Math.round((topTorrent.progress || 0) * 100)}%</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1 overflow-hidden">
            <div
              className="bg-gradient-to-r from-sky-500 to-cyan-400 h-full rounded-full"
              style={{ width: `${Math.round((topTorrent.progress || 0) * 100)}%` }}
            />
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
          <span>Transfer queue idle</span>
          <span className="text-slate-600">Active</span>
        </div>
      )}
    </div>
  );
}

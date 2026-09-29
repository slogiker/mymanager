import React from 'react';
import { DownloadCloud, ArrowDown, ArrowUp, ExternalLink, Activity, HardDrive } from 'lucide-react';
import { QbittorrentStats } from '../../../types';

export interface QbittorrentWidgetProps {
  data: QbittorrentStats | null;
  onOpenInspector?: () => void;
  compact?: boolean;
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

export function QbittorrentWidget({ data, onOpenInspector, compact = false }: QbittorrentWidgetProps) {
  if (!data?.online) return null;

  const torrents = data.torrents || [];
  const activeCount = data.activeCount || torrents.length || 0;
  const dlSpeed = data.downloadSpeed || 0;
  const upSpeed = data.uploadSpeed || 0;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-gradient-to-br from-[#16181f]/90 to-[#12131a]/90 p-5 shadow-xl backdrop-blur-md flex flex-col justify-between">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/60">
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
            <div className="text-[10px] font-mono text-slate-500 mt-0.5">
              {activeCount} active task{activeCount === 1 ? '' : 's'}
            </div>
          </div>
        </div>

        {/* Live Transfer Rate Gauges & Inspector Trigger */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-mono">
            <span className="text-sky-400 font-bold flex items-center gap-1">
              <ArrowDown className="w-3.5 h-3.5" />
              {formatSpeed(dlSpeed)}
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-cyan-300 font-bold flex items-center gap-1">
              <ArrowUp className="w-3.5 h-3.5" />
              {formatSpeed(upSpeed)}
            </span>
          </div>

          {onOpenInspector && (
            <button
              type="button"
              onClick={onOpenInspector}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 transition-colors"
              title="Open full inspector"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Torrents List / Progress Bars */}
      <div className="py-3">
        {torrents.length > 0 ? (
          <div className={`space-y-2 ${compact ? 'max-h-36' : 'max-h-56'} overflow-y-auto pr-1`}>
            {torrents.map((t, idx) => {
              const pct = Math.round((t.progress || 0) * 100);
              const etaStr =
                t.eta && t.eta > 0 && t.eta < 8640000
                  ? `ETA: ${Math.round(t.eta / 60)}m`
                  : t.state || 'downloading';

              return (
                <div key={idx} className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/60 space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-slate-200 truncate flex-1" title={t.name}>
                      {t.name}
                    </span>
                    <span className="text-[11px] font-mono font-bold text-sky-400 shrink-0">{pct}%</span>
                  </div>

                  {/* Animated Loading / Progress Bar */}
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-sky-500 to-cyan-400 h-full rounded-full transition-all duration-300 relative overflow-hidden"
                      style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                    >
                      <div className="absolute inset-0 bg-white/20 animate-pulse" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span>
                      {formatBytes(t.size)} · ↓ {formatSpeed(t.downloadSpeed)}
                    </span>
                    <span>{etaStr}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-4 text-center">
            <div className="text-xs text-slate-400 font-medium">All downloads complete</div>
            <div className="text-[10px] font-mono text-slate-600 mt-0.5">Transfer queue is currently idle</div>
          </div>
        )}
      </div>

      {/* Footer stats */}
      <div className="pt-3 border-t border-slate-800/50 flex items-center justify-between text-[11px] font-mono text-slate-500">
        <span className="flex items-center gap-1.5">
          <HardDrive className="w-3.5 h-3.5 text-slate-600" />
          <span>Total Downloaded</span>
        </span>
        <span className="text-slate-300 font-semibold">{formatBytes(data.downloadTotal || 0)}</span>
      </div>
    </div>
  );
}

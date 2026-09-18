import React from 'react';
import {
  DownloadCloud,
  RefreshCw,
  ExternalLink,
  ArrowDown,
  ArrowUp,
  HardDrive,
  Clock,
  CheckCircle2,
  Pause,
  Play,
  Layers,
} from 'lucide-react';
import { QbittorrentStats } from '../../types';

interface QbittorrentInspectorModalProps {
  open: boolean;
  onClose: () => void;
  data: QbittorrentStats | null;
  loading?: boolean;
  onRefresh?: () => void;
}

function formatSpeed(bytesPerSec: number): string {
  if (!bytesPerSec || bytesPerSec <= 0) return '0.0 KB/s';
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

function formatEta(seconds: number): string {
  if (!seconds || seconds <= 0 || seconds >= 8640000) return '∞';
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins < 60) return `${mins}m ${secs}s`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hours}h ${remMins}m`;
}

export function QbittorrentInspectorModal({
  open,
  onClose,
  data,
  loading = false,
  onRefresh,
}: QbittorrentInspectorModalProps) {
  if (!open) return null;

  const torrents = data?.torrents || [];
  const isOnline = data?.online ?? false;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[88vh] flex flex-col rounded-2xl border border-slate-700/70 bg-[#14161f] shadow-2xl text-slate-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-[#181a24]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <DownloadCloud className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold tracking-tight text-white">qBittorrent Live Telemetry</h3>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider border ${
                    isOnline
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                    }`}
                  />
                  {isOnline ? 'Connected' : 'Offline'}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                NAS Host (192.168.1.41:8090) · Connection: {data?.connectionStatus || 'normal'}
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
                title="Refresh Status"
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
          {/* Top Speeds Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-[#1a1d29]/80 border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Download</span>
                <ArrowDown className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <div className="mt-2">
                <span className="text-xl font-bold font-mono text-cyan-400">
                  {formatSpeed(data?.downloadSpeed || 0)}
                </span>
                <span className="text-[10px] text-slate-500 block font-mono">current rate</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#1a1d29]/80 border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Upload</span>
                <ArrowUp className="w-3.5 h-3.5 text-purple-400" />
              </div>
              <div className="mt-2">
                <span className="text-xl font-bold font-mono text-purple-400">
                  {formatSpeed(data?.uploadSpeed || 0)}
                </span>
                <span className="text-[10px] text-slate-500 block font-mono">current rate</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#1a1d29]/80 border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Active</span>
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="mt-2">
                <span className="text-xl font-bold font-mono text-emerald-400">
                  {data?.activeCount ?? torrents.length}
                </span>
                <span className="text-[10px] text-slate-500 block font-mono">downloading tasks</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#1a1d29]/80 border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">All-Time</span>
                <HardDrive className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="mt-2">
                <span className="text-xs font-bold font-mono text-slate-300 block">
                  ↓ {formatBytes(data?.downloadTotal || 0)}
                </span>
                <span className="text-[10px] text-slate-500 block font-mono mt-0.5">
                  ↑ {formatBytes(data?.uploadTotal || 0)}
                </span>
              </div>
            </div>
          </div>

          {/* Active Torrents List */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <span>Downloading Torrents</span>
                <span className="text-[10px] font-mono text-slate-500">({torrents.length})</span>
              </h4>
              <span className="text-[10px] font-mono text-slate-500">Live progress</span>
            </div>

            {torrents.length === 0 ? (
              <div className="py-8 text-center rounded-xl border border-dashed border-slate-800 text-slate-500 text-xs">
                No active downloads in queue. All torrents are seeded or completed.
              </div>
            ) : (
              <div className="space-y-2.5">
                {torrents.map((t, idx) => {
                  const pct = Math.min(100, Math.max(0, Math.round((t.progress || 0) * 100)));
                  return (
                    <div
                      key={t.name || idx}
                      className="p-3.5 rounded-xl border border-slate-800/80 bg-[#171a25] space-y-2.5 hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3 min-w-0">
                        <div className="min-w-0">
                          <div className="font-semibold text-xs text-slate-100 truncate" title={t.name}>
                            {t.name}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] font-mono text-slate-500">
                            <span>{formatBytes(t.size)}</span>
                            <span>·</span>
                            <span className="text-cyan-400">↓ {formatSpeed(t.downloadSpeed)}</span>
                            <span>·</span>
                            <span className="text-purple-400">↑ {formatSpeed(t.uploadSpeed)}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-mono uppercase font-bold ${
                              t.state === 'downloading'
                                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {t.state}
                          </span>
                          <span className="font-mono text-xs font-bold text-slate-200">{pct}%</span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-600" />
                          <span>ETA: {formatEta(t.eta)}</span>
                        </div>
                        <span>{t.numSeeds || 0} seeds connected</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-800 bg-[#161822] text-xs">
          <button
            type="button"
            onClick={() => window.open('http://192.168.1.41:8090', '_blank', 'noopener,noreferrer')}
            className="flex items-center gap-1.5 text-slate-300 hover:text-white text-xs font-semibold transition-colors"
          >
            <span>Open qBittorrent Web UI</span>
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

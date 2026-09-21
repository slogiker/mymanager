import React from 'react';
import {
  Film,
  RefreshCw,
  ExternalLink,
  Tv,
  PlayCircle,
  Monitor,
  User,
  Zap,
  Info,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { JellyfinStats } from '../../types';

interface JellyfinInspectorModalProps {
  open: boolean;
  onClose: () => void;
  data: JellyfinStats | null;
  isOwner: boolean;
  loading?: boolean;
  onRefresh?: () => void;
}

export function JellyfinInspectorModal({
  open,
  onClose,
  data,
  isOwner,
  loading = false,
  onRefresh,
}: JellyfinInspectorModalProps) {
  if (!open) return null;

  const isOnline = data?.online ?? false;
  const activeStreams = data?.activeStreamCount ?? 0;
  const activeSessions = data?.activeSessionCount ?? 0;
  const ownerDetails = data?.ownerStats;
  const activeUsers = ownerDetails?.activeUsers || [];
  const playbackReporting = ownerDetails?.playbackReporting || [];

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
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold tracking-tight text-white">Jellyfin Media Server</h3>
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
                  {isOnline ? 'Active' : 'Offline'}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                media.slogiker.si · {activeStreams} active stream{activeStreams === 1 ? '' : 's'}
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
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-[#1a1d29]/80 border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Active Playbacks
                </span>
                <PlayCircle className="w-4 h-4 text-purple-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-purple-400">{activeStreams}</span>
                <span className="text-xs text-slate-500 font-mono">playing now</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#1a1d29]/80 border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Connected Clients
                </span>
                <Tv className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-cyan-400">{activeSessions}</span>
                <span className="text-xs text-slate-500 font-mono">open sessions</span>
              </div>
            </div>
          </div>

          {/* Active Streams Section (Owner Detailed Breakdown) */}
          {isOwner && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <PlayCircle className="w-3.5 h-3.5 text-purple-400" />
                  <span>Currently Streaming</span>
                  <span className="text-[10px] font-mono text-slate-500">({activeUsers.length})</span>
                </h4>
                <span className="text-[10px] font-mono text-amber-400/90 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                  Owner view
                </span>
              </div>

              {activeUsers.length === 0 ? (
                <div className="py-6 text-center rounded-xl border border-dashed border-slate-800 text-slate-500 text-xs">
                  No active streams playing at this moment.
                </div>
              ) : (
                <div className="space-y-2">
                  {activeUsers.map((stream, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl border border-slate-800/80 bg-[#181b26] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 shrink-0 mt-0.5">
                          <User className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-white truncate flex items-center gap-2">
                            <span>{stream.userName || 'Unknown User'}</span>
                            <span className="text-slate-600 font-normal">·</span>
                            <span className="text-purple-300 font-medium truncate">{stream.item}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] font-mono text-slate-400">
                            <Monitor className="w-3 h-3 text-slate-500" />
                            <span>{stream.deviceName || stream.client || 'Device'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="self-end sm:self-center shrink-0">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold border ${
                            stream.playMethod === 'DirectPlay'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}
                        >
                          <Zap className="w-3 h-3" />
                          {stream.playMethod || 'DirectPlay'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 30-Day Watch Time from Playback Reporting */}
              <div className="pt-3 border-t border-slate-800/80 space-y-2.5">
                <div className="flex items-center justify-between px-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>30-Day Watch Time (Playback Reporting)</span>
                  </h4>
                </div>

                {playbackReporting.length > 0 ? (
                  <div className="rounded-xl border border-slate-800 bg-[#161822] overflow-hidden text-xs">
                    <table className="w-full text-left font-mono">
                      <thead className="bg-[#1b1e2b] text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-800">
                        <tr>
                          <th className="px-3 py-2">User</th>
                          <th className="px-3 py-2">Play Count</th>
                          <th className="px-3 py-2 text-right">Total Duration</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-slate-300">
                        {playbackReporting.map((r: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-800/30">
                            <td className="px-3 py-2 font-semibold text-white">{r.UserName || r.userName || 'User'}</td>
                            <td className="px-3 py-2 text-slate-400">{r.PlayCount || r.playCount || 0} plays</td>
                            <td className="px-3 py-2 text-right text-purple-400 font-bold">{r.TotalTime || r.totalTime || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-[#161822] border border-slate-800/80 flex items-start gap-2.5 text-xs text-slate-400">
                    <Info className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-slate-200">Historical Watch-Time Analytics</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Historical per-user watch metrics will appear here once the Playback Reporting plugin is active in Jellyfin dashboard.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {!isOwner && (
            <div className="p-4 rounded-xl bg-[#161822] border border-slate-800 text-xs text-slate-400 space-y-1.5">
              <div className="flex items-center gap-2 text-slate-200 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Media Stream Status</span>
              </div>
              <p className="text-slate-500">
                Jellyfin is running smoothly with {activeStreams} active stream{activeStreams === 1 ? '' : 's'}.
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-800 bg-[#161822] text-xs">
          <button
            type="button"
            onClick={() => window.open('https://media.slogiker.si', '_blank', 'noopener,noreferrer')}
            className="flex items-center gap-1.5 text-purple-400 hover:text-purple-300 text-xs font-semibold transition-colors"
          >
            <span>Open Jellyfin Web</span>
            <ExternalLink className="w-3.5 h-3.5" />
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

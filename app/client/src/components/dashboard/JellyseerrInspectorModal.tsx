import React from 'react';
import {
  Clapperboard,
  RefreshCw,
  ExternalLink,
  Film,
  Tv,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  HelpCircle,
} from 'lucide-react';
import { JellyseerrStats } from '../../types';

interface JellyseerrInspectorModalProps {
  open: boolean;
  onClose: () => void;
  data: JellyseerrStats | null;
  isOwner: boolean;
  loading?: boolean;
  onRefresh?: () => void;
}

function getStatusBadge(status: number) {
  switch (status) {
    case 1:
      return {
        label: 'Pending',
        icon: Clock,
        className: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      };
    case 2:
      return {
        label: 'Approved',
        icon: CheckCircle2,
        className: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      };
    case 3:
      return {
        label: 'Declined',
        icon: XCircle,
        className: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      };
    case 4:
    case 5:
      return {
        label: 'Available',
        icon: CheckCircle2,
        className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      };
    default:
      return {
        label: 'Processing',
        icon: HelpCircle,
        className: 'bg-slate-800 text-slate-400 border-slate-700',
      };
  }
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

export function JellyseerrInspectorModal({
  open,
  onClose,
  data,
  isOwner,
  loading = false,
  onRefresh,
}: JellyseerrInspectorModalProps) {
  if (!open) return null;

  const isOnline = data?.online ?? false;
  const pending = data?.pendingCount ?? 0;
  const total = data?.totalCount ?? 0;
  const movies = data?.movieCount ?? 0;
  const tv = data?.tvCount ?? 0;

  const ownerDetails = data?.ownerStats;
  const userCounts = ownerDetails?.userCounts || [];
  const recentRequests = ownerDetails?.recentRequests || [];

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
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Clapperboard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold tracking-tight text-white">Jellyseerr Media Requests</h3>
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
                192.168.1.41:5055 · {pending} pending request{pending === 1 ? '' : 's'}
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-[#1a1d29]/80 border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Pending</span>
                <Clock className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="mt-2">
                <span className="text-2xl font-bold font-mono text-amber-400">{pending}</span>
                <span className="text-[10px] text-slate-500 block font-mono">awaiting approval</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#1a1d29]/80 border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total</span>
                <Clapperboard className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <div className="mt-2">
                <span className="text-2xl font-bold font-mono text-white">{total}</span>
                <span className="text-[10px] text-slate-500 block font-mono">lifetime requests</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#1a1d29]/80 border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Movies</span>
                <Film className="w-3.5 h-3.5 text-purple-400" />
              </div>
              <div className="mt-2">
                <span className="text-2xl font-bold font-mono text-purple-400">{movies}</span>
                <span className="text-[10px] text-slate-500 block font-mono">requested films</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#1a1d29]/80 border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">TV Series</span>
                <Tv className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="mt-2">
                <span className="text-2xl font-bold font-mono text-emerald-400">{tv}</span>
                <span className="text-[10px] text-slate-500 block font-mono">requested shows</span>
              </div>
            </div>
          </div>

          {/* Owner-Only Section */}
          {isOwner && (
            <div className="space-y-4">
              {/* User Requests Attribution Leaderboard */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between px-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-amber-400" />
                    <span>Requests per Friend</span>
                    <span className="text-[10px] font-mono text-slate-500">
                      (Download Attribution Proxy)
                    </span>
                  </h4>
                  <span className="text-[10px] font-mono text-amber-400/90 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                    Owner view
                  </span>
                </div>

                {userCounts.length === 0 ? (
                  <div className="py-4 text-center rounded-xl border border-dashed border-slate-800 text-slate-500 text-xs">
                    No requests recorded yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {userCounts.map((u, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-[#171a25] border border-slate-800/80 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-6 h-6 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-[10px] font-bold text-amber-400 font-mono">
                            {idx + 1}
                          </div>
                          <span className="font-semibold text-slate-200 truncate">{u.username}</span>
                        </div>
                        <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                          {u.count} request{u.count === 1 ? '' : 's'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Requests Table */}
              <div className="space-y-2.5 pt-2 border-t border-slate-800/80">
                <div className="flex items-center justify-between px-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <span>Recent Media Requests</span>
                    <span className="text-[10px] font-mono text-slate-500">({recentRequests.length})</span>
                  </h4>
                </div>

                {recentRequests.length === 0 ? (
                  <div className="py-6 text-center rounded-xl border border-dashed border-slate-800 text-slate-500 text-xs">
                    No recent requests found.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                    {recentRequests.map((req, idx) => {
                      const badge = getStatusBadge(req.status);
                      const BadgeIcon = badge.icon;
                      return (
                        <div
                          key={req.id || idx}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-[#171a25] border border-slate-800/80 text-xs hover:border-slate-700 transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 pr-3">
                            <div className="p-1 rounded bg-slate-800 text-slate-400 shrink-0">
                              {req.type === 'movie' ? <Film className="w-3.5 h-3.5" /> : <Tv className="w-3.5 h-3.5" />}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-100 truncate">{req.title}</div>
                              <div className="text-[10px] text-slate-500 font-mono">
                                by <span className="text-slate-400">{req.requestedBy}</span> · {formatDate(req.createdAt)}
                              </div>
                            </div>
                          </div>

                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold border shrink-0 ${badge.className}`}
                          >
                            <BadgeIcon className="w-3 h-3" />
                            <span>{badge.label}</span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-800 bg-[#161822] text-xs">
          <button
            type="button"
            onClick={() => window.open('http://192.168.1.41:5055', '_blank', 'noopener,noreferrer')}
            className="flex items-center gap-1.5 text-amber-400 hover:text-amber-300 text-xs font-semibold transition-colors"
          >
            <span>Open Jellyseerr Web UI</span>
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

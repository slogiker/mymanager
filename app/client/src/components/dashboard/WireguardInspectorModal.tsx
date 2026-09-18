import React, { useState } from 'react';
import {
  Shield,
  RefreshCw,
  Copy,
  Check,
  ArrowDown,
  ArrowUp,
  Clock,
  Wifi,
  WifiOff,
  AlertCircle,
  Radio,
} from 'lucide-react';
import { WireguardStatus } from '../../types';

interface WireguardInspectorModalProps {
  open: boolean;
  onClose: () => void;
  data: WireguardStatus | null;
  loading?: boolean;
  onRefresh?: () => void;
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function formatHandshake(timestamp: number): { text: string; isRecent: boolean } {
  if (!timestamp || timestamp <= 0) {
    return { text: 'Never', isRecent: false };
  }
  const nowSec = Math.floor(Date.now() / 1000);
  const diff = Math.max(0, nowSec - timestamp);
  if (diff < 60) return { text: `${diff}s ago`, isRecent: true };
  if (diff < 180) return { text: `${Math.floor(diff / 60)}m ago`, isRecent: true };
  if (diff < 3600) return { text: `${Math.floor(diff / 60)}m ago`, isRecent: false };
  if (diff < 86400) return { text: `${Math.floor(diff / 3600)}h ago`, isRecent: false };
  return { text: `${Math.floor(diff / 86400)}d ago`, isRecent: false };
}

export function WireguardInspectorModal({
  open,
  onClose,
  data,
  loading = false,
  onRefresh,
}: WireguardInspectorModalProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!open) return null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const peers = data?.peers || [];
  const connectedCount = data?.connectedPeers ?? peers.filter((p) => p.connected).length;
  const totalRx = peers.reduce((acc, p) => acc + (p.transferRx || 0), 0);
  const totalTx = peers.reduce((acc, p) => acc + (p.transferTx || 0), 0);

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
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold tracking-tight text-white">WireGuard VPN Status</h3>
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
                  {data?.online ? 'Online' : 'Offline'}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Subnet: 10.7.235.0/24 · Listen Port: {data?.interface?.listenPort || '51820'}
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-[#1a1d29]/80 border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Peers</span>
                <Radio className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-white">{connectedCount}</span>
                <span className="text-xs text-slate-500 font-mono">/ {peers.length} active</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#1a1d29]/80 border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Downloaded</span>
                <ArrowDown className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <div className="mt-2">
                <span className="text-xl font-bold font-mono text-cyan-400">{formatBytes(totalRx)}</span>
                <span className="text-[11px] text-slate-500 block font-mono">total interface rx</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#1a1d29]/80 border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Uploaded</span>
                <ArrowUp className="w-3.5 h-3.5 text-purple-400" />
              </div>
              <div className="mt-2">
                <span className="text-xl font-bold font-mono text-purple-400">{formatBytes(totalTx)}</span>
                <span className="text-[11px] text-slate-500 block font-mono">total interface tx</span>
              </div>
            </div>
          </div>

          {/* Interface Public Key */}
          {data?.interface?.publicKey && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#161822] border border-slate-800/80 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-slate-400 font-medium">Server Key:</span>
                <span className="font-mono text-slate-300 truncate">
                  {data.interface.publicKey}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(data.interface!.publicKey)}
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors ml-2 shrink-0"
                title="Copy public key"
              >
                {copiedKey === data.interface.publicKey ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          )}

          {/* Error Message banner if any */}
          {data?.error && (
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>{data.error}</span>
            </div>
          )}

          {/* Peer List */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <span>Configured Peers</span>
                <span className="text-[10px] font-mono text-slate-500">({peers.length})</span>
              </h4>
              <span className="text-[10px] font-mono text-slate-500">
                Active handshakes &lt; 3 mins
              </span>
            </div>

            {peers.length === 0 ? (
              <div className="py-8 text-center rounded-xl border border-dashed border-slate-800 text-slate-500 text-xs">
                No peers configured or server returned empty dump.
              </div>
            ) : (
              <div className="space-y-2">
                {peers.map((peer, idx) => {
                  const handshake = formatHandshake(peer.latestHandshake);
                  const shortKey = `${peer.publicKey.slice(0, 10)}...${peer.publicKey.slice(-6)}`;

                  return (
                    <div
                      key={peer.publicKey || idx}
                      className={`p-3.5 rounded-xl border transition-all ${
                        peer.connected
                          ? 'bg-[#181b26] border-slate-700/80 hover:border-slate-600'
                          : 'bg-[#13151e]/80 border-slate-800/60 opacity-80'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        {/* Peer Identity */}
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`p-1.5 rounded-lg shrink-0 ${
                              peer.connected
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : 'bg-slate-800 text-slate-500'
                            }`}
                          >
                            {peer.connected ? (
                              <Wifi className="w-3.5 h-3.5" />
                            ) : (
                              <WifiOff className="w-3.5 h-3.5" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-semibold text-slate-200 truncate">
                                {shortKey}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopy(peer.publicKey)}
                                className="text-slate-500 hover:text-slate-300 transition-colors"
                                title="Copy full key"
                              >
                                {copiedKey === peer.publicKey ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                            <span className="text-[11px] font-mono text-purple-400">
                              {peer.allowedIps}
                            </span>
                          </div>
                        </div>

                        {/* Handshake & Status */}
                        <div className="flex items-center gap-3 self-end sm:self-center shrink-0 text-xs font-mono">
                          <div className="flex items-center gap-1.5 text-slate-400" title="Latest handshake">
                            <Clock className="w-3 h-3 text-slate-500" />
                            <span className={handshake.isRecent ? 'text-emerald-400 font-semibold' : 'text-slate-400'}>
                              {handshake.text}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">
                            <span className="text-cyan-400">↓ {formatBytes(peer.transferRx)}</span>
                            <span className="text-slate-600">·</span>
                            <span className="text-purple-400">↑ {formatBytes(peer.transferTx)}</span>
                          </div>

                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-semibold border ${
                              peer.connected
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : 'bg-slate-800 text-slate-500 border-slate-700'
                            }`}
                          >
                            {peer.connected ? 'Active' : 'Offline'}
                          </span>
                        </div>
                      </div>

                      {peer.endpoint && (
                        <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] font-mono text-slate-500">
                          <span>Endpoint: {peer.endpoint}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-800 bg-[#161822] text-xs">
          <span className="text-slate-500 font-mono">
            CM4 Node · 192.168.1.112:51820
          </span>
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

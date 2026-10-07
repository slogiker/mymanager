import React from 'react';
import { Shield, Lock, Radio, Users, ExternalLink, ArrowDown, ArrowUp } from 'lucide-react';
import { WireguardStatus } from '../../../types';

export interface WireguardWidgetProps {
  data: WireguardStatus | null;
  onOpenInspector?: () => void;
  colSpan?: number;
  rowSpan?: number;
}

export function WireguardWidget({
  data,
  onOpenInspector,
  colSpan = 2,
  rowSpan = 1,
}: WireguardWidgetProps) {
  const isOnline = Boolean(data?.online);
  const activePeers =
    data?.connectedPeers ??
    (data?.peers?.filter((p) => p.connected)?.length ?? 0);
  const totalPeers = data?.totalPeers ?? (data?.peers?.length ?? 0);
  const listenPort = data?.interface?.listenPort || '51820';

  const isCompact = colSpan === 1 && rowSpan === 1;
  const isExpandedTall = rowSpan >= 2;
  const isExpandedWide = colSpan >= 3;

  // 1x1 Compact Mode
  if (isCompact) {
    return (
      <div
        onClick={onOpenInspector}
        className="flex flex-col justify-between h-full p-2.5 cursor-pointer hover:bg-white/[0.02] transition-colors"
        title="WireGuard VPN - Click to inspect"
      >
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="p-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 shrink-0">
              <Shield className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] font-bold text-slate-200 truncate">VPN</span>
          </div>
          <span
            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
              isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
            }`}
          />
        </div>

        <div className="flex items-center justify-between text-[10px] font-mono">
          <span className="text-slate-400">{activePeers} / {totalPeers}</span>
          <span className="text-purple-400 font-bold">{isOnline ? 'Active' : 'Off'}</span>
        </div>
      </div>
    );
  }

  // 4x2 Wide Hero Mode
  if (isExpandedWide && isExpandedTall) {
    const peersList = data?.peers?.slice(0, 4) || [];

    return (
      <div className="flex flex-col justify-between h-full p-3.5 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  WireGuard VPN Gateway
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
                  {isOnline ? 'Encrypted' : 'Offline'}
                </span>
              </div>
              <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                wg0 · Port: UDP {listenPort} · {activePeers} of {totalPeers} peers connected
              </div>
            </div>
          </div>

          {onOpenInspector && (
            <button
              type="button"
              data-no-drag="true"
              onClick={onOpenInspector}
              className="p-1.5 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-mono transition-colors flex items-center gap-1"
              title="Open WireGuard VPN inspector"
            >
              <ExternalLink className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-[10px]">Inspector</span>
            </button>
          )}
        </div>

        {/* Peers Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 flex-1 items-center">
          {peersList.length > 0 ? (
            peersList.map((peer, idx) => (
              <div
                key={peer.publicKey || idx}
                className="p-2 rounded-xl bg-slate-900/60 border border-slate-800/70 space-y-1"
              >
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-slate-300 font-semibold truncate">
                    Peer #{idx + 1}
                  </span>
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      peer.connected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
                    }`}
                  />
                </div>
                <div className="text-[10px] font-mono text-slate-400 truncate">
                  {peer.allowedIps || 'IP Managed'}
                </div>
                <div className="text-[9px] font-mono text-slate-500 truncate flex items-center gap-1">
                  <span>Rx: {(peer.transferRx / (1024 * 1024)).toFixed(1)}MB</span>
                  <span>·</span>
                  <span>Tx: {(peer.transferTx / (1024 * 1024)).toFixed(1)}MB</span>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-4 p-3 text-center rounded-xl bg-slate-900/40 border border-slate-800/40 text-xs font-mono text-slate-500">
              No active tunnel peer connections currently established
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-800/50 flex items-center justify-between text-[10px] font-mono text-slate-500">
          <span className="flex items-center gap-1">
            <Lock className="w-3 h-3 text-purple-400" /> ChaCha20-Poly1305
          </span>
          <span>{activePeers} active tunnel{activePeers === 1 ? '' : 's'}</span>
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
            <div className="p-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 shrink-0">
              <Shield className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-xs text-slate-100 truncate flex items-center gap-1.5">
                <span>WireGuard</span>
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                  }`}
                />
              </div>
              <span className="text-[10px] font-mono text-slate-500 truncate block">
                Port: UDP {listenPort}
              </span>
            </div>
          </div>

          {onOpenInspector && (
            <button
              type="button"
              data-no-drag="true"
              onClick={onOpenInspector}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Inspect WireGuard"
            >
              <ExternalLink className="w-3 h-3 text-purple-400" />
            </button>
          )}
        </div>

        {/* Middle Stats */}
        <div className="space-y-1.5 flex-1 justify-center flex flex-col">
          <div className="grid grid-cols-2 gap-1.5">
            <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800/60">
              <div className="text-[9px] font-mono text-slate-500">Connected Peers</div>
              <div className="text-base font-mono font-bold text-purple-400 mt-0.5">{activePeers}</div>
            </div>
            <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800/60">
              <div className="text-[9px] font-mono text-slate-500">Total Configured</div>
              <div className="text-base font-mono font-bold text-slate-200 mt-0.5">{totalPeers}</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-1.5 border-t border-slate-800/40 flex items-center justify-between text-[10px] font-mono text-slate-400">
          <span className="flex items-center gap-1">
            <Radio className="w-3 h-3 text-purple-400" /> wg0 interface
          </span>
          <span className="text-emerald-400 font-semibold">{isOnline ? 'Running' : 'Down'}</span>
        </div>
      </div>
    );
  }

  // 2x1 Standard Flat Card
  return (
    <div className="flex flex-col justify-between h-full p-2.5 space-y-1">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 pr-1">
          <div className="p-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 shrink-0">
            <Shield className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-xs text-slate-100 group-hover:text-purple-400 transition-colors truncate flex items-center gap-1.5">
              <span>WireGuard VPN</span>
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                }`}
              />
            </div>
            <span className="text-[10px] font-mono text-slate-500 truncate block">
              {activePeers} active of {totalPeers} peers
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/30">
            UDP {listenPort}
          </span>
          {onOpenInspector && (
            <button
              type="button"
              data-no-drag="true"
              onClick={onOpenInspector}
              className="p-1 text-slate-500 hover:text-white rounded hover:bg-slate-800 transition-colors"
              title="Inspect WireGuard VPN"
            >
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      <div className="pt-1 border-t border-slate-800/40 flex items-center justify-between text-[10px] font-mono">
        <div className="flex items-center gap-2 text-slate-300 truncate">
          <span className="text-slate-400">Tunnel: <span className="text-white font-semibold">wg0</span></span>
        </div>

        <div className="flex items-center gap-1 text-emerald-400 shrink-0 font-semibold">
          <span>{isOnline ? 'Active' : 'Offline'}</span>
        </div>
      </div>
    </div>
  );
}

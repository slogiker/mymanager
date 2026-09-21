import { useState } from 'react';
import {
  Server,
  SlidersHorizontal,
  RefreshCw,
  Settings,
} from 'lucide-react';
import { ServerNode, SpeedtestResult } from '../../../types';
import { ServerGaugesModal } from './ServerGaugesModal';

export interface MultiServerNodesWidgetProps {
  nodes: ServerNode[];
  loading: boolean;
  speedtest?: SpeedtestResult | null;
  serverGauges?: Record<string, { cpu?: boolean; ram?: boolean; storage?: boolean; net?: boolean; fan?: boolean; temp?: boolean; ports?: boolean; ping?: boolean; down?: boolean; up?: boolean }>;
  onUpdateServerGauges?: (gauges: Record<string, any>) => void;
  isAdmin?: boolean;
  onRunSpeedtest?: () => void;
  isRunningSpeedtest?: boolean;
}

export function MultiServerNodesWidget({
  nodes,
  loading,
  speedtest,
  serverGauges = {},
  onUpdateServerGauges,
  isAdmin,
  onRunSpeedtest,
  isRunningSpeedtest,
}: MultiServerNodesWidgetProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const handleToggleGauge = (nodeId: string, gaugeKey: string) => {
    if (!onUpdateServerGauges) return;
    const current = serverGauges[nodeId] || {};
    const currentVal = (current as any)[gaugeKey] !== false;
    const next = {
      ...serverGauges,
      [nodeId]: {
        ...current,
        [gaugeKey]: !currentVal,
      },
    };
    onUpdateServerGauges(next);
  };

  const handleResetGauges = () => {
    if (!onUpdateServerGauges) return;
    onUpdateServerGauges({});
  };

  if (loading && nodes.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-800/80 bg-[#16181f]/70 p-4 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <RefreshCw className="w-4 h-4 animate-spin text-red-500" />
          <span>Polling cluster telemetry for host, .136, .112, and .41...</span>
        </div>
      </div>
    );
  }

  const totalMonitored = nodes.length + (speedtest ? 1 : 0);

  return (
    <div className="space-y-2.5">
      <ServerGaugesModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        nodes={nodes}
        speedtest={speedtest}
        serverGauges={serverGauges}
        onToggleGauge={handleToggleGauge}
        onResetGauges={handleResetGauges}
      />

      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <Server className="w-3.5 h-3.5 text-red-500" /> Cluster & Network Telemetry ({totalMonitored} Nodes)
        </span>
        <div className="flex items-center gap-2">
          {isAdmin && onUpdateServerGauges && (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="text-[10px] font-mono text-slate-400 hover:text-red-400 transition-colors flex items-center gap-1.5 px-2 py-0.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:border-slate-700"
              title="Configure visible telemetry stats per server"
            >
              <SlidersHorizontal className="w-3 h-3 text-red-500" />
              <span>Customize Gauges</span>
            </button>
          )}
          {onRunSpeedtest && (
            <button
              type="button"
              onClick={onRunSpeedtest}
              disabled={isRunningSpeedtest}
              className="text-[10px] font-mono text-slate-400 hover:text-red-400 disabled:opacity-50 transition-colors flex items-center gap-1.5 px-2 py-0.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:border-slate-700"
              title="Run on-demand internet speedtest"
            >
              <RefreshCw className={`w-3 h-3 ${isRunningSpeedtest ? 'animate-spin text-red-500' : ''}`} />
              <span>Speedtest</span>
            </button>
          )}
          <span className="text-[10px] font-mono text-slate-500 hidden sm:inline">Live 10s Telemetry</span>
        </div>
      </div>

      <div className={`grid grid-cols-1 sm:grid-cols-2 ${speedtest ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-3.5`}>
        {nodes.map((node) => {
          const isOnline = node.status === 'online';
          const isPironman = node.id.includes('136');
          const nodeGauges = serverGauges[node.id] || {};

          const showCpu = nodeGauges.cpu !== false && !!node.cpu;
          const showFan = nodeGauges.fan !== false && !!node.fanSpeed;
          const showRam = nodeGauges.ram !== false && (!!node.memory && (!node.fanSpeed || !showFan));
          const showTemp = nodeGauges.temp !== false && !!node.temperature;
          const showDisk = nodeGauges.storage !== false && !!node.disk;
          const showNet = nodeGauges.net !== false && !!node.network;
          const hasMetrics = showCpu || showFan || showRam || showTemp || showDisk || showNet;

          return (
            <div
              key={node.id}
              className={`group relative rounded-2xl border p-4 space-y-2 transition-all duration-200 backdrop-blur-md ${
                isPironman
                  ? 'border-red-500/30 bg-[#16181f]/90 hover:border-red-500/50 shadow-[0_0_15px_-4px_rgba(239,68,68,0.15)]'
                  : 'border-slate-800/80 bg-[#16181f]/80 hover:border-slate-700/80 shadow-lg'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                    }`}
                  />
                  <span className="font-bold text-xs text-white truncate">{node.name}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {nodeGauges.ping !== false && (
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      {node.latency}
                    </span>
                  )}
                  {isAdmin && onUpdateServerGauges && (
                    <button
                      type="button"
                      onClick={() => setModalOpen(true)}
                      className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-slate-800/80 transition-colors opacity-60 hover:opacity-100"
                      title="Configure stats for this server"
                    >
                      <Settings className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              <p className="text-[10px] font-mono text-slate-400 truncate">
                {node.ip} · {node.role}
              </p>

              {hasMetrics ? (
                <div className={`grid ${(!showCpu && !showRam && !showFan && !showTemp) ? 'grid-cols-2' : 'grid-cols-3'} gap-2 pt-2 border-t border-slate-800/80 text-[10px] font-mono`}>
                  {showCpu ? (
                    <div>
                      <span className="text-slate-500 block">CPU</span>
                      <span className="text-slate-200 font-bold">{node.cpu?.load}%</span>
                    </div>
                  ) : (!showDisk && !showNet) ? <div /> : null}
                  {showFan ? (
                    <div>
                      <span className="text-slate-500 block">FAN</span>
                      <span className="text-cyan-400 font-bold">{node.fanSpeed}</span>
                    </div>
                  ) : showRam ? (
                    <div>
                      <span className="text-slate-500 block">RAM</span>
                      <span className="text-slate-200 font-bold" title={node.memory?.used ? `${node.memory.used} / ${node.memory.total}` : undefined}>
                        {node.memory?.percent || 0}%
                      </span>
                    </div>
                  ) : (!showDisk && !showNet) ? <div /> : null}
                  {showTemp ? (
                    <div>
                      <span className="text-slate-500 block">TEMP</span>
                      <span className="text-amber-400 font-bold">{node.temperature || '-'}</span>
                    </div>
                  ) : (!showDisk && !showNet) ? <div /> : null}
                  {showDisk && (
                    <div className={(!showCpu && !showRam && !showTemp && !showNet) ? 'col-span-2' : ''}>
                      <span className="text-slate-500 block truncate uppercase">{node.disk?.poolName || 'Storage'}</span>
                      <span className="text-emerald-400 font-bold truncate block" title={`${node.disk?.free} free of ${node.disk?.total} (${node.disk?.percent}% used)`}>
                        {node.disk?.free} left
                      </span>
                    </div>
                  )}
                  {showNet && (
                    <div className={(!showCpu && !showRam && !showTemp && !showDisk) ? 'col-span-2' : ''}>
                      <span className="text-slate-500 block truncate">NETWORK</span>
                      <span className="text-cyan-400 font-bold truncate block" title={`${node.network?.down || ''} · ${node.network?.up || ''}`}>
                        {node.network?.down || '-'}
                      </span>
                    </div>
                  )}
                </div>
              ) : (node.ports && nodeGauges.ports !== false) ? (
                <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-800/80">
                  {node.ports.map((p) => (
                    <span
                      key={p}
                      className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-300"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}

        {speedtest && (
          <div className="group relative rounded-2xl border border-slate-800/80 bg-[#16181f]/80 hover:border-slate-700/80 shadow-lg p-4 space-y-2 transition-all duration-200 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`w-2 h-2 rounded-full shrink-0 ${speedtest.status === 'success' || speedtest.status === 'cached' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-500'}`} />
                <span className="font-bold text-xs text-white truncate">WAN / Internet</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {serverGauges['wan']?.ping !== false && (
                  <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                    {speedtest.pingMs ? `${speedtest.pingMs}ms` : 'WAN'}
                  </span>
                )}
                {isAdmin && onUpdateServerGauges && (
                  <button
                    type="button"
                    onClick={() => setModalOpen(true)}
                    className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-slate-800/80 transition-colors opacity-60 hover:opacity-100"
                    title="Configure stats for WAN"
                  >
                    <Settings className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            <p className="text-[10px] font-mono text-slate-400 truncate">
              {speedtest.server || 'Cloudflare Edge'} · Speedtest
            </p>

            {(serverGauges['wan']?.down !== false || serverGauges['wan']?.up !== false) && (
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-[10px] font-mono">
                {serverGauges['wan']?.down !== false ? (
                  <div>
                    <span className="text-slate-500 block">DOWN</span>
                    <span className="text-emerald-400 font-bold">↓ {speedtest.downloadMbps}M</span>
                  </div>
                ) : <div />}
                {serverGauges['wan']?.up !== false ? (
                  <div>
                    <span className="text-slate-500 block">UP</span>
                    <span className="text-cyan-400 font-bold">↑ {speedtest.uploadMbps}M</span>
                  </div>
                ) : <div />}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

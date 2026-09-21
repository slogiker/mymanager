import { SlidersHorizontal } from 'lucide-react';
import { ServerNode, SpeedtestResult } from '../../../types';

export interface ServerGaugesModalProps {
  open: boolean;
  onClose: () => void;
  nodes: ServerNode[];
  speedtest?: SpeedtestResult | null;
  serverGauges?: Record<string, { cpu?: boolean; ram?: boolean; storage?: boolean; net?: boolean; fan?: boolean; temp?: boolean; ports?: boolean; ping?: boolean; down?: boolean; up?: boolean }>;
  onToggleGauge: (nodeId: string, gaugeKey: string) => void;
  onResetGauges: () => void;
}

export function ServerGaugesModal({
  open,
  onClose,
  nodes,
  speedtest,
  serverGauges = {},
  onToggleGauge,
  onResetGauges,
}: ServerGaugesModalProps) {
  if (!open) return null;

  const nodeItems = [
    ...nodes.map((n) => {
      const gauges: { key: string; label: string }[] = [
        { key: 'ping', label: 'Ping / Latency' },
      ];
      if (n.cpu) gauges.push({ key: 'cpu', label: 'CPU Load' });
      if (n.memory) gauges.push({ key: 'ram', label: 'RAM Memory' });
      if (n.temperature) gauges.push({ key: 'temp', label: 'Temperature' });
      if (n.fanSpeed) gauges.push({ key: 'fan', label: 'Fan Speed' });
      if (n.disk) gauges.push({ key: 'storage', label: n.disk.poolName ? `${n.disk.poolName} Storage` : 'Storage' });
      if (n.network) gauges.push({ key: 'net', label: 'Network Speed' });
      if (n.ports && n.ports.length > 0) gauges.push({ key: 'ports', label: 'Open Ports' });

      return {
        id: n.id,
        name: n.name,
        sub: `${n.ip} · ${n.role}`,
        availableGauges: gauges,
      };
    }),
    ...(speedtest
      ? [
          {
            id: 'wan',
            name: 'WAN / Internet',
            sub: `${speedtest.server || 'Cloudflare Edge'} · Speedtest`,
            availableGauges: [
              { key: 'ping', label: 'Ping / Latency' },
              { key: 'down', label: 'Download Speed' },
              { key: 'up', label: 'Upload Speed' },
            ],
          },
        ]
      : []),
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in cursor-pointer"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl bg-[#16181f] border border-slate-800 shadow-2xl p-6 space-y-5 max-h-[85vh] flex flex-col cursor-default"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Customize Server Gauges</h3>
              <p className="text-xs text-slate-400">Configure which metrics and status pills are visible per server node</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto space-y-4 pr-1 flex-1">
          {nodeItems.map((item) => {
            const currentGauges = serverGauges[item.id] || {};
            return (
              <div
                key={item.id}
                className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-slate-200">{item.name}</h4>
                    <p className="text-[11px] font-mono text-slate-500">{item.sub}</p>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                    {item.id}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {item.availableGauges.map((g) => {
                    const isChecked = (currentGauges as any)[g.key] !== false;
                    return (
                      <button
                        key={g.key}
                        type="button"
                        onClick={() => onToggleGauge(item.id, g.key)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono transition-all border ${
                          isChecked
                            ? 'bg-red-500/15 border-red-500/40 text-red-300 shadow-[0_0_8px_rgba(239,68,68,0.2)]'
                            : 'bg-slate-800/60 border-slate-700/60 text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isChecked ? 'bg-red-400' : 'bg-slate-600'}`} />
                        <span>{g.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 shrink-0">
          <button
            type="button"
            onClick={onResetGauges}
            className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Reset All to Default
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-500 text-white shadow-[0_0_12px_rgba(239,68,68,0.4)] transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

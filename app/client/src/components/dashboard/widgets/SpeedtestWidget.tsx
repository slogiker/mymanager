import React from 'react';
import { Wifi, ArrowDown, ArrowUp, RefreshCw, Activity, CheckCircle2 } from 'lucide-react';
import { SpeedtestResult } from '../../../types';

export interface SpeedtestWidgetProps {
  speedtest?: SpeedtestResult | null;
  onRunSpeedtest?: () => void;
  isRunningSpeedtest?: boolean;
}

function timeAgo(dateString?: string): string {
  if (!dateString) return 'never';
  const sec = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

export function SpeedtestWidget({
  speedtest,
  onRunSpeedtest,
  isRunningSpeedtest = false,
}: SpeedtestWidgetProps) {
  const isRunning = isRunningSpeedtest || speedtest?.isRunning;
  const dl = speedtest?.downloadMbps ?? 0;
  const ul = speedtest?.uploadMbps ?? 0;
  const ping = speedtest?.pingMs ?? 0;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-gradient-to-br from-[#16181f]/90 to-[#12131a]/90 p-5 shadow-xl backdrop-blur-md flex flex-col justify-between">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Wifi className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Internet Speed
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRunSpeedtest}
            disabled={isRunning}
            className={`p-1.5 rounded-lg border text-xs font-mono transition-all flex items-center gap-1 ${
              isRunning
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 cursor-not-allowed'
                : 'bg-slate-900/80 hover:bg-slate-800 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            title="Run speed test"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin text-emerald-400' : ''}`} />
            <span className="text-[10px] font-semibold">{isRunning ? 'Testing' : 'Test'}</span>
          </button>
        </div>
      </div>

      {/* Main Speeds Display */}
      <div className="py-3 space-y-3">
        {isRunning ? (
          <div className="py-4 text-center space-y-2">
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-500 via-cyan-400 to-emerald-500 h-full w-full animate-pulse" />
            </div>
            <p className="text-xs text-emerald-400 font-mono font-medium animate-pulse">
              Benchmarking WAN link speed...
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {/* Download */}
            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/60">
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 mb-0.5">
                <ArrowDown className="w-3 h-3 text-emerald-400" />
                <span>DOWNLOAD</span>
              </div>
              <div className="flex items-baseline gap-1 font-mono">
                <span className="text-2xl font-bold tracking-tight text-white">
                  {dl > 0 ? dl.toFixed(1) : '-'}
                </span>
                <span className="text-[10px] text-slate-500 font-semibold">Mbps</span>
              </div>
            </div>

            {/* Upload */}
            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/60">
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 mb-0.5">
                <ArrowUp className="w-3 h-3 text-cyan-400" />
                <span>UPLOAD</span>
              </div>
              <div className="flex items-baseline gap-1 font-mono">
                <span className="text-2xl font-bold tracking-tight text-white">
                  {ul > 0 ? ul.toFixed(1) : '-'}
                </span>
                <span className="text-[10px] text-slate-500 font-semibold">Mbps</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer: Ping Latency & Tested Time */}
      <div className="pt-3 border-t border-slate-800/50 flex items-center justify-between text-[11px] font-mono text-slate-500">
        <span className="flex items-center gap-1.5">
          <Activity className="w-3 h-3 text-emerald-400" />
          <span>Ping:</span>
          <span className="text-slate-300 font-semibold">{ping > 0 ? `${ping} ms` : '-'}</span>
        </span>
        <span className="text-slate-400" title={speedtest?.timestamp}>
          {timeAgo(speedtest?.timestamp)}
        </span>
      </div>
    </div>
  );
}

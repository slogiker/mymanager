import React from 'react';
import { Wifi, ArrowDown, ArrowUp, RefreshCw, Activity } from 'lucide-react';
import { SpeedtestResult } from '../../../types';

export interface SpeedtestWidgetProps {
  speedtest?: SpeedtestResult | null;
  onRunSpeedtest?: () => void;
  isRunningSpeedtest?: boolean;
  colSpan?: number;
  rowSpan?: number;
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
  colSpan = 2,
  rowSpan = 1,
}: SpeedtestWidgetProps) {
  const isRunning = isRunningSpeedtest || speedtest?.isRunning;
  const dl = speedtest?.downloadMbps ?? 0;
  const ul = speedtest?.uploadMbps ?? 0;
  const ping = speedtest?.pingMs ?? 0;
  const server = speedtest?.server || 'Cloudflare';
  const progressPct = speedtest?.progressPct || 0;
  const phase = speedtest?.phase || (isRunning ? 'benchmarking' : 'idle');
  const elapsedSec = speedtest?.elapsedSec || 0;

  const isCompact = colSpan === 1 && rowSpan === 1;
  const isExpandedTall = rowSpan >= 2;
  const isExpandedWide = colSpan >= 3;

  // 1x1 Compact Representation
  if (isCompact) {
    return (
      <div className="flex flex-col justify-between h-full p-2.5">
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
              <Wifi className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] font-bold text-slate-200 truncate">Speed</span>
          </div>

          <button
            type="button"
            onClick={onRunSpeedtest}
            disabled={isRunning}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
            title="Run speed test"
          >
            <RefreshCw className={`w-3 h-3 ${isRunning ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>

        <div className="flex items-center justify-between text-[10px] font-mono">
          <span className="text-slate-500">{ping > 0 ? `${ping}ms` : '-'}</span>
          <span className="text-emerald-400 font-bold truncate">
            {isRunning ? '10s...' : dl > 0 ? `↓ ${dl.toFixed(0)}M` : '-'}
          </span>
        </div>
      </div>
    );
  }

  // 4x2 or 3x2 Wide Hero Representation
  if (isExpandedWide && isExpandedTall) {
    return (
      <div className="flex flex-col justify-between h-full p-3.5 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Wifi className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  WAN Speed & Latency
                </span>
                <span className="inline-flex items-center gap-1 text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  10s Benchmark
                </span>
              </div>
              <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                Target: {server}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onRunSpeedtest}
            disabled={isRunning}
            className={`px-3 py-1.5 rounded-xl border text-xs font-mono transition-all flex items-center gap-1.5 ${
              isRunning
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 cursor-not-allowed'
                : 'bg-slate-900/80 hover:bg-slate-800 border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin text-emerald-400' : ''}`} />
            <span>{isRunning ? 'Testing (10s)...' : 'Run Test'}</span>
          </button>
        </div>

        {isRunning ? (
          <div className="py-4 text-center space-y-2 flex-1 flex flex-col justify-center">
            <div className="flex items-center justify-between text-xs font-mono text-emerald-400 mb-1">
              <span className="capitalize">{phase} phase...</span>
              <span>{progressPct}% ({elapsedSec.toFixed(1)}s)</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-emerald-500 to-cyan-400 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.max(5, progressPct)}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 flex-1 items-center">
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/60">
              <div className="flex items-center gap-1 text-[10px] font-mono text-slate-400 mb-1">
                <ArrowDown className="w-3.5 h-3.5 text-emerald-400" />
                <span>DOWNLOAD</span>
              </div>
              <div className="flex items-baseline gap-1 font-mono">
                <span className="text-2xl font-bold text-white">{dl > 0 ? dl.toFixed(1) : '-'}</span>
                <span className="text-[10px] text-slate-500 font-semibold">Mbps</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/60">
              <div className="flex items-center gap-1 text-[10px] font-mono text-slate-400 mb-1">
                <ArrowUp className="w-3.5 h-3.5 text-cyan-400" />
                <span>UPLOAD</span>
              </div>
              <div className="flex items-baseline gap-1 font-mono">
                <span className="text-2xl font-bold text-white">{ul > 0 ? ul.toFixed(1) : '-'}</span>
                <span className="text-[10px] text-slate-500 font-semibold">Mbps</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/60">
              <div className="flex items-center gap-1 text-[10px] font-mono text-slate-400 mb-1">
                <Activity className="w-3.5 h-3.5 text-amber-400" />
                <span>PING / JITTER</span>
              </div>
              <div className="flex items-baseline gap-1 font-mono">
                <span className="text-2xl font-bold text-white">{ping > 0 ? ping : '-'}</span>
                <span className="text-[10px] text-slate-500 font-semibold">ms</span>
              </div>
            </div>
          </div>
        )}

        <div className="pt-2 border-t border-slate-800/50 flex items-center justify-between text-[10px] font-mono text-slate-500">
          <span>Server: {server}</span>
          <span>Last tested: {timeAgo(speedtest?.timestamp)}</span>
        </div>
      </div>
    );
  }

  // 2x2 Double Height Representation
  if (isExpandedTall) {
    return (
      <div className="flex flex-col justify-between h-full p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
              <Wifi className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200">Speedtest</span>
              <div className="text-[10px] font-mono text-slate-500 truncate max-w-[120px]">{server}</div>
            </div>
          </div>

          <button
            type="button"
            onClick={onRunSpeedtest}
            disabled={isRunning}
            className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-xs font-mono text-slate-300 hover:text-white transition-colors"
            title="Run speed test"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>

        {isRunning ? (
          <div className="py-3 text-center space-y-2 flex-1 flex flex-col justify-center">
            <p className="text-[11px] text-emerald-400 font-mono animate-pulse capitalize">
              {phase}... ({elapsedSec.toFixed(0)}s)
            </p>
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.max(5, progressPct)}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 flex-1 items-center">
            <div className="p-2 rounded-lg bg-slate-900/50 border border-slate-800/60">
              <div className="flex items-center gap-1 text-[9px] font-mono text-slate-400">
                <ArrowDown className="w-3 h-3 text-emerald-400" />
                <span>DOWN</span>
              </div>
              <div className="flex items-baseline gap-1 font-mono mt-0.5">
                <span className="text-lg font-bold text-white">{dl > 0 ? dl.toFixed(0) : '-'}</span>
                <span className="text-[9px] text-slate-500">Mbps</span>
              </div>
            </div>

            <div className="p-2 rounded-lg bg-slate-900/50 border border-slate-800/60">
              <div className="flex items-center gap-1 text-[9px] font-mono text-slate-400">
                <ArrowUp className="w-3 h-3 text-cyan-400" />
                <span>UP</span>
              </div>
              <div className="flex items-baseline gap-1 font-mono mt-0.5">
                <span className="text-lg font-bold text-white">{ul > 0 ? ul.toFixed(0) : '-'}</span>
                <span className="text-[9px] text-slate-500">Mbps</span>
              </div>
            </div>
          </div>
        )}

        <div className="pt-1.5 border-t border-slate-800/40 flex items-center justify-between text-[10px] font-mono text-slate-500">
          <span>Ping: {ping > 0 ? `${ping}ms` : '-'}</span>
          <span>{timeAgo(speedtest?.timestamp)}</span>
        </div>
      </div>
    );
  }

  // 2x1 Standard Representation (Default Flat Card Style)
  return (
    <div className="flex flex-col justify-between h-full p-2.5 space-y-1">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 pr-1">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
            <Wifi className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-xs text-slate-100 group-hover:text-emerald-400 transition-colors truncate flex items-center gap-1.5">
              <span>Internet Speed</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            </div>
            <span className="text-[10px] font-mono text-slate-500 truncate block">
              {server} · {ping > 0 ? `${ping}ms` : '-'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onRunSpeedtest}
            disabled={isRunning}
            className={`p-1 px-2 rounded-lg border text-[10px] font-mono transition-all flex items-center gap-1 ${
              isRunning
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 cursor-not-allowed'
                : 'bg-slate-900/80 hover:bg-slate-800 border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white'
            }`}
            title="Run 10-second benchmark"
          >
            <RefreshCw className={`w-3 h-3 ${isRunning ? 'animate-spin text-emerald-400' : ''}`} />
            <span>{isRunning ? '10s' : 'Test'}</span>
          </button>
        </div>
      </div>

      {isRunning ? (
        <div className="space-y-0.5">
          <div className="flex items-center justify-between text-[9px] font-mono text-emerald-400">
            <span className="capitalize">{phase}...</span>
            <span>{progressPct}% ({elapsedSec.toFixed(0)}s)</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1 overflow-hidden">
            <div
              className="bg-gradient-to-r from-emerald-500 to-cyan-400 h-full rounded-full transition-all duration-300"
              style={{ width: `${Math.max(5, progressPct)}%` }}
            />
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between text-[11px] font-mono">
          <span className="text-emerald-400 font-bold flex items-center gap-1">
            <ArrowDown className="w-3 h-3" />
            {dl > 0 ? `${dl.toFixed(1)}M` : '-'}
          </span>
          <span className="text-slate-600">·</span>
          <span className="text-cyan-300 font-bold flex items-center gap-1">
            <ArrowUp className="w-3 h-3" />
            {ul > 0 ? `${ul.toFixed(1)}M` : '-'}
          </span>
          <span className="text-slate-500 text-[10px]">{timeAgo(speedtest?.timestamp)}</span>
        </div>
      )}
    </div>
  );
}

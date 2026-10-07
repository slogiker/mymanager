import React from 'react';
import { Server, HardDrive, Cpu, Thermometer, Fan, Sparkles } from 'lucide-react';
import { ServerNode } from '../../../types';

export interface ServerNodeWidgetProps {
  node: ServerNode;
  serverGauges?: Record<string, boolean>;
  colSpan?: number;
  rowSpan?: number;
  clientPing?: number | null;
  onOpenPironman?: () => void;
}

export function ServerNodeWidget({
  node,
  serverGauges = {},
  colSpan = 2,
  rowSpan = 1,
  clientPing,
  onOpenPironman,
}: ServerNodeWidgetProps) {
  const isOnline = node.status === 'online';
  const isPironman =
    node.id.includes('136') ||
    node.name.toLowerCase().includes('pironman') ||
    node.name.toLowerCase().includes('pi 5');
  const isNas =
    node.id.includes('41') ||
    node.name.toLowerCase().includes('storage') ||
    node.name.toLowerCase().includes('nas');

  const safeNum = (v: any): number | null => {
    if (v === null || v === undefined) return null;
    if (typeof v === 'number') return Number.isFinite(v) ? Math.round(v) : null;
    const s = String(v).trim();
    if (!s || s === 'N/A' || s === 'NaN' || s === '-') return null;
    const match = s.match(/(\d+(\.\d+)?)/);
    if (!match) return null;
    const parsed = parseFloat(match[1]);
    return Number.isFinite(parsed) ? Math.round(parsed) : null;
  };

  const cpuUsage = node.cpu?.load ? safeNum(node.cpu.load) : null;
  const ramUsage = node.memory?.percent !== undefined ? safeNum(node.memory.percent) : null;
  const tempVal = node.temperature && node.temperature !== 'N/A' ? safeNum(node.temperature) : null;
  const diskUsage = node.disk?.percent !== undefined ? safeNum(node.disk.percent) : null;

  const showCpu = serverGauges.cpu !== false && cpuUsage !== null;
  const showRam = serverGauges.ram !== false && ramUsage !== null;
  const showTemp = serverGauges.temp !== false && tempVal !== null;
  const showFan = serverGauges.fan !== false && Boolean(node.fanSpeed);
  const showDisk = serverGauges.storage !== false && Boolean(node.disk);
  const showPing = serverGauges.ping !== false;

  const isCompact = colSpan === 1 && rowSpan === 1;
  const isExpandedTall = rowSpan >= 2;
  const isExpandedWide = colSpan >= 3;

  // Icon selector
  const NodeIcon = isNas ? HardDrive : isPironman ? Server : Cpu;
  const iconColor = isPironman
    ? 'text-red-400 bg-red-500/10 border-red-500/20'
    : isNas
    ? 'text-sky-400 bg-sky-500/10 border-sky-500/20'
    : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';

  // 1x1 Compact Representation
  if (isCompact) {
    return (
      <div className="flex flex-col justify-between h-full p-2.5">
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className={`p-1 rounded-lg border shrink-0 ${iconColor}`}>
              <NodeIcon className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] font-bold text-slate-200 truncate">
              {node.name.replace(/Raspberry|Compute|System|Storage/g, '').trim() || node.name}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {isPironman && onOpenPironman && (
              <button
                type="button"
                data-no-drag="true"
                onClick={onOpenPironman}
                className="p-0.5 rounded text-red-400 hover:text-white"
                title="Pironman RGB"
              >
                <Sparkles className="w-3 h-3" />
              </button>
            )}
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
              }`}
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-[10px] font-mono">
          <span className="text-slate-500">{node.ip}</span>
          <span className="text-slate-300 font-bold truncate">
            {cpuUsage !== null
              ? `${cpuUsage}%`
              : node.disk?.free
              ? `${node.disk.free} free`
              : isOnline
              ? 'Online'
              : 'Offline'}
            {tempVal !== null ? ` · ${tempVal}°` : ''}
          </span>
        </div>
      </div>
    );
  }

  // 4x2 or Wide Hero Representation
  if (isExpandedWide && isExpandedTall) {
    return (
      <div className="flex flex-col justify-between h-full p-3.5 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl border ${iconColor}`}>
              <NodeIcon className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  {node.name}
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
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
              <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                {node.ip} {node.role ? `· ${node.role}` : ''}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            {isPironman && onOpenPironman && (
              <button
                type="button"
                data-no-drag="true"
                onClick={onOpenPironman}
                className="px-2 py-1 rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-white flex items-center gap-1 text-[11px] font-semibold transition-colors"
                title="Configure Pironman Case RGB & LEDs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Case RGB</span>
              </button>
            )}
            {clientPing !== null && clientPing !== undefined && (
              <span className="text-slate-400 bg-slate-900/80 px-2 py-1 rounded-lg border border-slate-800">
                RTT: {clientPing}ms
              </span>
            )}
            {node.uptime && (
              <span className="text-slate-400 bg-slate-900/80 px-2 py-1 rounded-lg border border-slate-800">
                Up: {node.uptime}
              </span>
            )}
          </div>
        </div>

        {/* Multi-gauge grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 flex-1 items-center">
          {showCpu && (
            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/70 space-y-1">
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span className="flex items-center gap-1">
                  <Cpu className="w-3 h-3 text-red-400" /> CPU
                </span>
                <span className="text-white font-bold">{cpuUsage ?? 0}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-red-500 h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, Math.max(0, cpuUsage ?? 0))}%` }}
                />
              </div>
            </div>
          )}

          {showRam && (
            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/70 space-y-1">
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span>RAM</span>
                <span className="text-white font-bold">{ramUsage ?? 0}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-sky-500 h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, Math.max(0, ramUsage ?? 0))}%` }}
                />
              </div>
            </div>
          )}

          {showTemp && (
            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/70 space-y-1">
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span className="flex items-center gap-1">
                  <Thermometer className="w-3 h-3 text-amber-400" /> Thermal
                </span>
                <span className="text-white font-bold">{tempVal ? `${tempVal}°C` : '-'}</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, Math.max(0, ((tempVal ?? 30) - 30) * 2))}%` }}
                />
              </div>
            </div>
          )}

          {showFan && (
            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/70 space-y-1">
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span className="flex items-center gap-1">
                  <Fan className="w-3 h-3 text-cyan-400 animate-spin" /> Cooler
                </span>
                <span className="text-white font-bold">{node.fanSpeed}</span>
              </div>
              <div className="text-[10px] font-mono text-slate-500">Active Fan Cooling</div>
            </div>
          )}

          {showDisk && node.disk && (
            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/70 space-y-1 col-span-2">
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span className="flex items-center gap-1">
                  <HardDrive className="w-3 h-3 text-emerald-400" />
                  {node.disk.poolName || 'Storage Pool'}
                </span>
                <span className="text-white font-bold">
                  {node.disk.free ? `${node.disk.free} free` : `${node.disk.used} / ${node.disk.total}`}
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, Math.max(0, diskUsage ?? 0))}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="pt-2 border-t border-slate-800/50 flex items-center justify-between text-[10px] font-mono text-slate-500">
          <span>IP: {node.ip}</span>
          <span>Status: {isOnline ? 'Active' : 'Offline'}</span>
        </div>
      </div>
    );
  }

  // 2x2 Double Height Representation
  if (isExpandedTall) {
    return (
      <div className="flex flex-col justify-between h-full p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`p-1.5 rounded-lg border shrink-0 ${iconColor}`}>
              <NodeIcon className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-xs text-slate-100 truncate flex items-center gap-1.5">
                <span>{node.name}</span>
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                  }`}
                />
              </div>
              <span className="text-[10px] font-mono text-slate-500 truncate block">
                {node.ip}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {isPironman && onOpenPironman && (
              <button
                type="button"
                data-no-drag="true"
                onClick={onOpenPironman}
                className="p-1 rounded-md text-red-400 hover:text-white bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 transition-colors"
                title="Pironman RGB"
              >
                <Sparkles className="w-3 h-3" />
              </button>
            )}
            <span
              className={`text-[9px] font-mono px-2 py-0.5 rounded-full border ${
                isOnline
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
              }`}
            >
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>

        {/* Middle gauges */}
        <div className="space-y-1.5 flex-1 justify-center flex flex-col">
          {showCpu && (
            <div className="space-y-0.5">
              <div className="flex items-center justify-between text-[9px] font-mono text-slate-400">
                <span>CPU Load</span>
                <span className="text-white font-bold">{cpuUsage ?? 0}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1 overflow-hidden">
                <div
                  className="bg-red-500 h-full rounded-full"
                  style={{ width: `${cpuUsage ?? 0}%` }}
                />
              </div>
            </div>
          )}

          {showRam && (
            <div className="space-y-0.5">
              <div className="flex items-center justify-between text-[9px] font-mono text-slate-400">
                <span>Memory</span>
                <span className="text-white font-bold">{ramUsage ?? 0}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1 overflow-hidden">
                <div
                  className="bg-sky-500 h-full rounded-full"
                  style={{ width: `${ramUsage ?? 0}%` }}
                />
              </div>
            </div>
          )}

          {showDisk && node.disk && (
            <div className="space-y-0.5">
              <div className="flex items-center justify-between text-[9px] font-mono text-slate-400">
                <span>{node.disk.poolName || 'Disk'}</span>
                <span className="text-white font-bold">
                  {node.disk.free ? `${node.disk.free} left` : `${node.disk.used} / ${node.disk.total}`}
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full"
                  style={{ width: `${diskUsage ?? 0}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="pt-1.5 border-t border-slate-800/40 flex items-center justify-between text-[10px] font-mono text-slate-400">
          <span>{tempVal ? `${tempVal}°C` : '-'}</span>
          <span>{node.fanSpeed ? node.fanSpeed : clientPing ? `${clientPing}ms` : 'Active'}</span>
        </div>
      </div>
    );
  }

  // 2x1 Standard Representation (Default Flat Card Style)
  return (
    <div className="flex flex-col justify-between h-full p-2.5 space-y-1">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 pr-1">
          <div className={`p-1.5 rounded-lg border shrink-0 ${iconColor}`}>
            <NodeIcon className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-xs text-slate-100 group-hover:text-red-400 transition-colors truncate flex items-center gap-1.5">
              <span>{node.name}</span>
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                }`}
              />
            </div>
            <span className="text-[10px] font-mono text-slate-500 truncate block">
              {node.ip}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {isPironman && onOpenPironman && (
            <button
              type="button"
              data-no-drag="true"
              onClick={onOpenPironman}
              className="p-1 rounded-md text-red-400 hover:text-white bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 transition-colors"
              title="Configure Pironman Case RGB & LEDs"
            >
              <Sparkles className="w-3 h-3" />
            </button>
          )}
          <span
            className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full border ${
              isOnline
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
            }`}
          >
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>

      <div className="pt-1 border-t border-slate-800/40 flex items-center justify-between text-[10px] font-mono">
        <div className="flex items-center gap-2 text-slate-300 truncate">
          {showCpu && cpuUsage !== null && (
            <span className="text-red-400 font-semibold">CPU: {cpuUsage}%</span>
          )}
          {showRam && ramUsage !== null && (
            <span className="text-sky-300 font-semibold">RAM: {ramUsage}%</span>
          )}
          {showDisk && node.disk && (
            <span className="text-emerald-400 font-semibold">
              {node.disk.free ? `${node.disk.free} left` : node.disk.used || 'Storage'}
            </span>
          )}
          {!showCpu && !showRam && !showDisk && (
            <span className="text-slate-400 font-semibold">{isOnline ? 'Active' : 'Offline'}</span>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-slate-400 shrink-0">
          {showTemp && tempVal !== null && (
            <span className="text-amber-300">{tempVal}°C</span>
          )}
          {showFan && node.fanSpeed && (
            <span className="text-cyan-300">{node.fanSpeed}</span>
          )}
          {showPing && clientPing !== null && clientPing !== undefined && (
            <span className="text-slate-500">{clientPing}ms</span>
          )}
        </div>
      </div>
    </div>
  );
}

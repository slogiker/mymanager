import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export interface TimeWidgetProps {
  uptime?: string;
  colSpan?: number;
  rowSpan?: number;
}

export function TimeWidget({ uptime, colSpan = 2, rowSpan = 1 }: TimeWidgetProps) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = time.getHours().toString().padStart(2, '0');
  const minutes = time.getMinutes().toString().padStart(2, '0');
  const seconds = time.getSeconds().toString().padStart(2, '0');
  const dateStr = time.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const fullDateStr = time.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  const isCompact = colSpan === 1 && rowSpan === 1;
  const isExpandedTall = rowSpan >= 2;

  // 1x1 Compact Representation
  if (isCompact) {
    return (
      <div className="flex flex-col justify-between h-full p-2.5">
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="p-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 shrink-0">
              <Clock className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] font-bold text-slate-200 truncate">Time</span>
          </div>
          <span className="text-[9px] font-mono text-slate-500">{dateStr}</span>
        </div>

        <div className="flex items-baseline justify-between font-mono">
          <span className="text-base font-bold text-white tracking-tight">{hours}:{minutes}</span>
          <span className="text-[10px] text-red-400 font-semibold">:{seconds}</span>
        </div>
      </div>
    );
  }

  // 2x2 or 4x2 Expanded Representation
  if (isExpandedTall) {
    return (
      <div className="flex flex-col justify-between h-full p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 shrink-0">
              <Clock className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200">Local Clock</span>
              <div className="text-[10px] font-mono text-slate-500">{timeZone}</div>
            </div>
          </div>
          <span className="text-[10px] font-mono text-slate-400 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">
            Active
          </span>
        </div>

        <div className="py-2 text-center flex-1 flex flex-col justify-center">
          <div className="flex items-baseline justify-center gap-1 font-mono">
            <span className="text-3xl font-extrabold text-white tracking-tight">{hours}:{minutes}</span>
            <span className="text-lg font-bold text-red-400">:{seconds}</span>
          </div>
          <div className="text-xs text-slate-400 mt-1 font-medium">{fullDateStr}</div>
        </div>

        <div className="pt-1.5 border-t border-slate-800/40 flex items-center justify-between text-[10px] font-mono text-slate-500">
          <span>Host Uptime</span>
          <span className="text-slate-300 font-semibold">{uptime || '-'}</span>
        </div>
      </div>
    );
  }

  // 2x1 Standard Representation (Default Flat Card Style)
  return (
    <div className="flex flex-col justify-between h-full p-2.5 space-y-1">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 pr-1">
          <div className="p-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 shrink-0">
            <Clock className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-xs text-slate-100 group-hover:text-red-400 transition-colors truncate flex items-center gap-1.5">
              <span>Local Time</span>
            </div>
            <span className="text-[10px] font-mono text-slate-500 truncate block">
              {timeZone}
            </span>
          </div>
        </div>

        <div className="text-right shrink-0 font-mono">
          <span className="text-sm font-bold text-white tracking-tight">{hours}:{minutes}</span>
          <span className="text-[11px] text-red-400 font-semibold">:{seconds}</span>
        </div>
      </div>

      <div className="pt-1 border-t border-slate-800/40 flex items-center justify-between text-[10px] font-mono text-slate-400">
        <span className="truncate">{dateStr}</span>
        <span className="text-slate-500">Up: {uptime || '-'}</span>
      </div>
    </div>
  );
}

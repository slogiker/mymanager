import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export interface TimeWidgetProps {
  uptime?: string;
}

export function TimeWidget({ uptime }: TimeWidgetProps) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = time.getHours().toString().padStart(2, '0');
  const minutes = time.getMinutes().toString().padStart(2, '0');
  const seconds = time.getSeconds().toString().padStart(2, '0');
  const dateStr = time.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-gradient-to-br from-[#16181f]/90 to-[#12131a]/90 p-5 shadow-xl backdrop-blur-md flex flex-col justify-between">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
            <Clock className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Local Time</span>
        </div>
        <span className="text-[10px] font-mono text-slate-500 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">
          {Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'}
        </span>
      </div>
      <div className="py-3">
        <div className="flex items-baseline gap-1 font-mono">
          <span className="text-3xl font-extrabold tracking-tight text-white">{hours}:{minutes}</span>
          <span className="text-lg font-bold text-red-400">:{seconds}</span>
        </div>
        <div className="mt-1 text-xs text-slate-400 font-medium">
          {dateStr}
        </div>
      </div>
      <div className="pt-3 border-t border-slate-800/50 flex items-center justify-between text-[11px] font-mono text-slate-500">
        <span>Host Uptime</span>
        <span className="text-slate-300 font-semibold">{uptime || '-'}</span>
      </div>
    </div>
  );
}

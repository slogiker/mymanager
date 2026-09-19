import { useState, useEffect } from 'react';
import { AnalyticsSummary } from '../../../types';
import { api } from '../../../lib/api';
import { ErrBox, Spinner } from '../common/DashboardPrimitives';

export interface DayChartEntry {
  date: string;
  views: number;
  visitors: number;
}

export function DayChart({ data, days }: { data: DayChartEntry[] | null | undefined; days: number }) {
  if (!data || data.length === 0) {
    return <div className="p-8 text-center text-slate-500 text-xs border border-slate-800 rounded-xl">No analytics recorded yet</div>;
  }

  const maxViews = Math.max(...data.map(d => d.views), 1);
  const width = 700;
  const height = 160;
  const paddingX = 20;
  const paddingY = 15;

  const pointsViews = data.map((d, i) => {
    const x = paddingX + (i / (data.length - 1 || 1)) * (width - paddingX * 2);
    const y = height - paddingY - (d.views / maxViews) * (height - paddingY * 2);
    return `${x},${y}`;
  });

  const pointsVisitors = data.map((d, i) => {
    const x = paddingX + (i / (data.length - 1 || 1)) * (width - paddingX * 2);
    const y = height - paddingY - (d.visitors / maxViews) * (height - paddingY * 2);
    return `${x},${y}`;
  });

  const viewsPath = pointsViews.join(' ');
  const visitorsPath = pointsVisitors.join(' ');
  const viewsArea = `${paddingX},${height - paddingY} ${viewsPath} ${width - paddingX},${height - paddingY}`;
  const visitorsArea = `${paddingX},${height - paddingY} ${visitorsPath} ${width - paddingX},${height - paddingY}`;

  return (
    <div className="p-5 rounded-xl border border-slate-800 bg-[#16181f]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Traffic Trend</h3>
          <p className="text-[11px] text-slate-500">Pageviews & unique visitors over the last {days} days</p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5 text-red-400 font-mono">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            Views
          </span>
          <span className="flex items-center gap-1.5 text-slate-400 font-mono">
            <span className="w-2 h-2 rounded-full bg-slate-500" />
            Visitors
          </span>
        </div>
      </div>

      <div className="relative w-full overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible" preserveAspectRatio="none">
          <defs>
            <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="visitorsGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#94a3b8" stopOpacity="0" />
            </linearGradient>
          </defs>

          <polygon points={viewsArea} fill="url(#viewsGrad)" />
          <polygon points={visitorsArea} fill="url(#visitorsGrad)" />

          <polyline points={viewsPath} fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <polyline points={visitorsPath} fill="none" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <div className="flex justify-between text-[10px] text-slate-500 mt-2 font-mono px-1">
        <span>{data[0]?.date?.slice(5)}</span>
        <span>{data[Math.floor(data.length / 2)]?.date?.slice(5)}</span>
        <span>{data[data.length - 1]?.date?.slice(5)}</span>
      </div>
    </div>
  );
}

export function AnalyticsTab() {
  const [days, setDays] = useState<number>(30);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    setLoading(true);
    setError('');
    api.get<AnalyticsSummary>(`/analytics/summary?days=${days}`)
      .then(setSummary)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [days]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Visitors & Views</h2>
        <div className="flex gap-1 bg-[#17181e] p-1 rounded-xl border border-slate-800">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-semibold transition-colors ${
                days === d ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      <ErrBox msg={error} />

      {loading ? <Spinner /> : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-xl border border-slate-800 bg-[#16181f]">
              <p className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">Total Views</p>
              <p className="text-3xl font-black text-slate-100 mt-1">{summary?.totalViews ?? 0}</p>
            </div>
            <div className="p-5 rounded-xl border border-slate-800 bg-[#16181f]">
              <p className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">Unique Visitors</p>
              <p className="text-3xl font-black text-slate-100 mt-1">{summary?.uniqueVisitors ?? 0}</p>
            </div>
          </div>

          <DayChart data={summary?.byDay} days={days} />
        </>
      )}
    </div>
  );
}

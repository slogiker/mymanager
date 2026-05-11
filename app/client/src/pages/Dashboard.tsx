import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import { api } from '../lib/api';
import { SystemStats, Message } from '../types';

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  percent?: number;
  color?: 'blue' | 'purple' | 'emerald' | 'orange';
}

function StatCard({ label, value, sub, percent, color = 'blue' }: StatCardProps) {
  const bar: Record<string, string> = { blue: 'bg-blue-500', purple: 'bg-purple-500', emerald: 'bg-emerald-500', orange: 'bg-orange-500' };
  return (
    <div className="card p-5">
      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-bold text-slate-100 mb-1">{value}</p>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
      {percent !== undefined && (
        <div className="mt-3">
          <div className="flex justify-between text-xs text-slate-500 mb-1"><span>Used</span><span>{percent}%</span></div>
          <div className="h-1.5 rounded-full bg-slate-700/50">
            <div className={`h-full rounded-full ${bar[color] || bar.blue}`} style={{ width: `${Math.min(percent, 100)}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [unread, setUnread] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    Promise.all([
      api.get<SystemStats>('/system/stats'),
      api.get<Message[]>('/messages?limit=5'),
      api.get<{ count: number }>('/messages/unread-count'),
    ]).then(([s, m, u]) => {
      setStats(s);
      setMessages(m.slice(0, 5));
      setUnread(u.count);
    }).catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-24 pb-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Dashboard</h1>
            <p className="text-slate-500 text-sm mt-1">System overview & quick actions</p>
          </div>
          <Link to="/admin" className="btn-outline text-sm">Admin panel →</Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => <div key={i} className="card h-28 animate-pulse bg-slate-800/40" />)}
          </div>
        ) : stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard label="CPU" value={`${stats.cpu.load}%`} sub={stats.cpu.model} percent={parseFloat(stats.cpu.load)} color="blue" />
            <StatCard label="Memory" value={stats.memory.used} sub={`of ${stats.memory.total}`} percent={stats.memory.percent} color="purple" />
            <StatCard label="Disk" value={stats.disk.used} sub={`of ${stats.disk.total}`} percent={stats.disk.percent} color="emerald" />
            <StatCard label="Temperature" value={stats.temperature} sub={`Uptime: ${stats.uptime}`} color="orange" />
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-200">Messages {unread > 0 && <span className="ml-2 badge bg-red-500/20 text-red-400 border border-red-500/30">{unread} new</span>}</h2>
              <Link to="/admin?tab=messages" className="text-xs text-slate-500 hover:text-slate-300">View all →</Link>
            </div>
            {messages.length === 0 ? (
              <p className="text-slate-500 text-sm">No messages yet.</p>
            ) : (
              <div className="space-y-3">
                {messages.map(m => (
                  <div key={m.id} className={`flex items-start gap-3 p-3 rounded-lg ${!m.read_at ? 'bg-slate-700/30' : ''}`}>
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${!m.read_at ? 'bg-cyan-400' : 'bg-slate-600'}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate">{m.name}</p>
                      <p className="text-xs text-slate-500 truncate">{m.subject || m.content?.slice(0, 60)}</p>
                    </div>
                    <span className="text-xs text-slate-600 flex-shrink-0">{new Date(m.created_at).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card p-5">
            <h2 className="font-semibold text-slate-200 mb-4">Quick links</h2>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Services', href: '/admin?tab=services', icon: '🔌' },
                { label: 'Projects', href: '/admin?tab=projects', icon: '📁' },
                { label: 'Users', href: '/admin?tab=users', icon: '👥' },
                { label: 'Analytics', href: '/admin?tab=analytics', icon: '📊' },
                { label: 'Clipboard', href: '/clipboard', icon: '📋' },
                { label: 'Files', href: '/files', icon: '📂' },
                { label: 'Terminal', href: '/terminal', icon: '⌨️' },
                { label: 'Portfolio', href: '/', icon: '🌐' },
              ].map(l => (
                <Link key={l.label} to={l.href} className="flex items-center gap-2.5 p-3 rounded-lg bg-slate-800/40 hover:bg-slate-700/40 border border-slate-700/30 hover:border-slate-600/50 transition-all text-sm text-slate-300 hover:text-slate-100">
                  <span>{l.icon}</span>{l.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

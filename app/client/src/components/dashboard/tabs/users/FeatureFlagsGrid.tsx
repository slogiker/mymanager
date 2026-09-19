import { useState, useEffect, useMemo } from 'react';
import { RefreshCw, Check, CheckCircle2 } from 'lucide-react';
import { api } from '../../../../lib/api';
import { ErrBox, Spinner } from '../../common/DashboardPrimitives';

export interface FeatureFlagsData {
  users: Array<{ id: number; name: string; username: string; role: string }>;
  featureKeys: string[];
  flags: Array<{ user_id: number; feature_key: string; enabled: number }>;
}

export const FEATURE_META: Record<string, { label: string; desc: string }> = {
  system_telemetry: {
    label: 'System Telemetry & Hardware Nodes',
    desc: 'Access to System category cards, CPU/RAM/Disk gauges, and internal node metrics',
  },
  wireguard_status: {
    label: 'WireGuard VPN Widget & Peer Status',
    desc: 'Access to WireGuard status cards, connection state, and peer transfer inspector',
  },
  pihole_stats: {
    label: 'Pi-hole DNS Statistics',
    desc: 'Access to Pi-hole query rate charts, ad-blocking statistics, and inspector modal',
  },
};

export function FeatureFlagsGrid() {
  const [data, setData] = useState<FeatureFlagsData | null>(null);
  const [flagState, setFlagState] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get<FeatureFlagsData>('/admin/feature-flags');
      setData(res);

      const state: Record<string, boolean> = {};
      const regularUsers = res.users.filter(u => u.role !== 'owner');

      for (const u of regularUsers) {
        for (const k of res.featureKeys) {
          const match = res.flags.find(f => f.user_id === u.id && f.feature_key === k);
          state[`${u.id}_${k}`] = match ? match.enabled === 1 : false;
        }
      }
      setFlagState(state);
    } catch (e) {
      setError((e as Error).message || 'Failed to load feature flags');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggleCell = (userId: number, key: string) => {
    const k = `${userId}_${key}`;
    setFlagState(prev => ({ ...prev, [k]: !prev[k] }));
  };

  const save = async () => {
    if (!data) return;
    setSaving(true);
    setError('');
    setSuccess('');

    const regularUsers = data.users.filter(u => u.role !== 'owner');
    const payload: Array<{ user_id: number; feature_key: string; enabled: number }> = [];

    for (const u of regularUsers) {
      for (const k of data.featureKeys) {
        const key = `${u.id}_${k}`;
        payload.push({
          user_id: u.id,
          feature_key: k,
          enabled: flagState[key] ? 1 : 0,
        });
      }
    }

    try {
      await api.patch('/admin/feature-flags', { flags: payload });
      setSuccess(`Feature flags updated successfully for ${regularUsers.length} users!`);
      setTimeout(() => setSuccess(''), 4000);
    } catch (e) {
      setError((e as Error).message || 'Failed to save feature flags');
    } finally {
      setSaving(false);
    }
  };

  const regularUsers = useMemo(() => {
    if (!data) return [];
    return data.users.filter(u => u.role !== 'owner');
  }, [data]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Per-User Feature Flags UI
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Grant or restrict privileged telemetry, WireGuard, and Pi-hole views for regular homelab accounts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            disabled={loading || saving}
            className="p-2 border border-slate-800 hover:border-slate-700 bg-slate-900/80 rounded-xl text-slate-400 hover:text-white transition-colors"
            title="Refresh feature flags"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={save}
            disabled={saving || loading || regularUsers.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold shadow-[0_0_20px_-5px_rgba(239,68,68,0.5)] transition-all disabled:opacity-50"
          >
            {saving ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Save Feature Flags</span>
              </>
            )}
          </button>
        </div>
      </div>

      <ErrBox msg={error} />

      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {loading ? (
        <Spinner />
      ) : regularUsers.length === 0 ? (
        <div className="p-8 text-center text-slate-500 text-xs rounded-xl border border-slate-800 bg-[#16181f]">
          No regular user accounts exist yet. Create a standard user account to configure custom feature flags.
        </div>
      ) : (
        <div className="rounded-xl border border-slate-800 bg-[#16181f] overflow-x-auto shadow-2xl">
          <table className="min-w-full text-left text-xs font-mono">
            <thead className="bg-slate-900/90 border-b border-slate-800 text-[11px] text-slate-400">
              <tr>
                <th className="p-3 font-semibold min-w-[240px]">Feature Flag</th>
                <th className="p-3 font-semibold font-sans">Description</th>
                {regularUsers.map(u => (
                  <th key={u.id} className="p-3 text-center min-w-[120px]">
                    <span className="text-white font-bold">@{u.username}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {(data?.featureKeys || []).map(key => {
                const meta = FEATURE_META[key] || { label: key, desc: 'Feature flag' };
                return (
                  <tr key={key} className="hover:bg-white/[0.015] transition-colors">
                    <td className="p-3 font-medium text-white">
                      <div className="font-semibold font-mono text-red-400">{key}</div>
                      <div className="text-[11px] text-slate-300 font-sans mt-0.5">{meta.label}</div>
                    </td>
                    <td className="p-3 text-slate-400 font-sans text-xs max-w-md">
                      {meta.desc}
                    </td>
                    {regularUsers.map(u => {
                      const isEnabled = flagState[`${u.id}_${key}`] === true;
                      return (
                        <td key={u.id} className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={isEnabled}
                            onChange={() => toggleCell(u.id, key)}
                            className="w-4 h-4 rounded border-slate-700 bg-slate-900 accent-red-600 cursor-pointer focus:ring-0 focus:ring-offset-0"
                            aria-label={`Toggle ${key} for @${u.username}`}
                          />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

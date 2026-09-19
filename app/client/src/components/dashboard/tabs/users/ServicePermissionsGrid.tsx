import { useState, useEffect, useMemo } from 'react';
import { RefreshCw, Check, CheckCircle2, Search } from 'lucide-react';
import { api } from '../../../../lib/api';
import { ErrBox, Spinner } from '../../common/DashboardPrimitives';

export interface ServicePermissionsData {
  users: Array<{ id: number; name: string; username: string; email: string; role: string }>;
  services: Array<{ id: number; title: string; category: string; icon: string; is_private: boolean; requires_vpn: boolean; display_order: number }>;
  permissions: Array<{ service_id: number; user_id: number; allowed: number }>;
}

export function ServicePermissionsGrid() {
  const [data, setData] = useState<ServicePermissionsData | null>(null);
  const [gridState, setGridState] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedCat, setSelectedCat] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get<ServicePermissionsData>('/admin/service-permissions');
      setData(res);

      const rulesMap = new Map<string, boolean>();
      for (const p of res.permissions) {
        rulesMap.set(`${p.service_id}_${p.user_id}`, p.allowed === 1);
      }

      const state: Record<string, boolean> = {};
      const regularUsers = res.users.filter(u => u.role !== 'owner');
      for (const s of res.services) {
        for (const u of regularUsers) {
          const key = `${s.id}_${u.id}`;
          if (rulesMap.has(key)) {
            state[key] = rulesMap.get(key)!;
          } else {
            state[key] = true;
          }
        }
      }
      setGridState(state);
    } catch (e) {
      setError((e as Error).message || 'Failed to load service permissions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggleCell = (serviceId: number, userId: number) => {
    const key = `${serviceId}_${userId}`;
    setGridState(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleAllForUser = (userId: number) => {
    if (!data) return;
    const allChecked = data.services.every(s => gridState[`${s.id}_${userId}`] === true);
    const nextVal = !allChecked;
    setGridState(prev => {
      const next = { ...prev };
      for (const s of data.services) {
        next[`${s.id}_${userId}`] = nextVal;
      }
      return next;
    });
  };

  const toggleAllForService = (serviceId: number) => {
    if (!data) return;
    const regularUsers = data.users.filter(u => u.role !== 'owner');
    const allChecked = regularUsers.every(u => gridState[`${serviceId}_${u.id}`] === true);
    const nextVal = !allChecked;
    setGridState(prev => {
      const next = { ...prev };
      for (const u of regularUsers) {
        next[`${serviceId}_${u.id}`] = nextVal;
      }
      return next;
    });
  };

  const save = async () => {
    if (!data) return;
    setSaving(true);
    setError('');
    setSuccess('');

    const regularUsers = data.users.filter(u => u.role !== 'owner');
    const payload: Array<{ service_id: number; user_id: number; allowed: number }> = [];

    for (const s of data.services) {
      for (const u of regularUsers) {
        const key = `${s.id}_${u.id}`;
        payload.push({
          service_id: s.id,
          user_id: u.id,
          allowed: gridState[key] ? 1 : 0,
        });
      }
    }

    try {
      await api.patch('/admin/service-permissions', { permissions: payload });
      setSuccess(`Permissions saved successfully for ${regularUsers.length} users and ${data.services.length} services!`);
      setTimeout(() => setSuccess(''), 4000);
    } catch (e) {
      setError((e as Error).message || 'Failed to save permissions');
    } finally {
      setSaving(false);
    }
  };

  const categories = useMemo(() => {
    if (!data) return [];
    return Array.from(new Set(data.services.map(s => s.category?.trim() || 'Services'))).filter(Boolean);
  }, [data]);

  const filteredServices = useMemo(() => {
    if (!data) return [];
    return data.services.filter(s => {
      if (selectedCat !== 'all' && (s.category?.trim() || 'Services') !== selectedCat) return false;
      if (searchQuery.trim() && !s.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [data, selectedCat, searchQuery]);

  const regularUsers = useMemo(() => {
    if (!data) return [];
    return data.users.filter(u => u.role !== 'owner');
  }, [data]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Service Visibility Permissions Grid
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure individual card visibility for non-owner users across the homelab dashboard.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            disabled={loading || saving}
            className="p-2 border border-slate-800 hover:border-slate-700 bg-slate-900/80 rounded-xl text-slate-400 hover:text-white transition-colors"
            title="Refresh permissions"
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
                <span>Save Permissions Matrix</span>
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

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedCat('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              selectedCat === 'all'
                ? 'bg-red-600/20 text-red-400 border border-red-500/40'
                : 'text-slate-400 hover:text-slate-200 border border-slate-800 bg-slate-900/60'
            }`}
          >
            All Categories ({data?.services.length || 0})
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCat(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                selectedCat === cat
                  ? 'bg-red-600/20 text-red-400 border border-red-500/40'
                  : 'text-slate-400 hover:text-slate-200 border border-slate-800 bg-slate-900/60'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search services..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-red-500 transition-colors"
          />
        </div>
      </div>

      {loading ? (
        <Spinner />
      ) : regularUsers.length === 0 ? (
        <div className="p-8 text-center text-slate-500 text-xs rounded-xl border border-slate-800 bg-[#16181f]">
          No regular user accounts exist yet. Create a standard user account to configure custom service visibility.
        </div>
      ) : (
        <div className="rounded-xl border border-slate-800 bg-[#16181f] overflow-x-auto shadow-2xl">
          <table className="min-w-full text-left text-xs font-mono">
            <thead className="bg-slate-900/90 border-b border-slate-800 text-[11px] text-slate-400">
              <tr>
                <th className="p-3 font-semibold min-w-[200px]">Service Card</th>
                <th className="p-3 font-semibold w-32">Category</th>
                {regularUsers.map(u => (
                  <th key={u.id} className="p-3 text-center min-w-[120px]">
                    <div className="flex flex-col items-center">
                      <span className="text-white font-bold">@{u.username}</span>
                      <button
                        type="button"
                        onClick={() => toggleAllForUser(u.id)}
                        className="text-[10px] text-red-400 hover:text-red-300 underline font-normal mt-0.5"
                      >
                        Toggle All
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {filteredServices.map(s => (
                <tr key={s.id} className="hover:bg-white/[0.015] transition-colors">
                  <td className="p-3 font-medium">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleAllForService(s.id)}
                        className="text-left font-semibold text-slate-200 hover:text-red-400 transition-colors"
                        title="Click to toggle for all users"
                      >
                        {s.title}
                      </button>
                      {s.requires_vpn && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                          VPN
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800/80 border border-slate-700/60 text-slate-400">
                      {s.category || 'Services'}
                    </span>
                  </td>
                  {regularUsers.map(u => {
                    const key = `${s.id}_${u.id}`;
                    const isAllowed = gridState[key] !== false;
                    return (
                      <td key={u.id} className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={isAllowed}
                          onChange={() => toggleCell(s.id, u.id)}
                          className="w-4 h-4 rounded border-slate-700 bg-slate-900 accent-red-600 cursor-pointer focus:ring-0 focus:ring-offset-0"
                          aria-label={`Toggle ${s.title} for @${u.username}`}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
              {filteredServices.length === 0 && (
                <tr>
                  <td colSpan={2 + regularUsers.length} className="p-8 text-center text-slate-500">
                    No services match the selected filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

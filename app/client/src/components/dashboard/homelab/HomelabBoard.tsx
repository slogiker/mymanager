import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import {
  Search,
  FolderPlus,
  Sliders,
  RefreshCw,
  Plus,
  LayoutGrid,
  Lock,
  Shield,
  X,
  Server,
  Activity,
  User as UserIcon,
  ChevronDown,
  ChevronRight,
  Check,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Service, ServerNode, SpeedtestResult } from '../../../types';
import { useAuth } from '../../../hooks/useAuth';
import { getUserPreferences, saveUserPreferences, UserPreferences } from '../../../lib/userPreferences';
import { api } from '../../../lib/api';
import { TimeWidget, NotesWidget, MultiServerNodesWidget } from '../widgets';
import { Modal, Field, ErrBox, ServiceIcon } from '../common';
import { SortableCategoryColumn } from './SortableCategoryColumn';

export interface ServiceForm {
  title: string;
  url: string;
  description: string;
  icon: string;
  category: string;
  is_private: boolean;
  requires_vpn: boolean;
}

const SVC_EMPTY: ServiceForm = {
  title: '',
  url: '',
  description: '',
  icon: '',
  category: '',
  is_private: false,
  requires_vpn: false,
};

export interface HomelabBoardProps {
  services: Service[];
  nodes: ServerNode[];
  loadingNodes: boolean;
  speedtest?: SpeedtestResult | null;
  vpnConnected?: boolean;
  onRunSpeedtest?: () => void;
  isRunningSpeedtest?: boolean;
  onUpdateCardLayout?: (updates: Array<{ id: number; start_col: number; start_row: number; col_span: number; row_span: number }>) => void;
  onOpenInspector?: (type: 'wireguard' | 'pihole' | 'qbittorrent' | 'jellyfin' | 'jellyseerr') => void;
  onRefresh: () => void;
}

export function HomelabBoard({
  services,
  nodes,
  loadingNodes,
  speedtest,
  vpnConnected,
  onRunSpeedtest,
  isRunningSpeedtest,
  onUpdateCardLayout,
  onOpenInspector,
  onRefresh,
}: HomelabBoardProps) {
  const { user } = useAuth();
  const [error, setError] = useState<string>('');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string>('');
  const [viewModal, setViewModal] = useState<boolean>(false);
  const [categoryModal, setCategoryModal] = useState<boolean>(false);
  const [newCatName, setNewCatName] = useState<string>('');
  const [renameModal, setRenameModal] = useState<{ open: boolean; oldName: string; newName: string }>({
    open: false,
    oldName: '',
    newName: '',
  });
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState<ServiceForm>(SVC_EMPTY);
  const [testingUrl, setTestingUrl] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    status: 'online' | 'error' | 'offline' | 'timeout';
    statusCode?: number;
    statusText?: string;
    error?: string;
    latency?: string;
  } | null>(null);

  const [vpnNotice, setVpnNotice] = useState<{ title: string; url: string } | null>(null);

  const handleVpnLockedClick = (title: string, url: string) => {
    setVpnNotice({ title, url });
  };

  useEffect(() => {
    if (vpnNotice) {
      const timer = setTimeout(() => setVpnNotice(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [vpnNotice]);

  const [prefs, setPrefs] = useState<UserPreferences>(() => getUserPreferences(user?.id));

  useEffect(() => {
    const onPrefsChange = () => setPrefs(getUserPreferences(user?.id));
    window.addEventListener('mymanager_prefs_changed', onPrefsChange);
    return () => window.removeEventListener('mymanager_prefs_changed', onPrefsChange);
  }, [user?.id]);

  // Extract all categories including custom ones
  const rawCategories = useMemo(() => {
    const set = new Set<string>();
    services.forEach(s => set.add(s.category?.trim() || 'Services'));
    (prefs.customCategories || []).forEach(c => set.add(c.trim()));
    if (set.size === 0) set.add('Services');
    return Array.from(set).filter(Boolean);
  }, [services, prefs.customCategories]);

  // Order categories based on user preferences
  const orderedCategories = useMemo(() => {
    const order = prefs.categoryOrder || [];
    const remaining = rawCategories.filter(c => !order.includes(c));
    const sorted = [...order.filter(c => rawCategories.includes(c)), ...remaining];
    return sorted;
  }, [rawCategories, prefs.categoryOrder]);

  // Drag and drop sensor configuration
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = orderedCategories.indexOf(active.id as string);
    const newIndex = orderedCategories.indexOf(over.id as string);
    if (oldIndex !== -1 && newIndex !== -1) {
      const newOrder = arrayMove(orderedCategories, oldIndex, newIndex);
      const updated = { ...prefs, categoryOrder: newOrder };
      setPrefs(updated);
      saveUserPreferences(user?.id, updated);
    }
  };

  const testUrl = async () => {
    if (!form.url || !form.url.startsWith('http')) {
      setTestResult({
        status: 'offline',
        error: 'Please enter a valid http:// or https:// URL first',
        latency: '0ms',
      });
      return;
    }
    setTestingUrl(true);
    setTestResult(null);
    try {
      const res = await api.post<any>('/services/test', { url: form.url });
      setTestResult(res);
    } catch (e) {
      setTestResult({
        status: 'offline',
        error: (e as Error).message || 'Connection test failed',
        latency: '-',
      });
    } finally {
      setTestingUrl(false);
    }
  };

  const setFormField = (k: keyof ServiceForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value }));

  const openNew = (cat?: string) => {
    setEditing(null);
    setForm({ ...SVC_EMPTY, category: cat || '' });
    setModalError('');
    setTestResult(null);
    setTestingUrl(false);
    setModal(true);
  };

  const openEdit = (s: Service) => {
    setEditing(s);
    setForm({
      title: s.title || '',
      url: s.url || '',
      description: s.description || '',
      icon: s.icon || '',
      category: s.category || '',
      is_private: !!s.is_private,
      requires_vpn: !!s.requires_vpn,
    });
    setModalError('');
    setTestResult(null);
    setTestingUrl(false);
    setModal(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setModalError('');
    try {
      if (editing) await api.put(`/services/${editing.id}`, form);
      else await api.post('/services', form);
      setModal(false);
      setModalError('');
      onRefresh();
    } catch (e) {
      setModalError((e as Error).message);
    }
  };

  const remove = async (id: number) => {
    if (!confirm('Delete service?')) return;
    try {
      await api.delete(`/services/${id}`);
      onRefresh();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleAddCategory = () => {
    if (!newCatName.trim()) return;
    const name = newCatName.trim();
    const updatedCustom = Array.from(new Set([...(prefs.customCategories || []), name]));
    const updatedOrder = [...(prefs.categoryOrder || []), name];
    const updated = { ...prefs, customCategories: updatedCustom, categoryOrder: updatedOrder };
    setPrefs(updated);
    saveUserPreferences(user?.id, updated);
    setNewCatName('');
    setCategoryModal(false);
  };

  const handleRenameCategory = async () => {
    const { oldName, newName } = renameModal;
    if (!newName.trim() || newName === oldName) {
      setRenameModal({ open: false, oldName: '', newName: '' });
      return;
    }
    const trimmed = newName.trim();
    // Update any services that belong to oldName
    const matches = services.filter(s => (s.category?.trim() || 'Services') === oldName);
    for (const s of matches) {
      try {
        await api.put(`/services/${s.id}`, { ...s, category: trimmed });
      } catch (err) {
        console.error(err);
      }
    }
    // Update prefs
    const updatedCustom = (prefs.customCategories || []).map(c => c === oldName ? trimmed : c);
    const updatedOrder = (prefs.categoryOrder || []).map(c => c === oldName ? trimmed : c);
    const updatedWidths = { ...(prefs.categoryWidths || {}) };
    if (updatedWidths[oldName]) {
      updatedWidths[trimmed] = updatedWidths[oldName];
      delete updatedWidths[oldName];
    }
    const updated = { ...prefs, customCategories: updatedCustom, categoryOrder: updatedOrder, categoryWidths: updatedWidths };
    setPrefs(updated);
    saveUserPreferences(user?.id, updated);
    setRenameModal({ open: false, oldName: '', newName: '' });
    onRefresh();
  };

  const toggleCategoryHide = (cat: string) => {
    const isHidden = prefs.hiddenCategories.includes(cat);
    const updatedList = isHidden
      ? prefs.hiddenCategories.filter(c => c !== cat)
      : [...prefs.hiddenCategories, cat];
    const updated = { ...prefs, hiddenCategories: updatedList };
    setPrefs(updated);
    saveUserPreferences(user?.id, updated);
  };

  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const toggleCategoryExpand = (cat: string) => {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const toggleServiceHide = (serviceId: number) => {
    const current = prefs.hiddenServices || [];
    const updated = current.includes(serviceId)
      ? current.filter(id => id !== serviceId)
      : [...current, serviceId];
    const nextPrefs = { ...prefs, hiddenServices: updated };
    setPrefs(nextPrefs);
    saveUserPreferences(user?.id, nextPrefs);
  };

  // Filtered services (respects hiddenServices preference)
  const filteredServices = useMemo(() => {
    return services.filter(s =>
      !prefs.hiddenServices?.includes(s.id) &&
      (
        s.title.toLowerCase().includes(search.toLowerCase()) ||
        (s.description || '').toLowerCase().includes(search.toLowerCase()) ||
        (s.category || '').toLowerCase().includes(search.toLowerCase())
      )
    );
  }, [services, search, prefs.hiddenServices]);

  const hostNode = nodes.find(n => n.id === 'host');

  return (
    <div className="space-y-8">
      {/* Cluster Telemetry Row (Host, 192.168.1.136, 192.168.1.112, 192.168.1.41) */}
      {prefs.widgetVisible?.nodes !== false && (
        <MultiServerNodesWidget
          nodes={nodes}
          loading={loadingNodes}
          speedtest={speedtest}
          serverGauges={prefs.serverGauges}
          onUpdateServerGauges={(updated) => {
            const next = { ...prefs, serverGauges: updated };
            setPrefs(next);
            saveUserPreferences(user?.id, next);
          }}
          isAdmin={user?.role === 'owner'}
          onRunSpeedtest={user?.role === 'owner' ? onRunSpeedtest : undefined}
          isRunningSpeedtest={isRunningSpeedtest}
        />
      )}

      {/* Top Widgets: Time and Quick Notes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {prefs.widgetVisible?.clock !== false && (
          <div className="col-span-1">
            <TimeWidget uptime={hostNode?.uptime} />
          </div>
        )}
        {prefs.widgetVisible?.notes !== false && (
          <div className={prefs.widgetVisible?.clock !== false ? 'col-span-1 md:col-span-2' : 'col-span-1 md:col-span-3'}>
            <NotesWidget />
          </div>
        )}
      </div>

      {/* Search & Grid Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search services or categories..."
            className="w-full pl-10 pr-4 py-2 bg-[#17181e] border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-red-500/50 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          {user?.role === 'owner' && (
            <button
              onClick={() => setCategoryModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-800 hover:border-slate-700 bg-white/[0.02] hover:bg-white/[0.05] text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-colors"
              title="Create a new custom category box"
            >
              <FolderPlus className="w-3.5 h-3.5 text-red-400" />
              <span>Add Category</span>
            </button>
          )}
          <button
            onClick={() => setViewModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-800 hover:border-slate-700 bg-white/[0.02] hover:bg-white/[0.05] text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-colors"
            title="Customize Visible Cards & Widgets"
          >
            <Sliders className="w-3.5 h-3.5 text-red-500" />
            <span>Customize Grid</span>
            {prefs.hiddenCategories.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-red-600/20 text-red-400 border border-red-500/30 font-mono">
                {prefs.hiddenCategories.length} hidden
              </span>
            )}
          </button>
          <button
            onClick={onRefresh}
            className="p-2 text-slate-400 hover:text-white border border-slate-800 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {user?.role === 'owner' && (
            <button
              onClick={() => openNew()}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold shadow-[0_0_20px_-5px_rgba(239,68,68,0.4)] transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Service
            </button>
          )}
        </div>
      </div>

      <ErrBox msg={error} />

      {/* Free-Play Sortable Grid or Empty State */}
      {orderedCategories.length === 0 || !orderedCategories.some(cat => !prefs.hiddenCategories.includes(cat) && (user?.role === 'owner' || filteredServices.some(s => (s.category?.trim() || 'Services') === cat))) ? (
        <div className="py-16 px-6 text-center rounded-2xl border border-slate-800/80 bg-[#16181f]/80">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-3">
            <LayoutGrid className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-white">No service cards visible</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {search
              ? `No services matched "${search}". Try clearing your search.`
              : user?.role === 'owner'
              ? 'Your homelab board is empty or all categories are currently hidden. Add a service or customize your grid view.'
              : 'No service cards are currently assigned to your account. Contact an administrator for access.'}
          </p>
          {search ? (
            <button
              onClick={() => setSearch('')}
              className="mt-4 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 rounded-lg transition-colors"
            >
              Clear search filter
            </button>
          ) : user?.role === 'owner' ? (
            <button
              onClick={() => openNew()}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-red-600/20 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Add First Service
            </button>
          ) : null}
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={orderedCategories} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
              {orderedCategories.map((cat) => {
                if (prefs.hiddenCategories.includes(cat)) return null;
                const items = filteredServices.filter(s => (s.category?.trim() || 'Services') === cat);
                if (user?.role !== 'owner' && items.length === 0) return null;
                const colSpan = (prefs.categoryWidths && prefs.categoryWidths[cat]) || 1;

                return (
                  <SortableCategoryColumn
                    key={cat}
                    id={cat}
                    category={cat}
                    items={items}
                    colSpan={colSpan}
                    vpnConnected={vpnConnected}
                    onVpnLockedClick={handleVpnLockedClick}
                    isOwner={user?.role === 'owner'}
                    onRename={(old) => setRenameModal({ open: true, oldName: old, newName: old })}
                    onAddService={(c) => openNew(c)}
                    onEditService={openEdit}
                    onDeleteService={remove}
                    onUpdateCardLayout={onUpdateCardLayout}
                    onOpenInspector={onOpenInspector}
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* VPN / LAN Locked Host Toast Notification */}
      {vpnNotice && (
        <div className="fixed bottom-6 right-6 max-w-md p-4 rounded-2xl border border-amber-500/40 bg-[#16181f]/95 text-slate-200 shadow-2xl backdrop-blur-md z-50 animate-in fade-in slide-in-from-bottom-5">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-bold text-amber-400">WireGuard VPN / LAN Required</h4>
              <p className="text-xs text-slate-300 mt-1">
                <strong className="text-white">{vpnNotice.title}</strong> uses an internal homelab address{' '}
                <code className="text-amber-300 font-mono text-[11px] bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                  {vpnNotice.url.replace(/^https?:\/\//, '')}
                </code>{' '}
                which cannot be reached without an active WireGuard VPN connection or local home network access.
              </p>
              <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1.5">
                <Shield className="w-3 h-3 text-purple-400" />
                Connect to WireGuard VPN to unlock and open this service.
              </p>
            </div>
            <button
              onClick={() => setVpnNotice(null)}
              className="text-slate-500 hover:text-white p-1 rounded-lg transition-colors"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {orderedCategories.length === 0 && (
        <div className="p-12 text-center rounded-2xl border border-slate-800/80 bg-[#16181f]">
          <Server className="w-8 h-8 text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-400">No categories found.</p>
          <button onClick={() => setCategoryModal(true)} className="mt-3 text-xs text-red-400 hover:underline">
            Add your first category box
          </button>
        </div>
      )}

      {/* Add / Edit Service Modal */}
      <Modal
        open={modal}
        onClose={() => { setModal(false); setModalError(''); }}
        title={editing ? 'Edit Service' : 'Add Service'}
        footer={
          <>
            <button onClick={() => { setModal(false); setModalError(''); }} className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors">Cancel</button>
            <button onClick={submit} className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold transition-colors">
              {editing ? 'Save Changes' : 'Create Service'}
            </button>
          </>
        }
      >
        <form onSubmit={submit} className="space-y-3.5">
          <ErrBox msg={modalError} />
          <Field label="Service Name *">
            <input className="input-field" required value={form.title} onChange={setFormField('title')} placeholder="e.g. Plex Media Server" />
          </Field>
          <Field label="URL (Internal or External) *">
            <div className="flex gap-2">
              <input
                className="input-field flex-1"
                required
                value={form.url}
                onChange={setFormField('url')}
                placeholder="http://192.168.1.136:32400 or https://..."
              />
              <button
                type="button"
                onClick={testUrl}
                disabled={testingUrl || !form.url}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5 border border-slate-700 disabled:opacity-50 transition-colors shrink-0"
              >
                {testingUrl ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-red-500" />
                    <span>Testing...</span>
                  </>
                ) : (
                  <>
                    <Activity className="w-3.5 h-3.5 text-red-400" />
                    <span>Test</span>
                  </>
                )}
              </button>
            </div>

            {/* Use SSL Switch */}
            <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-800/60">
              <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                Protocol:
                <span className={form.url.startsWith('https://') ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                  {form.url.startsWith('https://') ? 'HTTPS (SSL)' : 'HTTP'}
                </span>
              </span>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <span className="text-[11px] font-semibold text-slate-300">Use SSL</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.url.startsWith('https://')}
                  onClick={() => {
                    if (form.url.startsWith('https://')) {
                      setForm(f => ({ ...f, url: f.url.replace(/^https:\/\//, 'http://') }));
                    } else if (form.url.startsWith('http://')) {
                      setForm(f => ({ ...f, url: f.url.replace(/^http:\/\//, 'https://') }));
                    } else if (form.url) {
                      setForm(f => ({ ...f, url: `https://${f.url}` }));
                    } else {
                      setForm(f => ({ ...f, url: 'https://' }));
                    }
                  }}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    form.url.startsWith('https://') ? 'bg-emerald-600' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      form.url.startsWith('https://') ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </label>
            </div>

            {testResult && (
              <div
                className={`mt-2 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-mono border ${
                  testResult.status === 'online'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${testResult.status === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
                <span>
                  {testResult.status === 'online'
                    ? `Online · HTTP ${testResult.statusCode || 200} ${testResult.statusText || 'OK'} (${testResult.latency})`
                    : `Offline · ${testResult.error || 'Connection failed'} (${testResult.latency})`}
                </span>
              </div>
            )}
          </Field>
          <Field label="Description (Optional note)">
            <textarea className="input-field" rows={2} value={form.description} onChange={setFormField('description')} placeholder="Self-hosted personal media streaming service..." />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Icon Name or URL">
              <input className="input-field" value={form.icon} onChange={setFormField('icon')} placeholder="plex, docker, or http://..." />
            </Field>
            <Field label="Category / Column">
              <input className="input-field" value={form.category} onChange={setFormField('category')} placeholder="Media, Storage, Infrastructure..." />
            </Field>
          </div>
          <div className="pt-2 text-xs text-slate-300">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={form.requires_vpn} onChange={setFormField('requires_vpn')} className="rounded accent-red-500" />
              <span>Requires WireGuard / VPN</span>
            </label>
          </div>
        </form>
      </Modal>

      {/* Add Custom Category Box Modal */}
      <Modal
        open={categoryModal}
        onClose={() => setCategoryModal(false)}
        title="Add Custom Category Box"
        footer={
          <>
            <button onClick={() => setCategoryModal(false)} className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors">Cancel</button>
            <button onClick={handleAddCategory} className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold transition-colors">
              Create Category
            </button>
          </>
        }
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-400 leading-relaxed">
            Create a custom category box on your board. You can drag and drop it anywhere, resize its width, and populate it with service cards.
          </p>
          <Field label="Category Name">
            <input
              className="input-field"
              placeholder="e.g. Smart Home, Databases, Automation..."
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddCategory(); }}
              autoFocus
            />
          </Field>
        </div>
      </Modal>

      {/* Rename Category Modal */}
      <Modal
        open={renameModal.open}
        onClose={() => setRenameModal({ open: false, oldName: '', newName: '' })}
        title={`Rename Category: ${renameModal.oldName}`}
        footer={
          <>
            <button onClick={() => setRenameModal({ open: false, oldName: '', newName: '' })} className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors">Cancel</button>
            <button onClick={handleRenameCategory} className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold transition-colors">
              Save Name
            </button>
          </>
        }
      >
        <div className="space-y-4 text-xs">
          <Field label="New Category Name">
            <input
              className="input-field"
              value={renameModal.newName}
              onChange={(e) => setRenameModal(r => ({ ...r, newName: e.target.value }))}
              onKeyDown={(e) => { if (e.key === 'Enter') handleRenameCategory(); }}
              autoFocus
            />
          </Field>
        </div>
      </Modal>

      {/* Customize Grid & Widgets Modal */}
      <Modal
        open={viewModal}
        onClose={() => setViewModal(false)}
        title="Customize Homelab Grid & Widgets"
        footer={
          <div className="flex items-center justify-between w-full">
            <Link
              to="/profile"
              onClick={() => setViewModal(false)}
              className="text-xs text-red-400 hover:text-red-300 font-semibold flex items-center gap-1"
            >
              <UserIcon className="w-3.5 h-3.5" />
              Full Account Settings
            </Link>
            <button
              onClick={() => setViewModal(false)}
              className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold"
            >
              Done
            </button>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          {/* Widget Toggles */}
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">Widgets</span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  const val = prefs.widgetVisible?.clock !== false;
                  const updated = { ...prefs, widgetVisible: { ...(prefs.widgetVisible || { clock: true, nodes: true, notes: true }), clock: !val } };
                  setPrefs(updated);
                  saveUserPreferences(user?.id, updated);
                }}
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  prefs.widgetVisible?.clock !== false
                    ? 'bg-red-600/10 border-red-500/40 text-white font-bold'
                    : 'bg-slate-900 border-slate-800 text-slate-500'
                }`}
              >
                Time Widget
              </button>
              <button
                type="button"
                onClick={() => {
                  const val = prefs.widgetVisible?.notes !== false;
                  const updated = { ...prefs, widgetVisible: { ...(prefs.widgetVisible || { clock: true, nodes: true, notes: true }), notes: !val } };
                  setPrefs(updated);
                  saveUserPreferences(user?.id, updated);
                }}
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  prefs.widgetVisible?.notes !== false
                    ? 'bg-red-600/10 border-red-500/40 text-white font-bold'
                    : 'bg-slate-900 border-slate-800 text-slate-500'
                }`}
              >
                Notes Widget
              </button>
              <button
                type="button"
                onClick={() => {
                  const val = prefs.widgetVisible?.nodes !== false;
                  const updated = { ...prefs, widgetVisible: { ...(prefs.widgetVisible || { clock: true, nodes: true, notes: true }), nodes: !val } };
                  setPrefs(updated);
                  saveUserPreferences(user?.id, updated);
                }}
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  prefs.widgetVisible?.nodes !== false
                    ? 'bg-red-600/10 border-red-500/40 text-white font-bold'
                    : 'bg-slate-900 border-slate-800 text-slate-500'
                }`}
              >
                Cluster Nodes
              </button>
            </div>
          </div>

          {/* Category Visibility & Services Breakdown */}
          <div className="pt-2 border-t border-slate-800/80">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">Category Columns & Services</span>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {orderedCategories.map(cat => {
                const isCatHidden = prefs.hiddenCategories.includes(cat);
                const catServices = services.filter(s => (s.category?.trim() || 'Services') === cat);
                const isExpanded = expandedCategories[cat] ?? false;
                const visibleCount = catServices.filter(s => !prefs.hiddenServices?.includes(s.id)).length;

                return (
                  <div
                    key={cat}
                    className="rounded-xl border border-slate-800/80 bg-slate-900/60 overflow-hidden transition-all"
                  >
                    {/* Category Row */}
                    <div className="flex items-center justify-between p-2.5 gap-2">
                      <button
                        type="button"
                        onClick={() => toggleCategoryExpand(cat)}
                        className="flex items-center gap-2 min-w-0 flex-1 text-left group/cat"
                      >
                        <div className="p-1 rounded text-slate-500 group-hover/cat:text-slate-300 transition-colors">
                          {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5 text-red-400" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className={`font-semibold text-xs transition-colors ${!isCatHidden ? 'text-white' : 'text-slate-500'}`}>
                            {cat}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                            {visibleCount}/{catServices.length} visible
                          </div>
                        </div>
                      </button>

                      {/* Category Hide Checkbox */}
                      <button
                        type="button"
                        onClick={() => toggleCategoryHide(cat)}
                        className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                          !isCatHidden
                            ? 'bg-red-600/10 border-red-500/40 text-red-400 hover:bg-red-600/20'
                            : 'bg-slate-800/40 border-slate-700/60 text-slate-500 hover:text-slate-400'
                        }`}
                        title={isCatHidden ? `Show entire ${cat} category` : `Hide entire ${cat} category`}
                      >
                        <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-all ${
                          !isCatHidden ? 'bg-red-600 border-red-500 text-white' : 'border-slate-600 bg-slate-700/50'
                        }`}>
                          {!isCatHidden && <Check className="w-2.5 h-2.5 stroke-[2.5]" />}
                        </div>
                        <span>{!isCatHidden ? 'Shown' : 'Hidden'}</span>
                      </button>
                    </div>

                    {/* Expandable Services List */}
                    {isExpanded && (
                      <div className="border-t border-slate-800/80 bg-slate-950/40 p-2 space-y-1.5">
                        {catServices.length === 0 ? (
                          <div className="text-[11px] text-slate-600 py-1.5 px-2 italic">
                            No services in this category
                          </div>
                        ) : (
                          catServices.map(s => {
                            const isSvcHidden = isCatHidden || (prefs.hiddenServices?.includes(s.id) ?? false);
                            return (
                              <div
                                key={s.id}
                                className={`flex items-center justify-between p-2 rounded-lg border transition-all ${
                                  !isSvcHidden
                                    ? 'bg-slate-900/80 border-slate-800/80 text-slate-200'
                                    : 'bg-slate-950/60 border-slate-800/40 text-slate-500 opacity-60'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0 pr-2">
                                  <ServiceIcon icon={s.icon} title={s.title} />
                                  <div className="min-w-0">
                                    <div className="text-xs font-medium truncate">{s.title}</div>
                                    <div className="text-[9px] font-mono text-slate-500 truncate">
                                      {s.url.replace(/^https?:\/\//, '')}
                                    </div>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  disabled={isCatHidden}
                                  onClick={() => toggleServiceHide(s.id)}
                                  className={`px-2 py-1 rounded-md border text-[10px] font-mono flex items-center gap-1 transition-all ${
                                    isCatHidden
                                      ? 'opacity-40 cursor-not-allowed border-slate-800 text-slate-600'
                                      : !isSvcHidden
                                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/20'
                                      : 'bg-slate-800/40 border-slate-700/60 text-slate-500 hover:text-slate-400'
                                  }`}
                                  title={isCatHidden ? 'Category is hidden' : isSvcHidden ? 'Show service' : 'Hide service'}
                                >
                                  {!isSvcHidden ? (
                                    <>
                                      <Eye className="w-3 h-3 text-emerald-400" />
                                      <span>Visible</span>
                                    </>
                                  ) : (
                                    <>
                                      <EyeOff className="w-3 h-3 text-slate-500" />
                                      <span>Hidden</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

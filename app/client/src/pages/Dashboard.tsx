import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Cpu,
  HardDrive,
  Activity,
  Server,
  Terminal as TermIcon,
  Folder,
  Clipboard,
  ExternalLink,
  Plus,
  RefreshCw,
  Trash2,
  Edit2,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Inbox,
  Code2,
  Wrench,
  Users as UsersIcon,
  BarChart3,
  Globe,
  Lock,
  Shield,
  ShieldAlert,
  ShieldCheck,
  X,
  Layers,
  Thermometer,
  Gauge,
  Key,
  Copy,
  Check,
  Eye,
  EyeOff,
  Sliders,
  User as UserIcon,
  Settings,
  GripVertical,
  Maximize2,
  Minimize2,
  FolderPlus,
  SlidersHorizontal,
  ChevronDown,
  ChevronRight,
  LayoutGrid,
} from 'lucide-react';
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
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Navbar from '../components/layout/Navbar';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';
import {
  SystemStats,
  ServerNode,
  AnalyticsSummary,
  Message,
  Project,
  Service,
  Skill,
  User,
  SpeedtestResult,
  WireguardStatus,
  PiholeStats,
  QbittorrentStats,
  JellyfinStats,
  JellyseerrStats,
} from '../types';
import { getUserPreferences, saveUserPreferences, syncUserPreferencesFromBackend, UserPreferences } from '../lib/userPreferences';
import { GRID_CONSTANTS, CardPosition, layoutCategoryCards, getFillerCells, canResizeCard, hasOverlap, computePushedLayout } from '../lib/cardGridEngine';
import { WireguardInspectorModal } from '../components/dashboard/WireguardInspectorModal';
import { PiholeInspectorModal } from '../components/dashboard/PiholeInspectorModal';
import { QbittorrentInspectorModal } from '../components/dashboard/QbittorrentInspectorModal';
import { JellyfinInspectorModal } from '../components/dashboard/JellyfinInspectorModal';
import { JellyseerrInspectorModal } from '../components/dashboard/JellyseerrInspectorModal';

/* -------------------------------------------------------------
   Common Modals & Form Helpers
------------------------------------------------------------- */
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

function Modal({ open, onClose, title, children, footer }: ModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-700/60 bg-[#16181f] p-6 shadow-2xl text-slate-100" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <h3 className="text-base font-bold tracking-tight text-slate-100">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-100 text-xl leading-none">&times;</button>
        </div>
        <div className="space-y-4 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-800">{footer}</div>}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</span>
      {children}
    </label>
  );
}

function ErrBox({ msg }: { msg: string }) {
  if (!msg) return null;
  return (
    <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-300">
      <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
      <span>{msg}</span>
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-7 h-7 border-2 border-slate-700 border-t-red-500 rounded-full animate-spin" />
    </div>
  );
}

function fmtDate(s: string | null | undefined): string {
  if (!s) return '';
  const d = new Date(s);
  return isNaN(d.getTime()) ? '' : d.toLocaleString();
}

/* -------------------------------------------------------------
   Homepage.dev-style Service Icon Resolver
------------------------------------------------------------- */
function ServiceIcon({ icon, title }: { icon?: string; title: string }) {
  const [imgError, setImgError] = useState(false);

  // If icon is an image URL or starts with http or /
  if (icon && (icon.startsWith('http') || icon.startsWith('/') || icon.includes('.')) && !imgError) {
    return (
      <img
        src={icon}
        alt={title}
        onError={() => setImgError(true)}
        className="w-9 h-9 rounded-xl object-contain bg-slate-900/60 border border-slate-800 p-1.5 flex-shrink-0"
      />
    );
  }

  // Common keywords map to Lucide icons with stylish background badges
  const t = (title + ' ' + (icon || '')).toLowerCase();

  if (t.includes('term') || t.includes('ssh') || t.includes('bash') || t.includes('shell') || t.includes('console')) {
    return (
      <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 flex-shrink-0 shadow-sm">
        <TermIcon className="w-4 h-4" />
      </div>
    );
  }
  if (t.includes('plex') || t.includes('jellyfin') || t.includes('media') || t.includes('video') || t.includes('stream') || t.includes('tv')) {
    return (
      <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 flex-shrink-0 shadow-sm">
        <Server className="w-4 h-4" />
      </div>
    );
  }
  if (t.includes('audio') || t.includes('music') || t.includes('podcast') || t.includes('book')) {
    return (
      <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 flex-shrink-0 shadow-sm">
        <Activity className="w-4 h-4" />
      </div>
    );
  }
  if (t.includes('nextcloud') || t.includes('cloud') || t.includes('drive') || t.includes('file') || t.includes('storage') || t.includes('nas')) {
    return (
      <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 flex-shrink-0 shadow-sm">
        <Folder className="w-4 h-4" />
      </div>
    );
  }
  if (t.includes('docker') || t.includes('portainer') || t.includes('container')) {
    return (
      <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 flex-shrink-0 shadow-sm">
        <Layers className="w-4 h-4" />
      </div>
    );
  }
  if (t.includes('vpn') || t.includes('wireguard') || t.includes('tailscale') || t.includes('guard') || t.includes('shield')) {
    return (
      <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 flex-shrink-0 shadow-sm">
        <Shield className="w-4 h-4" />
      </div>
    );
  }
  if (t.includes('web') || t.includes('apache') || t.includes('nginx') || t.includes('site') || t.includes('http')) {
    return (
      <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0 shadow-sm">
        <Globe className="w-4 h-4" />
      </div>
    );
  }
  if (t.includes('clip') || t.includes('note') || t.includes('paste')) {
    return (
      <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 flex-shrink-0 shadow-sm">
        <Clipboard className="w-4 h-4" />
      </div>
    );
  }

  // Graceful fallback: 2-letter uppercase monogram in a sleek dark gradient badge
  return (
    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/60 flex items-center justify-center text-xs font-mono font-extrabold text-slate-200 flex-shrink-0 shadow-sm">
      {title.slice(0, 2).toUpperCase()}
    </div>
  );
}

/* -------------------------------------------------------------
   Widgets: Time & Homelab Date Widget
------------------------------------------------------------- */
function TimeWidget({ uptime }: { uptime?: string }) {
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
        <span className="text-slate-300 font-semibold">{uptime || '—'}</span>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------
   Widgets: Notes Widget (Connected to /clipboard API)
------------------------------------------------------------- */
function NotesWidget() {
  const [notes, setNotes] = useState<any[]>([]);
  const [newNote, setNewNote] = useState('');
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const loadNotes = async () => {
    setLoading(true);
    try {
      const data = await api.get<any[]>('/clipboard');
      setNotes(data.slice(0, 4));
      setError('');
    } catch (err) {
      setError('Unable to load notes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotes();
  }, []);

  const addNote = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newNote.trim()) return;
    try {
      await api.post('/clipboard', { type: 'text', content: newNote.trim(), title: 'Quick Note' });
      setNewNote('');
      loadNotes();
    } catch (err) {
      setError('Failed to save note');
      setTimeout(() => setError(''), 3000);
    }
  };

  const copyNote = (id: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const deleteNote = async (id: number) => {
    try {
      await api.delete(`/clipboard/${id}`);
      setNotes(notes.filter(n => n.id !== id));
    } catch {}
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-gradient-to-br from-[#16181f]/90 to-[#12131a]/90 p-5 shadow-xl backdrop-blur-md flex flex-col justify-between">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clipboard className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Quick Notes</span>
        </div>
        <Link to="/clipboard" className="text-[10px] font-semibold text-slate-500 hover:text-red-400 transition-colors flex items-center gap-1">
          Full View <ExternalLink className="w-2.5 h-2.5" />
        </Link>
      </div>

      <form onSubmit={addNote} className="py-2.5 flex gap-2">
        <input
          type="text"
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Type or paste a quick note..."
          className="flex-1 px-3 py-1.5 bg-slate-900/90 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-red-500/50 transition-colors"
        />
        <button
          type="submit"
          className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </form>

      {error && (
        <p className="text-[10px] text-red-400 font-mono py-0.5">{error}</p>
      )}
      <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1">
        {loading ? (
          <div className="flex items-center justify-center py-3 text-slate-500 text-xs">
            <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5 text-slate-400" />
            <span>Loading notes...</span>
          </div>
        ) : notes.length === 0 ? (
          <p className="text-[11px] text-slate-600 italic py-1">No notes yet. Add one above.</p>
        ) : (
          notes.map((n) => (
            <div
              key={n.id}
              className="group flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800/70 hover:border-slate-700/80 transition-all text-xs"
            >
              <div className="min-w-0 flex-1 pr-2">
                <p className="text-slate-300 truncate font-mono text-[11px]">{n.content || n.title || 'Note'}</p>
              </div>
              <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 shrink-0">
                <button
                  type="button"
                  onClick={() => copyNote(n.id, n.content || '')}
                  className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
                  title="Copy note"
                >
                  {copiedId === n.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
                <button
                  type="button"
                  onClick={() => deleteNote(n.id)}
                  className="p-1 text-slate-500 hover:text-red-400 rounded hover:bg-slate-800 transition-colors"
                  title="Delete note"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------
   Widgets: Server Gauges Customization Modal
------------------------------------------------------------- */
interface ServerGaugesModalProps {
  open: boolean;
  onClose: () => void;
  nodes: ServerNode[];
  speedtest?: SpeedtestResult | null;
  serverGauges?: Record<string, { cpu?: boolean; ram?: boolean; fan?: boolean; temp?: boolean; ports?: boolean; ping?: boolean; down?: boolean; up?: boolean }>;
  onToggleGauge: (nodeId: string, gaugeKey: string) => void;
  onResetGauges: () => void;
}

function ServerGaugesModal({
  open,
  onClose,
  nodes,
  speedtest,
  serverGauges = {},
  onToggleGauge,
  onResetGauges,
}: ServerGaugesModalProps) {
  if (!open) return null;

  const nodeItems = [
    ...nodes.map((n) => ({
      id: n.id,
      name: n.name,
      sub: `${n.ip} · ${n.role}`,
      availableGauges: [
        { key: 'ping', label: 'Ping / Latency' },
        { key: 'cpu', label: 'CPU Load' },
        { key: 'ram', label: 'RAM Memory' },
        { key: 'temp', label: 'Temperature' },
        { key: 'fan', label: 'Fan Speed' },
        { key: 'ports', label: 'Open Ports' },
      ],
    })),
    ...(speedtest
      ? [
          {
            id: 'wan',
            name: 'WAN / Internet',
            sub: `${speedtest.server || 'Cloudflare Edge'} · Speedtest`,
            availableGauges: [
              { key: 'ping', label: 'Ping / Latency' },
              { key: 'down', label: 'Download Speed' },
              { key: 'up', label: 'Upload Speed' },
            ],
          },
        ]
      : []),
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl rounded-2xl bg-[#16181f] border border-slate-800 shadow-2xl p-6 space-y-5 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Customize Server Gauges</h3>
              <p className="text-xs text-slate-400">Configure which metrics and status pills are visible per server node</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto space-y-4 pr-1 flex-1">
          {nodeItems.map((item) => {
            const currentGauges = serverGauges[item.id] || {};
            return (
              <div
                key={item.id}
                className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-slate-200">{item.name}</h4>
                    <p className="text-[11px] font-mono text-slate-500">{item.sub}</p>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                    {item.id}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {item.availableGauges.map((g) => {
                    const isChecked = (currentGauges as any)[g.key] !== false;
                    return (
                      <button
                        key={g.key}
                        type="button"
                        onClick={() => onToggleGauge(item.id, g.key)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono transition-all border ${
                          isChecked
                            ? 'bg-red-500/15 border-red-500/40 text-red-300 shadow-[0_0_8px_rgba(239,68,68,0.2)]'
                            : 'bg-slate-800/60 border-slate-700/60 text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isChecked ? 'bg-red-400' : 'bg-slate-600'}`} />
                        <span>{g.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 shrink-0">
          <button
            type="button"
            onClick={onResetGauges}
            className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Reset All to Default
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-500 text-white shadow-[0_0_12px_rgba(239,68,68,0.4)] transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------
   Widgets: Multi-Server Cluster Telemetry Widget
------------------------------------------------------------- */
function MultiServerNodesWidget({
  nodes,
  loading,
  speedtest,
  serverGauges = {},
  onUpdateServerGauges,
  isAdmin,
  onRunSpeedtest,
  isRunningSpeedtest,
}: {
  nodes: ServerNode[];
  loading: boolean;
  speedtest?: SpeedtestResult | null;
  serverGauges?: Record<string, { cpu?: boolean; ram?: boolean; fan?: boolean; temp?: boolean; ports?: boolean; ping?: boolean; down?: boolean; up?: boolean }>;
  onUpdateServerGauges?: (gauges: Record<string, any>) => void;
  isAdmin?: boolean;
  onRunSpeedtest?: () => void;
  isRunningSpeedtest?: boolean;
}) {
  const [modalOpen, setModalOpen] = useState(false);

  const handleToggleGauge = (nodeId: string, gaugeKey: string) => {
    if (!onUpdateServerGauges) return;
    const current = serverGauges[nodeId] || {};
    const currentVal = (current as any)[gaugeKey] !== false;
    const next = {
      ...serverGauges,
      [nodeId]: {
        ...current,
        [gaugeKey]: !currentVal,
      },
    };
    onUpdateServerGauges(next);
  };

  const handleResetGauges = () => {
    if (!onUpdateServerGauges) return;
    onUpdateServerGauges({});
  };

  if (loading && nodes.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-800/80 bg-[#16181f]/70 p-4 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <RefreshCw className="w-4 h-4 animate-spin text-red-500" />
          <span>Polling cluster telemetry for host, .136, .112, and .41...</span>
        </div>
      </div>
    );
  }

  const totalMonitored = nodes.length + (speedtest ? 1 : 0);

  return (
    <div className="space-y-2.5">
      <ServerGaugesModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        nodes={nodes}
        speedtest={speedtest}
        serverGauges={serverGauges}
        onToggleGauge={handleToggleGauge}
        onResetGauges={handleResetGauges}
      />

      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <Server className="w-3.5 h-3.5 text-red-500" /> Cluster & Network Telemetry ({totalMonitored} Nodes)
        </span>
        <div className="flex items-center gap-2">
          {isAdmin && onUpdateServerGauges && (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="text-[10px] font-mono text-slate-400 hover:text-red-400 transition-colors flex items-center gap-1.5 px-2 py-0.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:border-slate-700"
              title="Configure visible telemetry stats per server"
            >
              <SlidersHorizontal className="w-3 h-3 text-red-500" />
              <span>Customize Gauges</span>
            </button>
          )}
          {onRunSpeedtest && (
            <button
              type="button"
              onClick={onRunSpeedtest}
              disabled={isRunningSpeedtest}
              className="text-[10px] font-mono text-slate-400 hover:text-red-400 disabled:opacity-50 transition-colors flex items-center gap-1.5 px-2 py-0.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:border-slate-700"
              title="Run on-demand internet speedtest"
            >
              <RefreshCw className={`w-3 h-3 ${isRunningSpeedtest ? 'animate-spin text-red-500' : ''}`} />
              <span>Speedtest</span>
            </button>
          )}
          <span className="text-[10px] font-mono text-slate-500 hidden sm:inline">Live 10s Telemetry</span>
        </div>
      </div>

      <div className={`grid grid-cols-1 sm:grid-cols-2 ${speedtest ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-3.5`}>
        {nodes.map((node) => {
          const isOnline = node.status === 'online';
          const isPironman = node.id.includes('136');
          const nodeGauges = serverGauges[node.id] || {};

          const showCpu = nodeGauges.cpu !== false && !!node.cpu;
          const showFan = nodeGauges.fan !== false && !!node.fanSpeed;
          const showRam = nodeGauges.ram !== false && (!!node.memory && (!node.fanSpeed || !showFan));
          const showTemp = nodeGauges.temp !== false && !!node.temperature;
          const hasMetrics = showCpu || showFan || showRam || showTemp;

          return (
            <div
              key={node.id}
              className={`group relative rounded-2xl border p-4 space-y-2 transition-all duration-200 backdrop-blur-md ${
                isPironman
                  ? 'border-red-500/30 bg-[#16181f]/90 hover:border-red-500/50 shadow-[0_0_15px_-4px_rgba(239,68,68,0.15)]'
                  : 'border-slate-800/80 bg-[#16181f]/80 hover:border-slate-700/80 shadow-lg'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                    }`}
                  />
                  <span className="font-bold text-xs text-white truncate">{node.name}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {nodeGauges.ping !== false && (
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      {node.latency}
                    </span>
                  )}
                  {isAdmin && onUpdateServerGauges && (
                    <button
                      type="button"
                      onClick={() => setModalOpen(true)}
                      className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-slate-800/80 transition-colors opacity-60 hover:opacity-100"
                      title="Configure stats for this server"
                    >
                      <Settings className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              <p className="text-[10px] font-mono text-slate-400 truncate">
                {node.ip} · {node.role}
              </p>

              {hasMetrics ? (
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-[10px] font-mono">
                  {showCpu ? (
                    <div>
                      <span className="text-slate-500 block">CPU</span>
                      <span className="text-slate-200 font-bold">{node.cpu?.load}%</span>
                    </div>
                  ) : <div />}
                  {showFan ? (
                    <div>
                      <span className="text-slate-500 block">FAN</span>
                      <span className="text-cyan-400 font-bold">{node.fanSpeed}</span>
                    </div>
                  ) : showRam ? (
                    <div>
                      <span className="text-slate-500 block">RAM</span>
                      <span className="text-slate-200 font-bold">{node.memory?.percent || 0}%</span>
                    </div>
                  ) : <div />}
                  {showTemp ? (
                    <div>
                      <span className="text-slate-500 block">TEMP</span>
                      <span className="text-amber-400 font-bold">{node.temperature || '—'}</span>
                    </div>
                  ) : <div />}
                </div>
              ) : (node.ports && nodeGauges.ports !== false) ? (
                <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-800/80">
                  {node.ports.map((p) => (
                    <span
                      key={p}
                      className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-300"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}

        {speedtest && (
          <div className="group relative rounded-2xl border border-slate-800/80 bg-[#16181f]/80 hover:border-slate-700/80 shadow-lg p-4 space-y-2 transition-all duration-200 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`w-2 h-2 rounded-full shrink-0 ${speedtest.status === 'success' || speedtest.status === 'cached' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-500'}`} />
                <span className="font-bold text-xs text-white truncate">WAN / Internet</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {serverGauges['wan']?.ping !== false && (
                  <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                    {speedtest.pingMs ? `${speedtest.pingMs}ms` : 'WAN'}
                  </span>
                )}
                {isAdmin && onUpdateServerGauges && (
                  <button
                    type="button"
                    onClick={() => setModalOpen(true)}
                    className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-slate-800/80 transition-colors opacity-60 hover:opacity-100"
                    title="Configure stats for WAN"
                  >
                    <Settings className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            <p className="text-[10px] font-mono text-slate-400 truncate">
              {speedtest.server || 'Cloudflare Edge'} · Speedtest
            </p>

            {(serverGauges['wan']?.down !== false || serverGauges['wan']?.up !== false) && (
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-[10px] font-mono">
                {serverGauges['wan']?.down !== false ? (
                  <div>
                    <span className="text-slate-500 block">DOWN</span>
                    <span className="text-emerald-400 font-bold">↓ {speedtest.downloadMbps}M</span>
                  </div>
                ) : <div />}
                {serverGauges['wan']?.up !== false ? (
                  <div>
                    <span className="text-slate-500 block">UP</span>
                    <span className="text-cyan-400 font-bold">↑ {speedtest.uploadMbps}M</span>
                  </div>
                ) : <div />}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------
   Sortable Category Box Component (Open, Large Cards)
------------------------------------------------------------- */
interface SortableCategoryColumnProps {
  id: string;
  category: string;
  items: Service[];
  colSpan?: 1 | 2;
  vpnConnected?: boolean;
  onVpnLockedClick?: (title: string, url: string) => void;
  isOwner?: boolean;
  onRename: (oldName: string) => void;
  onAddService: (cat: string) => void;
  onEditService: (s: Service) => void;
  onDeleteService: (id: number) => void;
  onUpdateCardLayout?: (updates: Array<{ id: number; start_col: number; start_row: number; col_span: number; row_span: number }>) => void;
  onOpenInspector?: (type: 'wireguard' | 'pihole' | 'qbittorrent' | 'jellyfin' | 'jellyseerr') => void;
}

function SortableCategoryColumn({
  id,
  category,
  items,
  colSpan = 1,
  vpnConnected,
  onVpnLockedClick,
  isOwner = true,
  onRename,
  onAddService,
  onEditService,
  onDeleteService,
  onUpdateCardLayout,
  onOpenInspector,
}: SortableCategoryColumnProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.6 : 1,
  };

  const [copiedUrlId, setCopiedUrlId] = useState<number | null>(null);

  const handleCopy = (e: React.MouseEvent, s: Service) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(s.url);
    setCopiedUrlId(s.id);
    setTimeout(() => setCopiedUrlId(null), 1500);
  };

  // Compute placed cards in the category mini-grid
  const placedCards = useMemo(() => {
    return layoutCategoryCards(items, GRID_CONSTANTS.COLS);
  }, [items]);

  // Live pushed cards state during dragging
  const [livePushedCards, setLivePushedCards] = useState<(Service & CardPosition)[] | null>(null);
  const livePushedCardsRef = useRef(livePushedCards);
  livePushedCardsRef.current = livePushedCards;

  const activeCards = livePushedCards || placedCards;

  // Compute filler placeholder cells for unoccupied slots
  const fillerCells = useMemo(() => {
    return getFillerCells(activeCards, GRID_CONSTANTS.COLS, 2);
  }, [activeCards]);

  // Resizing state
  const [resizing, setResizing] = useState<{
    id: number;
    startCol: number;
    startRow: number;
    colSpan: number;
    rowSpan: number;
  } | null>(null);
  const resizingRef = useRef(resizing);
  resizingRef.current = resizing;
  const gridRef = useRef<HTMLDivElement>(null);

  const handleStartResize = (e: React.MouseEvent, card: Service & CardPosition) => {
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startY = e.clientY;
    const initialColSpan = card.colSpan;
    const initialRowSpan = card.rowSpan;
    const gridWidth = gridRef.current ? gridRef.current.clientWidth : 320;
    const colWidth = (gridWidth - GRID_CONSTANTS.GAP) / GRID_CONSTANTS.COLS;
    const rowHeight = GRID_CONSTANTS.CELL_HEIGHT;

    const initialCandidate = {
      id: card.id,
      startCol: card.startCol,
      startRow: card.startRow,
      colSpan: initialColSpan,
      rowSpan: initialRowSpan,
    };
    setResizing(initialCandidate);
    setLivePushedCards(null);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      const colStep = Math.round(deltaX / (colWidth * 0.45));
      const rowStep = Math.round(deltaY / (rowHeight * 0.45));

      const candidateColSpan = Math.max(1, Math.min(GRID_CONSTANTS.COLS, initialColSpan + colStep));
      const candidateRowSpan = Math.max(1, Math.min(3, initialRowSpan + rowStep));
      const candidateStartCol = candidateColSpan >= GRID_CONSTANTS.COLS ? 0 : card.startCol;

      const candidate: CardPosition = {
        id: card.id,
        startCol: candidateStartCol,
        startRow: card.startRow,
        colSpan: candidateColSpan,
        rowSpan: candidateRowSpan,
      };

      // Real-time layout computation pushing colliding cards down into new rows
      const pushedLayout = computePushedLayout(candidate, placedCards, GRID_CONSTANTS.COLS);
      livePushedCardsRef.current = pushedLayout;
      setResizing(candidate);
      setLivePushedCards(pushedLayout);
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      const finalLayout = livePushedCardsRef.current;
      if (finalLayout && onUpdateCardLayout) {
        const changedCards: Array<{
          id: number;
          start_col: number;
          start_row: number;
          col_span: number;
          row_span: number;
        }> = [];

        for (const item of finalLayout) {
          const original = placedCards.find((c) => c.id === item.id);
          if (
            !original ||
            original.startCol !== item.startCol ||
            original.startRow !== item.startRow ||
            original.colSpan !== item.colSpan ||
            original.rowSpan !== item.rowSpan
          ) {
            changedCards.push({
              id: item.id,
              start_col: item.startCol,
              start_row: item.startRow,
              col_span: item.colSpan,
              row_span: item.rowSpan,
            });
          }
        }

        if (changedCards.length > 0) {
          onUpdateCardLayout(changedCards);
        }
      }
      livePushedCardsRef.current = null;
      setResizing(null);
      setLivePushedCards(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group/col relative p-1 transition-all duration-200 flex flex-col space-y-3 ${
        colSpan === 2 ? 'col-span-1 md:col-span-2' : 'col-span-1'
      }`}
    >
      {/* Category Header — Clean, open, invisible box */}
      <div className="flex items-center justify-between pb-1 px-1">
        <div className="flex items-center gap-2 min-w-0">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 text-slate-600 hover:text-slate-300 rounded transition-colors"
            title="Drag category to rearrange"
          >
            <GripVertical className="w-4 h-4" />
          </button>
          {isOwner ? (
            <button
              onClick={() => onRename(category)}
              className="font-bold text-xs uppercase tracking-wider text-slate-300 hover:text-red-400 transition-colors truncate text-left flex items-center gap-1.5"
              title="Click to rename category"
            >
              <span>{category}</span>
              <Edit2 className="w-3 h-3 text-slate-600 opacity-60 hover:opacity-100" />
            </button>
          ) : (
            <span className="font-bold text-xs uppercase tracking-wider text-slate-300 truncate">
              {category}
            </span>
          )}
          <span className="text-[10px] font-mono text-slate-500">({items.length})</span>
        </div>

        {isOwner && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => onAddService(category)}
              className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              title="Add service to this category"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Freeform Category Mini-Grid */}
      <div
        ref={gridRef}
        className="grid grid-cols-2 gap-2.5 relative select-none"
        style={{
          gridAutoRows: `${GRID_CONSTANTS.CELL_HEIGHT}px`,
        }}
      >
        {/* Filler Placeholder Cells for Unoccupied Slots */}
        {fillerCells.map((filler) => (
          <div
            key={`filler-${filler.col}-${filler.row}`}
            style={{
              gridColumn: `${filler.col + 1} / span 1`,
              gridRow: `${filler.row + 1} / span 1`,
              minHeight: `${GRID_CONSTANTS.CELL_HEIGHT}px`,
            }}
            className="rounded-xl border border-dashed border-slate-800/40 bg-slate-900/10 flex items-center justify-center select-none pointer-events-none transition-colors"
          >
            <span className="text-[10px] font-mono text-slate-700/60">+</span>
          </div>
        ))}

        {/* Placed Service Cards */}
        {activeCards.map((s) => {
          const isCurrentResizing = resizing?.id === s.id;
          const currentColSpan = isCurrentResizing && resizing ? resizing.colSpan : s.colSpan;
          const currentRowSpan = isCurrentResizing && resizing ? resizing.rowSpan : s.rowSpan;
          const startCol = s.startCol;
          const startRow = s.startRow;

          const isOnline = s.status === 'online';
          const isOffline = s.status === 'offline' || s.status === 'timeout';
          const isCompact = currentColSpan === 1 && currentRowSpan === 1;

          const isVpnRequired = Boolean(
            s.requires_vpn ||
            (s.url && (s.url.includes('.home.arpa') || s.url.includes('192.168.1.') || s.url.includes('10.7.235.')))
          );
          const isVpnLocked = isVpnRequired && vpnConnected === false;

          return (
            <div
              key={s.id}
              onClick={() => {
                if (isVpnLocked) {
                  onVpnLockedClick?.(s.title, s.url);
                  return;
                }
                if (s.url === '#' || !s.url) {
                  if (s.telemetryType && onOpenInspector) {
                    onOpenInspector(s.telemetryType);
                  }
                } else {
                  window.open(s.url, '_blank', 'noopener,noreferrer');
                }
              }}
              role="link"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (isVpnLocked) {
                    onVpnLockedClick?.(s.title, s.url);
                    return;
                  }
                  if (s.url === '#' || !s.url) {
                    if (s.telemetryType && onOpenInspector) onOpenInspector(s.telemetryType);
                  } else {
                    window.open(s.url, '_blank', 'noopener,noreferrer');
                  }
                }
              }}
              style={{
                gridColumn: `${startCol + 1} / span ${currentColSpan}`,
                gridRow: `${startRow + 1} / span ${currentRowSpan}`,
              }}
              className={`group relative rounded-xl border transition-all duration-150 cursor-pointer select-none overflow-hidden ${
                isCurrentResizing
                  ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)] bg-[#1c1f2b] z-30'
                  : isVpnLocked
                  ? 'border-amber-500/30 bg-[#16181f]/60 opacity-60 hover:opacity-85 hover:border-amber-500/50 hover:shadow-lg'
                  : 'border-slate-800/80 bg-[#16181f]/80 hover:bg-[#1c1f2b] hover:border-slate-700/80 hover:shadow-lg'
              } ${isCompact ? 'p-2.5 flex flex-col justify-between' : 'p-3.5 flex items-center justify-between'}`}
            >
              {isCompact ? (
                /* Compact 1x1 Card */
                <>
                  <div className="flex items-center gap-2 min-w-0 pr-4">
                    <ServiceIcon icon={s.icon} title={s.title} />
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-slate-100 group-hover:text-red-400 transition-colors truncate flex items-center gap-1">
                        <span className="truncate">{s.title}</span>
                        {isVpnLocked && <Lock className="w-2.5 h-2.5 text-amber-400 shrink-0" />}
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 truncate block mt-0.5">
                        {s.url.replace(/^https?:\/\//, '')}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/40 text-[9px] font-mono">
                    <span
                      className={`flex items-center gap-1 ${
                        isOnline ? 'text-emerald-400' : isOffline ? 'text-rose-400' : 'text-slate-500'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isOnline ? 'bg-emerald-400 animate-pulse' : isOffline ? 'bg-rose-500' : 'bg-slate-500'
                        }`}
                      />
                      {s.status || 'ping'}
                    </span>
                    <div className="flex items-center gap-1">
                      {s.telemetryType && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onOpenInspector?.(s.telemetryType!);
                          }}
                          className="p-0.5 text-slate-400 hover:text-emerald-400 transition-colors"
                          title="Open live telemetry inspector"
                        >
                          <Activity className="w-3 h-3 text-emerald-400" />
                        </button>
                      )}
                      {isVpnLocked ? (
                        <span className="inline-flex items-center gap-0.5 text-amber-400 font-mono font-bold" title="WireGuard VPN or LAN required">
                          <Lock className="w-2.5 h-2.5" />
                          VPN
                        </span>
                      ) : (
                        s.requires_vpn && <span className="text-purple-400 font-bold">VPN</span>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                /* Wide 2x1 or Multi-row Card */
                <>
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <ServiceIcon icon={s.icon} title={s.title} />
                    <div className="min-w-0">
                      <div className="font-bold text-sm text-slate-100 group-hover:text-red-400 transition-colors truncate flex items-center gap-1.5">
                        <span>{s.title}</span>
                        {isVpnLocked ? (
                          <Lock className="w-3 h-3 text-amber-400 shrink-0" title="WireGuard VPN or LAN required to access this service" />
                        ) : (
                          <ExternalLink className="w-3 h-3 text-slate-600 group-hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                        )}
                      </div>
                      <span className="text-[11px] font-mono text-slate-500 truncate block mt-0.5">
                        {s.url.replace(/^https?:\/\//, '')}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {s.liveStat && (
                      <span className="hidden sm:inline-block text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 truncate max-w-[130px]">
                        {s.liveStat}
                      </span>
                    )}
                    {isVpnLocked ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/30" title="Connect to WireGuard VPN to access this hostname">
                        <Lock className="w-2.5 h-2.5 text-amber-400" />
                        VPN Locked
                      </span>
                    ) : s.requires_vpn ? (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-mono bg-purple-500/10 text-purple-300 border border-purple-500/20">
                        <Shield className="w-2.5 h-2.5 text-purple-400" />
                        VPN
                      </span>
                    ) : null}

                    <div
                      className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-mono uppercase tracking-wider border ${
                        isOnline
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : isOffline
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isOnline ? 'bg-emerald-400 animate-pulse' : isOffline ? 'bg-rose-500' : 'bg-slate-500'
                        }`}
                      />
                      <span>{s.status || 'ping'}</span>
                    </div>

                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {s.telemetryType && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onOpenInspector?.(s.telemetryType!);
                          }}
                          className="p-1 text-slate-400 hover:text-emerald-400 rounded hover:bg-slate-800 transition-colors"
                          title="Inspect live telemetry"
                        >
                          <Activity className="w-3 h-3 text-emerald-400" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => handleCopy(e, s)}
                        className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
                        title="Copy URL"
                      >
                        {copiedUrlId === s.id ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                      {isOwner && (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onEditService(s);
                            }}
                            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onDeleteService(s.id);
                            }}
                            className="p-1 text-slate-400 hover:text-red-400 rounded hover:bg-slate-800 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Resize indicator badge when dragging */}
              {isCurrentResizing && (
                <span className="absolute top-1 right-1 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/40">
                  {currentColSpan}×{currentRowSpan}
                </span>
              )}

              {/* Drag Handle to Resize Card */}
              <div
                onMouseDown={(e) => handleStartResize(e, s)}
                className="absolute bottom-0.5 right-0.5 w-4 h-4 cursor-se-resize flex items-center justify-center text-slate-600 hover:text-red-400 opacity-20 group-hover:opacity-100 transition-opacity z-20"
                title="Drag to resize card (1x1, 2x1, 1x2, 2x2)"
              >
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none" className="text-current">
                  <circle cx="7" cy="7" r="1" fill="currentColor" />
                  <circle cx="7" cy="4" r="1" fill="currentColor" />
                  <circle cx="7" cy="1" r="1" fill="currentColor" />
                  <circle cx="4" cy="7" r="1" fill="currentColor" />
                  <circle cx="4" cy="4" r="1" fill="currentColor" />
                  <circle cx="1" cy="7" r="1" fill="currentColor" />
                </svg>
              </div>
            </div>
          );
        })}

        {items.length === 0 && (
          <div className="col-span-2 py-5 text-center border border-dashed border-slate-800/80 rounded-xl">
            <p className="text-xs text-slate-600">No services in this category</p>
            <button
              onClick={() => onAddService(category)}
              className="mt-1.5 text-xs text-red-400 hover:underline"
            >
              Add service
            </button>
          </div>
        )}
      </div>

      {/* Stacked Live Stats for Category */}
      {items.some((s) => s.liveStat || s.telemetryType) && (
        <div className="pt-2 border-t border-slate-800/80 space-y-1.5 mt-1">
          <div className="flex items-center justify-between px-1 text-[10px] font-mono uppercase tracking-wider text-slate-500">
            <span className="flex items-center gap-1.5">
              <Activity className="w-3 h-3 text-red-500" />
              <span>Category Telemetry</span>
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          {items
            .filter((s) => s.liveStat || s.telemetryType)
            .map((s) => (
              <div
                key={`cat-stat-${s.id}`}
                onClick={() => {
                  if (s.telemetryType && onOpenInspector) {
                    onOpenInspector(s.telemetryType);
                  }
                }}
                className={`group/pill flex items-center justify-between px-3 py-2 rounded-xl bg-[#12141c]/90 border border-slate-800/80 hover:border-slate-700/80 transition-all text-xs ${
                  s.telemetryType ? 'cursor-pointer hover:bg-[#181b28] hover:border-red-500/30' : ''
                }`}
                title={s.telemetryType ? 'Click to inspect live details' : undefined}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  <span className="font-semibold text-slate-200 group-hover/pill:text-white truncate">{s.title}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    {s.liveStat || 'Live'}
                  </span>
                  {s.telemetryType && (
                    <ChevronRight className="w-3 h-3 text-slate-500 group-hover/pill:text-white transition-transform group-hover/pill:translate-x-0.5" />
                  )}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------
   Homelab Board (Free-Play Grid with Multi-Server Nodes, Time, Notes)
------------------------------------------------------------- */
interface ServiceForm {
  title: string;
  url: string;
  description: string;
  icon: string;
  category: string;
  is_private: boolean;
  requires_vpn: boolean;
}

const SVC_EMPTY: ServiceForm = { title: '', url: '', description: '', icon: '', category: '', is_private: false, requires_vpn: false };

function HomelabBoard({
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
}: {
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
}) {
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

  const setColSpan = (cat: string, span: 1 | 2) => {
    const updated = {
      ...prefs,
      categoryWidths: {
        ...(prefs.categoryWidths || {}),
        [cat]: span,
      },
    };
    setPrefs(updated);
    saveUserPreferences(user?.id, updated);
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
        latency: '—',
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

  // Filtered services
  const filteredServices = useMemo(() => {
    return services.filter(s =>
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      (s.description || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.category || '').toLowerCase().includes(search.toLowerCase())
    );
  }, [services, search]);

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
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 items-start">
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

          {/* Category Visibility */}
          <div className="pt-2 border-t border-slate-800/80">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">Category Columns</span>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {orderedCategories.map(cat => {
                const isHidden = prefs.hiddenCategories.includes(cat);
                const count = services.filter(s => (s.category?.trim() || 'Services') === cat).length;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategoryHide(cat)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                      !isHidden
                        ? 'bg-slate-900 border-slate-700/80 text-white'
                        : 'bg-slate-950/50 border-slate-800 text-slate-500 opacity-60'
                    }`}
                  >
                    <div>
                      <div className="font-semibold">{cat}</div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">{count} services</div>
                    </div>
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                      !isHidden ? 'bg-red-600 border-red-500 text-white' : 'border-slate-700 bg-slate-800/50'
                    }`}>
                      {!isHidden && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* -------------------------------------------------------------
   Analytics Tab (Charts & Traffic Breakdown)
------------------------------------------------------------- */
interface DayChartEntry {
  date: string;
  views: number;
  visitors: number;
}

function DayChart({ data, days }: { data: DayChartEntry[] | null | undefined; days: number }) {
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

function AnalyticsTab() {
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

/* -------------------------------------------------------------
   Messages Tab
------------------------------------------------------------- */
function MessagesTab() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [view, setView] = useState<'inbox' | 'archived'>('inbox');
  const [expanded, setExpanded] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const path = view === 'archived' ? '/messages?archived=true' : '/messages';
      const data = await api.get<Message[]>(path);
      setMessages(Array.isArray(data) ? data : []);
    } catch (e) {
      setError((e as Error).message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [view]);

  const onExpand = async (m: Message) => {
    const next = expanded === m.id ? null : m.id;
    setExpanded(next);
    if (next && !m.read_at) {
      try {
        await api.patch(`/messages/${m.id}/read`);
        setMessages((list) => list.map((x) => x.id === m.id ? { ...x, read_at: new Date().toISOString() } : x));
      } catch (_) {}
    }
  };

  const archive = async (id: number) => {
    try {
      await api.patch(`/messages/${id}/archive`);
      setMessages((list) => list.filter((m) => m.id !== id));
    } catch (e) { setError((e as Error).message); }
  };

  const remove = async (id: number) => {
    if (!confirm('Delete this message?')) return;
    try {
      await api.delete(`/messages/${id}`);
      setMessages((list) => list.filter((m) => m.id !== id));
    } catch (e) { setError((e as Error).message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5 bg-[#17181e] p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setView('inbox')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              view === 'inbox' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Inbox
          </button>
          <button
            onClick={() => setView('archived')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              view === 'archived' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Archived
          </button>
        </div>
        <button onClick={load} className="p-2 border border-slate-800 rounded-xl text-slate-400 hover:text-white bg-white/[0.02]">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <ErrBox msg={error} />

      {loading ? <Spinner /> : messages.length === 0 ? (
        <div className="p-12 text-center text-slate-500 text-xs border border-slate-800 rounded-xl">No messages</div>
      ) : (
        <ul className="space-y-2">
          {messages.map((m) => {
            const unread = !m.read_at;
            const open = expanded === m.id;
            return (
              <li key={m.id} className="rounded-xl border border-slate-800 bg-[#16181f] overflow-hidden">
                <button onClick={() => onExpand(m)} className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-white/[0.02] transition-colors">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-slate-100 truncate">{m.subject || '(no subject)'}</span>
                      {unread && <span className="w-2 h-2 rounded-full bg-red-500" />}
                    </div>
                    <div className="text-xs text-slate-500 truncate mt-0.5">
                      {m.name} &lt;{m.email}&gt; · {fmtDate(m.created_at)}
                    </div>
                  </div>
                  <span className="text-slate-500 text-xs font-mono">{open ? '−' : '+'}</span>
                </button>
                {open && (
                  <div className="border-t border-slate-800 p-4 space-y-3 bg-[#13141a]">
                    <pre className="whitespace-pre-wrap text-xs text-slate-300 font-sans leading-relaxed">{m.content}</pre>
                    <div className="flex gap-2 pt-2">
                      {!m.archived && (
                        <button onClick={() => archive(m.id)} className="px-3 py-1.5 text-xs font-semibold border border-slate-700 text-slate-300 hover:text-white rounded-lg">
                          Archive
                        </button>
                      )}
                      <button onClick={() => remove(m.id)} className="px-3 py-1.5 text-xs font-semibold bg-rose-600/20 text-rose-300 hover:bg-rose-600/30 border border-rose-500/30 rounded-lg">
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* -------------------------------------------------------------
   Projects Tab
------------------------------------------------------------- */
interface ProjectForm {
  title: string;
  description: string;
  url: string;
  demo_url: string;
  github_url: string;
  thumbnail_url: string;
  tech_stack: string;
  tags: string;
  featured: boolean;
}

const PROJ_EMPTY: ProjectForm = { title: '', description: '', url: '', demo_url: '', github_url: '', thumbnail_url: '', tech_stack: '', tags: '', featured: false };

function ProjectsTab() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [modal, setModal] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string>('');
  const [editing, setEditing] = useState<Project | null>(null);
  const [form, setForm] = useState<ProjectForm>(PROJ_EMPTY);

  const load = async () => {
    setLoading(true);
    try { setProjects(await api.get<Project[]>('/projects')); }
    catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const set = (k: keyof ProjectForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value }));

  const toArr = (s: string): string[] => s.split(',').map((x) => x.trim()).filter(Boolean);
  const fromArr = (v: string[] | string | null | undefined): string => (Array.isArray(v) ? v.join(', ') : (v || ''));

  const openNew = () => { setEditing(null); setForm(PROJ_EMPTY); setModalError(''); setModal(true); };
  const openEdit = (p: Project) => {
    setEditing(p);
    setForm({ title: p.title || '', description: p.description || '', url: p.url || '', demo_url: p.demo_url || '', github_url: p.github_url || '', thumbnail_url: p.thumbnail_url || '', tech_stack: fromArr(p.tech_stack), tags: fromArr(p.tags), featured: !!p.featured });
    setModalError('');
    setModal(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setModalError('');
    const payload = { ...form, tech_stack: toArr(form.tech_stack), tags: toArr(form.tags) };
    try {
      if (editing) await api.put(`/projects/${editing.id}`, payload);
      else await api.post('/projects', payload);
      setModal(false);
      setModalError('');
      load();
    } catch (e) { setModalError((e as Error).message); }
  };

  const remove = async (id: number) => {
    if (!confirm('Delete project?')) return;
    try { await api.delete(`/projects/${id}`); load(); }
    catch (e) { setError((e as Error).message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">All Projects ({projects.length})</h2>
        <button onClick={openNew} className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold transition-all">
          <Plus className="w-3.5 h-3.5" />
          Add Project
        </button>
      </div>

      <ErrBox msg={error} />

      {loading ? <Spinner /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {projects.map((p) => (
            <div key={p.id} className="flex flex-col justify-between p-4 rounded-xl border border-slate-800 bg-[#16181f] hover:border-slate-700 transition-colors">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-sm text-slate-100">{p.title}</h3>
                  {p.featured && <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-red-500/10 text-red-400 border border-red-500/20">featured</span>}
                </div>
                {p.description && <p className="text-xs text-slate-400 mt-2 line-clamp-2">{p.description}</p>}
                <div className="flex flex-wrap gap-1 mt-3">
                  {(p.tech_stack || []).map(t => (
                    <span key={t} className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-750">{t}</span>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between pt-3 mt-4 border-t border-slate-800/80">
                <div className="flex gap-2">
                  {p.url && <a href={p.url} target="_blank" rel="noreferrer" className="text-xs text-red-400 hover:underline">Link</a>}
                  {p.github_url && <a href={p.github_url} target="_blank" rel="noreferrer" className="text-xs text-slate-400 hover:underline">GitHub</a>}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(p)} className="p-1 text-slate-500 hover:text-slate-200"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => remove(p.id)} className="p-1 text-slate-500 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => { setModal(false); setModalError(''); }} title={editing ? 'Edit Project' : 'Add Project'}
        footer={
          <>
            <button onClick={() => { setModal(false); setModalError(''); }} className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white">Cancel</button>
            <button onClick={submit} className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold">Save</button>
          </>
        }>
        <form onSubmit={submit} className="space-y-3">
          <ErrBox msg={modalError} />
          <Field label="Title"><input className="input-field" required value={form.title} onChange={set('title')} /></Field>
          <Field label="Description"><textarea className="input-field" rows={2} value={form.description} onChange={set('description')} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Live URL"><input className="input-field" value={form.url} onChange={set('url')} /></Field>
            <Field label="GitHub URL"><input className="input-field" value={form.github_url} onChange={set('github_url')} /></Field>
          </div>
          <Field label="Tech Stack (comma separated)"><input className="input-field" value={form.tech_stack} onChange={set('tech_stack')} /></Field>
          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer pt-1">
            <input type="checkbox" checked={form.featured} onChange={set('featured')} className="rounded accent-red-500" />
            <span>Feature on front page</span>
          </label>
        </form>
      </Modal>
    </div>
  );
}

/* -------------------------------------------------------------
   Skills Tab
------------------------------------------------------------- */
interface SkillForm {
  name: string;
  category: string;
  proficiency: number;
  color: string;
}

const SKILL_EMPTY: SkillForm = { name: '', category: '', proficiency: 4, color: '#ef4444' };

function SkillsTab() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [modal, setModal] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string>('');
  const [editing, setEditing] = useState<Skill | null>(null);
  const [form, setForm] = useState<SkillForm>(SKILL_EMPTY);

  const load = async () => {
    setLoading(true);
    try { setSkills(await api.get<Skill[]>('/skills')); }
    catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm(SKILL_EMPTY); setModalError(''); setModal(true); };
  const openEdit = (s: Skill) => {
    setEditing(s);
    setForm({ name: s.name || '', category: s.category || '', proficiency: s.proficiency ?? 4, color: s.color || '#ef4444' });
    setModalError('');
    setModal(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setModalError('');
    try {
      if (editing) await api.put(`/skills/${editing.id}`, form);
      else await api.post('/skills', form);
      setModal(false);
      setModalError('');
      load();
    } catch (e) { setModalError((e as Error).message); }
  };

  const remove = async (id: number) => {
    if (!confirm('Delete skill?')) return;
    try { await api.delete(`/skills/${id}`); load(); }
    catch (e) { setError((e as Error).message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Skills ({skills.length})</h2>
        <button onClick={openNew} className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold transition-all">
          <Plus className="w-3.5 h-3.5" />
          Add Skill
        </button>
      </div>

      <ErrBox msg={error} />

      {loading ? <Spinner /> : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
          {skills.map((s) => (
            <div key={s.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-[#16181f]">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color || '#ef4444' }} />
                <span className="text-xs font-semibold text-slate-200 truncate">{s.name}</span>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                <button onClick={() => openEdit(s)} className="p-1 text-slate-500 hover:text-slate-300"><Edit2 className="w-3 h-3" /></button>
                <button onClick={() => remove(s.id)} className="p-1 text-slate-500 hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => { setModal(false); setModalError(''); }} title={editing ? 'Edit Skill' : 'Add Skill'}
        footer={
          <>
            <button onClick={() => { setModal(false); setModalError(''); }} className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white">Cancel</button>
            <button onClick={submit} className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold">Save</button>
          </>
        }>
        <form onSubmit={submit} className="space-y-3">
          <ErrBox msg={modalError} />
          <Field label="Skill Name"><input className="input-field" required value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} /></Field>
          <Field label="Category"><input className="input-field" value={form.category} onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))} /></Field>
          <Field label="Proficiency (1-5)">
            <input type="number" min="1" max="5" className="input-field" value={form.proficiency} onChange={(e) => setForm(f => ({ ...f, proficiency: Number(e.target.value) }))} />
          </Field>
        </form>
      </Modal>
    </div>
  );
}

/* -------------------------------------------------------------
   Service Permissions Grid (Phase 9)
------------------------------------------------------------- */
interface ServicePermissionsData {
  users: Array<{ id: number; name: string; username: string; email: string; role: string }>;
  services: Array<{ id: number; title: string; category: string; icon: string; is_private: boolean; requires_vpn: boolean; display_order: number }>;
  permissions: Array<{ service_id: number; user_id: number; allowed: number }>;
}

function ServicePermissionsGrid() {
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

/* -------------------------------------------------------------
   Feature Flags Grid (Phase 9)
------------------------------------------------------------- */
interface FeatureFlagsData {
  users: Array<{ id: number; name: string; username: string; role: string }>;
  featureKeys: string[];
  flags: Array<{ user_id: number; feature_key: string; enabled: number }>;
}

const FEATURE_META: Record<string, { label: string; desc: string }> = {
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

function FeatureFlagsGrid() {
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

/* -------------------------------------------------------------
   Users Tab (Enhanced with Permissions and Feature Flags)
------------------------------------------------------------- */
function UsersTab({ defaultSubTab = 'accounts' }: { defaultSubTab?: 'accounts' | 'permissions' | 'features' }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab');
  const initialSubTab = (currentTab === 'permissions' || currentTab === 'features') 
    ? currentTab 
    : defaultSubTab;
  const [subTab, setSubTab] = useState<'accounts' | 'permissions' | 'features'>(initialSubTab);

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [modal, setModal] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string>('');
  
  const [form, setForm] = useState({
    username: '',
    name: '',
    email: '',
    role: 'user',
    passwordMode: 'auto' as 'auto' | 'custom',
    password: '',
  });
  const [showCustomPwd, setShowCustomPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Credentials notification banner
  const [credentialsBanner, setCredentialsBanner] = useState<{
    username: string;
    password: string;
    wasGenerated: boolean;
    action: 'created' | 'reset';
  } | null>(null);
  const [showBannerPwd, setShowBannerPwd] = useState<boolean>(true);
  const [copiedField, setCopiedField] = useState<string>('');

  const load = async () => {
    setLoading(true);
    try { setUsers(await api.get<User[]>('/users')); }
    catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  // Synchronize when outer tab changes
  useEffect(() => {
    if (currentTab === 'permissions' || currentTab === 'features' || currentTab === 'users') {
      setSubTab(currentTab === 'permissions' ? 'permissions' : currentTab === 'features' ? 'features' : 'accounts');
    }
  }, [currentTab]);

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(''), 2500);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setModalError('');

    if (!form.username.trim()) {
      setModalError('Username is required');
      return;
    }

    if (form.passwordMode === 'custom' && form.password.trim().length < 6) {
      setModalError('Custom password must be at least 6 characters');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post<{ user: User; oneTimePassword: string; wasGenerated: boolean }>('/users', {
        username: form.username.trim(),
        name: form.name.trim() || undefined,
        email: form.email.trim() || undefined,
        role: form.role,
        password: form.passwordMode === 'custom' ? form.password.trim() : undefined,
      });

      setModal(false);
      setModalError('');
      setForm({ username: '', name: '', email: '', role: 'user', passwordMode: 'auto', password: '' });
      setShowBannerPwd(true);
      setCredentialsBanner({
        username: res.user.username,
        password: res.oneTimePassword,
        wasGenerated: res.wasGenerated,
        action: 'created',
      });
      load();
    } catch (e) {
      setModalError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const resetUserPassword = async (u: User) => {
    if (!confirm(`Reset password for "${u.username}"? A new temporary password will be generated.`)) return;
    try {
      const res = await api.post<{ oneTimePassword: string }>(`/users/${u.id}/reset-password`);
      setShowBannerPwd(true);
      setCredentialsBanner({
        username: u.username,
        password: res.oneTimePassword,
        wasGenerated: true,
        action: 'reset',
      });
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const remove = async (u: User) => {
    if (u.role === 'owner') {
      alert('Cannot delete the primary owner account');
      return;
    }
    if (!confirm(`Are you sure you want to permanently delete user "${u.username}"?`)) return;
    try {
      await api.delete(`/users/${u.id}`);
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3 overflow-x-auto">
        <button
          onClick={() => { setSubTab('accounts'); setSearchParams({ tab: 'users' }); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            subTab === 'accounts'
              ? 'bg-red-600 text-white shadow-[0_0_20px_-4px_rgba(239,68,68,0.5)]'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <UsersIcon className="w-4 h-4" />
          User Accounts
        </button>
        <button
          onClick={() => { setSubTab('permissions'); setSearchParams({ tab: 'permissions' }); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            subTab === 'permissions'
              ? 'bg-red-600 text-white shadow-[0_0_20px_-4px_rgba(239,68,68,0.5)]'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Service Permissions Grid
        </button>
        <button
          onClick={() => { setSubTab('features'); setSearchParams({ tab: 'features' }); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            subTab === 'features'
              ? 'bg-red-600 text-white shadow-[0_0_20px_-4px_rgba(239,68,68,0.5)]'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <Sliders className="w-4 h-4" />
          Feature Flags UI
        </button>
      </div>

      {subTab === 'permissions' && <ServicePermissionsGrid />}
      {subTab === 'features' && <FeatureFlagsGrid />}
      {subTab === 'accounts' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">User Management ({users.length})</h2>
              <p className="text-xs text-slate-500 mt-0.5">Manage registered accounts, grant roles, and issue password resets.</p>
            </div>
            <button
              onClick={() => {
                setError('');
                setModalError('');
                setForm({ username: '', name: '', email: '', role: 'user', passwordMode: 'auto', password: '' });
                setModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold shadow-[0_0_20px_-5px_rgba(239,68,68,0.4)] transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Create User
            </button>
          </div>

          <ErrBox msg={error} />

          {/* Prominent Credentials Banner */}
          {credentialsBanner && (
            <div className="p-4 rounded-2xl border border-emerald-500/40 bg-emerald-950/20 backdrop-blur-md shadow-lg space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    User {credentialsBanner.action === 'created' ? 'Created' : 'Password Reset'} Successfully!
                  </span>
                </div>
                <button
                  onClick={() => setCredentialsBanner(null)}
                  className="text-slate-400 hover:text-white text-xs font-semibold px-2 py-0.5 rounded hover:bg-white/10"
                >
                  Dismiss
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950/60 p-3.5 rounded-xl border border-emerald-500/20 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Username</span>
                  <span className="text-white font-bold">{credentialsBanner.username}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">
                    {credentialsBanner.wasGenerated ? 'Temporary Password (OTP)' : 'Custom Password'}
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-emerald-300 font-bold tracking-wider font-mono">
                      {showBannerPwd ? credentialsBanner.password : '••••••••••••'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowBannerPwd(v => !v)}
                      className="p-1 text-slate-400 hover:text-white bg-slate-800 rounded transition-colors"
                      title={showBannerPwd ? 'Hide Password' : 'Show Password'}
                      aria-label={showBannerPwd ? 'Hide Password' : 'Show Password'}
                    >
                      {showBannerPwd ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => copyText(credentialsBanner.password, 'password')}
                      className="p-1 text-slate-400 hover:text-white bg-slate-800 rounded transition-colors"
                      title="Copy Password"
                    >
                      {copiedField === 'password' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                <span>
                  {credentialsBanner.wasGenerated
                    ? '⚠️ The user will be required to choose a new password upon first login.'
                    : '✓ The user can log in immediately with this password.'}
                </span>
                <button
                  type="button"
                  onClick={() => copyText(`${window.location.origin}/login\nUsername: ${credentialsBanner.username}\nPassword: ${credentialsBanner.password}`, 'all')}
                  className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-lg font-sans font-medium transition-colors inline-flex items-center gap-1.5"
                >
                  {copiedField === 'all' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copiedField === 'all' ? 'Copied with Login Link!' : 'Copy Credentials'}
                </button>
              </div>
            </div>
          )}

          {loading ? <Spinner /> : (
            <div className="rounded-xl border border-slate-800 bg-[#16181f] overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/60 border-b border-slate-800 text-[11px] font-mono uppercase text-slate-400">
                  <tr>
                    <th className="p-3">Username</th>
                    <th className="p-3">Name</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-white/[0.01]">
                      <td className="p-3 font-mono font-medium text-slate-200">
                        @{u.username}
                      </td>
                      <td className="p-3 text-slate-400">{u.name || '—'}</td>
                      <td className="p-3 font-mono text-slate-400">{u.email || '—'}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                          u.role === 'owner' 
                            ? 'bg-red-950/40 text-red-400 border-red-500/40 font-bold'
                            : 'bg-slate-800 text-slate-300 border-slate-700/60'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="p-3">
                        {u.must_change_password ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-950/40 text-amber-400 border border-amber-500/30">
                            Must Change Pwd
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950/30 text-emerald-400 border border-emerald-500/20">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right space-x-2">
                        <button
                          onClick={() => resetUserPassword(u)}
                          className="p-1 text-slate-500 hover:text-amber-400 transition-colors"
                          title={`Reset password for @${u.username}`}
                        >
                          <Key className="w-3.5 h-3.5 inline" />
                        </button>
                        {u.role !== 'owner' && (
                          <button
                            onClick={() => remove(u)}
                            className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                            title={`Delete @${u.username}`}
                          >
                            <Trash2 className="w-3.5 h-3.5 inline" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Create User Modal */}
          <Modal
            open={modal}
            onClose={() => { setModal(false); setModalError(''); }}
            title="Create User"
            footer={
              <>
                <button
                  onClick={() => { setModal(false); setModalError(''); }}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={submit}
                  disabled={submitting}
                  className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold shadow-[0_0_15px_-3px_rgba(239,68,68,0.5)] transition-all disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create User'}
                </button>
              </>
            }
          >
            <form onSubmit={submit} className="space-y-4 text-xs">
              {/* Modal error display right inside the modal */}
              <ErrBox msg={modalError} />

              {/* Helper alert */}
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-[11px] leading-relaxed">
                Only <strong className="text-white">Username</strong> is required. Name and email can be left blank to default to the username handle.
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Username <span className="text-red-500 font-bold">*</span>
                </label>
                <input
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-red-500 font-mono"
                  required
                  placeholder="e.g. johndoe"
                  value={form.username}
                  onChange={(e) => setForm(f => ({ ...f, username: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Full Name <span className="text-slate-500 font-normal">(Optional)</span>
                </label>
                <input
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-red-500"
                  placeholder="e.g. John Doe (defaults to username)"
                  value={form.name}
                  onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Email Address <span className="text-slate-500 font-normal">(Optional)</span>
                </label>
                <input
                  type="email"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-red-500"
                  placeholder="e.g. john@local.lan (defaults to username@local.lan)"
                  value={form.email}
                  onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Role
                </label>
                <select
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-red-500"
                  value={form.role}
                  onChange={(e) => setForm(f => ({ ...f, role: e.target.value }))}
                >
                  <option value="user">User (Standard Access)</option>
                  <option value="owner">Owner (Full Admin Access)</option>
                </select>
              </div>

              {/* Password Options */}
              <div className="pt-2 border-t border-slate-800/80 space-y-3">
                <label className="block text-xs font-medium text-slate-300">
                  Password Provisioning
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, passwordMode: 'auto' }))}
                    className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                      form.passwordMode === 'auto'
                        ? 'bg-red-600/10 border-red-500/50 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="font-semibold text-[11px]">Auto-Generate OTP</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Secure one-time temporary password</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, passwordMode: 'custom' }))}
                    className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                      form.passwordMode === 'custom'
                        ? 'bg-red-600/10 border-red-500/50 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="font-semibold text-[11px]">Set Custom Password</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Define password right now</div>
                  </button>
                </div>

                {form.passwordMode === 'custom' ? (
                  <div className="relative pt-1">
                    <input
                      type={showCustomPwd ? 'text' : 'password'}
                      className="w-full pl-3 pr-9 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-red-500 font-mono"
                      placeholder="Enter password (minimum 6 characters)"
                      value={form.password}
                      onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCustomPwd(v => !v)}
                      className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
                    >
                      {showCustomPwd ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    A 12-character secure password will be generated and displayed upon creation. The user will be required to change it on their first login.
                  </p>
                )}
              </div>
            </form>
          </Modal>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------
   Main Homelab Free-Play Dashboard Page
------------------------------------------------------------- */
const ADMIN_VIEWS = [
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'messages', label: 'Messages', icon: Inbox },
  { id: 'projects', label: 'Projects', icon: Code2 },
  { id: 'skills', label: 'Skills', icon: Wrench },
  { id: 'users', label: 'User Accounts', icon: UsersIcon },
  { id: 'permissions', label: 'Service Permissions', icon: ShieldCheck },
  { id: 'features', label: 'Feature Flags', icon: Sliders },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'board';

  const [stats, setStats] = useState<SystemStats | null>(null);
  const [nodes, setNodes] = useState<ServerNode[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [speedtest, setSpeedtest] = useState<SpeedtestResult | null>(null);
  const [runningSpeedtest, setRunningSpeedtest] = useState<boolean>(false);
  const [unread, setUnread] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingNodes, setLoadingNodes] = useState<boolean>(true);
  const [adminMenuOpen, setAdminMenuOpen] = useState<boolean>(false);
  const [prefs, setPrefs] = useState<UserPreferences>(() => getUserPreferences(user?.id));

  const [wgStats, setWgStats] = useState<WireguardStatus | null>(null);
  const [piholeStats, setPiholeStats] = useState<PiholeStats | null>(null);
  const [qbitStats, setQbitStats] = useState<QbittorrentStats | null>(null);
  const [jellyfinStats, setJellyfinStats] = useState<JellyfinStats | null>(null);
  const [jellyseerrStats, setJellyseerrStats] = useState<JellyseerrStats | null>(null);
  const [vpnStatus, setVpnStatus] = useState<{ connected: boolean; ip: string; isVpn?: boolean; isLan?: boolean } | null>(null);
  const [activeInspector, setActiveInspector] = useState<'wireguard' | 'pihole' | 'qbittorrent' | 'jellyfin' | 'jellyseerr' | null>(null);

  useEffect(() => {
    const onPrefsChange = () => setPrefs(getUserPreferences(user?.id));
    window.addEventListener('mymanager_prefs_changed', onPrefsChange);
    return () => window.removeEventListener('mymanager_prefs_changed', onPrefsChange);
  }, [user?.id]);

  const loadAll = () => {
    // Load VPN / LAN network connectivity status
    api.get<{ connected: boolean; ip: string; isVpn?: boolean; isLan?: boolean }>('/vpn-status')
      .then(res => setVpnStatus(res))
      .catch(() => setVpnStatus({ connected: false, ip: '' }));

    // Load services from /services/mine (Phase 3 & 5 backend persistence + permissions)
    api.get<Service[]>('/services/mine')
      .then(res => {
        setServices(res);
        // Fetch live metrics for all applicable services
        const statRequests: Promise<any>[] = [
          api.get<any>('/qbittorrent/stats').catch(() => null),
          api.get<any>('/jellyfin/stats').catch(() => null),
          api.get<any>('/jellyseerr/stats').catch(() => null),
        ];

        if (user?.role === 'owner') {
          statRequests.push(api.get<any>('/admin/wireguard/status').catch(() => null));
          statRequests.push(api.get<any>('/admin/pihole/stats').catch(() => null));
        }

        Promise.allSettled(statRequests).then((results) => {
          const qRes = results[0]?.status === 'fulfilled' ? results[0].value : null;
          const jRes = results[1]?.status === 'fulfilled' ? results[1].value : null;
          const sRes = results[2]?.status === 'fulfilled' ? results[2].value : null;
          const wgRes = results[3]?.status === 'fulfilled' ? results[3].value : null;
          const piRes = results[4]?.status === 'fulfilled' ? results[4].value : null;

          if (qRes) setQbitStats(qRes);
          if (jRes) setJellyfinStats(jRes);
          if (sRes) setJellyseerrStats(sRes);
          if (wgRes) setWgStats(wgRes);
          if (piRes) setPiholeStats(piRes);

          const qbit = qRes?.online ? qRes : null;
          const jellyfin = jRes?.online ? jRes : null;
          const jellyseerr = sRes?.online ? sRes : null;
          const wireguard = wgRes?.online ? wgRes : null;
          const pihole = piRes?.online ? piRes : null;

          setServices(currentServices => currentServices.map(s => {
            const title = s.title.toLowerCase();
            let statText: string | undefined = undefined;
            let telemetryType: 'wireguard' | 'pihole' | 'qbittorrent' | 'jellyfin' | 'jellyseerr' | undefined = undefined;

            if (title.includes('qbit')) {
              telemetryType = 'qbittorrent';
              if (qbit) {
                const mb = (qbit.downloadSpeed / (1024 * 1024)).toFixed(1);
                statText = `↓ ${mb} MB/s · ${qbit.activeCount} active`;
              } else if (qRes?.online === false) {
                statText = 'Offline';
              }
            } else if (title.includes('jellyfin')) {
              telemetryType = 'jellyfin';
              if (jellyfin) {
                const streams = jellyfin.activeStreamCount;
                statText = `${streams} stream${streams === 1 ? '' : 's'} active`;
              } else if (jRes?.online === false) {
                statText = 'Offline';
              }
            } else if (title.includes('jellyseerr')) {
              telemetryType = 'jellyseerr';
              if (jellyseerr) {
                const pending = jellyseerr.pendingCount;
                statText = `${pending} pending request${pending === 1 ? '' : 's'}`;
              } else if (sRes?.online === false) {
                statText = 'Offline';
              }
            } else if (title.includes('wireguard')) {
              telemetryType = 'wireguard';
              if (wireguard) {
                const peers = wireguard.connectedPeers ?? wireguard.activePeers ?? (wireguard.peers?.filter((p: any) => p.connected)?.length ?? 0);
                statText = `${peers} active peer${peers === 1 ? '' : 's'}`;
              } else if (wgRes?.online === false) {
                statText = 'Offline';
              }
            } else if (title.includes('pi-hole') || title.includes('pihole')) {
              telemetryType = 'pihole';
              if (pihole) {
                const queries = pihole.queriesToday?.toLocaleString?.() ?? pihole.queriesToday ?? 0;
                statText = `${queries} queries · ${pihole.percentBlocked ?? 0}% blocked`;
              } else if (piRes?.online === false) {
                statText = 'Offline';
              }
            }

            return {
              ...s,
              liveStat: statText !== undefined ? statText : s.liveStat,
              telemetryType: telemetryType || s.telemetryType,
            };
          }));
        });
      })
      .catch(() => {});

    // Load nodes telemetry
    api.get<ServerNode[]>('/system/nodes')
      .then(res => setNodes(res))
      .catch(() => {})
      .finally(() => setLoadingNodes(false));

    // Load speedtest latest
    api.get<SpeedtestResult>('/speedtest/latest')
      .then(res => setSpeedtest(res))
      .catch(() => {});

    // Load stats & unread
    Promise.all([
      api.get<SystemStats>('/system/stats').catch(() => null),
      api.get<{ count: number }>('/messages/unread-count').catch(() => ({ count: 0 })),
    ]).then(([s, u]) => {
      if (s) setStats(s);
      if (u) setUnread(u.count);
    }).finally(() => setLoading(false));
  };

  const handleRunSpeedtest = async () => {
    setRunningSpeedtest(true);
    try {
      const res = await api.post<SpeedtestResult>('/admin/speedtest/run', {});
      setSpeedtest(res);
    } catch {
    } finally {
      setRunningSpeedtest(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      syncUserPreferencesFromBackend(user.id);
    }
    loadAll();
    const interval = setInterval(loadAll, 10000);
    return () => clearInterval(interval);
  }, [user?.id]);

  const selectTab = (nextTab: string) => {
    setSearchParams({ tab: nextTab });
    setAdminMenuOpen(false);
  };

  const handleUpdateCardLayout = async (
    updates: Array<{ id: number; start_col: number; start_row: number; col_span: number; row_span: number }>
  ) => {
    if (!updates || updates.length === 0) return;

    setServices((prev) =>
      prev.map((s) => {
        const update = updates.find((u) => u.id === s.id);
        if (update) {
          return {
            ...s,
            start_col: update.start_col,
            start_row: update.start_row,
            col_span: update.col_span,
            row_span: update.row_span,
          };
        }
        return s;
      })
    );

    try {
      await api.patch('/services/mine', {
        preferences: updates.map((u) => ({
          service_id: u.id,
          start_col: u.start_col,
          start_row: u.start_row,
          col_span: u.col_span,
          row_span: u.row_span,
          enabled: true,
        })),
      });
    } catch (e) {
      console.error('Failed to persist card layout', e);
    }
  };

  return (
    <div className="min-h-screen bg-[#111216] text-slate-200">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        {/* Navigation & View Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <button
              onClick={() => selectTab('board')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                tab === 'board'
                  ? 'bg-red-600 text-white shadow-[0_0_20px_-4px_rgba(239,68,68,0.5)]'
                  : 'bg-[#16181f] text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span>Homelab Board</span>
            </button>

            {user?.role === 'owner' && (
              <div className="relative">
                <button
                  onClick={() => setAdminMenuOpen(v => !v)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                    tab !== 'board'
                      ? 'bg-slate-800 text-red-400 border-red-500/40'
                      : 'bg-[#16181f] text-slate-400 hover:text-slate-200 border-slate-800'
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-red-500" />
                  <span>{tab !== 'board' ? `Manage: ${tab.charAt(0).toUpperCase() + tab.slice(1)}` : 'Management Hub'}</span>
                  {unread > 0 && (
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  )}
                  <ChevronDown className="w-3 h-3 text-slate-500 ml-0.5" />
                </button>

                {adminMenuOpen && (
                  <div className="absolute left-0 mt-2 w-52 rounded-2xl border border-slate-800 bg-[#16181f] p-2 shadow-2xl z-50">
                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-800/80 mb-1">
                      Admin Management
                    </div>
                    {ADMIN_VIEWS.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => selectTab(v.id)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-left transition-colors ${
                          tab === v.id ? 'bg-red-500/10 text-red-400 font-bold' : 'text-slate-300 hover:bg-slate-800/80'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <v.icon className="w-3.5 h-3.5" />
                          <span>{v.label}</span>
                        </div>
                        {v.id === 'messages' && unread > 0 && (
                          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-red-600 text-white font-mono">
                            {unread}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick Hub Tools */}
          <div className="flex items-center gap-2 text-xs font-mono">
            {/* VPN / Network Status Badge */}
            {vpnStatus && (
              <div
                className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono transition-colors ${
                  vpnStatus.connected
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                }`}
                title={
                  vpnStatus.connected
                    ? `Connected to Homelab (${vpnStatus.isVpn ? 'WireGuard VPN' : 'Home LAN'} · ${vpnStatus.ip})`
                    : `External Connection (${vpnStatus.ip}) — Local .home.arpa services locked`
                }
              >
                {vpnStatus.connected ? (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{vpnStatus.isVpn ? 'VPN Active' : 'LAN Active'}</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                    <span>External (No VPN)</span>
                  </>
                )}
              </div>
            )}

            {tab !== 'board' && (
              <button
                onClick={() => selectTab('board')}
                className="px-3 py-1.5 rounded-xl border border-slate-800 bg-white/[0.02] text-slate-400 hover:text-white transition-colors"
              >
                ← Back to Board
              </button>
            )}
            <Link
              to="/terminal"
              className="p-2 text-slate-400 hover:text-white rounded-xl bg-[#16181f] border border-slate-800 transition-colors"
              title="SSH Web Terminal"
            >
              <TermIcon className="w-4 h-4" />
            </Link>
            <Link
              to="/files"
              className="p-2 text-slate-400 hover:text-white rounded-xl bg-[#16181f] border border-slate-800 transition-colors"
              title="File Browser"
            >
              <Folder className="w-4 h-4" />
            </Link>
            <Link
              to="/profile"
              className="p-2 text-slate-400 hover:text-white rounded-xl bg-[#16181f] border border-slate-800 transition-colors"
              title="User Account & Visibility Settings"
            >
              <UserIcon className="w-4 h-4 text-red-400" />
            </Link>
          </div>
        </div>

        {/* Board View */}
        {tab === 'board' && (
          <HomelabBoard
            services={services}
            nodes={nodes}
            loadingNodes={loadingNodes}
            speedtest={speedtest}
            vpnConnected={vpnStatus?.connected}
            onRunSpeedtest={handleRunSpeedtest}
            isRunningSpeedtest={runningSpeedtest}
            onUpdateCardLayout={handleUpdateCardLayout}
            onOpenInspector={(type) => setActiveInspector(type)}
            onRefresh={loadAll}
          />
        )}

        {/* Telemetry Inspector Modals (Phase 6) */}
        <WireguardInspectorModal
          open={activeInspector === 'wireguard'}
          onClose={() => setActiveInspector(null)}
          data={wgStats}
          loading={loading}
          onRefresh={loadAll}
        />

        <PiholeInspectorModal
          open={activeInspector === 'pihole'}
          onClose={() => setActiveInspector(null)}
          data={piholeStats}
          loading={loading}
          onRefresh={loadAll}
        />

        <QbittorrentInspectorModal
          open={activeInspector === 'qbittorrent'}
          onClose={() => setActiveInspector(null)}
          data={qbitStats}
          loading={loading}
          onRefresh={loadAll}
        />

        <JellyfinInspectorModal
          open={activeInspector === 'jellyfin'}
          onClose={() => setActiveInspector(null)}
          data={jellyfinStats}
          isOwner={user?.role === 'owner'}
          loading={loading}
          onRefresh={loadAll}
        />

        <JellyseerrInspectorModal
          open={activeInspector === 'jellyseerr'}
          onClose={() => setActiveInspector(null)}
          data={jellyseerrStats}
          isOwner={user?.role === 'owner'}
          loading={loading}
          onRefresh={loadAll}
        />

        {/* Secondary Management Views */}
        {tab === 'analytics' && <AnalyticsTab />}
        {tab === 'messages' && <MessagesTab />}
        {tab === 'projects' && <ProjectsTab />}
        {tab === 'skills' && <SkillsTab />}
        {(tab === 'users' || tab === 'permissions' || tab === 'features') && (
          <UsersTab defaultSubTab={tab === 'permissions' ? 'permissions' : tab === 'features' ? 'features' : 'accounts'} />
        )}
      </main>
    </div>
  );
}

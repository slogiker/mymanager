import { ReactNode, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import { api } from '../lib/api';
import { AnalyticsSummary, AnalyticsVisit, Message, Project, Service, Skill, User } from '../types';

const TABS = [
  { id: 'messages', label: 'Messages' },
  { id: 'users', label: 'Users' },
  { id: 'services', label: 'Services' },
  { id: 'projects', label: 'Projects' },
  { id: 'skills', label: 'Skills' },
  { id: 'analytics', label: 'Analytics' },
];

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="card w-full max-w-lg max-h-screen overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-700 px-5 py-3">
          <h3 className="text-lg font-semibold text-slate-100">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-100 text-xl leading-none">&times;</button>
        </div>
        <div className="space-y-3 px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-slate-700 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

interface StatusDotProps {
  status: string | null | undefined;
}

function StatusDot({ status }: StatusDotProps) {
  const color = status === 'online' ? 'bg-green-500' : status === 'offline' || status === 'timeout' ? 'bg-red-500' : 'bg-slate-500';
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${color} flex-shrink-0`} title={status || 'unknown'} />;
}

interface FieldProps {
  label: string;
  children: ReactNode;
}

function Field({ label, children }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">{label}</span>
      {children}
    </label>
  );
}

interface ErrBoxProps {
  msg: string;
}

function ErrBox({ msg }: ErrBoxProps) {
  if (!msg) return null;
  return <div className="rounded border border-red-700 bg-red-900/40 p-2 text-sm text-red-200">{msg}</div>;
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-2 border-slate-600 border-t-blue-500 rounded-full animate-spin" />
    </div>
  );
}

interface DayChartEntry {
  date: string;
  views: number;
  visitors: number;
}

interface DayChartProps {
  data: DayChartEntry[] | null | undefined;
  days: number;
}

function DayChart({ data, days }: DayChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="card p-5 mb-4 text-center text-slate-500 text-sm">No data for this period</div>
    );
  }

  const maxViews = Math.max(...data.map(d => d.views), 1);
  const width = 600;
  const height = 150;
  const paddingX = 30;
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
    <div className="card p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-200">Traffic Overview</h3>
          <p className="text-xs text-slate-500">Pageviews and unique visitors over the last {days} days</p>
        </div>
        <div className="flex items-center gap-4 text-xs font-semibold">
          <span className="flex items-center gap-1.5 text-blue-400">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500/80" />
            Views
          </span>
          <span className="flex items-center gap-1.5 text-cyan-400">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400/80" />
            Visitors
          </span>
        </div>
      </div>

      <div className="relative w-full overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible" preserveAspectRatio="none">
          <defs>
            <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="visitorsGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1={paddingX} y1={paddingY} x2={width - paddingX} y2={paddingY} stroke="rgba(148, 163, 184, 0.04)" />
          <line x1={paddingX} y1={height / 2} x2={width - paddingX} y2={height / 2} stroke="rgba(148, 163, 184, 0.04)" />
          <line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} stroke="rgba(148, 163, 184, 0.08)" />

          {/* Shaded Areas */}
          <polygon points={viewsArea} fill="url(#viewsGrad)" />
          <polygon points={visitorsArea} fill="url(#visitorsGrad)" />

          {/* Line Strokes */}
          <polyline points={viewsPath} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <polyline points={visitorsPath} fill="none" stroke="#22d3ee" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />

          {/* Value markers */}
          {data.length <= 15 && pointsViews.map((pt, idx) => {
            const [x, y] = pt.split(',');
            return (
              <circle key={idx} cx={x} cy={y} r="3" className="fill-blue-500 stroke-slate-900 stroke-2" />
            );
          })}
        </svg>
      </div>

      <div className="flex justify-between text-[9px] text-slate-500 mt-2 font-mono px-2">
        <span>{data[0]?.date?.slice(5)}</span>
        <span>{data[Math.floor(data.length / 2)]?.date?.slice(5)}</span>
        <span>{data[data.length - 1]?.date?.slice(5)}</span>
      </div>
    </div>
  );
}

function fmtDate(s: string | null | undefined): string {
  if (!s) return '';
  const d = new Date(s);
  return isNaN(d.getTime()) ? '' : d.toLocaleString();
}

function MessagesTab() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [view, setView] = useState<string>('inbox');
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
      <div className="flex items-center gap-2">
        <button onClick={() => setView('inbox')} className={view === 'inbox' ? 'btn-primary' : 'btn-outline'}>Inbox</button>
        <button onClick={() => setView('archived')} className={view === 'archived' ? 'btn-primary' : 'btn-outline'}>Archived</button>
        <button onClick={load} className="btn-outline ml-auto">Refresh</button>
      </div>
      <ErrBox msg={error} />
      {loading ? <Spinner /> : messages.length === 0 ? (
        <div className="text-slate-400 text-sm">No messages.</div>
      ) : null}
      {!loading && <ul className="space-y-2">
        {messages.map((m) => {
          const unread = !m.read_at;
          const open = expanded === m.id;
          return (
            <li key={m.id} className={`card overflow-hidden ${unread ? 'ring-1 ring-cyan-500/40' : ''}`}>
              <button onClick={() => onExpand(m)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-slate-100 truncate">{m.subject || '(no subject)'}</span>
                    {unread && <span className="badge bg-cyan-500/20 text-cyan-300 text-xs">new</span>}
                  </div>
                  <div className="text-xs text-slate-400 truncate">
                    {m.name} &lt;{m.email}&gt; &middot; {fmtDate(m.created_at)}
                  </div>
                </div>
                <span className="text-slate-400 flex-shrink-0">{open ? '−' : '+'}</span>
              </button>
              {open && (
                <div className="border-t border-slate-700 px-4 py-3 space-y-3">
                  <pre className="whitespace-pre-wrap text-sm text-slate-200 font-sans">{m.content}</pre>
                  <div className="flex gap-2">
                    {!m.archived && (
                      <button onClick={() => archive(m.id)} className="btn-outline">Archive</button>
                    )}
                    <button onClick={() => remove(m.id)} className="btn-danger">Delete</button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>}
    </div>
  );
}

interface UserForm {
  username: string;
  name: string;
  email: string;
  role: 'owner' | 'user';
}

interface OtpState {
  user: User | undefined;
  password: string;
}

function UsersTab() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [modal, setModal] = useState<boolean>(false);
  const [form, setForm] = useState<UserForm>({ username: '', name: '', email: '', role: 'user' });
  const [otp, setOtp] = useState<OtpState | null>(null);

  const load = async () => {
    setLoading(true);
    try { setUsers(await api.get<User[]>('/users')); }
    catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const set = (k: keyof UserForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await api.post<{ user: User; oneTimePassword: string }>('/users', form);
      setOtp({ user: res.user, password: res.oneTimePassword });
      setModal(false);
      setForm({ username: '', name: '', email: '', role: 'user' });
      load();
    } catch (e) { setError((e as Error).message); }
  };

  const reset = async (id: number) => {
    if (!confirm("Reset this user's password?")) return;
    try {
      const res = await api.post<{ oneTimePassword: string }>(`/users/${id}/reset-password`);
      const target = users.find((u) => u.id === id);
      setOtp({ user: target, password: res.oneTimePassword });
    } catch (e) { setError((e as Error).message); }
  };

  const remove = async (id: number) => {
    if (!confirm('Delete this user?')) return;
    try { await api.delete(`/users/${id}`); load(); }
    catch (e) { setError((e as Error).message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-100">Users</h2>
        <button onClick={() => setModal(true)} className="btn-primary">Create user</button>
      </div>
      <ErrBox msg={error} />
      {loading && <Spinner />}
      {otp && (
        <div className="card flex items-start justify-between gap-4 p-4">
          <div className="min-w-0">
            <div className="text-sm text-slate-300">One-time password for <span className="font-semibold text-slate-100">{otp.user?.username}</span>:</div>
            <code className="mt-2 block break-all rounded bg-slate-900 px-3 py-2 font-mono text-cyan-300 text-sm">{otp.password}</code>
            <div className="mt-1 text-xs text-slate-400">Share securely — user must change on first login.</div>
          </div>
          <button onClick={() => setOtp(null)} className="btn-outline flex-shrink-0">Dismiss</button>
        </div>
      )}
      <div className="card overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-800/60 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-2">Username</th>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Role</th>
              <th className="px-4 py-2">Created</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {users.map((u) => (
              <tr key={u.id} className="text-slate-200">
                <td className="px-4 py-2 font-mono text-sm">{u.username}</td>
                <td className="px-4 py-2">{u.name}</td>
                <td className="px-4 py-2 text-slate-300">{u.email}</td>
                <td className="px-4 py-2"><span className="badge bg-slate-700 text-slate-200 text-xs">{u.role}</span></td>
                <td className="px-4 py-2 text-slate-400 text-xs">{fmtDate(u.created_at)}</td>
                <td className="px-4 py-2 text-right whitespace-nowrap">
                  <button onClick={() => reset(u.id)} className="btn-outline mr-2">Reset pw</button>
                  <button onClick={() => remove(u.id)} className="btn-danger">Delete</button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">No users.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title="Create user"
        footer={
          <>
            <button onClick={() => setModal(false)} className="btn-outline">Cancel</button>
            <button onClick={submit} className="btn-primary">Create</button>
          </>
        }
      >
        <form onSubmit={submit} className="space-y-3">
          <Field label="Username"><input className="input-field" required value={form.username} onChange={set('username')} /></Field>
          <Field label="Name"><input className="input-field" required value={form.name} onChange={set('name')} /></Field>
          <Field label="Email"><input type="email" className="input-field" required value={form.email} onChange={set('email')} /></Field>
          <Field label="Role">
            <select className="input-field" value={form.role} onChange={set('role')}>
              <option value="user">user</option>
              <option value="owner">owner</option>
            </select>
          </Field>
        </form>
      </Modal>
    </div>
  );
}

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

function ServicesTab() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [modal, setModal] = useState<boolean>(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState<ServiceForm>(SVC_EMPTY);

  const load = async () => {
    setLoading(true);
    try { setServices(await api.get<Service[]>('/services')); }
    catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const set = (k: keyof ServiceForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value }));

  const openNew = () => { setEditing(null); setForm(SVC_EMPTY); setModal(true); };
  const openEdit = (s: Service) => {
    setEditing(s);
    setForm({ title: s.title || '', url: s.url || '', description: s.description || '', icon: s.icon || '', category: s.category || '', is_private: !!s.is_private, requires_vpn: !!s.requires_vpn });
    setModal(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (editing) await api.put(`/services/${editing.id}`, form);
      else await api.post('/services', form);
      setModal(false);
      load();
    } catch (e) { setError((e as Error).message); }
  };

  const remove = async (id: number) => {
    if (!confirm('Delete service?')) return;
    try { await api.delete(`/services/${id}`); load(); }
    catch (e) { setError((e as Error).message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-100">Services</h2>
        <button onClick={openNew} className="btn-primary">Add service</button>
      </div>
      <ErrBox msg={error} />
      {loading ? <Spinner /> : (
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {services.map((s) => (
          <div key={s.id} className="card p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <StatusDot status={s.status} />
                <h3 className="font-semibold text-slate-100 truncate">{s.title}</h3>
              </div>
              {s.category && <span className="badge bg-slate-700 text-slate-200 text-xs flex-shrink-0">{s.category}</span>}
            </div>
            {s.description && <p className="text-sm text-slate-300 mb-2 line-clamp-2">{s.description}</p>}
            <a href={s.url} target="_blank" rel="noreferrer" className="block text-xs text-cyan-400 hover:underline truncate">{s.url}</a>
            <div className="flex flex-wrap gap-1 mt-2">
              {s.is_private && <span className="badge bg-slate-700 text-slate-300 text-xs">private</span>}
              {s.requires_vpn && <span className="badge bg-purple-700/40 text-purple-200 text-xs">vpn</span>}
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={() => openEdit(s)} className="btn-outline">Edit</button>
              <button onClick={() => remove(s.id)} className="btn-danger">Delete</button>
            </div>
          </div>
        ))}
        {services.length === 0 && <div className="text-slate-400 text-sm">No services.</div>}
      </div>
      )}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editing ? 'Edit service' : 'Add service'}
        footer={
          <>
            <button onClick={() => setModal(false)} className="btn-outline">Cancel</button>
            <button onClick={submit} className="btn-primary">{editing ? 'Save' : 'Create'}</button>
          </>
        }
      >
        <form onSubmit={submit} className="space-y-3">
          <Field label="Title"><input className="input-field" required value={form.title} onChange={set('title')} /></Field>
          <Field label="URL"><input className="input-field" required value={form.url} onChange={set('url')} /></Field>
          <Field label="Description"><textarea className="input-field" rows={2} value={form.description} onChange={set('description')} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Icon"><input className="input-field" value={form.icon} onChange={set('icon')} /></Field>
            <Field label="Category"><input className="input-field" value={form.category} onChange={set('category')} /></Field>
          </div>
          <div className="flex gap-4 text-sm text-slate-200">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_private} onChange={set('is_private')} /> Private
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.requires_vpn} onChange={set('requires_vpn')} /> Requires VPN
            </label>
          </div>
        </form>
      </Modal>
    </div>
  );
}

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
  const [info, setInfo] = useState<string>('');
  const [modal, setModal] = useState<boolean>(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [form, setForm] = useState<ProjectForm>(PROJ_EMPTY);

  const load = async () => {
    setLoading(true);
    try { setProjects(await api.get<Project[]>('/projects')); }
    catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const set = (k: keyof ProjectForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value }));

  const toArr = (s: string | string[]): string[] => (typeof s === 'string' ? s.split(',').map((x) => x.trim()).filter(Boolean) : (Array.isArray(s) ? s : []));
  const fromArr = (v: string[] | string | null | undefined): string => (Array.isArray(v) ? v.join(', ') : (v || ''));

  const openNew = () => { setEditing(null); setForm(PROJ_EMPTY); setModal(true); };
  const openEdit = (p: Project) => {
    setEditing(p);
    setForm({ title: p.title || '', description: p.description || '', url: p.url || '', demo_url: p.demo_url || '', github_url: p.github_url || '', thumbnail_url: p.thumbnail_url || '', tech_stack: fromArr(p.tech_stack), tags: fromArr(p.tags), featured: !!p.featured });
    setModal(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const payload = { ...form, tech_stack: toArr(form.tech_stack), tags: toArr(form.tags) };
    try {
      if (editing) await api.put(`/projects/${editing.id}`, payload);
      else await api.post('/projects', payload);
      setModal(false);
      load();
    } catch (e) { setError((e as Error).message); }
  };

  const remove = async (id: number) => {
    if (!confirm('Delete project?')) return;
    try { await api.delete(`/projects/${id}`); load(); }
    catch (e) { setError((e as Error).message); }
  };

  const seed = async () => {
    setError(''); setInfo('');
    try {
      await api.post('/projects/seed-from-github');
      setInfo('Seeded from GitHub successfully.');
      load();
    } catch (e) { setError((e as Error).message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-100">Projects</h2>
        <div className="flex gap-2">
          <button onClick={seed} className="btn-outline">Seed from GitHub</button>
          <button onClick={openNew} className="btn-primary">Add project</button>
        </div>
      </div>
      <ErrBox msg={error} />
      {info && <div className="rounded border border-green-700 bg-green-900/30 p-2 text-sm text-green-200">{info}</div>}
      {loading ? <Spinner /> : <div className="card overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-800/60 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-2">Title</th>
              <th className="px-4 py-2">Tech</th>
              <th className="px-4 py-2">Tags</th>
              <th className="px-4 py-2">Featured</th>
              <th className="px-4 py-2">Created</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {projects.map((p) => (
              <tr key={p.id} className="text-slate-200">
                <td className="px-4 py-2">
                  <div className="font-medium text-slate-100">{p.title}</div>
                  {p.description && <div className="text-xs text-slate-400 max-w-xs truncate">{p.description}</div>}
                </td>
                <td className="px-4 py-2 text-xs text-slate-300">{(p.tech_stack || []).join(', ')}</td>
                <td className="px-4 py-2 text-xs text-slate-300">{(p.tags || []).join(', ')}</td>
                <td className="px-4 py-2">{p.featured ? <span className="badge bg-cyan-500/20 text-cyan-300 text-xs">yes</span> : <span className="text-slate-500">—</span>}</td>
                <td className="px-4 py-2 text-slate-400 text-xs">{fmtDate(p.created_at)}</td>
                <td className="px-4 py-2 text-right whitespace-nowrap">
                  <button onClick={() => openEdit(p)} className="btn-outline mr-2">Edit</button>
                  <button onClick={() => remove(p.id)} className="btn-danger">Delete</button>
                </td>
              </tr>
            ))}
            {projects.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">No projects.</td></tr>}
          </tbody>
        </table>
      </div>}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editing ? 'Edit project' : 'Add project'}
        footer={
          <>
            <button onClick={() => setModal(false)} className="btn-outline">Cancel</button>
            <button onClick={submit} className="btn-primary">{editing ? 'Save' : 'Create'}</button>
          </>
        }
      >
        <form onSubmit={submit} className="space-y-3">
          <Field label="Title"><input className="input-field" required value={form.title} onChange={set('title')} /></Field>
          <Field label="Description"><textarea className="input-field" rows={2} value={form.description} onChange={set('description')} /></Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="URL"><input className="input-field" value={form.url} onChange={set('url')} /></Field>
            <Field label="Demo URL"><input className="input-field" value={form.demo_url} onChange={set('demo_url')} /></Field>
            <Field label="GitHub URL"><input className="input-field" value={form.github_url} onChange={set('github_url')} /></Field>
            <Field label="Thumbnail URL"><input className="input-field" value={form.thumbnail_url} onChange={set('thumbnail_url')} /></Field>
          </div>
          <Field label="Tech stack (comma separated)"><input className="input-field" value={form.tech_stack} onChange={set('tech_stack')} /></Field>
          <Field label="Tags (comma separated)"><input className="input-field" value={form.tags} onChange={set('tags')} /></Field>
          <label className="flex items-center gap-2 text-sm text-slate-200 cursor-pointer">
            <input type="checkbox" checked={form.featured} onChange={set('featured')} /> Featured
          </label>
        </form>
      </Modal>
    </div>
  );
}

interface SkillForm {
  name: string;
  category: string;
  proficiency: number;
  color: string;
}

const SKILL_EMPTY: SkillForm = { name: '', category: '', proficiency: 3, color: '#22d3ee' };

function SkillsTab() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [modal, setModal] = useState<boolean>(false);
  const [editing, setEditing] = useState<Skill | null>(null);
  const [form, setForm] = useState<SkillForm>(SKILL_EMPTY);

  const load = async () => {
    setLoading(true);
    try { setSkills(await api.get<Skill[]>('/skills')); }
    catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const grouped = useMemo<[string, Skill[]][]>(() => {
    const map = new Map<string, Skill[]>();
    for (const s of skills) {
      const k = s.category || 'Uncategorized';
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(s);
    }
    return Array.from(map.entries()).map(([cat, items]) => [cat, [...items].sort((a, b) => (a.display_order || 0) - (b.display_order || 0))]);
  }, [skills]);

  const set = (k: keyof SkillForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const openNew = () => { setEditing(null); setForm(SKILL_EMPTY); setModal(true); };
  const openEdit = (s: Skill) => {
    setEditing(s);
    setForm({ name: s.name || '', category: s.category || '', proficiency: s.proficiency ?? 3, color: s.color || '#22d3ee' });
    setModal(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const payload = { ...form, proficiency: Number(form.proficiency) };
    try {
      if (editing) await api.put(`/skills/${editing.id}`, payload);
      else await api.post('/skills', payload);
      setModal(false);
      load();
    } catch (e) { setError((e as Error).message); }
  };

  const remove = async (id: number) => {
    if (!confirm('Delete skill?')) return;
    try { await api.delete(`/skills/${id}`); load(); }
    catch (e) { setError((e as Error).message); }
  };

  const stars = (n: number): string => '★'.repeat(n) + '☆'.repeat(Math.max(0, 5 - n));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-100">Skills</h2>
        <button onClick={openNew} className="btn-primary">Add skill</button>
      </div>
      <ErrBox msg={error} />
      {loading ? <Spinner /> : <div className="space-y-4">
        {grouped.map(([cat, items]) => (
          <div key={cat} className="card p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">{cat}</h3>
            <div className="flex flex-wrap gap-2">
              {items.map((s) => (
                <div key={s.id} className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-sm">
                  <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color || '#22d3ee' }} />
                  <span className="text-slate-100">{s.name}</span>
                  <span className="text-xs text-yellow-400">{stars(s.proficiency || 0)}</span>
                  <button onClick={() => openEdit(s)} className="text-xs text-cyan-400 hover:underline ml-1">edit</button>
                  <button onClick={() => remove(s.id)} className="text-xs text-red-400 hover:underline">&times;</button>
                </div>
              ))}
            </div>
          </div>
        ))}
        {grouped.length === 0 && <div className="text-slate-400 text-sm">No skills.</div>}
      </div>}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editing ? 'Edit skill' : 'Add skill'}
        footer={
          <>
            <button onClick={() => setModal(false)} className="btn-outline">Cancel</button>
            <button onClick={submit} className="btn-primary">{editing ? 'Save' : 'Create'}</button>
          </>
        }
      >
        <form onSubmit={submit} className="space-y-3">
          <Field label="Name"><input className="input-field" required value={form.name} onChange={set('name')} /></Field>
          <Field label="Category"><input className="input-field" value={form.category} onChange={set('category')} /></Field>
          <Field label={`Proficiency (${form.proficiency}/5)`}>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => setForm((f) => ({ ...f, proficiency: n }))}
                  className={`h-9 w-9 rounded border text-sm font-medium transition-colors ${Number(form.proficiency) >= n ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200' : 'border-slate-700 text-slate-400 hover:border-slate-500'}`}>
                  {n}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Color">
            <div className="flex items-center gap-2">
              <input type="color" value={form.color} onChange={set('color')} className="h-10 w-14 cursor-pointer rounded border border-slate-700 bg-slate-800 p-0.5" />
              <input className="input-field flex-1 font-mono" value={form.color} onChange={set('color')} placeholder="#22d3ee" />
            </div>
          </Field>
        </form>
      </Modal>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number | null | undefined;
}

function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="card p-5">
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-2 text-4xl font-bold gradient-text">{value ?? 0}</div>
    </div>
  );
}

interface BreakdownRow {
  key: string;
  count: number;
}

interface BreakdownTableProps {
  title: string;
  rows: BreakdownRow[] | null | undefined;
}

function BreakdownTable({ title, rows }: BreakdownTableProps) {
  const max = rows?.length ? Math.max(...rows.map(r => r.count), 1) : 1;
  return (
    <div className="card p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">{title}</h3>
      {(!rows || rows.length === 0) ? (
        <div className="text-sm text-slate-500">No data.</div>
      ) : (
        <div className="space-y-2.5">
          {rows.map((r, i) => (
            <div key={i}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-300 truncate mr-2">{r.key || '—'}</span>
                <span className="font-mono text-slate-400 flex-shrink-0">{r.count}</span>
              </div>
              <div className="h-1 rounded-full bg-slate-700/50">
                <div className="h-full rounded-full bg-blue-500/60" style={{ width: `${(r.count / max) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AnalyticsTab() {
  const [days, setDays] = useState<number>(30);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const s = await api.get<AnalyticsSummary>(`/analytics/summary?days=${days}`);
      setSummary(s);
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [days]);

  const toRows = (data: any, keyField: string): BreakdownRow[] => {
    if (!data) return [];
    if (Array.isArray(data)) {
      return data.map((r) => ({ key: r[keyField] ?? r.key ?? r.label ?? r.name ?? '-', count: r.count ?? r.total ?? r.value ?? 0 }));
    }
    return Object.entries(data).map(([key, count]) => ({ key, count: count as number }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-100">Analytics</h2>
        <div className="flex gap-2">
          {[7, 30, 90].map((d) => (
            <button key={d} onClick={() => setDays(d)} className={days === d ? 'btn-primary' : 'btn-outline'}>{d}d</button>
          ))}
        </div>
      </div>
      <ErrBox msg={error} />
      {loading ? <Spinner /> : (<>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 mb-4">
        <StatCard label="Total views" value={summary?.totalViews} />
        <StatCard label="Unique visitors" value={summary?.uniqueVisitors} />
      </div>
      <DayChart data={summary?.byDay} days={days} />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        <BreakdownTable title="Top pages" rows={toRows(summary?.topPages, 'path')} />
        <BreakdownTable title="By country" rows={toRows(summary?.byCountry, 'country')} />
        <BreakdownTable title="By device & OS" rows={[
          ...toRows(summary?.byDevice, 'device_type'),
          ...toRows(summary?.byOs, 'os')
        ].slice(0, 5)} />
      </div>
      </>)}
    </div>
  );
}

export default function AdminPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'messages';

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 pt-24 pb-12">
        <div className="mb-6">
          <h1 className="text-3xl font-bold gradient-text">Admin</h1>
          <p className="text-slate-500 text-sm mt-1">Manage your portfolio content</p>
        </div>
        <nav className="flex flex-wrap gap-1 border-b border-slate-700 mb-6 pb-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setSearchParams({ tab: t.id })}
              className={`px-4 py-2 rounded-t text-sm font-medium transition-colors ${tab === t.id ? 'bg-slate-800 text-cyan-300 ring-1 ring-cyan-500/40' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
            >
              {t.label}
            </button>
          ))}
        </nav>
        {tab === 'messages' && <MessagesTab />}
        {tab === 'users' && <UsersTab />}
        {tab === 'services' && <ServicesTab />}
        {tab === 'projects' && <ProjectsTab />}
        {tab === 'skills' && <SkillsTab />}
        {tab === 'analytics' && <AnalyticsTab />}
      </main>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { Message } from '../../../types';
import { api } from '../../../lib/api';
import { ErrBox, Spinner, fmtDate } from '../common/DashboardPrimitives';

export function MessagesTab() {
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

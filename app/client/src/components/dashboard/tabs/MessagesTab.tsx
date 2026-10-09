import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  Trash2,
  Archive,
  CheckSquare,
  Square,
  MinusSquare,
  Mail,
  MailOpen,
  Calendar,
  User,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Message } from '../../../types';
import { api } from '../../../lib/api';
import { ErrBox, Spinner, fmtDate } from '../common/DashboardPrimitives';

export function MessagesTab() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [view, setView] = useState<'inbox' | 'archived'>('inbox');
  const [expanded, setExpanded] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const load = async () => {
    setLoading(true);
    setError('');
    setSelectedIds(new Set());
    try {
      const path = view === 'archived' ? '/messages?archived=true' : '/messages';
      const data = await api.get<Message[]>(path);
      setMessages(Array.isArray(data) ? data : []);
    } catch (e) {
      setError((e as Error).message || 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [view]);

  const toggleSelectAll = () => {
    if (selectedIds.size === messages.length && messages.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(messages.map((m) => m.id)));
    }
  };

  const toggleSelectOne = (id: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const onExpand = async (m: Message) => {
    const next = expanded === m.id ? null : m.id;
    setExpanded(next);
    if (next && !m.read_at) {
      try {
        await api.patch(`/messages/${m.id}/read`);
        setMessages((list) =>
          list.map((x) => (x.id === m.id ? { ...x, read_at: new Date().toISOString() } : x))
        );
      } catch (_) {}
    }
  };

  const archiveOne = async (id: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await api.patch(`/messages/${id}/archive`);
      setMessages((list) => list.filter((m) => m.id !== id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const removeOne = async (id: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!window.confirm('Delete this message permanently?')) return;
    try {
      await api.delete(`/messages/${id}`);
      setMessages((list) => list.filter((m) => m.id !== id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const batchArchive = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setActionLoading(true);
    try {
      await api.post('/messages/batch-archive', { ids });
      setMessages((list) => list.filter((m) => !selectedIds.has(m.id)));
      setSelectedIds(new Set());
    } catch (e) {
      setError((e as Error).message || 'Failed to archive selected messages');
    } finally {
      setActionLoading(false);
    }
  };

  const batchDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (!window.confirm(`Permanently delete ${ids.length} selected message(s)?`)) return;
    setActionLoading(true);
    try {
      await api.post('/messages/batch-delete', { ids });
      setMessages((list) => list.filter((m) => !selectedIds.has(m.id)));
      setSelectedIds(new Set());
    } catch (e) {
      setError((e as Error).message || 'Failed to delete selected messages');
    } finally {
      setActionLoading(false);
    }
  };

  const allSelected = messages.length > 0 && selectedIds.size === messages.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  return (
    <div className="space-y-4">
      {/* Top Header & View Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#13141a]/80 border border-slate-800/80 p-3 rounded-2xl backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="flex bg-[#1a1c24] p-1 rounded-xl border border-slate-800/80 shadow-inner">
            <button
              onClick={() => setView('inbox')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                view === 'inbox'
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              Inbox
            </button>
            <button
              onClick={() => setView('archived')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                view === 'archived'
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Archive className="w-3.5 h-3.5" />
              Archived
            </button>
          </div>

          <span className="text-[11px] font-mono text-slate-500 px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800">
            {messages.length} {messages.length === 1 ? 'item' : 'items'}
          </span>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {messages.length > 0 && (
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-800 bg-[#161822] hover:bg-slate-800/60 text-slate-300 transition-colors"
            >
              {allSelected ? (
                <CheckSquare className="w-3.5 h-3.5 text-red-500" />
              ) : someSelected ? (
                <MinusSquare className="w-3.5 h-3.5 text-red-400" />
              ) : (
                <Square className="w-3.5 h-3.5 text-slate-500" />
              )}
              <span>{allSelected ? 'Deselect all' : 'Select all'}</span>
            </button>
          )}

          <button
            onClick={load}
            disabled={loading}
            className="p-2 border border-slate-800 rounded-xl text-slate-400 hover:text-white bg-[#161822] hover:bg-slate-800/60 transition-colors"
            title="Refresh messages"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-red-500' : ''}`} />
          </button>
        </div>
      </div>

      {/* Batch Action Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between p-3 px-4 rounded-xl bg-red-950/30 border border-red-500/30 shadow-lg shadow-red-950/20 text-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2 text-red-200 font-medium">
            <CheckSquare className="w-4 h-4 text-red-400" />
            <span>
              {selectedIds.size} of {messages.length} selected
            </span>
          </div>

          <div className="flex items-center gap-2">
            {view === 'inbox' && (
              <button
                onClick={batchArchive}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-medium border border-slate-700 transition-colors"
              >
                <Archive className="w-3.5 h-3.5 text-slate-300" />
                Archive selected
              </button>
            )}
            <button
              onClick={batchDelete}
              disabled={actionLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600/30 hover:bg-rose-600/50 text-rose-200 font-medium border border-rose-500/40 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-300" />
              Delete selected
            </button>
          </div>
        </div>
      )}

      <ErrBox msg={error} />

      {/* Message List */}
      {loading ? (
        <div className="p-16 flex flex-col items-center justify-center gap-3">
          <Spinner />
          <span className="text-xs text-slate-500 font-mono">Loading messages...</span>
        </div>
      ) : messages.length === 0 ? (
        <div className="p-16 text-center text-slate-500 text-xs border border-slate-800/80 rounded-2xl bg-[#13141a]/50 flex flex-col items-center gap-2">
          <MailOpen className="w-8 h-8 text-slate-600 stroke-[1.2]" />
          <span>{view === 'inbox' ? 'Your inbox is clear.' : 'No archived messages found.'}</span>
        </div>
      ) : (
        <ul className="space-y-2">
          {messages.map((m) => {
            const unread = !m.read_at;
            const open = expanded === m.id;
            const isSelected = selectedIds.has(m.id);

            return (
              <li
                key={m.id}
                className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                  isSelected
                    ? 'border-red-500/50 bg-[#1a161c]'
                    : open
                    ? 'border-slate-700 bg-[#161822]'
                    : 'border-slate-800/80 bg-[#14151c] hover:border-slate-700/80 hover:bg-[#161720]'
                }`}
              >
                <div
                  onClick={() => onExpand(m)}
                  className="flex items-center justify-between gap-3 p-3.5 sm:p-4 text-left cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Checkbox */}
                    <button
                      type="button"
                      onClick={(e) => toggleSelectOne(m.id, e)}
                      className="p-1 text-slate-500 hover:text-white rounded-lg transition-colors shrink-0"
                      aria-label="Select message"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-red-500" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-600 hover:text-slate-400" />
                      )}
                    </button>

                    {/* Unread indicator */}
                    <div className="shrink-0 flex items-center justify-center w-3">
                      {unread && (
                        <span
                          className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]"
                          title="Unread"
                        />
                      )}
                    </div>

                    {/* Content Preview */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`font-semibold text-sm truncate ${
                            unread ? 'text-white' : 'text-slate-300'
                          }`}
                        >
                          {m.subject || '(no subject)'}
                        </span>
                        {unread && (
                          <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.2 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                            New
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                        <span className="inline-flex items-center gap-1 font-medium text-slate-300">
                          <User className="w-3 h-3 text-slate-500" />
                          {m.name}
                        </span>
                        <span className="text-slate-500 text-[11px]">&lt;{m.email}&gt;</span>
                        <span className="inline-flex items-center gap-1 text-slate-500 text-[11px] font-mono ml-auto sm:ml-0">
                          <Calendar className="w-3 h-3 text-slate-600" />
                          {fmtDate(m.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Expand / Collapse Indicator & Quick Action */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => removeOne(m.id, e)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors hidden sm:inline-flex"
                      title="Delete message"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <div className="p-1 text-slate-500">
                      {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Details Pane */}
                {open && (
                  <div className="border-t border-slate-800/80 p-4 sm:p-5 space-y-4 bg-[#111218]">
                    <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/60 font-sans text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-wrap selection:bg-red-500/30">
                      {m.content}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                      <div className="text-[11px] font-mono text-slate-500">
                        Sender IP: {m.ip_address || 'Unknown'}
                      </div>

                      <div className="flex items-center gap-2">
                        {!m.archived && (
                          <button
                            type="button"
                            onClick={(e) => archiveOne(m.id, e)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-slate-700 bg-slate-800/60 text-slate-200 hover:text-white hover:bg-slate-700 rounded-xl transition-colors"
                          >
                            <Archive className="w-3.5 h-3.5" />
                            Archive
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => removeOne(m.id, e)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-rose-600/20 text-rose-300 hover:bg-rose-600/30 border border-rose-500/30 rounded-xl transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      </div>
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

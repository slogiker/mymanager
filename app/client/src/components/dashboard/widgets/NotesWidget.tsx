import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clipboard, ExternalLink, Plus, RefreshCw, Check, Copy, Trash2 } from 'lucide-react';
import { api } from '../../../lib/api';

export interface NotesWidgetProps {
  colSpan?: number;
  rowSpan?: number;
}

export function NotesWidget({ colSpan = 2, rowSpan = 1 }: NotesWidgetProps) {
  const [notes, setNotes] = useState<any[]>([]);
  const [newNote, setNewNote] = useState('');
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const loadNotes = async () => {
    setLoading(true);
    try {
      const data = await api.get<any[]>('/clipboard');
      setNotes(data.slice(0, 6));
      setError('');
    } catch {
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
    } catch {
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

  const isCompact = colSpan === 1 && rowSpan === 1;
  const isExpandedTall = rowSpan >= 2;
  const latestNote = notes[0];

  // 1x1 Compact Representation
  if (isCompact) {
    return (
      <div className="flex flex-col justify-between h-full p-2.5">
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="p-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
              <Clipboard className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] font-bold text-slate-200 truncate">Notes</span>
          </div>
          <span className="text-[10px] font-mono text-slate-500">{notes.length}</span>
        </div>

        <div className="flex items-center justify-between text-[10px] font-mono">
          <span className="text-slate-400 truncate pr-1">
            {latestNote ? (latestNote.content || latestNote.title) : 'Empty'}
          </span>
          {latestNote && (
            <button
              type="button"
              onClick={() => copyNote(latestNote.id, latestNote.content || '')}
              className="p-1 text-slate-400 hover:text-white rounded transition-colors shrink-0"
              title="Copy"
            >
              {copiedId === latestNote.id ? (
                <Check className="w-3 h-3 text-emerald-400" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </button>
          )}
        </div>
      </div>
    );
  }

  // 2x2 or 4x2 Expanded Representation
  if (isExpandedTall) {
    return (
      <div className="flex flex-col justify-between h-full p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
              <Clipboard className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200">Quick Notes</span>
          </div>
          <Link
            to="/clipboard"
            className="text-[10px] font-semibold text-slate-500 hover:text-red-400 transition-colors flex items-center gap-1"
          >
            <span>Clipboard</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </Link>
        </div>

        <form onSubmit={addNote} className="flex gap-1.5">
          <input
            type="text"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add note..."
            className="flex-1 px-2.5 py-1 bg-slate-900/90 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-red-500/50"
          />
          <button
            type="submit"
            className="px-2 py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-semibold shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </form>

        <div className="space-y-1 flex-1 overflow-y-auto pr-1 max-h-24">
          {loading ? (
            <div className="py-2 text-center text-xs text-slate-500">
              <RefreshCw className="w-3 h-3 animate-spin inline mr-1" />
              Loading...
            </div>
          ) : notes.length === 0 ? (
            <div className="py-2 text-center text-xs text-slate-500 italic">No notes yet</div>
          ) : (
            notes.map((n) => (
              <div
                key={n.id}
                className="group flex items-center justify-between p-1.5 rounded-lg bg-slate-900/50 border border-slate-800/60 hover:border-slate-700/80 transition-all text-xs"
              >
                <span className="text-slate-300 truncate font-mono text-[11px] pr-2">
                  {n.content || n.title}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => copyNote(n.id, n.content || '')}
                    className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
                  >
                    {copiedId === n.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteNote(n.id)}
                    className="p-1 text-slate-500 hover:text-red-400 rounded hover:bg-slate-800 transition-colors"
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

  // 2x1 Standard Representation (Default Flat Card Style)
  return (
    <div className="flex flex-col justify-between h-full p-2.5 space-y-1">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 pr-1">
          <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
            <Clipboard className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-xs text-slate-100 group-hover:text-amber-400 transition-colors truncate flex items-center gap-1.5">
              <span>Quick Notes</span>
            </div>
            <span className="text-[10px] font-mono text-slate-500 truncate block">
              {notes.length} note{notes.length === 1 ? '' : 's'} saved
            </span>
          </div>
        </div>

        <Link
          to="/clipboard"
          className="text-[10px] font-semibold text-slate-500 hover:text-amber-400 transition-colors flex items-center gap-1 shrink-0"
        >
          <span>All</span>
          <ExternalLink className="w-2.5 h-2.5" />
        </Link>
      </div>

      {latestNote ? (
        <div className="flex items-center justify-between gap-1 text-[11px] font-mono pt-1 border-t border-slate-800/40">
          <span className="text-slate-300 truncate pr-1">
            {latestNote.content || latestNote.title}
          </span>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => copyNote(latestNote.id, latestNote.content || '')}
              className="p-0.5 text-slate-400 hover:text-white rounded transition-colors"
              title="Copy"
            >
              {copiedId === latestNote.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </button>
            <button
              type="button"
              onClick={() => deleteNote(latestNote.id)}
              className="p-0.5 text-slate-500 hover:text-red-400 rounded transition-colors"
              title="Delete"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={addNote} className="flex gap-1 pt-1 border-t border-slate-800/40">
          <input
            type="text"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Type quick note..."
            className="flex-1 px-2 py-0.5 bg-slate-900/90 border border-slate-800 rounded text-[11px] text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500/50"
          />
          <button
            type="submit"
            className="px-2 py-0.5 bg-amber-600 hover:bg-amber-500 text-white rounded text-[11px] font-semibold"
          >
            <Plus className="w-3 h-3" />
          </button>
        </form>
      )}
    </div>
  );
}

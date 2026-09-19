import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Clipboard,
  ExternalLink,
  Plus,
  RefreshCw,
  Check,
  Copy,
  Trash2,
} from 'lucide-react';
import { api } from '../../../lib/api';

export function NotesWidget() {
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

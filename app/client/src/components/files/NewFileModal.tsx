import { useState, useEffect, useRef } from 'react';
import { FilePlus, X } from 'lucide-react';

const PRESETS = [
  { label: 'Text', ext: '.txt' },
  { label: 'Markdown', ext: '.md' },
  { label: 'JavaScript', ext: '.js' },
  { label: 'TypeScript', ext: '.ts' },
  { label: 'JSON', ext: '.json' },
  { label: 'Python', ext: '.py' },
  { label: 'CSS', ext: '.css' },
  { label: 'HTML', ext: '.html' },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
}

export default function NewFileModal({ open, onClose, onCreate }: Props) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) { setName(''); setBusy(false); setTimeout(() => inputRef.current?.focus(), 50); }
  }, [open]);

  async function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setBusy(true);
    try { await onCreate(trimmed); onClose(); }
    catch {} finally { setBusy(false); }
  }

  function applyPreset(ext: string) {
    setName(prev => {
      const base = prev.replace(/\.[^.]+$/, '') || 'untitled';
      return base + ext;
    });
    inputRef.current?.focus();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FilePlus size={16} className="text-cyan-400" />
            <h3 className="text-sm font-semibold text-slate-100">New File</h3>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
            <X size={15} />
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-3">
          {PRESETS.map(p => (
            <button
              key={p.ext}
              onClick={() => applyPreset(p.ext)}
              className="text-xs px-2.5 py-1 rounded-md bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-colors border border-slate-700/50"
            >
              {p.label}
            </button>
          ))}
        </div>

        <input
          ref={inputRef}
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') onClose(); }}
          placeholder="filename.md"
          className="input-field w-full mb-4 font-mono text-sm"
        />

        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="btn btn-outline text-sm py-1.5 px-4">Cancel</button>
          <button
            onClick={handleCreate}
            disabled={!name.trim() || busy}
            className="btn btn-primary text-sm py-1.5 px-4"
          >
            {busy ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

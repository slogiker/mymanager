import React, { useRef, useEffect } from 'react';
import { FilePlus, X } from 'lucide-react';

export const FILE_EXT_PRESETS = [
  { label: '.txt', ext: '.txt' },
  { label: '.md', ext: '.md' },
  { label: '.js', ext: '.js' },
  { label: '.ts', ext: '.ts' },
  { label: '.py', ext: '.py' },
  { label: '.json', ext: '.json' },
];

export interface InlineCreateFileProps {
  view: 'grid' | 'list';
  fileName: string;
  setFileName: React.Dispatch<React.SetStateAction<string>>;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function InlineCreateFile({
  view,
  fileName,
  setFileName,
  busy,
  onConfirm,
  onCancel,
}: InlineCreateFileProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  if (view === 'grid') {
    return (
      <div className="relative rounded-xl border-2 border-red-500/60 bg-[#17181e] p-3 flex flex-col justify-between shadow-2xl min-h-[168px]">
        <div className="flex items-center justify-between text-xs text-red-400 font-medium pb-2 border-b border-white/5">
          <span className="flex items-center gap-1.5"><FilePlus size={14} /> New File</span>
          <button onClick={onCancel} className="text-slate-500 hover:text-slate-300 p-0.5"><X size={13} /></button>
        </div>
        <div className="my-2">
          <input
            ref={inputRef}
            value={fileName}
            onChange={e => setFileName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') onConfirm();
              if (e.key === 'Escape') onCancel();
            }}
            placeholder="filename.txt"
            className="w-full bg-[#111216] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/30"
          />
          <div className="flex flex-wrap gap-1 mt-2">
            {FILE_EXT_PRESETS.map(p => (
              <button
                key={p.ext}
                type="button"
                onClick={() => {
                  setFileName(prev => {
                    const base = prev.replace(/\.[^.]+$/, '') || 'untitled';
                    return base + p.ext;
                  });
                  inputRef.current?.focus();
                }}
                className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 border border-white/5 transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-white/5">
          <button
            onClick={onCancel}
            className="px-2.5 py-1 text-[11px] text-slate-400 hover:text-slate-200 rounded hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!fileName.trim() || busy}
            className="px-2.5 py-1 text-[11px] bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-medium rounded transition-colors flex items-center gap-1"
          >
            {busy ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg border-2 border-red-500/60 bg-[#17181e] text-xs shadow-lg mb-1">
      <FilePlus size={16} className="text-red-400 shrink-0" />
      <input
        ref={inputRef}
        value={fileName}
        onChange={e => setFileName(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') onConfirm();
          if (e.key === 'Escape') onCancel();
        }}
        placeholder="filename.txt"
        className="flex-1 bg-[#111216] border border-slate-700 rounded px-2.5 py-1 text-xs text-white font-mono outline-none focus:border-red-500"
      />
      <div className="hidden sm:flex items-center gap-1">
        {FILE_EXT_PRESETS.slice(0, 4).map(p => (
          <button
            key={p.ext}
            type="button"
            onClick={() => {
              setFileName(prev => {
                const base = prev.replace(/\.[^.]+$/, '') || 'untitled';
                return base + p.ext;
              });
              inputRef.current?.focus();
            }}
            className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-slate-400 hover:text-white"
          >
            {p.label}
          </button>
        ))}
      </div>
      <button onClick={onCancel} className="px-2 py-1 text-slate-400 hover:text-white">Cancel</button>
      <button
        onClick={onConfirm}
        disabled={!fileName.trim() || busy}
        className="px-2.5 py-1 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white rounded font-medium"
      >
        {busy ? 'Creating...' : 'Create'}
      </button>
    </div>
  );
}

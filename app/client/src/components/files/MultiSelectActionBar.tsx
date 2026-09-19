import React from 'react';
import { Download, Trash2 } from 'lucide-react';

interface MultiSelectActionBarProps {
  selectedCount: number;
  onDownload: () => void;
  onDelete: () => void;
  onClear: () => void;
}

export function MultiSelectActionBar({
  selectedCount,
  onDownload,
  onDelete,
  onClear,
}: MultiSelectActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-5 py-3 bg-[#111216]/95 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-md">
      <span className="text-sm text-slate-300 font-medium">{selectedCount} selected</span>
      <div className="w-px h-4 bg-slate-600" />
      <button
        onClick={onDownload}
        className="flex items-center gap-2 text-sm text-slate-300 hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-white/10"
      >
        <Download size={14} /> Download
      </button>
      <button
        onClick={onDelete}
        className="flex items-center gap-2 text-sm text-slate-300 hover:text-red-400 transition-colors px-2 py-1 rounded-lg hover:bg-red-500/10"
      >
        <Trash2 size={14} /> Delete
      </button>
      <div className="w-px h-4 bg-slate-600" />
      <button
        onClick={onClear}
        className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
      >
        Clear
      </button>
    </div>
  );
}

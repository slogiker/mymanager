import React from 'react';
import { Search, X, FilePlus, FolderPlus, Eye, EyeOff, List, LayoutGrid } from 'lucide-react';
import { TYPE_FILTERS } from './fileHelpers';

interface FileToolbarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  searchScope: 'folder' | 'global';
  onSearchScopeChange: (scope: 'folder' | 'global') => void;
  typeFilter: string | null;
  onTypeFilterChange: (type: string | null) => void;
  view: 'grid' | 'list';
  onViewChange: (v: 'grid' | 'list') => void;
  showPreview: boolean;
  onTogglePreview: () => void;
  onNewFile: () => void;
  onNewFolder: () => void;
}

export function FileToolbar({
  searchQuery,
  onSearchChange,
  searchScope,
  onSearchScopeChange,
  typeFilter,
  onTypeFilterChange,
  view,
  onViewChange,
  showPreview,
  onTogglePreview,
  onNewFile,
  onNewFolder,
}: FileToolbarProps) {
  return (
    <>
      {/* Top right actions */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onNewFile}
          className="btn btn-outline flex items-center gap-1.5 text-xs py-1.5 px-3"
        >
          <FilePlus size={13} /> New File
        </button>
        <button
          onClick={onNewFolder}
          className="btn btn-outline flex items-center gap-1.5 text-xs py-1.5 px-3"
        >
          <FolderPlus size={13} /> New Folder
        </button>
        <button
          onClick={onTogglePreview}
          className={`btn btn-outline p-2 ${
            showPreview ? 'text-cyan-400 border-cyan-500/40 bg-cyan-500/5' : ''
          }`}
          title="Toggle preview panel"
        >
          {showPreview ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
        <button
          onClick={() => onViewChange(view === 'grid' ? 'list' : 'grid')}
          className="btn btn-outline p-2"
          title="Toggle view"
        >
          {view === 'grid' ? <List size={14} /> : <LayoutGrid size={14} />}
        </button>
      </div>
    </>
  );
}

interface FileSearchFilterBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  searchScope: 'folder' | 'global';
  onSearchScopeChange: (scope: 'folder' | 'global') => void;
  typeFilter: string | null;
  onTypeFilterChange: (type: string | null) => void;
}

export function FileSearchFilterBar({
  searchQuery,
  onSearchChange,
  searchScope,
  onSearchScopeChange,
  typeFilter,
  onTypeFilterChange,
}: FileSearchFilterBarProps) {
  return (
    <div className="shrink-0 flex items-center justify-between px-5 py-2.5 border-b border-slate-800/40 gap-3 flex-wrap">
      <div className="flex items-center gap-2 flex-1 max-w-lg min-w-[280px]">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
          />
          <input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search files…"
            className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg pl-8 pr-8 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Scope selector */}
        <select
          value={searchScope}
          onChange={(e) => onSearchScopeChange(e.target.value as 'folder' | 'global')}
          className="bg-slate-800/70 border border-slate-700/50 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-300 outline-none"
        >
          <option value="folder">This Folder</option>
          <option value="global">All Files</option>
        </select>
      </div>

      {/* Type filters */}
      <div className="flex items-center gap-1 overflow-x-auto py-1">
        {TYPE_FILTERS.map((tf) => (
          <button
            key={String(tf.value)}
            onClick={() => onTypeFilterChange(typeFilter === tf.value ? null : tf.value)}
            className={`text-xs px-2.5 py-1 rounded-md transition-colors whitespace-nowrap ${
              typeFilter === tf.value
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-medium'
                : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
            }`}
          >
            {tf.label}
          </button>
        ))}
      </div>
    </div>
  );
}

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { ArrowLeft, Terminal, Check, Copy } from 'lucide-react';
import { BreadcrumbEntry } from './fileHelpers';

export function DroppableBreadcrumbSegment({
  id,
  name,
  isLast,
  onClick,
}: {
  id: string | null;
  name: string;
  isLast: boolean;
  onClick: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: id ? `breadcrumb-${id}` : '__root__' });
  return (
    <button
      ref={setNodeRef}
      onClick={onClick}
      className={`hover:text-red-400 transition-colors truncate max-w-[140px] px-1 py-0.5 rounded ${
        isLast ? 'text-slate-200 font-semibold' : 'text-slate-400'
      } ${isOver ? 'bg-red-500/20 text-red-300 ring-2 ring-red-500/50' : ''}`}
      title={name}
    >
      {name}
    </button>
  );
}

interface FileBreadcrumbsProps {
  folderPath: BreadcrumbEntry[];
  onBack: () => void;
  onNavigateToRoot: () => void;
  onNavigateToBreadcrumb: (index: number) => void;
  onCopyPath: () => void;
  copiedPath: boolean;
}

export function FileBreadcrumbs({
  folderPath,
  onBack,
  onNavigateToRoot,
  onNavigateToBreadcrumb,
  onCopyPath,
  copiedPath,
}: FileBreadcrumbsProps) {
  return (
    <div className="flex items-center gap-3 min-w-0 flex-1 mr-4">
      <button
        onClick={onBack}
        className="text-slate-500 hover:text-slate-300 transition-colors p-1 shrink-0"
        title="Back"
      >
        <ArrowLeft size={15} />
      </button>

      {/* Terminal Style Breadcrumb Path */}
      <div className="flex items-center gap-2 min-w-0 bg-slate-900/60 border border-slate-800 rounded-lg px-2.5 py-1 text-xs">
        <Terminal size={12} className="text-red-400 shrink-0" />
        <div className="flex items-center gap-1 min-w-0 overflow-x-auto">
          <DroppableBreadcrumbSegment
            id={null}
            name="~"
            isLast={folderPath.length === 0}
            onClick={onNavigateToRoot}
          />
          {folderPath.map((seg, i) => (
            <span key={seg.id} className="flex items-center gap-1 shrink-0">
              <span className="text-slate-600">/</span>
              <DroppableBreadcrumbSegment
                id={seg.id}
                name={seg.name}
                isLast={i === folderPath.length - 1}
                onClick={() => onNavigateToBreadcrumb(i)}
              />
            </span>
          ))}
        </div>

        <button
          onClick={onCopyPath}
          className="ml-1 p-1 text-slate-500 hover:text-slate-300 rounded transition-colors shrink-0"
          title="Copy Path"
        >
          {copiedPath ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
        </button>
      </div>
    </div>
  );
}

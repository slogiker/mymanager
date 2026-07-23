import { useRef } from 'react';
import { Folder } from 'lucide-react';
import { useDroppable, useDndMonitor } from '@dnd-kit/core';

export interface FolderItem {
  id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
}

interface Props {
  folder: FolderItem;
  view: 'grid' | 'list';
  onOpen: (id: string, name: string) => void;
}

export default function FolderCard({ folder, view, onOpen }: Props) {
  // Prefix with 'card-' to avoid ID collision with the same folder in FolderSidebar
  const { setNodeRef, isOver } = useDroppable({ id: `card-${folder.id}` });

  // Track whether a drag just ended over this folder so we can suppress the click
  const dragEndedOver = useRef(false);
  useDndMonitor({
    onDragEnd(event) {
      const overId = String(event.over?.id ?? '');
      if (overId === `card-${folder.id}`) {
        dragEndedOver.current = true;
        // Reset after the click event fires (next microtask)
        setTimeout(() => { dragEndedOver.current = false; }, 50);
      }
    },
  });

  function handleClick() {
    if (dragEndedOver.current) return;
    onOpen(folder.id, folder.name);
  }

  if (view === 'list') {
    return (
      <div
        ref={setNodeRef}
        onClick={handleClick}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all cursor-pointer group select-none
          hover:bg-white/4 border
          ${isOver ? 'border-cyan-500/50 bg-cyan-500/5 ring-1 ring-cyan-500/30' : 'border-transparent'}`}
      >
        <div className="w-8 h-8 rounded-md bg-gradient-to-br from-yellow-500/15 to-amber-500/5 border border-yellow-500/30 flex items-center justify-center shrink-0">
          <Folder size={16} className="text-yellow-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm truncate text-slate-200">{folder.name}</p>
        </div>
        <span className="text-xs text-slate-500 shrink-0 w-16 text-right">—</span>
        <span className="text-xs text-slate-500 shrink-0 w-24 text-right hidden sm:block">
          {new Date(folder.created_at).toLocaleDateString()}
        </span>
        <div className="w-16 shrink-0" />
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      onClick={handleClick}
      className={`group relative rounded-xl border transition-all cursor-pointer select-none overflow-hidden
        border-slate-700/50 bg-slate-800/40 hover:border-yellow-500/40 hover:bg-slate-800/70
        ${isOver ? 'ring-2 ring-cyan-400 border-cyan-500/50 bg-cyan-500/5' : ''}`}
    >
      <div className="h-28 flex items-center justify-center bg-gradient-to-br from-yellow-500/10 to-amber-500/5">
        <Folder size={42} className="text-yellow-400/60 group-hover:text-yellow-400 transition-colors" />
      </div>
      <div className="px-3 py-2.5">
        <p className="text-xs font-medium truncate leading-tight text-slate-200" title={folder.name}>
          {folder.name}
        </p>
        <p className="text-[11px] text-slate-500 mt-0.5">Folder</p>
      </div>
    </div>
  );
}

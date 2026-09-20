import { useRef, useState } from 'react';
import { Folder, Download, Trash2, Pin, PinOff, Share2 } from 'lucide-react';
import { useDroppable, useDndMonitor } from '@dnd-kit/core';

export interface FolderItem {
  id: string;
  name: string;
  parent_id: string | null;
  pinned?: number;
  created_at: string;
}

interface Props {
  folder: FolderItem;
  view: 'grid' | 'list';
  onOpen: (id: string, name: string) => void;
  onDropFiles?: (files: File[], folderId: string) => void;
  onContextMenu?: (e: React.MouseEvent, folder: FolderItem) => void;
  onPinToggle?: (id: string) => void;
  onShare?: (folder: FolderItem) => void;
  onDownloadZip?: (id: string, name: string) => void;
  onDelete?: (id: string) => void;
}

export default function FolderCard({
  folder,
  view,
  onOpen,
  onDropFiles,
  onContextMenu,
  onPinToggle,
  onShare,
  onDownloadZip,
  onDelete,
}: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: `card-${folder.id}` });
  const [nativeDragOver, setNativeDragOver] = useState(false);

  // Suppress click after dnd-kit drag end
  const dragEndedOver = useRef(false);
  useDndMonitor({
    onDragEnd(event) {
      const overId = String(event.over?.id ?? '');
      if (overId === `card-${folder.id}`) {
        dragEndedOver.current = true;
        setTimeout(() => { dragEndedOver.current = false; }, 50);
      }
    },
  });

  function handleClick() {
    if (dragEndedOver.current) return;
    onOpen(folder.id, folder.name);
  }

  // Native HTML5 drop for files dragged from desktop/computer (Issue #22)
  function handleNativeDragOver(e: React.DragEvent) {
    if (e.dataTransfer.types.includes('Files')) {
      e.preventDefault();
      e.stopPropagation();
      setNativeDragOver(true);
    }
  }

  function handleNativeDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setNativeDragOver(false);
  }

  function handleNativeDrop(e: React.DragEvent) {
    if (e.dataTransfer.types.includes('Files')) {
      e.preventDefault();
      e.stopPropagation();
      setNativeDragOver(false);
      const droppedFiles = Array.from(e.dataTransfer.files);
      if (droppedFiles.length > 0 && onDropFiles) {
        onDropFiles(droppedFiles, folder.id);
      }
    }
  }

  const highlightOver = isOver || nativeDragOver;
  const isPinned = Boolean(folder.pinned);

  if (view === 'list') {
    return (
      <div
        ref={setNodeRef}
        onClick={handleClick}
        onContextMenu={e => {
          if (onContextMenu) {
            e.preventDefault();
            onContextMenu(e, folder);
          }
        }}
        onDragOver={handleNativeDragOver}
        onDragLeave={handleNativeDragLeave}
        onDrop={handleNativeDrop}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all cursor-pointer group select-none
          hover:bg-white/4 border
          ${highlightOver ? 'border-red-500/50 bg-red-500/10 ring-2 ring-red-500/40' : 'border-transparent'}`}
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

        {/* Action icons on hover */}
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={e => e.stopPropagation()}>
          {onPinToggle && (
            <button
              onClick={() => onPinToggle(folder.id)}
              className={`p-1.5 transition-colors rounded-md hover:bg-white/5 ${isPinned ? 'text-amber-400' : 'text-slate-400 hover:text-amber-400'}`}
              title={isPinned ? 'Unpin folder' : 'Pin folder'}
            >
              {isPinned ? <PinOff size={13} /> : <Pin size={13} />}
            </button>
          )}
          {onShare && (
            <button
              onClick={() => onShare(folder)}
              className="p-1.5 text-slate-400 hover:text-purple-400 transition-colors rounded-md hover:bg-purple-500/10"
              title="Share folder"
            >
              <Share2 size={13} />
            </button>
          )}
          {onDownloadZip && (
            <button
              onClick={() => onDownloadZip(folder.id, folder.name)}
              className="p-1.5 text-slate-400 hover:text-white transition-colors rounded-md hover:bg-white/10"
              title="Download as ZIP"
            >
              <Download size={13} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(folder.id)}
              className="p-1.5 text-slate-400 hover:text-red-400 transition-colors rounded-md hover:bg-red-500/10"
              title="Delete folder"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      onClick={handleClick}
      onContextMenu={e => {
        if (onContextMenu) {
          e.preventDefault();
          onContextMenu(e, folder);
        }
      }}
      onDragOver={handleNativeDragOver}
      onDragLeave={handleNativeDragLeave}
      onDrop={handleNativeDrop}
      className={`group relative rounded-xl border transition-all cursor-pointer select-none overflow-hidden
        border-white/5 bg-[#17181e] hover:border-yellow-500/40 hover:bg-[#1c1e26]
        ${highlightOver ? 'ring-2 ring-red-500 border-red-500/60 bg-red-500/10 scale-102' : ''}`}
    >
      {/* Pin Badge */}
      {isPinned && (
        <div className="absolute top-2 left-2 z-10 w-5 h-5 flex items-center justify-center pointer-events-none">
          <Pin size={12} className="text-amber-400" />
        </div>
      )}

      {/* Action overlay top-right */}
      <div
        className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
        onClick={e => e.stopPropagation()}
      >
        {onPinToggle && (
          <button
            onClick={() => onPinToggle(folder.id)}
            className={`p-1.5 bg-slate-900/80 backdrop-blur-sm rounded-md transition-colors ${isPinned ? 'text-amber-400' : 'text-slate-400 hover:text-amber-400'}`}
            title={isPinned ? 'Unpin folder' : 'Pin folder'}
          >
            {isPinned ? <PinOff size={11} /> : <Pin size={11} />}
          </button>
        )}
        {onShare && (
          <button
            onClick={() => onShare(folder)}
            className="p-1.5 bg-slate-900/80 backdrop-blur-sm rounded-md text-slate-400 hover:text-purple-400 transition-colors"
            title="Share folder"
          >
            <Share2 size={11} />
          </button>
        )}
        {onDownloadZip && (
          <button
            onClick={() => onDownloadZip(folder.id, folder.name)}
            className="p-1.5 bg-slate-900/80 backdrop-blur-sm rounded-md text-slate-400 hover:text-white transition-colors"
            title="Download as ZIP"
          >
            <Download size={11} />
          </button>
        )}
        {onDelete && (
          <button
            onClick={() => onDelete(folder.id)}
            className="p-1.5 bg-slate-900/80 backdrop-blur-sm rounded-md text-slate-400 hover:text-red-400 transition-colors"
            title="Delete folder"
          >
            <Trash2 size={11} />
          </button>
        )}
      </div>

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

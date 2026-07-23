import { useState, useRef, useEffect } from 'react';
import { Folder, FolderOpen, MoreVertical, Pencil, Trash2, Pin, PinOff, FileText, Image, Video, Music, FileCode, Archive, File } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useDroppable } from '@dnd-kit/core';
import type { FileItem } from './FileCard';

interface FolderItem {
  id: string;
  name: string;
  parent_id?: string | null;
  created_at: string;
}

interface Props {
  folders: FolderItem[];
  currentId: string | null;
  pinnedFiles: FileItem[];
  onSelect: (id: string | null) => void;
  onRename: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onPinnedFileClick: (file: FileItem) => void;
  onPinToggle: (id: number) => void;
}

function fileIcon(mime: string) {
  if (mime.startsWith('image/')) return <Image size={13} className="text-cyan-400" />;
  if (mime.startsWith('video/')) return <Video size={13} className="text-purple-400" />;
  if (mime.startsWith('audio/')) return <Music size={13} className="text-pink-400" />;
  if (mime.includes('zip') || mime.includes('tar') || mime.includes('rar')) return <Archive size={13} className="text-yellow-400" />;
  if (mime.includes('javascript') || mime.includes('typescript') || mime.includes('json') || mime.includes('html') || mime.includes('css'))
    return <FileCode size={13} className="text-green-400" />;
  if (mime.startsWith('text/')) return <FileText size={13} className="text-slate-400" />;
  return <File size={13} className="text-slate-500" />;
}

function DroppableFolder({
  folder, isActive, onClick, onRename, onDelete,
}: {
  folder: FolderItem;
  isActive: boolean;
  onClick: () => void;
  onRename: (name: string) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: folder.id });
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState(folder.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  async function commitRename() {
    if (editVal.trim() && editVal.trim() !== folder.name) {
      try { await onRename(editVal.trim()); } catch {}
    } else {
      setEditVal(folder.name);
    }
    setEditing(false);
  }

  return (
    <div
      ref={setNodeRef}
      onClick={onClick}
      className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all select-none
        ${isActive ? 'bg-cyan-500/20 text-cyan-300' : 'hover:bg-white/5 text-slate-300'}
        ${isOver ? 'ring-2 ring-cyan-400 bg-cyan-500/10' : ''}`}
    >
      {isActive
        ? <FolderOpen size={16} className="text-cyan-400 shrink-0" />
        : <Folder size={16} className="text-slate-400 group-hover:text-cyan-400 shrink-0" />}

      {editing ? (
        <input
          ref={inputRef}
          value={editVal}
          onChange={e => setEditVal(e.target.value)}
          onBlur={commitRename}
          onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') { setEditVal(folder.name); setEditing(false); } }}
          onClick={e => e.stopPropagation()}
          className="bg-transparent border-b border-cyan-400 outline-none text-sm flex-1 min-w-0"
        />
      ) : (
        <span className="truncate text-sm flex-1 min-w-0">{folder.name}</span>
      )}

      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild onClick={e => e.stopPropagation()}>
          <button className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-white p-0.5 rounded transition-all shrink-0">
            <MoreVertical size={14} />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            className="z-50 min-w-[140px] bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-1"
            sideOffset={4}
            onClick={e => e.stopPropagation()}
          >
            <DropdownMenu.Item
              className="flex items-center gap-2 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700 rounded cursor-pointer outline-none"
              onSelect={() => { setEditVal(folder.name); setEditing(true); }}
            >
              <Pencil size={13} /> Rename
            </DropdownMenu.Item>
            <DropdownMenu.Item
              className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded cursor-pointer outline-none"
              onSelect={onDelete}
            >
              <Trash2 size={13} /> Delete
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}

export default function FolderSidebar({ folders, currentId, pinnedFiles, onSelect, onRename, onDelete, onPinnedFileClick, onPinToggle }: Props) {
  const { setNodeRef: setRootRef, isOver: rootIsOver } = useDroppable({ id: '__root__' });

  return (
    <aside className="w-56 shrink-0 flex flex-col gap-1">
      <div
        ref={setRootRef}
        onClick={() => onSelect(null)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all select-none
          ${currentId === null ? 'bg-cyan-500/20 text-cyan-300' : 'hover:bg-white/5 text-slate-300'}
          ${rootIsOver ? 'ring-2 ring-cyan-400 bg-cyan-500/10' : ''}`}
      >
        {currentId === null
          ? <FolderOpen size={16} className="text-cyan-400 shrink-0" />
          : <Folder size={16} className="text-slate-400 shrink-0" />}
        <span className="text-sm font-medium">All Files</span>
      </div>

      {folders.length > 0 && <div className="border-t border-slate-700/50 my-1" />}

      {folders.map(f => (
        <DroppableFolder
          key={f.id}
          folder={f}
          isActive={currentId === f.id}
          onClick={() => onSelect(f.id)}
          onRename={name => onRename(f.id, name)}
          onDelete={() => onDelete(f.id)}
        />
      ))}

      {/* Pinned files */}
      {pinnedFiles.length > 0 && (
        <>
          <div className="border-t border-slate-700/50 my-1" />
          <p className="px-3 pt-1 pb-0.5 text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Pinned</p>
          {pinnedFiles.map(f => (
            <div
              key={f.id}
              onClick={() => onPinnedFileClick(f)}
              className="group flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-white/5 transition-colors select-none"
            >
              <span className="shrink-0">{fileIcon(f.mime_type ?? '')}</span>
              <span className="truncate text-xs text-slate-400 group-hover:text-slate-200 transition-colors flex-1 min-w-0">
                {f.original_name}
              </span>
              <button
                onClick={e => { e.stopPropagation(); onPinToggle(f.id); }}
                className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-500 hover:text-amber-400 transition-all shrink-0"
              >
                <PinOff size={11} />
              </button>
            </div>
          ))}
        </>
      )}
    </aside>
  );
}

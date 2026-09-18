import { useState, useRef, useEffect } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Download, Trash2, FileText, Image, Video, Music, FileCode, Archive, File, Pin, PinOff, Box, Table } from 'lucide-react';

export interface FileItem {
  id: number;
  original_name: string;
  file_path: string;
  mime_type: string;
  size: number;
  folder_id: string | null;
  pinned: number;
  created_at: string;
  preview_path?: string;
  preview_type?: string;
}

function fileTypeStyle(mime: string, name: string): { icon: React.ReactNode; bg: string; accent: string } {
  const ext = name.toLowerCase().split('.').pop() || '';
  if (['stl', 'obj', 'gltf', 'glb', 'step', 'stp', 'f3d', 'ipt', 'iam'].includes(ext)) {
    return { icon: <Box size={26} />, bg: 'from-blue-500/15 to-cyan-500/5', accent: 'text-blue-400 border-blue-500/30' };
  }
  if (['csv', 'tsv', 'xlsx', 'xls', 'ods'].includes(ext)) {
    return { icon: <Table size={26} />, bg: 'from-emerald-500/15 to-emerald-500/5', accent: 'text-emerald-400 border-emerald-500/30' };
  }
  if (mime.startsWith('image/'))
    return { icon: <Image size={26} />, bg: 'from-cyan-500/15 to-cyan-500/5', accent: 'text-cyan-400 border-cyan-500/30' };
  if (mime.startsWith('video/') || ['mov', 'mkv', 'webm', 'avi', 'm4v'].includes(ext))
    return { icon: <Video size={26} />, bg: 'from-purple-500/15 to-purple-500/5', accent: 'text-purple-400 border-purple-500/30' };
  if (mime.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a', 'flac'].includes(ext))
    return { icon: <Music size={26} />, bg: 'from-pink-500/15 to-pink-500/5', accent: 'text-pink-400 border-pink-500/30' };
  if (mime.includes('zip') || mime.includes('tar') || mime.includes('gzip') || mime.includes('rar') || mime.includes('7z') || ['zip', 'tar', 'gz', 'rar', '7z'].includes(ext))
    return { icon: <Archive size={26} />, bg: 'from-yellow-500/15 to-yellow-500/5', accent: 'text-yellow-400 border-yellow-500/30' };
  if (mime.includes('javascript') || mime.includes('typescript') || mime.includes('json') || mime.includes('html') || mime.includes('css') || mime.includes('xml') || ['py', 'sh', 'c', 'cpp', 'rs', 'go', 'ts', 'js'].includes(ext))
    return { icon: <FileCode size={26} />, bg: 'from-green-500/15 to-green-500/5', accent: 'text-green-400 border-green-500/30' };
  if (mime.startsWith('text/') || ['txt', 'md', 'mdx', 'log'].includes(ext))
    return { icon: <FileText size={26} />, bg: 'from-slate-500/15 to-slate-500/5', accent: 'text-slate-400 border-slate-500/30' };
  return { icon: <File size={26} />, bg: 'from-slate-500/10 to-slate-500/5', accent: 'text-slate-500 border-slate-600/30' };
}

export function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ext(name: string) {
  const parts = name.split('.');
  return parts.length > 1 ? parts.pop()!.toUpperCase() : '—';
}

interface Props {
  file: FileItem;
  view: 'grid' | 'list';
  selected: boolean;
  checked: boolean;
  onSelect: (id: number, e?: React.MouseEvent) => void;
  onDoubleClick: (id: number) => void;
  onDelete: (id: number) => void;
  onPin: (id: number) => void;
  onCheck: (id: number, checked: boolean) => void;
  onContextMenu?: (e: React.MouseEvent, file: FileItem) => void;
  onRename?: (id: number, name: string) => Promise<void>;
}

export default function FileCard({
  file,
  view,
  selected,
  checked,
  onSelect,
  onDoubleClick,
  onDelete,
  onPin,
  onCheck,
  onContextMenu,
  onRename,
}: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `file-${file.id}`,
    data: { fileId: file.id },
  });

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(file.original_name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  async function commitRename() {
    if (editName.trim() && editName.trim() !== file.original_name && onRename) {
      await onRename(file.id, editName.trim());
    } else {
      setEditName(file.original_name);
    }
    setEditing(false);
  }

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;
  const isImg = file.mime_type?.startsWith('image/');
  const thumbnailSrc = isImg ? file.file_path : file.preview_path ? file.preview_path : null;
  const isPinned = Boolean(file.pinned);
  const { icon, bg, accent } = fileTypeStyle(file.mime_type ?? '', file.original_name);

  if (view === 'list') {
    return (
      <div
        ref={setNodeRef}
        style={style}
        {...listeners}
        {...attributes}
        onClick={(e) => onSelect(file.id, e)}
        onDoubleClick={() => onDoubleClick(file.id)}
        onContextMenu={(e) => {
          if (onContextMenu) {
            e.preventDefault();
            onContextMenu(e, file);
          }
        }}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all cursor-grab active:cursor-grabbing group select-none
          ${checked ? 'bg-cyan-500/15 border border-cyan-500/40' : selected ? 'bg-cyan-500/10 border border-cyan-500/20' : 'hover:bg-white/4 border border-transparent'}
          ${isDragging ? 'opacity-40' : ''}`}
      >
        {/* Checkbox */}
        <div
          className={`shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-all
            ${checked ? 'bg-cyan-500 border-cyan-500' : 'border-slate-600 opacity-0 group-hover:opacity-100'}`}
          onClick={e => { e.stopPropagation(); onCheck(file.id, !checked); }}
          onPointerDown={e => e.stopPropagation()}
        >
          {checked && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
        </div>

        <div className={`w-8 h-8 rounded-md bg-gradient-to-br ${bg} border ${accent} flex items-center justify-center shrink-0 overflow-hidden`}>
          {thumbnailSrc ? (
            <img src={thumbnailSrc} alt="" className="w-full h-full object-cover pointer-events-none" />
          ) : (
            <span className={accent.split(' ')[0]}>{icon}</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              ref={inputRef}
              value={editName}
              onChange={e => setEditName(e.target.value)}
              onBlur={commitRename}
              onKeyDown={e => {
                if (e.key === 'Enter') commitRename();
                if (e.key === 'Escape') { setEditName(file.original_name); setEditing(false); }
              }}
              onClick={e => e.stopPropagation()}
              onPointerDown={e => e.stopPropagation()}
              className="bg-transparent border-b border-cyan-400 outline-none text-sm text-cyan-300 w-full"
            />
          ) : (
            <p className={`text-sm truncate ${checked || selected ? 'text-cyan-200 font-medium' : 'text-slate-200'}`}>{file.original_name}</p>
          )}
        </div>

        <span className="text-xs text-slate-500 shrink-0 w-16 text-right">{formatSize(file.size)}</span>
        <span className="text-xs text-slate-500 shrink-0 w-24 text-right hidden sm:block">
          {new Date(file.created_at).toLocaleDateString()}
        </span>

        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()}>
          <button onClick={() => onPin(file.id)}
            className={`p-1.5 transition-colors rounded-md hover:bg-white/5 ${isPinned ? 'text-amber-400' : 'text-slate-400 hover:text-amber-400'}`}
            title={isPinned ? 'Unpin' : 'Pin'}>
            {isPinned ? <PinOff size={13} /> : <Pin size={13} />}
          </button>
          <a href={file.file_path} download={file.original_name}
            className="p-1.5 text-slate-400 hover:text-cyan-400 transition-colors rounded-md hover:bg-cyan-500/10">
            <Download size={13} />
          </a>
          <button onClick={() => onDelete(file.id)}
            className="p-1.5 text-slate-400 hover:text-red-400 transition-colors rounded-md hover:bg-red-500/10">
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={(e) => onSelect(file.id, e)}
      onDoubleClick={() => onDoubleClick(file.id)}
      onContextMenu={(e) => {
        if (onContextMenu) {
          e.preventDefault();
          onContextMenu(e, file);
        }
      }}
      className={`group relative rounded-xl border transition-all cursor-grab active:cursor-grabbing select-none overflow-hidden
        ${checked
          ? 'border-cyan-500/60 bg-cyan-500/15 ring-2 ring-cyan-500/30'
          : selected
          ? 'border-cyan-500/50 bg-cyan-500/10 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-500/20'
          : 'border-slate-700/50 bg-slate-800/40 hover:border-slate-600 hover:bg-slate-800/70'}
        ${isDragging ? 'opacity-40 scale-95' : ''}`}
    >
      {/* Checkbox — top left */}
      <div
        className={`absolute top-2 left-2 z-10 w-5 h-5 rounded border flex items-center justify-center transition-all
          ${checked ? 'opacity-100 bg-cyan-500 border-cyan-500' : 'opacity-0 group-hover:opacity-100 bg-slate-900/80 border-slate-500'}`}
        onClick={e => { e.stopPropagation(); onCheck(file.id, !checked); }}
        onPointerDown={e => e.stopPropagation()}
      >
        {checked && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
      </div>

      {/* Pin indicator */}
      {isPinned && (
        <div className="absolute top-2 left-2 z-10 w-5 h-5 flex items-center justify-center pointer-events-none">
          <Pin size={11} className="text-amber-400" style={{ display: checked ? 'none' : undefined }} />
        </div>
      )}

      {/* Actions overlay */}
      <div
        className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
        onClick={e => e.stopPropagation()}
        onPointerDown={e => e.stopPropagation()}
      >
        <button onClick={() => onPin(file.id)}
          className={`p-1.5 bg-slate-900/80 backdrop-blur-sm rounded-md transition-colors ${isPinned ? 'text-amber-400' : 'text-slate-400 hover:text-amber-400'}`}
          title={isPinned ? 'Unpin' : 'Pin'}>
          {isPinned ? <PinOff size={11} /> : <Pin size={11} />}
        </button>
        <a href={file.file_path} download={file.original_name}
          className="p-1.5 bg-slate-900/80 backdrop-blur-sm rounded-md text-slate-400 hover:text-cyan-400 transition-colors">
          <Download size={11} />
        </a>
        <button onClick={() => onDelete(file.id)}
          className="p-1.5 bg-slate-900/80 backdrop-blur-sm rounded-md text-slate-400 hover:text-red-400 transition-colors">
          <Trash2 size={11} />
        </button>
      </div>

      {/* Thumbnail */}
      <div className={`h-28 flex items-center justify-center bg-gradient-to-br ${bg} relative overflow-hidden`}>
        {thumbnailSrc ? (
          <img src={thumbnailSrc} alt={file.original_name}
            className="w-full h-full object-cover pointer-events-none"
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
        ) : (
          <div className={`${accent.split(' ')[0]} opacity-70`}>{icon}</div>
        )}
        {!isImg && (
          <span className={`absolute bottom-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded border ${accent} bg-slate-900/60`}>
            {ext(file.original_name)}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="px-3 py-2.5">
        {editing ? (
          <input
            ref={inputRef}
            value={editName}
            onChange={e => setEditName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={e => {
              if (e.key === 'Enter') commitRename();
              if (e.key === 'Escape') { setEditName(file.original_name); setEditing(false); }
            }}
            onClick={e => e.stopPropagation()}
            onPointerDown={e => e.stopPropagation()}
            className="bg-transparent border-b border-cyan-400 outline-none text-xs text-cyan-300 w-full"
          />
        ) : (
          <p className={`text-xs font-medium truncate leading-tight ${checked || selected ? 'text-cyan-200 font-semibold' : 'text-slate-200'}`}
            title={file.original_name}>
            {file.original_name}
          </p>
        )}
        <p className="text-[11px] text-slate-500 mt-0.5">{formatSize(file.size)}</p>
      </div>
    </div>
  );
}

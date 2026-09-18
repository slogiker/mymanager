import { useEffect, useRef } from 'react';
import {
  Eye, Pencil, Share2, Pin, PinOff, Download, Trash2,
  FolderOpen, FolderPlus, FilePlus, Upload, Archive
} from 'lucide-react';
import type { FileItem } from './FileCard';
import type { FolderItem } from './FolderCard';

export interface ContextMenuState {
  x: number;
  y: number;
  type: 'file' | 'folder' | 'canvas';
  file?: FileItem;
  folder?: FolderItem;
}

interface Props {
  state: ContextMenuState | null;
  onClose: () => void;
  onPreviewFile?: (file: FileItem) => void;
  onRenameFile?: (file: FileItem) => void;
  onShareFile?: (file: FileItem) => void;
  onPinFile?: (id: number) => void;
  onDeleteFile?: (id: number) => void;
  onOpenFolder?: (id: string, name: string) => void;
  onRenameFolder?: (id: string, name: string) => void;
  onShareFolder?: (folder: FolderItem) => void;
  onPinFolder?: (id: string) => void;
  onDownloadFolderZip?: (id: string, name: string) => void;
  onDeleteFolder?: (id: string) => void;
  onNewFile?: () => void;
  onNewFolder?: () => void;
  onUploadClick?: () => void;
  onUploadFolderClick?: () => void;
}

export default function ContextMenu({
  state,
  onClose,
  onPreviewFile,
  onRenameFile,
  onShareFile,
  onPinFile,
  onDeleteFile,
  onOpenFolder,
  onRenameFolder,
  onShareFolder,
  onPinFolder,
  onDownloadFolderZip,
  onDeleteFolder,
  onNewFile,
  onNewFolder,
  onUploadClick,
  onUploadFolderClick,
}: Props) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  if (!state) return null;

  // Viewport boundary clamping
  const menuWidth = 200;
  const menuHeight = 260;
  const posX = Math.min(state.x, window.innerWidth - menuWidth - 10);
  const posY = Math.min(state.y, window.innerHeight - menuHeight - 10);

  return (
    <div
      ref={menuRef}
      style={{ top: posY, left: posX }}
      className="fixed z-50 w-52 bg-slate-900/95 border border-slate-700/80 rounded-xl shadow-2xl p-1.5 text-xs text-slate-200 backdrop-blur-md select-none"
      onClick={e => e.stopPropagation()}
    >
      {/* File Target */}
      {state.type === 'file' && state.file && (
        <>
          <div className="px-2.5 py-1 text-[11px] font-semibold text-slate-500 truncate border-b border-slate-800 mb-1">
            {state.file.original_name}
          </div>
          <button
            onClick={() => { onPreviewFile?.(state.file!); onClose(); }}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-cyan-500/20 hover:text-cyan-200 transition-colors"
          >
            <Eye size={13} className="text-cyan-400" /> Preview / Open
          </button>
          <button
            onClick={() => { onRenameFile?.(state.file!); onClose(); }}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
          >
            <Pencil size={13} className="text-slate-400" /> Rename
          </button>
          <button
            onClick={() => { onShareFile?.(state.file!); onClose(); }}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-purple-500/20 hover:text-purple-200 transition-colors"
          >
            <Share2 size={13} className="text-purple-400" /> Share Link...
          </button>
          <button
            onClick={() => { onPinFile?.(state.file!.id); onClose(); }}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
          >
            {state.file.pinned ? <PinOff size={13} className="text-amber-400" /> : <Pin size={13} className="text-slate-400" />}
            {state.file.pinned ? 'Unpin from Sidebar' : 'Pin to Sidebar'}
          </button>
          <a
            href={state.file.file_path}
            download={state.file.original_name}
            onClick={onClose}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
          >
            <Download size={13} className="text-slate-400" /> Download
          </a>
          <div className="h-px bg-slate-800 my-1" />
          <button
            onClick={() => { onDeleteFile?.(state.file!.id); onClose(); }}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 size={13} /> Delete
          </button>
        </>
      )}

      {/* Folder Target */}
      {state.type === 'folder' && state.folder && (
        <>
          <div className="px-2.5 py-1 text-[11px] font-semibold text-slate-500 truncate border-b border-slate-800 mb-1">
            {state.folder.name}
          </div>
          <button
            onClick={() => { onOpenFolder?.(state.folder!.id, state.folder!.name); onClose(); }}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-yellow-500/20 hover:text-yellow-200 transition-colors"
          >
            <FolderOpen size={13} className="text-yellow-400" /> Open Folder
          </button>
          <button
            onClick={() => { onRenameFolder?.(state.folder!.id, state.folder!.name); onClose(); }}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
          >
            <Pencil size={13} className="text-slate-400" /> Rename
          </button>
          <button
            onClick={() => { onShareFolder?.(state.folder!); onClose(); }}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-purple-500/20 hover:text-purple-200 transition-colors"
          >
            <Share2 size={13} className="text-purple-400" /> Share Link...
          </button>
          <button
            onClick={() => { onPinFolder?.(state.folder!.id); onClose(); }}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
          >
            <Pin size={13} className="text-amber-400" /> Pin / Unpin
          </button>
          <button
            onClick={() => { onDownloadFolderZip?.(state.folder!.id, state.folder!.name); onClose(); }}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
          >
            <Archive size={13} className="text-yellow-400" /> Download as ZIP
          </button>
          <div className="h-px bg-slate-800 my-1" />
          <button
            onClick={() => { onDeleteFolder?.(state.folder!.id); onClose(); }}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 size={13} /> Delete
          </button>
        </>
      )}

      {/* Canvas Target */}
      {state.type === 'canvas' && (
        <>
          <button
            onClick={() => { onNewFile?.(); onClose(); }}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
          >
            <FilePlus size={13} className="text-cyan-400" /> New File...
          </button>
          <button
            onClick={() => { onNewFolder?.(); onClose(); }}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
          >
            <FolderPlus size={13} className="text-yellow-400" /> New Folder...
          </button>
          <div className="h-px bg-slate-800 my-1" />
          <button
            onClick={() => { onUploadClick?.(); onClose(); }}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
          >
            <Upload size={13} className="text-purple-400" /> Upload Files
          </button>
          <button
            onClick={() => { onUploadFolderClick?.(); onClose(); }}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
          >
            <FolderOpen size={13} className="text-blue-400" /> Upload Folder
          </button>
        </>
      )}
    </div>
  );
}

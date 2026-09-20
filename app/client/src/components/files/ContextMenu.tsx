import React, { useEffect, useRef, useState } from 'react';
import {
  Eye, Pencil, Share2, Pin, PinOff, Download, Trash2,
  FolderOpen, FolderPlus, FilePlus, Upload, Archive, Copy,
  Files, Check, CheckSquare, RefreshCw, Link2, ExternalLink
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
  currentPathString?: string;
  onPreviewFile?: (file: FileItem) => void;
  onRenameFile?: (file: FileItem) => void;
  onShareFile?: (file: FileItem) => void;
  onDuplicateFile?: (file: FileItem) => void;
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
  onSelectAll?: () => void;
  onRefresh?: () => void;
}

function formatSize(bytes?: number) {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ContextMenu({
  state,
  onClose,
  currentPathString = '~/',
  onPreviewFile,
  onRenameFile,
  onShareFile,
  onDuplicateFile,
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
  onSelectAll,
  onRefresh,
}: Props) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [copiedNotice, setCopiedNotice] = useState<string | null>(null);

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
  const menuWidth = 220;
  const menuHeight = state.type === 'file' ? 340 : state.type === 'folder' ? 300 : 220;
  const posX = Math.min(state.x, window.innerWidth - menuWidth - 12);
  const posY = Math.min(state.y, window.innerHeight - menuHeight - 12);

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedNotice(label);
      setTimeout(() => {
        setCopiedNotice(null);
        onClose();
      }, 700);
    });
  }

  return (
    <div
      ref={menuRef}
      style={{ top: posY, left: posX }}
      className="fixed z-50 w-56 bg-[#17181e] border border-white/10 rounded-xl shadow-2xl p-1.5 text-xs text-slate-200 backdrop-blur-md select-none font-sans"
      onClick={e => e.stopPropagation()}
    >
      {/* Visual copy feedback toast in menu */}
      {copiedNotice && (
        <div className="px-3 py-1.5 mb-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 font-medium flex items-center gap-1.5 text-[11px] border border-emerald-500/30">
          <Check size={13} /> {copiedNotice} copied!
        </div>
      )}

      {/* File Target */}
      {state.type === 'file' && state.file && (
        <>
          <div className="px-2.5 py-1.5 border-b border-slate-800/80 mb-1">
            <p className="font-semibold text-slate-200 truncate leading-tight" title={state.file.original_name}>
              {state.file.original_name}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {formatSize(state.file.size)} &middot; {new Date(state.file.created_at).toLocaleDateString()}
            </p>
          </div>

          <button
            onClick={() => { onPreviewFile?.(state.file!); onClose(); }}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-red-500/15 hover:text-white transition-colors"
          >
            <Eye size={14} className="text-red-400" /> Preview / Open
          </button>

          <button
            onClick={() => { onShareFile?.(state.file!); onClose(); }}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-purple-500/15 hover:text-white transition-colors"
          >
            <Share2 size={14} className="text-purple-400" /> Share Link...
          </button>

          <button
            onClick={() => copyToClipboard(`${currentPathString}${state.file!.original_name}`, 'File path')}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
          >
            <Copy size={14} className="text-slate-400" /> Copy Path
          </button>

          <button
            onClick={() => copyToClipboard(`${window.location.origin}${state.file!.file_path}`, 'Direct link')}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
          >
            <Link2 size={14} className="text-slate-400" /> Copy Direct Link
          </button>

          {onDuplicateFile && (
            <button
              onClick={() => { onDuplicateFile(state.file!); onClose(); }}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
            >
              <Files size={14} className="text-slate-400" /> Duplicate File
            </button>
          )}

          <button
            onClick={() => { onRenameFile?.(state.file!); onClose(); }}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
          >
            <Pencil size={14} className="text-slate-400" /> Rename
          </button>

          <button
            onClick={() => { onPinFile?.(state.file!.id); onClose(); }}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
          >
            {state.file.pinned ? <PinOff size={14} className="text-amber-400" /> : <Pin size={14} className="text-slate-400" />}
            {state.file.pinned ? 'Unpin from Sidebar' : 'Pin to Sidebar'}
          </button>

          <a
            href={state.file.file_path}
            download={state.file.original_name}
            onClick={onClose}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
          >
            <Download size={14} className="text-slate-400" /> Download
          </a>

          <div className="h-px bg-slate-800/80 my-1" />

          <button
            onClick={() => { onDeleteFile?.(state.file!.id); onClose(); }}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-red-400 hover:bg-red-500/15 hover:text-red-300 transition-colors"
          >
            <Trash2 size={14} /> Delete
          </button>
        </>
      )}

      {/* Folder Target */}
      {state.type === 'folder' && state.folder && (
        <>
          <div className="px-2.5 py-1.5 border-b border-slate-800/80 mb-1">
            <p className="font-semibold text-slate-200 truncate leading-tight" title={state.folder.name}>
              {state.folder.name}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">Folder</p>
          </div>

          <button
            onClick={() => { onOpenFolder?.(state.folder!.id, state.folder!.name); onClose(); }}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-yellow-500/15 hover:text-yellow-200 transition-colors"
          >
            <FolderOpen size={14} className="text-yellow-400" /> Open Folder
          </button>

          <button
            onClick={() => { onShareFolder?.(state.folder!); onClose(); }}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-purple-500/15 hover:text-white transition-colors"
          >
            <Share2 size={14} className="text-purple-400" /> Share Folder...
          </button>

          <button
            onClick={() => copyToClipboard(`${currentPathString}${state.folder!.name}/`, 'Folder path')}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
          >
            <Copy size={14} className="text-slate-400" /> Copy Folder Path
          </button>

          <button
            onClick={() => { onRenameFolder?.(state.folder!.id, state.folder!.name); onClose(); }}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
          >
            <Pencil size={14} className="text-slate-400" /> Rename
          </button>

          <button
            onClick={() => { onPinFolder?.(state.folder!.id); onClose(); }}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
          >
            <Pin size={14} className="text-amber-400" /> Pin / Unpin
          </button>

          <button
            onClick={() => { onDownloadFolderZip?.(state.folder!.id, state.folder!.name); onClose(); }}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
          >
            <Archive size={14} className="text-yellow-400" /> Download as ZIP
          </button>

          <div className="h-px bg-slate-800/80 my-1" />

          <button
            onClick={() => { onDeleteFolder?.(state.folder!.id); onClose(); }}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-red-400 hover:bg-red-500/15 hover:text-red-300 transition-colors"
          >
            <Trash2 size={14} /> Delete
          </button>
        </>
      )}

      {/* Canvas Target */}
      {state.type === 'canvas' && (
        <>
          <div className="px-2.5 py-1 text-[11px] font-semibold text-slate-500 truncate border-b border-slate-800/80 mb-1">
            {currentPathString}
          </div>

          <button
            onClick={() => { onNewFile?.(); onClose(); }}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
          >
            <FilePlus size={14} className="text-red-400" /> New File
          </button>

          <button
            onClick={() => { onNewFolder?.(); onClose(); }}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
          >
            <FolderPlus size={14} className="text-yellow-400" /> New Folder
          </button>

          <div className="h-px bg-slate-800/80 my-1" />

          <button
            onClick={() => { onUploadClick?.(); onClose(); }}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
          >
            <Upload size={14} className="text-purple-400" /> Upload Files
          </button>

          <button
            onClick={() => { onUploadFolderClick?.(); onClose(); }}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
          >
            <FolderOpen size={14} className="text-blue-400" /> Upload Folder
          </button>

          <div className="h-px bg-slate-800/80 my-1" />

          {onSelectAll && (
            <button
              onClick={() => { onSelectAll(); onClose(); }}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
            >
              <CheckSquare size={14} className="text-slate-400" /> Select All (Ctrl+A)
            </button>
          )}

          {onRefresh && (
            <button
              onClick={() => { onRefresh(); onClose(); }}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
            >
              <RefreshCw size={14} className="text-slate-400" /> Refresh
            </button>
          )}
        </>
      )}
    </div>
  );
}

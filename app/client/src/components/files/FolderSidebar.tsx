import { useState, useRef, useEffect, useMemo } from 'react';
import {
  Folder, FolderOpen, MoreVertical, Pencil, Trash2, Pin, PinOff,
  FileText, Image, Video, Music, FileCode, Archive, File,
  ChevronRight, ChevronDown, Plus, FilePlus, FolderPlus, Download, Upload
} from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useDroppable } from '@dnd-kit/core';
import type { FileItem } from './FileCard';

export interface FolderItem {
  id: string;
  name: string;
  parent_id?: string | null;
  pinned?: number;
  created_at: string;
}

interface Props {
  folders: FolderItem[];
  currentId: string | null;
  pinnedFiles: FileItem[];
  pinnedFolders?: FolderItem[];
  onSelect: (id: string | null) => void;
  onRename: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onPinnedFileClick: (file: FileItem) => void;
  onPinToggle: (id: number) => void;
  onPinFolderToggle?: (id: string) => void;
  onDownloadFolderZip?: (id: string, name: string) => void;
  onNewFile?: () => void;
  onNewFolder?: () => void;
  onUploadFilesClick?: () => void;
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

// Build path prefix for pinned subfolder (e.g. "Projects / Subfolder")
function getFolderFullPath(folderId: string, folderMap: Map<string, FolderItem>): string {
  const parts: string[] = [];
  let curr: FolderItem | undefined = folderMap.get(folderId);
  while (curr) {
    parts.unshift(curr.name);
    curr = curr.parent_id ? folderMap.get(curr.parent_id) : undefined;
  }
  return parts.join(' / ');
}

// Tree Item component
function TreeFolderNode({
  folder,
  level = 0,
  childrenMap,
  expandedIds,
  toggleExpand,
  currentId,
  onSelect,
  onRename,
  onDelete,
  onPinFolderToggle,
  onDownloadFolderZip,
}: {
  folder: FolderItem;
  level?: number;
  childrenMap: Map<string | null, FolderItem[]>;
  expandedIds: Set<string>;
  toggleExpand: (id: string) => void;
  currentId: string | null;
  onSelect: (id: string) => void;
  onRename: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onPinFolderToggle?: (id: string) => void;
  onDownloadFolderZip?: (id: string, name: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: folder.id });
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState(folder.name);
  const inputRef = useRef<HTMLInputElement>(null);

  const children = childrenMap.get(folder.id) || [];
  const hasChildren = children.length > 0;
  const isExpanded = expandedIds.has(folder.id);
  const isActive = currentId === folder.id;

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  async function commitRename() {
    if (editVal.trim() && editVal.trim() !== folder.name) {
      try { await onRename(folder.id, editVal.trim()); } catch {}
    } else {
      setEditVal(folder.name);
    }
    setEditing(false);
  }

  return (
    <div className="flex flex-col select-none">
      <div
        ref={setNodeRef}
        onClick={() => onSelect(folder.id)}
        style={{ paddingLeft: `${level * 14 + 8}px` }}
        className={`group flex items-center gap-1.5 py-1.5 pr-2 rounded-lg cursor-pointer transition-all min-w-0
          ${isActive ? 'bg-cyan-500/20 text-cyan-300 font-medium' : 'hover:bg-white/5 text-slate-300'}
          ${isOver ? 'ring-2 ring-cyan-400 bg-cyan-500/10' : ''}`}
      >
        {/* Chevron */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleExpand(folder.id);
          }}
          className={`w-4 h-4 flex items-center justify-center text-slate-500 hover:text-slate-300 transition-colors shrink-0 ${
            !hasChildren ? 'invisible' : ''
          }`}
        >
          {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </button>

        {/* Folder icon */}
        {isActive || isExpanded
          ? <FolderOpen size={15} className="text-yellow-400 shrink-0" />
          : <Folder size={15} className="text-yellow-500/80 group-hover:text-yellow-400 shrink-0" />}

        {/* Name / Input */}
        {editing ? (
          <input
            ref={inputRef}
            value={editVal}
            onChange={e => setEditVal(e.target.value)}
            onBlur={commitRename}
            onKeyDown={e => {
              if (e.key === 'Enter') commitRename();
              if (e.key === 'Escape') { setEditVal(folder.name); setEditing(false); }
            }}
            onClick={e => e.stopPropagation()}
            className="bg-transparent border-b border-cyan-400 outline-none text-xs flex-1 min-w-0 text-slate-100"
          />
        ) : (
          <span className="truncate text-xs flex-1 min-w-0" title={folder.name}>
            {folder.name}
          </span>
        )}

        {/* More Actions dropdown */}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild onClick={e => e.stopPropagation()}>
            <button className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-white p-0.5 rounded transition-all shrink-0">
              <MoreVertical size={13} />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="z-50 min-w-[150px] bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-1 text-xs"
              sideOffset={4}
              onClick={e => e.stopPropagation()}
            >
              <DropdownMenu.Item
                className="flex items-center gap-2 px-2.5 py-1.5 text-slate-200 hover:bg-slate-700 rounded cursor-pointer outline-none"
                onSelect={() => { setEditVal(folder.name); setEditing(true); }}
              >
                <Pencil size={12} /> Rename
              </DropdownMenu.Item>
              {onPinFolderToggle && (
                <DropdownMenu.Item
                  className="flex items-center gap-2 px-2.5 py-1.5 text-slate-200 hover:bg-slate-700 rounded cursor-pointer outline-none"
                  onSelect={() => onPinFolderToggle(folder.id)}
                >
                  <Pin size={12} /> {folder.pinned ? 'Unpin' : 'Pin to Sidebar'}
                </DropdownMenu.Item>
              )}
              {onDownloadFolderZip && (
                <DropdownMenu.Item
                  className="flex items-center gap-2 px-2.5 py-1.5 text-slate-200 hover:bg-slate-700 rounded cursor-pointer outline-none"
                  onSelect={() => onDownloadFolderZip(folder.id, folder.name)}
                >
                  <Download size={12} /> Download as ZIP
                </DropdownMenu.Item>
              )}
              <DropdownMenu.Separator className="h-px bg-slate-700 my-1" />
              <DropdownMenu.Item
                className="flex items-center gap-2 px-2.5 py-1.5 text-red-400 hover:bg-red-500/10 rounded cursor-pointer outline-none"
                onSelect={() => onDelete(folder.id)}
              >
                <Trash2 size={12} /> Delete
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="flex flex-col">
          {children.map(child => (
            <TreeFolderNode
              key={child.id}
              folder={child}
              level={level + 1}
              childrenMap={childrenMap}
              expandedIds={expandedIds}
              toggleExpand={toggleExpand}
              currentId={currentId}
              onSelect={onSelect}
              onRename={onRename}
              onDelete={onDelete}
              onPinFolderToggle={onPinFolderToggle}
              onDownloadFolderZip={onDownloadFolderZip}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function FolderSidebar({
  folders,
  currentId,
  pinnedFiles,
  pinnedFolders = [],
  onSelect,
  onRename,
  onDelete,
  onPinnedFileClick,
  onPinToggle,
  onPinFolderToggle,
  onDownloadFolderZip,
  onNewFile,
  onNewFolder,
  onUploadFilesClick,
}: Props) {
  const { setNodeRef: setRootRef, isOver: rootIsOver } = useDroppable({ id: '__root__' });
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Build parent -> children map and id -> folder map
  const { childrenMap, folderMap } = useMemo(() => {
    const cmap = new Map<string | null, FolderItem[]>();
    const fmap = new Map<string, FolderItem>();

    folders.forEach(f => {
      fmap.set(f.id, f);
      const parent = f.parent_id || null;
      if (!cmap.has(parent)) cmap.set(parent, []);
      cmap.get(parent)!.push(f);
    });

    // Sort folders alphabetically
    cmap.forEach(list => list.sort((a, b) => a.name.localeCompare(b.name)));
    return { childrenMap: cmap, folderMap: fmap };
  }, [folders]);

  // Auto-expand path to current folder
  useEffect(() => {
    if (currentId && folderMap.has(currentId)) {
      setExpandedIds(prev => {
        const next = new Set(prev);
        let curr: FolderItem | undefined = folderMap.get(currentId);
        while (curr) {
          if (curr.parent_id) next.add(curr.parent_id);
          curr = curr.parent_id ? folderMap.get(curr.parent_id) : undefined;
        }
        return next;
      });
    }
  }, [currentId, folderMap]);

  function toggleExpand(id: string) {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const rootFolders = childrenMap.get(null) || [];

  return (
    <aside className="w-full flex flex-col gap-2 min-w-0">
      {/* Prominent + New Button */}
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium text-xs shadow-lg shadow-cyan-500/20 transition-all">
            <Plus size={15} /> <span className="font-semibold">New</span>
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            className="z-50 min-w-[160px] bg-slate-800 border border-slate-700/80 rounded-xl shadow-2xl p-1 text-xs text-slate-200"
            sideOffset={4}
          >
            {onNewFile && (
              <DropdownMenu.Item
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/5 cursor-pointer outline-none"
                onSelect={onNewFile}
              >
                <FilePlus size={14} className="text-cyan-400" /> New File
              </DropdownMenu.Item>
            )}
            {onNewFolder && (
              <DropdownMenu.Item
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/5 cursor-pointer outline-none"
                onSelect={onNewFolder}
              >
                <FolderPlus size={14} className="text-yellow-400" /> New Folder
              </DropdownMenu.Item>
            )}
            <DropdownMenu.Separator className="h-px bg-slate-700/60 my-1" />
            {onUploadFilesClick && (
              <DropdownMenu.Item
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/5 cursor-pointer outline-none"
                onSelect={onUploadFilesClick}
              >
                <Upload size={14} className="text-purple-400" /> Upload Files
              </DropdownMenu.Item>
            )}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      {/* Navigation section */}
      <div className="flex flex-col gap-0.5 mt-1">
        <div
          ref={setRootRef}
          onClick={() => onSelect(null)}
          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer transition-all select-none min-w-0
            ${currentId === null ? 'bg-cyan-500/20 text-cyan-300 font-medium' : 'hover:bg-white/5 text-slate-300'}
            ${rootIsOver ? 'ring-2 ring-cyan-400 bg-cyan-500/10' : ''}`}
        >
          {currentId === null
            ? <FolderOpen size={15} className="text-cyan-400 shrink-0" />
            : <Folder size={15} className="text-slate-400 shrink-0" />}
          <span className="text-xs font-medium truncate">All Files</span>
        </div>
      </div>

      {/* Directory Tree */}
      <div className="flex flex-col">
        <p className="px-2 pt-2 pb-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Folders</p>
        {rootFolders.length === 0 ? (
          <p className="text-[11px] text-slate-600 px-2 py-1 italic">No folders yet</p>
        ) : (
          rootFolders.map(folder => (
            <TreeFolderNode
              key={folder.id}
              folder={folder}
              level={0}
              childrenMap={childrenMap}
              expandedIds={expandedIds}
              toggleExpand={toggleExpand}
              currentId={currentId}
              onSelect={onSelect}
              onRename={onRename}
              onDelete={onDelete}
              onPinFolderToggle={onPinFolderToggle}
              onDownloadFolderZip={onDownloadFolderZip}
            />
          ))
        )}
      </div>

      {/* Pinned Section */}
      {(pinnedFiles.length > 0 || pinnedFolders.length > 0) && (
        <div className="border-t border-slate-800/80 pt-2 flex flex-col gap-1 min-w-0">
          <p className="px-2 pb-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pinned</p>

          {/* Pinned Folders with parent path prefix */}
          {pinnedFolders.map(f => {
            const fullPath = getFolderFullPath(f.id, folderMap);
            return (
              <div
                key={`pinned-folder-${f.id}`}
                onClick={() => onSelect(f.id)}
                className="group flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer hover:bg-white/5 transition-colors select-none min-w-0"
              >
                <Folder size={13} className="text-yellow-400 shrink-0" />
                <span className="truncate text-xs text-slate-300 group-hover:text-slate-100 transition-colors flex-1 min-w-0" title={fullPath}>
                  {fullPath}
                </span>
                {onPinFolderToggle && (
                  <button
                    onClick={e => { e.stopPropagation(); onPinFolderToggle(f.id); }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-500 hover:text-amber-400 transition-all shrink-0"
                    title="Unpin folder"
                  >
                    <PinOff size={11} />
                  </button>
                )}
              </div>
            );
          })}

          {/* Pinned Files */}
          {pinnedFiles.map(f => (
            <div
              key={`pinned-file-${f.id}`}
              onClick={() => onPinnedFileClick(f)}
              className="group flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer hover:bg-white/5 transition-colors select-none min-w-0"
            >
              <span className="shrink-0">{fileIcon(f.mime_type ?? '')}</span>
              <span className="truncate text-xs text-slate-400 group-hover:text-slate-200 transition-colors flex-1 min-w-0" title={f.original_name}>
                {f.original_name}
              </span>
              <button
                onClick={e => { e.stopPropagation(); onPinToggle(f.id); }}
                className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-500 hover:text-amber-400 transition-all shrink-0"
                title="Unpin file"
              >
                <PinOff size={11} />
              </button>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}

import { useRef, useState, useEffect } from 'react';
import { Upload, FolderOpen, Plus, FilePlus, ArrowUpDown, ArrowUp, ArrowDown, X, Check, FolderUp } from 'lucide-react';
import FileCard, { type FileItem } from './FileCard';
import FolderCard, { type FolderItem } from './FolderCard';

const PRESETS = [
  { label: '.txt', ext: '.txt' },
  { label: '.md', ext: '.md' },
  { label: '.js', ext: '.js' },
  { label: '.ts', ext: '.ts' },
  { label: '.py', ext: '.py' },
  { label: '.json', ext: '.json' },
];

interface Props {
  files: FileItem[];
  folders: FolderItem[];
  view: 'grid' | 'list';
  currentFolderId: string | null;
  selectedId: number | null;
  checkedIds: Set<number>;
  sortBy: 'name' | 'date' | 'size';
  sortDir: 'asc' | 'desc';
  onSortChange: (by: 'name' | 'date' | 'size') => void;
  onUpload: (files: File[], folderId: string | null) => Promise<void>;
  onSelect: (id: number, e?: React.MouseEvent) => void;
  onDoubleClick: (id: number) => void;
  onDelete: (id: number) => void;
  onPin: (id: number) => void;
  onCheck: (id: number, checked: boolean) => void;
  onNewFile: () => void;
  isCreatingFile?: boolean;
  onCreateFile?: (name: string) => Promise<void>;
  onCancelCreateFile?: () => void;
  onFolderOpen: (id: string, name: string) => void;
  onZipDropped?: (file: File) => void;
  onContextMenuFile?: (e: React.MouseEvent, file: FileItem) => void;
  onContextMenuFolder?: (e: React.MouseEvent, folder: FolderItem) => void;
  onContextMenuCanvas?: (e: React.MouseEvent) => void;
  onRenameFile?: (id: number, name: string) => Promise<void>;
  onPinFolder?: (id: string) => void;
  onShareFile?: (file: FileItem) => void;
  onShareFolder?: (folder: FolderItem) => void;
  onDownloadFolderZip?: (id: string, name: string) => void;
  onDeleteFolder?: (id: string) => void;
}

async function readEntry(entry: FileSystemEntry, pathPrefix = ''): Promise<File[]> {
  if (entry.isFile) {
    return new Promise(resolve => {
      (entry as FileSystemFileEntry).file(f => {
        resolve([pathPrefix ? new File([f], `${pathPrefix}/${f.name}`, { type: f.type }) : f]);
      });
    });
  }
  const reader = (entry as FileSystemDirectoryEntry).createReader();
  const entries = await new Promise<FileSystemEntry[]>(resolve => reader.readEntries(resolve));
  const nested = await Promise.all(entries.map(e => readEntry(e, `${pathPrefix}${pathPrefix ? '/' : ''}${entry.name}`)));
  return nested.flat();
}

const SORT_LABELS: Record<string, string> = { name: 'Name', date: 'Date', size: 'Size' };

export default function FileGrid({
  files, folders, view, currentFolderId, selectedId, checkedIds,
  sortBy, sortDir, onSortChange,
  onUpload, onSelect, onDoubleClick, onDelete, onPin, onCheck, onNewFile,
  isCreatingFile = false, onCreateFile, onCancelCreateFile,
  onFolderOpen,
  onZipDropped,
  onContextMenuFile,
  onContextMenuFolder,
  onContextMenuCanvas,
  onRenameFile,
  onPinFolder,
  onShareFile,
  onShareFolder,
  onDownloadFolderZip,
  onDeleteFolder,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const inlineInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  const [draggingOver, setDraggingOver] = useState(false);
  const [ghostMenuOpen, setGhostMenuOpen] = useState(false);
  const [internalCreating, setInternalCreating] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [creatingBusy, setCreatingBusy] = useState(false);

  const showInlineCreate = isCreatingFile || internalCreating;

  useEffect(() => {
    if (showInlineCreate) {
      setNewFileName('untitled.txt');
      setTimeout(() => {
        inlineInputRef.current?.focus();
        inlineInputRef.current?.select();
      }, 50);
    }
  }, [showInlineCreate]);

  async function handleConfirmCreate() {
    const trimmed = newFileName.trim();
    if (!trimmed || creatingBusy) return;
    setCreatingBusy(true);
    try {
      if (onCreateFile) {
        await onCreateFile(trimmed);
      }
      setInternalCreating(false);
      onCancelCreateFile?.();
    } catch {
      // error handled by manager
    } finally {
      setCreatingBusy(false);
    }
  }

  function handleCancelCreate() {
    setInternalCreating(false);
    onCancelCreateFile?.();
  }

  async function processDataTransfer(dt: DataTransfer) {
    const items = Array.from(dt.items || []);
    const entries = items.map(i => i.webkitGetAsEntry?.()).filter(Boolean) as FileSystemEntry[];
    if (entries.length > 0) {
      const allFiles: File[] = [];
      for (const entry of entries) allFiles.push(...await readEntry(entry));
      return allFiles;
    }
    return Array.from(dt.files || []);
  }

  function handleDragEnter(e: React.DragEvent) {
    if (e.dataTransfer.types.includes('Files')) {
      e.preventDefault();
      dragCounterRef.current++;
      setDraggingOver(true);
    }
  }

  function handleDragLeave(e: React.DragEvent) {
    if (e.dataTransfer.types.includes('Files')) {
      e.preventDefault();
      dragCounterRef.current--;
      if (dragCounterRef.current <= 0) {
        dragCounterRef.current = 0;
        setDraggingOver(false);
      }
    }
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setDraggingOver(false);

    const allFiles = await processDataTransfer(e.dataTransfer);
    if (!allFiles.length) return;

    const zipFile = allFiles.find(f => f.name.toLowerCase().endsWith('.zip'));
    if (zipFile && onZipDropped) {
      onZipDropped(zipFile);
      const remaining = allFiles.filter(f => f !== zipFile);
      if (remaining.length > 0) await onUpload(remaining, currentFolderId);
    } else {
      await onUpload(allFiles, currentFolderId);
    }
  }

  async function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files || []);
    if (picked.length) {
      const zipFile = picked.find(f => f.name.toLowerCase().endsWith('.zip'));
      if (zipFile && onZipDropped) {
        onZipDropped(zipFile);
        const remaining = picked.filter(f => f !== zipFile);
        if (remaining.length > 0) await onUpload(remaining, currentFolderId);
      } else {
        await onUpload(picked, currentFolderId);
      }
    }
    e.target.value = '';
  }

  function SortBtn({ by }: { by: 'name' | 'date' | 'size' }) {
    const active = sortBy === by;
    const Icon = active ? (sortDir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
    return (
      <button
        onClick={() => onSortChange(by)}
        className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-colors ${active ? 'text-red-400 bg-red-500/10 font-medium' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
      >
        <Icon size={11} />
        {SORT_LABELS[by]}
      </button>
    );
  }

  // Inline Creation Card for Grid View (zero mouse travel!)
  const InlineCreateCardGrid = (
    <div className="relative rounded-xl border-2 border-red-500/60 bg-[#17181e] p-3 flex flex-col justify-between shadow-2xl min-h-[168px]">
      <div className="flex items-center justify-between text-xs text-red-400 font-medium pb-2 border-b border-white/5">
        <span className="flex items-center gap-1.5"><FilePlus size={14} /> New File</span>
        <button onClick={handleCancelCreate} className="text-slate-500 hover:text-slate-300 p-0.5"><X size={13} /></button>
      </div>
      <div className="my-2">
        <input
          ref={inlineInputRef}
          value={newFileName}
          onChange={e => setNewFileName(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') handleConfirmCreate();
            if (e.key === 'Escape') handleCancelCreate();
          }}
          placeholder="filename.txt"
          className="w-full bg-[#111216] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/30"
        />
        <div className="flex flex-wrap gap-1 mt-2">
          {PRESETS.map(p => (
            <button
              key={p.ext}
              type="button"
              onClick={() => {
                setNewFileName(prev => {
                  const base = prev.replace(/\.[^.]+$/, '') || 'untitled';
                  return base + p.ext;
                });
                inlineInputRef.current?.focus();
              }}
              className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 border border-white/5 transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-white/5">
        <button
          onClick={handleCancelCreate}
          className="px-2.5 py-1 text-[11px] text-slate-400 hover:text-slate-200 rounded hover:bg-white/5"
        >
          Cancel
        </button>
        <button
          onClick={handleConfirmCreate}
          disabled={!newFileName.trim() || creatingBusy}
          className="px-2.5 py-1 text-[11px] bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-medium rounded transition-colors flex items-center gap-1"
        >
          {creatingBusy ? 'Creating…' : 'Create'}
        </button>
      </div>
    </div>
  );

  // Inline Creation Row for List View
  const InlineCreateRowList = (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg border-2 border-red-500/60 bg-[#17181e] text-xs shadow-lg mb-1">
      <FilePlus size={16} className="text-red-400 shrink-0" />
      <input
        ref={inlineInputRef}
        value={newFileName}
        onChange={e => setNewFileName(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') handleConfirmCreate();
          if (e.key === 'Escape') handleCancelCreate();
        }}
        placeholder="filename.txt"
        className="flex-1 bg-[#111216] border border-slate-700 rounded px-2.5 py-1 text-xs text-white font-mono outline-none focus:border-red-500"
      />
      <div className="hidden sm:flex items-center gap-1">
        {PRESETS.slice(0, 4).map(p => (
          <button
            key={p.ext}
            type="button"
            onClick={() => {
              setNewFileName(prev => {
                const base = prev.replace(/\.[^.]+$/, '') || 'untitled';
                return base + p.ext;
              });
              inlineInputRef.current?.focus();
            }}
            className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-slate-400 hover:text-white"
          >
            {p.label}
          </button>
        ))}
      </div>
      <button onClick={handleCancelCreate} className="px-2 py-1 text-slate-400 hover:text-white">Cancel</button>
      <button
        onClick={handleConfirmCreate}
        disabled={!newFileName.trim() || creatingBusy}
        className="px-2.5 py-1 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white rounded font-medium"
      >
        {creatingBusy ? 'Creating…' : 'Create'}
      </button>
    </div>
  );

  // Ghost card when not currently creating
  const GhostCard = view === 'grid' ? (
    <div className="relative">
      <div
        className="relative rounded-xl border border-dashed border-slate-600/50 bg-white/[0.02] hover:bg-white/[0.04] hover:border-slate-500/70 transition-all cursor-pointer select-none flex flex-col items-center justify-center gap-2 group"
        style={{ minHeight: '168px' }}
        onClick={() => setGhostMenuOpen(prev => !prev)}
      >
        <div className="w-10 h-10 rounded-xl bg-white/5 group-hover:bg-white/10 flex items-center justify-center text-slate-500 group-hover:text-slate-300 transition-colors">
          <Plus size={20} />
        </div>
        <span className="text-xs text-slate-500 group-hover:text-slate-300 transition-colors font-medium">Add file</span>
      </div>

      {/* Popover anchored directly to the card (No modal in center of screen!) */}
      {ghostMenuOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setGhostMenuOpen(false)} />
          <div className="absolute top-full left-0 mt-1.5 z-40 bg-[#17181e] border border-white/10 rounded-xl shadow-2xl py-1.5 min-w-[180px] text-xs">
            <button
              onClick={() => {
                setGhostMenuOpen(false);
                setInternalCreating(true);
              }}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-slate-300 hover:bg-white/5 hover:text-white transition-colors text-left"
            >
              <FilePlus size={14} className="text-red-400" /> New file
            </button>
            <button
              onClick={() => {
                setGhostMenuOpen(false);
                inputRef.current?.click();
              }}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-slate-300 hover:bg-white/5 hover:text-white transition-colors text-left"
            >
              <Upload size={14} className="text-purple-400" /> Upload files
            </button>
            <button
              onClick={() => {
                setGhostMenuOpen(false);
                folderInputRef.current?.click();
              }}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-slate-300 hover:bg-white/5 hover:text-white transition-colors text-left"
            >
              <FolderUp size={14} className="text-blue-400" /> Upload folder
            </button>
          </div>
        </>
      )}
    </div>
  ) : (
    <div className="relative mb-1">
      <div
        className="flex items-center gap-3 px-3 py-2 rounded-lg border border-dashed border-slate-700/50 hover:border-slate-600/70 bg-white/[0.01] hover:bg-white/[0.03] transition-colors cursor-pointer text-xs text-slate-500 hover:text-slate-400 group"
        onClick={() => setGhostMenuOpen(prev => !prev)}
      >
        <Plus size={14} className="text-slate-500 group-hover:text-slate-400" />
        <span>Add file to this folder</span>
      </div>

      {ghostMenuOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setGhostMenuOpen(false)} />
          <div className="absolute top-full left-0 mt-1 z-40 bg-[#17181e] border border-white/10 rounded-xl shadow-2xl py-1.5 min-w-[180px] text-xs">
            <button
              onClick={() => {
                setGhostMenuOpen(false);
                setInternalCreating(true);
              }}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-slate-300 hover:bg-white/5 hover:text-white transition-colors text-left"
            >
              <FilePlus size={14} className="text-red-400" /> New file
            </button>
            <button
              onClick={() => {
                setGhostMenuOpen(false);
                inputRef.current?.click();
              }}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-slate-300 hover:bg-white/5 hover:text-white transition-colors text-left"
            >
              <Upload size={14} className="text-purple-400" /> Upload files
            </button>
            <button
              onClick={() => {
                setGhostMenuOpen(false);
                folderInputRef.current?.click();
              }}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-slate-300 hover:bg-white/5 hover:text-white transition-colors text-left"
            >
              <FolderUp size={14} className="text-blue-400" /> Upload folder
            </button>
          </div>
        </>
      )}
    </div>
  );

  const listHeader = view === 'list' && (files.length > 0 || folders.length > 0) ? (
    <div className="flex items-center gap-3 px-3 py-2 text-xs text-slate-500 font-medium border-b border-slate-700/40 mb-1 select-none">
      <div className="w-8 shrink-0" />
      <span className="flex-1">Name</span>
      <span className="w-16 text-right shrink-0">Size</span>
      <span className="w-24 text-right shrink-0 hidden sm:block">Date</span>
      <div className="w-16 shrink-0" />
    </div>
  ) : null;

  const isEmpty = files.length === 0 && folders.length === 0;

  return (
    <>
      <input ref={inputRef} type="file" multiple className="hidden" onChange={handleInputChange} />
      <input
        ref={folderInputRef}
        type="file"
        multiple
        className="hidden"
        // @ts-ignore
        webkitdirectory=""
        directory=""
        onChange={handleInputChange}
      />

      {/* Sort controls */}
      <div className="flex items-center gap-1 mb-3">
        <span className="text-xs text-slate-600 mr-1">Sort:</span>
        <SortBtn by="name" />
        <SortBtn by="date" />
        <SortBtn by="size" />
      </div>

      <div
        className="relative min-h-[350px]"
        onDragEnter={handleDragEnter}
        onDragOver={e => { e.preventDefault(); }}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onContextMenu={e => {
          if (onContextMenuCanvas) {
            e.preventDefault();
            onContextMenuCanvas(e);
          }
        }}
      >
        {/* Drop zone overlay - strictly inside the files area, hidden unless hovered */}
        {draggingOver && (
          <div className="absolute inset-0 z-30 rounded-xl border-2 border-dashed border-red-500/80 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center pointer-events-none transition-all">
            <div className="flex flex-col items-center gap-2 text-red-400">
              <Upload size={38} className="animate-bounce" />
              <p className="text-sm font-semibold text-white">Drop files to upload to this folder</p>
              <p className="text-xs text-slate-400">Files will be uploaded automatically</p>
            </div>
          </div>
        )}

        {listHeader}

        {view === 'list' && showInlineCreate && InlineCreateRowList}

        <div className={
          view === 'grid'
            ? 'grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3'
            : 'flex flex-col gap-0.5'
        }>
          {showInlineCreate && view === 'grid' ? InlineCreateCardGrid : GhostCard}

          {folders.map(f => (
            <FolderCard
              key={f.id}
              folder={f}
              view={view}
              onOpen={onFolderOpen}
              onDropFiles={onUpload}
              onContextMenu={onContextMenuFolder}
              onPinToggle={onPinFolder}
              onShare={onShareFolder}
              onDownloadZip={onDownloadFolderZip}
              onDelete={onDeleteFolder}
            />
          ))}

          {files.map(f => (
            <FileCard
              key={f.id}
              file={f}
              view={view}
              selected={selectedId === f.id}
              checked={checkedIds.has(f.id)}
              onSelect={onSelect}
              onDoubleClick={onDoubleClick}
              onDelete={onDelete}
              onPin={onPin}
              onShare={onShareFile}
              onCheck={onCheck}
              onContextMenu={onContextMenuFile}
              onRename={onRenameFile}
            />
          ))}

          {isEmpty && !showInlineCreate && (
            <div className={view === 'grid' ? 'col-span-full flex flex-col items-center justify-center py-12 text-slate-600' : 'flex flex-col items-center py-12 text-slate-600'}>
              <p className="text-sm">No files here yet</p>
              <p className="text-xs mt-1">Drag &amp; drop files or click the + card</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

import { useRef, useState } from 'react';
import { Upload, FolderOpen, Plus, FilePlus, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import FileCard, { type FileItem } from './FileCard';
import FolderCard, { type FolderItem } from './FolderCard';

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
  onSelect: (id: number) => void;
  onDoubleClick: (id: number) => void;
  onDelete: (id: number) => void;
  onPin: (id: number) => void;
  onCheck: (id: number, checked: boolean) => void;
  onNewFile: () => void;
  onFolderOpen: (id: string, name: string) => void;
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
  onUpload, onSelect, onDoubleClick, onDelete, onPin, onCheck, onNewFile, onFolderOpen,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [draggingOver, setDraggingOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [ghostMenuOpen, setGhostMenuOpen] = useState(false);

  async function processDataTransfer(dt: DataTransfer) {
    const items = Array.from(dt.items);
    const entries = items.map(i => i.webkitGetAsEntry?.()).filter(Boolean) as FileSystemEntry[];
    if (entries.length > 0) {
      const allFiles: File[] = [];
      for (const entry of entries) allFiles.push(...await readEntry(entry));
      return allFiles;
    }
    return Array.from(dt.files);
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDraggingOver(false);
    const allFiles = await processDataTransfer(e.dataTransfer);
    if (allFiles.length) { setUploading(true); await onUpload(allFiles, currentFolderId); setUploading(false); }
  }

  async function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files || []);
    if (picked.length) { setUploading(true); await onUpload(picked, currentFolderId); setUploading(false); }
    e.target.value = '';
  }

  function SortBtn({ by }: { by: 'name' | 'date' | 'size' }) {
    const active = sortBy === by;
    const Icon = active ? (sortDir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
    return (
      <button
        onClick={() => onSortChange(by)}
        className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-colors ${active ? 'text-cyan-300 bg-cyan-500/10' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
      >
        <Icon size={11} />
        {SORT_LABELS[by]}
      </button>
    );
  }

  const GhostCard = view === 'grid' ? (
    <div
      className="relative rounded-xl border border-dashed border-slate-600/50 bg-white/[0.02] hover:bg-white/[0.04] hover:border-slate-500/70 transition-all cursor-pointer select-none flex flex-col items-center justify-center gap-2 group"
      style={{ minHeight: '168px' }}
      onClick={() => setGhostMenuOpen(true)}
      onDragOver={e => { e.preventDefault(); setDraggingOver(true); }}
      onDrop={handleDrop}
    >
      <div className="w-9 h-9 rounded-full bg-white/5 border border-dashed border-slate-600 flex items-center justify-center group-hover:border-slate-400 transition-colors">
        <Plus size={16} className="text-slate-500 group-hover:text-slate-300 transition-colors" />
      </div>
      <p className="text-xs text-slate-600 group-hover:text-slate-400 transition-colors">Add files</p>
    </div>
  ) : (
    <div
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-dashed border-slate-700/50 hover:border-slate-600 cursor-pointer transition-all group"
      onClick={() => setGhostMenuOpen(true)}
    >
      <div className="w-8 h-8 rounded-md border border-dashed border-slate-600 flex items-center justify-center group-hover:border-slate-400 transition-colors">
        <Plus size={14} className="text-slate-500 group-hover:text-slate-300" />
      </div>
      <span className="text-sm text-slate-600 group-hover:text-slate-400 transition-colors">Upload or create files</span>
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
      <input ref={folderInputRef} type="file" multiple className="hidden"
        {...({ webkitdirectory: '' } as Record<string, string>)} onChange={handleInputChange} />

      {/* Ghost card centered overlay menu */}
      {ghostMenuOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setGhostMenuOpen(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-slate-800 border border-slate-700/60 rounded-2xl shadow-2xl py-2 min-w-[200px]">
            <p className="px-4 pt-1 pb-2 text-xs text-slate-500 font-medium uppercase tracking-wider">Add to folder</p>
            <button
              onClick={() => { setGhostMenuOpen(false); onNewFile(); }}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
            >
              <FilePlus size={15} className="text-cyan-400" /> New file
            </button>
            <button
              onClick={() => { setGhostMenuOpen(false); inputRef.current?.click(); }}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
            >
              <Upload size={15} className="text-purple-400" /> Upload files
            </button>
            <button
              onClick={() => { setGhostMenuOpen(false); folderInputRef.current?.click(); }}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
            >
              <FolderOpen size={15} className="text-yellow-400" /> Upload folder
            </button>
          </div>
        </>
      )}

      {uploading && (
        <div className="flex items-center gap-2 text-xs text-cyan-400 mb-3">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" /> Uploading…
        </div>
      )}

      {/* Sort controls */}
      <div className="flex items-center gap-1 mb-3">
        <span className="text-xs text-slate-600 mr-1">Sort:</span>
        <SortBtn by="name" />
        <SortBtn by="date" />
        <SortBtn by="size" />
      </div>

      <div
        className="relative"
        onDragOver={e => { e.preventDefault(); setDraggingOver(true); }}
        onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDraggingOver(false); }}
        onDrop={handleDrop}
        onClick={() => { if (ghostMenuOpen) setGhostMenuOpen(false); }}
      >
        {/* Drop zone overlay */}
        {draggingOver && (
          <div className="absolute inset-0 z-30 rounded-xl border-2 border-cyan-400/60 bg-cyan-500/5 flex items-center justify-center pointer-events-none">
            <div className="flex flex-col items-center gap-2 text-cyan-400">
              <Upload size={36} className="animate-bounce" />
              <p className="text-sm font-medium">Drop to upload</p>
            </div>
          </div>
        )}

        {listHeader}
        <div className={
          view === 'grid'
            ? 'grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3'
            : 'flex flex-col gap-0.5'
        }>
          {GhostCard}

          {folders.map(f => (
            <FolderCard
              key={f.id}
              folder={f}
              view={view}
              onOpen={onFolderOpen}
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
              onCheck={onCheck}
            />
          ))}

          {isEmpty && (
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

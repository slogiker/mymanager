import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core';
import { LayoutGrid, List, FolderPlus, FilePlus, Eye, EyeOff, ArrowLeft, Search, X, ChevronRight, Download, Trash2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import FolderSidebar from '../components/files/FolderSidebar';
import FileGrid from '../components/files/FileGrid';
import FileCard, { type FileItem } from '../components/files/FileCard';
import FolderCard, { type FolderItem } from '../components/files/FolderCard';
import PreviewPanel from '../components/files/PreviewPanel';
import FullscreenViewer from '../components/files/FullscreenViewer';
import CreateFolderModal from '../components/files/CreateFolderModal';
import NewFileModal from '../components/files/NewFileModal';
import Navbar from '../components/layout/Navbar';
import { api } from '../lib/api';

interface Folder { id: string; name: string; parent_id: string | null; created_at: string; }
interface BreadcrumbEntry { id: string; name: string; }

const TYPE_FILTERS = [
  { label: 'All', value: null },
  { label: 'Images', value: 'image' },
  { label: 'Video', value: 'video' },
  { label: 'Audio', value: 'audio' },
  { label: 'Docs', value: 'doc' },
  { label: 'Code', value: 'code' },
  { label: 'Archives', value: 'archive' },
];

function matchesType(f: FileItem, type: string): boolean {
  const m = f.mime_type ?? '';
  switch (type) {
    case 'image': return m.startsWith('image/');
    case 'video': return m.startsWith('video/');
    case 'audio': return m.startsWith('audio/');
    case 'archive': return ['zip','tar','gzip','rar','7z'].some(t => m.includes(t));
    case 'code': return ['javascript','typescript','json','html','css','xml','python','x-sh'].some(t => m.includes(t));
    case 'doc': return m.startsWith('text/') || m.includes('pdf') || m.includes('word') || m.includes('sheet');
    default: return true;
  }
}

function applySearch(files: FileItem[], query: string, typeFilter: string | null): FileItem[] {
  let result = typeFilter ? files.filter(f => matchesType(f, typeFilter)) : files;
  if (!query.trim()) return result;
  try {
    const regexMatch = query.match(/^\/(.+)\/([gimsuy]*)$/);
    const re = regexMatch ? new RegExp(regexMatch[1], regexMatch[2]) : null;
    return result.filter(f => re ? re.test(f.original_name) : f.original_name.toLowerCase().includes(query.toLowerCase()));
  } catch {
    return result.filter(f => f.original_name.toLowerCase().includes(query.toLowerCase()));
  }
}

function sortFiles(files: FileItem[], by: 'name' | 'date' | 'size', dir: 'asc' | 'desc'): FileItem[] {
  return [...files].sort((a, b) => {
    let cmp = 0;
    if (by === 'name') cmp = a.original_name.localeCompare(b.original_name);
    else if (by === 'date') cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    else cmp = a.size - b.size;
    return dir === 'asc' ? cmp : -cmp;
  });
}

function sortFolders(folders: FolderItem[], by: 'name' | 'date' | 'size', dir: 'asc' | 'desc'): FolderItem[] {
  return [...folders].sort((a, b) => {
    if (by === 'size') return 0; // folders don't have size
    const cmp = by === 'name'
      ? a.name.localeCompare(b.name)
      : new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    return dir === 'asc' ? cmp : -cmp;
  });
}

export default function Files() {
  const [sidebarFolders, setSidebarFolders] = useState<Folder[]>([]);
  const [subfolders, setSubfolders] = useState<FolderItem[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [allFiles, setAllFiles] = useState<FileItem[]>([]);
  const [pinnedFiles, setPinnedFiles] = useState<FileItem[]>([]);
  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set());
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [showPreview, setShowPreview] = useState(true);
  const [previewWidth, setPreviewWidth] = useState(300);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [fullscreenId, setFullscreenId] = useState<number | null>(null);
  const [activeFileId, setActiveFileId] = useState<number | null>(null);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [creatingFile, setCreatingFile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const bodyRef = useRef<HTMLDivElement>(null);

  const navigate = useNavigate();
  const location = useLocation();
  // folderPath lives in Router location state so browser back/forward works
  const folderPath: BreadcrumbEntry[] = location.state?.folderPath ?? [];
  const currentFolderId = folderPath.length > 0 ? folderPath[folderPath.length - 1].id : null;
  const isSearching = searchQuery.trim().length > 0 || typeFilter !== null;

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const loadSidebarFolders = useCallback(async () => {
    try {
      const data = await api.get<Folder[]>('/folders?parent_id=null');
      setSidebarFolders(data.sort((a, b) => a.name.localeCompare(b.name)));
    } catch { setSidebarFolders([]); }
  }, []);

  const loadSubfolders = useCallback(async (parentId: string | null) => {
    try {
      const url = parentId ? `/folders?parent_id=${parentId}` : '/folders?parent_id=null';
      const data = await api.get<FolderItem[]>(url);
      setSubfolders(data);
    } catch { setSubfolders([]); }
  }, []);

  const loadFiles = useCallback(async (folderId: string | null) => {
    setLoading(true);
    try {
      const data = await api.get<FileItem[]>(`/files?folder_id=${folderId ?? 'null'}`);
      setFiles(data);
    } catch { setFiles([]); }
    finally { setLoading(false); }
  }, []);

  const loadAllFiles = useCallback(async () => {
    try { setAllFiles(await api.get<FileItem[]>('/files')); }
    catch { setAllFiles([]); }
  }, []);

  const loadPinnedFiles = useCallback(async () => {
    try { setPinnedFiles(await api.get<FileItem[]>('/files?pinned=1')); }
    catch { setPinnedFiles([]); }
  }, []);

  useEffect(() => { loadSidebarFolders(); loadPinnedFiles(); }, [loadSidebarFolders, loadPinnedFiles]);
  useEffect(() => {
    setSelectedId(null);
    loadFiles(currentFolderId);
    loadSubfolders(currentFolderId);
  }, [currentFolderId, loadFiles, loadSubfolders]);
  useEffect(() => { if (isSearching) loadAllFiles(); }, [isSearching, loadAllFiles]);

  function handleSortChange(by: 'name' | 'date' | 'size') {
    if (sortBy === by) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(by);
      setSortDir('asc');
    }
  }

  const displayFiles = useMemo(() => {
    const base = isSearching ? allFiles : files;
    const searched = applySearch(base, searchQuery, typeFilter);
    return sortFiles(searched, sortBy, sortDir);
  }, [isSearching, allFiles, files, searchQuery, typeFilter, sortBy, sortDir]);

  const displaySubfolders = useMemo(() => {
    if (isSearching) return [];
    return sortFolders(subfolders, sortBy, sortDir);
  }, [subfolders, isSearching, sortBy, sortDir]);

  function startResize(e: React.MouseEvent) {
    e.preventDefault();
    const startX = e.clientX;
    const startW = previewWidth;
    function onMove(ev: MouseEvent) {
      setPreviewWidth(Math.max(200, Math.min(680, startW + (startX - ev.clientX))));
    }
    function onUp() {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  function navigateToFolder(id: string, name: string) {
    navigate('/files', { state: { folderPath: [...folderPath, { id, name }] } });
    setSearchQuery('');
    setTypeFilter(null);
  }

  function navigateToBreadcrumb(index: number) {
    navigate('/files', { state: { folderPath: folderPath.slice(0, index + 1) } });
    setSearchQuery('');
    setTypeFilter(null);
  }

  function navigateToRoot() {
    navigate('/files', { state: { folderPath: [] } });
    setSearchQuery('');
    setTypeFilter(null);
  }

  async function handleUpload(picked: File[], folderId: string | null) {
    for (const file of picked) {
      const form = new FormData();
      form.append('file', file);
      if (folderId) form.append('folder_id', folderId);
      try {
        const created = await api.post<FileItem>('/files', form);
        setFiles(prev => [created, ...prev]);
        if (isSearching) setAllFiles(prev => [created, ...prev]);
      } catch {}
    }
  }

  async function handleCreateFile(name: string) {
    const created = await api.post<FileItem>('/files/create', { name, folder_id: currentFolderId });
    setFiles(prev => [created, ...prev]);
    if (isSearching) setAllFiles(prev => [created, ...prev]);
    setSelectedId(created.id);
    setShowPreview(true);
  }

  async function handleCreateFolder(name: string) {
    try {
      const f = await api.post<Folder>('/folders', { name, parent_id: currentFolderId });
      if (currentFolderId === null) {
        setSidebarFolders(prev => [...prev, f].sort((a, b) => a.name.localeCompare(b.name)));
      }
      setSubfolders(prev => [...prev, f].sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? 'Failed to create folder';
      alert(msg);
    }
  }

  async function handleRenameFolder(id: string, name: string) {
    const updated = await api.patch<Folder>(`/folders/${id}`, { name });
    const updateList = (prev: Folder[]) =>
      prev.map(f => f.id === id ? updated : f).sort((a, b) => a.name.localeCompare(b.name));
    setSidebarFolders(updateList);
    setSubfolders(prev => prev.map(f => f.id === id ? updated : f).sort((a, b) => a.name.localeCompare(b.name)));
    // Update the name in breadcrumb history without pushing a new entry
    const newPath = folderPath.map(p => p.id === id ? { ...p, name } : p);
    navigate('/files', { state: { folderPath: newPath }, replace: true });
  }

  async function handleDeleteFolder(id: string) {
    try {
      await api.delete(`/folders/${id}`);
      setSidebarFolders(prev => prev.filter(f => f.id !== id));
      setSubfolders(prev => prev.filter(f => f.id !== id));
      if (folderPath.some(p => p.id === id)) {
        navigate('/files', { state: { folderPath: [] }, replace: true });
      }
    } catch {}
  }

  async function handleDeleteFile(id: number) {
    try {
      await api.delete(`/files/${id}`);
      setFiles(prev => prev.filter(f => f.id !== id));
      setAllFiles(prev => prev.filter(f => f.id !== id));
      setPinnedFiles(prev => prev.filter(f => f.id !== id));
      setCheckedIds(prev => { const s = new Set(prev); s.delete(id); return s; });
      if (selectedId === id) setSelectedId(null);
      if (fullscreenId === id) setFullscreenId(null);
    } catch {}
  }

  async function handlePinToggle(id: number) {
    try {
      const updated = await api.patch<FileItem>(`/files/${id}/pin`, {});
      const applyUpdate = (prev: FileItem[]) => prev.map(f => f.id === id ? updated : f);
      setFiles(applyUpdate);
      setAllFiles(applyUpdate);
      if (updated.pinned) {
        setPinnedFiles(prev => [...prev.filter(f => f.id !== id), updated].sort((a, b) => a.original_name.localeCompare(b.original_name)));
      } else {
        setPinnedFiles(prev => prev.filter(f => f.id !== id));
      }
    } catch {}
  }

  function handleCheck(id: number, checked: boolean) {
    setCheckedIds(prev => {
      const s = new Set(prev);
      if (checked) s.add(id); else s.delete(id);
      return s;
    });
  }

  async function handleBulkDelete() {
    const ids = Array.from(checkedIds);
    if (!ids.length) return;
    if (!confirm(`Delete ${ids.length} file${ids.length > 1 ? 's' : ''}?`)) return;
    try {
      await api.delete('/files', { ids });
      setFiles(prev => prev.filter(f => !checkedIds.has(f.id)));
      setAllFiles(prev => prev.filter(f => !checkedIds.has(f.id)));
      setPinnedFiles(prev => prev.filter(f => !checkedIds.has(f.id)));
      if (selectedId && checkedIds.has(selectedId)) setSelectedId(null);
      setCheckedIds(new Set());
    } catch {}
  }

  function handleBulkDownload() {
    const toDownload = displayFiles.filter(f => checkedIds.has(f.id));
    toDownload.forEach((file, i) => {
      setTimeout(() => {
        const a = document.createElement('a');
        a.href = file.file_path;
        a.download = file.original_name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }, i * 150);
    });
  }

  function handleSelectFile(id: number) {
    setSelectedId(prev => prev === id ? null : id);
    if (!showPreview) setShowPreview(true);
  }

  function handlePreviewSaved(id: number, size: number) {
    const update = (prev: FileItem[]) => prev.map(f => f.id === id ? { ...f, size } : f);
    setFiles(update);
    setAllFiles(update);
  }

  function handleDragStart(event: DragStartEvent) {
    const id = (event.active.data.current as { fileId: number })?.fileId;
    setActiveFileId(id ?? null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveFileId(null);
    const { active, over } = event;
    if (!over) return;
    const fileId = (active.data.current as { fileId: number })?.fileId;
    if (!fileId) return;
    // FolderCard droppables are prefixed with 'card-' to avoid collision with sidebar droppables
    const overId = String(over.id);
    const targetFolderId = overId === '__root__' ? null
      : overId.startsWith('card-') ? overId.slice(5)
      : overId;

    // If the dragged file is part of a multi-selection, move all selected files
    const idsToMove = checkedIds.has(fileId) ? Array.from(checkedIds) : [fileId];

    try {
      await Promise.all(idsToMove.map(id => api.patch(`/files/${id}/move`, { folder_id: targetFolderId })));
      const movedSet = new Set(idsToMove);
      setFiles(prev => prev.filter(f => !movedSet.has(f.id)));
      setAllFiles(prev => prev.filter(f => !movedSet.has(f.id)));
      if (selectedId && movedSet.has(selectedId)) setSelectedId(null);
      if (checkedIds.has(fileId)) setCheckedIds(new Set());
    } catch {}
  }

  const selectedFile = displayFiles.find(f => f.id === selectedId) ?? null;
  const activeFile = files.find(f => f.id === activeFileId) ?? null;
  const fullscreenFile = fullscreenId !== null
    ? (displayFiles.find(f => f.id === fullscreenId) ?? files.find(f => f.id === fullscreenId) ?? null)
    : null;

  return (
    <div className="h-screen flex flex-col bg-[#020617] text-white overflow-hidden">
      <Navbar />
      <div className="flex flex-col flex-1 min-h-0 pt-20">
        {/* Topbar */}
        <header className="shrink-0 flex items-center justify-between px-5 py-2.5 border-b border-slate-800/70">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate(-1)}
            className="text-slate-500 hover:text-slate-300 transition-colors p-1 shrink-0"
          >
            <ArrowLeft size={15} />
          </button>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold gradient-text leading-tight">Files</h1>
            {/* Breadcrumb */}
            <div className="flex items-center gap-1 text-xs text-slate-500 leading-tight flex-wrap">
              <button
                onClick={navigateToRoot}
                className={`hover:text-slate-300 transition-colors ${folderPath.length === 0 ? 'text-slate-300' : ''}`}
              >
                All Files
              </button>
              {folderPath.map((seg, i) => (
                <span key={seg.id} className="flex items-center gap-1">
                  <ChevronRight size={11} className="text-slate-700" />
                  <button
                    onClick={() => navigateToBreadcrumb(i)}
                    className={`hover:text-slate-300 transition-colors truncate max-w-[120px] ${i === folderPath.length - 1 ? 'text-slate-300' : ''}`}
                    title={seg.name}
                  >
                    {seg.name}
                  </button>
                </span>
              ))}
              {isSearching && (
                <span className="flex items-center gap-1">
                  <ChevronRight size={11} className="text-slate-700" />
                  <span className="text-slate-400 italic">Search results</span>
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => setCreatingFile(true)} className="btn btn-outline flex items-center gap-1.5 text-xs py-1.5 px-3">
            <FilePlus size={13} /> New File
          </button>
          <button onClick={() => setCreatingFolder(true)} className="btn btn-outline flex items-center gap-1.5 text-xs py-1.5 px-3">
            <FolderPlus size={13} /> New Folder
          </button>
          <button
            onClick={() => setShowPreview(v => !v)}
            className={`btn btn-outline p-2 ${showPreview ? 'text-cyan-400 border-cyan-500/40 bg-cyan-500/5' : ''}`}
          >
            {showPreview ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
          <button onClick={() => setView(v => v === 'grid' ? 'list' : 'grid')} className="btn btn-outline p-2">
            {view === 'grid' ? <List size={14} /> : <LayoutGrid size={14} />}
          </button>
        </div>
      </header>

      {/* Search + type filter */}
      <div className="shrink-0 flex items-center gap-3 px-5 py-2.5 border-b border-slate-800/40">
        <div className="relative flex-1 max-w-md">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search files… or /regex/flags"
            className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg pl-8 pr-8 py-1.5 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-colors"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
              <X size={13} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1">
          {TYPE_FILTERS.map(tf => (
            <button
              key={String(tf.value)}
              onClick={() => setTypeFilter(prev => prev === tf.value ? null : tf.value)}
              className={`text-xs px-2.5 py-1 rounded-md transition-colors ${typeFilter === tf.value ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div ref={bodyRef} className="flex flex-1 min-h-0 overflow-hidden">

          {/* Sidebar */}
          <div className="w-48 shrink-0 border-r border-slate-800/60 overflow-y-auto py-3 px-2">
            <FolderSidebar
              folders={sidebarFolders}
              currentId={folderPath[0]?.id ?? null}
              pinnedFiles={pinnedFiles}
              onSelect={id => {
                if (id === null) {
                  navigateToRoot();
                } else {
                  const f = sidebarFolders.find(f => f.id === id);
                  navigate('/files', { state: { folderPath: f ? [{ id: f.id, name: f.name }] : [{ id, name: 'Folder' }] } });
                  setSearchQuery('');
                  setTypeFilter(null);
                }
              }}
              onRename={handleRenameFolder}
              onDelete={handleDeleteFolder}
              onPinnedFileClick={file => { setSelectedId(file.id); setShowPreview(true); }}
              onPinToggle={handlePinToggle}
            />
          </div>

          {/* Files area */}
          <div className="flex-1 min-w-0 overflow-y-auto p-5">
            {loading && !isSearching ? (
              <div className="flex items-center justify-center h-48 text-slate-600 text-sm">Loading…</div>
            ) : (
              <FileGrid
                files={displayFiles}
                folders={displaySubfolders}
                view={view}
                currentFolderId={currentFolderId}
                selectedId={selectedId}
                checkedIds={checkedIds}
                sortBy={sortBy}
                sortDir={sortDir}
                onSortChange={handleSortChange}
                onUpload={handleUpload}
                onSelect={handleSelectFile}
                onDoubleClick={id => setFullscreenId(id)}
                onDelete={handleDeleteFile}
                onPin={handlePinToggle}
                onCheck={handleCheck}
                onNewFile={() => setCreatingFile(true)}
                onFolderOpen={navigateToFolder}
              />
            )}
          </div>

          {/* Resize handle + Preview */}
          {showPreview && (
            <>
              <div
                className="w-1 shrink-0 cursor-col-resize bg-slate-800/60 hover:bg-cyan-500/40 transition-colors relative group"
                onMouseDown={startResize}
              >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-8 flex flex-col items-center justify-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="w-0.5 h-4 bg-cyan-400/60 rounded-full" />
                </div>
              </div>
              <div className="shrink-0 border-l border-slate-800/60 overflow-y-auto" style={{ width: previewWidth }}>
                <PreviewPanel
                  file={selectedFile}
                  onClose={() => { setSelectedId(null); setShowPreview(false); }}
                  onSaved={handlePreviewSaved}
                />
              </div>
            </>
          )}
        </div>

        <DragOverlay>
          {activeFile && (
            <div className="opacity-90 rotate-2 scale-105 pointer-events-none w-36 relative">
              <FileCard file={activeFile} view="grid" selected={false} checked={false} onSelect={() => {}} onDoubleClick={() => {}} onDelete={() => {}} onPin={() => {}} onCheck={() => {}} />
              {checkedIds.has(activeFile.id) && checkedIds.size > 1 && (
                <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-cyan-500 border-2 border-slate-900 flex items-center justify-center text-[10px] font-bold text-white z-10">
                  {checkedIds.size}
                </div>
              )}
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Fullscreen viewer */}
      {fullscreenFile && (
        <FullscreenViewer
          file={fullscreenFile}
          onClose={() => setFullscreenId(null)}
          onSaved={handlePreviewSaved}
        />
      )}

      {/* Multi-select action bar */}
      {checkedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 bg-slate-800 border border-slate-600/60 rounded-2xl shadow-2xl shadow-black/40 backdrop-blur-sm">
          <span className="text-sm text-slate-300 font-medium">{checkedIds.size} selected</span>
          <div className="w-px h-4 bg-slate-600" />
          <button
            onClick={handleBulkDownload}
            className="flex items-center gap-2 text-sm text-slate-300 hover:text-cyan-300 transition-colors px-2 py-1 rounded-lg hover:bg-cyan-500/10"
          >
            <Download size={14} /> Download
          </button>
          <button
            onClick={handleBulkDelete}
            className="flex items-center gap-2 text-sm text-slate-300 hover:text-red-400 transition-colors px-2 py-1 rounded-lg hover:bg-red-500/10"
          >
            <Trash2 size={14} /> Delete
          </button>
          <div className="w-px h-4 bg-slate-600" />
          <button
            onClick={() => setCheckedIds(new Set())}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            Clear
          </button>
        </div>
      )}

      <CreateFolderModal open={creatingFolder} onClose={() => setCreatingFolder(false)} onCreate={handleCreateFolder} />
      <NewFileModal open={creatingFile} onClose={() => setCreatingFile(false)} onCreate={handleCreateFile} />
      </div>
    </div>
  );
}

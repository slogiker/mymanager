import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent, useDroppable
} from '@dnd-kit/core';
import {
  LayoutGrid, List, FolderPlus, FilePlus, Eye, EyeOff, ArrowLeft,
  Search, X, ChevronRight, Download, Trash2, Upload, Copy, Check, Terminal
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import FolderSidebar, { type FolderItem } from '../components/files/FolderSidebar';
import FileGrid from '../components/files/FileGrid';
import FileCard, { type FileItem } from '../components/files/FileCard';
import PreviewPanel from '../components/files/PreviewPanel';
import FullscreenViewer from '../components/files/FullscreenViewer';
import CreateFolderModal from '../components/files/CreateFolderModal';
import NewFileModal from '../components/files/NewFileModal';
import ContextMenu, { type ContextMenuState } from '../components/files/ContextMenu';
import ZipActionModal from '../components/files/ZipActionModal';
import ShareModal from '../components/files/ShareModal';
import UploadDrawer from '../components/files/UploadDrawer';
import Navbar from '../components/layout/Navbar';
import { useUpload } from '../context/UploadContext';
import { api } from '../lib/api';

interface BreadcrumbEntry { id: string; name: string; }

const TYPE_FILTERS = [
  { label: 'All', value: null },
  { label: 'Images', value: 'image' },
  { label: 'Video', value: 'video' },
  { label: 'Audio', value: 'audio' },
  { label: 'Docs', value: 'doc' },
  { label: '3D/CAD', value: 'cad' },
  { label: 'Code', value: 'code' },
  { label: 'Archives', value: 'archive' },
];

function matchesType(f: FileItem, type: string): boolean {
  const m = f.mime_type ?? '';
  const ext = (f.original_name.split('.').pop() || '').toLowerCase();
  switch (type) {
    case 'image': return m.startsWith('image/');
    case 'video': return m.startsWith('video/') || ['mp4','mov','webm','mkv','avi','m4v'].includes(ext);
    case 'audio': return m.startsWith('audio/') || ['mp3','wav','ogg','m4a','flac'].includes(ext);
    case 'archive': return ['zip','tar','gzip','rar','7z','gz'].some(t => m.includes(t) || ext === t);
    case 'cad': return ['stl','obj','gltf','glb','step','stp','f3d','ipt','iam','ply'].includes(ext);
    case 'code': return ['javascript','typescript','json','html','css','xml','python','x-sh'].some(t => m.includes(t)) || ['js','ts','py','sh','c','cpp','rs','go'].includes(ext);
    case 'doc': return m.startsWith('text/') || m.includes('pdf') || m.includes('word') || m.includes('sheet') || ['doc','docx','xls','xlsx','ods','odt','csv'].includes(ext);
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
    if (by === 'size') return 0;
    const cmp = by === 'name'
      ? a.name.localeCompare(b.name)
      : new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    return dir === 'asc' ? cmp : -cmp;
  });
}

// Droppable breadcrumb segment component (Issue #14)
function DroppableBreadcrumbSegment({
  id,
  name,
  isLast,
  onClick,
}: {
  id: string | null;
  name: string;
  isLast: boolean;
  onClick: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: id ? `breadcrumb-${id}` : '__root__' });
  return (
    <button
      ref={setNodeRef}
      onClick={onClick}
      className={`hover:text-cyan-300 transition-colors truncate max-w-[140px] px-1 py-0.5 rounded ${
        isLast ? 'text-slate-200 font-semibold' : 'text-slate-400'
      } ${isOver ? 'bg-cyan-500/25 text-cyan-300 ring-2 ring-cyan-400' : ''}`}
      title={name}
    >
      {name}
    </button>
  );
}

export default function Files() {
  const { uploadFiles, extractZip } = useUpload();
  const [allFolders, setAllFolders] = useState<FolderItem[]>([]);
  const [subfolders, setSubfolders] = useState<FolderItem[]>([]);
  const [pinnedFolders, setPinnedFolders] = useState<FolderItem[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [allFiles, setAllFiles] = useState<FileItem[]>([]);
  const [pinnedFiles, setPinnedFiles] = useState<FileItem[]>([]);
  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<number | null>(null);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [showPreview, setShowPreview] = useState(true);
  const [previewWidth, setPreviewWidth] = useState(320);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [fullscreenId, setFullscreenId] = useState<number | null>(null);
  const [activeFileId, setActiveFileId] = useState<number | null>(null);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [creatingFile, setCreatingFile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [searchScope, setSearchScope] = useState<'folder' | 'global'>('folder');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [windowDragOver, setWindowDragOver] = useState(false);
  const [copiedPath, setCopiedPath] = useState(false);
  const [zipModalFile, setZipModalFile] = useState<File | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [shareModal, setShareModal] = useState<{ open: boolean; type: 'file' | 'folder'; id: string | number; name: string }>({
    open: false,
    type: 'file',
    id: '',
    name: '',
  });

  const bodyRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const folderPath: BreadcrumbEntry[] = location.state?.folderPath ?? [];
  const currentFolderId = folderPath.length > 0 ? folderPath[folderPath.length - 1].id : null;
  const isSearchingGlobal = searchScope === 'global' && searchQuery.trim().length > 0;

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const loadAllFolders = useCallback(async () => {
    try {
      const data = await api.get<FolderItem[]>('/folders/tree');
      setAllFolders(data);
    } catch {
      try {
        const flat = await api.get<FolderItem[]>('/folders');
        setAllFolders(flat);
      } catch {
        setAllFolders([]);
      }
    }
  }, []);

  const loadPinnedFolders = useCallback(async () => {
    try {
      const data = await api.get<FolderItem[]>('/folders/pinned');
      setPinnedFolders(data);
    } catch {
      setPinnedFolders([]);
    }
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

  useEffect(() => {
    loadAllFolders();
    loadPinnedFolders();
    loadPinnedFiles();
  }, [loadAllFolders, loadPinnedFolders, loadPinnedFiles]);

  useEffect(() => {
    setSelectedId(null);
    setCheckedIds(new Set());
    loadFiles(currentFolderId);
    loadSubfolders(currentFolderId);
  }, [currentFolderId, loadFiles, loadSubfolders]);

  useEffect(() => {
    if (isSearchingGlobal) loadAllFiles();
  }, [isSearchingGlobal, loadAllFiles]);

  // Fullscreen window drop listener (Issue #8)
  useEffect(() => {
    let dragCounter = 0;
    function onDragEnter(e: DragEvent) {
      if (e.dataTransfer?.types.includes('Files')) {
        dragCounter++;
        setWindowDragOver(true);
      }
    }
    function onDragLeave(e: DragEvent) {
      if (e.dataTransfer?.types.includes('Files')) {
        dragCounter--;
        if (dragCounter <= 0) {
          dragCounter = 0;
          setWindowDragOver(false);
        }
      }
    }
    function onDrop() {
      dragCounter = 0;
      setWindowDragOver(false);
    }
    window.addEventListener('dragenter', onDragEnter);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragenter', onDragEnter);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDrop);
    };
  }, []);

  // Ctrl+A select all visible files (Issue #10)
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        const active = document.activeElement;
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;
        e.preventDefault();
        setCheckedIds(new Set(displayFiles.map(f => f.id)));
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [files, allFiles, searchQuery, typeFilter]);

  function handleSortChange(by: 'name' | 'date' | 'size') {
    if (sortBy === by) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(by);
      setSortDir('asc');
    }
  }

  // Scoped filters (Issue #20): filters apply within current folder by default!
  const displayFiles = useMemo(() => {
    const base = isSearchingGlobal ? allFiles : files;
    const searched = applySearch(base, searchQuery, typeFilter);
    return sortFiles(searched, sortBy, sortDir);
  }, [isSearchingGlobal, allFiles, files, searchQuery, typeFilter, sortBy, sortDir]);

  const displaySubfolders = useMemo(() => {
    if (isSearchingGlobal) return [];
    return sortFolders(subfolders, sortBy, sortDir);
  }, [subfolders, isSearchingGlobal, sortBy, sortDir]);

  function startResize(e: React.MouseEvent) {
    e.preventDefault();
    const startX = e.clientX;
    const startW = previewWidth;
    function onMove(ev: MouseEvent) {
      setPreviewWidth(Math.max(220, Math.min(700, startW + (startX - ev.clientX))));
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
  }

  function navigateToBreadcrumb(index: number) {
    navigate('/files', { state: { folderPath: folderPath.slice(0, index + 1) } });
    setSearchQuery('');
  }

  function navigateToRoot() {
    navigate('/files', { state: { folderPath: [] } });
    setSearchQuery('');
  }

  // Terminal style path string (Issue #16)
  const currentPathString = useMemo(() => {
    if (folderPath.length === 0) return '~/';
    return `~/${folderPath.map(p => p.name).join('/')}`;
  }, [folderPath]);

  function handleCopyPath() {
    navigator.clipboard.writeText(currentPathString).then(() => {
      setCopiedPath(true);
      setTimeout(() => setCopiedPath(false), 2000);
    });
  }

  // Upload handler via UploadManager context (Issue #6, #9, #11)
  async function handleUpload(picked: File[], folderId: string | null) {
    await uploadFiles(picked, folderId, () => {
      loadFiles(currentFolderId);
      if (currentFolderId === null) loadAllFiles();
    });
  }

  async function handleExtractZip(file: File) {
    await extractZip(file, currentFolderId, () => {
      loadFiles(currentFolderId);
      loadSubfolders(currentFolderId);
      loadAllFolders();
    });
  }

  async function handleCreateFile(name: string) {
    const created = await api.post<FileItem>('/files/create', { name, folder_id: currentFolderId });
    setFiles(prev => [created, ...prev]);
    setSelectedId(created.id);
    setShowPreview(true);
  }

  async function handleCreateFolder(name: string) {
    try {
      const f = await api.post<FolderItem>('/folders', { name, parent_id: currentFolderId });
      setAllFolders(prev => [...prev, f].sort((a, b) => a.name.localeCompare(b.name)));
      setSubfolders(prev => [...prev, f].sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? 'Failed to create folder';
      alert(msg);
    }
  }

  async function handleRenameFolder(id: string, name: string) {
    const updated = await api.patch<FolderItem>(`/folders/${id}`, { name });
    const updateList = (prev: FolderItem[]) =>
      prev.map(f => f.id === id ? updated : f).sort((a, b) => a.name.localeCompare(b.name));
    setAllFolders(updateList);
    setSubfolders(updateList);
    const newPath = folderPath.map(p => p.id === id ? { ...p, name } : p);
    navigate('/files', { state: { folderPath: newPath }, replace: true });
  }

  async function handleRenameFile(id: number, name: string) {
    try {
      const updated = await api.patch<FileItem>(`/files/${id}`, { name });
      const applyUpdate = (prev: FileItem[]) => prev.map(f => f.id === id ? updated : f);
      setFiles(applyUpdate);
      setAllFiles(applyUpdate);
      setPinnedFiles(prev => prev.map(f => f.id === id ? updated : f));
    } catch (e: unknown) {
      alert((e as { message?: string })?.message || 'Rename failed');
    }
  }

  async function handleDeleteFolder(id: string) {
    if (!confirm('Are you sure you want to delete this folder and its contents?')) return;
    try {
      await api.delete(`/folders/${id}`);
      setAllFolders(prev => prev.filter(f => f.id !== id));
      setSubfolders(prev => prev.filter(f => f.id !== id));
      setPinnedFolders(prev => prev.filter(f => f.id !== id));
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

  async function handlePinFolderToggle(id: string) {
    try {
      const updated = await api.patch<FolderItem>(`/folders/${id}/pin`, {});
      setAllFolders(prev => prev.map(f => f.id === id ? updated : f));
      if (updated.pinned) {
        setPinnedFolders(prev => [...prev.filter(f => f.id !== id), updated]);
      } else {
        setPinnedFolders(prev => prev.filter(f => f.id !== id));
      }
    } catch {}
  }

  function handleDownloadFolderZip(id: string, name: string) {
    const a = document.createElement('a');
    a.href = `/api/folders/${id}/download`;
    a.download = `${name}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  // Multi-selection with Shift / Ctrl (Issue #10)
  function handleSelectFile(id: number, e?: React.MouseEvent) {
    if (e?.shiftKey && lastSelectedId !== null) {
      const ids = displayFiles.map(f => f.id);
      const startIdx = ids.indexOf(lastSelectedId);
      const endIdx = ids.indexOf(id);
      if (startIdx !== -1 && endIdx !== -1) {
        const min = Math.min(startIdx, endIdx);
        const max = Math.max(startIdx, endIdx);
        const range = ids.slice(min, max + 1);
        setCheckedIds(new Set(range));
      }
      return;
    }

    if (e?.ctrlKey || e?.metaKey) {
      setCheckedIds(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
      setLastSelectedId(id);
      return;
    }

    // Normal click: select for preview
    setSelectedId(prev => prev === id ? null : id);
    setLastSelectedId(id);
    if (!showPreview) setShowPreview(true);
  }

  function handleCheck(id: number, checked: boolean) {
    setCheckedIds(prev => {
      const s = new Set(prev);
      if (checked) s.add(id); else s.delete(id);
      return s;
    });
    setLastSelectedId(id);
  }

  async function handleBulkDelete() {
    const ids = Array.from(checkedIds);
    if (!ids.length) return;
    if (!confirm(`Delete ${ids.length} file${ids.length > 1 ? 's' : ''}?`)) return;
    try {
      await api.delete(`/files?ids=${ids.join(',')}`);
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

  function handlePreviewSaved(id: number, size: number) {
    const update = (prev: FileItem[]) => prev.map(f => f.id === id ? { ...f, size } : f);
    setFiles(update);
    setAllFiles(update);
  }

  function handleDragStart(event: DragStartEvent) {
    const id = (event.active.data.current as { fileId: number })?.fileId;
    setActiveFileId(id ?? null);
  }

  // Drag-and-drop to folders and parent breadcrumbs (Issue #14)
  async function handleDragEnd(event: DragEndEvent) {
    setActiveFileId(null);
    const { active, over } = event;
    if (!over) return;
    const fileId = (active.data.current as { fileId: number })?.fileId;
    if (!fileId) return;

    const overId = String(over.id);
    const targetFolderId = overId === '__root__' ? null
      : overId.startsWith('card-') ? overId.slice(5)
      : overId.startsWith('breadcrumb-') ? overId.slice(11)
      : overId;

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

  // Reliable file resolution (Issue #19)
  const selectedFile = useMemo(() => {
    if (selectedId === null) return null;
    return displayFiles.find(f => f.id === selectedId)
      ?? files.find(f => f.id === selectedId)
      ?? pinnedFiles.find(f => f.id === selectedId)
      ?? allFiles.find(f => f.id === selectedId)
      ?? null;
  }, [selectedId, displayFiles, files, pinnedFiles, allFiles]);

  const activeFile = files.find(f => f.id === activeFileId) ?? null;
  const fullscreenFile = useMemo(() => {
    if (fullscreenId === null) return null;
    return displayFiles.find(f => f.id === fullscreenId)
      ?? files.find(f => f.id === fullscreenId)
      ?? pinnedFiles.find(f => f.id === fullscreenId)
      ?? allFiles.find(f => f.id === fullscreenId)
      ?? null;
  }, [fullscreenId, displayFiles, files, pinnedFiles, allFiles]);

  return (
    <div className="h-screen flex flex-col bg-[#020617] text-white overflow-hidden relative">
      <Navbar />

      {/* Fullscreen drag-over dropzone overlay (Issue #8) */}
      {windowDragOver && (
        <div className="fixed inset-0 z-50 bg-cyan-950/80 border-4 border-dashed border-cyan-400 backdrop-blur-md flex flex-col items-center justify-center pointer-events-none">
          <Upload size={64} className="text-cyan-300 animate-bounce mb-3" />
          <h2 className="text-2xl font-bold text-white">Drop files anywhere to upload</h2>
          <p className="text-sm text-cyan-200 mt-1">Uploading to: {currentPathString}</p>
        </div>
      )}

      <div className="flex flex-col flex-1 min-h-0 pt-20">
        {/* Topbar */}
        <header className="shrink-0 flex items-center justify-between px-5 py-2.5 border-b border-slate-800/70">
          <div className="flex items-center gap-3 min-w-0 flex-1 mr-4">
            <button
              onClick={() => navigate(-1)}
              className="text-slate-500 hover:text-slate-300 transition-colors p-1 shrink-0"
              title="Back"
            >
              <ArrowLeft size={15} />
            </button>

            {/* Terminal Style Breadcrumb Path (Issue #16 & #14) */}
            <div className="flex items-center gap-2 min-w-0 bg-slate-900/60 border border-slate-800 rounded-lg px-2.5 py-1 text-xs">
              <Terminal size={12} className="text-cyan-400 shrink-0" />
              <div className="flex items-center gap-1 min-w-0 overflow-x-auto">
                <DroppableBreadcrumbSegment
                  id={null}
                  name="~"
                  isLast={folderPath.length === 0}
                  onClick={navigateToRoot}
                />
                {folderPath.map((seg, i) => (
                  <span key={seg.id} className="flex items-center gap-1 shrink-0">
                    <span className="text-slate-600">/</span>
                    <DroppableBreadcrumbSegment
                      id={seg.id}
                      name={seg.name}
                      isLast={i === folderPath.length - 1}
                      onClick={() => navigateToBreadcrumb(i)}
                    />
                  </span>
                ))}
              </div>

              <button
                onClick={handleCopyPath}
                className="ml-1 p-1 text-slate-500 hover:text-slate-300 rounded transition-colors shrink-0"
                title="Copy Path"
              >
                {copiedPath ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
              </button>
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
              title="Toggle preview panel"
            >
              {showPreview ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
            <button onClick={() => setView(v => v === 'grid' ? 'list' : 'grid')} className="btn btn-outline p-2" title="Toggle view">
              {view === 'grid' ? <List size={14} /> : <LayoutGrid size={14} />}
            </button>
          </div>
        </header>

        {/* Search + Scope + Type Filters */}
        <div className="shrink-0 flex items-center justify-between px-5 py-2.5 border-b border-slate-800/40 gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-1 max-w-lg min-w-[280px]">
            {/* Search Input (Clean Placeholder - Issue #21) */}
            <div className="relative flex-1">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search files…"
                className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg pl-8 pr-8 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-colors"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Scope selector */}
            <select
              value={searchScope}
              onChange={e => setSearchScope(e.target.value as 'folder' | 'global')}
              className="bg-slate-800/70 border border-slate-700/50 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-300 outline-none"
            >
              <option value="folder">This Folder</option>
              <option value="global">All Files</option>
            </select>
          </div>

          {/* Type filters */}
          <div className="flex items-center gap-1 overflow-x-auto py-1">
            {TYPE_FILTERS.map(tf => (
              <button
                key={String(tf.value)}
                onClick={() => setTypeFilter(prev => prev === tf.value ? null : tf.value)}
                className={`text-xs px-2.5 py-1 rounded-md transition-colors whitespace-nowrap ${
                  typeFilter === tf.value
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-medium'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div ref={bodyRef} className="flex flex-1 min-h-0 overflow-hidden">
            {/* Hierarchical Tree Sidebar (Issue #18, #12, #17) */}
            <div className="w-56 shrink-0 border-r border-slate-800/60 overflow-y-auto py-3 px-2">
              <FolderSidebar
                folders={allFolders}
                currentId={currentFolderId}
                pinnedFiles={pinnedFiles}
                pinnedFolders={pinnedFolders}
                onSelect={id => {
                  if (id === null) {
                    navigateToRoot();
                  } else {
                    const f = allFolders.find(f => f.id === id);
                    navigate('/files', { state: { folderPath: f ? [{ id: f.id, name: f.name }] : [{ id, name: 'Folder' }] } });
                    setSearchQuery('');
                  }
                }}
                onRename={handleRenameFolder}
                onDelete={handleDeleteFolder}
                onPinnedFileClick={file => { setSelectedId(file.id); setShowPreview(true); }}
                onPinToggle={handlePinToggle}
                onPinFolderToggle={handlePinFolderToggle}
                onDownloadFolderZip={handleDownloadFolderZip}
                onNewFile={() => setCreatingFile(true)}
                onNewFolder={() => setCreatingFolder(true)}
                onUploadFilesClick={() => fileInputRef.current?.click()}
              />
            </div>

            {/* Files Grid area */}
            <div
              className="flex-1 min-w-0 overflow-y-auto p-5"
              onContextMenu={e => {
                e.preventDefault();
                setContextMenu({ x: e.clientX, y: e.clientY, type: 'canvas' });
              }}
            >
              {loading && !searchQuery ? (
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
                  onZipDropped={file => setZipModalFile(file)}
                  onContextMenuFile={(e, f) => {
                    setContextMenu({ x: e.clientX, y: e.clientY, type: 'file', file: f });
                  }}
                  onContextMenuFolder={(e, f) => {
                    setContextMenu({ x: e.clientX, y: e.clientY, type: 'folder', folder: f });
                  }}
                  onContextMenuCanvas={e => {
                    setContextMenu({ x: e.clientX, y: e.clientY, type: 'canvas' });
                  }}
                  onRenameFile={handleRenameFile}
                  onPinFolder={handlePinFolderToggle}
                  onDownloadFolderZip={handleDownloadFolderZip}
                  onDeleteFolder={handleDeleteFolder}
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
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-5 py-3 bg-slate-800/95 border border-slate-600/60 rounded-2xl shadow-2xl backdrop-blur-md">
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

        {/* Floating Upload Drawer (Issues #6, #9, #11) */}
        <UploadDrawer />

        {/* Modals & Menus */}
        <CreateFolderModal open={creatingFolder} onClose={() => setCreatingFolder(false)} onCreate={handleCreateFolder} />
        <NewFileModal open={creatingFile} onClose={() => setCreatingFile(false)} onCreate={handleCreateFile} />

        <ZipActionModal
          file={zipModalFile}
          onClose={() => setZipModalFile(null)}
          onUploadAsZip={f => handleUpload([f], currentFolderId)}
          onExtract={handleExtractZip}
        />

        <ContextMenu
          state={contextMenu}
          onClose={() => setContextMenu(null)}
          onPreviewFile={f => { setSelectedId(f.id); setShowPreview(true); }}
          onRenameFile={f => {
            const newName = prompt('Enter new filename:', f.original_name);
            if (newName && newName !== f.original_name) handleRenameFile(f.id, newName);
          }}
          onShareFile={f => setShareModal({ open: true, type: 'file', id: f.id, name: f.original_name })}
          onPinFile={handlePinToggle}
          onDeleteFile={handleDeleteFile}
          onOpenFolder={navigateToFolder}
          onRenameFolder={(id, name) => {
            const newName = prompt('Enter new folder name:', name);
            if (newName && newName !== name) handleRenameFolder(id, newName);
          }}
          onShareFolder={f => setShareModal({ open: true, type: 'folder', id: f.id, name: f.name })}
          onPinFolder={handlePinFolderToggle}
          onDownloadFolderZip={handleDownloadFolderZip}
          onDeleteFolder={handleDeleteFolder}
          onNewFile={() => setCreatingFile(true)}
          onNewFolder={() => setCreatingFolder(true)}
          onUploadClick={() => fileInputRef.current?.click()}
          onUploadFolderClick={() => fileInputRef.current?.click()}
        />

        <ShareModal
          open={shareModal.open}
          type={shareModal.type}
          itemId={shareModal.id}
          itemName={shareModal.name}
          onClose={() => setShareModal(prev => ({ ...prev, open: false }))}
        />

        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={e => {
            if (e.target.files?.length) {
              handleUpload(Array.from(e.target.files), currentFolderId);
            }
            e.target.value = '';
          }}
        />
      </div>
    </div>
  );
}

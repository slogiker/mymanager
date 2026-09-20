import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { FileItem } from './FileCard';
import { FolderItem } from './FolderSidebar';
import { useUpload } from '../../context/UploadContext';
import { api } from '../../lib/api';
import {
  BreadcrumbEntry,
  applySearch,
  sortFiles,
  sortFolders,
} from './fileHelpers';

export function useFilesManager() {
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
  const [copiedPath, setCopiedPath] = useState(false);
  const [zipModalFile, setZipModalFile] = useState<File | null>(null);

  const navigate = useNavigate();
  const location = useLocation();

  const folderPath: BreadcrumbEntry[] = location.state?.folderPath ?? [];
  const currentFolderId = folderPath.length > 0 ? folderPath[folderPath.length - 1].id : null;
  const isSearchingGlobal = searchScope === 'global' && searchQuery.trim().length > 0;

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
    } catch {
      setSubfolders([]);
    }
  }, []);

  const loadFiles = useCallback(async (folderId: string | null) => {
    setLoading(true);
    try {
      const data = await api.get<FileItem[]>(`/files?folder_id=${folderId ?? 'null'}`);
      setFiles(data);
    } catch {
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAllFiles = useCallback(async () => {
    try {
      setAllFiles(await api.get<FileItem[]>('/files'));
    } catch {
      setAllFiles([]);
    }
  }, []);

  const loadPinnedFiles = useCallback(async () => {
    try {
      setPinnedFiles(await api.get<FileItem[]>('/files?pinned=1'));
    } catch {
      setPinnedFiles([]);
    }
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

  // Ctrl+A select all visible files
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        const active = document.activeElement;
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;
        e.preventDefault();
        setCheckedIds(new Set(displayFiles.map((f) => f.id)));
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [files, allFiles, searchQuery, typeFilter]);

  function handleSortChange(by: 'name' | 'date' | 'size') {
    if (sortBy === by) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(by);
      setSortDir('asc');
    }
  }

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

  const currentPathString = useMemo(() => {
    if (folderPath.length === 0) return '~/';
    return `~/${folderPath.map((p) => p.name).join('/')}`;
  }, [folderPath]);

  function handleCopyPath() {
    navigator.clipboard.writeText(currentPathString).then(() => {
      setCopiedPath(true);
      setTimeout(() => setCopiedPath(false), 2000);
    });
  }

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
    const created = await api.post<FileItem>('/files/create', {
      name,
      folder_id: currentFolderId,
    });
    setFiles((prev) => [created, ...prev]);
    setSelectedId(created.id);
    setShowPreview(true);
  }

  async function handleCreateFolder(name: string) {
    try {
      const f = await api.post<FolderItem>('/folders', { name, parent_id: currentFolderId });
      setAllFolders((prev) => [...prev, f].sort((a, b) => a.name.localeCompare(b.name)));
      setSubfolders((prev) => [...prev, f].sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? 'Failed to create folder';
      alert(msg);
    }
  }

  async function handleRenameFolder(id: string, name: string) {
    const updated = await api.patch<FolderItem>(`/folders/${id}`, { name });
    const updateList = (prev: FolderItem[]) =>
      prev.map((f) => (f.id === id ? updated : f)).sort((a, b) => a.name.localeCompare(b.name));
    setAllFolders(updateList);
    setSubfolders(updateList);
    const newPath = folderPath.map((p) => (p.id === id ? { ...p, name } : p));
    navigate('/files', { state: { folderPath: newPath }, replace: true });
  }

  async function handleRenameFile(id: number, name: string) {
    try {
      const updated = await api.patch<FileItem>(`/files/${id}`, { name });
      const applyUpdate = (prev: FileItem[]) => prev.map((f) => (f.id === id ? updated : f));
      setFiles(applyUpdate);
      setAllFiles(applyUpdate);
      setPinnedFiles((prev) => prev.map((f) => (f.id === id ? updated : f)));
    } catch (e: unknown) {
      alert((e as { message?: string })?.message || 'Rename failed');
    }
  }

  async function handleDeleteFolder(id: string) {
    if (!confirm('Are you sure you want to delete this folder and its contents?')) return;
    try {
      await api.delete(`/folders/${id}`);
      setAllFolders((prev) => prev.filter((f) => f.id !== id));
      setSubfolders((prev) => prev.filter((f) => f.id !== id));
      setPinnedFolders((prev) => prev.filter((f) => f.id !== id));
      if (folderPath.some((p) => p.id === id)) {
        navigate('/files', { state: { folderPath: [] }, replace: true });
      }
    } catch {}
  }

  async function handleDeleteFile(id: number) {
    try {
      await api.delete(`/files/${id}`);
      setFiles((prev) => prev.filter((f) => f.id !== id));
      setAllFiles((prev) => prev.filter((f) => f.id !== id));
      setPinnedFiles((prev) => prev.filter((f) => f.id !== id));
      setCheckedIds((prev) => {
        const s = new Set(prev);
        s.delete(id);
        return s;
      });
      if (selectedId === id) setSelectedId(null);
      if (fullscreenId === id) setFullscreenId(null);
    } catch {}
  }

  async function handleDuplicateFile(file: FileItem) {
    try {
      const duplicated = await api.post<FileItem>(`/files/${file.id}/duplicate`, {});
      setFiles((prev) => [duplicated, ...prev]);
      setAllFiles((prev) => [duplicated, ...prev]);
      setSelectedId(duplicated.id);
    } catch (e: unknown) {
      alert((e as { message?: string })?.message || 'Duplicate failed');
    }
  }

  async function handlePinToggle(id: number) {
    try {
      const updated = await api.patch<FileItem>(`/files/${id}/pin`, {});
      const applyUpdate = (prev: FileItem[]) => prev.map((f) => (f.id === id ? updated : f));
      setFiles(applyUpdate);
      setAllFiles(applyUpdate);
      if (updated.pinned) {
        setPinnedFiles((prev) =>
          [...prev.filter((f) => f.id !== id), updated].sort((a, b) =>
            a.original_name.localeCompare(b.original_name)
          )
        );
      } else {
        setPinnedFiles((prev) => prev.filter((f) => f.id !== id));
      }
    } catch {}
  }

  async function handlePinFolderToggle(id: string) {
    try {
      const updated = await api.patch<FolderItem>(`/folders/${id}/pin`, {});
      setAllFolders((prev) => prev.map((f) => (f.id === id ? updated : f)));
      if (updated.pinned) {
        setPinnedFolders((prev) => [...prev.filter((f) => f.id !== id), updated]);
      } else {
        setPinnedFolders((prev) => prev.filter((f) => f.id !== id));
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

  function handleSelectFile(id: number, e?: React.MouseEvent) {
    if (e?.shiftKey && lastSelectedId !== null) {
      const ids = displayFiles.map((f) => f.id);
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
      setCheckedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
      setLastSelectedId(id);
      return;
    }

    setSelectedId((prev) => (prev === id ? null : id));
    setLastSelectedId(id);
    if (!showPreview) setShowPreview(true);
  }

  function handleCheck(id: number, checked: boolean) {
    setCheckedIds((prev) => {
      const s = new Set(prev);
      if (checked) s.add(id);
      else s.delete(id);
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
      setFiles((prev) => prev.filter((f) => !checkedIds.has(f.id)));
      setAllFiles((prev) => prev.filter((f) => !checkedIds.has(f.id)));
      setPinnedFiles((prev) => prev.filter((f) => !checkedIds.has(f.id)));
      if (selectedId && checkedIds.has(selectedId)) setSelectedId(null);
      setCheckedIds(new Set());
    } catch {}
  }

  function handleBulkDownload() {
    const toDownload = displayFiles.filter((f) => checkedIds.has(f.id));
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
    const update = (prev: FileItem[]) =>
      prev.map((f) => (f.id === id ? { ...f, size } : f));
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

    const overId = String(over.id);
    const targetFolderId =
      overId === '__root__'
        ? null
        : overId.startsWith('card-')
        ? overId.slice(5)
        : overId.startsWith('breadcrumb-')
        ? overId.slice(11)
        : overId;

    const idsToMove = checkedIds.has(fileId) ? Array.from(checkedIds) : [fileId];

    try {
      await Promise.all(
        idsToMove.map((id) => api.patch(`/files/${id}/move`, { folder_id: targetFolderId }))
      );
      const movedSet = new Set(idsToMove);
      setFiles((prev) => prev.filter((f) => !movedSet.has(f.id)));
      setAllFiles((prev) => prev.filter((f) => !movedSet.has(f.id)));
      if (selectedId && movedSet.has(selectedId)) setSelectedId(null);
      if (checkedIds.has(fileId)) setCheckedIds(new Set());
    } catch {}
  }

  const selectedFile = useMemo(() => {
    if (selectedId === null) return null;
    return (
      displayFiles.find((f) => f.id === selectedId) ??
      files.find((f) => f.id === selectedId) ??
      pinnedFiles.find((f) => f.id === selectedId) ??
      allFiles.find((f) => f.id === selectedId) ??
      null
    );
  }, [selectedId, displayFiles, files, pinnedFiles, allFiles]);

  const activeFile = files.find((f) => f.id === activeFileId) ?? null;
  const fullscreenFile = useMemo(() => {
    if (fullscreenId === null) return null;
    return (
      displayFiles.find((f) => f.id === fullscreenId) ??
      files.find((f) => f.id === fullscreenId) ??
      pinnedFiles.find((f) => f.id === fullscreenId) ??
      allFiles.find((f) => f.id === fullscreenId) ??
      null
    );
  }, [fullscreenId, displayFiles, files, pinnedFiles, allFiles]);

  return {
    folderPath,
    currentFolderId,
    currentPathString,
    allFolders,
    subfolders: displaySubfolders,
    pinnedFolders,
    pinnedFiles,
    files: displayFiles,
    loading,
    checkedIds,
    view,
    setView,
    showPreview,
    setShowPreview,
    previewWidth,
    selectedId,
    setSelectedId,
    selectedFile,
    fullscreenId,
    setFullscreenId,
    fullscreenFile,
    activeFile,
    creatingFolder,
    setCreatingFolder,
    creatingFile,
    setCreatingFile,
    searchQuery,
    setSearchQuery,
    typeFilter,
    setTypeFilter,
    searchScope,
    setSearchScope,
    sortBy,
    sortDir,
    copiedPath,
    zipModalFile,
    setZipModalFile,
    handleSortChange,
    startResize,
    navigateToFolder,
    navigateToBreadcrumb,
    navigateToRoot,
    handleCopyPath,
    handleUpload,
    handleExtractZip,
    handleCreateFile,
    handleCreateFolder,
    handleRenameFolder,
    handleRenameFile,
    handleDeleteFolder,
    handleDeleteFile,
    handleDuplicateFile,
    loadFiles,
    handlePinToggle,
    handlePinFolderToggle,
    handleDownloadFolderZip,
    handleSelectFile,
    handleCheck,
    handleBulkDelete,
    handleBulkDownload,
    handlePreviewSaved,
    handleDragStart,
    handleDragEnd,
    setCheckedIds,
  };
}

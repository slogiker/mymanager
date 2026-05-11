import { useState, useEffect, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { FolderPlus, LayoutGrid, List, Upload } from 'lucide-react';
import { apiFetch, api } from '../lib/api';
import FolderSidebar from '../components/files/FolderSidebar';
import FileGrid from '../components/files/FileGrid';
import FileCard from '../components/files/FileCard';
import CreateFolderModal from '../components/files/CreateFolderModal';

interface Folder {
  id: string;
  name: string;
  created_at: string;
}

interface FileItem {
  id: number;
  original_name: string;
  file_path: string;
  mime_type: string;
  size: number;
  folder_id: string | null;
  created_at: string;
}

export default function Files() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeFileId, setActiveFileId] = useState<number | null>(null);
  const [error, setError] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const loadFolders = useCallback(async () => {
    try {
      const data = await api.get<Folder[]>('/folders');
      setFolders(data ?? []);
    } catch {}
  }, []);

  const loadFiles = useCallback(async (folderId: string | null) => {
    try {
      const param = folderId === null ? 'null' : folderId;
      const data = await api.get<FileItem[]>(`/files?folder_id=${param}`);
      setFiles(data ?? []);
    } catch {}
  }, []);

  useEffect(() => { loadFolders(); }, [loadFolders]);
  useEffect(() => { loadFiles(currentFolderId); }, [currentFolderId, loadFiles]);

  async function handleCreateFolder(name: string) {
    const folder = await api.post<Folder>('/folders', { name });
    setFolders(prev => [...prev, folder].sort((a, b) => a.name.localeCompare(b.name)));
  }

  async function handleRenameFolder(id: string, name: string) {
    const updated = await api.patch<Folder>(`/folders/${id}`, { name });
    setFolders(prev =>
      prev.map(f => f.id === id ? updated : f).sort((a, b) => a.name.localeCompare(b.name))
    );
  }

  async function handleDeleteFolder(id: string) {
    await api.delete(`/folders/${id}`);
    setFolders(prev => prev.filter(f => f.id !== id));
    if (currentFolderId === id) setCurrentFolderId(null);
    else await loadFiles(currentFolderId);
  }

  async function handleUpload(picked: File[], folderId: string | null) {
    setUploading(true);
    setError('');
    try {
      for (const file of picked) {
        const fd = new FormData();
        fd.append('file', file);
        if (folderId) fd.append('folder_id', folderId);
        await apiFetch('/files', { method: 'POST', body: fd });
      }
      await loadFiles(currentFolderId);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteFile(id: number) {
    await api.delete(`/files/${id}`);
    setFiles(prev => prev.filter(f => f.id !== id));
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

    const targetFolderId = over.id === '__root__' ? null : String(over.id);
    const file = files.find(f => f.id === fileId);
    if (!file || file.folder_id === targetFolderId) return;

    try {
      await api.patch(`/files/${fileId}/move`, { folder_id: targetFolderId });
      setFiles(prev => prev.filter(f => f.id !== fileId));
    } catch {}
  }

  const activeFile = activeFileId !== null ? files.find(f => f.id === activeFileId) : null;
  const currentFolderName = currentFolderId
    ? (folders.find(f => f.id === currentFolderId)?.name ?? 'Folder')
    : 'All Files';

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6">
      <div className="max-w-6xl mx-auto">

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold gradient-text">Files</h1>
            <p className="text-slate-400 text-sm mt-0.5">
              {currentFolderName}
              {currentFolderId && (
                <>
                  {' · '}
                  <button
                    onClick={() => setCurrentFolderId(null)}
                    className="hover:text-slate-200 transition-colors"
                  >
                    All Files
                  </button>
                </>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCreatingFolder(true)}
              className="btn btn-outline flex items-center gap-2 text-sm"
            >
              <FolderPlus size={15} /> New Folder
            </button>
            <button
              onClick={() => setView(v => v === 'grid' ? 'list' : 'grid')}
              className="btn btn-outline p-2"
              title={view === 'grid' ? 'List view' : 'Grid view'}
            >
              {view === 'grid' ? <List size={16} /> : <LayoutGrid size={16} />}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {uploading && (
          <div className="mb-4 px-4 py-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-cyan-400 text-sm flex items-center gap-2">
            <Upload size={14} className="animate-bounce" /> Uploading…
          </div>
        )}

        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-6">
            <FolderSidebar
              folders={folders}
              currentId={currentFolderId}
              onSelect={setCurrentFolderId}
              onRename={handleRenameFolder}
              onDelete={handleDeleteFolder}
            />

            <div className="flex-1 min-w-0">
              <FileGrid
                files={files}
                view={view}
                currentFolderId={currentFolderId}
                onUpload={handleUpload}
                onDelete={handleDeleteFile}
              />
            </div>
          </div>

          <DragOverlay>
            {activeFile && (
              <div className="opacity-90 rotate-2 scale-105">
                <FileCard file={activeFile} view="grid" onDelete={() => {}} />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      <CreateFolderModal
        open={creatingFolder}
        onClose={() => setCreatingFolder(false)}
        onCreate={handleCreateFolder}
      />
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import FolderSidebar from '../components/files/FolderSidebar';
import FileGrid from '../components/files/FileGrid';
import FileCard from '../components/files/FileCard';
import PreviewPanel from '../components/files/PreviewPanel';
import FullscreenViewer from '../components/files/FullscreenViewer';
import CreateFolderModal from '../components/files/CreateFolderModal';
import NewFileModal from '../components/files/NewFileModal';
import ContextMenu, { type ContextMenuState } from '../components/files/ContextMenu';
import ZipActionModal from '../components/files/ZipActionModal';
import ShareModal from '../components/files/ShareModal';
import UploadDrawer from '../components/files/UploadDrawer';
import Navbar from '../components/layout/Navbar';
import { useFilesManager } from '../components/files/useFilesManager';
import { FileBreadcrumbs } from '../components/files/FileBreadcrumbs';
import { FileToolbar, FileSearchFilterBar } from '../components/files/FileToolbar';
import { MultiSelectActionBar } from '../components/files/MultiSelectActionBar';
import { FileDropOverlay } from '../components/files/FileDropOverlay';

export default function Files() {
  const fm = useFilesManager();
  const [windowDragOver, setWindowDragOver] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [shareModal, setShareModal] = useState<{
    open: boolean;
    type: 'file' | 'folder';
    id: string | number;
    name: string;
  }>({
    open: false,
    type: 'file',
    id: '',
    name: '',
  });

  const bodyRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  // Fullscreen window drop listener
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

  return (
    <div className="h-screen flex flex-col bg-[#111216] text-slate-200 overflow-hidden relative">
      <Navbar />

      {/* Fullscreen drag-over dropzone overlay */}
      <FileDropOverlay active={windowDragOver} currentPathString={fm.currentPathString} />

      <div className="flex flex-col flex-1 min-h-0 pt-20">
        {/* Topbar */}
        <header className="shrink-0 flex items-center justify-between px-5 py-2.5 border-b border-slate-800/70">
          <FileBreadcrumbs
            folderPath={fm.folderPath}
            onBack={() => window.history.back()}
            onNavigateToRoot={fm.navigateToRoot}
            onNavigateToBreadcrumb={fm.navigateToBreadcrumb}
            onCopyPath={fm.handleCopyPath}
            copiedPath={fm.copiedPath}
          />
          <FileToolbar
            searchQuery={fm.searchQuery}
            onSearchChange={fm.setSearchQuery}
            searchScope={fm.searchScope}
            onSearchScopeChange={fm.setSearchScope}
            typeFilter={fm.typeFilter}
            onTypeFilterChange={fm.setTypeFilter}
            view={fm.view}
            onViewChange={fm.setView}
            showPreview={fm.showPreview}
            onTogglePreview={() => fm.setShowPreview(!fm.showPreview)}
            onNewFile={() => fm.setCreatingFile(true)}
            onNewFolder={() => fm.setCreatingFolder(true)}
          />
        </header>

        {/* Search + Scope + Type Filters */}
        <FileSearchFilterBar
          searchQuery={fm.searchQuery}
          onSearchChange={fm.setSearchQuery}
          searchScope={fm.searchScope}
          onSearchScopeChange={fm.setSearchScope}
          typeFilter={fm.typeFilter}
          onTypeFilterChange={fm.setTypeFilter}
        />

        {/* Body */}
        <DndContext sensors={sensors} onDragStart={fm.handleDragStart} onDragEnd={fm.handleDragEnd}>
          <div ref={bodyRef} className="flex flex-1 min-h-0 overflow-hidden">
            {/* Hierarchical Tree Sidebar */}
            <div className="w-56 shrink-0 border-r border-slate-800/60 overflow-y-auto py-3 px-2">
              <FolderSidebar
                folders={fm.allFolders}
                currentId={fm.currentFolderId}
                pinnedFiles={fm.pinnedFiles}
                pinnedFolders={fm.pinnedFolders}
                onSelect={(id) => {
                  if (id === null) {
                    fm.navigateToRoot();
                  } else {
                    const f = fm.allFolders.find((folder) => folder.id === id);
                    fm.navigateToFolder(id, f ? f.name : 'Folder');
                  }
                }}
                onRename={fm.handleRenameFolder}
                onDelete={fm.handleDeleteFolder}
                onPinnedFileClick={(file) => {
                  fm.setSelectedId(file.id);
                  fm.setShowPreview(true);
                }}
                onPinToggle={fm.handlePinToggle}
                onPinFolderToggle={fm.handlePinFolderToggle}
                onDownloadFolderZip={fm.handleDownloadFolderZip}
                onNewFile={() => fm.setCreatingFile(true)}
                onNewFolder={() => fm.setCreatingFolder(true)}
                onUploadFilesClick={() => fileInputRef.current?.click()}
              />
            </div>

            {/* Files Grid area */}
            <div
              className="flex-1 min-w-0 overflow-y-auto p-5"
              onContextMenu={(e) => {
                e.preventDefault();
                setContextMenu({ x: e.clientX, y: e.clientY, type: 'canvas' });
              }}
            >
              {fm.loading && !fm.searchQuery ? (
                <div className="flex items-center justify-center h-48 text-slate-600 text-sm">
                  Loading…
                </div>
              ) : (
                <FileGrid
                  files={fm.files}
                  folders={fm.subfolders}
                  view={fm.view}
                  currentFolderId={fm.currentFolderId}
                  selectedId={fm.selectedId}
                  checkedIds={fm.checkedIds}
                  sortBy={fm.sortBy}
                  sortDir={fm.sortDir}
                  onSortChange={fm.handleSortChange}
                  onUpload={fm.handleUpload}
                  onSelect={fm.handleSelectFile}
                  onDoubleClick={(id) => fm.setFullscreenId(id)}
                  onDelete={fm.handleDeleteFile}
                  onPin={fm.handlePinToggle}
                  onCheck={fm.handleCheck}
                  onNewFile={() => fm.setCreatingFile(true)}
                  onFolderOpen={fm.navigateToFolder}
                  onZipDropped={(file) => fm.setZipModalFile(file)}
                  onContextMenuFile={(e, f) => {
                    setContextMenu({ x: e.clientX, y: e.clientY, type: 'file', file: f });
                  }}
                  onContextMenuFolder={(e, f) => {
                    setContextMenu({ x: e.clientX, y: e.clientY, type: 'folder', folder: f });
                  }}
                  onContextMenuCanvas={(e) => {
                    setContextMenu({ x: e.clientX, y: e.clientY, type: 'canvas' });
                  }}
                  onRenameFile={fm.handleRenameFile}
                  onPinFolder={fm.handlePinFolderToggle}
                  onDownloadFolderZip={fm.handleDownloadFolderZip}
                  onDeleteFolder={fm.handleDeleteFolder}
                />
              )}
            </div>

            {/* Resize handle + Preview */}
            {fm.showPreview && (
              <>
                <div
                  className="w-1 shrink-0 cursor-col-resize bg-slate-800/60 hover:bg-red-500/40 transition-colors relative group"
                  onMouseDown={fm.startResize}
                >
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-8 flex flex-col items-center justify-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="w-0.5 h-4 bg-red-500/60 rounded-full" />
                  </div>
                </div>
                <div
                  className="shrink-0 border-l border-slate-800/60 overflow-y-auto"
                  style={{ width: fm.previewWidth }}
                >
                  <PreviewPanel
                    file={fm.selectedFile}
                    onClose={() => {
                      fm.setSelectedId(null);
                      fm.setShowPreview(false);
                    }}
                    onSaved={fm.handlePreviewSaved}
                  />
                </div>
              </>
            )}
          </div>

          <DragOverlay>
            {fm.activeFile && (
              <div className="opacity-90 rotate-2 scale-105 pointer-events-none w-36 relative">
                <FileCard
                  file={fm.activeFile}
                  view="grid"
                  selected={false}
                  checked={false}
                  onSelect={() => {}}
                  onDoubleClick={() => {}}
                  onDelete={() => {}}
                  onPin={() => {}}
                  onCheck={() => {}}
                />
                {fm.checkedIds.has(fm.activeFile.id) && fm.checkedIds.size > 1 && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-600 border-2 border-slate-900 flex items-center justify-center text-[10px] font-bold text-white z-10">
                    {fm.checkedIds.size}
                  </div>
                )}
              </div>
            )}
          </DragOverlay>
        </DndContext>

        {/* Fullscreen viewer */}
        {fm.fullscreenFile && (
          <FullscreenViewer
            file={fm.fullscreenFile}
            onClose={() => fm.setFullscreenId(null)}
            onSaved={fm.handlePreviewSaved}
          />
        )}

        {/* Multi-select action bar */}
        <MultiSelectActionBar
          selectedCount={fm.checkedIds.size}
          onDownload={fm.handleBulkDownload}
          onDelete={fm.handleBulkDelete}
          onClear={() => fm.setCheckedIds(new Set())}
        />

        {/* Floating Upload Drawer */}
        <UploadDrawer />

        {/* Modals & Menus */}
        <CreateFolderModal
          open={fm.creatingFolder}
          onClose={() => fm.setCreatingFolder(false)}
          onCreate={fm.handleCreateFolder}
        />
        <NewFileModal
          open={fm.creatingFile}
          onClose={() => fm.setCreatingFile(false)}
          onCreate={fm.handleCreateFile}
        />

        <ZipActionModal
          file={fm.zipModalFile}
          onClose={() => fm.setZipModalFile(null)}
          onUploadAsZip={(f) => fm.handleUpload([f], fm.currentFolderId)}
          onExtract={fm.handleExtractZip}
        />

        <ContextMenu
          state={contextMenu}
          onClose={() => setContextMenu(null)}
          onPreviewFile={(f) => {
            fm.setSelectedId(f.id);
            fm.setShowPreview(true);
          }}
          onRenameFile={(f) => {
            const newName = prompt('Enter new filename:', f.original_name);
            if (newName && newName !== f.original_name) fm.handleRenameFile(f.id, newName);
          }}
          onShareFile={(f) =>
            setShareModal({ open: true, type: 'file', id: f.id, name: f.original_name })
          }
          onPinFile={fm.handlePinToggle}
          onDeleteFile={fm.handleDeleteFile}
          onOpenFolder={fm.navigateToFolder}
          onRenameFolder={(id, name) => {
            const newName = prompt('Enter new folder name:', name);
            if (newName && newName !== name) fm.handleRenameFolder(id, newName);
          }}
          onShareFolder={(f) =>
            setShareModal({ open: true, type: 'folder', id: f.id, name: f.name })
          }
          onPinFolder={fm.handlePinFolderToggle}
          onDownloadFolderZip={fm.handleDownloadFolderZip}
          onDeleteFolder={fm.handleDeleteFolder}
          onNewFile={() => fm.setCreatingFile(true)}
          onNewFolder={() => fm.setCreatingFolder(true)}
          onUploadClick={() => fileInputRef.current?.click()}
          onUploadFolderClick={() => fileInputRef.current?.click()}
        />

        <ShareModal
          open={shareModal.open}
          type={shareModal.type}
          itemId={shareModal.id}
          itemName={shareModal.name}
          onClose={() => setShareModal((prev) => ({ ...prev, open: false }))}
        />

        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) {
              fm.handleUpload(Array.from(e.target.files), fm.currentFolderId);
            }
            e.target.value = '';
          }}
        />
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { FileItem } from './FileCard';
import { api } from '../../lib/api';

export interface UseFileSelectionAndDnDProps {
  displayFiles: FileItem[];
  files: FileItem[];
  setFiles: React.Dispatch<React.SetStateAction<FileItem[]>>;
  allFiles: FileItem[];
  setAllFiles: React.Dispatch<React.SetStateAction<FileItem[]>>;
  setPinnedFiles: React.Dispatch<React.SetStateAction<FileItem[]>>;
  showPreview: boolean;
  setShowPreview: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useFileSelectionAndDnD({
  displayFiles,
  files,
  setFiles,
  allFiles,
  setAllFiles,
  setPinnedFiles,
  showPreview,
  setShowPreview,
}: UseFileSelectionAndDnDProps) {
  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [fullscreenId, setFullscreenId] = useState<number | null>(null);
  const [activeFileId, setActiveFileId] = useState<number | null>(null);

  function handleSelectFile(id: number, e?: React.MouseEvent) {
    if (e?.shiftKey && lastSelectedId !== null) {
      const ids = displayFiles.map((f) => f.id);
      const a = ids.indexOf(lastSelectedId);
      const b = ids.indexOf(id);
      if (a !== -1 && b !== -1) {
        const [start, end] = [Math.min(a, b), Math.max(a, b)];
        const range = ids.slice(start, end + 1);
        setCheckedIds((prev) => new Set([...prev, ...range]));
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

  return {
    checkedIds,
    setCheckedIds,
    lastSelectedId,
    selectedId,
    setSelectedId,
    fullscreenId,
    setFullscreenId,
    activeFileId,
    setActiveFileId,
    handleSelectFile,
    handleCheck,
    handleBulkDelete,
    handleBulkDownload,
    handleDragStart,
    handleDragEnd,
  };
}

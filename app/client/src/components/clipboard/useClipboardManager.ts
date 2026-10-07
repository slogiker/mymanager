import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { api, apiFetch } from '../../lib/api';
import { ClipboardItem } from '../../types';
import {
  useSensor,
  useSensors,
  PointerSensor,
  DragEndEvent,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { detectType } from './clipboardUtils';

export function useClipboardManager() {
  const [items, setItems] = useState<ClipboardItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Global input state
  const [inputValue, setInputValue] = useState('');
  const [inputTitle, setInputTitle] = useState('');
  const [showTitle, setShowTitle] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'pinned' | 'link' | 'code' | 'text' | 'media'>('all');
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [shareItem, setShareItem] = useState<ClipboardItem | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    loadItems();
  }, []);

  // Cleanup object URL preview
  useEffect(() => {
    if (attachedFile && attachedFile.type.startsWith('image/')) {
      const url = URL.createObjectURL(attachedFile);
      setFilePreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setFilePreviewUrl(null);
    }
  }, [attachedFile]);

  async function loadItems() {
    try {
      setLoading(true);
      const data = await api.get<ClipboardItem[]>('/clipboard');
      const normalized = (data || []).map((item: any) => ({
        ...item,
        is_pinned: Boolean(item.is_pinned ?? item.pinned),
        file_name: item.file_name || item.filename || null,
      }));
      setItems(normalized);
    } catch {
      setError('Failed to load clipboard items');
    } finally {
      setLoading(false);
    }
  }

  // Handle saving snippet (text, code, link + attached file/image together)
  async function handleSave() {
    setError('');
    const hasText = Boolean(inputValue.trim());
    const hasFile = Boolean(attachedFile);

    if (!hasText && !hasFile) return;

    setSaving(true);
    try {
      const detected = hasText ? detectType(inputValue) : (attachedFile?.type.startsWith('image/') ? 'image' : 'file');
      
      if (hasFile && attachedFile) {
        const fd = new FormData();
        fd.append('type', detected);
        if (inputTitle.trim()) fd.append('title', inputTitle.trim());
        if (hasText) fd.append('content', inputValue.trim());
        fd.append('file', attachedFile);
        await apiFetch('/clipboard', { method: 'POST', body: fd });
      } else {
        await api.post('/clipboard', {
          type: detected,
          title: inputTitle.trim() || null,
          content: inputValue.trim(),
        });
      }

      // Reset input fields
      setInputValue('');
      setInputTitle('');
      setShowTitle(false);
      setAttachedFile(null);
      await loadItems();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save to clipboard');
    } finally {
      setSaving(false);
    }
  }

  // Handle Ctrl/Cmd+Enter shortcut
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
  }

  // Allow pasting text and image simultaneously from system clipboard
  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const clipItems = e.clipboardData?.items;
    if (!clipItems) return;

    for (let i = 0; i < clipItems.length; i++) {
      if (clipItems[i].type.startsWith('image/')) {
        const blob = clipItems[i].getAsFile();
        if (blob) {
          setAttachedFile(blob);
          break;
        }
      }
    }
  }

  // Drag and drop file onto global input bar
  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      setAttachedFile(droppedFile);
    }
  }

  // Pin toggle
  async function togglePin(id: number) {
    try {
      await api.patch(`/clipboard/${id}/pin`);
      setItems(prev =>
        prev.map(item => (item.id === id ? { ...item, is_pinned: !item.is_pinned } : item))
      );
    } catch {
      setError('Failed to update pin state');
    }
  }

  // Delete item
  async function handleDelete(id: number) {
    try {
      await api.delete(`/clipboard/${id}`);
      setItems(prev => prev.filter(item => item.id !== id));
    } catch {
      setError('Failed to delete item');
    }
  }

  // Clear all items
  async function clearAll() {
    if (!window.confirm('Clear all clipboard items? This cannot be undone.')) return;
    try {
      await apiFetch('/clipboard', { method: 'DELETE' });
      setItems([]);
    } catch {
      setError('Failed to clear clipboard');
    }
  }

  // Copy content to clipboard
  function copyToClipboard(text: string, id: number) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1800);
    });
  }

  // DnD Drag End Reorder
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setItems(prevItems => {
        const oldIndex = prevItems.findIndex(item => item.id === active.id);
        const newIndex = prevItems.findIndex(item => item.id === over.id);
        if (oldIndex !== -1 && newIndex !== -1) {
          return arrayMove(prevItems, oldIndex, newIndex);
        }
        return prevItems;
      });
    }
  }, []);

  // Filtered and searched items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (activeFilter === 'pinned' && !item.is_pinned) return false;
      if (activeFilter === 'link' && item.type !== 'link') return false;
      if (activeFilter === 'code' && item.type !== 'code') return false;
      if (activeFilter === 'text' && item.type !== 'text') return false;
      if (activeFilter === 'media' && item.type !== 'image' && item.type !== 'file' && !item.file_path && !item.file_name) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = item.title?.toLowerCase().includes(q);
        const matchContent = item.content?.toLowerCase().includes(q);
        const matchFile = (item.file_name || item.filename)?.toLowerCase().includes(q);
        return matchTitle || matchContent || matchFile;
      }

      return true;
    });
  }, [items, activeFilter, searchQuery]);

  return {
    items,
    loading,
    inputValue,
    setInputValue,
    inputTitle,
    setInputTitle,
    showTitle,
    setShowTitle,
    attachedFile,
    setAttachedFile,
    filePreviewUrl,
    saving,
    error,
    setError,
    searchQuery,
    setSearchQuery,
    activeFilter,
    setActiveFilter,
    copiedId,
    shareItem,
    setShareItem,
    isDragOver,
    setIsDragOver,
    sensors,
    filteredItems,
    handleSave,
    handleKeyDown,
    handlePaste,
    handleDrop,
    togglePin,
    handleDelete,
    clearAll,
    copyToClipboard,
    handleDragEnd,
  };
}

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Navbar from '../components/layout/Navbar';
import ShareModal from '../components/files/ShareModal';
import { api, apiFetch } from '../lib/api';
import { ClipboardItem } from '../types';
import {
  DndContext,
  closestCenter,
  useSensor,
  useSensors,
  PointerSensor,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Copy,
  Check,
  Pin,
  Trash2,
  Share2,
  ExternalLink,
  Paperclip,
  X,
  Send,
  Search,
  Plus,
  Minus,
  GripVertical,
  FileText,
  Download,
  Image as ImageIcon,
  File as FileIcon,
  AlertCircle,
  Layers,
} from 'lucide-react';

/* ─── Background Type Detection ─── */
function detectType(value: string): 'link' | 'code' | 'text' {
  const trimmed = value.trim();
  if (!trimmed) return 'text';

  const urlPattern = /^(https?:\/\/|ftp:\/\/|mailto:)\S+$/i;
  const wwwPattern = /^www\.[a-z0-9-]+\.[a-z0-9]+(\/\S*)?$/i;
  if (urlPattern.test(trimmed) || wwwPattern.test(trimmed)) {
    return 'link';
  }

  const codePatterns = [
    /^\s*(import\s|export\s|function\s|const\s|let\s|var\s|class\s|interface\s|type\s)/m,
    /^\s*(def\s|from\s\w+\simport|public\s|private\s|protected\s|return\s)/m,
    /^\s*(if\s*\(|for\s*\(|while\s*\(|switch\s*\(|catch\s*\()/m,
    /^\s*<\/?([a-z][a-z0-9]*|!DOCTYPE)[^>]*>/i,
    /^#!\/(bin|usr)/m,
    /^\s*[{\[][\s\S]*[}\]]\s*$/,
    /^\s*(SELECT\s|INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM|CREATE\s+TABLE|ALTER\s+TABLE)/i,
    /^\s*(docker|docker-compose|kubectl|git|npm|npx|pnpm|yarn|curl|wget|ssh|scp|systemctl|journalctl|sudo|apt|apt-get|brew|pip|cat|grep|sed|awk|chmod|chown)\s+/m,
    /=>/,
  ];

  if (codePatterns.some(pattern => pattern.test(trimmed))) {
    return 'code';
  }

  const lines = trimmed.split('\n');
  if (lines.length >= 3) {
    const indented = lines.filter(l => /^\s{2,}/.test(l) || /^\t/.test(l));
    const syntaxChars = lines.filter(l => /[;{}()\[\]=]/.test(l));
    if (indented.length >= 2 || syntaxChars.length >= lines.length * 0.5) {
      return 'code';
    }
  }

  return 'text';
}

function formatRelativeTime(dateStr: string): string {
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const sec = Math.floor(diff / 1000);
    if (sec < 45) return 'just now';
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hours = Math.floor(min / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

function extractHostname(url: string): string {
  try {
    const full = url.startsWith('http') ? url : `https://${url}`;
    return new URL(full).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

export default function ClipboardPage() {
  const [items, setItems] = useState<ClipboardItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Global input state (unified for text, code, links AND files/images)
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

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 260)}px`;
  }, [inputValue]);

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

      // Reset
      setInputValue('');
      setInputTitle('');
      setShowTitle(false);
      setAttachedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
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

  // Allow pasting text AND image simultaneously from system clipboard
  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const clipItems = e.clipboardData?.items;
    if (!clipItems) return;

    for (let i = 0; i < clipItems.length; i++) {
      if (clipItems[i].type.startsWith('image/')) {
        const blob = clipItems[i].getAsFile();
        if (blob) {
          setAttachedFile(blob);
          // Don't preventDefault if there is also text being pasted!
          break;
        }
      }
    }
  }

  // Drag & drop file onto global input bar
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

  return (
    <div className="min-h-screen bg-[#0a0b0f] text-slate-100 flex flex-col selection:bg-red-500/25 selection:text-white">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 pt-24 pb-20">
        {/* ─── Header ─── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-7">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Clipboard</h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800/80 text-slate-400 border border-slate-700/50 font-medium">
                {items.length} {items.length === 1 ? 'item' : 'items'}
              </span>
            </div>
            <p className="text-slate-500 text-sm mt-1">
              Unified cloud clipboard: paste text, code, links, and images together
            </p>
          </div>

          {items.length > 0 && (
            <button
              onClick={clearAll}
              className="self-start sm:self-auto text-xs text-slate-500 hover:text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all"
            >
              Clear all
            </button>
          )}
        </div>

        {/* ─── Error Alert ─── */}
        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-sm flex items-center gap-3">
            <AlertCircle size={16} className="shrink-0" />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError('')} className="p-1 hover:text-red-200">
              <X size={14} />
            </button>
          </div>
        )}

        {/* ─── Unified Global Input Bar at Top ─── */}
        <div
          onDragOver={e => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          className={`mb-8 bg-[#11131a] border rounded-2xl shadow-xl transition-all duration-200 overflow-hidden ${
            isDragOver
              ? 'border-red-500/80 bg-red-500/[0.04] ring-2 ring-red-500/20'
              : 'border-slate-800/80 hover:border-slate-700/80 focus-within:border-red-500/50 focus-within:ring-1 focus-within:ring-red-500/20'
          }`}
        >
          {/* Collapsible Title row (+ / - toggle) */}
          {showTitle && (
            <div className="px-4 pt-3.5 pb-1 border-b border-slate-800/50">
              <input
                type="text"
                value={inputTitle}
                onChange={e => setInputTitle(e.target.value)}
                placeholder="Title or label (optional)"
                className="w-full bg-transparent text-sm text-slate-200 placeholder-slate-500 outline-none"
                autoFocus
              />
            </div>
          )}

          {/* Input Textarea */}
          <div className="p-4">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder="Paste anything here: text notes, code, commands, links, or drop images/files..."
              rows={2}
              className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 resize-none outline-none leading-relaxed min-h-[58px] max-h-[260px]"
            />

            {/* Attached File/Image Preview Inside Input */}
            {attachedFile && (
              <div className="mt-2.5 flex items-center justify-between p-2.5 rounded-xl bg-[#0a0b0f] border border-slate-800 max-w-md">
                <div className="flex items-center gap-2.5 min-w-0">
                  {filePreviewUrl ? (
                    <img
                      src={filePreviewUrl}
                      alt="attachment preview"
                      className="w-10 h-10 object-cover rounded-lg border border-slate-700 shrink-0"
                    />
                  ) : (
                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                      <FileIcon size={16} />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-200 truncate">{attachedFile.name}</p>
                    <p className="text-[10px] text-slate-500">
                      {(attachedFile.size / 1024).toFixed(1)} KB • {attachedFile.type || 'file'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAttachedFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors ml-2"
                  title="Remove attachment"
                >
                  <X size={15} />
                </button>
              </div>
            )}
          </div>

          {/* Bottom Bar Controls: Title Toggle (+/-), Attach File, Keyboard Hint & Save */}
          <div className="px-4 py-2.5 bg-[#0d0e14]/80 border-t border-slate-800/60 flex items-center justify-between gap-3">
            {/* Left side: Title (+/-) toggle button */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowTitle(v => !v)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  showTitle
                    ? 'text-red-400 bg-red-500/10 border border-red-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
                title={showTitle ? 'Hide title field' : 'Add title or label'}
              >
                {showTitle ? <Minus size={13} /> : <Plus size={13} />}
                <span>Title</span>
              </button>
            </div>

            {/* Right side: Attach file, shortcut hint & Save button */}
            <div className="flex items-center gap-2.5">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) setAttachedFile(f);
                }}
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`p-1.5 rounded-lg text-xs transition-colors flex items-center gap-1.5 ${
                  attachedFile
                    ? 'text-amber-400 bg-amber-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
                title="Attach file or image"
              >
                <Paperclip size={14} />
                <span className="hidden sm:inline text-xs text-slate-400">Attach</span>
              </button>

              <span className="hidden sm:inline text-[11px] text-slate-500 font-mono px-1">
                Ctrl+↵
              </span>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving || (!inputValue.trim() && !attachedFile)}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-red-600/20 active:scale-[0.98]"
              >
                {saving ? (
                  <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send size={13} />
                )}
                <span>Save</span>
              </button>
            </div>
          </div>
        </div>

        {/* ─── Search & Category Filter Bar ─── */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {[
              { id: 'all', label: 'All', icon: Layers },
              { id: 'pinned', label: 'Pinned', icon: Pin },
              { id: 'link', label: 'Links', icon: ExternalLink },
              { id: 'code', label: 'Code', icon: FileText },
              { id: 'text', label: 'Text', icon: FileText },
              { id: 'media', label: 'Media & Files', icon: Paperclip },
            ].map(tab => {
              const TabIcon = tab.icon;
              const isActive = activeFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveFilter(tab.id as any)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0 ${
                    isActive
                      ? 'bg-slate-800 text-white border border-slate-700/80 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <TabIcon size={13} className={isActive ? 'text-red-400' : ''} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search snippets..."
              className="w-full bg-[#11131a] border border-slate-800/80 rounded-xl pl-9 pr-8 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-slate-700 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* ─── Grid with Drag-and-Drop Reordering ─── */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(n => (
              <div
                key={n}
                className="h-36 bg-[#11131a]/60 border border-slate-800/50 rounded-2xl animate-pulse"
              />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-slate-800/80 rounded-2xl bg-[#11131a]/30">
            <div className="w-12 h-12 rounded-2xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-center mx-auto mb-3 text-slate-500">
              <FileText size={22} />
            </div>
            <p className="text-slate-300 font-medium text-sm">No clipboard items found</p>
            <p className="text-slate-500 text-xs mt-1">
              {searchQuery ? 'Try matching a different search term' : 'Paste notes, code, links, or drop images above'}
            </p>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={filteredItems.map(i => i.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredItems.map(item => (
                  <SortableClipboardCard
                    key={item.id}
                    item={item}
                    copied={copiedId === item.id}
                    onCopy={copyToClipboard}
                    onPin={togglePin}
                    onShare={() => setShareItem(item)}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </main>

      {/* ─── Share Modal (Public link & Share to website notes) ─── */}
      {shareItem && (
        <ShareModal
          open={Boolean(shareItem)}
          type="clip"
          itemId={shareItem.id}
          itemName={shareItem.title || (shareItem.content ? shareItem.content.slice(0, 30) : 'Clipboard Snippet')}
          onClose={() => setShareItem(null)}
        />
      )}
    </div>
  );
}

/* ─── Draggable Sortable Card ─── */
function SortableClipboardCard({
  item,
  copied,
  onCopy,
  onPin,
  onShare,
  onDelete,
}: {
  item: ClipboardItem;
  copied: boolean;
  onCopy: (text: string, id: number) => void;
  onPin: (id: number) => void;
  onShare: () => void;
  onDelete: (id: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.6 : 1,
  };

  const fileName = item.file_name || item.filename;
  const isImage = Boolean(item.file_path && (item.mime_type?.startsWith('image/') || item.type === 'image'));
  const isFile = Boolean(item.file_path && !isImage);
  const isLink = item.type === 'link';
  const isCode = item.type === 'code';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative flex flex-col justify-between rounded-2xl border transition-all duration-200 p-4 ${
        item.is_pinned
          ? 'bg-[#13141f] border-amber-500/35 shadow-[0_0_15px_rgba(245,158,11,0.06)]'
          : 'bg-[#11131a] border-slate-800/80 hover:border-slate-700/90 hover:bg-[#13151e]'
      }`}
    >
      {/* Top Bar: Drag Grip + Title / Domain + Relative Time + Action Icon Buttons */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-1.5 min-w-0">
          {/* Drag Handle Grip */}
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-slate-600 hover:text-slate-400 transition-colors"
            title="Drag to reorder card"
          >
            <GripVertical size={14} />
          </button>

          {/* Title or Link Hostname */}
          {item.title ? (
            <span className="text-xs font-semibold text-slate-200 truncate">{item.title}</span>
          ) : isLink && item.content ? (
            <span className="text-[11px] font-mono text-blue-400/90 truncate">
              {extractHostname(item.content)}
            </span>
          ) : (
            <span className="text-[11px] uppercase font-mono tracking-wider text-slate-500">
              {item.type}
            </span>
          )}
        </div>

        {/* Right side: Relative Time (No expiry date shown anywhere!) + Action Buttons */}
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[11px] text-slate-500 mr-1 select-none">
            {formatRelativeTime(item.created_at)}
          </span>

          {/* Copy Button */}
          {item.content && (
            <button
              type="button"
              onClick={() => onCopy(item.content!, item.id)}
              className={`p-1.5 rounded-lg text-xs transition-colors ${
                copied
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title={copied ? 'Copied!' : 'Copy content'}
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
            </button>
          )}

          {/* Link External Open Button */}
          {isLink && item.content && (
            <a
              href={item.content}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
              title="Open URL in new tab"
            >
              <ExternalLink size={13} />
            </a>
          )}

          {/* Share Button (Website users & Public link) */}
          <button
            type="button"
            onClick={onShare}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            title="Share snippet"
          >
            <Share2 size={13} />
          </button>

          {/* Pin Button */}
          <button
            type="button"
            onClick={() => onPin(item.id)}
            className={`p-1.5 rounded-lg text-xs transition-colors ${
              item.is_pinned
                ? 'text-amber-400 bg-amber-500/15 border border-amber-500/30'
                : 'text-slate-400 hover:text-amber-300 hover:bg-slate-800'
            }`}
            title={item.is_pinned ? 'Unpin snippet' : 'Pin snippet'}
          >
            <Pin size={13} className={item.is_pinned ? 'fill-amber-400' : ''} />
          </button>

          {/* Delete Button */}
          <button
            type="button"
            onClick={() => onDelete(item.id)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title="Delete snippet"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Card Content Body */}
      <div className="flex-1 flex flex-col gap-2.5">
        {/* 1. TEXT / CODE / LINK */}
        {isCode && item.content && (
          <div className="relative rounded-xl overflow-hidden border border-slate-850 bg-[#08090d]">
            <pre className="p-3 font-mono text-xs text-emerald-300/90 leading-relaxed overflow-x-auto max-h-48 selection:bg-emerald-500/20">
              <code>{item.content}</code>
            </pre>
          </div>
        )}

        {isLink && item.content && (
          <div className="p-2.5 rounded-xl bg-[#0a0b0f] border border-slate-800/80">
            <a
              href={item.content}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-400 hover:text-blue-300 break-all underline-offset-2 hover:underline leading-relaxed"
            >
              {item.content}
            </a>
          </div>
        )}

        {!isCode && !isLink && item.content && (
          <div className="text-xs text-slate-200/90 whitespace-pre-wrap leading-relaxed select-text font-normal max-h-52 overflow-y-auto">
            {item.content}
          </div>
        )}

        {/* 2. ATTACHED IMAGE (Shown together with text if both exist) */}
        {isImage && (item.file_path || fileName) && (
          <div className="mt-1">
            <a
              href={item.file_path || `/uploads/clipboard/${fileName}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block overflow-hidden rounded-xl border border-slate-800 bg-[#0a0b0f] max-h-48 w-full"
            >
              <img
                src={item.file_path || `/uploads/clipboard/${fileName}`}
                alt={item.title || fileName || 'Clipboard image'}
                className="w-full h-36 object-contain hover:scale-[1.02] transition-transform duration-200"
                loading="lazy"
              />
            </a>
          </div>
        )}

        {/* 3. ATTACHED FILE */}
        {isFile && (item.file_path || fileName) && (
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#0a0b0f] border border-slate-800 mt-1">
            <div className="flex items-center gap-2 min-w-0">
              <FileIcon size={14} className="text-amber-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-200 truncate">
                  {fileName || 'Download File'}
                </p>
                {item.file_size && (
                  <p className="text-[10px] text-slate-500">
                    {(item.file_size / 1024).toFixed(1)} KB
                  </p>
                )}
              </div>
            </div>
            <a
              href={item.file_path || `/uploads/clipboard/${fileName}`}
              download={fileName || true}
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors flex items-center"
              title="Download file"
            >
              <Download size={13} />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import Navbar from '../components/layout/Navbar';
import { api, apiFetch } from '../lib/api';
import { ClipboardItem } from '../types';
import {
  Copy,
  Check,
  Pin,
  Trash2,
  Link as LinkIcon,
  Code2,
  FileText,
  Image,
  File,
  Plus,
  X,
  SendHorizonal,
} from 'lucide-react';

/* ─── Type detection ─── */
function detectType(value: string): ClipboardItem['type'] {
  const trimmed = value.trim();
  if (/^https?:\/\/\S+$/.test(trimmed)) return 'link';
  if (
    /^\s*(function|const|let|var|import|export|class|def |if |for |while |<\w|#!\/|{|}|\[|\]|=>)/.test(trimmed) ||
    trimmed.split('\n').length > 3
  ) return 'code';
  return 'text';
}

/* ─── Type config ─── */
const TYPE_CONFIG: Record<string, { label: string; Icon: React.ComponentType<{ size?: number; className?: string }>; color: string; bg: string }> = {
  text:  { label: 'Text',  Icon: FileText, color: 'text-slate-400',   bg: 'bg-slate-500/10 border-slate-500/20' },
  code:  { label: 'Code',  Icon: Code2,    color: 'text-emerald-400',  bg: 'bg-emerald-500/10 border-emerald-500/20' },
  link:  { label: 'Link',  Icon: LinkIcon, color: 'text-blue-400',     bg: 'bg-blue-500/10 border-blue-500/20' },
  image: { label: 'Image', Icon: Image,    color: 'text-purple-400',   bg: 'bg-purple-500/10 border-purple-500/20' },
  file:  { label: 'File',  Icon: File,     color: 'text-orange-400',   bg: 'bg-orange-500/10 border-orange-500/20' },
};

function formatRelativeTime(d: string): string {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function ClipboardPage() {
  const [items, setItems] = useState<ClipboardItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Global input state
  const [inputValue, setInputValue] = useState('');
  const [inputTitle, setInputTitle] = useState('');
  const [overrideType, setOverrideType] = useState<ClipboardItem['type'] | null>(null);
  const [showTitleInput, setShowTitleInput] = useState(false);
  const [fileMode, setFileMode] = useState<'image' | 'file' | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Copy feedback
  const [copied, setCopied] = useState<number | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { load(); }, []);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [inputValue]);

  async function load() {
    try {
      setLoading(true);
      setItems(await api.get<ClipboardItem[]>('/clipboard'));
    } catch { setError('Failed to load clipboard'); }
    finally { setLoading(false); }
  }

  const detectedType = overrideType ?? (fileMode ?? (inputValue.trim() ? detectType(inputValue) : 'text'));

  async function handleSave() {
    setError('');
    const isFileSave = fileMode !== null;
    if (isFileSave && !file) return setError('Please select a file');
    if (!isFileSave && !inputValue.trim()) return;

    setSaving(true);
    try {
      if (isFileSave) {
        const fd = new FormData();
        fd.append('type', fileMode!);
        if (inputTitle) fd.append('title', inputTitle);
        fd.append('file', file!);
        await apiFetch('/clipboard', { method: 'POST', body: fd });
      } else {
        await api.post('/clipboard', {
          type: detectedType,
          title: inputTitle || null,
          content: inputValue.trim(),
        });
      }
      // Reset
      setInputValue('');
      setInputTitle('');
      setOverrideType(null);
      setShowTitleInput(false);
      setFileMode(null);
      setFile(null);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function togglePin(id: number) {
    await api.patch(`/clipboard/${id}/pin`);
    load();
  }

  async function handleDelete(id: number) {
    await api.delete(`/clipboard/${id}`);
    setItems(prev => prev.filter(x => x.id !== id));
  }

  async function clearAll() {
    if (!confirm('Clear all clipboard items?')) return;
    await apiFetch('/clipboard', { method: 'DELETE' });
    setItems([]);
  }

  function copyToClipboard(text: string, id: number) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 1800);
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Ctrl+Enter or Cmd+Enter to save
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
  }

  const pinned = items.filter(i => i.is_pinned);
  const rest = items.filter(i => !i.is_pinned);
  const ordered = [...pinned, ...rest];

  const TypeIcon = TYPE_CONFIG[detectedType]?.Icon ?? FileText;
  const typeColor = TYPE_CONFIG[detectedType]?.color ?? 'text-slate-400';

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-24 pb-16">

        {/* ─── Page header ─── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Clipboard</h1>
            <p className="text-slate-500 text-sm mt-0.5">Sync snippets across devices</p>
          </div>
          {items.length > 0 && (
            <button
              onClick={clearAll}
              className="text-xs text-slate-600 hover:text-red-400 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-500/[0.06]"
            >
              Clear all
            </button>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
            <X size={14} className="shrink-0" />
            {error}
            <button onClick={() => setError('')} className="ml-auto"><X size={12} /></button>
          </div>
        )}

        {/* ─── Global input card ─── */}
        <div className="mb-8 bg-[#16181f] border border-slate-800/60 rounded-2xl overflow-hidden shadow-lg">
          {/* Textarea or file area */}
          {fileMode ? (
            <div className="px-4 pt-4 pb-2">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-700/60 rounded-xl py-8 cursor-pointer hover:border-red-500/40 hover:bg-red-500/[0.03] transition-all"
              >
                {file ? (
                  <>
                    <span className="text-sm font-medium text-slate-200">{file.name}</span>
                    <span className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</span>
                  </>
                ) : (
                  <>
                    <FileText size={24} className="text-slate-600" />
                    <span className="text-sm text-slate-500">Click to select {fileMode}</span>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept={fileMode === 'image' ? 'image/*' : undefined}
                className="hidden"
                onChange={e => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={e => { setInputValue(e.target.value); setOverrideType(null); }}
              onKeyDown={handleKeyDown}
              placeholder="Paste anything — text, URL, code…"
              rows={3}
              className="w-full bg-transparent px-4 pt-4 pb-2 text-sm text-slate-200 placeholder-slate-600 resize-none outline-none min-h-[80px] max-h-[400px] overflow-y-auto"
              style={{ height: 'auto' }}
            />
          )}

          {/* Optional title */}
          {showTitleInput && (
            <div className="px-4 pb-2">
              <input
                value={inputTitle}
                onChange={e => setInputTitle(e.target.value)}
                placeholder="Label (optional)"
                className="w-full bg-white/[0.03] border border-slate-700/40 rounded-lg px-3 py-1.5 text-xs text-slate-300 placeholder-slate-600 outline-none focus:border-red-500/40 transition-colors"
              />
            </div>
          )}

          {/* Bottom toolbar */}
          <div className="flex items-center gap-2 px-3 py-2.5 border-t border-slate-800/50">
            {/* Type selector pills */}
            <div className="flex items-center gap-1">
              {(['text', 'code', 'link', 'image', 'file'] as ClipboardItem['type'][]).map(t => {
                const { label, Icon } = TYPE_CONFIG[t];
                const isActive = detectedType === t;
                return (
                  <button
                    key={t}
                    onClick={() => {
                      if (t === 'image' || t === 'file') {
                        setFileMode(fileMode === t ? null : t);
                        setOverrideType(null);
                        setInputValue('');
                      } else {
                        setFileMode(null);
                        setOverrideType(isActive ? null : t);
                      }
                    }}
                    title={label}
                    className={`p-1.5 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-white/[0.07] text-slate-200'
                        : 'text-slate-600 hover:text-slate-400 hover:bg-white/[0.04]'
                    }`}
                  >
                    <Icon size={14} />
                  </button>
                );
              })}
            </div>

            {/* Detected type label */}
            <span className={`text-[10px] font-semibold uppercase tracking-wider ${typeColor}`}>
              <TypeIcon size={10} className="inline mr-1" />
              {TYPE_CONFIG[detectedType]?.label}
            </span>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Label toggle */}
            <button
              onClick={() => setShowTitleInput(v => !v)}
              className={`text-xs px-2 py-1 rounded-lg transition-colors ${showTitleInput ? 'text-slate-300 bg-white/[0.06]' : 'text-slate-600 hover:text-slate-400'}`}
              title="Add label"
            >
              <Plus size={13} />
            </button>

            {/* Save */}
            <button
              onClick={handleSave}
              disabled={saving || (!inputValue.trim() && !file)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold transition-all"
            >
              {saving ? (
                <span className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <SendHorizonal size={13} />
              )}
              Save
            </button>
          </div>

          {/* Keyboard hint */}
          {inputValue.trim() && (
            <p className="px-4 pb-2 text-[10px] text-slate-700">
              <kbd className="font-mono">Ctrl+Enter</kbd> to save
            </p>
          )}
        </div>

        {/* ─── Items list ─── */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-[#16181f] border border-slate-800/40 rounded-xl h-20 animate-pulse" />
            ))}
          </div>
        ) : ordered.length === 0 ? (
          <div className="text-center py-16 text-slate-600">
            <FileText size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nothing saved yet — paste something above</p>
          </div>
        ) : (
          <div className="space-y-2">
            {pinned.length > 0 && rest.length > 0 && (
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-700 px-1 mb-1">Pinned</p>
            )}
            {pinned.map(item => <ClipCard key={item.id} item={item} copied={copied} onCopy={copyToClipboard} onPin={togglePin} onDelete={handleDelete} />)}

            {pinned.length > 0 && rest.length > 0 && (
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-700 px-1 pt-2 mb-1">Recent</p>
            )}
            {rest.map(item => <ClipCard key={item.id} item={item} copied={copied} onCopy={copyToClipboard} onPin={togglePin} onDelete={handleDelete} />)}
          </div>
        )}
      </main>
    </div>
  );
}

/* ─── Individual item card ─── */
function ClipCard({
  item,
  copied,
  onCopy,
  onPin,
  onDelete,
}: {
  item: ClipboardItem;
  copied: number | null;
  onCopy: (text: string, id: number) => void;
  onPin: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  const { Icon, color, bg } = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.text;
  const isCopied = copied === item.id;

  return (
    <div
      className={`group relative bg-[#16181f] border rounded-xl px-4 py-3 transition-all hover:border-slate-700/60 ${
        item.is_pinned ? 'border-yellow-500/20 shadow-[0_0_0_1px_rgba(234,179,8,0.08)]' : 'border-slate-800/50'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Type icon */}
        <div className={`shrink-0 mt-0.5 p-1.5 rounded-lg border ${bg}`}>
          <Icon size={12} className={color} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title / header row */}
          <div className="flex items-center gap-2 mb-1">
            {item.title && (
              <span className="text-xs font-semibold text-slate-200 truncate">{item.title}</span>
            )}
            <span className={`text-[10px] font-mono uppercase ${color} opacity-70`}>{item.type}</span>
            {item.is_pinned && (
              <span className="text-[9px] font-bold uppercase tracking-wider text-yellow-500/70">pinned</span>
            )}
            <span className="text-[10px] text-slate-700 ml-auto shrink-0">{formatRelativeTime(item.created_at)}</span>
          </div>

          {/* Preview */}
          {item.type === 'image' && item.file_name && (
            <img
              src={`/uploads/clipboard/${item.file_name}`}
              alt={item.title || 'image'}
              className="max-h-40 rounded-lg object-contain"
            />
          )}
          {item.type === 'code' && item.content && (
            <pre className="text-xs font-mono text-slate-300 bg-black/30 rounded-lg px-3 py-2.5 overflow-x-auto max-h-36 whitespace-pre-wrap leading-relaxed">
              {item.content}
            </pre>
          )}
          {item.type === 'link' && item.content && (
            <a
              href={item.content}
              target="_blank"
              rel="noreferrer"
              className="text-blue-400 hover:text-blue-300 text-sm break-all underline-offset-2 hover:underline"
            >
              {item.content}
            </a>
          )}
          {item.type === 'file' && item.file_name && (
            <a
              href={`/uploads/clipboard/${item.file_name}`}
              target="_blank"
              rel="noreferrer"
              className="text-orange-400 hover:text-orange-300 text-sm flex items-center gap-1.5"
            >
              <File size={12} />
              {item.file_name}
              {item.file_size ? <span className="text-slate-600 text-xs">({(item.file_size / 1024).toFixed(1)} KB)</span> : null}
            </a>
          )}
          {item.type === 'text' && item.content && (
            <p className="text-slate-300 text-sm whitespace-pre-wrap line-clamp-4 leading-relaxed">
              {item.content}
            </p>
          )}
        </div>

        {/* Actions — visible on hover */}
        <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          {item.content && (
            <button
              onClick={() => onCopy(item.content!, item.id)}
              title="Copy"
              className={`p-1.5 rounded-lg transition-colors ${
                isCopied
                  ? 'text-emerald-400 bg-emerald-500/10'
                  : 'text-slate-600 hover:text-slate-300 hover:bg-white/[0.05]'
              }`}
            >
              {isCopied ? <Check size={13} /> : <Copy size={13} />}
            </button>
          )}
          <button
            onClick={() => onPin(item.id)}
            title={item.is_pinned ? 'Unpin' : 'Pin'}
            className={`p-1.5 rounded-lg transition-colors ${
              item.is_pinned
                ? 'text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/[0.08]'
                : 'text-slate-600 hover:text-slate-300 hover:bg-white/[0.05]'
            }`}
          >
            <Pin size={13} />
          </button>
          <button
            onClick={() => onDelete(item.id)}
            title="Delete"
            className="p-1.5 rounded-lg text-slate-700 hover:text-red-400 hover:bg-red-500/[0.08] transition-colors"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

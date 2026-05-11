import { useState, useEffect } from 'react';
import Navbar from '../components/layout/Navbar';
import { api, apiFetch } from '../lib/api';
import { ClipboardItem } from '../types';

const TYPE_COLORS: Record<string, string> = { text: 'text-slate-400', code: 'text-emerald-400', link: 'text-blue-400', image: 'text-purple-400', file: 'text-orange-400' };

function formatExpiry(d: string | null): string | null {
  if (!d) return null;
  const diff = new Date(d).getTime() - Date.now();
  if (diff < 0) return 'Expired';
  const h = Math.floor(diff / 3600000);
  if (h < 1) return `Expires in <1h`;
  if (h < 24) return `Expires in ${h}h`;
  return `Expires in ${Math.floor(h / 24)}d`;
}

export default function ClipboardPage() {
  const [items, setItems] = useState<ClipboardItem[]>([]);
  const [showAdd, setShowAdd] = useState<boolean>(false);
  const [type, setType] = useState<string>('text');
  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [expiry, setExpiry] = useState<string>('never');
  const [file, setFile] = useState<File | null>(null);
  const [copied, setCopied] = useState<number | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => { load(); }, []);

  async function load() {
    try { setItems(await api.get<ClipboardItem[]>('/clipboard')); } catch { setError('Failed to load clipboard'); }
  }

  async function handleAdd() {
    setError('');
    try {
      if (type === 'image' || type === 'file') {
        if (!file) return setError('Please select a file');
        const fd = new FormData();
        fd.append('type', type);
        if (title) fd.append('title', title);
        fd.append('expiry', expiry);
        fd.append('file', file);
        await apiFetch('/clipboard', { method: 'POST', body: fd });
      } else {
        await api.post('/clipboard', { type, title: title || null, content, expiry });
      }
      setShowAdd(false);
      setType('text'); setTitle(''); setContent(''); setExpiry('never'); setFile(null);
      load();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed to add item'); }
  }

  async function togglePin(id: number) {
    await api.patch(`/clipboard/${id}/pin`);
    load();
  }

  async function handleDelete(id: number) {
    await api.delete(`/clipboard/${id}`);
    setItems(i => i.filter(x => x.id !== id));
  }

  async function clearAll() {
    if (!confirm('Clear all clipboard items?')) return;
    await apiFetch('/clipboard', { method: 'DELETE' });
    setItems([]);
  }

  function copyToClipboard(text: string, id: number) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  const pinned = items.filter(i => i.is_pinned);
  const rest = items.filter(i => !i.is_pinned);

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-24 pb-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Clipboard</h1>
            <p className="text-slate-500 text-sm mt-1">Sync across devices</p>
          </div>
          <div className="flex gap-2">
            {items.length > 0 && <button onClick={clearAll} className="btn-outline text-sm">Clear all</button>}
            <button onClick={() => setShowAdd(s => !s)} className="btn-primary text-sm">{showAdd ? 'Cancel' : 'Add item'}</button>
          </div>
        </div>

        {error && <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>}

        {showAdd && (
          <div className="card p-5 mb-6">
            <div className="flex gap-2 mb-4 flex-wrap">
              {['text', 'code', 'link', 'image', 'file'].map(t => (
                <button key={t} onClick={() => setType(t)} className={`px-3 py-1 rounded-lg text-sm capitalize transition-colors ${type === t ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}>{t}</button>
              ))}
            </div>
            <div className="space-y-3">
              <input value={title} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)} className="input-field w-full" placeholder="Title (optional)" />
              {(type === 'text' || type === 'code' || type === 'link') && (
                <textarea value={content} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setContent(e.target.value)} className={`input-field w-full min-h-[100px] ${type === 'code' ? 'font-mono text-sm' : ''}`} placeholder={type === 'link' ? 'https://...' : 'Paste content...'} />
              )}
              {(type === 'image' || type === 'file') && (
                <input type="file" accept={type === 'image' ? 'image/*' : undefined} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFile(e.target.files?.[0] ?? null)} className="input-field w-full" />
              )}
              <div className="flex items-center gap-3">
                <select value={expiry} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setExpiry(e.target.value)} className="input-field">
                  <option value="never">No expiry</option>
                  <option value="1h">1 hour</option>
                  <option value="24h">24 hours</option>
                  <option value="7d">7 days</option>
                </select>
                <button onClick={handleAdd} className="btn-primary">Save</button>
              </div>
            </div>
          </div>
        )}

        {items.length === 0 && (
          <div className="card p-12 text-center">
            <p className="text-slate-400">Clipboard is empty. Add your first item above.</p>
          </div>
        )}

        {[...pinned, ...rest].map(item => (
          <div key={item.id} className="card p-4 mb-3">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className={`text-xs font-mono uppercase ${TYPE_COLORS[item.type] || 'text-slate-400'}`}>{item.type}</span>
                  {item.is_pinned && <span className="badge text-xs text-yellow-400 border border-yellow-500/30 bg-yellow-500/10">pinned</span>}
                  {formatExpiry(item.expires_at) && <span className="text-xs text-slate-500">{formatExpiry(item.expires_at)}</span>}
                  {item.title && <span className="text-sm font-medium text-slate-200">{item.title}</span>}
                </div>

                {item.type === 'image' && item.file_name && (
                  <img src={`/uploads/clipboard/${item.file_name}`} alt={item.title || 'image'} className="max-h-48 rounded-lg object-contain mb-2" />
                )}
                {item.type === 'code' && item.content && (
                  <pre className="text-xs font-mono text-slate-300 bg-slate-900/50 rounded-lg p-3 overflow-x-auto max-h-48 whitespace-pre-wrap">{item.content}</pre>
                )}
                {item.type === 'link' && item.content && (
                  <a href={item.content} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 text-sm break-all">{item.content}</a>
                )}
                {item.type === 'file' && item.file_name && (
                  <a href={`/uploads/clipboard/${item.file_name}`} target="_blank" rel="noreferrer" className="text-orange-400 hover:text-orange-300 text-sm">
                    {item.file_name} {item.file_size ? `(${(item.file_size / 1024).toFixed(1)} KB)` : ''}
                  </a>
                )}
                {item.type === 'text' && item.content && (
                  <p className="text-slate-300 text-sm whitespace-pre-wrap line-clamp-4">{item.content}</p>
                )}
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                {item.content && (
                  <button onClick={() => copyToClipboard(item.content!, item.id)} className="px-2 py-1 text-xs rounded text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors">
                    {copied === item.id ? 'Copied!' : 'Copy'}
                  </button>
                )}
                <button onClick={() => togglePin(item.id)} className={`px-2 py-1 text-xs rounded transition-colors ${item.is_pinned ? 'text-yellow-400 hover:text-yellow-300' : 'text-slate-500 hover:text-slate-300'} hover:bg-slate-700/50`}>
                  Pin
                </button>
                <button onClick={() => handleDelete(item.id)} className="px-2 py-1 text-xs rounded text-slate-500 hover:text-red-400 hover:bg-slate-700/50 transition-colors">&times;</button>
              </div>
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}

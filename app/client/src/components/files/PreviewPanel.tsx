import { useState, useEffect, useRef } from 'react';
import { X, Edit2, Save, XCircle, Download, Code, Eye, FileText, Image, Video, Music, Archive, FileCode, File, Maximize2 } from 'lucide-react';
import { marked } from 'marked';
import { api } from '../../lib/api';
import type { FileItem } from './FileCard';

interface Props {
  file: FileItem | null;
  onClose: () => void;
  onSaved: (id: number, size: number) => void;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isEditable(mime: string, name: string) {
  if (mime.startsWith('text/')) return true;
  if (['application/json', 'application/javascript', 'application/xml', 'application/x-sh'].some(m => mime.includes(m))) return true;
  const exts = ['.md', '.mdx', '.txt', '.js', '.ts', '.tsx', '.jsx', '.json', '.css', '.html', '.htm',
    '.xml', '.yml', '.yaml', '.sh', '.py', '.go', '.rs', '.java', '.c', '.cpp', '.h', '.env',
    '.gitignore', '.toml', '.ini', '.cfg', '.sql', '.graphql', '.vue', '.svelte'];
  return exts.some(e => name.toLowerCase().endsWith(e));
}

function isMarkdown(name: string) {
  return name.toLowerCase().endsWith('.md') || name.toLowerCase().endsWith('.mdx');
}

function isHtml(name: string, mime: string) {
  return name.toLowerCase().endsWith('.html') || name.toLowerCase().endsWith('.htm') || mime === 'text/html';
}

function typeColor(mime: string) {
  if (mime.startsWith('image/')) return 'text-cyan-400';
  if (mime.startsWith('video/')) return 'text-purple-400';
  if (mime.startsWith('audio/')) return 'text-pink-400';
  if (mime.includes('pdf')) return 'text-red-400';
  if (mime.includes('zip') || mime.includes('tar') || mime.includes('gzip') || mime.includes('rar')) return 'text-yellow-400';
  if (mime.includes('javascript') || mime.includes('json') || mime.includes('html') || mime.includes('css') || mime.includes('typescript')) return 'text-green-400';
  return 'text-slate-400';
}

function TypeIcon({ mime, size = 36 }: { mime: string; size?: number }) {
  const cls = `${typeColor(mime)} opacity-60`;
  if (mime.startsWith('image/')) return <Image size={size} className={cls} />;
  if (mime.startsWith('video/')) return <Video size={size} className={cls} />;
  if (mime.startsWith('audio/')) return <Music size={size} className={cls} />;
  if (mime.includes('zip') || mime.includes('tar') || mime.includes('rar')) return <Archive size={size} className={cls} />;
  if (mime.includes('javascript') || mime.includes('typescript') || mime.includes('html') || mime.includes('css') || mime.includes('json'))
    return <FileCode size={size} className={cls} />;
  if (mime.startsWith('text/')) return <FileText size={size} className={cls} />;
  return <File size={size} className={cls} />;
}

export default function PreviewPanel({ file, onClose, onSaved }: Props) {
  const [content, setContent] = useState<string | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [renderView, setRenderView] = useState<'preview' | 'code'>('preview');
  const [lightbox, setLightbox] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!file) { setContent(null); setEditing(false); return; }
    setContent(null);
    setEditing(false);
    setRenderView('preview');
    if (isEditable(file.mime_type, file.original_name)) {
      setLoadingContent(true);
      api.get<{ content: string }>(`/files/${file.id}/content`)
        .then(d => { setContent(d.content); setEditValue(d.content); })
        .catch(() => setContent(null))
        .finally(() => setLoadingContent(false));
    }
  }, [file?.id]);

  useEffect(() => {
    if (editing) textareaRef.current?.focus();
  }, [editing]);

  async function handleSave() {
    if (!file) return;
    setSaving(true);
    try {
      const res = await api.put<{ size: number }>(`/files/${file.id}/content`, { content: editValue });
      setContent(editValue);
      setEditing(false);
      onSaved(file.id, res.size);
    } catch {}
    finally { setSaving(false); }
  }

  if (!file) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-700 p-6">
        <FileText size={40} className="mb-3 opacity-40" />
        <p className="text-sm text-center">Select a file<br />to preview</p>
      </div>
    );
  }

  const canEdit = isEditable(file.mime_type, file.original_name);
  const isMd = isMarkdown(file.original_name);
  const isHtmlFile = isHtml(file.original_name, file.mime_type);
  const hasToggle = (isMd || isHtmlFile) && !editing;
  const isImg = file.mime_type.startsWith('image/');
  const isVid = file.mime_type.startsWith('video/');
  const isAud = file.mime_type.startsWith('audio/');
  const isPdf = file.mime_type === 'application/pdf';

  return (
    <>
      <div className="flex flex-col h-full p-4 gap-3">

        {/* Header */}
        <div className="flex items-start justify-between gap-2 shrink-0">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-100 truncate leading-tight" title={file.original_name}>
              {file.original_name}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {formatSize(file.size)} · {new Date(file.created_at).toLocaleDateString()}
            </p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-600 hover:text-slate-300 transition-colors shrink-0">
            <X size={14} />
          </button>
        </div>

        {/* Action bar */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <a href={file.file_path} download={file.original_name}
            className="btn btn-outline text-xs py-1 px-2.5 flex items-center gap-1.5">
            <Download size={11} /> Download
          </a>
          {canEdit && !editing && (
            <button onClick={() => setEditing(true)}
              className="btn btn-outline text-xs py-1 px-2.5 flex items-center gap-1.5">
              <Edit2 size={11} /> Edit
            </button>
          )}
          {editing && (
            <>
              <button onClick={handleSave} disabled={saving}
                className="btn btn-primary text-xs py-1 px-2.5 flex items-center gap-1.5">
                <Save size={11} /> {saving ? 'Saving…' : 'Save'}
              </button>
              <button onClick={() => { setEditValue(content ?? ''); setEditing(false); }}
                className="btn btn-outline text-xs py-1 px-2.5 flex items-center gap-1.5 text-slate-400">
                <XCircle size={11} /> Cancel
              </button>
            </>
          )}
        </div>

        {/* Toggle for markdown / html */}
        {hasToggle && (
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => setRenderView('preview')}
              className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-md transition-colors
                ${renderView === 'preview' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
              <Eye size={11} /> {isHtmlFile ? 'Rendered' : 'Preview'}
            </button>
            <button onClick={() => setRenderView('code')}
              className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-md transition-colors
                ${renderView === 'code' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
              <Code size={11} /> Code
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto">

          {/* Image */}
          {isImg && (
            <div className="relative group rounded-lg overflow-hidden border border-slate-700/50 bg-slate-900/40 cursor-pointer"
              onClick={() => setLightbox(true)}>
              <img src={file.file_path} alt={file.original_name}
                className="w-full object-contain max-h-72" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                <Maximize2 size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          )}

          {/* Video */}
          {isVid && (
            <video controls className="w-full rounded-lg border border-slate-700/50">
              <source src={file.file_path} type={file.mime_type} />
            </video>
          )}

          {/* Audio */}
          {isAud && (
            <div className="p-5 rounded-lg border border-slate-700/50 bg-slate-900/40 flex flex-col items-center gap-4">
              <Music size={48} className="text-pink-400 opacity-50" />
              <audio controls className="w-full">
                <source src={file.file_path} type={file.mime_type} />
              </audio>
            </div>
          )}

          {/* PDF */}
          {isPdf && (
            <embed
              src={file.file_path}
              type="application/pdf"
              className="w-full rounded-lg border border-slate-700/50"
              style={{ height: '520px' }}
            />
          )}

          {/* Text / Markdown / HTML / Code */}
          {canEdit && (
            <>
              {loadingContent && (
                <div className="flex items-center justify-center h-24 text-slate-600 text-sm">Loading…</div>
              )}

              {!loadingContent && content !== null && !editing && (
                <>
                  {/* Markdown rendered */}
                  {isMd && renderView === 'preview' && (
                    <div className="prose prose-invert prose-sm max-w-none text-slate-300 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: marked.parse(content) as string }} />
                  )}

                  {/* HTML rendered */}
                  {isHtmlFile && renderView === 'preview' && (
                    <iframe
                      srcDoc={content}
                      sandbox="allow-scripts allow-forms"
                      className="w-full rounded-lg border border-slate-700/50 bg-white"
                      style={{ height: '480px' }}
                      title={file.original_name}
                    />
                  )}

                  {/* Code view (markdown, html in code mode, or any other text) */}
                  {(renderView === 'code' || (!isMd && !isHtmlFile)) && (
                    <pre className="text-xs text-slate-300 whitespace-pre-wrap break-words font-mono bg-slate-900/60 rounded-lg p-3 border border-slate-700/50 leading-relaxed">
                      {content || <span className="text-slate-600 italic">Empty file</span>}
                    </pre>
                  )}
                </>
              )}

              {/* Edit mode textarea */}
              {editing && (
                <textarea
                  ref={textareaRef}
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  className="w-full bg-slate-900/70 border border-slate-600 rounded-lg p-3 text-xs text-slate-200 font-mono resize-none outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 leading-relaxed"
                  style={{ minHeight: '320px' }}
                  placeholder="Start typing…"
                />
              )}
            </>
          )}

          {/* No preview available */}
          {!canEdit && !isImg && !isVid && !isAud && !isPdf && (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-slate-700">
              <TypeIcon mime={file.mime_type} size={48} />
              <p className="text-sm">No preview available</p>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && isImg && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-6 cursor-zoom-out"
          onClick={() => setLightbox(false)}
        >
          <button
            className="absolute top-4 right-4 p-2 text-white/60 hover:text-white transition-colors"
            onClick={() => setLightbox(false)}
          >
            <X size={24} />
          </button>
          <img
            src={file.file_path}
            alt={file.original_name}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/50 text-sm">
            {file.original_name}
          </p>
        </div>
      )}
    </>
  );
}

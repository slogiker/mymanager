import { useEffect, useRef, useState } from 'react';
import { X, Download, Edit2, Save, XCircle, Eye, Code, ZoomIn, ZoomOut } from 'lucide-react';
import { marked } from 'marked';
import { api } from '../../lib/api';
import type { FileItem } from './FileCard';

interface Props {
  file: FileItem;
  onClose: () => void;
  onSaved: (id: number, size: number) => void;
}

function isEditable(mime: string, name: string) {
  if (mime.startsWith('text/')) return true;
  if (['application/json', 'application/javascript', 'application/xml'].some(m => mime.includes(m))) return true;
  const exts = ['.md','.mdx','.txt','.js','.ts','.tsx','.jsx','.json','.css','.html','.htm',
    '.xml','.yml','.yaml','.sh','.py','.go','.rs','.java','.c','.cpp','.h','.env','.toml','.sql','.graphql'];
  return exts.some(e => name.toLowerCase().endsWith(e));
}

export default function FullscreenViewer({ file, onClose, onSaved }: Props) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [renderView, setRenderView] = useState<'preview' | 'code'>('preview');
  const [imgZoom, setImgZoom] = useState(1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isImg = file.mime_type.startsWith('image/');
  const isVid = file.mime_type.startsWith('video/');
  const isAud = file.mime_type.startsWith('audio/');
  const isPdf = file.mime_type === 'application/pdf';
  const isMd = file.original_name.toLowerCase().endsWith('.md') || file.original_name.toLowerCase().endsWith('.mdx');
  const isHtml = file.original_name.toLowerCase().endsWith('.html') || file.original_name.toLowerCase().endsWith('.htm');
  const canEdit = isEditable(file.mime_type, file.original_name);
  const hasToggle = (isMd || isHtml) && !editing;

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    if (!canEdit) return;
    setLoading(true);
    api.get<{ content: string }>(`/files/${file.id}/content`)
      .then(d => { setContent(d.content); setEditValue(d.content); })
      .catch(() => setContent(null))
      .finally(() => setLoading(false));
  }, [file.id, canEdit]);

  useEffect(() => { if (editing) textareaRef.current?.focus(); }, [editing]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await api.put<{ size: number }>(`/files/${file.id}/content`, { content: editValue });
      setContent(editValue);
      setEditing(false);
      onSaved(file.id, res.size);
    } catch {}
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-6 py-3 border-b border-white/10">
        <div className="flex items-center gap-3 min-w-0">
          <p className="text-sm font-medium text-white truncate">{file.original_name}</p>
          {hasToggle && (
            <div className="flex items-center gap-1 bg-white/10 rounded-lg p-0.5">
              <button onClick={() => setRenderView('preview')}
                className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-md transition-colors ${renderView === 'preview' ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white/80'}`}>
                <Eye size={11} /> {isHtml ? 'Rendered' : 'Preview'}
              </button>
              <button onClick={() => setRenderView('code')}
                className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-md transition-colors ${renderView === 'code' ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white/80'}`}>
                <Code size={11} /> Code
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isImg && (
            <>
              <button onClick={() => setImgZoom(z => Math.max(0.25, z - 0.25))} className="p-2 text-white/50 hover:text-white transition-colors"><ZoomOut size={16} /></button>
              <span className="text-white/40 text-xs w-10 text-center">{Math.round(imgZoom * 100)}%</span>
              <button onClick={() => setImgZoom(z => Math.min(4, z + 0.25))} className="p-2 text-white/50 hover:text-white transition-colors"><ZoomIn size={16} /></button>
            </>
          )}
          {canEdit && !editing && (
            <button onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white/80 hover:text-white rounded-lg transition-colors">
              <Edit2 size={12} /> Edit
            </button>
          )}
          {editing && (
            <>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-cyan-500/80 hover:bg-cyan-500 text-white rounded-lg transition-colors">
                <Save size={12} /> {saving ? 'Saving…' : 'Save'}
              </button>
              <button onClick={() => { setEditValue(content ?? ''); setEditing(false); }}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white/60 hover:text-white rounded-lg transition-colors">
                <XCircle size={12} /> Cancel
              </button>
            </>
          )}
          <a href={file.file_path} download={file.original_name}
            className="p-2 text-white/50 hover:text-white transition-colors">
            <Download size={16} />
          </a>
          <button onClick={onClose} className="p-2 text-white/50 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-auto flex items-start justify-center p-6">
        {isImg && (
          <div className="transition-transform duration-150" style={{ transform: `scale(${imgZoom})`, transformOrigin: 'top center' }}>
            <img src={file.file_path} alt={file.original_name}
              className="max-w-full rounded-lg shadow-2xl" style={{ maxHeight: 'calc(100vh - 120px)' }} />
          </div>
        )}

        {isVid && (
          <video controls autoPlay className="max-w-full max-h-full rounded-lg shadow-2xl">
            <source src={file.file_path} type={file.mime_type} />
          </video>
        )}

        {isAud && (
          <div className="flex flex-col items-center gap-6 pt-12">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-pink-500/30 flex items-center justify-center">
              <span className="text-4xl">🎵</span>
            </div>
            <p className="text-white/70 text-lg font-medium">{file.original_name}</p>
            <audio controls autoPlay className="w-80">
              <source src={file.file_path} type={file.mime_type} />
            </audio>
          </div>
        )}

        {isPdf && (
          <embed src={file.file_path} type="application/pdf"
            className="w-full rounded-lg" style={{ height: 'calc(100vh - 120px)' }} />
        )}

        {canEdit && !loading && content !== null && !editing && (
          <div className="w-full max-w-4xl">
            {isMd && renderView === 'preview' && (
              <div className="prose prose-invert prose-base max-w-none text-slate-200 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: marked.parse(content) as string }} />
            )}
            {isHtml && renderView === 'preview' && (
              <iframe srcDoc={content} sandbox="allow-scripts allow-forms"
                className="w-full rounded-lg border border-white/10 bg-white"
                style={{ height: 'calc(100vh - 160px)' }} title={file.original_name} />
            )}
            {(renderView === 'code' || (!isMd && !isHtml)) && (
              <pre className="text-sm text-slate-200 whitespace-pre-wrap break-words font-mono bg-white/5 rounded-xl p-6 border border-white/10 leading-relaxed">
                {content || <span className="text-white/30 italic">Empty file</span>}
              </pre>
            )}
          </div>
        )}

        {canEdit && editing && (
          <textarea ref={textareaRef} value={editValue} onChange={e => setEditValue(e.target.value)}
            className="w-full max-w-4xl bg-white/5 border border-white/20 rounded-xl p-6 text-sm text-slate-200 font-mono resize-none outline-none focus:border-cyan-500/50 leading-relaxed"
            style={{ minHeight: 'calc(100vh - 160px)' }} />
        )}

        {canEdit && loading && (
          <div className="text-white/40 text-sm">Loading…</div>
        )}

        {!canEdit && !isImg && !isVid && !isAud && !isPdf && (
          <div className="flex flex-col items-center gap-4 pt-20 text-white/30">
            <span className="text-6xl">📄</span>
            <p>No preview for this file type</p>
            <a href={file.file_path} download={file.original_name}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-white/60 hover:text-white text-sm">
              <Download size={14} /> Download
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

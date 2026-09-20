import { useEffect, useRef, useState } from 'react';
import { X, Download, Edit2, Save, XCircle, Eye, Code, ZoomIn, ZoomOut, Share2 } from 'lucide-react';
import { marked } from 'marked';
import { api } from '../../lib/api';
import type { FileItem } from './FileCard';
import ThreeViewer from './ThreeViewer';
import DocumentViewer, { type DocumentData } from './DocumentViewer';

interface Props {
  file: FileItem;
  onClose: () => void;
  onSaved: (id: number, size: number) => void;
  onShare?: (file: FileItem) => void;
}

function isEditable(mime: string, name: string) {
  if (mime && mime.startsWith('text/')) return true;
  if (['application/json', 'application/javascript', 'application/xml'].some(m => (mime || '').includes(m))) return true;
  const exts = ['.md','.mdx','.txt','.js','.ts','.tsx','.jsx','.json','.css','.html','.htm',
    '.xml','.yml','.yaml','.sh','.py','.go','.rs','.java','.c','.cpp','.h','.env','.toml','.sql','.graphql'];
  return exts.some(e => name.toLowerCase().endsWith(e));
}

function isVideo(mime: string, name: string) {
  if (mime && mime.startsWith('video/')) return true;
  return ['.mp4', '.mov', '.webm', '.mkv', '.avi', '.m4v', '.ogv'].some(e => name.toLowerCase().endsWith(e));
}

function is3DFile(name: string) {
  return ['.stl', '.obj', '.gltf', '.glb', '.step', '.stp', '.f3d', '.ipt', '.iam'].some(e => name.toLowerCase().endsWith(e));
}

function isOfficeDoc(name: string) {
  return ['.docx', '.doc', '.odt', '.rtf'].some(e => name.toLowerCase().endsWith(e));
}

function isPresentation(name: string) {
  return ['.pptx', '.odp'].some(e => name.toLowerCase().endsWith(e));
}

function isSpreadsheet(name: string) {
  return ['.csv', '.tsv', '.xlsx', '.xls', '.ods'].some(e => name.toLowerCase().endsWith(e));
}

function isEpub(name: string) {
  return name.toLowerCase().endsWith('.epub');
}

export default function FullscreenViewer({ file, onClose, onSaved, onShare }: Props) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [renderView, setRenderView] = useState<'preview' | 'code'>('preview');
  const [imgZoom, setImgZoom] = useState(1);
  const [docData, setDocData] = useState<DocumentData | null>(null);
  const [loadingDoc, setLoadingDoc] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isImg = (file.mime_type ?? '').startsWith('image/');
  const isVid = isVideo(file.mime_type ?? '', file.original_name);
  const isAud = (file.mime_type ?? '').startsWith('audio/');
  const isPdf = file.mime_type === 'application/pdf' || file.original_name.toLowerCase().endsWith('.pdf');
  const is3D = is3DFile(file.original_name);
  const isOffice = isOfficeDoc(file.original_name);
  const isPresent = isPresentation(file.original_name);
  const isSheet = isSpreadsheet(file.original_name);
  const isBook = isEpub(file.original_name);
  const isMd = file.original_name.toLowerCase().endsWith('.md') || file.original_name.toLowerCase().endsWith('.mdx');
  const isHtml = file.original_name.toLowerCase().endsWith('.html') || file.original_name.toLowerCase().endsWith('.htm');
  const canEdit = isEditable(file.mime_type ?? '', file.original_name);
  const hasToggle = (isMd || isHtml) && !editing;

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Escape key closes viewer
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Ctrl + Mouse Wheel image zoom inside site, preventing browser zoom
  useEffect(() => {
    function onWheel(e: WheelEvent) {
      if (e.ctrlKey && isImg) {
        e.preventDefault();
        setImgZoom(z => Math.max(0.2, Math.min(5, z - e.deltaY * 0.002)));
      }
    }
    window.addEventListener('wheel', onWheel, { passive: false });
    return () => window.removeEventListener('wheel', onWheel);
  }, [isImg]);

  useEffect(() => {
    if (canEdit) {
      setLoading(true);
      api.get<{ content: string }>(`/files/${file.id}/content`)
        .then(d => { setContent(d.content); setEditValue(d.content); })
        .catch(() => setContent(null))
        .finally(() => setLoading(false));
    } else if (isOffice || isPresent || isSheet || isBook) {
      setLoadingDoc(true);
      api.get<DocumentData>(`/files/${file.id}/document-content`)
        .then(d => setDocData(d))
        .catch(err => setDocData({ type: 'document', format: 'error', error: err?.message || 'Failed to load preview' }))
        .finally(() => setLoadingDoc(false));
    }
  }, [file.id, canEdit, isOffice, isPresent, isSheet, isBook]);

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

  // Backdrop void click handler
  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col"
      onClick={handleBackdropClick}
    >
      {/* Header */}
      <div
        className="shrink-0 flex items-center justify-between px-6 py-3 border-b border-white/10"
        onClick={e => e.stopPropagation()}
      >
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
              <button onClick={() => setImgZoom(z => Math.max(0.25, z - 0.25))} className="p-2 text-white/50 hover:text-white transition-colors" title="Zoom out"><ZoomOut size={16} /></button>
              <span className="text-white/40 text-xs w-12 text-center select-none">{Math.round(imgZoom * 100)}%</span>
              <button onClick={() => setImgZoom(z => Math.min(4, z + 0.25))} className="p-2 text-white/50 hover:text-white transition-colors" title="Zoom in"><ZoomIn size={16} /></button>
              <button onClick={() => setImgZoom(1)} className="text-[11px] text-white/40 hover:text-white px-1.5 py-0.5 rounded transition-colors">Reset</button>
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
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors">
                <Save size={12} /> {saving ? 'Saving…' : 'Save'}
              </button>
              <button onClick={() => { setEditValue(content ?? ''); setEditing(false); }}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white/60 hover:text-white rounded-lg transition-colors">
                <XCircle size={12} /> Cancel
              </button>
            </>
          )}
          {onShare && (
            <button
              onClick={() => onShare(file)}
              className="p-2 text-white/50 hover:text-purple-400 transition-colors"
              title="Share file"
            >
              <Share2 size={16} />
            </button>
          )}
          <a href={file.file_path} download={file.original_name}
            className="p-2 text-white/50 hover:text-white transition-colors"
            title="Download file">
            <Download size={16} />
          </a>
          <button onClick={onClose} className="p-2 text-white/50 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Content — clicking void closes */}
      <div
        className="flex-1 min-h-0 overflow-auto flex items-center justify-center p-6"
        onClick={handleBackdropClick}
      >
        {isImg && (
          <div
            className="transition-transform duration-100 select-none max-w-full"
            style={{ transform: `scale(${imgZoom})`, transformOrigin: 'center center' }}
            onClick={e => e.stopPropagation()}
          >
            <img src={file.file_path} alt={file.original_name}
              className="max-w-full rounded-lg shadow-2xl pointer-events-none" style={{ maxHeight: 'calc(100vh - 120px)' }} />
          </div>
        )}

        {is3D && (
          <div className="w-full max-w-5xl h-[calc(100vh-140px)]" onClick={e => e.stopPropagation()}>
            <ThreeViewer filePath={file.file_path} fileName={file.original_name} previewPath={file.preview_path} />
          </div>
        )}

        {isVid && (
          <video controls autoPlay className="max-w-full max-h-full rounded-lg shadow-2xl" onClick={e => e.stopPropagation()}>
            <source src={file.file_path} type={file.mime_type || 'video/mp4'} />
          </video>
        )}

        {isAud && (
          <div className="flex flex-col items-center gap-6 pt-12" onClick={e => e.stopPropagation()}>
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-pink-500/30 flex items-center justify-center">
              <span className="text-4xl">🎵</span>
            </div>
            <p className="text-white/70 text-lg font-medium">{file.original_name}</p>
            <audio controls autoPlay className="w-80">
              <source src={file.file_path} type={file.mime_type || 'audio/mpeg'} />
            </audio>
          </div>
        )}

        {isPdf && (
          <iframe
            src={file.file_path}
            className="w-full rounded-lg bg-white"
            style={{ height: 'calc(100vh - 120px)' }}
            title={file.original_name}
            onClick={e => e.stopPropagation()}
          />
        )}

        {(isOffice || isPresent || isSheet || isBook) && (
          <div className="w-full max-w-6xl h-[calc(100vh-140px)]" onClick={e => e.stopPropagation()}>
            <DocumentViewer
              data={docData}
              loading={loadingDoc}
              fileName={file.original_name}
              fullscreen
            />
          </div>
        )}

        {canEdit && !loading && content !== null && !editing && (
          <div className="w-full max-w-4xl" onClick={e => e.stopPropagation()}>
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
            className="w-full max-w-4xl bg-white/5 border border-white/20 rounded-xl p-6 text-sm text-slate-200 font-mono resize-none outline-none focus:border-red-500/50 leading-relaxed"
            style={{ minHeight: 'calc(100vh - 160px)' }} onClick={e => e.stopPropagation()} />
        )}

        {canEdit && loading && (
          <div className="text-white/40 text-sm">Loading…</div>
        )}

        {!canEdit && !isImg && !isVid && !isAud && !isPdf && !is3D && !isOffice && !isPresent && !isSheet && !isBook && (
          <div className="flex flex-col items-center gap-4 pt-20 text-white/30" onClick={e => e.stopPropagation()}>
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

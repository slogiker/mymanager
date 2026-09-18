import { useState, useEffect, useRef } from 'react';
import { X, Edit2, Save, XCircle, Download, Code, Eye, FileText, Image, Video, Music, Archive, FileCode, File, Maximize2, Folder, Box, Table } from 'lucide-react';
import { marked } from 'marked';
import { api } from '../../lib/api';
import type { FileItem } from './FileCard';
import ThreeViewer from './ThreeViewer';

interface Props {
  file: FileItem | null;
  onClose: () => void;
  onSaved: (id: number, size: number) => void;
}

interface ArchiveEntry {
  name: string;
  entryName: string;
  isDirectory: boolean;
  size: number;
  compressedSize: number;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isEditable(mime: string, name: string) {
  if (mime && mime.startsWith('text/')) return true;
  if (['application/json', 'application/javascript', 'application/xml', 'application/x-sh'].some(m => (mime || '').includes(m))) return true;
  const exts = ['.md', '.mdx', '.txt', '.js', '.ts', '.tsx', '.jsx', '.json', '.css', '.html', '.htm',
    '.xml', '.yml', '.yaml', '.sh', '.py', '.go', '.rs', '.java', '.c', '.cpp', '.h', '.env',
    '.gitignore', '.toml', '.ini', '.cfg', '.sql', '.graphql', '.vue', '.svelte'];
  return exts.some(e => name.toLowerCase().endsWith(e));
}

function isVideo(mime: string, name: string) {
  if (mime && mime.startsWith('video/')) return true;
  return ['.mp4', '.mov', '.webm', '.mkv', '.avi', '.m4v', '.ogv'].some(e => name.toLowerCase().endsWith(e));
}

function isAudio(mime: string, name: string) {
  if (mime && mime.startsWith('audio/')) return true;
  return ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'].some(e => name.toLowerCase().endsWith(e));
}

function isArchive(name: string) {
  return ['.zip', '.tar', '.gz', '.rar', '.7z'].some(e => name.toLowerCase().endsWith(e));
}

function is3DFile(name: string) {
  return ['.stl', '.obj', '.gltf', '.glb', '.step', '.stp', '.f3d', '.ipt', '.iam', '.ply'].some(e => name.toLowerCase().endsWith(e));
}

function isSpreadsheet(name: string) {
  return ['.csv', '.tsv', '.xlsx', '.xls', '.ods'].some(e => name.toLowerCase().endsWith(e));
}

export default function PreviewPanel({ file, onClose, onSaved }: Props) {
  const [content, setContent] = useState<string | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [renderView, setRenderView] = useState<'preview' | 'code'>('preview');
  const [lightbox, setLightbox] = useState(false);
  const [archiveEntries, setArchiveEntries] = useState<ArchiveEntry[]>([]);
  const [loadingArchive, setLoadingArchive] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && lightbox) setLightbox(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox]);

  useEffect(() => {
    if (!file) {
      setContent(null);
      setEditing(false);
      setArchiveEntries([]);
      return;
    }

    setContent(null);
    setEditing(false);
    setRenderView('preview');
    setArchiveEntries([]);

    if (isEditable(file.mime_type ?? '', file.original_name)) {
      setLoadingContent(true);
      api.get<{ content: string }>(`/files/${file.id}/content`)
        .then(d => { setContent(d.content); setEditValue(d.content); })
        .catch(() => setContent(null))
        .finally(() => setLoadingContent(false));
    } else if (isArchive(file.original_name)) {
      setLoadingArchive(true);
      api.get<{ entries: ArchiveEntry[] }>(`/files/${file.id}/archive-contents`)
        .then(d => setArchiveEntries(d.entries || []))
        .catch(() => setArchiveEntries([]))
        .finally(() => setLoadingArchive(false));
    }
  }, [file?.id]);

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      // Auto-size
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(380, textareaRef.current.scrollHeight)}px`;
    }
  }, [editing]);

  function handleTextareaInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setEditValue(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.max(380, e.target.scrollHeight)}px`;
  }

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

  const canEdit = isEditable(file.mime_type ?? '', file.original_name);
  const isMd = file.original_name.toLowerCase().endsWith('.md') || file.original_name.toLowerCase().endsWith('.mdx');
  const isHtmlFile = file.original_name.toLowerCase().endsWith('.html') || file.original_name.toLowerCase().endsWith('.htm');
  const hasToggle = (isMd || isHtmlFile) && !editing;
  const isImg = (file.mime_type ?? '').startsWith('image/');
  const isVid = isVideo(file.mime_type ?? '', file.original_name);
  const isAud = isAudio(file.mime_type ?? '', file.original_name);
  const isPdf = file.mime_type === 'application/pdf' || file.original_name.toLowerCase().endsWith('.pdf');
  const isArch = isArchive(file.original_name);
  const is3D = is3DFile(file.original_name);
  const isSheet = isSpreadsheet(file.original_name);

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
              {formatSize(file.size)} &middot; {new Date(file.created_at).toLocaleDateString()}
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

        {/* Content View */}
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
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

          {/* 3D Model / CAD */}
          {is3D && (
            <div className="flex-1 min-h-[350px]">
              <ThreeViewer
                filePath={file.file_path}
                fileName={file.original_name}
                previewPath={file.preview_path}
              />
            </div>
          )}

          {/* Archive Contents Inspector */}
          {isArch && (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs text-slate-400">
                <span className="font-semibold flex items-center gap-1.5 text-yellow-400">
                  <Archive size={14} /> Archive Contents
                </span>
                <span>{archiveEntries.length} items</span>
              </div>
              {loadingArchive ? (
                <div className="py-8 text-center text-xs text-slate-500">Reading archive…</div>
              ) : archiveEntries.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">Empty archive or unable to inspect.</div>
              ) : (
                <div className="divide-y divide-slate-800/60 overflow-y-auto max-h-80 mt-2">
                  {archiveEntries.map((e, i) => (
                    <div key={i} className="flex items-center justify-between py-1.5 px-2 text-xs hover:bg-white/[0.02]">
                      <span className="flex items-center gap-2 truncate text-slate-300">
                        {e.isDirectory ? <Folder size={13} className="text-yellow-400 shrink-0" /> : <File size={13} className="text-slate-400 shrink-0" />}
                        <span className="truncate" title={e.entryName}>{e.entryName}</span>
                      </span>
                      {!e.isDirectory && (
                        <span className="text-[10px] text-slate-500 shrink-0 ml-2">{formatSize(e.size)}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Video */}
          {isVid && (
            <video controls className="w-full rounded-lg border border-slate-700/50 max-h-80">
              <source src={file.file_path} type={file.mime_type || 'video/mp4'} />
            </video>
          )}

          {/* Audio */}
          {isAud && (
            <div className="p-5 rounded-lg border border-slate-700/50 bg-slate-900/40 flex flex-col items-center gap-4">
              <Music size={48} className="text-pink-400 opacity-50" />
              <audio controls className="w-full">
                <source src={file.file_path} type={file.mime_type || 'audio/mpeg'} />
              </audio>
            </div>
          )}

          {/* PDF */}
          {isPdf && (
            <embed
              src={file.file_path}
              type="application/pdf"
              className="w-full rounded-lg border border-slate-700/50 flex-1 min-h-[480px]"
            />
          )}

          {/* Spreadsheets & Tables */}
          {isSheet && (
            <div className="flex flex-col items-center justify-center p-8 bg-slate-900/40 border border-slate-700/50 rounded-lg text-center gap-3">
              <Table size={40} className="text-emerald-400 opacity-70" />
              <div>
                <p className="text-sm font-semibold text-slate-200">{file.original_name}</p>
                <p className="text-xs text-slate-500 mt-0.5">Spreadsheet Data File</p>
              </div>
              <a href={file.file_path} download={file.original_name} className="btn btn-outline text-xs mt-2">
                <Download size={12} className="mr-1.5" /> Download Spreadsheet
              </a>
            </div>
          )}

          {/* Text / Markdown / Code / HTML */}
          {canEdit && (
            <div className="flex-1 flex flex-col min-h-0">
              {loadingContent && (
                <div className="flex items-center justify-center h-24 text-slate-600 text-sm">Loading…</div>
              )}

              {!loadingContent && content !== null && !editing && (
                <>
                  {isMd && renderView === 'preview' && (
                    <div className="prose prose-invert prose-sm max-w-none text-slate-300 leading-relaxed overflow-y-auto"
                      dangerouslySetInnerHTML={{ __html: marked.parse(content) as string }} />
                  )}

                  {isHtmlFile && renderView === 'preview' && (
                    <iframe
                      srcDoc={content}
                      sandbox="allow-scripts allow-forms"
                      className="w-full flex-1 rounded-lg border border-slate-700/50 bg-white min-h-[450px]"
                      title={file.original_name}
                    />
                  )}

                  {(renderView === 'code' || (!isMd && !isHtmlFile)) && (
                    <pre className="text-xs text-slate-300 whitespace-pre-wrap break-words font-mono bg-slate-900/60 rounded-lg p-3 border border-slate-700/50 leading-relaxed overflow-y-auto flex-1">
                      {content || <span className="text-slate-600 italic">Empty file</span>}
                    </pre>
                  )}
                </>
              )}

              {/* Dynamic Auto-sizing Edit textarea */}
              {editing && (
                <textarea
                  ref={textareaRef}
                  value={editValue}
                  onChange={handleTextareaInput}
                  className="w-full flex-1 min-h-[400px] bg-slate-900/90 border border-slate-600 rounded-lg p-3 text-xs text-slate-200 font-mono resize-none outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 leading-relaxed"
                  placeholder="Start typing…"
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox with Esc key support */}
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
            {file.original_name} (Press Esc to close)
          </p>
        </div>
      )}
    </>
  );
}

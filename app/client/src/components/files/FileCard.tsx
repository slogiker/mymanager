import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Download, Trash2, FileText, Image, Video, Music, FileCode, Archive } from 'lucide-react';

interface FileItem {
  id: number;
  original_name: string;
  file_path: string;
  mime_type: string;
  size: number;
  created_at: string;
}

function fileIcon(mime: string) {
  if (mime.startsWith('image/')) return <Image size={28} className="text-cyan-400" />;
  if (mime.startsWith('video/')) return <Video size={28} className="text-purple-400" />;
  if (mime.startsWith('audio/')) return <Music size={28} className="text-pink-400" />;
  if (mime.includes('zip') || mime.includes('tar') || mime.includes('gzip') || mime.includes('rar'))
    return <Archive size={28} className="text-yellow-400" />;
  if (mime.includes('javascript') || mime.includes('json') || mime.includes('html') || mime.includes('css') || mime.includes('xml'))
    return <FileCode size={28} className="text-green-400" />;
  return <FileText size={28} className="text-slate-400" />;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface Props {
  file: FileItem;
  view: 'grid' | 'list';
  onDelete: (id: number) => void;
}

export default function FileCard({ file, view, onDelete }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `file-${file.id}`,
    data: { fileId: file.id },
  });

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;
  const isImage = file.mime_type?.startsWith('image/');

  if (view === 'list') {
    return (
      <div
        ref={setNodeRef}
        style={style}
        {...listeners}
        {...attributes}
        className={`flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 rounded-lg transition-colors cursor-grab active:cursor-grabbing group
          ${isDragging ? 'opacity-40' : ''}`}
      >
        <div className="shrink-0">{fileIcon(file.mime_type)}</div>
        <span className="flex-1 text-sm truncate min-w-0">{file.original_name}</span>
        <span className="text-xs text-slate-500 shrink-0 w-20 text-right">{formatSize(file.size)}</span>
        <span className="text-xs text-slate-500 shrink-0 w-28 text-right hidden sm:block">
          {new Date(file.created_at).toLocaleDateString()}
        </span>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={e => e.stopPropagation()}>
          <a href={file.file_path} download={file.original_name}
            className="p-1.5 text-slate-400 hover:text-cyan-400 transition-colors">
            <Download size={14} />
          </a>
          <button onClick={() => onDelete(file.id)}
            className="p-1.5 text-slate-400 hover:text-red-400 transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`card p-3 flex flex-col items-center gap-2 cursor-grab active:cursor-grabbing group relative
        ${isDragging ? 'opacity-40 scale-95' : 'hover:border-slate-600'} transition-all`}
    >
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={e => e.stopPropagation()}>
        <a href={file.file_path} download={file.original_name}
          className="p-1 text-slate-400 hover:text-cyan-400 transition-colors bg-slate-800 rounded">
          <Download size={12} />
        </a>
        <button onClick={() => onDelete(file.id)}
          className="p-1 text-slate-400 hover:text-red-400 transition-colors bg-slate-800 rounded">
          <Trash2 size={12} />
        </button>
      </div>

      {isImage ? (
        <img
          src={file.file_path}
          alt={file.original_name}
          className="w-16 h-16 object-cover rounded-lg"
          onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        />
      ) : (
        <div className="w-16 h-16 flex items-center justify-center">
          {fileIcon(file.mime_type)}
        </div>
      )}

      <p className="text-xs text-center text-slate-300 leading-tight truncate w-full max-w-[96px]" title={file.original_name}>
        {file.original_name}
      </p>
      <p className="text-[11px] text-slate-500">{formatSize(file.size)}</p>
    </div>
  );
}

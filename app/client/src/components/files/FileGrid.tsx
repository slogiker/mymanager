import { useRef } from 'react';
import { Upload, FolderOpen } from 'lucide-react';
import FileCard from './FileCard';

interface FileItem {
  id: number;
  original_name: string;
  file_path: string;
  mime_type: string;
  size: number;
  created_at: string;
}

interface Props {
  files: FileItem[];
  view: 'grid' | 'list';
  currentFolderId: string | null;
  onUpload: (files: File[], folderId: string | null) => void;
  onDelete: (id: number) => void;
}

export default function FileGrid({ files, view, currentFolderId, onUpload, onDelete }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files);
    if (dropped.length) onUpload(dropped, currentFolderId);
  }

  const header = view === 'list' && files.length > 0 ? (
    <div className="flex items-center gap-3 px-4 py-2 text-xs text-slate-500 font-medium border-b border-slate-700/50 mb-1">
      <div className="w-7 shrink-0" />
      <span className="flex-1">Name</span>
      <span className="w-20 text-right shrink-0">Size</span>
      <span className="w-28 text-right shrink-0 hidden sm:block">Date</span>
      <div className="w-14 shrink-0" />
    </div>
  ) : null;

  return (
    <div
      className="flex-1 min-h-0"
      onDragOver={e => e.preventDefault()}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={e => {
          const picked = Array.from(e.target.files || []);
          if (picked.length) onUpload(picked, currentFolderId);
          e.target.value = '';
        }}
      />

      {files.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center h-72 border-2 border-dashed border-slate-700 rounded-xl text-slate-500 cursor-pointer hover:border-cyan-500/50 hover:text-slate-400 transition-all"
          onClick={() => inputRef.current?.click()}
        >
          <Upload size={32} className="mb-3 opacity-50" />
          <p className="text-sm">Drop files here or click to upload</p>
          <FolderOpen size={16} className="mt-2 opacity-40" />
        </div>
      ) : (
        <>
          {header}
          <div className={
            view === 'grid'
              ? 'grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3'
              : 'flex flex-col'
          }>
            {files.map(f => (
              <FileCard key={f.id} file={f} view={view} onDelete={onDelete} />
            ))}
          </div>

          <div
            className="mt-4 flex items-center gap-2 text-slate-500 text-sm cursor-pointer hover:text-slate-300 transition-colors"
            onClick={() => inputRef.current?.click()}
          >
            <Upload size={14} />
            Upload more files
          </div>
        </>
      )}
    </div>
  );
}

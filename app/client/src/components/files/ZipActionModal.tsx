import { Archive, FolderPlus, X } from 'lucide-react';

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface Props {
  file: File | null;
  onClose: () => void;
  onUploadAsZip: (file: File) => void;
  onExtract: (file: File) => void;
}

export default function ZipActionModal({ file, onClose, onUploadAsZip, onExtract }: Props) {
  if (!file) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-500 hover:text-slate-200 transition-colors"
        >
          <X size={16} />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-yellow-500/15 border border-yellow-500/30 flex items-center justify-center text-yellow-400">
            <Archive size={24} />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-slate-100 truncate">{file.name}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{formatSize(file.size)} &middot; ZIP Archive</p>
          </div>
        </div>

        <p className="text-xs text-slate-300 mb-6 leading-relaxed">
          How would you like to handle this ZIP archive? You can either keep it as a raw archive file or automatically extract its folder and file contents.
        </p>

        <div className="flex flex-col gap-2.5">
          <button
            onClick={() => { onExtract(file); onClose(); }}
            className="flex items-center gap-3 w-full p-3.5 rounded-xl bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 border border-cyan-500/40 text-left transition-all group"
          >
            <div className="w-9 h-9 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform shrink-0">
              <FolderPlus size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold text-cyan-200">Extract here into folder</p>
              <p className="text-[11px] text-slate-400">Creates a new folder and unpacks all files inside</p>
            </div>
          </button>

          <button
            onClick={() => { onUploadAsZip(file); onClose(); }}
            className="flex items-center gap-3 w-full p-3.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-left transition-all group"
          >
            <div className="w-9 h-9 rounded-lg bg-yellow-500/15 flex items-center justify-center text-yellow-400 group-hover:scale-105 transition-transform shrink-0">
              <Archive size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-200">Upload as ZIP file</p>
              <p className="text-[11px] text-slate-400">Stores the archive as a regular file without unzipping</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

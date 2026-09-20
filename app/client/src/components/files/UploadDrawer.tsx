import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, X, CheckCircle2, AlertCircle, Loader2, Ban, UploadCloud } from 'lucide-react';
import { useUpload } from '../../context/UploadContext';
import { FileIcon } from './fileIcons';

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function UploadDrawer() {
  const { queue, isUploading, activeCount, completedCount, totalProgress, cancelItem, cancelAll, clearCompleted } = useUpload();
  const [minimized, setMinimized] = useState(false);

  // Auto-dismiss completed upload report after 2.5 seconds
  useEffect(() => {
    if (!isUploading && queue.length > 0 && queue.every(q => q.status === 'completed' || q.status === 'cancelled')) {
      const timer = setTimeout(() => {
        clearCompleted();
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [isUploading, queue, clearCompleted]);

  if (queue.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 w-96 max-w-[calc(100vw-2.5rem)] bg-[#111216]/95 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-md overflow-hidden transition-all duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white/[0.04] border-b border-white/10 select-none">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center shrink-0">
            {isUploading ? <UploadCloud size={15} className="animate-pulse" /> : <CheckCircle2 size={15} className="text-emerald-400" />}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-200 truncate">
              {isUploading
                ? `Uploading ${activeCount} file${activeCount > 1 ? 's' : ''} (${totalProgress}%)`
                : `${completedCount} of ${queue.length} file${queue.length > 1 ? 's' : ''} complete`}
            </p>
            {isUploading && (
              <div className="w-32 bg-slate-700 rounded-full h-1 mt-1 overflow-hidden">
                <div
                  className="bg-red-500 h-1 rounded-full transition-all duration-300"
                  style={{ width: `${totalProgress}%` }}
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {isUploading && (
            <button
              onClick={cancelAll}
              title="Cancel all uploads"
              className="text-[11px] text-red-400 hover:text-red-300 px-2 py-0.5 rounded hover:bg-red-500/10 transition-colors"
            >
              Cancel all
            </button>
          )}
          <button
            onClick={() => setMinimized(v => !v)}
            className="p-1 text-slate-400 hover:text-slate-200 rounded transition-colors"
          >
            {minimized ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
          {!isUploading && (
            <button
              onClick={clearCompleted}
              title="Dismiss"
              className="p-1 text-slate-400 hover:text-slate-200 rounded transition-colors"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Body List */}
      {!minimized && (
        <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/60 p-1">
          {queue.map(item => (
            <div key={item.id} className="flex items-center gap-3 px-3 py-2 hover:bg-white/[0.02] rounded-lg transition-colors">
              <FileIcon fileName={item.name} size={16} className="shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between text-xs mb-1 gap-2">
                  <span className="text-slate-200 truncate font-medium" title={item.name}>{item.name}</span>
                  <span className="text-slate-500 shrink-0 text-[11px]">
                    {item.status === 'uploading' ? `${item.progress}%` : formatSize(item.size)}
                  </span>
                </div>

                {item.status === 'uploading' && (
                  <div className="w-full bg-slate-800 rounded-full h-1 overflow-hidden">
                    <div
                      className="bg-red-500 h-1 rounded-full transition-all duration-200"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                )}
                {item.status === 'failed' && (
                  <p className="text-[10px] text-red-400 truncate">{item.error || 'Upload failed'}</p>
                )}
                {item.status === 'cancelled' && (
                  <p className="text-[10px] text-slate-500">Cancelled</p>
                )}
              </div>

              {/* Status Icons & Cancel Action */}
              <div className="shrink-0 flex items-center">
                {item.status === 'uploading' && (
                  <button
                    onClick={() => cancelItem(item.id)}
                    title="Cancel upload"
                    className="p-1 text-slate-400 hover:text-red-400 rounded transition-colors"
                  >
                    <X size={13} />
                  </button>
                )}
                {item.status === 'pending' && <Loader2 size={13} className="text-slate-500 animate-spin" />}
                {item.status === 'completed' && <CheckCircle2 size={14} className="text-emerald-400" />}
                {item.status === 'failed' && <AlertCircle size={14} className="text-red-400" />}
                {item.status === 'cancelled' && <Ban size={13} className="text-slate-600" />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

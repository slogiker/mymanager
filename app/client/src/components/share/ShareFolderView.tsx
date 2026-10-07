import React from 'react';
import { Download, Folder, Upload } from 'lucide-react';
import { FileIcon } from '../files/fileIcons';
import { SharedFile } from './ShareFileView';

export interface SharedFolder {
  id: string;
  name: string;
  created_at: string;
}

export interface ShareFolderViewProps {
  folder: SharedFolder;
  files?: SharedFile[];
  isEditor: boolean;
  downloadUrl: string;
  uploadingFile: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFolderUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  formatSize: (bytes: number) => string;
}

export function ShareFolderView({
  folder,
  files,
  isEditor,
  downloadUrl,
  uploadingFile,
  fileInputRef,
  onFolderUpload,
  formatSize,
}: ShareFolderViewProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 rounded-xl bg-yellow-500/15 border border-yellow-500/30 flex items-center justify-center text-yellow-400 shrink-0">
            <Folder size={24} />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-bold text-slate-100 truncate">{folder.name}</h1>
            <p className="text-xs text-slate-400 mt-1">
              {files?.length || 0} file{files?.length !== 1 ? 's' : ''} &middot; Shared Folder
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isEditor && (
            <>
              <input ref={fileInputRef} type="file" className="hidden" onChange={onFolderUpload} />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingFile}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-sm transition-all disabled:opacity-50"
              >
                <Upload size={16} /> {uploadingFile ? 'Uploading...' : 'Upload to Folder'}
              </button>
            </>
          )}
          <a
            href={downloadUrl}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-sm shadow-lg shadow-red-600/30 transition-all shrink-0"
          >
            <Download size={16} /> Download All as ZIP
          </a>
        </div>
      </div>

      {/* Folder file list */}
      <div className="divide-y divide-slate-800/80 bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
        {files?.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            This shared folder is currently empty.{isEditor && ' Use the upload button above to add files.'}
          </div>
        ) : (
          files?.map(file => (
            <div key={file.id} className="flex items-center justify-between gap-3 p-4 hover:bg-white/[0.02] transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <FileIcon fileName={file.original_name} mimeType={file.mime_type} size={16} className="shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">{file.original_name}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{formatSize(file.size)}</p>
                </div>
              </div>

              <a
                href={file.file_path}
                download={file.original_name}
                className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/10"
                title="Download individual file"
              >
                <Download size={15} />
              </a>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

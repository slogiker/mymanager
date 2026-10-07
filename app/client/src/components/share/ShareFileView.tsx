import React from 'react';
import { Download, Edit2, Save, XCircle, Music } from 'lucide-react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import DocumentViewer, { type DocumentData } from '../files/DocumentViewer';
import { FileIcon } from '../files/fileIcons';

export interface SharedFile {
  id: number;
  original_name: string;
  stored_name: string;
  file_path: string;
  mime_type: string;
  size: number;
  created_at: string;
  preview_path?: string;
  preview_type?: string;
}

export interface ShareFileViewProps {
  file: SharedFile;
  isEditor: boolean;
  downloadUrl: string;
  fileContent: string | null;
  editingContent: string;
  setEditingContent: (val: string) => void;
  isEditing: boolean;
  setIsEditing: (val: boolean) => void;
  savingContent: boolean;
  onSaveContent: () => void;
  docData: DocumentData | null;
  loadingDoc: boolean;
  formatSize: (bytes: number) => string;
  isOfficeDoc: (name: string) => boolean;
  isPresentation: (name: string) => boolean;
}

export function ShareFileView({
  file,
  isEditor,
  downloadUrl,
  fileContent,
  editingContent,
  setEditingContent,
  isEditing,
  setIsEditing,
  savingContent,
  onSaveContent,
  docData,
  loadingDoc,
  formatSize,
  isOfficeDoc,
  isPresentation,
}: ShareFileViewProps) {
  return (
    <div className="flex flex-col flex-1 gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 shrink-0 flex items-center justify-center">
            <FileIcon fileName={file.original_name} mimeType={file.mime_type} size={24} />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-bold text-slate-100 truncate">{file.original_name}</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {formatSize(file.size)} &middot; Shared via mymanager
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isEditor && fileContent !== null && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-sm transition-all"
            >
              <Edit2 size={15} /> Edit File
            </button>
          )}

          {isEditing && (
            <>
              <button
                onClick={onSaveContent}
                disabled={savingContent}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-all"
              >
                <Save size={15} /> {savingContent ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => {
                  setEditingContent(fileContent ?? '');
                  setIsEditing(false);
                }}
                className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-sm transition-all"
              >
                <XCircle size={15} /> Cancel
              </button>
            </>
          )}

          <a
            href={downloadUrl}
            download={file.original_name}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-sm shadow-lg shadow-red-600/30 transition-all shrink-0"
          >
            <Download size={16} /> Download
          </a>
        </div>
      </div>

      {/* Inline Previews & Editor */}
      <div className="flex-1 rounded-2xl bg-slate-900/60 border border-slate-800 p-6 flex items-center justify-center min-h-[400px]">
        {isEditing ? (
          <textarea
            value={editingContent}
            onChange={e => setEditingContent(e.target.value)}
            className="w-full flex-1 min-h-[500px] bg-slate-900/90 border border-slate-700 rounded-xl p-4 text-xs font-mono text-slate-200 outline-none focus:border-red-500/50 resize-none leading-relaxed"
          />
        ) : (
          <>
            {file.mime_type?.startsWith('image/') && (
              <img
                src={file.file_path}
                alt={file.original_name}
                className="max-h-[600px] max-w-full object-contain rounded-lg shadow-2xl"
              />
            )}

            {file.mime_type?.startsWith('video/') && (
              <video controls className="max-h-[600px] max-w-full rounded-lg shadow-2xl">
                <source src={file.file_path} type={file.mime_type} />
              </video>
            )}

            {file.mime_type?.startsWith('audio/') && (
              <div className="flex flex-col items-center gap-4 py-8">
                <Music size={48} className="text-pink-400 opacity-60" />
                <audio controls className="w-80">
                  <source src={file.file_path} type={file.mime_type} />
                </audio>
              </div>
            )}

            {file.mime_type === 'application/pdf' && (
              <iframe
                src={file.file_path}
                className="w-full h-[650px] rounded-lg bg-white border border-slate-700"
                title={file.original_name}
              />
            )}

            {(isOfficeDoc(file.original_name) || isPresentation(file.original_name)) && (
              <div className="w-full">
                <DocumentViewer
                  data={docData}
                  loading={loadingDoc}
                  fileName={file.original_name}
                  fullscreen
                />
              </div>
            )}

            {file.original_name.endsWith('.md') && fileContent !== null && (
              <div
                className="prose prose-invert prose-sm max-w-none text-slate-200 w-full overflow-y-auto max-h-[600px]"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(fileContent) as string) }}
              />
            )}

            {!file.original_name.endsWith('.md') && fileContent !== null && (
              <pre className="font-mono text-xs text-slate-300 whitespace-pre-wrap break-words w-full max-h-[600px] overflow-y-auto">
                {fileContent}
              </pre>
            )}

            {!file.mime_type?.startsWith('image/') &&
              !file.mime_type?.startsWith('video/') &&
              !file.mime_type?.startsWith('audio/') &&
              file.mime_type !== 'application/pdf' &&
              fileContent === null && (
                <div className="flex flex-col items-center gap-3 text-center py-12 text-slate-500">
                  <FileIcon fileName={file.original_name} mimeType={file.mime_type} size={48} className="opacity-60" />
                  <p className="text-sm">Preview not available for this file type.</p>
                  <a href={downloadUrl} className="text-xs text-red-400 hover:underline">
                    Download to view on your device
                  </a>
                </div>
              )}
          </>
        )}
      </div>
    </div>
  );
}

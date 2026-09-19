import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Download, FileText, Image, Video, Music, Archive, FileCode, File, Folder, AlertTriangle, ArrowLeft, Clock } from 'lucide-react';
import { marked } from 'marked';

interface SharedFile {
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

interface SharedFolder {
  id: string;
  name: string;
  created_at: string;
}

interface ShareResponse {
  type: 'file' | 'folder';
  file?: SharedFile;
  folder?: SharedFolder;
  files?: SharedFile[];
  subfolders?: SharedFolder[];
  expires_at: string | null;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function SharePage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<ShareResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetch(`/api/shares/public/${token}`)
      .then(async res => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || (res.status === 410 ? 'This share link has expired' : 'File or folder not found'));
        }
        return res.json();
      })
      .then((d: ShareResponse) => {
        setData(d);
        if (d.type === 'file' && d.file && (d.file.mime_type?.startsWith('text/') || d.file.original_name.endsWith('.md') || d.file.original_name.endsWith('.txt'))) {
          fetch(d.file.file_path)
            .then(r => r.text())
            .then(txt => setFileContent(txt))
            .catch(() => {});
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#111216] text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-red-500 border-t-transparent animate-spin" />
          <p className="text-xs text-slate-400">Loading shared content…</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#111216] text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-4">
          <AlertTriangle size={32} />
        </div>
        <h1 className="text-2xl font-bold text-slate-100 mb-2">Unavailable Link</h1>
        <p className="text-sm text-slate-400 max-w-sm mb-6">{error || 'This link may have expired or been removed.'}</p>
        <Link to="/" className="inline-flex items-center gap-2 text-xs text-red-400 hover:text-red-300 transition-colors">
          <ArrowLeft size={14} /> Back to mymanager
        </Link>
      </div>
    );
  }

  const isFile = data.type === 'file' && data.file;
  const isFolder = data.type === 'folder' && data.folder;
  const downloadUrl = `/api/shares/public/${token}/download`;

  return (
    <div className="min-h-screen bg-[#111216] text-white flex flex-col">
      {/* Top bar */}
      <header className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-sm font-bold text-slate-200 hover:text-white transition-colors">
          <span className="w-6 h-6 rounded-lg bg-red-600 flex items-center justify-center text-white text-xs font-black shadow-md shadow-red-600/30">
            M
          </span>
          mymanager
        </Link>

        {data.expires_at && (
          <div className="flex items-center gap-1.5 text-xs text-amber-400/90 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
            <Clock size={12} /> Expires: {new Date(data.expires_at).toLocaleDateString()}
          </div>
        )}
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-6 md:p-10 flex flex-col">
        {/* Single File View */}
        {isFile && data.file && (
          <div className="flex flex-col flex-1 gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
              <div className="min-w-0">
                <h1 className="text-xl md:text-2xl font-bold text-slate-100 truncate">{data.file.original_name}</h1>
                <p className="text-xs text-slate-400 mt-1">
                  {formatSize(data.file.size)} &middot; Shared via mymanager
                </p>
              </div>
              <a
                href={downloadUrl}
                download={data.file.original_name}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-sm shadow-lg shadow-red-600/30 transition-all shrink-0"
              >
                <Download size={16} /> Download File
              </a>
            </div>

            {/* Inline Previews */}
            <div className="flex-1 rounded-2xl bg-slate-900/60 border border-slate-800 p-6 flex items-center justify-center min-h-[400px]">
              {data.file.mime_type?.startsWith('image/') && (
                <img
                  src={data.file.file_path}
                  alt={data.file.original_name}
                  className="max-h-[600px] max-w-full object-contain rounded-lg shadow-2xl"
                />
              )}

              {data.file.mime_type?.startsWith('video/') && (
                <video controls className="max-h-[600px] max-w-full rounded-lg shadow-2xl">
                  <source src={data.file.file_path} type={data.file.mime_type} />
                </video>
              )}

              {data.file.mime_type?.startsWith('audio/') && (
                <div className="flex flex-col items-center gap-4 py-8">
                  <Music size={48} className="text-pink-400 opacity-60" />
                  <audio controls className="w-80">
                    <source src={data.file.file_path} type={data.file.mime_type} />
                  </audio>
                </div>
              )}

              {data.file.mime_type === 'application/pdf' && (
                <embed src={data.file.file_path} type="application/pdf" className="w-full h-[600px] rounded-lg" />
              )}

              {data.file.original_name.endsWith('.md') && fileContent !== null && (
                <div
                  className="prose prose-invert prose-sm max-w-none text-slate-200 w-full overflow-y-auto max-h-[600px]"
                  dangerouslySetInnerHTML={{ __html: marked.parse(fileContent) as string }}
                />
              )}

              {data.file.original_name.endsWith('.txt') && fileContent !== null && (
                <pre className="font-mono text-xs text-slate-300 whitespace-pre-wrap break-words w-full max-h-[600px] overflow-y-auto">
                  {fileContent}
                </pre>
              )}

              {!data.file.mime_type?.startsWith('image/') &&
               !data.file.mime_type?.startsWith('video/') &&
               !data.file.mime_type?.startsWith('audio/') &&
               data.file.mime_type !== 'application/pdf' &&
               !data.file.original_name.endsWith('.md') &&
               !data.file.original_name.endsWith('.txt') && (
                <div className="flex flex-col items-center gap-3 text-center py-12 text-slate-500">
                  <File size={48} className="opacity-40" />
                  <p className="text-sm">Preview not available for this file type.</p>
                  <a href={downloadUrl} className="text-xs text-red-400 hover:underline">
                    Download to view on your device
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Shared Folder View */}
        {isFolder && data.folder && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-yellow-500/15 border border-yellow-500/30 flex items-center justify-center text-yellow-400 shrink-0">
                  <Folder size={24} />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl md:text-2xl font-bold text-slate-100 truncate">{data.folder.name}</h1>
                  <p className="text-xs text-slate-400 mt-1">
                    {data.files?.length || 0} file{data.files?.length !== 1 ? 's' : ''} &middot; Shared Folder
                  </p>
                </div>
              </div>

              <a
                href={downloadUrl}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-sm shadow-lg shadow-red-600/30 transition-all shrink-0"
              >
                <Download size={16} /> Download All as ZIP
              </a>
            </div>

            {/* Folder file list */}
            <div className="divide-y divide-slate-800/80 bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
              {data.files?.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">This shared folder is empty.</div>
              ) : (
                data.files?.map(file => (
                  <div key={file.id} className="flex items-center justify-between gap-3 p-4 hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <File size={16} className="text-slate-500 shrink-0" />
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
        )}
      </main>
    </div>
  );
}

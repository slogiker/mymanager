import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Download,
  File,
  Folder,
  AlertTriangle,
  ArrowLeft,
  Clock,
  RotateCw,
  Hourglass,
  Edit2,
  Save,
  XCircle,
  Upload,
  Check,
  Music,
  ShieldCheck,
  Eye
} from 'lucide-react';
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
  permission?: 'viewer' | 'editor';
  expires_at: string | null;
  is_public?: number;
  expired?: boolean;
  item_name?: string;
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
  const [expiredData, setExpiredData] = useState<{ expired: boolean; item_name?: string; expires_at?: string; type?: string } | null>(null);

  // Text content & editor state
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [savingContent, setSavingContent] = useState(false);

  // Folder upload state
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Ask for share again feedback
  const [askCopied, setAskCopied] = useState(false);

  const fetchShareData = () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    setExpiredData(null);

    fetch(`/api/shares/public/${token}`)
      .then(async res => {
        if (res.status === 410) {
          const exp = await res.json().catch(() => ({}));
          setExpiredData({
            expired: true,
            item_name: exp.item_name || 'Shared Item',
            expires_at: exp.expires_at,
            type: exp.type || 'file',
          });
          throw new Error('This share link has expired');
        }
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'File or folder not found');
        }
        return res.json();
      })
      .then((d: ShareResponse) => {
        setData(d);
        if (
          d.type === 'file' &&
          d.file &&
          (d.file.mime_type?.startsWith('text/') ||
            d.file.original_name.endsWith('.md') ||
            d.file.original_name.endsWith('.txt') ||
            d.file.original_name.endsWith('.json') ||
            d.file.original_name.endsWith('.js') ||
            d.file.original_name.endsWith('.ts') ||
            d.file.original_name.endsWith('.py') ||
            d.file.original_name.endsWith('.sh') ||
            d.file.original_name.endsWith('.css') ||
            d.file.original_name.endsWith('.html'))
        ) {
          fetch(d.file.file_path)
            .then(r => r.text())
            .then(txt => {
              setFileContent(txt);
              setEditingContent(txt);
            })
            .catch(() => {});
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchShareData();
  }, [token]);

  // Handle saving edited text file
  const handleSaveContent = async () => {
    if (!token || !data?.file) return;
    setSavingContent(true);
    try {
      const res = await fetch(`/api/shares/public/${token}/content`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editingContent }),
      });
      if (!res.ok) throw new Error('Failed to save file content');
      setFileContent(editingContent);
      setIsEditing(false);
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to save');
    } finally {
      setSavingContent(false);
    }
  };

  // Handle uploading into shared folder
  const handleFolderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;
    setUploadingFile(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`/api/shares/public/${token}/upload`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Upload failed');
      const uploadedFile = await res.json();
      setData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          files: [uploadedFile, ...(prev.files || [])],
        };
      });
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to upload');
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // "Ask for share again" button handler
  const handleAskForShare = () => {
    const itemName = expiredData?.item_name || 'the shared item';
    const expDate = expiredData?.expires_at ? new Date(expiredData.expires_at).toLocaleString() : 'recently';
    const text = `Hey! The share link for "${itemName}" has expired (${expDate}). Could you please share a new link?`;

    navigator.clipboard.writeText(text).then(() => {
      setAskCopied(true);
      setTimeout(() => setAskCopied(false), 4000);
    });
  };

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

  // CUSTOM EXPIRED LINK SITE
  if (expiredData?.expired) {
    return (
      <div className="min-h-screen bg-[#111216] text-white flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="w-full max-w-md bg-[#17181e] border border-white/10 rounded-2xl shadow-2xl p-8 text-center relative overflow-hidden">
          <div className="absolute -top-16 -right-16 w-32 h-32 bg-red-600/10 rounded-full blur-2xl pointer-events-none" />

          {/* Hourglass Icon */}
          <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mx-auto mb-5 shadow-xl shadow-red-500/10">
            <Hourglass size={36} className="animate-pulse" />
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">Share Link Has Expired</h2>
          <p className="text-xs text-slate-400 mb-6 max-w-sm mx-auto leading-relaxed">
            The owner set this link to expire on{' '}
            <span className="text-slate-200 font-semibold">
              {expiredData.expires_at ? new Date(expiredData.expires_at).toLocaleString() : 'a previous date'}
            </span>
            . For security reasons, the requested content is no longer accessible with this link.
          </p>

          {/* Item details card */}
          <div className="p-3.5 bg-white/[0.03] border border-white/10 rounded-xl mb-6 flex items-center gap-3 text-left">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/15 border border-yellow-500/30 text-yellow-400 flex items-center justify-center text-base shrink-0">
              {expiredData.type === 'folder' ? <Folder size={20} /> : <File size={20} />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-200 truncate">{expiredData.item_name}</p>
              <p className="text-[11px] text-slate-500">Access window closed</p>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 font-semibold shrink-0">
              Expired
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-2.5">
            <button
              onClick={handleAskForShare}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs shadow-lg shadow-red-600/30 transition-all"
            >
              {askCopied ? <Check size={14} className="text-emerald-300" /> : <RotateCw size={14} />}
              <span>{askCopied ? 'Request copied to clipboard!' : 'Ask for share again'}</span>
            </button>
            {askCopied && (
              <p className="text-[11px] text-emerald-400 animate-fadeIn">
                Ready to paste! Send this message to the owner to request a renewed link.
              </p>
            )}
            <Link
              to="/"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white transition-all"
            >
              <ArrowLeft size={14} /> Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Generic Error Page
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
  const isEditor = data.permission === 'editor';
  const downloadUrl = `/api/shares/public/${token}/download`;

  return (
    <div className="min-h-screen bg-[#111216] text-white flex flex-col">
      {/* Top Header */}
      <header className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-sm font-bold text-slate-200 hover:text-white transition-colors">
          <span className="w-6 h-6 rounded-lg bg-red-600 flex items-center justify-center text-white text-xs font-black shadow-md shadow-red-600/30">
            M
          </span>
          mymanager
        </Link>

        <div className="flex items-center gap-3">
          {/* Permission Badge */}
          <div className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg border bg-white/5 border-white/10">
            {isEditor ? (
              <>
                <ShieldCheck size={13} className="text-emerald-400" />
                <span className="text-emerald-300">Editor access</span>
              </>
            ) : (
              <>
                <Eye size={13} className="text-slate-400" />
                <span className="text-slate-400">View only</span>
              </>
            )}
          </div>

          {/* Expiration badge */}
          {data.expires_at && (
            <div className="flex items-center gap-1.5 text-xs text-amber-400/90 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
              <Clock size={12} /> Expires: {new Date(data.expires_at).toLocaleDateString()}
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
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
                      onClick={handleSaveContent}
                      disabled={savingContent}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-all"
                    >
                      <Save size={15} /> {savingContent ? 'Saving…' : 'Save'}
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
                  download={data.file.original_name}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-sm shadow-lg shadow-red-600/30 transition-all shrink-0"
                >
                  <Download size={16} /> Download
                </a>
              </div>
            </div>

            {/* Inline Previews & Editor */}
            <div className="flex-1 rounded-2xl bg-slate-900/60 border border-slate-800 p-6 flex items-center justify-center min-h-[400px]">
              {/* Text editor mode */}
              {isEditing ? (
                <textarea
                  value={editingContent}
                  onChange={e => setEditingContent(e.target.value)}
                  className="w-full flex-1 min-h-[500px] bg-slate-900/90 border border-slate-700 rounded-xl p-4 text-xs font-mono text-slate-200 outline-none focus:border-red-500/50 resize-none leading-relaxed"
                />
              ) : (
                <>
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

                  {!data.file.original_name.endsWith('.md') && fileContent !== null && (
                    <pre className="font-mono text-xs text-slate-300 whitespace-pre-wrap break-words w-full max-h-[600px] overflow-y-auto">
                      {fileContent}
                    </pre>
                  )}

                  {!data.file.mime_type?.startsWith('image/') &&
                    !data.file.mime_type?.startsWith('video/') &&
                    !data.file.mime_type?.startsWith('audio/') &&
                    data.file.mime_type !== 'application/pdf' &&
                    fileContent === null && (
                      <div className="flex flex-col items-center gap-3 text-center py-12 text-slate-500">
                        <File size={48} className="opacity-40" />
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

              <div className="flex items-center gap-2 shrink-0">
                {isEditor && (
                  <>
                    <input ref={fileInputRef} type="file" className="hidden" onChange={handleFolderUpload} />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingFile}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-sm transition-all disabled:opacity-50"
                    >
                      <Upload size={16} /> {uploadingFile ? 'Uploading…' : 'Upload to Folder'}
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
              {data.files?.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  This shared folder is currently empty.{isEditor && ' Use the upload button above to add files.'}
                </div>
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

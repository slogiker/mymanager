import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Clock,
  ShieldCheck,
  Eye,
} from 'lucide-react';
import { type DocumentData } from '../components/files/DocumentViewer';
import {
  ShareExpiredView,
  ShareClipView,
  ShareFileView,
  ShareFolderView,
} from '../components/share';

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

interface SharedClip {
  id: number;
  type: string;
  title: string | null;
  content: string | null;
  language: string | null;
  filename: string | null;
  file_path: string | null;
  mime_type: string | null;
  created_at: string;
}

interface ShareResponse {
  type: 'file' | 'folder' | 'clip';
  file?: SharedFile;
  folder?: SharedFolder;
  clip?: SharedClip;
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

function isOfficeDoc(name: string) {
  return ['.docx', '.doc', '.odt'].some(e => name.toLowerCase().endsWith(e));
}

function isPresentation(name: string) {
  return ['.pptx', '.odp'].some(e => name.toLowerCase().endsWith(e));
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

  // Document & presentation state
  const [docData, setDocData] = useState<DocumentData | null>(null);
  const [loadingDoc, setLoadingDoc] = useState(false);

  // Folder upload state
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Ask for share feedback
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

        if (
          d.type === 'file' &&
          d.file &&
          (isOfficeDoc(d.file.original_name) || isPresentation(d.file.original_name))
        ) {
          setLoadingDoc(true);
          fetch(`/api/shares/public/${token}/document-content`)
            .then(r => r.json())
            .then(doc => setDocData(doc))
            .catch(err => setDocData({ type: 'document', format: 'error', error: err?.message || 'Failed to load document' }))
            .finally(() => setLoadingDoc(false));
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchShareData();
  }, [token]);

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
          <p className="text-xs text-slate-400">Loading shared content...</p>
        </div>
      </div>
    );
  }

  if (expiredData?.expired) {
    return (
      <ShareExpiredView
        expiredData={expiredData}
        askCopied={askCopied}
        onAskForShare={handleAskForShare}
      />
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

          {data.expires_at && (
            <div className="flex items-center gap-1.5 text-xs text-amber-400/90 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
              <Clock size={12} /> Expires: {new Date(data.expires_at).toLocaleDateString()}
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-6 md:p-10 flex flex-col">
        {data.type === 'clip' && data.clip && (
          <ShareClipView clip={data.clip} />
        )}

        {isFile && data.file && (
          <ShareFileView
            file={data.file}
            isEditor={isEditor}
            downloadUrl={downloadUrl}
            fileContent={fileContent}
            editingContent={editingContent}
            setEditingContent={setEditingContent}
            isEditing={isEditing}
            setIsEditing={setIsEditing}
            savingContent={savingContent}
            onSaveContent={handleSaveContent}
            docData={docData}
            loadingDoc={loadingDoc}
            formatSize={formatSize}
            isOfficeDoc={isOfficeDoc}
            isPresentation={isPresentation}
          />
        )}

        {isFolder && data.folder && (
          <ShareFolderView
            folder={data.folder}
            files={data.files}
            isEditor={isEditor}
            downloadUrl={downloadUrl}
            uploadingFile={uploadingFile}
            fileInputRef={fileInputRef}
            onFolderUpload={handleFolderUpload}
            formatSize={formatSize}
          />
        )}
      </main>
    </div>
  );
}

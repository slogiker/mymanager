import { useState, useEffect, useCallback } from 'react';
import { Share2, Copy, Check, Clock, Trash2, X, Globe, AlertCircle } from 'lucide-react';
import { api } from '../../lib/api';

interface ShareRecord {
  id: string;
  type: string;
  item_id: string;
  token: string;
  expires_at: string | null;
  created_at: string;
  share_url?: string;
}

interface Props {
  open: boolean;
  type: 'file' | 'folder';
  itemId: string | number;
  itemName: string;
  onClose: () => void;
}

const EXPIRY_OPTIONS = [
  { label: 'Never (No expiration)', value: 'never' },
  { label: '1 Hour', value: '1h' },
  { label: '1 Day (24 hours)', value: '1d' },
  { label: '7 Days', value: '7d' },
  { label: '30 Days', value: '30d' },
];

export default function ShareModal({ open, type, itemId, itemName, onClose }: Props) {
  const [expiry, setExpiry] = useState('never');
  const [shares, setShares] = useState<ShareRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadShares = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<ShareRecord[]>(`/shares/item/${type}/${itemId}`);
      setShares(data);
    } catch {
      setShares([]);
    } finally {
      setLoading(false);
    }
  }, [type, itemId]);

  useEffect(() => {
    if (open) {
      setError(null);
      setCopiedToken(null);
      loadShares();
    }
  }, [open, loadShares]);

  if (!open) return null;

  async function handleCreateShare() {
    setCreating(true);
    setError(null);
    try {
      const newShare = await api.post<ShareRecord>('/shares', {
        type,
        item_id: String(itemId),
        expires_in: expiry,
      });
      setShares(prev => [newShare, ...prev]);
      handleCopy(newShare.token);
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || 'Failed to create share link';
      setError(msg);
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(token: string) {
    try {
      await api.delete(`/shares/${token}`);
      setShares(prev => prev.filter(s => s.token !== token));
    } catch {}
  }

  function handleCopy(token: string) {
    const url = `${window.location.origin}/share/${token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2500);
    });
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-500 hover:text-slate-200 transition-colors"
        >
          <X size={16} />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Share2 size={20} />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-slate-100 truncate">Share {type === 'folder' ? 'Folder' : 'File'}</h3>
            <p className="text-xs text-slate-400 truncate">{itemName}</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-xs text-red-400">
            <AlertCircle size={14} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Expiration preset selector */}
        <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/60 mb-5">
          <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
            <Clock size={13} className="text-slate-400" /> Link Expiration
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
            {EXPIRY_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setExpiry(opt.value)}
                className={`text-xs px-3 py-2 rounded-lg border text-left transition-all ${
                  expiry === opt.value
                    ? 'border-purple-500/60 bg-purple-500/15 text-purple-200 font-medium'
                    : 'border-slate-700 bg-slate-800/40 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleCreateShare}
            disabled={creating}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium text-xs shadow-lg shadow-purple-500/20 transition-all disabled:opacity-50"
          >
            <Globe size={13} /> {creating ? 'Generating Link…' : 'Generate Public Link'}
          </button>
        </div>

        {/* Existing active shares */}
        <div>
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Active Public Links</h4>
          {loading ? (
            <div className="text-xs text-slate-500 py-3 text-center">Loading shares…</div>
          ) : shares.length === 0 ? (
            <div className="text-xs text-slate-500 py-3 text-center bg-slate-800/30 rounded-lg border border-slate-800">
              No active public share links. Generate one above to share.
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {shares.map(share => {
                const url = `${window.location.origin}/share/${share.token}`;
                const isCopied = copiedToken === share.token;
                return (
                  <div
                    key={share.id}
                    className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-[11px] text-purple-300 truncate" title={url}>
                        {url}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {share.expires_at ? `Expires: ${new Date(share.expires_at).toLocaleString()}` : 'Never expires'}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleCopy(share.token)}
                        className={`p-1.5 rounded transition-colors ${
                          isCopied ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                        title="Copy link"
                      >
                        {isCopied ? <Check size={13} /> : <Copy size={13} />}
                      </button>
                      <button
                        onClick={() => handleRevoke(share.token)}
                        className="p-1.5 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Revoke link"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

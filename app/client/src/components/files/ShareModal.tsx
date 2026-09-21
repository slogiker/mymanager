import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Share2,
  Copy,
  Check,
  Clock,
  Trash2,
  X,
  Globe,
  Lock,
  ChevronDown,
  User,
  Folder,
  AlertCircle,
  UserPlus,
  Radio,
  ClipboardCopy,
} from 'lucide-react';
import { api } from '../../lib/api';
import { FileIcon } from './fileIcons';

interface UserCandidate {
  id: number;
  name: string;
  username: string;
  email: string;
}

interface ItemPermission {
  id: number;
  item_type: string;
  item_id: string;
  user_id: number;
  permission: 'viewer' | 'editor';
  created_at: string;
  name: string;
  username: string;
  email: string;
}

interface ItemOwner {
  id: number;
  name: string;
  username: string;
  email: string;
}

interface ShareRecord {
  id: string;
  type: string;
  item_id: string;
  token: string;
  permission?: 'viewer' | 'editor';
  is_public?: number;
  expires_at: string | null;
  created_at: string;
  share_url?: string;
}

interface Props {
  open: boolean;
  type: 'file' | 'folder' | 'clip';
  itemId: string | number;
  itemName: string;
  onClose: () => void;
}

const EXPIRY_OPTIONS = [
  { label: 'Never (Permanent)', value: 'never' },
  { label: '1 Hour', value: '1h' },
  { label: '1 Day (24 hours)', value: '1d' },
  { label: '7 Days', value: '7d' },
  { label: '30 Days', value: '30d' },
];

export default function ShareModal({ open, type, itemId, itemName, onClose }: Props) {
  // General access state
  const [accessMode, setAccessMode] = useState<'public' | 'restricted'>('public');
  const [publicRole, setPublicRole] = useState<'viewer' | 'editor'>('viewer');
  const [expiry, setExpiry] = useState('never');

  // Active public share link
  const [activeShare, setActiveShare] = useState<ShareRecord | null>(null);
  const [creatingShare, setCreatingShare] = useState(false);
  const [copied, setCopied] = useState(false);

  // People with access state
  const [owner, setOwner] = useState<ItemOwner | null>(null);
  const [permissions, setPermissions] = useState<ItemPermission[]>([]);
  const [usersList, setUsersList] = useState<UserCandidate[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // User picker state
  const [selectedUser, setSelectedUser] = useState<UserCandidate | null>(null);
  const [selectedRole, setSelectedRole] = useState<'viewer' | 'editor'>('viewer');
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [addingUser, setAddingUser] = useState(false);

  // Website note broadcast state (for clips)
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastMsg, setBroadcastMsg] = useState<string | null>(null);

  // Status & Error
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Close user dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    }
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load existing shares, permissions, and available users
  const loadData = useCallback(async () => {
    setError(null);
    try {
      const sharesData = await api.get<ShareRecord[]>(`/shares/item/${type}/${itemId}`);
      if (sharesData && sharesData.length > 0) {
        setActiveShare(sharesData[0]);
        setPublicRole(sharesData[0].permission || 'viewer');
        setAccessMode(sharesData[0].is_public === 0 ? 'restricted' : 'public');
      } else {
        setActiveShare(null);
      }
    } catch {
      setActiveShare(null);
    }

    try {
      const permData = await api.get<{ owner: ItemOwner | null; permissions: ItemPermission[] }>(
        `/shares/permissions/${type}/${itemId}`
      );
      setOwner(permData.owner);
      setPermissions(permData.permissions || []);
    } catch {
      setOwner(null);
      setPermissions([]);
    }

    setLoadingUsers(true);
    try {
      const usersData = await api.get<UserCandidate[]>('/shares/users');
      setUsersList(usersData || []);
    } catch {
      setUsersList([]);
    } finally {
      setLoadingUsers(false);
    }
  }, [type, itemId]);

  useEffect(() => {
    if (open) {
      setSelectedUser(null);
      setSelectedRole('viewer');
      setCopied(false);
      setBroadcastMsg(null);
      loadData();
    }
  }, [open, loadData]);

  if (!open) return null;

  // Generate or update public share link
  async function handleGeneratePublicShare(targetExpiry?: string, targetRole?: 'viewer' | 'editor', targetAccess?: 'public' | 'restricted') {
    setCreatingShare(true);
    setError(null);
    const exp = targetExpiry ?? expiry;
    const role = targetRole ?? publicRole;
    const access = targetAccess ?? accessMode;

    try {
      const share = await api.post<ShareRecord>('/shares', {
        type,
        item_id: String(itemId),
        expires_in: exp,
        permission: role,
        is_public: access === 'public' ? 1 : 0,
      });
      setActiveShare(share);
      copyLink(share.token);
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || 'Failed to update share settings';
      setError(msg);
    } finally {
      setCreatingShare(false);
    }
  }

  // Revoke public share link
  async function handleRevokePublicShare() {
    if (!activeShare) return;
    try {
      await api.delete(`/shares/${activeShare.token}`);
      setActiveShare(null);
    } catch {}
  }

  // Add specific user permission
  async function handleAddUser() {
    if (!selectedUser) return;
    setAddingUser(true);
    setError(null);
    try {
      const newPerm = await api.post<ItemPermission>(`/shares/permissions/${type}/${itemId}`, {
        user_id: selectedUser.id,
        permission: selectedRole,
      });
      setPermissions(prev => {
        const filtered = prev.filter(p => p.user_id !== selectedUser.id);
        return [...filtered, newPerm];
      });
      setSelectedUser(null);
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || 'Failed to add user permission';
      setError(msg);
    } finally {
      setAddingUser(false);
    }
  }

  // Update specific user permission
  async function handleUpdateUserRole(userId: number, newRole: 'viewer' | 'editor') {
    try {
      const updated = await api.post<ItemPermission>(`/shares/permissions/${type}/${itemId}`, {
        user_id: userId,
        permission: newRole,
      });
      setPermissions(prev => prev.map(p => (p.user_id === userId ? updated : p)));
    } catch {}
  }

  // Remove specific user permission
  async function handleRemoveUser(userId: number) {
    try {
      await api.delete(`/shares/permissions/${type}/${itemId}/${userId}`);
      setPermissions(prev => prev.filter(p => p.user_id !== userId));
    } catch {}
  }

  // Broadcast note to all users
  async function handleBroadcastToUsers() {
    setBroadcasting(true);
    setBroadcastMsg(null);
    try {
      const res = await api.post<{ message: string; shared_count: number }>(
        `/clipboard/${itemId}/share-to-users`
      );
      setBroadcastMsg(res.message || `Shared to ${res.shared_count} user(s)`);
      setTimeout(() => setBroadcastMsg(null), 4000);
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || 'Failed to broadcast clip';
      setError(msg);
    } finally {
      setBroadcasting(false);
    }
  }

  function copyLink(token?: string) {
    const t = token || activeShare?.token;
    if (!t) return;
    const url = `${window.location.origin}/share/${t}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  const shareUrl = activeShare ? `${window.location.origin}/share/${activeShare.token}` : null;

  // Filter available candidates to exclude existing collaborators and owner
  const availableCandidates = usersList.filter(
    u => u.id !== owner?.id && !permissions.some(p => p.user_id === u.id)
  );

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#111216] border border-white/10 rounded-2xl shadow-2xl p-6 relative max-h-[92vh] overflow-y-auto cursor-default"
        onClick={e => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-500 hover:text-slate-200 transition-colors"
          title="Close"
        >
          <X size={16} />
        </button>

        {/* Modal Header */}
        <div className="flex items-start gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
            {type === 'folder' ? (
              <Folder size={20} />
            ) : type === 'clip' ? (
              <ClipboardCopy size={20} />
            ) : (
              <FileIcon fileName={itemName} size={20} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-100 truncate" title={itemName}>
                {itemName}
              </h3>
              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-white/5 text-slate-400 border border-white/10 shrink-0">
                {type}
              </span>
            </div>
            <p className="text-xs text-slate-400">Share and manage access permissions</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-xs text-red-400">
            <AlertCircle size={14} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Optional Broadcast Option for Clipboard Notes */}
        {type === 'clip' && (
          <div className="mb-5 p-3 rounded-xl bg-red-500/[0.04] border border-red-500/20 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                <Radio size={14} className="text-red-400" />
                <span>Broadcast to All Users</span>
              </div>
              <button
                onClick={handleBroadcastToUsers}
                disabled={broadcasting}
                className="px-3 py-1.5 rounded-lg bg-red-600/80 hover:bg-red-600 text-white text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {broadcasting ? 'Broadcasting…' : "Push to Everyone's Notes"}
              </button>
            </div>
            {broadcastMsg && (
              <p className="text-[11px] text-emerald-400 flex items-center gap-1">
                <Check size={12} /> {broadcastMsg}
              </p>
            )}
          </div>
        )}

        {/* 1. Add People Input */}
        <div className="mb-5">
          <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
            <UserPlus size={13} className="text-red-400" /> Add people
          </label>
          <div className="flex gap-2 relative">
            <div className="relative flex-1" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setUserDropdownOpen(v => !v)}
                className="w-full flex items-center justify-between bg-[#17181e] hover:bg-[#1c1e26] border border-white/10 hover:border-white/20 rounded-xl px-3.5 py-2.5 text-xs text-left text-slate-200 transition-colors"
              >
                {selectedUser ? (
                  <span className="truncate">
                    <span className="font-semibold text-white">{selectedUser.username}</span>{' '}
                    <span className="text-slate-400 text-[11px]">({selectedUser.email})</span>
                  </span>
                ) : (
                  <span className="text-slate-500">
                    {loadingUsers ? 'Loading users…' : availableCandidates.length === 0 ? 'No more users to add' : 'Select a user...'}
                  </span>
                )}
                <ChevronDown size={12} className="text-slate-500 shrink-0 ml-2" />
              </button>

              {/* Custom Dark Dropdown */}
              {userDropdownOpen && availableCandidates.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1.5 z-40 bg-[#17181e] border border-white/15 rounded-xl shadow-2xl p-1.5 max-h-48 overflow-y-auto backdrop-blur-md divide-y divide-white/5">
                  {availableCandidates.map(u => (
                    <div
                      key={u.id}
                      onClick={() => {
                        setSelectedUser(u);
                        setUserDropdownOpen(false);
                      }}
                      className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors group"
                    >
                      <div className="w-6 h-6 rounded-full bg-red-600/20 text-red-400 flex items-center justify-center text-[10px] font-bold border border-red-500/30 shrink-0">
                        {u.username.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-200 group-hover:text-white truncate">{u.username}</p>
                        <p className="text-[10px] text-slate-400 truncate">{u.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Role for added user */}
            <select
              value={selectedRole}
              onChange={e => setSelectedRole(e.target.value as 'viewer' | 'editor')}
              className="bg-[#17181e] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-slate-200 outline-none focus:border-red-500"
              style={{ backgroundColor: '#17181e', color: '#f1f5f9' }}
            >
              <option value="viewer" style={{ backgroundColor: '#17181e', color: '#f1f5f9' }}>Viewer</option>
              <option value="editor" style={{ backgroundColor: '#17181e', color: '#f1f5f9' }}>Editor</option>
            </select>

            <button
              onClick={handleAddUser}
              disabled={!selectedUser || addingUser}
              className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs transition-colors shadow-lg shadow-red-600/20 disabled:opacity-40 shrink-0"
            >
              {addingUser ? 'Adding…' : 'Add'}
            </button>
          </div>
        </div>

        {/* 2. People with access List */}
        <div className="mb-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">People with access</p>
          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
            {/* Owner Row */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-full bg-red-600/20 text-red-400 flex items-center justify-center text-xs font-bold border border-red-500/30 shrink-0">
                  {owner?.username ? owner.username.charAt(0).toUpperCase() : <User size={13} />}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-200 truncate">
                    {owner?.username || 'Owner'} <span className="text-slate-500 text-[11px]">(Owner)</span>
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">{owner?.email || 'System Owner'}</p>
                </div>
              </div>
              <span className="text-xs font-semibold text-slate-400 px-2 py-1 bg-white/5 rounded-lg border border-white/10 shrink-0">
                Owner
              </span>
            </div>

            {/* Collaborators Rows */}
            {permissions.map(p => (
              <div key={p.id} className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center text-xs font-bold border border-blue-500/30 shrink-0">
                    {p.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-200 truncate">{p.username}</p>
                    <p className="text-[10px] text-slate-400 truncate">{p.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <select
                    value={p.permission}
                    onChange={e => {
                      if (e.target.value === 'remove') {
                        handleRemoveUser(p.user_id);
                      } else {
                        handleUpdateUserRole(p.user_id, e.target.value as 'viewer' | 'editor');
                      }
                    }}
                    className="bg-[#17181e] text-xs text-slate-200 border border-white/10 rounded-lg px-2.5 py-1 outline-none"
                    style={{ backgroundColor: '#17181e', color: '#f1f5f9' }}
                  >
                    <option value="viewer" style={{ backgroundColor: '#17181e', color: '#f1f5f9' }}>Viewer</option>
                    <option value="editor" style={{ backgroundColor: '#17181e', color: '#f1f5f9' }}>Editor</option>
                    <option value="remove" style={{ backgroundColor: '#17181e', color: '#ef4444' }}>Remove access</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 3. General Access / Public Link Card */}
        <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4 mb-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${
                  accessMode === 'public' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                }`}
              >
                {accessMode === 'public' ? <Globe size={16} /> : <Lock size={16} />}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-200">General access</p>
                <p className="text-[11px] text-slate-400">
                  {accessMode === 'public'
                    ? 'Anyone with the link can access'
                    : 'Only people with access can open with link'}
                </p>
              </div>
            </div>

            <select
              value={accessMode}
              onChange={e => {
                const val = e.target.value as 'public' | 'restricted';
                setAccessMode(val);
                if (activeShare) {
                  handleGeneratePublicShare(undefined, undefined, val);
                }
              }}
              className="bg-[#17181e] border border-white/10 text-xs text-slate-200 rounded-lg px-2.5 py-1.5 outline-none"
              style={{ backgroundColor: '#17181e', color: '#f1f5f9' }}
            >
              <option value="public" style={{ backgroundColor: '#17181e', color: '#f1f5f9' }}>Anyone with link</option>
              <option value="restricted" style={{ backgroundColor: '#17181e', color: '#f1f5f9' }}>Restricted</option>
            </select>
          </div>

          {/* Link controls: Role & Expiration */}
          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/5">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Role for link</label>
              <select
                value={publicRole}
                onChange={e => {
                  const val = e.target.value as 'viewer' | 'editor';
                  setPublicRole(val);
                  if (activeShare) {
                    handleGeneratePublicShare(undefined, val, undefined);
                  }
                }}
                className="w-full bg-[#17181e] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 outline-none"
                style={{ backgroundColor: '#17181e', color: '#f1f5f9' }}
              >
                <option value="viewer" style={{ backgroundColor: '#17181e', color: '#f1f5f9' }}>Viewer (read & download)</option>
                <option value="editor" style={{ backgroundColor: '#17181e', color: '#f1f5f9' }}>Editor (edit & upload)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1 flex items-center gap-1">
                <Clock size={11} /> Expiration
              </label>
              <select
                value={expiry}
                onChange={e => {
                  setExpiry(e.target.value);
                  handleGeneratePublicShare(e.target.value, undefined, undefined);
                }}
                className="w-full bg-[#17181e] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 outline-none"
                style={{ backgroundColor: '#17181e', color: '#f1f5f9' }}
              >
                {EXPIRY_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value} style={{ backgroundColor: '#17181e', color: '#f1f5f9' }}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Live Public Link Card */}
          {activeShare && shareUrl && (
            <div className="mt-3 p-2.5 rounded-lg bg-[#17181e] border border-white/10 flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-mono text-red-400 truncate" title={shareUrl}>
                  {shareUrl}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {activeShare.expires_at
                    ? `Expires: ${new Date(activeShare.expires_at).toLocaleString()}`
                    : 'Never expires (permanent)'}
                </p>
              </div>
              <button
                onClick={() => copyLink()}
                className={`p-1.5 rounded-lg transition-colors shrink-0 ${
                  copied ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
                title="Copy link"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
          )}
        </div>

        {/* Bottom bar: Copy Link + Done button */}
        <div className="flex items-center justify-between pt-2">
          {activeShare ? (
            <button
              onClick={() => copyLink()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-200 hover:text-white transition-all"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span>{copied ? 'Link copied!' : 'Copy link'}</span>
            </button>
          ) : (
            <button
              onClick={() => handleGeneratePublicShare()}
              disabled={creatingShare}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs transition-all shadow-lg shadow-red-600/20"
            >
              <Globe size={14} />
              <span>{creatingShare ? 'Generating…' : 'Generate link'}</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            {activeShare && (
              <button
                onClick={handleRevokePublicShare}
                className="px-3 py-2 text-xs text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
                title="Delete this link"
              >
                <Trash2 size={14} />
              </button>
            )}
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs shadow-lg shadow-red-600/30 transition-all"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

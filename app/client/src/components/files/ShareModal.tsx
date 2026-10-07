import React from 'react';
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
  Folder,
  AlertCircle,
  Radio,
  ClipboardCopy,
} from 'lucide-react';
import { FileIcon } from './fileIcons';
import { useShareModalState } from './useShareModalState';
import { SharePeopleAccess } from './SharePeopleAccess';

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
  const {
    accessMode,
    publicRole,
    setPublicRole,
    expiry,
    setExpiry,
    activeShare,
    creatingShare,
    copied,
    owner,
    permissions,
    loadingUsers,
    selectedUser,
    setSelectedUser,
    selectedRole,
    setSelectedRole,
    userDropdownOpen,
    setUserDropdownOpen,
    addingUser,
    broadcasting,
    broadcastMsg,
    error,
    dropdownRef,
    availableCandidates,
    shareUrl,
    handleCreatePublicShare,
    handleAccessModeChange,
    handleRevokePublicShare,
    handleAddUser,
    handleUpdateUserRole,
    handleRemoveUser,
    handleBroadcastToUsers,
    copyLink,
  } = useShareModalState({ open, type, itemId });

  if (!open) return null;

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
                {broadcasting ? 'Broadcasting...' : "Push to Everyone's Notes"}
              </button>
            </div>
            {broadcastMsg && (
              <p className="text-[11px] text-emerald-400 flex items-center gap-1">
                <Check size={12} /> {broadcastMsg}
              </p>
            )}
          </div>
        )}

        {/* People Access Section (Add user + Collaborators list) */}
        <SharePeopleAccess
          dropdownRef={dropdownRef}
          userDropdownOpen={userDropdownOpen}
          setUserDropdownOpen={setUserDropdownOpen}
          selectedUser={selectedUser}
          setSelectedUser={setSelectedUser}
          selectedRole={selectedRole}
          setSelectedRole={setSelectedRole}
          availableCandidates={availableCandidates}
          loadingUsers={loadingUsers}
          addingUser={addingUser}
          onAddUser={handleAddUser}
          owner={owner}
          permissions={permissions}
          onUpdateUserRole={handleUpdateUserRole}
          onRemoveUser={handleRemoveUser}
        />

        {/* General Access / Public Link Card */}
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
                <p className="text-xs font-semibold text-slate-200">General access</p>
                <p className="text-[11px] text-slate-400">
                  {accessMode === 'public'
                    ? 'Anyone with the link can view'
                    : 'Only people with access can open'}
                </p>
              </div>
            </div>

            {/* Access Mode Selector */}
            <div className="flex items-center gap-1.5">
              <select
                value={accessMode}
                onChange={e => handleAccessModeChange(e.target.value as 'public' | 'restricted')}
                className="bg-[#17181e] text-xs text-slate-200 border border-white/10 rounded-lg px-2.5 py-1.5 outline-none font-medium"
                style={{ backgroundColor: '#17181e', color: '#f1f5f9' }}
              >
                <option value="public" style={{ backgroundColor: '#17181e', color: '#f1f5f9' }}>Public Link</option>
                <option value="restricted" style={{ backgroundColor: '#17181e', color: '#f1f5f9' }}>Restricted</option>
              </select>

              {accessMode === 'public' && (
                <select
                  value={publicRole}
                  onChange={e => {
                    const r = e.target.value as 'viewer' | 'editor';
                    setPublicRole(r);
                    handleCreatePublicShare(r);
                  }}
                  className="bg-[#17181e] text-xs text-slate-200 border border-white/10 rounded-lg px-2.5 py-1.5 outline-none font-medium"
                  style={{ backgroundColor: '#17181e', color: '#f1f5f9' }}
                >
                  <option value="viewer" style={{ backgroundColor: '#17181e', color: '#f1f5f9' }}>Viewer</option>
                  <option value="editor" style={{ backgroundColor: '#17181e', color: '#f1f5f9' }}>Editor</option>
                </select>
              )}
            </div>
          </div>

          {/* Public Link Details & URL Bar */}
          {accessMode === 'public' && (
            <div className="space-y-3 pt-2 border-t border-white/5">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareUrl || 'Generating link...'}
                  className="flex-1 bg-[#17181e] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 font-mono select-all outline-none"
                />
                <button
                  onClick={() => copyLink()}
                  disabled={!activeShare}
                  className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-lg shadow-red-600/20 disabled:opacity-40 shrink-0"
                >
                  {copied ? <Check size={13} className="text-white" /> : <Copy size={13} />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              {/* Expiry Selector and Revoke Link */}
              <div className="flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Clock size={12} className="text-slate-500" />
                  <span>Expires:</span>
                  <select
                    value={expiry}
                    onChange={e => {
                      setExpiry(e.target.value);
                      handleCreatePublicShare();
                    }}
                    className="bg-[#17181e] border border-white/10 rounded-lg px-2 py-0.5 text-xs text-slate-300 outline-none"
                    style={{ backgroundColor: '#17181e', color: '#f1f5f9' }}
                  >
                    {EXPIRY_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value} style={{ backgroundColor: '#17181e', color: '#f1f5f9' }}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {activeShare && (
                  <button
                    onClick={handleRevokePublicShare}
                    className="text-xs text-red-400/80 hover:text-red-400 transition-colors flex items-center gap-1"
                  >
                    <Trash2 size={12} /> Revoke link
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-white/10">
          {shareUrl ? (
            <button
              onClick={() => copyLink()}
              className="text-xs font-semibold text-red-400 hover:text-red-300 flex items-center gap-1.5 transition-colors"
            >
              <Copy size={13} /> Copy link
            </button>
          ) : (
            <div />
          )}

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-semibold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

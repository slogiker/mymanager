import React, { useState } from 'react';
import { AlertTriangle, Shield, Trash2 } from 'lucide-react';
import { User } from '../../types';
import { api } from '../../lib/api';

interface DangerZoneSectionProps {
  user: User;
  onAccountDeleted: () => void;
}

export function DangerZoneSection({ user, onAccountDeleted }: DangerZoneSectionProps) {
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [confirmUsername, setConfirmUsername] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const handleDeleteAccount = async () => {
    if (confirmUsername.trim().toLowerCase() !== (user.username || '').toLowerCase()) {
      setDeleteError('Please type your exact username to confirm');
      return;
    }

    setDeleteLoading(true);
    setDeleteError('');
    try {
      await api.delete('/auth/me');
      onAccountDeleted();
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete account');
      setDeleteLoading(false);
    }
  };

  return (
    <>
      <div className="rounded-2xl border border-red-500/30 bg-red-950/10 p-6 sm:p-8 space-y-6">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-red-400 flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4" />
            Danger Zone
          </h3>
          <p className="text-xs text-slate-400">
            Irreversible actions related to your account.
          </p>
        </div>

        {user.role === 'owner' ? (
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-400 space-y-2">
            <div className="font-semibold text-slate-200 flex items-center gap-2">
              <Shield className="w-4 h-4 text-red-500" />
              Primary Owner Account Protected
            </div>
            <p>
              As the primary system owner, your account cannot be deleted to prevent locking yourself out of the infrastructure and admin dashboard.
            </p>
          </div>
        ) : (
          <div className="p-5 rounded-xl border border-red-500/20 bg-slate-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-xs font-bold text-slate-200 mb-1">Delete Account</h4>
              <p className="text-xs text-slate-400 max-w-md">
                Permanently delete your account, saved preferences, and credentials. This action cannot be undone.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setConfirmUsername('');
                setDeleteError('');
                setDeleteModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/40 text-xs font-semibold transition-all whitespace-nowrap"
            >
              <Trash2 className="w-3.5 h-3.5 inline mr-1.5" />
              Delete My Account
            </button>
          </div>
        )}
      </div>

      {/* Delete Account Confirmation Modal */}
      {deleteModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm cursor-pointer"
          onClick={() => setDeleteModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-red-500/40 bg-[#16181f] p-6 shadow-2xl space-y-4 cursor-default"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5 text-red-400 font-bold text-base">
              <AlertTriangle className="w-5 h-5" />
              Delete Account Confirmation
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              This will permanently delete your account <span className="font-mono font-bold text-white">@{user.username}</span> and log you out.
            </p>

            <div className="space-y-1.5">
              <label className="text-[11px] text-slate-400">
                To confirm, type your username <span className="font-mono text-red-400 font-bold">{user.username}</span> below:
              </label>
              <input
                type="text"
                value={confirmUsername}
                onChange={(e) => setConfirmUsername(e.target.value)}
                placeholder={user.username}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 focus:border-red-500 rounded-xl text-xs text-white font-mono"
              />
            </div>

            {deleteError && (
              <p className="text-xs text-red-400">{deleteError}</p>
            )}

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteLoading || confirmUsername.trim().toLowerCase() !== user.username.toLowerCase()}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white rounded-xl text-xs font-semibold shadow-[0_0_15px_-3px_rgba(239,68,68,0.5)] transition-all"
              >
                {deleteLoading ? 'Deleting...' : 'Confirm Deletion'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
